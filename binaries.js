const { app } = require('electron');
const { execFileSync } = require( 'node:child_process' );
const { access } = require( 'node:fs/promises' );
const path = require( 'node:path' );

const binDir = path.join( app.getAppPath(), 'bin' );
const php = path.join( binDir, 'php' );

module.exports = {
    php,
    async composer () {
        // We need an unpacked version of Composer because the phar file has a shebang line
        // that breaks us, due to the fact that GUI-launched Electron apps don't inherit the
        // parent environment in macOS and Linux. Instead, we extract Composer's executable
        // sources from the phar file and point the PHP interpreter at them.
        const composer = path.join( binDir, 'composer', 'bin', 'composer' );
        try {
            await access( composer );
        } catch {
            execFileSync(
                php,
                [ '-r', `(new Phar("composer.phar"))->extractTo("composer");` ],
                {
                    cwd: binDir,
                    // This is an extremely generous timeout and should not be increased.
                    timeout: 30000,
                },
            );
        }
        return composer;
    },
};
