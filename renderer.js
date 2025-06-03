const status = document.getElementById( 'status' );
const title = document.getElementById( 'title' );
const loader = document.getElementById( 'loader' );
const cli = document.getElementById( 'cli-output' );

drupal.onInstallStart(() => {
    title.innerHTML = 'Installing...'
    loader.innerHTML = '<div class="cms-installer__loader"></div>'
    status.innerText = 'This might take a minute.';
});

drupal.onInstalled(() => {
    title.innerHTML = 'Starting web server...'
    status.innerHTML = '';
});

drupal.onOutput(( line ) => {
    cli.innerText = line;
});

drupal.onReady(( url ) => {
    title.innerHTML = ''
    loader.innerHTML = ''
    status.innerHTML = `<p>Your site is running at<br /><code>${url}</code></p>`;
    cli.remove();

    const wrapper = document.getElementById( 'open' );
    wrapper.innerHTML = `<button class="button" type="button">Visit site</button>`;
    wrapper.querySelector( 'button' ).addEventListener( 'click', drupal.open );
});

window.addEventListener( 'load', async () => {
    await drupal.start();
} );
