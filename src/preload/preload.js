import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld( 'drupal', {
    start: () => {
        return ipcRenderer.invoke( 'start' );
    },
    open: ( url ) => {
        ipcRenderer.invoke( 'open', url );
    },
    onInstallStart: ( callback ) => {
        ipcRenderer.on( 'install-start', () => callback() );
    },
    onInstalled: ( callback ) => {
        ipcRenderer.on( 'installed', () => callback() );
    },
    onOutput: ( callback ) => {
        ipcRenderer.on( 'output', ( _event, line ) => callback( line ) );
    },
} );
