import type { ChildProcess } from 'node:child_process';
import { default as getPort, portNumbers } from 'get-port';
import { OutputType, PhpCommand } from './PhpCommand';
import { app } from 'electron';
import { Events } from './Events';
import { ComposerCommand } from './ComposerCommand';
import { join } from 'node:path';
import { access, copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { tgz } from 'compressing';

/**
 * Provides methods for installing and serving a Drupal code base.
 */
export class Drupal extends EventEmitter
{
    private readonly root: string;

    private readonly commands = {

        install: [
            // Create the project, but don't install dependencies yet.
            ['create-project', '--no-install', 'drupal/cms'],

            // Prevent core's scaffold plugin from trying to dynamically determine if
            // the project is a Git repository, since that will make it try to run Git,
            // which might not be installed.
            ['config', 'extra.drupal-scaffold.gitignore', 'false', '--json'],

            // Require Composer as a dev dependency so that Package Manager can use it
            // without relying on this app.
            ['require', '--dev', '--no-update', 'composer/composer'],

            // Finally, install dependencies. We suppress the progress bar because it
            // looks lame when streamed to the renderer.
            ['install', '--no-progress'],

            // Unpack all recipes. This would normally be done during the `create-project` command
            // if dependencies were being installed at that time.
            ['drupal:recipe-unpack'],
        ],

    }

    constructor (root: string, fixture?: string)
    {
        super();
        this.root = root;

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

    public async start (prebuiltArchive?: string, url?: string | false, timeout: number = 2): Promise<void>
    {
        try {
            await access(this.root);
        }
        catch {
            this.emit(Events.InstallStarted);
            try {
                await this.install(prebuiltArchive);
            }
            catch (e) {
                await rm(this.root, { force: true, recursive: true, maxRetries: 3 });
                throw e;
            }
        }
        this.emit(Events.InstallFinished);

        if (typeof url === 'undefined') {
            const port = await getPort({
                port: portNumbers(8888, 9999),
            });
            url = `http://localhost:${port}`;
        }
        if (url) {
            await this.serve(url, timeout);
        }
    }

    private webRoot (): string
    {
        return join(this.root, 'web');
    }

    private async install (prebuiltArchive?: string): Promise<void>
    {
        if (prebuiltArchive) {
            return tgz.uncompress(prebuiltArchive, this.root);
        }

        for (const command of this.commands.install) {
            await new ComposerCommand(...command)
                .inDirectory(this.root)
                .run({}, (line: string, type: OutputType): void => {
                    // Progress messages are sent to STDERR; forward them to the render.
                    if (type === OutputType.Error) {
                        this.emit(Events.Output, line);
                    }
                });
        }
        await this.prepareSettings();
    }

    private async prepareSettings (): Promise<void>
    {
        const siteDir = join(this.webRoot(), 'sites', 'default');

        // Copy our settings.local.php, which contains helpful overrides.
        await copyFile(
            join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'settings.local.php'),
            join(siteDir, 'settings.local.php'),
        );

        // Uncomment the last few lines of default.settings.php so that the local
        // settings get loaded. It's a little clunky to do this as an array operation,
        // but as this is a one-time change to a not-too-large file, it's an acceptable
        // trade-off.
        const filePath = join(siteDir, 'default.settings.php');
        const lines = (await readFile(filePath)).toString().split('\n');
        const replacements = lines.slice(-4).map((line: string): string => {
            return line.startsWith('# ') ? line.substring(2) : line;
        });
        lines.splice(-4, 3, ...replacements);

        await writeFile(filePath, lines.join('\n'));
    }

    private async serve (url: string, timeout: number): Promise<void>
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
                    this.emit(Events.Started, url, server);
                    resolve();
                }
            };

            await new PhpCommand('-S', url.substring(7), '.ht.router.php')
                .start({ cwd: this.webRoot() }, checkForServerStart);
        });
    }
}
