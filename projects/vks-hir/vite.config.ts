import {defineConfig} from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'VikingHir',
            fileName: (format) => `hir.${format}.js`,
        },
    },
});