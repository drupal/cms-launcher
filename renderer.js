const status = document.getElementById( 'status' );

drupal.onInstallStart(() => {
    status.innerText = '☕️ Installing dependencies. This may take several minutes, but only needs to be done once.';
});

drupal.onInstalled(() => {
    status.innerHTML = 'Starting web server...';
});

drupal.onReady(( url ) => {
    status.innerHTML = `Up and running at <code>${url}</code>`;

    const wrapper = document.getElementById( 'open' );
    wrapper.innerHTML = `<button>Visit Site</button>`;
    wrapper.querySelector( 'button' ).addEventListener( 'click', drupal.open );
});

window.addEventListener( 'load', async () => {
    await drupal.start();
} );
