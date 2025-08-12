import { bin, webRoot } from './config';
import { app } from 'electron';
import { default as getPort, portNumbers } from 'get-port';
import { type ChildProcess, execFile } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import process from "node:process";

export async function phpCommand (command: string[] = []): Promise<string[]>
{
    const phpBin = path.join(bin, process.platform === 'win32' ? 'php.exe' : 'php');
    const caFile = path.join(bin, 'cacert.pem');

    return [
        app.isPackaged ? phpBin : await realpath(phpBin),
        // Explicitly pass the cURL CA bundle so that HTTPS requests from Drupal can
        // succeed on Windows.
        '-d', `curl.cainfo="${caFile}"`,
        ...command,
    ];
}

export async function startServer (): Promise<{ url: string, serverProcess: ChildProcess }>
{
    const port = await getPort({
        port: portNumbers(8888, 9999),
    });
    const url = `http://localhost:${port}`;

    const command = await phpCommand([
        '-S', url.substring(7),
        '.ht.router.php',
    ]);

    // Start the built-in PHP web server.
    const serverProcess = execFile(command[0], command.slice(1), { cwd: webRoot });
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
