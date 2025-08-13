import { app } from 'electron';
import { execFile, type ExecFileOptions } from 'node:child_process';
import { join } from 'node:path';
import { OutputType, PhpCommand } from './PhpCommand';
import { createInterface as readFrom } from 'node:readline';
import { promisify as toPromise } from 'node:util';

type OutputCallback = (line: string, type: OutputType) => void;

/**
 * An abstraction layer for running Composer commands in a consistent way.
 */
export class ComposerCommand extends PhpCommand
{
    append (...options: string[]): PhpCommand
    {
        this.arguments.push(...options);
        return this;
    }

    async run (options: ExecFileOptions = {}, callback?: OutputCallback): Promise<{ stdout: string, stderr: string }>
    {
        this.arguments.unshift(
            ComposerCommand.binary,
            // Disable ANSI output (i.e., colors) so logs are readable.
            '--no-ansi',
            // Don't let Composer ask any questions, since users have no way
            // to answer them.
            '--no-interaction',
        );

        options.env = Object.assign({}, process.env, {
            // Set COMPOSER_ROOT_VERSION so that Composer won't try to guess the
            // root package version, which would cause it to invoke Git and other
            // command-line utilities that might not be installed and could
            // therefore raise unexpected warnings on macOS.
            // @see https://getcomposer.org/doc/03-cli.md#composer-root-version
            COMPOSER_ROOT_VERSION: '1.0.0',
            // For performance reasons, skip security audits for now.
            // @see https://getcomposer.org/doc/03-cli.md#composer-no-audit
            COMPOSER_NO_AUDIT: '1',
            // Composer doesn't work without COMPOSER_HOME.
            COMPOSER_HOME: join(app.getPath('home'), '.composer'),
        });

        // An exceptionally generous timeout. No Composer command should take
        // 10 minutes.
        options.timeout ??= 600000;

        const commandLine = await this.getCommandLine();
        const p = (toPromise(execFile))(...commandLine, options);

        if (callback) {
            callback(commandLine.join(' '), OutputType.Debug);

            if (p.child.stdout) {
                readFrom(p.child.stdout).on('line', (line: string): void => {
                    callback(line, OutputType.Output);
                });
            }
            if (p.child.stderr) {
                readFrom(p.child.stderr).on('line', (line: string): void => {
                   callback(line, OutputType.Error);
                });
            }
        }
        return p;
    }
}
