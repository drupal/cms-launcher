// Contains runtime configuration for the Drupal Launcher.

import { app } from 'electron';
import path from 'node:path';

const binDir: string = path.join( __dirname, '..', '..', 'bin' );

// The Drupal project root.
export const projectRoot: string = path.join( app.getPath('documents'), 'drupal' );

// Paths to required binaries.
export const bin = {

    // We use an unpacked version of Composer because the phar file has a
    // shebang line that breaks us, due to GUI-launched Electron apps not
    // inheriting the parent environment in macOS and Linux.
    composer: path.join( binDir, 'composer', 'bin', 'composer' ),

    php: path.join( binDir, 'php' ),

};
