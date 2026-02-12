import type { ChildProcess } from 'node:child_process';
import getPort, { portNumbers } from 'get-port';
import { OutputType, PhpCommand } from './PhpCommand';
import { app, type MessagePortMain } from 'electron';
import { ComposerCommand } from './ComposerCommand';
import { dirname, join } from 'node:path';
import { access, copyFile, glob, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as tar from 'tar';
import logger from 'electron-log';
import * as YAML from 'yaml';
import i18next from "i18next";

/**
 * Provides methods for installing and serving a Drupal code base.
 */
export class Drupal
{
    public readonly root: string;

    public url: string | null = null;

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

    constructor (root: string, fixture?: string | null)
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
            const repository = JSON.stringify({ type: 'path', url: fixture });
            // The option does not need to be escaped or quoted, because Composer is not being
            // executed through a shell.
            this.commands.install[0].push(`--repository=${repository}`);
        }
    }

    public async install (archive?: string | false, port?: MessagePortMain): Promise<void>
    {
        try {
            await access(this.root);
        }
        catch {
            // The root directory doesn't exist, so we need to install Drupal.
            try {
                await this.doInstall(archive, port);
            }
            catch (e) {
                // Courteously try to clean up the broken site before re-throwing.
                await this.destroy();
                throw e;
            }
        }
    }

    public async destroy (): Promise<void>
    {
        logger.info('Deleting project...');
        this.stop();
        await rm(this.root, { force: true, recursive: true, maxRetries: 3 });
        logger.info('Project was deleted.');
    }

    private stop (): void
    {
        logger.debug(
            this.server?.kill() ? 'Server stopped.' : 'Server was not running, or could not be stopped.',
        );
        this.url = this.server = null;
    }

    public webRoot (): string
    {
        // @todo Determine this dynamically.
        return join(this.root, 'web');
    }

    private async doInstall (archive?: string | false, progress?: MessagePortMain): Promise<void>
    {
        progress?.postMessage({ done: 0, total: 0 });

        if (archive) {
            logger.debug(`Using pre-built archive: ${archive}`);
            try {
                await access(archive);
                return this.extractArchive(archive, progress);
            }
            catch {
                logger.info('Falling back to Composer because pre-built archive does not exist.');
            }
        }

        // We'll try to parse Composer's output to provide progress information.
        let done: number = 0;
        let total: number = 0;

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
                        total = parseInt(matches[1]);
                    }
                    else if (total && line.includes('- Installing ')) {
                        done++;
                    }
                    // Send the output line and progress information to the renderer.
                    progress?.postMessage({ done, total, detail: line });
                });
        }
        await this.prepareSettings();
    }

    private async extractArchive (file: string, progress?: MessagePortMain): Promise<void>
    {
        let done: number = 0;
        let total: number = 0;

        // Count the files in the archive, so we can provide accurate progress info.
        await tar.list({
            file,
            onReadEntry: (): number => total++,
        });
        logger.debug(`Extracting ${total} files.`);

        // We need to create the directory where we'll extract the files.
        await mkdir(this.root, { recursive: true });

        // Send progress information twice per second while extracting the archive.
        const interval = setInterval((): void => {
            progress?.postMessage({ done, total, detail: file });
        }, 500);

        // Extract the archive and, regardless of success or failure, stop sending progress
        // information when done.
        try {
            await tar.extract({
                cwd: this.root,
                file,
                onReadEntry: (): number => done++,
            });
            logger.info('Extracted pre-built archive.');
        }
        finally {
            clearInterval(interval);
        }
    }

    private async prepareSettings (): Promise<void>
    {
        const siteDir: string = join(this.webRoot(), 'sites', 'default');

        // Copy our settings.local.php, which contains helpful overrides.
        await copyFile(
            join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'settings.local.php'),
            join(siteDir, 'settings.local.php'),
        );
        logger.debug('Created settings.local.php.');

        // Create settings.php.
        const settingsPath: string = join(siteDir, 'settings.php');
        await copyFile(
            join(dirname(settingsPath), 'default.settings.php'),
            settingsPath,
        );
        logger.debug('Created settings.php.');

        // Uncomment the last few lines of settings.php to load the local settings. It's
        // a little clunky to do this as an array operation, but as a one-time change to
        // a not-too-large file, it's an acceptable trade-off.
        const lines: string[] = (await readFile(settingsPath)).toString().split('\n');
        const replacements: string[] = lines.slice(-4).map((line: string): string => {
            return line.startsWith('# ') ? line.substring(2) : line;
        });
        lines.splice(-4, 3, ...replacements);
        // Export configuration outside the web root.
        lines.push(`$settings['config_sync_directory'] = '../config';\n`);
        await writeFile(settingsPath, lines.join('\n'));
        logger.debug('Modified settings.php.');

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
            logger.debug(`Modified install profile: ${infoPath}`);
        }
    }

    public async serve (url: string | null = null, timeout: number = 2): Promise<string>
    {
        // If no URL was provided, find an open port on localhost.
        if (url === null) {
            const port: number = await getPort({
                port: portNumbers(8888, 9999),
            });
            url = `http://localhost:${port}`;
        }
        this.url = url;

        logger.debug(`Giving the server ${timeout} seconds to start.`);
        // This needs to be returned as a promise so that, if we reach the timeout,
        // the exception will be caught by the calling code.
        return new Promise(async (resolve, reject): Promise<void> => {
            const timeoutId = setTimeout((): void => {
               reject(
                   i18next.t('serverTimeoutError', { timeout }),
               );
            }, timeout * 1000);

            const checkForServerStart = (line: string, _: any, server: ChildProcess): void => {
                if (line.includes(`(${url}) started`)) {
                    clearTimeout(timeoutId);
                    logger.debug(`Server started!`);

                    app.on('will-quit', () => this.stop());
                    this.server = server;

                    resolve(url);
                }
            };

            await new PhpCommand('-d max_execution_time=300', '-S', url.substring(7), '.ht.router.php')
                .start({ cwd: this.webRoot() }, checkForServerStart);
        });
    }
}
