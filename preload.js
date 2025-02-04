const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld( 'drupal', {
    start: () => {
        ipcRenderer.invoke( 'start' );
    },
    open: () => {
        ipcRenderer.invoke( 'open' );
    },
    onInstallStart: ( callback ) => {
        ipcRenderer.on( 'install-start', () => callback() );
    },
    onInstalled: ( callback ) => {
        ipcRenderer.on( 'installed', () => callback() );
    },
    onReady: ( callback ) => {
        ipcRenderer.on( 'ready', ( _event, url ) => callback( url ) );
    },
} );
