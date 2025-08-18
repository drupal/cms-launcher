import { test, expect, _electron as electron, type ElectronApplication, type TestInfo } from '@playwright/test';
import { accessSync } from 'node:fs';
import { join } from 'node:path';
import { PhpCommand } from '@/main/PhpCommand';

async function launchApp(testInfo: TestInfo, ...options: string[]): Promise<[ElectronApplication, string]> {
  const root = testInfo.outputPath('drupal');

  const app = await electron.launch({
    args: [
        '.',
        `--root=${root}`,
        `--log=${testInfo.outputPath('app.log')}`,
        `--timeout=2`,
        ...options,
    ],
    env: {
      // The fixture is located in a path repository, so we want to ensure Composer
      // makes a full copy of it.
      COMPOSER_MIRROR_PATH_REPOS: '1',
      // Disable the network so we don't inadvertently test the internet.
      COMPOSER_DISABLE_NETWORK: '1',
    },
  });
  return [app, root];
}

test.beforeAll(() => {
  PhpCommand.binary = join(__dirname, '..', 'bin', process.platform == 'win32' ? 'php.exe' : 'php');
});

test.afterEach(async ({}, testInfo) => {
  // Always attach the log, regardless of success or failure, for forensic purposes.
  await testInfo.attach('log', {
    path: testInfo.outputPath('app.log'),
  });
});

test('happy path', async ({}, testInfo) => {
  const [app, root] = await launchApp(testInfo, '--fixture=basic');

  // Wait for the first BrowserWindow to open and return its Page object, then
  // wait up to 10 seconds for the success message to appear.
  const window = await app.firstWindow();
  // Get the text of the element which starts with a URL.
  const url = await window.getByText(/^http:\/\/localhost:/).textContent() as string;
  expect(typeof url).toBe('string')
  await window.goto(url);
  await expect(window.getByText('It worked!')).toBeVisible();
  await app.close();

  // Confirm that launcher-specific Drupal settings are valid PHP.
  await new PhpCommand('-f', join(root, 'assert-settings.php'), '-d', 'zend.assertions=1')
      .run({ cwd: root }, (line: string): void => {
        console.debug(line);
      });
});

test('clean up on failed install', async ({}, testInfo) => {
  const [app, root] = await launchApp(
      testInfo,
      '--fixture=basic',
      `--composer=${join(__dirname, 'fixtures', 'composer-install-error.php')}`,
  );

  const window = await app.firstWindow();
  // Confirm that STDERR output (i.e., progress messages) is streamed to the window.
  await expect(window.getByText('Doing step: create-project')).toBeVisible();
  await expect(window.locator('.error')).toBeVisible();
  // We expect access() to throw a "no such file or directory" error, because the
  // directory has been deleted.
  expect(() => accessSync(root)).toThrow();
  await app.close();
});

test("no clean up if server doesn't start", async ({}, testInfo) => {
  const [app, root] = await launchApp(testInfo, '--fixture=basic', '--url=not-a-valid-host');

  const window = await app.firstWindow();
  await expect(window.getByText('The web server did not start after 2 seconds.')).toBeVisible();

  // The Drupal root should still exist, because the install succeeded but
  // the server failed to start.
  try {
    accessSync(root);
  }
  finally {
    await app.close();
  }
});

test('server can be disabled', async ({}, testInfo) => {
  const [app, root] = await launchApp(testInfo, '--fixture=basic', '--no-server');

  const window = await app.firstWindow();
  await expect(window.getByText('Installation complete!')).toBeVisible();

  try {
    accessSync(root);
  }
  finally {
    await app.close();
  }
});
