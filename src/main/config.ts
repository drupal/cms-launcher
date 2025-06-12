// Contains runtime configuration for the Drupal Launcher.

import { app } from 'electron';
import path from 'node:path';
import process from 'node:process';

// The Drupal project root.
export const projectRoot: string = path.join( app.getPath('documents'), 'drupal' );

// Absolute path of the directory with the PHP and Composer binaries.
export const bin: string = app.isPackaged
    ? path.join( process.resourcesPath, 'bin')
    : path.join( __dirname, '..', '..', 'bin' );
