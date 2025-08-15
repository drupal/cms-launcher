import { test, expect, _electron as electron } from '@playwright/test';
import { accessSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { PhpCommand } from '@/main/PhpCommand';

async function launchApp(root: string, fixture: string, log: string, composer?: string) {
  const args = [
      '.',
      `--root=${root}`,
      `--fixture=${fixture}`,
      `--log=${log}`,
    ];
  if (composer) {
    args.push(`--composer=${composer}`);
  }
  return electron.launch({
    args: args,
    env: {
      // The fixture is located in a path repository, so we want to ensure Composer
      // makes a full copy of it.
      COMPOSER_MIRROR_PATH_REPOS: '1',
      // Disable the network so we don't inadvertently test the internet.
      COMPOSER_DISABLE_NETWORK: '1',
    },
  });
}

test.beforeAll(() => {
  PhpCommand.binary = join(__dirname, '..', 'bin', process.platform == 'win32' ? 'php.exe' : 'php');
});

test.afterEach(async ({}, testInfo) => {
  // Always attach the log, regardless of success or failure.
  await testInfo.attach('log', {
    path: testInfo.outputPath('app.log'),
  });

  if (!testInfo.tags.includes('@cleans-up')) {
    await rm(testInfo.outputPath('drupal'), {
      force: true,
      recursive: true,
    });
  }
});

test('happy path', async ({}, testInfo) => {
  const root = testInfo.outputPath('drupal');

  const electronApp = await launchApp(
    root,
    'basic',
    testInfo.outputPath('app.log'),
  );

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

  // Confirm that launcher-specific Drupal settings are valid PHP.
  await new PhpCommand('-f', join(root, 'assert-settings.php'), '-d', 'zend.assertions=1')
      .run({ cwd: root }, (line: string): void => {
        console.debug(line);
      });
});

test('clean up directory on failed install', {
  tag: '@cleans-up',
}, async ({}, testInfo) => {
  const root = testInfo.outputPath('drupal');

  const electronApp = await launchApp(
    root,
    'basic',
    testInfo.outputPath('app.log'),
    'composer-install-error.php',
  );

  // Wait for the first BrowserWindow to open and return its Page object, then
  // wait up to 10 seconds for the success message to appear.
  const window = await electronApp.firstWindow();
  await window.waitForTimeout(3000);
  await expect(window.getByText('An imaginary error occurred!')).toBeVisible();
  await expect(window.locator('.error')).toBeVisible();
  // Expect access to throw a "no such file or directory" error
  expect(() => accessSync(root)).toThrow();
  await electronApp.close();
});