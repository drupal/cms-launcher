export default interface Drupal
{
    start: () => Promise<string>;

    open: ( url: string ) => void;

    onInstallStarted: ( callback: () => void ) => void;

    onInstallFinished: ( callback: () => void ) => void;

    onOutput: ( callback: ( line: string ) => void ) => void;
}
