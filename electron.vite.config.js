import { svelte } from '@sveltejs/vite-plugin-svelte';

export default {
    main: {
    },
    preload: {
    },
    renderer: {
        plugins: [
            svelte(),
        ]
    }
}
