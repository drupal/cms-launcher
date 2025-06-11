import { app, BrowserWindow, ipcMain, shell } from 'electron';
import install from './installer';
import path from 'node:path';
import { platform } from 'node:process';
import startServer from './php-server';

ipcMain.handle( 'start', async ({ sender: win }) => {
    await install( win );

    const { url, serverProcess } = await startServer();
    app.on( 'will-quit', () => serverProcess.kill() );

    return url;
} );

ipcMain.handle( 'open', ( event, url ) => {
    shell.openExternal( url );
} );

app.on( 'window-all-closed', () => {
    if ( platform !== 'darwin' ) {
        app.quit();
    }
} );

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
