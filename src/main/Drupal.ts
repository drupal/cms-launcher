import type { ChildProcess } from 'node:child_process';
import { default as getPort, portNumbers } from 'get-port';
import { OutputType, PhpCommand } from './PhpCommand';
import { app, type MessagePortMain, shell } from 'electron';
import { ComposerCommand } from './ComposerCommand';
import { join } from 'node:path';
import { access, copyFile, glob, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as tar from 'tar';
import logger from 'electron-log';
import { Drupal as DrupalInterface } from '../preload/Drupal';
import * as YAML from 'yaml';

/**
 * Provides methods for installing and serving a Drupal code base.
 */
export class Drupal implements DrupalInterface
{
    private readonly root: string;

    private url: string | null = null;

    private server: ChildProcess | null = null;

    private readonly commands = {

        install: [
            // Create the project, but don't install dependencies yet.
            ['create-project', '--no-install', 'drupal/cms'],

            // Prevent core's scaffold plugin from trying to dynamically determine if
            // the project is a Git repository, since that will make it try to run Git,
            // which might not be installed.
            ['config', 'extra.drupal-scaffold.gitignore', 'false', '--json'],

            // Require the Drupal Association Extras module, which will be injected into
            // the install profile by prepareSettings().
            ['require', 'drupal/drupal_association_extras:@alpha', '--no-update'],

            // Finally, install dependencies. We suppress the progress bar because it
            // looks lame when streamed to the renderer.
            ['install', '--no-progress'],

            // Unpack all recipes. This would normally be done during the `create-project` command
            // if dependencies were being installed at that time.
            ['drupal:recipe-unpack'],

        ],

        update: [],

    }

    constructor (root: string, fixture?: string)
    {
        this.root = root;

        // Record a version number in composer.json so we can update the built project
        // later if needed. This must be done before the lock file is created (i.e.,
        // before dependencies are installed) so that `composer validate --check-lock`
        // will be happy.
        this.commands.install.splice(
            this.commands.install.findIndex(command => command[0] === 'install'),
            0,
            ['config', '--merge', '--json', 'extra.drupal-launcher', `{"version": ${this.commands.update.length + 1}}`]
        );

        if (fixture) {
            const repository = JSON.stringify({
                type: 'path',
                url: join(__dirname, '..', '..', 'tests', 'fixtures', fixture),
            });
            // The option does not need to be escaped or quoted, because Composer is not being
            // executed through a shell.
            this.commands.install[0].push(`--repository=${repository}`);
        }
    }

    public async start (archive?: string, url?: string | false, timeout: number = 2, port?: MessagePortMain): Promise<void>
    {
        try {
            await access(this.root);
        }
        catch {
            // The root directory doesn't exist, so we need to install Drupal.
            try {
                await this.install(archive, port);
            }
            catch (e) {
                // Courteously try to clean up the broken site before re-throwing.
                await this.destroy();
                throw e;
            }
        }

        // If no URL was provided, find an open port on localhost.
        if (typeof url === 'undefined') {
            const port: number = await getPort({
                port: portNumbers(8888, 9999),
            });
            url = `http://localhost:${port}`;
        }

        if (url) {
            port?.postMessage({ state: 'start' });
            [this.url, this.server] = await this.serve(url, timeout);
            port?.postMessage({ state: 'on', detail: this.url });
        }
        else {
            port?.postMessage({ state: 'off' });
        }
    }

    public async visit (): Promise<void>
    {
        if (this.url) {
            await shell.openExternal(this.url);
        }
        else {
            throw Error('The Drupal site is not running.');
        }
    }

    public async open (): Promise<void>
    {
        await access(this.root);
        await shell.openPath(this.root);
    }

    public async destroy (port?: MessagePortMain): Promise<void>
    {
        port?.postMessage({ state: 'destroy' });

        this.server?.kill();
        this.server = null;
        await rm(this.root, { force: true, recursive: true, maxRetries: 3 });

        port?.postMessage({ state: 'clean' });
    }

    private webRoot (): string
    {
        // @todo Determine this dynamically.
        return join(this.root, 'web');
    }

    private async install (archive?: string, port?: MessagePortMain): Promise<void>
    {
        port?.postMessage({
            state: 'install',
            detail: 'Initializing...',
        });

        if (archive) {
            logger.debug(`Using pre-built archive: ${archive}`);
            try {
                await access(archive);
                return this.extractArchive(archive, port);
            }
            catch {
                logger.info('Falling back to Composer because pre-built archive does not exist.');
            }
        }

        // We'll try to parse Composer's output to provide progress information.
        let progress: [number, number] | null = null;

        for (const command of this.commands.install) {
            await new ComposerCommand(...command)
                .inDirectory(this.root)
                .run({}, (line: string, type: OutputType): void => {
                    // Progress messages are sent to STDERR, not STDOUT.
                    if (type === OutputType.Output) {
                        return;
                    }
                    // When Composer reports the number of operations it intends to do,
                    // initialize the progress information.
                    const matches = line.match(/^Package operations: ([0-9]+) installs?,\s*/);
                    if (matches) {
                        const total = parseInt(matches[1]);
                        progress = [0, total];
                    }
                    else if (progress && line.includes('- Installing ')) {
                        progress[0]++;
                    }
                    // Send the output line and progress information to the renderer.
                    port?.postMessage({ state: 'install', detail: line, progress });
                });
        }
        await this.prepareSettings();
    }

    private async extractArchive (file: string, port?: MessagePortMain): Promise<void>
    {
        let total: number = 0;
        let done: number = 0;

        // Find our how many files are in the archive, so we can provide accurate
        // progress information.
        await tar.list({
            file,
            onReadEntry: (): void => {
                total++;
            },
        });

        // We need to create the directory where we'll extract the files.
        await mkdir(this.root, { recursive: true });

        // Send progress information every 500 milliseconds while extracting the
        // archive.
        const interval = setInterval((): void => {
            port?.postMessage({
                state: 'install',
                detail: `Extracting archive (% done)`,
                progress: [done, total],
            });
        }, 500);

        // Extract the archive and, regardless of success or failure, stop sending progress
        // information when done.
        return tar.extract({
            cwd: this.root,
            file,
            onReadEntry: (): void => {
                done++;
            },
        }).finally((): void => {
            clearInterval(interval);
        });
    }

    private async prepareSettings (): Promise<void>
    {
        const siteDir: string = join(this.webRoot(), 'sites', 'default');

        // Copy our settings.local.php, which contains helpful overrides.
        await copyFile(
            join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'settings.local.php'),
            join(siteDir, 'settings.local.php'),
        );

        // Uncomment the last few lines of default.settings.php so that the local
        // settings get loaded. It's a little clunky to do this as an array operation,
        // but as this is a one-time change to a not-too-large file, it's an acceptable
        // trade-off.
        const settingsPath: string = join(siteDir, 'default.settings.php');
        const lines: string[] = (await readFile(settingsPath)).toString().split('\n');
        const replacements: string[] = lines.slice(-4).map((line: string): string => {
            return line.startsWith('# ') ? line.substring(2) : line;
        });
        lines.splice(-4, 3, ...replacements);
        await writeFile(settingsPath, lines.join('\n'));

        // Add the drupal_association_extras module to every install profile. We don't want to
        // hard-code the name or path of the info file, in case Drupal CMS changes it.
        const finder = glob(
            join(this.webRoot(), 'profiles', '*', '*.info.yml'),
        );
        for await (const infoPath of finder) {
            const info = YAML.parse((await readFile(infoPath)).toString());
            info.install ??= [];
            info.install.push('drupal_association_extras');
            await writeFile(infoPath, YAML.stringify(info));
        }
    }

    private async serve (url: string, timeout: number): Promise<[string, ChildProcess]>
    {
        // This needs to be returned as a promise so that, if we reach the timeout,
        // the exception will be caught by the calling code.
        return new Promise(async (resolve, reject): Promise<void> => {
            const timeoutId = setTimeout((): void => {
               reject(`The web server did not start after ${timeout} seconds.`);
            }, timeout * 1000);

            const checkForServerStart = (line: string, _: any, server: ChildProcess): void => {
                if (line.includes(`(${url}) started`)) {
                    clearTimeout(timeoutId);
                    // Automatically kill the server on quit.
                    app.on('will-quit', () => server.kill());
                    resolve([url, server]);
                }
            };

            await new PhpCommand('-d max_execution_time=300', '-S', url.substring(7), '.ht.router.php')
                .start({ cwd: this.webRoot() }, checkForServerStart);
        });
    }
}
