import Drupal from './Drupal';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld( 'drupal', {

    start: (): Promise<string> => {
        return ipcRenderer.invoke( 'start' );
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
        ipcRenderer.on( 'output', ( undefined, line ) => callback( line ) );
    },

} as Drupal );
