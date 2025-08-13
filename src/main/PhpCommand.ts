import { app } from 'electron';
import { type ChildProcess, execFile, type ExecFileOptions } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export enum OutputType {
    Output = 'out',
    Error = 'err',
    Debug = 'debug',
}

/**
 * An abstraction layer for invoking the PHP interpreter in a consistent way.
 */
export class PhpCommand
{
    protected arguments: string[] = [];

    public static binary: string;

    constructor (...options: string[])
    {
        this.arguments = options;
    }

    protected async getCommandLine (): Promise<[string, string[]]>
    {
        const phpBin = app.isPackaged
            ? PhpCommand.binary
            : await realpath(PhpCommand.binary);

        // Always provide the cURL CA bundle so that HTTPS requests from Composer
        // and Drupal have a better chance of succeeding (especially on Windows).
        const caFile = join(dirname(phpBin), 'cacert.pem');

        return [
            phpBin,
            ['-d', `curl.cainfo="${caFile}"`, ...this.arguments],
        ];
    }

    async start (options: ExecFileOptions = {}): Promise<ChildProcess>
    {
        return execFile(...await this.getCommandLine(), options);
    }
}
