import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/test/**/*.test.{ts,tsx,mjs}'],
    setupFiles: './src/test/setup.ts',
    css: true,
    testTimeout: 30000,
  },
});
