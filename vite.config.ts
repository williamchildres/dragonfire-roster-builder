import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const highsWasmPath = new URL(
  './node_modules/@bubblyworld/highs-ts/build/highs.wasm',
  import.meta.url,
);

function highsWasmAsset(): Plugin {
  return {
    name: 'highs-wasm-asset',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.split('?')[0]?.endsWith('/highs.wasm')) {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/wasm');
        response.end(readFileSync(highsWasmPath));
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'assets/highs.wasm',
        source: readFileSync(highsWasmPath),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), highsWasmAsset()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/test/**/*.test.{ts,tsx,mjs}'],
    setupFiles: './src/test/setup.ts',
    css: true,
    testTimeout: 30000,
  },
});
