import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [
      ['src/app/**/*.test.tsx', 'jsdom'],
      ['src/app/**/*.test.ts', 'jsdom'],
    ],
  },
});
