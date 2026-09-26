import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
    fs: { allow: ['..'] },
  },
  preview: { port: 4173, proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } } },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
});
