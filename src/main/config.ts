// Contains runtime configuration for the Drupal Launcher.

import { app } from 'electron';
import path from 'node:path';
import process from 'node:process';

// The Drupal project root.
export const projectRoot: string = path.join(app.getPath('documents'), 'drupal');

// Absolute path of the directory with the PHP and Composer binaries.
export const bin: string = path.join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'bin');

export const installLog: string = path.join(app.getPath('temp'), 'install.log');
