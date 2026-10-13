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
      exclude: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/test-setup.ts'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: './src/index.ts',
        'plugin': './src/plugin.ts',
        'auto': './src/auto.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) => `${name}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));