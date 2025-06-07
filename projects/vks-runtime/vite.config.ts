import {defineConfig} from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'VikingRuntime',
            fileName: (format) => `viking-runtime.${format}.js`,
        },
    },
});