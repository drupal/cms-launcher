import { installCommands, installLog, projectRoot, resourceDir, webRoot } from './config';
import { ComposerCommand } from './ComposerCommand';
import { Events } from '../Drupal';
import { type WebContents } from 'electron';
import { randomBytes } from 'node:crypto';
import { type EventEmitter } from 'node:events';
import { access, appendFile, copyFile, type FileHandle, open } from 'node:fs/promises';
import path from 'node:path';
import { OutputType } from './PhpCommand';

async function createProject (win?: WebContents): Promise<void>
{
    // Let the renderer know we're about to install Drupal.
    win?.send(Events.InstallStarted);

    // Try to open a file where we can log Composer's output for forensic purposes
    // if an error occurs.
    let log: any = null;
    try {
        // @todo Remove EventEmitter from the intersection type when Node's type
        // definitions are updated to reflect the documentation.
        // @see https://nodejs.org/docs/latest/api/fs.html#class-filehandle
        log = await open(installLog, 'a') as FileHandle&EventEmitter;

        // Invalidate the handle when the file is closed, so we don't try to write to
        // it accidentally.
        log.on('close', (): void => {
            log = null;
        });
    }
    catch {
        log = null;
    }

    const onOutput = (line: string, type: OutputType): void => {
        if (type === OutputType.Debug) {
            log?.write('\n>>> ' + line + '\n');
        }
        else if (type === OutputType.Error) {
            log?.write(line + '\n');
            win?.send(Events.Output, line);
        }
    };

    for (const command of installCommands) {
        const runner = new ComposerCommand(...command);

        // Always direct Composer to the created project root, unless we're about to
        // create it initially.
        if (command[0] !== 'create-project') {
            runner.append(`--working-dir=${projectRoot}`);
        }
        await runner.run(undefined, onOutput).catch(log?.close);
    }
    // All done, we can stop logging.
    await log?.close();

    const siteDir = path.join(webRoot, 'sites', 'default');
    // Create a local settings file so we can skip database set-up in the
    // installer, which requires us to pre-generate the hash salt and the path
    // of the config sync directory. We also explicitly configure Package
    // Manager to use our bundled copy of Composer.
    const localSettingsFile = path.join(siteDir, 'settings.local.php');
    await copyFile(
        path.join(resourceDir, 'settings.local.php'),
        localSettingsFile,
    );
    await appendFile(
        localSettingsFile,
        `
$settings['hash_salt'] = '${randomBytes(32).toString('hex')}';
$settings['config_sync_directory'] = '${path.join(projectRoot, 'config')}';`
    );
    // Make sure we load the local settings if using the built-in web server.
    await appendFile(
        path.join(siteDir, 'default.settings.php'),
        `\nif (PHP_SAPI === 'cli' || PHP_SAPI === 'cli-server') @include_once __DIR__ . '/settings.local.php';\n`,
    );
}

export default async (win?: WebContents): Promise<void> => {
    try {
        await access(projectRoot);
    } catch {
        await createProject(win);
    }
    win?.send(Events.InstallFinished);
};
