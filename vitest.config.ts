import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Configuração do Vitest espelhando os aliases declarados em vite.config.ts
// e tsconfig.json (@domain, @app, @infra, @ui). O ambiente jsdom é usado para
// suportar código que toca em APIs do DOM e IndexedDB (via fake-indexeddb).
export default defineConfig({
  resolve: {
    alias: {
      '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@infra': fileURLToPath(new URL('./src/infra', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    globals: false,
    coverage: {
      reporter: ['text', 'html']
    }
  }
});
