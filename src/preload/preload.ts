import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld( 'drupal', {
    start: (): Promise<string> => {
        return ipcRenderer.invoke( 'start' );
    },
    open: ( url: string ): void => {
        ipcRenderer.invoke( 'open', url );
    },
    onInstallStart: ( callback: () => void ): void => {
        ipcRenderer.on( 'install-start', () => callback() );
    },
    onInstalled: ( callback: () => void ): void => {
        ipcRenderer.on( 'installed', () => callback() );
    },
    onOutput: ( callback: ( line: string ) => void ): void => {
        ipcRenderer.on( 'output', ( _event, line ) => callback( line ) );
    },
} );
