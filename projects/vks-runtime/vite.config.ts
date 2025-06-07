import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'VksRuntime',
      fileName: (format) => `vks-runtime.${format}.js`,
    },
  },
});