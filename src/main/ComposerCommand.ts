import { app } from 'electron';
import { execFile, type ExecFileOptions } from 'node:child_process';
import { join } from 'node:path';
import { OutputHandler, OutputType, PhpCommand } from './PhpCommand';
import { promisify as toPromise } from 'node:util';

/**
 * An abstraction layer for running Composer commands in a consistent way.
 */
export class ComposerCommand extends PhpCommand
{
    async run (options: ExecFileOptions = {}, callback?: OutputHandler): Promise<{ stdout: string, stderr: string }>
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
            // For forensic purposes, log the command line we just executed.
            callback(`${commandLine[0]} ${commandLine[1].join(' ')}`, OutputType.Debug, p.child);

            this.setOutputHandler(p.child, callback);
        }
        return p;
    }
}
