import { Drupal } from './Drupal';
import { contextBridge, ipcRenderer } from 'electron';

ipcRenderer.on('will-install', (): void => {
    window.dispatchEvent(new CustomEvent('will-install'));
});

ipcRenderer.on('did-install', (_: any, withServer: boolean): void => {
    window.dispatchEvent(
        new CustomEvent('did-install', { detail: withServer }),
    );
});

ipcRenderer.on('progress', (_: any, message: string): void => {
    window.dispatchEvent(
        new CustomEvent('progress', { detail: message }),
    );
});

ipcRenderer.on('did-start', (_: any, url: string): void => {
    window.dispatchEvent(
        new CustomEvent('did-start', { detail: url }),
    );
});

ipcRenderer.on('error', (_: any, message: string): void => {
    window.dispatchEvent(
        new CustomEvent('error', { detail: message }),
    );
});

contextBridge.exposeInMainWorld('drupal', {

    start (): void
    {
        ipcRenderer.send('drupal:start');
    },

    open (url: string): void
    {
        ipcRenderer.send('drupal:open', url);
    },

} as Drupal);
