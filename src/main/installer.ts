import { installCommands, projectRoot, resourceDir, webRoot } from './config';
import { ComposerCommand } from './ComposerCommand';
import { Events } from '../Drupal';
import { type WebContents } from 'electron';
import logger from 'electron-log';
import { randomBytes } from 'node:crypto';
import { access, appendFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { OutputType } from './PhpCommand';

async function createProject (win?: WebContents): Promise<void>
{
    // Let the renderer know we're about to install Drupal.
    win?.send(Events.InstallStarted);

    const onOutput = (line: string, type: OutputType): void => {
        if (type === OutputType.Debug) {
            logger.debug(line);
        }
        else {
            // Progress messages are sent to STDERR.
            if (type === OutputType.Error) {
                win?.send(Events.Output, line);
            }
            logger.info(line);
        }
    };
    for (const command of installCommands) {
        await new ComposerCommand(...command)
            .inDirectory(projectRoot)
            .run(undefined, onOutput);
    }

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
