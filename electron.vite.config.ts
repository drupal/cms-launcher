import { defineConfig } from 'electron-vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import svg from '@poppanator/sveltekit-svg'

export default defineConfig({
    main: {
    },
    preload: {
    },
    renderer: {
        plugins: [
            svelte(),
            svg(),
        ],
    },
});
