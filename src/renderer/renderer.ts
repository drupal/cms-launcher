import { Drupal } from '@/Drupal';

// This is exposed by the preload script.
declare var drupal: Drupal;

const status = document.getElementById( 'status' ) as HTMLParagraphElement;
const title = document.getElementById( 'title' ) as HTMLHeadingElement;
const loader = document.getElementById( 'loader' ) as HTMLDivElement;
const cli = document.getElementById( 'cli-output' ) as HTMLPreElement;

drupal.onInstallStarted((): void => {
    title.innerText = 'Installing...'
    loader.innerHTML = '<div class="cms-installer__loader"></div>'
    status.innerText = 'This might take a minute.';
});

drupal.onInstallFinished((): void => {
    title.innerText = 'Starting web server...'
    status.innerHTML = '';
});

drupal.onOutput(( line: string ): void => {
    cli.innerText = line;
});

drupal.onStart(( url: string ): void => {
    title.remove();
    loader.remove();
    cli.remove();
    status.innerHTML = `<p>Your site is running at<br /><code>${url}</code></p>`;

    const wrapper = document.getElementById( 'open' ) as HTMLDivElement;
    wrapper.innerHTML = `<button class="button" type="button">Visit site</button>`;
    // There is no way this query could return null, because we just set the innerHTML.
    wrapper.querySelector( 'button' )!.addEventListener( 'click', () => {
        drupal.open( url );
    });
});

drupal.onError(( message: string ): void => {
    title.innerText = 'Uh-oh';
    status.innerText = 'An error occurred while starting Drupal CMS. It has been automatically reported to the developers.';
    cli.classList.add( 'error' );
    cli.innerText = message;
    loader.remove();
});

window.addEventListener( 'load', drupal.start );
