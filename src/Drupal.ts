export enum Events
{
    InstallStarted = 'drupal-will-install',

    InstallFinished = 'drupal-is-installed',

    Output = 'drupal-output',

    Started = 'drupal-is-started',

    Error = 'drupal-error',
}

export enum Commands
{
    Start = 'drupal-start',

    Open = 'drupal-open',
}

export interface Drupal
{
    start: () => void;

    open: ( url: string ) => void;

    onInstallStarted: ( callback: () => void ) => void;

    onInstallFinished: ( callback: () => void ) => void;

    onOutput: ( callback: ( line: string ) => void ) => void;

    onStart: ( callback: ( url: string ) => void ) => void;

    onError: ( callback: ( message: string ) => void ) => void;
}
