const path = require( 'node:path' );

const binDir = path.join( __dirname, 'bin' );
const php = path.join( binDir, 'php' );
// We use an unpacked version of Composer because the phar file has a shebang
// line that breaks us, due to the fact that GUI-launched Electron apps don't
// inherit the parent environment in macOS and Linux.
const composer = path.join( binDir, 'composer', 'bin', 'composer' );

module.exports = {
    php,
    composer,
};
