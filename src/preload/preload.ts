import Drupal from './Drupal';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld( 'drupal', {

    start: (): void => {
        ipcRenderer.invoke( 'start' );
    },

    open: ( url: string ): void => {
        ipcRenderer.invoke( 'open', url );
    },

    onInstallStarted: ( callback: () => void ): void => {
        ipcRenderer.on( 'install-started', () => callback() );
    },

    onInstallFinished: ( callback: () => void ): void => {
        ipcRenderer.on( 'install-finished', () => callback() );
    },

    onOutput: ( callback: ( line: string ) => void ): void => {
        ipcRenderer.on( 'output', ( undefined, line ): void => callback( line ) );
    },

    onStart: ( callback: ( url: string ) => void ): void => {
        ipcRenderer.on( 'started', ( undefined, url ): void => callback( url ) );
    },

    onError: ( callback: ( message: string ) => void ): void => {
        ipcRenderer.on( 'error', ( undefined, message ): void => callback( message ) );
    },

} as Drupal );
