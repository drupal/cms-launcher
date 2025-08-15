import { projectRoot } from './config';
import { Commands, Events } from "../Drupal";
import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import logger from 'electron-log';
import { autoUpdater } from 'electron-updater';
import install from './installer';
import { rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { startServer } from './php';
import * as Sentry from "@sentry/electron/main";

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

ipcMain.on( Commands.Start, async ({ sender: win }): Promise<void> => {
    try {
        await install(win);

        // Start the built-in PHP web server and automatically kill it on quit.
        const [url, server] = await startServer();
        app.on('will-quit', () => server.kill());

        // Let the user know we're up and running.
        win.send(Events.Started, url);

        // Set up logging to help with debugging auto-update problems, ensure any
        // errors are sent to Sentry, and check for updates.
        autoUpdater.logger = logger;
        autoUpdater.on('error', e => Sentry.captureException(e));
        autoUpdater.checkForUpdatesAndNotify();
    }
    catch (e) {
        // Send the exception to Sentry so we can analyze it later, without requiring
        // users to file a GitHub issue.
        Sentry.captureException(e);
        win.send(Events.Error, e);

        // Remove unfinished install directory, so installation can be tried again cleanly.
        await rm(projectRoot, { force: true, recursive: true, maxRetries: 3 });
    }
} );

ipcMain.on(Commands.Open, (undefined, url: string): void => {
    shell.openExternal(url);
} );

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
