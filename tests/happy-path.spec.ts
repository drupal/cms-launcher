import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { sep, join } from 'node:path';

let installDir: string;


test.beforeAll(async () => {
  try {
    installDir = await mkdtemp(`${tmpdir()}${sep}drupal-temp-`);
    console.log(`Temporary directory created at: ${installDir}`);
  } catch (err) {
    console.error('Error creating temporary directory:', err);
  }

  console.log('Before tests');
});

test.afterAll(async () => {
  try {
    rm(installDir, { recursive:true } );
    console.log(`Successfully removed: ${installDir}`);
  } catch (err) {
    console.error('Error removing temporary directory:', err);
  }

  console.log('After tests');
});

test('happy path test', async () => {
  test.setTimeout(30_000);
  const launchOptions = {
    args: [
      '.',
      `--root=${join(installDir, 'drupal')}`,
      '--fixture=basic',
    ],
    env: {
      COMPOSER_MIRROR_PATH_REPOS: '1',
      COMPOSER_DISABLE_NETWORK: '1',
    },
  };

  /*const launchOptions = {
    args: ['.']
  };*/

  // Launch Electron app.
  const electronApp = await electron.launch(launchOptions);
  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    // This runs in Electron's main process, parameter here is always
    // the result of the require('electron') in the main app script.
    return app.isPackaged;
  });

  expect(isPackaged).toBe(false);

  // Wait for the first BrowserWindow to open
  // and return its Page object.
  const window = await electronApp.firstWindow();
  await window.waitForTimeout(30_000);
  await window.screenshot({ path: 'intro.png' });
  // Close app.
  /*await electronApp.close();*/
})