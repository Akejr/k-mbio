/**
 * Configuração do Playwright para os testes _smoke_ e e2e do KwanzaProfit.
 *
 * Task 15.1 da spec (`kwanza-profit-pwa`): instala `@playwright/test` e
 * `@axe-core/playwright` e define dois projetos — mobile (375×812) e
 * desktop (1280×720) — contra um servidor `vite preview` rodando em
 * `http://localhost:4173`.
 *
 * Os testes em `tests/smoke/**` e `tests/e2e/**` são marcados como
 * opcionais no plano (sub-tasks 15.2–15.6) e podem ser adicionados
 * incrementalmente. Esta configuração apenas torna o comando
 * `npx playwright test` imediatamente utilizável quando existirem.
 *
 * Requisitos cobertos (indiretos): 6.2, 7.2, 9.6, 9.7.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: ['smoke/**/*.test.ts', 'e2e/**/*.test.ts'],
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
