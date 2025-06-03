const { projectRoot, bin } = require( './config' );
const { access, copyFile, appendFile } = require( 'node:fs/promises' );
const {
    promisify: toPromise,
} = require( 'node:util' );
const { execFile } = require( 'node:child_process' );
const { getWebRoot } = require( './utils' );
const path = require( 'node:path' );
const readline = require( 'node:readline' );
const { randomBytes } = require( 'node:crypto' );

async function createProject ( win )
{
    // Let the renderer know we're about to install Drupal.
    win?.send( 'install-start' );

    const { php, composer } = bin;

    // Send a customized copy of the current environment variables to Composer.
    const env = Object.assign( {}, process.env );
    // Set COMPOSER_ROOT_VERSION so that Composer won't try to guess the root
    // package version, which would cause it to invoke Git and other
    // command-line utilities that might not be installed and could therefore
    // raise unexpected warnings on macOS.
    // @see https://getcomposer.org/doc/03-cli.md#composer-root-version
    env.COMPOSER_ROOT_VERSION = '1.0.0';
    // For performance purposes, skip security audits for now.
    // @see https://getcomposer.org/doc/03-cli.md#composer-no-audit
    env.COMPOSER_NO_AUDIT = '1';

    // Use an awaitable version of execFile that won't block the main process,
    // which would produce a disconcerting beach ball on macOS.
    const _execFile = toPromise( execFile );

    const execAndStreamOutput = async ( command, _arguments, options ) => {
        const task = _execFile( command, _arguments, options );

        readline.createInterface( task.child.stderr )
            .on( 'line', ( line ) => {
                win?.send( 'output', line );
            });

        return task;
    }

    // Create the project, but don't install dependencies yet.
    await execAndStreamOutput(
        php,
        [ composer, 'create-project', '--no-install', 'drupal/cms', projectRoot ],
        { env },
    );
    // Prevent core's scaffold plugin from trying to dynamically determine if
    // the project is a Git repository, since that will make it try to run Git,
    // which might not be installed.
    await execAndStreamOutput(
        php,
        [ composer, 'config', 'extra.drupal-scaffold.gitignore', 'false', '--json' ],
        {
            cwd: projectRoot,
            env,
        },
    );
    // Finally, install dependencies. We suppress the progress bar because it
    // looks lame when streamed to the renderer.
    await execAndStreamOutput(
        php,
        [ composer, 'install', '--no-progress' ],
        {
            cwd: projectRoot,
            env,
            // It should take less than 10 minutes to install Drupal CMS.
            timeout: 600000,
        }
    );

    const webRoot = getWebRoot( projectRoot );

    const siteDir = path.join( webRoot, 'sites', 'default' );
    // Create a local settings file so we can skip database set-up in the
    // installer, which requires us to pre-generate the hash salt and the path
    // of the config sync directory. We also explicitly configure Package
    // Manager to use our bundled copy of Composer, and allow it to operate in
    // the direct-write mode supported as of Drupal 11.2.
    const localSettingsFile = path.join( siteDir, 'settings.local.php' );
    await copyFile(
        path.join( __dirname, 'settings.local.php' ),
        localSettingsFile,
    );
    await appendFile(
        localSettingsFile,
        `
$settings['hash_salt'] = '${ randomBytes( 32 ).toString( 'hex' ) }';
$settings['config_sync_directory'] = '${ path.join( projectRoot, 'config' ) }';
$settings['package_manager_allow_direct_write'] = TRUE;
$config['package_manager.settings']['executables']['composer'] = '${composer}';`,
    );
    // Make sure we load the local settings if using the built-in web server.
    await appendFile(
        path.join( siteDir, 'default.settings.php' ),
        `\nif (PHP_SAPI === 'cli' || PHP_SAPI === 'cli-server') @include_once __DIR__ . '/settings.local.php';\n`,
    );
}

module.exports = async ( win ) => {
    try {
        await access ( projectRoot );
    } catch {
        await createProject( win );
    }
    win?.send( 'installed' );
};
