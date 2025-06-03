const status = document.getElementById( 'status' );
const title = document.getElementById( 'title' );
const loader = document.getElementById( 'loader' );

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
    // Nothing right now, but this callback could be used to display output from
    // the Composer command (or any other system output we care to display).
});

drupal.onReady(( url ) => {
    title.innerHTML = ''
    loader.innerHTML = ''
    status.innerHTML = `<p>Your site is running at<br /><code>${url}</code></p>`;

    const wrapper = document.getElementById( 'open' );
    wrapper.innerHTML = `<button class="button" type="button">Visit site</button>`;
    wrapper.querySelector( 'button' ).addEventListener( 'click', drupal.open );
});

window.addEventListener( 'load', async () => {
    await drupal.start();
} );
