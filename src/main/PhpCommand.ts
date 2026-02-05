import logger from 'electron-log';
import { type ChildProcess, execFile, type ExecFileOptions, type PromiseWithChild } from 'node:child_process';
import { access, realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface as readFrom } from 'node:readline';
import { promisify as toPromise } from 'node:util';

export enum OutputType {
    Output = 'out',
    Error = 'err',
}

export type OutputHandler = (line: string, type: OutputType, process: ChildProcess) => void;

const execFileAsPromise = toPromise(execFile);

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

    private async getCommandLine (): Promise<[string, string[]]>
    {
        const phpBin = await realpath(PhpCommand.binary);

        // Give PHP a higher memory limit than the default (128M), because Drupal
        // can be pretty heavy!
        // @see https://www.php.net/manual/en/ini.core.php#ini.sect.resource-limits
        this.arguments.unshift('-d', 'memory_limit=1G');

        // Always provide the cURL CA bundle so that HTTPS requests from Composer
        // and Drupal have a better chance of succeeding (especially on Windows).
        const caFile = join(dirname(phpBin), 'cacert.pem');
        try {
            await access(caFile);
            this.arguments.unshift('-d', `curl.cainfo="${caFile}"`);
        }
        catch {
            logger.warn(`CA bundle not found: ${caFile}`);
        }

        // For forensic purposes, log the full command line.
        logger.debug(`${phpBin} ${this.arguments.join(' ')}`);

        return [phpBin, this.arguments];
    }

    private setOutputHandler (process: ChildProcess, callback: OutputHandler): void
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

    async run (options: ExecFileOptions = {}, callback?: OutputHandler): Promise<any>
    {
        const p = execFileAsPromise(...await this.getCommandLine(), options) as PromiseWithChild<any>;

        if (callback) {
            this.setOutputHandler(p.child, callback);
        }
        return p;
    }
}
