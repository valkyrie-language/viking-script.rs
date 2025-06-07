import {defineConfig} from 'vitest/config';
import {resolve} from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'tests/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/index.ts' // exclude barrel exports from coverage
            ]
        },
        testTimeout: 10000,
        hookTimeout: 10000
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@parser': resolve(__dirname, './src/parser'),
            '@helper': resolve(__dirname, './src/helper'),
            '@tests': resolve(__dirname, './tests')
        }
    },
    esbuild: {
        target: 'node16'
    }
});