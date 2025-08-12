import { bin, installCommands, installLog, projectRoot, resourceDir, webRoot } from './config';
import { Events } from "../Drupal";
import { app, type WebContents } from 'electron';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { type EventEmitter } from 'node:events';
import { access, appendFile, copyFile, type FileHandle, open } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { promisify as toPromise } from 'node:util';

// Create an awaitable version of execFile that won't block the main process,
// which would produce a disconcerting beach ball on macOS.
const execFileAsPromise = toPromise(execFile);

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
        log = await open(installLog, 'w') as FileHandle&EventEmitter;

        // Invalidate the handle when the file is closed, so we don't try to write to
        // it accidentally.
        log.on('close', (): void => {
            log = null;
        });
    }
    catch {
        log = null;
    }

    const runComposer = (command: string[]) => {
        log?.write('\n>>> ' + command.join(' ') + '\n');

        // Always direct Composer to the created project root, unless we're about to
        // create it initially.
        if (command[0] !== 'create-project') {
            command.push(`--working-dir=${projectRoot}`);
        }
        command.push(
            // Disable ANSI output (i.e., colors) so the log is readable.
            '--no-ansi',
            // We don't want Composer to ask us any questions, since we have no way for
            // the user to answer them.
            '--no-interaction',
        );
        command.unshift(
            // Explicitly pass the cURL CA bundle so that HTTPS requests from Composer can
            // succeed on Windows.
            '-d',
            'curl.cainfo=' + path.join(bin, 'cacert.pem'),
            // We use an unpacked version of Composer because the phar file has a shebang
            // line that breaks us, due to GUI-launched Electron apps not inheriting the
            // parent environment in macOS and Linux.
            path.join('composer', 'bin', 'composer'),
        );

        const task = execFileAsPromise(path.join(bin, 'php'), command, {
            // Run from the `bin` directory so we can use a relative path to Composer.
            cwd: bin,
            // Send a customized copy of the current environment variables to Composer.
            env: Object.assign({}, process.env, {
                // Set COMPOSER_ROOT_VERSION so that Composer won't try to guess the root
                // package version, which would cause it to invoke Git and other
                // command-line utilities that might not be installed and could therefore
                // raise unexpected warnings on macOS.
                // @see https://getcomposer.org/doc/03-cli.md#composer-root-version
                COMPOSER_ROOT_VERSION: '1.0.0',
                // For performance reasons, skip security audits for now.
                // @see https://getcomposer.org/doc/03-cli.md#composer-no-audit
                COMPOSER_NO_AUDIT: '1',
                // Composer doesn't work without COMPOSER_HOME.
                COMPOSER_HOME: path.join(app.getPath('home'), '.composer'),
            }),
            // No part of installing Drupal CMS should take longer than 10 minutes.
            timeout: 600000,
        });
        if (task.child.stderr) {
            readline.createInterface(task.child.stderr).on('line', (line: string): void => {
                log?.write(line + '\n');
                win?.send(Events.Output, line);
            });
        }
        return task.catch(log?.close);
    }

    for (const command of installCommands) {
        await runComposer(command);
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
