import { webRoot } from './config';
import { default as getPort, portNumbers } from 'get-port';
import { type ChildProcess } from 'node:child_process';
import readline from 'node:readline';
import { PhpCommand } from './PhpCommand';

export async function startServer (): Promise<{ url: string, serverProcess: ChildProcess }>
{
    const port = await getPort({
        port: portNumbers(8888, 9999),
    });
    const url = `http://localhost:${port}`;

    // Start the built-in PHP web server.
    const serverProcess = await new PhpCommand('-S', url.substring(7), '.ht.router.php')
        .start({ cwd: webRoot });
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
