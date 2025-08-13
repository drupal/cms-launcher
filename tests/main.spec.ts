import { test, expect, _electron as electron } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

test.afterEach(async ({}, testInfo) => {
  // Always attach the install log, regardless of success or failure.
  await testInfo.attach('install log', {
    path: testInfo.outputPath('install.log'),
  });

  await rm(testInfo.outputPath('drupal'), {
    force: true,
    recursive: true,
  });
});

test('happy path', async ({}, testInfo) => {
  const electronApp = await electron.launch({
    args: [
      '.',
      `--root=${testInfo.outputPath('drupal')}`,
      '--fixture=basic',
      `--log=${testInfo.outputPath('install.log')}`,
      '--no-sandbox',
    ],
    env: {
      // The fixture is located in a path repository, so we want to ensure Composer
      // makes a full copy of it.
      COMPOSER_MIRROR_PATH_REPOS: '1',
      // Disable the network so we don't inadvertently test the internet.
      COMPOSER_DISABLE_NETWORK: '1',
    },
  });

  // Wait for the first BrowserWindow to open and return its Page object, then
  // wait up to 10 seconds for the success message to appear.
  const window = await electronApp.firstWindow();
  // Get the text of the element which starts with a URL.
  const url = await window.getByText(/^http:\/\/localhost:/)
      .textContent();
  expect(typeof url).toBe('string');
  await window.goto(url);
  await expect(window.getByText('It worked!')).toBeVisible();
  await electronApp.close();
});
