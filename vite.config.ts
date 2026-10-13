import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@arvo/core': path.resolve(__dirname, 'packages/core/src'),
      '@arvo/js': path.resolve(__dirname, 'packages/js/src'),
      '@arvo/utils': path.resolve(__dirname, 'packages/utils/src'),
    },
  },
  server: { port: 5174, strictPort: false },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true, target: 'es2020' },
});
