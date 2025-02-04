const { php } = require( './binaries' );
const { execFile } = require( 'node:child_process' );
const path = require( 'node:path' );
const { getWebRoot } = require( './utils' );

async function findPort ()
{
    // Find an open port between 8888 and 9999. We need to dynamically import `get-port`
    // because it's an ES6 module.
    const {
        default: getPort,
        portNumbers,
    } = await import( 'get-port' );

    return await getPort({
        port: portNumbers( 8888, 9999 ),
    });
}

module.exports = async ( dir, win ) => {
    const port = await findPort();
    const url = `http://localhost:${port}`;
    const caFile = path.join( __dirname, 'cacert.pem' );

    // Start the built-in PHP web server.
    const process = execFile(
        php,
        [
            // Explicitly pass the cURL CA bundle so that HTTPS requests from Drupal can
            // succeed on Windows.
            // @see https://curl.haxx.se/ca/cacert.pem
            '-d', `curl.cainfo="${caFile}"`,
            '-S', url.substring( 7 ),
            '.ht.router.php',
        ],
        {
            cwd: getWebRoot( dir ),
        },
    );
    // When the server starts, let the renderer know we're up and running.
    const {
        stderr: serverOutput,
    } = process;
    // This callback must be in its own variable so it can refer to itself internally.
    const checkForServerStart = ( chunk ) => {
        if ( chunk.toString().includes( `(${url}) started` ) ) {
            win?.send( 'ready', url );
            serverOutput.off( 'data', checkForServerStart );
        }
    };
    serverOutput.on( 'data', checkForServerStart );

    return { url, process };
};
