const {
    app,
    BrowserWindow,
    ipcMain,
    shell,
} = require( 'electron' );

const installHandler = require( './drupal-cms' );
const install = require( './installer' );
const path = require( 'node:path' );
const { platform } = require( 'node:process' );
const startServer = require( './php-server' );

let url;

ipcMain.handle( 'start', async ({ sender: win }) => {
    const dir = path.join( app.getAppPath(), 'drupal' );

    await install( dir, installHandler, win );

    const { url: _url, process } = await startServer( dir, win );
    url = _url;
    // Kill the server process on quit.
    app.on( 'will-quit', () => process.kill() );
} );

ipcMain.handle( 'open', () => {
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
        height: 300,
        webPreferences: {
            preload: path.join( __dirname, 'preload.js' ),
        },
    });
    win.loadFile( 'index.html' );

    if ( url ) {
        win.webContents.send( 'ready', url );
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on( 'activate', () => {
        if ( BrowserWindow.getAllWindows().length === 0 ) {
            createWindow();
        }
    } );
});
