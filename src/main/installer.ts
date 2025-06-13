import { bin, installLog, projectRoot } from './config';
import { Events } from "../Drupal";
import { type WebContents } from 'electron';
import { access, appendFile, copyFile, type FileHandle, open, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import readline from 'node:readline';
import { promisify as toPromise } from 'node:util';
import { getWebRoot } from './utils';

// Create an awaitable version of execFile that won't block the main process,
// which would produce a disconcerting beach ball on macOS.
const execFileAsPromise = toPromise( execFile );

async function createProject ( win?: WebContents ): Promise<void>
{
    // Let the renderer know we're about to install Drupal.
    win?.send( Events.InstallStarted );

    // Try to open a file where we can log Composer's output for forensic purposes
    // if an error occurs.
    let log: FileHandle | null;
    try {
        log = await open( installLog, 'w' );
    }
    catch {
        log = null;
    }

    const runComposer = async ( command: string[] ) => {
        log?.write( '\n> ' + command.join( ' ' ) + '\n' );

        command.unshift(
            // Explicitly pass the cURL CA bundle so that HTTPS requests from Composer can
            // succeed on Windows.
            '-d',
            'curl.cainfo=' + path.join( bin, 'cacert.pem' ),
            // We use an unpacked version of Composer because the phar file has a shebang
            // line that breaks us, due to GUI-launched Electron apps not inheriting the
            // parent environment in macOS and Linux.
            path.join( 'composer', 'bin', 'composer' ),
        );
        command.push(
            // Disable ANSI output (i.e., colors) so the log is readable.
            '--no-ansi',
            // We don't want Composer to ask us any questions, since we have no way for
            // the user to answer them.
            '--no-interaction',
        );

        const task = execFileAsPromise( path.join( bin, 'php' ), command, {
            // Run from the `bin` directory so we can use a relative path to Composer.
            cwd: bin,
            // Send a customized copy of the current environment variables to Composer.
            env: Object.assign( {}, process.env, {
                // Set COMPOSER_ROOT_VERSION so that Composer won't try to guess the root
                // package version, which would cause it to invoke Git and other
                // command-line utilities that might not be installed and could therefore
                // raise unexpected warnings on macOS.
                // @see https://getcomposer.org/doc/03-cli.md#composer-root-version
                COMPOSER_ROOT_VERSION: '1.0.0',
                // For performance reasons, skip security audits for now.
                // @see https://getcomposer.org/doc/03-cli.md#composer-no-audit
                COMPOSER_NO_AUDIT: '1',
            } ),
            // No part of installing Drupal CMS should take longer than 10 minutes.
            timeout: 600000,
        } );

        // @todo Rather than use the not-null assertion operator, degrade gracefully
        // if we don't have a valid stderr stream.
        readline.createInterface( task.child.stderr! )
            .on( 'line', ( line ) => {
                log?.write( line + '\n' );
                win?.send( Events.Output, line );
            });

        return task.catch( log?.close );
    }

    // Create the project, but don't install dependencies yet.
    await runComposer([ 'create-project', '--no-install', 'drupal/cms', projectRoot ]);

    // Prevent core's scaffold plugin from trying to dynamically determine if
    // the project is a Git repository, since that will make it try to run Git,
    // which might not be installed.
    await runComposer([ 'config', 'extra.drupal-scaffold.gitignore', 'false', '--json', `--working-dir=${projectRoot}` ]);

    // Require Composer as a dev dependency so that Package Manager can use it
    // without relying on this app.
    await runComposer([ 'require', '--dev', '--no-update', 'composer/composer', `--working-dir=${projectRoot}` ]);

    // Finally, install dependencies. We suppress the progress bar because it
    // looks lame when streamed to the renderer.
    await runComposer([ 'install', '--no-progress', `--working-dir=${projectRoot}` ]);

    // All done, we can stop logging.
    await log?.close();
    try {
        await rm( installLog );
    }
    catch {
        // Couldn't delete the log file -- no big deal.
    }

    const webRoot = getWebRoot( projectRoot );

    const siteDir = path.join( webRoot, 'sites', 'default' );
    // Create a local settings file so we can skip database set-up in the
    // installer, which requires us to pre-generate the hash salt and the path
    // of the config sync directory. We also explicitly configure Package
    // Manager to use our bundled copy of Composer.
    const localSettingsFile = path.join( siteDir, 'settings.local.php' );
    await copyFile(
        path.join( __dirname, '..', '..', 'settings.local.php' ),
        localSettingsFile,
    );
    await appendFile(
        localSettingsFile,
        `
$settings['hash_salt'] = '${ randomBytes( 32 ).toString( 'hex' ) }';
$settings['config_sync_directory'] = '${ path.join( projectRoot, 'config' ) }';`
    );
    // Make sure we load the local settings if using the built-in web server.
    await appendFile(
        path.join( siteDir, 'default.settings.php' ),
        `\nif (PHP_SAPI === 'cli' || PHP_SAPI === 'cli-server') @include_once __DIR__ . '/settings.local.php';\n`,
    );
}

export default async ( win?: WebContents ): Promise<void> => {
    try {
        await access ( projectRoot );
    } catch {
        await createProject( win );
    }
    win?.send( Events.InstallFinished );
};
