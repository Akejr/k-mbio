import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

// Base path do build — necessário para GitHub Pages (project site).
// A URL final é `https://akejr.github.io/k-mbio/`, então todos os assets
// absolutos precisam ser prefixados com `/k-mbio/`. Vite cuida disso no
// build quando `base` é definido; em dev (`npm run dev`), o base também
// é aplicado, então o app serve em http://localhost:5173/k-mbio/ — o que
// é consistente com o ambiente de produção.
const BASE = '/k-mbio/';

// Espelha os paths declarados em tsconfig.json (@domain, @app, @infra, @ui).
// O root é 'src' (onde reside o index.html), e o build emite em '../dist'
// relativo a esse root, resultando em '<workspace>/dist'.
//
// PWA (Req 6, 7, Task 13):
// ------------------------
// `vite-plugin-pwa` em modo `generateSW` (Workbox) é responsável por:
//   1. Gerar o arquivo `manifest.webmanifest` no build a partir do
//      objeto `manifest` abaixo (Task 13.1) — o plugin também insere
//      automaticamente `<link rel="manifest">` no `index.html`.
//   2. Gerar um Service Worker que precacheia todo o app shell
//      (HTML, JS, CSS, fontes woff2 e ícones SVG).
//   3. Expor o módulo virtual `virtual:pwa-register` consumido por
//      `src/infra/pwa/registerSW.ts` (Task 13.3).
//
// Ícones: SVGs residem em `public/icons/` e são copiados para `dist/icons/`
// pelo Vite (via `publicDir`). SVGs têm compatibilidade ampla em
// manifests PWA de navegadores modernos (Chrome, Edge, Firefox).
export default defineConfig({
  base: BASE,
  root: 'src',
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  resolve: {
    alias: {
      '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@infra': fileURLToPath(new URL('./src/infra', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url))
    }
  },
  plugins: [
    VitePWA({
      // Auto-atualiza o SW em background; a aplicação segue servindo a
      // versão anterior até a próxima navegação, sem prompt modal.
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      injectRegister: false, // registramos explicitamente em main.ts
      includeAssets: [
        'icons/icon-192.svg',
        'icons/icon-512.svg',
        'icons/icon-maskable.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable.png',
        'icons/apple-touch-icon-180.png',
        'icons/apple-touch-icon-167.png',
        'icons/apple-touch-icon-152.png',
        'icons/apple-touch-icon-120.png'
      ],
      manifest: {
        name: 'Kâmbio',
        short_name: 'Kâmbio',
        description:
          'Registre vendas de câmbio e acompanhe o Lucro Total em Kwanzas (AOA), totalmente offline.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#101415',
        theme_color: '#4edea3',
        lang: 'pt-AO',
        dir: 'ltr',
        categories: ['finance', 'business', 'productivity'],
        icons: [
          // PNGs (compatibilidade universal — Android/Chrome/Edge/Firefox).
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          // SVGs (navegadores modernos — escalam sem perda).
          {
            src: 'icons/icon-512.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        // Precacheia o app shell inteiro — Req 7.1/7.2 (operação offline).
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,webmanifest,ico}'],
        // A fonte Material Symbols Outlined woff2 tem ~3.9 MB; o limite
        // padrão do Workbox é 2 MiB. Elevamos para 5 MiB para garantir
        // que os ícones sejam precacheados e renderizem offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Evita conflitos com o hash router (SPA): navegações caem no index.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      },
      devOptions: {
        // SW desligado em dev para não interferir no HMR;
        // `npm run preview` exercita o comportamento real de produção.
        enabled: false
      }
    })
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true
  },
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173,
    strictPort: false
  }
});
