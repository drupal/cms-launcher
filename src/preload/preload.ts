import { Drupal } from './Drupal';
import { contextBridge, ipcRenderer } from 'electron';

ipcRenderer.on('will-install-drupal', (): void => {
    window.dispatchEvent(new CustomEvent('will-install-drupal'));
});

ipcRenderer.on('did-install-drupal', (_: any, withServer: boolean): void => {
    window.dispatchEvent(
        new CustomEvent('did-install-drupal', { detail: withServer }),
    );
});

ipcRenderer.on('install-progress', (_: any, message: string): void => {
    window.dispatchEvent(
        new CustomEvent('install-progress', { detail: message }),
    );
});

ipcRenderer.on('server-did-start', (_: any, url: string): void => {
    window.dispatchEvent(
        new CustomEvent('server-did-start', { detail: url }),
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
