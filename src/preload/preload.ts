import { Drupal } from './Drupal';
import { contextBridge, ipcRenderer } from 'electron';

const windowLoaded = new Promise((resolve): void => {
    window.onload = resolve;
});

ipcRenderer.on('port', async (event): Promise<void> => {
   await windowLoaded;
   window.postMessage('port', '*', event.ports);
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
