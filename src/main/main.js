import { app, BrowserWindow, ipcMain, shell } from 'electron';
import install from './installer';
import path from 'node:path';
import startServer from './php-server';

ipcMain.handle( 'start', async ({ sender: win }) => {
    await install( win );

    const { url, serverProcess } = await startServer();
    app.on( 'will-quit', () => serverProcess.kill() );

    return url;
} );

ipcMain.handle( 'open', ( undefined, url ) => {
    shell.openExternal( url );
} );

// Quit the app when all windows are closed. Normally you'd keep keep the app
// running on macOS, even with no windows open, since that's the common pattern.
// But for a pure launcher like this one, it makes more sense to just quit.
app.on( 'window-all-closed', app.quit );

function createWindow ()
{
    const win = new BrowserWindow({
        width: 800,
        height: 500,
        webPreferences: {
            preload: path.join( __dirname, '..', 'preload', 'preload.js' ),
        },
    });
    win.loadFile( path.join( __dirname, '..', 'renderer', 'index.html' ) );
}

app.whenReady().then(() => {
    createWindow();

    app.on( 'activate', () => {
        if ( BrowserWindow.getAllWindows().length === 0 ) {
            createWindow();
        }
    } );
});
