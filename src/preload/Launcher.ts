export interface Launcher
{
    start: () => void;

    open: (url: string) => void;
}
