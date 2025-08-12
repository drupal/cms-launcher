import { test, expect, _electron as electron } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { installLog } from '../src/main/config';


test.afterEach(async ({}, testInfo) => {
  await rm(join(testInfo.outputDir, 'drupal'), { recursive:true } );
  /*await testInfo.attach('installLog', { path:installLog } );*/
});

test('happy path', async ({}, testInfo) => {

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

  // Wait for the first BrowserWindow to open
  // and return its Page object.
  const window = await electronApp.firstWindow();
  await expect(window.getByText('Your site is running at')).toBeVisible({ timeout: 30_000 });
  const siteURL = await window.getByText('http').textContent();
  console.log(siteURL);
  if (typeof siteURL === 'string') {
    await window.goto(siteURL);
  }
  await expect(window.getByText('It worked!')).toBeVisible();
  // Close app.
  await electronApp.close();
})