import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import baseConfig from '../../vite.config.base';

export default mergeConfig(baseConfig, defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      entryRoot: 'src',
      outDir: 'dist',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.ts'],
    }),
  ],
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      fileName: 'index',
    },
    outDir: 'dist',
  },
}));