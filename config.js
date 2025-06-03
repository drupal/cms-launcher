// Contains runtime configuration for the Drupal Launcher.

const { app } = require( 'electron' );
const path = require( 'node:path' );

const binDir = path.join( __dirname, 'bin' );

const conf = {

    // The Drupal project root.
    projectRoot: path.join( app.getPath('documents'), 'drupal' ),

    // Paths to required binaries.
    bin: {
        // We use an unpacked version of Composer because the phar file has a
        // shebang line that breaks us, due to GUI-launched Electron apps not
        // inheriting the parent environment in macOS and Linux.
        composer: path.join( binDir, 'composer', 'bin', 'composer' ),
        php: path.join( binDir, 'php' ),
    }

};

module.exports = conf;
