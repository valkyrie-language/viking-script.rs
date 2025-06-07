import {defineConfig} from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'VikingCompiler',
            fileName: (format) => `viking-compiler.${format}.js`,
        },
        rollupOptions: {
            external: [],
        },
    },
});