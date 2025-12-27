import { defineConfig } from 'electron-vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import svg from '@poppanator/sveltekit-svg'

export default defineConfig({
    main: {
        build: {
            externalizeDeps: {
                // The `get-port` module is ESM-only, which means we do NOT want
                // to do bundler magic to transform it. Just leave it as-is and
                // let the Node.js runtime load it natively.
                exclude: ['get-port'],
            },
        },
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
