import { projectRoot, bin } from './config';
import { execFile } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { getWebRoot } from './utils';

/**
 * Finds an open local port between 8888 and 9999 (inclusive).
 *
 * @returns {Promise<number>}
 */
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

export default async ( win ) => {
    const port = await findPort();
    const url = `http://localhost:${port}`;
    const caFile = path.join( __dirname, '..', '..', 'cacert.pem' );

    // Start the built-in PHP web server.
    const serverProcess = execFile(
        bin.php,
        [
            // Explicitly pass the cURL CA bundle so that HTTPS requests from Drupal can
            // succeed on Windows.
            // @see https://curl.haxx.se/ca/cacert.pem
            '-d', `curl.cainfo="${caFile}"`,
            '-S', url.substring( 7 ),
            '.ht.router.php',
        ],
        {
            cwd: getWebRoot( projectRoot ),
        },
    );

    return new Promise((resolve) => {
        // This callback must be in its own variable so it can refer to itself
        // internally.
        const checkForServerStart = ( line ) => {
            // When the server starts, stop listening for further output and
            // resolve the promise.
            if ( line.includes( `(${url}) started` ) ) {
                win?.send( 'ready', url );
                serverProcess.stderr.off( 'data', checkForServerStart );
                resolve({ url, serverProcess });
            }
        };
        readline.createInterface( serverProcess.stderr )
            .on( 'line', checkForServerStart );
    });
};
