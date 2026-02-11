import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'electron-vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import svg from '@poppanator/sveltekit-svg'

export default defineConfig({
    main: {
        build: {
            sourcemap: true,
        },
        plugins: [
            sentryVitePlugin({
                org: "drupal-association",
                project: "cms-launcher"
            }),
        ],
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