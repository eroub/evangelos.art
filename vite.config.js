// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'src',
    publicDir: '../public',
    server: {
        port: 5173,
        host: true
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true
    }
});