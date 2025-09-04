import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import logger from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { basename, join } from 'node:path';
import * as Sentry from "@sentry/electron/main";
import { Drupal } from './Drupal';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { PhpCommand } from './PhpCommand';
import { ComposerCommand } from './ComposerCommand';
import { type ChildProcess } from 'node:child_process';

// If any uncaught exception happens, send it to Sentry.
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

logger.initialize();

const resourceDir = app.isPackaged ? process.resourcesPath : app.getAppPath();

// Define the command-line options we support.
const commandLine = yargs().options({
    root: {
        type: 'string',
        description: 'The absolute path to the Drupal project root.',
        default: join(app.getPath('appData'), 'drupal'),
    },
    log: {
        type: 'string',
        description: "Path of the log file.",
        default: logger.transports.file.getFile().path,
    },
    composer: {
        type: 'string',
        description: "The path of the Composer PHP script. Don't set this unless you know what you're doing.",
        default: join(resourceDir, 'bin', 'composer', 'bin', 'composer'),
    },
    url: {
        type: 'string',
        description: "The URL of the Drupal site. Don't set this unless you know what you're doing.",
    },
    timeout: {
        type: 'number',
        description: 'How long to wait for the web server to start before timing out, in seconds.',
        default: 30,
    },
    server: {
        type: 'boolean',
        description: 'Whether to automatically start the web server once Drupal is installed.',
        default: true,
    },
    archive: {
        type: 'string',
        description: "The path of a .tar.gz archive that contains the pre-built Drupal code base.",
        default: join(resourceDir, 'prebuilt.tar.gz'),
    },
});

// If in development, allow the Drupal code base to be spun up from a test fixture.
if (! app.isPackaged) {
    commandLine.option('fixture', {
        type: 'string',
        description: 'The name of a test fixture from which to create the Drupal project.',
    });
}

// Define the shape of our command-line options, to help the type checker deal with yargs.
interface Options
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

// Parse the command line and use it to set the path to Composer and the log file.
const argv: Options = commandLine.parseSync(
    hideBin(process.argv),
);

// The path to PHP. This cannot be overridden because PHP is an absolute hard requirement
// of this app.
PhpCommand.binary = join(resourceDir, 'bin', process.platform === 'win32' ? 'php.exe' : 'php');

// Set the path to the Composer executable. We need to use an unpacked version of Composer
// because the phar file has a shebang line that breaks us due to environment variables not
// being inherited when this app is launched from the UI.
ComposerCommand.binary = argv.composer;

// Set the path to the log file. It's a little awkward that this needs to be done by setting
// a function, but that's just how electron-log works.
logger.transports.file.resolvePathFn = (): string => argv.log;

ipcMain.on('drupal:start', async ({ sender: win }): Promise<void> => {
    const drupal = new Drupal(argv.root, argv.fixture);

    drupal.on('will-install', (): void => {
        win.send('will-install');
    });
    drupal.on('progress', (message: string): void => {
        win.send('progress', message);
    });
    drupal.on('did-install', (): void => {
        win.send('did-install', argv.server);

        // If we're in CI, we're not checking for updates; there's nothing else to do.
        if ('CI' in process.env) {
            app.quit();
        }
    });
    drupal.on('did-start', (url: string, server: ChildProcess): void => {
        // Automatically kill the server on quit.
        app.on('will-quit', () => server.kill());
        // Let the user know we're up and running.
        win.send('did-start', url);
    });

    // After checking for updates, quit it we're not going to start the web server.
    autoUpdater.on('update-not-available', (): void => {
       if (! argv.server) {
           app.quit();
       }
    });

    try {
        await drupal.start(argv.archive, argv.server ? argv.url : false, argv.timeout);
    }
    catch (e: any) {
        // Send the exception to Sentry so we can analyze it later, without requiring
        // users to file a GitHub issue.
        Sentry.captureException(e);
        // If the error was caused by a failed Composer command, it will have an additional
        // `stdout` property with Composer's output.
        win.send('error', e.stdout || e.toString());
    }
    finally {
        // Set up logging to help with debugging auto-update problems, ensure any
        // errors are sent to Sentry, and check for updates.
        autoUpdater.logger = logger;
        autoUpdater.on('error', e => Sentry.captureException(e));
        await autoUpdater.checkForUpdatesAndNotify();
    }
});

ipcMain.on('drupal:open', async (_: any, url: string): Promise<void> => {
    await shell.openExternal(url);
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

    // On macOS, totally redefine the menu.
    if (process.platform === 'darwin') {
        const menu: Menu = Menu.buildFromTemplate([
            {
                label: app.getName(),
                submenu: [
                    {
                        label: 'About',
                        role: 'about',
                    },
                    {
                        label: 'Quit',
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

    win.loadFile(join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then((): void => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
