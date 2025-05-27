import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [tsconfigPaths({ loose: true }), react(), tailwindcss()],
    build: {
        manifest: true,
        minify: 'esbuild',
        rollupOptions: {
            output: {
                chunkFileNames: 'static/[name].js',
                entryFileNames: 'static/[name].js',
                assetFileNames: 'static/[name].[ext]'
            }
        }
    },
    esbuild: {
        target: 'es2020'
    },
    server: {
        host: '0.0.0.0',
        port: 7788,
        open: true
    }
})
