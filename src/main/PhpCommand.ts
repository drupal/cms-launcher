import { app } from 'electron';
import { type ChildProcess, execFile, type ExecFileOptions } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface as readFrom } from 'node:readline';

export enum OutputType {
    Output = 'out',
    Error = 'err',
    Debug = 'debug',
}

export type OutputHandler = (line: string, type: OutputType, process: ChildProcess) => void;

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

    protected setOutputHandler (process: ChildProcess, callback: OutputHandler): void
    {
        if (process.stdout) {
            readFrom(process.stdout).on('line', (line: string): void => {
                callback(line, OutputType.Output, process);
            });
        }
        if (process.stderr) {
            readFrom(process.stderr).on('line', (line: string): void => {
                callback(line, OutputType.Error, process);
            });
        }
    }

    async start (options: ExecFileOptions = {}, callback?: OutputHandler): Promise<ChildProcess>
    {
        const process = execFile(...await this.getCommandLine(), options);

        if (callback) {
            this.setOutputHandler(process, callback);
        }
        return process;
    }
}
