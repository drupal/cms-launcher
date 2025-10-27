import { app } from 'electron';
import logger from 'electron-log';
import { type ExecFileOptions } from 'node:child_process';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { OutputHandler, PhpCommand } from './PhpCommand';

/**
 * An abstraction layer for running Composer commands in a consistent way.
 */
export class ComposerCommand extends PhpCommand
{
    constructor (...options: string[])
    {
        super(
            ComposerCommand.binary,
            // Don't let Composer ask any questions, since users have no way
            // to answer them.
            '--no-interaction',
            // Strip out any ANSI color codes, since they are useless in the
            // GUI and make logs unreadable.
            '--no-ansi',
            ...options,
        );
    }

    inDirectory (dir: string): ComposerCommand
    {
        this.arguments.push(
            this.arguments.includes('create-project') ? dir : `--working-dir=${dir}`,
        );
        return this;
    }

    async run (options: ExecFileOptions = {}, callback?: OutputHandler): Promise<any>
    {
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
            COMPOSER_HOME: process.env.COMPOSER_HOME ?? join(app.getPath('home'), '.composer'),
        });
        // An exceptionally generous timeout. No Composer command should take
        // 10 minutes.
        options.timeout ??= 600000;

        return super.run(options, (line: string, ...rest): void => {
            logger.debug(line);

            if (callback) {
                callback(line, ...rest);
            }
        });
    }
    // getVersion() method that reads a composer.json file and returns the version field
    async getVersion (composerJsonPath: string): Promise<string | null>
    {
        try {
            const content = await readFile(composerJsonPath, 'utf-8');
            const data = JSON.parse(content);
            return data.version ?? null;
        } catch (error) {
            logger.error(Error reading version from ${composerJsonPath}:, error);
            return null;
        }
    }
}
