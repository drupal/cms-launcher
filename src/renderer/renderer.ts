import { Drupal } from '../preload/Drupal';

// This is exposed by the preload script.
declare var drupal: Drupal;

const status = document.getElementById('status') as HTMLParagraphElement;
const title = document.getElementById('title') as HTMLHeadingElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const cli = document.getElementById('cli-output') as HTMLPreElement;

window.addEventListener('will-install', (): void => {
    title.innerText = 'Installing...'
    loader.innerHTML = '<div class="cms-installer__loader"></div>'
    status.innerText = 'This might take a minute.';
});

window.addEventListener('did-install', (e: any): void => {
    const withServer = e.detail;

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

window.addEventListener('progress', (e: any): void => {
    cli.innerText = e.detail;
});

window.addEventListener('did-start', (e: any): void => {
    const url = e.detail;

    title.remove();
    loader.remove();
    cli.remove();
    status.innerHTML = `<p>Your site is running at<br /><code>${url}</code></p>`;

    const wrapper = document.getElementById('open') as HTMLDivElement;
    wrapper.innerHTML = `<button class="button" type="button">Visit site</button>`;
    // There is no way this query could return null, because we just set the innerHTML.
    wrapper.querySelector('button')!.addEventListener('click', () => {
        drupal.open(url);
    });
});

window.addEventListener('error', (e: any): void => {
    title.innerText = 'Uh-oh';
    status.innerText = 'An error occurred while starting Drupal CMS. It has been automatically reported to the developers.';
    cli.classList.add('error');
    cli.innerText = e.detail;
    loader.remove();
});

window.addEventListener('load', drupal.start);
