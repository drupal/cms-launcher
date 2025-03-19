const { execFile } = require( 'node:child_process' );
const { randomBytes } = require( 'node:crypto' );
const {
    appendFile,
    copyFile,
    cp: mirror,
    readFile,
    writeFile,
} = require( 'node:fs/promises' );
const path = require( 'node:path' );
const {
    promisify: toPromise,
} = require( 'node:util' );
const { getWebRoot } = require( './utils' );
const {
    parse: fromYAML,
    stringify: toYAML,
} = require( 'yaml' );

module.exports = async ( dir, { php, composer }) => {
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
    const execFileAsPromise = toPromise( execFile );

    // Create the project, but don't install dependencies yet.
    await execFileAsPromise(
        php,
        [ composer, 'create-project', '--no-install', 'drupal/cms', dir ],
        { env },
    );

    // Prevent core's scaffold plugin from trying to dynamically determine if
    // the project is a Git repository, since that will make it try to run Git,
    // which might not be installed.
    await execFileAsPromise(
        php,
        [ composer, 'config', 'extra.drupal-scaffold.gitignore', 'true', '--json', `--working-dir=${dir}` ],
        { env },
    );

    // Install dependencies. For faster spin-up, skip the security audit.
    await execFileAsPromise(
        php,
        [ composer, 'install', `--working-dir=${dir}` ],
        {
            env,
            // It should take less than 10 minutes to install Drupal CMS.
            timeout: 600000,
        }
    );

    const webRoot = getWebRoot( dir );

    const siteDir = path.join( webRoot, 'sites', 'default' );
    // Create a local settings file so we can skip database set-up in the
    // installer, which requires us to pre-generate the hash salt and the path
    // of the config sync directory. We also explicitly configure Package
    // Manager to use our bundled copy of Composer.
    const localSettingsFile = path.join( siteDir, 'settings.local.php' );
    await copyFile(
        path.join( __dirname, 'settings.local.php' ),
        localSettingsFile,
    );
    await appendFile(
        localSettingsFile,
        `
$settings['hash_salt'] = '${ randomBytes( 32 ).toString( 'hex' ) }';
$settings['config_sync_directory'] = '${ path.join( dir, 'config' ) }';
$config['package_manager.settings']['executables']['composer'] = '${composer}';`,
    );
    // Make sure we load the local settings if using the built-in web server.
    await appendFile(
        path.join( siteDir, 'default.settings.php' ),
        `\nif (PHP_SAPI === 'cli' || PHP_SAPI === 'cli-server') @include_once __DIR__ . '/settings.local.php';\n`,
    );

    // Copy the `live_update` module into the code base and alter the install profile to include it.
    await mirror(
        path.join( __dirname, 'live_update' ),
        path.join( webRoot, 'modules', 'live_update' ),
        {
            recursive: true,
        },
    );
    const infoFile = path.join( webRoot, 'profiles', 'drupal_cms_installer', 'drupal_cms_installer.info.yml' );
    let info = await readFile( infoFile );
    info = fromYAML( info.toString() );
    info.install ??= [];
    info.install.push( 'live_update' );
    await writeFile( infoFile, toYAML( info ) );
};
