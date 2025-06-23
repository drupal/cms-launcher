import { projectRoot, bin, webRoot } from './config';
import { default as getPort, portNumbers } from 'get-port';
import { type ChildProcess, execFile } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';

export default async (): Promise<{ url: string, serverProcess: ChildProcess }> => {
    const port = await getPort({
        port: portNumbers(8888, 9999),
    });
    const url = `http://localhost:${port}`;
    const caFile = path.join(bin, 'cacert.pem');

    // Start the built-in PHP web server.
    const serverProcess = execFile(
        path.join(bin, 'php'),
        [
            // Explicitly pass the cURL CA bundle so that HTTPS requests from Drupal can
            // succeed on Windows.
            '-d', `curl.cainfo="${caFile}"`,
            '-S', url.substring(7),
            '.ht.router.php',
        ],
        {
            cwd: webRoot,
        },
    );
    const resolveWith = { url, serverProcess };

    return new Promise((resolve): void => {
        // This callback must be in its own variable so it can refer to itself
        // internally.
        const checkForServerStart = (line: string): void => {
            // When the server starts, stop listening for further output and
            // resolve the promise.
            if (line.includes(`(${url}) started`)) {
                serverProcess.stderr!.off('data', checkForServerStart);
                resolve(resolveWith);
            }
        };
        // If we're able to capture the server output, resolve the promise when the
        // server says it's ready. Otherwise, just wait three seconds and hope for
        // the best.
        if (serverProcess.stderr) {
            readline.createInterface(serverProcess.stderr).on('line', checkForServerStart);
        }
        else {
            setTimeout((): void => {
                resolve(resolveWith);
            }, 3000);
        }
    });
};
