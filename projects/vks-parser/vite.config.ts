import {defineConfig} from 'vite';
import {resolve} from "path";

export default defineConfig({
    build: {},
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@parser': resolve(__dirname, './src/parser'),
            '@helper': resolve(__dirname, './src/helper'),
        }
    },
});