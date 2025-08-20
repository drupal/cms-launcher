export interface Launcher
{
    start: () => void;

    open: (url: string) => void;

    onInstallStarted: (callback: () => void) => void;

    onInstallFinished: (callback: (withServer: boolean) => void) => void;

    onOutput: (callback: (line: string) => void) => void;

    onProgress: (callback: (done: number, total: number) => void) => void;

    onStart: (callback: (url: string) => void) => void;

    onError: (callback: (message: string) => void) => void;
}
