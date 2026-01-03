import {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    MessageChannelMain,
    shell,
} from 'electron';
import logger from 'electron-log';
import { autoUpdater } from 'electron-updater';
import assert from 'node:assert';
import { basename, join } from 'node:path';
import * as Sentry from "@sentry/electron/main";
import { Drupal } from './Drupal';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { PhpCommand } from './PhpCommand';
import { ComposerCommand } from './ComposerCommand';
import i18next from "i18next";

// If the app is packaged, send any uncaught exceptions to Sentry. This has to be done as early
// as possible, which is why it's all the way up here.
if (app.isPackaged) {
    Sentry.init({
        beforeSend: (event, hint) => {
            logger.transports.file.readAllLogs().forEach((log) => {
                hint.attachments ??= [];

                hint.attachments = [{
                    filename: basename(log.path),
                    data: log.lines.join('\n'),
                    contentType: 'text/plain',
                }];
            });
            return event;
        },
        dsn: "https://12eb563e258a6344878c10f16bbde85e@o4509476487233536.ingest.de.sentry.io/4509476503683152",
        // We don't need to send any PII at all, so explicitly disable it. It's disabled
        // by default, but we don't want it changing unexpectedly.
        sendDefaultPii: false,
    });
}

const resourceDir = app.isPackaged ? process.resourcesPath : app.getAppPath();

// These are initialized by the app.whenReady() callback.
let argv: CommandLineOptions;
let drupal: Drupal;

// The shape of our command-line options, to help the type checker deal with yargs.
interface CommandLineOptions
{
    root: string;
    log: string;
    composer: string;
    fixture?: string;
    url?: string;
    timeout: number;
    server: boolean;
    archive: string;
}

ipcMain.handle('drupal:start', async ({ sender: win }): Promise<string | null> => {
    // Open a channel to the renderer so we can send progress information in real time.
    const {
        port1: progress,
        port2: fromHere,
    } = new MessageChannelMain();

    progress.start();
    win.postMessage('port', null, [fromHere]);

    try {
        await drupal.install(argv.archive, progress);

        if (argv.server) {
            // Let the renderer know that we're going to start the server.
            progress.postMessage({ server: true });

            return drupal.serve(argv.url, argv.timeout);
        }
        else {
            return null;
        }
    }
    catch (e: any) {
        // Send the exception to Sentry so we can analyze it later, without requiring
        // users to file a GitHub issue.
        Sentry.captureException(e);

        // If the error was caused by a failed Composer command, it will have an additional
        // `stdout` property with Composer's output.
        throw new Error(e.stdout || e.toString());
    }
    finally {
        // We're not sending any more progress information.
        progress.close();

        // If we're in CI, we're not checking for updates; there's nothing else to do.
        if ('CI' in process.env) {
            app.quit();
        }
        // We wait until Drupal is up and running before checking for updates because we
        // don't want to interrupt Drupal's spin-up process. On newer versions of macOS,
        // the app cannot be auto-updated if it's not in the Applications folder, and will
        // cause an error. In that situation, skip the update check.
        else if (process.platform === 'darwin' && ! app.isInApplicationsFolder()) {
            logger.debug('macOS: Skipping update check because app is not in the Applications folder.');
        }
        else {
            await autoUpdater.checkForUpdatesAndNotify();
        }
    }
});

ipcMain.handle('drupal:clear-cache', async (): Promise<void> => {
    const cwd = join(drupal.webRoot(), 'core');
    try {
        // First, generate the token we need to invoke `rebuild.php` with.
        const { stdout: token } = await new PhpCommand(
            join(cwd, 'scripts', 'rebuild_token_calculator.sh'),
        ).run({ cwd });

        // Now invoke `rebuild.php`, first injecting the token into the $_GET superglobal.
        // The PHP code doesn't need to be quoted, because we're not executing it through
        // a shell.
        await new PhpCommand('-r', `parse_str("${token.trim()}", $_GET); require "rebuild.php";`)
            .run({ cwd });
    }
    catch (e: any) {
        // Log all relevant information and send the exception to Sentry to help debug it.
        logger.error(
            `Cache clear failed: ${e.toString()}`,
            e.stdout.toString(),
            e.stderr.toString(),
        );
        Sentry.captureException(e);

        // Re-throw so that the UI can handle the error.
        throw e;
    }
});

ipcMain.handle('drupal:open', async (): Promise<void> => {
    await shell.openPath(drupal.root);
});

ipcMain.handle('drupal:visit', async (): Promise<void> => {
    // If the UI is working correctly, it should never be possible to reach this point if
    // we don't have a URL.
    assert(typeof drupal.url === 'string');

    await shell.openExternal(drupal.url);
});

ipcMain.handle('drupal:destroy', async (): Promise<void> => {
    await drupal.destroy();
});

// Quit the app when all windows are closed. Normally you'd keep keep the app
// running on macOS, even with no windows open, since that's the common pattern.
// But for a pure launcher like this one, it makes more sense to just quit.
app.on('window-all-closed', app.quit);

app.whenReady().then(async (): Promise<void> => {
    // Set up internationalization.
    await i18next.init({
        resources: {
            en: {
                translation: {
                    // Command-line option descriptions.
                    options: {
                        root: "The absolute path to the Drupal project root.",
                        log: "Path of the log file.",
                        composer: "The path of the Composer PHP script. Don't set this unless you know what you're doing.",
                        url: "The URL of the Drupal site. Don't set this unless you know what you're doing.",
                        timeout: "How long to wait for the web server to start before timing out, in seconds.",
                        server: "Whether to automatically start the web server once Drupal is installed.",
                        archive: "The path of a .tar.gz archive that contains the pre-built Drupal code base.",
                        fixture: "The name of a test fixture from which to create the Drupal project."
                    },
                    // Menu items.
                    menu: {
                        about: "About",
                        quit: "Quit",
                    },
                    serverTimeoutError: "The web server did not start after {{timeout}} seconds.",
                },
            },
        },
        lng: app.getLocale(),
        fallbackLng: 'en',
    });

    // Define and parse command-line options. These are generally only needed for testing,
    // but there might be power users out there.
    const commandLine = yargs().options({
        root: {
            type: 'string',
            description: i18next.t('options.root'),
            default: join(app.getPath('appData'), 'drupal'),
        },
        log: {
            type: 'string',
            description: i18next.t('options.log'),
            default: logger.transports.file.getFile().path,
        },
        composer: {
            type: 'string',
            description: i18next.t('options.composer'),
            default: join(resourceDir, 'bin', 'composer', 'bin', 'composer'),
        },
        url: {
            type: 'string',
            description: i18next.t('options.url'),
        },
        timeout: {
            type: 'number',
            description: i18next.t('options.timeout'),
            default: 5,
        },
        server: {
            type: 'boolean',
            description: i18next.t('options.server'),
            default: true,
        },
        archive: {
            type: 'string',
            description: i18next.t('options.archive'),
            default: join(resourceDir, 'prebuilt.tar.gz'),
        },
    });
    // If in development, allow the Drupal code base to be spun up from a test fixture.
    if (! app.isPackaged) {
        commandLine.option('fixture', {
            type: 'string',
            description: i18next.t('options.fixture'),
        });
    }
    argv = await commandLine.parse(
        hideBin(process.argv),
    );

    logger.initialize();
    // Set the path of the log file. It's a little awkward that this needs to be done by setting
    // a function, but that's just how electron-log works.
    logger.transports.file.resolvePathFn = (): string => argv.log;

    // Set the path of the PHP interpreter. This can't be overridden because the PHP interpreter is
    // an absolute hard requirement of this app.
    PhpCommand.binary = join(resourceDir, 'bin', process.platform === 'win32' ? 'php.exe' : 'php');

    // Set the path to the Composer executable. We need to use an unpacked version of Composer
    // because the phar file has a shebang line that breaks us due to environment variables not
    // being inherited when this app is launched from the UI.
    ComposerCommand.binary = argv.composer;

    // Ensure any auto-update errors are logged and send to Sentry.
    autoUpdater.logger = logger;
    autoUpdater.on('error', e => Sentry.captureException(e));

    // If running in development, leave the menu as-is so we can access dev tools.
    if (app.isPackaged) {
        // The default menu doesn't make sense for this app.
        Menu.setApplicationMenu(null);

        // On macOS, create a minimalistic menu.
        if (process.platform === 'darwin') {
            const menu: Menu = Menu.buildFromTemplate([
                {
                    label: app.getName(),
                    submenu: [
                        {
                            label: i18next.t('menu.about'),
                            role: 'about',
                        },
                        {
                            label: i18next.t('menu.quit'),
                            accelerator: 'Command+Q',
                            click () {
                                app.quit();
                            },
                        },
                    ],
                }
            ]);
            Menu.setApplicationMenu(menu);
        }
    }

    // Initialize the object that manages the Drupal site.
    drupal = new Drupal(
        argv.root,
        argv.fixture ? join(__dirname, '..', '..', 'tests', 'fixtures', argv.fixture) : null,
    );

    // We're all set; load the UI.
    const win = new BrowserWindow({
        width: 800,
        height: 500,
        webPreferences: {
            preload: join(__dirname, '..', 'preload', 'preload.js'),
        },
    });
    win.loadFile(join(__dirname, '..', 'renderer', 'index.html'));
});
