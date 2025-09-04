import { Events } from '../main/Events';
import { Launcher } from './Launcher';
import { contextBridge, ipcRenderer } from 'electron';

ipcRenderer.on(Events.InstallStarted, (): void => {
    window.dispatchEvent(new CustomEvent(Events.InstallStarted));
});

ipcRenderer.on(Events.InstallFinished, (_: any, withServer: boolean): void => {
    window.dispatchEvent(
        new CustomEvent(Events.InstallFinished, { detail: withServer }),
    );
});

ipcRenderer.on(Events.Output, (_: any, line: string): void => {
    window.dispatchEvent(
        new CustomEvent(Events.Output, { detail: line }),
    );
});

ipcRenderer.on(Events.Progress, (_: any, done: number, total: number): void => {
    window.dispatchEvent(
        new CustomEvent(Events.Progress, { detail: [done, total] }),
    );
});

ipcRenderer.on(Events.Started, (_: any, url: string): void => {
    window.dispatchEvent(
        new CustomEvent(Events.Started, { detail: url }),
    );
});

ipcRenderer.on(Events.Error, (_: any, message: string): void => {
    window.dispatchEvent(
        new CustomEvent(Events.Error, { detail: message }),
    );
});

contextBridge.exposeInMainWorld('launcher', {

    start (): void
    {
        ipcRenderer.send('drupal:start');
    },

    open (url: string): void
    {
        ipcRenderer.send('drupal:open', url);
    },

} as Launcher);
