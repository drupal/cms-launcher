import { webRoot } from './config';
import { default as getPort, portNumbers } from 'get-port';
import { type ChildProcess } from 'node:child_process';
import { PhpCommand } from './PhpCommand';

export async function startServer (): Promise<[string, ChildProcess]>
{
    const port = await getPort({
        port: portNumbers(8888, 9999),
    });
    const url = `http://localhost:${port}`;

    return new Promise(async (resolve): Promise<void> => {
        const startedText = `(${url}) started`;

        const onOutput = (line: string, undefined: any, process: ChildProcess): void => {
            if (line.includes(startedText)) {
                resolve([url, process]);
            }
        };

        const process = await new PhpCommand('-S', url.substring(7), '.ht.router.php')
            .start({ cwd: webRoot }, onOutput);

        // If we're not able to capture server output, just wait three seconds, simulate
        // the output we're looking for, and hope for the best.
        if (process.stderr === null) {
            setTimeout(() => onOutput(startedText, undefined, process), 3000);
        }
    });
}
