const status = document.getElementById( 'status' );
const title = document.getElementById( 'title' );
const loader = document.getElementById( 'loader' );

drupal.onInstallStart(() => {
    title.innerHTML = 'Installing...'
    status.innerText = '☕️ Installing dependencies. This may take several minutes, but only needs to be done once.';
    loader.innerHTML = '<div class="cms-installer__loader"></div>'
});

drupal.onInstalled(() => {
    title.innerHTML = 'Installed'
    status.innerHTML = 'Starting web server...';
});

drupal.onReady(( url ) => {
    title.innerHTML = 'Installation complete'
    status.innerHTML = `Up and running at <code>${url}</code>`;

    const wrapper = document.getElementById( 'open' );
    wrapper.innerHTML = `<button class="button" type="button">Visit Site</button>`;
    wrapper.querySelector( 'button' ).addEventListener( 'click', drupal.open );
    loader.innerHTML = ''
});

window.addEventListener( 'load', async () => {
    await drupal.start();
} );
