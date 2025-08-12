import { test, expect, _electron as electron } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';


test.afterAll(async ({}, testInfo) => {
  rm(join(testInfo.outputDir, 'drupal'), { recursive:true } );
});

test('happy path test', async ({}, testInfo) => {
  test.setTimeout(10_000);
  const launchOptions = {
    args: [
      '.',
      `--root=${join(testInfo.outputDir, 'drupal')}`,
      '--fixture=basic',
    ],
    env: {
      // The fixture is located in a path repository, so we want to ensure Composer
      // makes a full copy of it.
      COMPOSER_MIRROR_PATH_REPOS: '1',
      // Disable the network so we don't inadvertently test the internet.
      COMPOSER_DISABLE_NETWORK: '1',
    },
  };
  
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
  await window.waitForTimeout(10_000);
  await window.screenshot({ path: 'intro.png' });
  // Close app.
  /*await electronApp.close();*/
})