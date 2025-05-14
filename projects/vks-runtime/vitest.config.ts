import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.{js,ts}', 'tests/main.js'],
    environment: 'node',
    globals: true
  }
});