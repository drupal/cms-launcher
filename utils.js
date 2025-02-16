const path = require( 'node:path' );

module.exports = {
    getWebRoot ( dir ) {
        const composerJSON = path.join( dir, 'composer.json' );
        // Read `composer.json` directly to find out where the web root is. If it doesn't have
        // a web root defined, fall back to `dir`.
        return path.join(
            dir,
            require( composerJSON ).extra['drupal-scaffold']['locations']['web-root'] ?? '',
        );
    },
};
