import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ['util', 'assert', 'process', 'buffer'],
            globals: {
                process: true,
                Buffer: true,
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: parseInt('3000'),
    },
    define: {
        'process.env': {},
    },
    optimizeDeps: {
        include: ['buffer', 'process'],
    },
});
