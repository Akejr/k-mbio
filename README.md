# Kâmbio

PWA _local-first_ para controlo de lucro de casa de câmbios em Angola.
Registe vendas de moeda estrangeira (USD, EUR, GBP, ZAR) e acompanhe o
**Lucro Total em Kwanzas (AOA)** — tudo persistido no próprio dispositivo,
funcionando offline e instalável como app (iOS/Android).

![Kâmbio — Logo](public/icons/icon-192.svg)

## Funcionalidades

- **Dashboard** com card de Lucro Total, contador animado, histórico de vendas
  com bandeiras das moedas e animação escalonada de entrada.
- **Cadastro** de venda com seletor de moeda em pills (USD, EUR, GBP, ZAR),
  validação inline dos campos (nome, moeda, quantidade, lucro).
- **Histórico** com swipe-to-delete (arrastar para os lados exclui) e snackbar
  de _Desfazer_ por 5s. Acessível via tecla Delete quando o item tem foco.
- **PWA** instalável com ícones dedicados para iPhone/iPad (apple-touch-icon)
  e Android (manifest com PNGs 192/512 + maskable).
- **Funciona offline** — Service Worker pré-cacheia o app shell inteiro.
- **Sem backend**: IndexedDB (com fallback para localStorage) guarda tudo
  localmente.

## Stack

- **TypeScript strict + Vite 8** — build rápido, sem framework de UI.
- **Tailwind CSS** com tokens custom do Design System (dark mode
  institucional, glassmorphism, gradientes esmeralda).
- **idb** para IndexedDB tipado; `fake-indexeddb` para testes de integração.
- **vite-plugin-pwa** (Workbox) com `strategies: generateSW`, `registerType:
  autoUpdate`.
- **Vitest + fast-check** prontos para PBT (propriedades de correção
  definidas no design, sub-tasks opcionais).

## Comandos

```bash
npm install                # instala dependências
npm run dev                # vite dev server em http://localhost:5173
npm run build              # build de produção em ./dist
npm run preview            # serve ./dist em http://localhost:4173
npm run typecheck          # tsc --noEmit (strict)
npm run test:run           # vitest --run

node scripts/generate-icons.mjs   # regenera PNGs a partir dos SVGs
```

## Estrutura

```
src/
├── domain/        # Funções puras: currency, idGen, sale, profit, ordering, formatter
├── app/           # Store observável, state, actions, router (hash)
├── infra/         # IndexedDB (idb) + fallback localStorage, factory, erros, PWA SW
├── ui/
│   ├── components/  # TopAppBar, BottomNav, Fab, FormField, SaleListItem, Snackbar…
│   └── views/       # DashboardView, RegisterView, HistoryView
├── styles/        # Tailwind base + fontes auto-hospedadas
├── main.ts        # Bootstrap
└── index.html
```

## Instalar como app no iPhone

1. Abra a URL no **Safari** (Chrome iOS não permite instalar PWA).
2. Toque em **Compartilhar → Adicionar à Tela de Início**.
3. O ícone Kâmbio (K em esmeralda) aparece na home screen.

No Android/Chromium, o próprio navegador sugere a instalação pelo manifest.

## Spec (design-first + PBT)

Documentação completa em `.kiro/specs/kwanza-profit-pwa/`:

- `requirements.md` — 12 requisitos em formato EARS.
- `design.md` — decisões arquiteturais + 15 propriedades de correção.
- `tasks.md` — plano de implementação incremental.

## Licença

Uso pessoal. Ajuste conforme necessário.
