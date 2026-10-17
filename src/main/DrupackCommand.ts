import logger from 'electron-log';
import { type ChildProcess, execFile, type ExecFileOptions, execFileSync, spawn, type SpawnOptions } from 'node:child_process';
import { createInterface as readFrom } from 'node:readline';
import { promisify as toPromise } from 'node:util';

const execFileAsPromise = toPromise(execFile);

/**
 * Runs the Drupack engine, which serves Drupal with FrankenPHP.
 *
 * @see https://www.drupal.org/project/drupack
 */
export class DrupackCommand
{
    public static binary: string;

    private readonly arguments: string[];

    constructor (...options: string[])
    {
        this.arguments = options;
    }

    /**
     * Starts the command, and passes every line it prints to the callback.
     */
    start (options: SpawnOptions, callback: (line: string) => void): ChildProcess
    {
        logger.debug(`${DrupackCommand.binary} ${this.arguments.join(' ')}`);

        const process = spawn(DrupackCommand.binary, this.arguments, options);
        for (const stream of [process.stdout, process.stderr]) {
            if (stream) {
                readFrom(stream).on('line', callback);
            }
        }
        return process;
    }

    /**
     * Runs the command to completion, and resolves with what it printed.
     */
    async run (options: ExecFileOptions = {}): Promise<string>
    {
        logger.debug(`${DrupackCommand.binary} ${this.arguments.join(' ')}`);

        const { stdout } = await execFileAsPromise(DrupackCommand.binary, this.arguments, options);
        return stdout.toString();
    }

    /**
     * Runs the command to completion, for the places that cannot wait on a promise.
     */
    runSync (): string
    {
        logger.debug(`${DrupackCommand.binary} ${this.arguments.join(' ')}`);

        return execFileSync(DrupackCommand.binary, this.arguments, { timeout: 10_000 }).toString();
    }
}
