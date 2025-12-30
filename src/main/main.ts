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

// If the app is packaged, send any uncaught exceptions to Sentry.
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

logger.initialize();

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

// The path to PHP. This cannot be overridden because PHP is an absolute hard requirement
// of this app.
PhpCommand.binary = join(resourceDir, 'bin', process.platform === 'win32' ? 'php.exe' : 'php');

ipcMain.handle('drupal:start', async ({ sender: win }): Promise<string | null> => {
    // Set up logging to help with debugging auto-update problems, and ensure any
    // errors are sent to Sentry.
    autoUpdater.logger = logger;
    autoUpdater.on('error', e => Sentry.captureException(e));

    // Open a channel to the renderer so we can send progress information in real time.
    const {
        port1: progress,
        port2: fromHere,
    } = new MessageChannelMain();

    progress.start();
    win.postMessage('port', null, [fromHere]);

    try {
        await drupal.install(argv.archive, progress);
        return argv.server ? await drupal.serve(argv.url, argv.timeout) : null;
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
        // On newer versions of macOS, the app cannot be auto-updated if it's not in
        // the Applications folder, and will cause an error. In that situation, don't
        // even bother to check for updates.
        else if (process.platform === 'darwin' && ! app.isInApplicationsFolder()) {
            logger.debug('macOS: Skipping update check because app is not in the Applications folder.');
        }
        else {
            await autoUpdater.checkForUpdatesAndNotify();
        }
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

function createWindow (): void
{
    const win = new BrowserWindow({
        width: 800,
        height: 500,
        webPreferences: {
            preload: join(__dirname, '..', 'preload', 'preload.js'),
        },
    });

    // If running in development, leave the menu as-is so we can access dev tools.
    if (app.isPackaged) {
        // On macOS, totally redefine the menu.
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
        else {
            // Disable the default menu on Windows and Linux, since it doesn't make sense
            // for this app.
            Menu.setApplicationMenu(null);
        }
    }
    win.loadFile(join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(async (): Promise<void> => {
    await i18next.init({
        resources: {
            en: {
                translation: {
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
                    menu: {
                        about: "About",
                        quit: "Quit",
                    },
                    drupal: {
                        install: {
                            init: "Initializing...",
                            extract: "Extracting archive (% done)",
                        },
                        error: {
                            timeout: "The web server did not start after {{timeout}} seconds.",
                        },
                    },
                },
            },
        },
        lng: app.getLocale(),
        fallbackLng: 'en',
    });

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
            default: 30,
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

    // Set the path to the Composer executable. We need to use an unpacked version of Composer
    // because the phar file has a shebang line that breaks us due to environment variables not
    // being inherited when this app is launched from the UI.
    ComposerCommand.binary = argv.composer;

    // Set the path to the log file. It's a little awkward that this needs to be done by setting
    // a function, but that's just how electron-log works.
    logger.transports.file.resolvePathFn = (): string => argv.log;

    // Initialize the object that manages the Drupal site.
    drupal = new Drupal(
        argv.root,
        argv.fixture ? join(__dirname, '..', '..', 'tests', 'fixtures', argv.fixture) : null,
    );

    createWindow();
});
