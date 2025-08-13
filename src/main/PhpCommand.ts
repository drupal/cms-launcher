import { app } from 'electron';
import {type ChildProcess, execFile, type ExecFileOptions} from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * An abstraction layer for invoking the PHP interpreter in a consistent way.
 */
export class PhpCommand
{
    private arguments: string[] = [];

    public static binary: string;

    constructor (...options: string[])
    {
        this.arguments = options;
    }

    async toArray (): Promise<string[]>
    {
        const phpBin = app.isPackaged
            ? PhpCommand.binary
            : await realpath(PhpCommand.binary);

        // Always provide the cURL CA bundle so that HTTPS requests from Composer
        // and Drupal have a better chance of succeeding (especially on Windows).
        const caFile = join(dirname(phpBin), 'cacert.pem');

        return [
            phpBin,
            '-d', `curl.cainfo="${caFile}"`,
            ...this.arguments,
        ];
    }

    async start (options?: ExecFileOptions): Promise<ChildProcess>
    {
        const command = await this.toArray();

        return execFile(
            command[0],
            command.slice(1),
            options,
        );
    }
}
