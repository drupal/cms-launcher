import { svelte } from '@sveltejs/vite-plugin-svelte';
import svg from '@poppanator/sveltekit-svg'

export default {
    main: {
    },
    preload: {
    },
    renderer: {
        plugins: [
            svelte(),
            svg(),
        ]
    }
}
