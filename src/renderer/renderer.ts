import { Launcher } from '../preload/Launcher';

// This is exposed by the preload script.
declare var launcher: Launcher;

const status = document.getElementById('status') as HTMLParagraphElement;
const title = document.getElementById('title') as HTMLHeadingElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const cli = document.getElementById('cli-output') as HTMLPreElement;

launcher.onInstallStarted((): void => {
    title.innerText = 'Installing...'
    loader.classList.add('cms-installer__loader');
    status.innerText = 'This might take a minute.';
});

launcher.onInstallFinished((withServer: boolean): void => {
    if (withServer) {
        title.innerText = 'Starting web server...';
    }
    else {
        loader.remove();
        status.remove();
        title.innerText = 'Installation complete!';
    }
    cli.innerText = '';
});

launcher.onOutput((line: string): void => {
    cli.innerText = line;
});

launcher.onProgress((done: number, total: number): void => {
    loader.classList.add('cms-installer__progress');
    const percent = Math.round((done / total) * 100);
    loader.style.width = `${percent}%`;
    cli.innerText = `Extracting archive (${percent}% done)`;
});

launcher.onStart((url: string): void => {
    title.remove();
    loader.remove();
    cli.remove();
    status.innerHTML = `<p>Your site is running at<br /><code>${url}</code></p>`;

    const wrapper = document.getElementById('open') as HTMLDivElement;
    wrapper.innerHTML = `<button class="button" type="button">Visit site</button>`;
    // There is no way this query could return null, because we just set the innerHTML.
    wrapper.querySelector('button')!.addEventListener('click', () => {
        launcher.open(url);
    });
});

launcher.onError((message: string): void => {
    title.innerText = 'Uh-oh';
    status.innerText = 'An error occurred while starting Drupal CMS. It has been automatically reported to the developers.';
    cli.classList.add('error');
    cli.innerText = message;
    loader.remove();
});

window.addEventListener('load', launcher.start);
