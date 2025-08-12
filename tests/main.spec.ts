import { test, expect, _electron as electron } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';


test.afterEach(async ({}, testInfo) => {
  const projectRoot = join(testInfo.outputDir, 'drupal');
  await rm(projectRoot, { recursive: true });
});

test('happy path', async ({}, testInfo) => {
  const electronApp = await electron.launch({
    args: [
      '.',
      `--root=${join(testInfo.outputDir, 'drupal')}`,
      '--fixture=basic',
      `--log=${join(testInfo.outputDir, 'install.log')}`,
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
