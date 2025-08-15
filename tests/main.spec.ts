import { test, expect, _electron as electron } from '@playwright/test';
import { access, rm } from 'node:fs/promises';

test.afterEach(async ({}, testInfo) => {
  // Always attach the log, regardless of success or failure.
  await testInfo.attach('log', {
    path: testInfo.outputPath('app.log'),
  });

  if (testInfo.title != 'clean up directory on failed install') {
    await rm(testInfo.outputPath('drupal'), {
      force: true,
      recursive: true,
    });
  }
});

test('happy path', async ({}, testInfo) => {
  const electronApp = await electron.launch({
    args: [
      '.',
      `--root=${testInfo.outputPath('drupal')}`,
      '--fixture=basic',
      `--log=${testInfo.outputPath('app.log')}`,
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

test('clean up directory on failed install', async ({}, testInfo) => {
  const electronApp = await electron.launch({
    args: [
      '.',
      `--root=${testInfo.outputPath('drupal')}`,
      '--fixture=basic',
      `--log=${testInfo.outputPath('app.log')}`,
      '--composer=composer-install-error.php',
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
  await window.waitForTimeout(3000);
  await expect(window.getByText('An imaginary error occurred!')).toBeVisible();
  // Expect access to throw a "no such file or directory" error
  await expect(access((testInfo.outputPath('drupal')))).rejects.toThrow();
  await electronApp.close();
});