import { Commands } from './Commands';
import { Events } from '../main/Events';
import { Launcher } from './Launcher';
import { contextBridge, ipcRenderer } from 'electron';

const ipc: Launcher = {

    start: (): void => {
        ipcRenderer.send(Commands.Start);
    },

    open: (url: string): void => {
        ipcRenderer.send(Commands.Open, url);
    },

    onInstallStarted: (callback: () => void): void => {
        ipcRenderer.on(Events.InstallStarted, (): void => {
            callback();
        });
    },

    onInstallFinished: (callback: (withServer: boolean) => void): void => {
        ipcRenderer.on(Events.InstallFinished, (_: any, withServer: boolean): void => {
            callback(withServer);
        });
    },

    onOutput: (callback: (line: string) => void): void => {
        ipcRenderer.on(Events.Output, (_: any, line: string): void => {
            callback(line);
        });
    },

    onStart: (callback: (url: string) => void): void => {
        ipcRenderer.on(Events.Started, (_: any, url: string): void => {
            callback(url);
        });
    },

    onError: (callback: (message: string) => void): void => {
        ipcRenderer.on(Events.Error, (_: any, message: string): void => {
            callback(message);
        });
    },

};
contextBridge.exposeInMainWorld('launcher', ipc);
