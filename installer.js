const {
    php,
    composer,
} = require( './binaries' );
const { access } = require( 'node:fs/promises' );

module.exports = async ( dir, handler, win ) => {
    try {
        await access ( dir );
    } catch {
        // Let the renderer know we're about to install Drupal.
        win?.send( 'install-start' );

        await handler( dir, {
            php,
            composer: await composer(),
        } );
    }
    win?.send( 'installed' );
};
