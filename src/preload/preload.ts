import { contextBridge, ipcRenderer } from 'electron';

const windowLoaded = new Promise((resolve): void => {
    window.onload = resolve;
});

ipcRenderer.on('port', async (event): Promise<void> => {
    // Wait for the window to be fully loaded before we send the port to it.
    // @see https://www.electronjs.org/docs/latest/tutorial/message-ports#communicating-directly-between-the-main-process-and-the-main-world-of-a-context-isolated-page
    await windowLoaded;
    window.postMessage('port', '*', event.ports);
});

contextBridge.exposeInMainWorld('drupal', async (command: string): Promise<void> => {
    if (command === 'start') {
        ipcRenderer.send(`drupal:${command}`);
    }
    else {
        await ipcRenderer.invoke(`drupal:${command}`);
    }
});
