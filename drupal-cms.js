const { execFile } = require( 'node:child_process' );
const {
    appendFile,
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
    // Use an awaitable version of execFile that won't block the main process,
    // which would produce a disconcerting beach ball on macOS.
    await toPromise( execFile )(
        php,
        [ composer, 'create-project', 'drupal/cms', dir ],
        {
            // It should take less than 10 minutes to install Drupal CMS.
            timeout: 600000,
        },
    );
    const webRoot = getWebRoot( dir );

    // Ensure that Package Manager always uses our bundled copy of Composer.
    const siteDir = path.join( webRoot, 'sites', 'default' );
    await appendFile(
        path.join( siteDir, 'default.settings.php' ),
        "if (PHP_SAPI === 'cli' || PHP_SAPI === 'cli-server') @include_once __DIR__ . '/settings.local.php';",
    );
    await writeFile(
        path.join( siteDir, 'settings.local.php' ),
        `<?php\n$composer = '${composer}';\nif (file_exists($composer)) $config['package_manager.settings']['executables']['composer'] = $composer;`,
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
