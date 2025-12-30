import { test, expect, _electron as electron, type ElectronApplication, type Page, type TestInfo } from '@playwright/test';
import { accessSync } from 'node:fs';
import { join } from 'node:path';
import { PhpCommand } from '@/main/PhpCommand';
import { ComposerCommand } from '@/main/ComposerCommand';

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

async function visitSite (app: ElectronApplication): Promise<Page>
{
  const window = await app.firstWindow();
  const url = await window.getByText(/^http:\/\/localhost:/).textContent() as string;
  expect(typeof url).toBe('string')
  await window.goto(url);

  return window;
}

test.beforeAll(() => {
  const binDir = join(__dirname, '..', 'bin');
  PhpCommand.binary = join(binDir, process.platform == 'win32' ? 'php.exe' : 'php');
  ComposerCommand.binary = join(binDir, 'composer', 'bin', 'composer');
});

test.beforeEach(async ({}, testInfo) => {
  process.env.COMPOSER_HOME = testInfo.outputPath('composer-home');
});

test.afterEach(async ({}, testInfo) => {
  // Always attach the log, regardless of success or failure, for forensic purposes.
  await testInfo.attach('log', {
    path: testInfo.outputPath('app.log'),
  });
});

test('happy path', async ({}, testInfo) => {
  const [app, root] = await launchApp(testInfo, '--fixture=basic');

  const page = await visitSite(app);
  await expect(page.locator('body')).toContainText('It worked! Running PHP via cli-server.');
  await app.close();

  // Confirm that launcher-specific Drupal settings are valid PHP.
  await new PhpCommand('-f', join(root, 'assert-settings.php'), '-d', 'zend.assertions=1')
      .run({ cwd: root }, (line: string): void => {
        console.debug(line);
      });

  // Confirm that a version number was recorded.
  const { stdout } = await new ComposerCommand('config', 'extra.drupal-launcher.version')
      .inDirectory(root)
      .run();
  expect(stdout.toString().trim()).toBe('1');

  // Confirm that the lock file is valid.
  const { stderr } = await new ComposerCommand('validate', '--check-lock')
      .inDirectory(root)
      .run();
  expect(stderr.toString().trim()).not.toContain('errors');
});

test('clean up on failed install', async ({}, testInfo) => {
  const [app, root] = await launchApp(
      testInfo,
      '--fixture=basic',
      `--composer=${join(__dirname, 'fixtures', 'composer-install-error.php')}`,
  );

  const window = await app.firstWindow();
  // Confirm that STDERR output (i.e., progress messages) is streamed to the window.
  await expect(window.getByText('Doing step: ')).toBeVisible();

  const errorElement = window.locator('.error');
  await expect(errorElement).toBeVisible();
  await expect(errorElement).toContainText('An imaginary error occurred!');

  // The "Start" button should not be visible when there is an error.
  await expect(window.getByTitle('Start site')).not.toBeVisible();

  // We expect access() to throw a "no such file or directory" error, because the
  // directory has been deleted.
  expect(() => accessSync(root)).toThrow();
  await app.close();
});

test("no clean up if server doesn't start", async ({}, testInfo) => {
  const [app, root] = await launchApp(testInfo, '--fixture=basic', '--url=not-a-valid-host');

  const window = await app.firstWindow();
  await expect(window.getByText('The web server did not start after 2 seconds.')).toBeVisible({
    // Give an extra-long grace period in case this test is being run on a painfully
    // slow machine.
    timeout: 10_000,
  });

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

test('install from a pre-built archive', async ({}, testInfo) => {
  const fixturesDir = join(__dirname, 'fixtures');

  const [app] = await launchApp(
      testInfo,
      `--archive=${join(fixturesDir, 'prebuilt.tar.gz')}`,
      `--composer=${join(fixturesDir, 'composer-always-error.php')}`,
  );

  const page = await visitSite(app);
  await expect(page.locator('body')).toContainText('A prebuilt archive worked! Running PHP via cli-server.');
  await app.close();
});

test('reset site', async ({}, testInfo) => {
  const [app, root] = await launchApp(testInfo, '--fixture=basic');

  // If the site started up successfully, we should see:
  // - A button to visit the site
  // - A button to clear the cache
  // - A button to open the Drupal directory in the file explorer
  // - A button to delete the site
  const window = await app.firstWindow();
  await expect(window.getByText('Visit Site')).toBeVisible();
  await expect(window.getByTitle('Clear cache')).toBeVisible();
  await expect(window.getByTitle('Open Drupal directory')).toBeVisible();
  const deleteButton = window.getByTitle('Delete site');
  await expect(deleteButton).toBeVisible();

  // Clicking the Delete button should put up a confirmation dialog.
  window.on('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toBe("Your site and content will be permanently deleted. You can't undo this. Are you sure?");
    await dialog.accept();
  });
  await deleteButton.click();

  // Once the delete is done, the Drupal directory should be gone and we should have
  // a button to start (i.e., reinstall) the site again.
  await expect(window.getByText('Reinstall Drupal CMS')).toBeVisible();
  const startButton = window.getByTitle('Start site');
  await expect(startButton).toBeVisible();
  await expect(window.getByText('Reinstall Drupal CMS')).toBeVisible();
  expect(() => accessSync(root)).toThrow();

  // Clicking that button should get us back up and running.
  await startButton.click();
  await expect(window.getByText('Installing...')).toBeVisible();
  await expect(window.getByText('Visit Site')).toBeVisible();

  await app.close();
});

test('error during cache clear', async ({}, testInfo) => {
  const [app] = await launchApp(testInfo, '--fixture=basic');

  const window = await app.firstWindow();
  const clearCacheButton = window.getByTitle('Clear cache');

  // The fixture has a mocked version of `rebuild_token_calculator.sh` which always fails,
  // so we can test how the UI handles an error during cache clear.
  window.on('dialog', async (dialog) => {
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('An error occurred while clearing the cache. It has been reported to the developers.');
    await dialog.accept();
  });
  await clearCacheButton.click();
  // The button should be disabled while we're waiting for the cache clear.
  await expect(clearCacheButton).toBeDisabled();
  // The button should be re-enabled when the operation is done, even if it failed.
  await expect(clearCacheButton).not.toBeDisabled();
});
