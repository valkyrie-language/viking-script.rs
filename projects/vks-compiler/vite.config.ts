import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'VksCompiler',
      fileName: (format) => `vks-compiler.${format}.js`,
    },
    rollupOptions: {
      external: ['source-map'],
    },
  },
});