import Drupal from '../preload/Drupal';

// This is exposed by the preload script.
declare var drupal: Drupal;

const status = document.getElementById( 'status' ) as HTMLParagraphElement;
const title = document.getElementById( 'title' ) as HTMLHeadingElement;
const loader = document.getElementById( 'loader' ) as HTMLDivElement;
const cli = document.getElementById( 'cli-output' ) as HTMLPreElement;

drupal.onInstallStarted((): void => {
    title.innerHTML = 'Installing...'
    loader.innerHTML = '<div class="cms-installer__loader"></div>'
    status.innerText = 'This might take a minute.';
});

drupal.onInstallFinished((): void => {
    title.innerHTML = 'Starting web server...'
    status.innerHTML = '';
});

drupal.onOutput(( line: string ): void => {
    cli.innerText = line;
});

window.addEventListener( 'load', async (): Promise<void> => {
    const url = await drupal.start();

    title.remove();
    loader.remove();
    cli.remove();
    status.innerHTML = `<p>Your site is running at<br /><code>${url}</code></p>`;

    const wrapper = document.getElementById( 'open' ) as HTMLDivElement;
    wrapper.innerHTML = `<button class="button" type="button">Visit site</button>`;
    // There is no way this query could return null, because we just set the innerHTML.
    wrapper.querySelector( 'button' )!
        .addEventListener( 'click', () => {
            drupal.open( url );
        });
} );
