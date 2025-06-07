import {defineConfig} from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'VksParser',
            fileName: (format) => `vks-parser.${format}.js`,
        },
        rollupOptions: {
            external: ['vks-hir'],
        },
    },
});