import logger from 'electron-log';
import { type ChildProcess, execFile, type ExecFileOptions, type PromiseWithChild } from 'node:child_process';
import { createInterface as readFrom } from 'node:readline';
import { promisify as toPromise } from 'node:util';
import { DrupackCommand } from './DrupackCommand';

export enum OutputType {
    Output = 'out',
    Error = 'err',
}

export type OutputHandler = (line: string, type: OutputType, process: ChildProcess) => void;

const execFileAsPromise = toPromise(execFile);

/**
 * An abstraction layer for invoking the PHP interpreter in a consistent way.
 *
 * PHP comes from Drupack, which accepts a script and its arguments, or `-r CODE`,
 * and no PHP options. Composer raises its own memory limit, and Drupack ships the
 * CA bundle that HTTPS requests are checked against.
 */
export class PhpCommand
{
    protected arguments: string[] = [];

    constructor (...options: string[])
    {
        this.arguments = options;
    }

    private getCommandLine (): [string, string[]]
    {
        const commandLine: string[] = ['php', ...this.arguments];

        // For forensic purposes, log the full command line.
        logger.debug(`${DrupackCommand.binary} ${commandLine.join(' ')}`);

        return [DrupackCommand.binary, commandLine];
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

    async run (options: ExecFileOptions = {}, callback?: OutputHandler): Promise<any>
    {
        const p = execFileAsPromise(...this.getCommandLine(), options) as PromiseWithChild<any>;

        if (callback) {
            this.setOutputHandler(p.child, callback);
        }
        return p;
    }
}
