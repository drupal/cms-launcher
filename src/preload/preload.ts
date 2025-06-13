import { Commands, Drupal, Events } from '../Drupal';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('drupal', {

    start: (): void => {
        ipcRenderer.send(Commands.Start);
    },

    open: (url: string): void => {
        ipcRenderer.send(Commands.Open, url);
    },

    onInstallStarted: (callback: () => void): void => {
        ipcRenderer.on(Events.InstallStarted, callback);
    },

    onInstallFinished: (callback: () => void): void => {
        ipcRenderer.on(Events.InstallFinished, callback);
    },

    onOutput: (callback: (line: string) => void): void => {
        ipcRenderer.on(Events.Output, (undefined, line): void => callback(line));
    },

    onStart: (callback: (url: string) => void): void => {
        ipcRenderer.on(Events.Started, (undefined, url): void => callback(url));
    },

    onError: (callback: (message: string) => void): void => {
        ipcRenderer.on(Events.Error, (undefined, message): void => callback(message));
    },

} as Drupal);
