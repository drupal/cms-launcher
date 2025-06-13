// Contains runtime configuration for the Drupal Launcher.

import { app } from 'electron';
import path from 'node:path';
import process from 'node:process';

// The Drupal project root.
export const projectRoot: string = path.join(app.getPath('documents'), 'drupal');

// Where additional resources are stored. This varies depending on whether the app has
// been packaged for release.
export const resourceDir: string = app.isPackaged ? process.resourcesPath : app.getAppPath();

// The Mozilla CA bundle from cURL.
export const caBundle: string = path.join(resourceDir, 'cacert.pem');

// Absolute path of the directory with the PHP and Composer binaries.
export const bin: string = path.join(resourceDir, 'bin');

// A file where we can log Composer's full output for debugging purposes.
export const installLog: string = path.join(app.getPath('temp'), 'install.log');
