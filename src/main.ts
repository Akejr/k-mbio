/**
 * Bootstrap da aplicação KwanzaProfit.
 *
 * Orquestra:
 *
 * 1. Carrega estilos (Tailwind + fontes auto-hospedadas — ver
 *    `styles/index.css` e `styles/fonts.css`).
 * 2. Cria o `Store<AppState>` com `initialState`.
 * 3. Resolve o `SalesRepository` via `createSalesRepository()` (tenta
 *    IndexedDB, cai para `localStorage`; se ambos falharem, exibe
 *    erro).
 * 4. Monta os singletons globais `BottomNav` e `Fab` em `document.body`.
 * 5. Inicializa o router com as três views
 *    (`#/dashboard`, `#/register`, `#/history`), tendo o `#app` como
 *    elemento raiz de montagem.
 * 6. Dispara `loadAllSales` em _fire-and-forget_ para hidratar o store
 *    a partir do storage (Req 5.3).
 * 7. Registra o Service Worker (Task 13.3) em segundo plano — a PWA
 *    segue funcional em modo degradado se o registro falhar.
 *
 * ## Sobre a `TopAppBar`
 *
 * Cada view monta sua própria `TopAppBar` dentro do `root` do router:
 * `DashboardView` e `HistoryView` usam a variante `'default'`, enquanto
 * `RegisterView` usa `'back'` (Req 1.10). Essa escolha mantém a troca
 * de variantes simples — o router naturalmente limpa o `root` ao
 * transitar entre views — sem precisar de um singleton global
 * reativo ao `hashchange`. `BottomNav` e `Fab` permanecem como
 * singletons porque são estáveis entre rotas.
 *
 * ## Requisitos cobertos
 *
 * - **Req 4.1/4.3/4.7** — FAB, BottomNav e router mounted na raiz.
 * - **Req 5.3** — hidratação automática após bootstrap.
 * - **Req 9.1** — tema dark mode aplicado via `<html class="dark">`
 *   (ver `src/index.html`); classes utilitárias de Tailwind presentes
 *   no CSS compilado.
 */

import './styles/index.css';
import './styles/fonts.css';

import { createStore } from './app/store';
import { initialState } from './app/state';
import { initRouter } from './app/router';
import { loadAllSales } from './app/actions';
import { createSalesRepository } from './infra/db/factory';
import { BottomNav } from './ui/components/BottomNav';
import { mountSnackbar } from './ui/components/Snackbar';
import { DashboardView } from './ui/views/DashboardView';
import { RegisterView } from './ui/views/RegisterView';
import { HistoryView } from './ui/views/HistoryView';

/**
 * Bloqueia gestos de zoom em iOS Safari e Android.
 *
 * Apesar de `<meta viewport user-scalable=no>` no `index.html`, o iOS Safari
 * ignora essa diretiva desde iOS 10 e permite pinch-to-zoom e double-tap
 * zoom em páginas web. Como o Kâmbio é um app com tipografia fixa (sem
 * conteúdo longo de leitura), o zoom acidental ao tocar num `<input>`
 * numérico é disruptivo — o usuário perde o contexto do formulário.
 *
 * Interceptamos:
 *   - `gesturestart` (iOS): dispara antes de um pinch, cancelar desabilita.
 *   - `dblclick`: bloqueia double-tap zoom.
 *   - `touchmove` com mais de um toque: cancela pinch residual no Android.
 *
 * Observação: em PWA instalado (`display: standalone`), o iOS já desabilita
 * zoom automaticamente. Este bloqueio extra cobre o Safari web (antes da
 * instalação) e Android Chrome.
 */
function bloquearZoom(): void {
  document.addEventListener(
    'gesturestart',
    (ev) => {
      ev.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    'gesturechange',
    (ev) => {
      ev.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    'dblclick',
    (ev) => {
      ev.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    'touchmove',
    (ev) => {
      if (ev.touches.length > 1) {
        ev.preventDefault();
      }
    },
    { passive: false },
  );
}

/**
 * Renderiza uma mensagem de erro fatal quando nenhum backend de
 * armazenamento está disponível (`StorageUnavailableError`). Impede
 * o bootstrap de prosseguir, pois a aplicação não teria como
 * persistir vendas.
 */
function renderFatalError(appRoot: HTMLElement, message: string): void {
  appRoot.innerHTML = '';
  const container = document.createElement('main');
  container.className =
    'min-h-screen flex flex-col items-center justify-center px-margin-mobile text-center gap-md';
  const title = document.createElement('h1');
  title.className = 'font-headline-md text-headline-md text-error';
  title.textContent = 'Armazenamento indisponível';
  const paragraph = document.createElement('p');
  paragraph.className =
    'font-body-base text-body-base text-on-surface-variant max-w-md';
  paragraph.textContent = message;
  container.appendChild(title);
  container.appendChild(paragraph);
  appRoot.appendChild(container);
}

/**
 * Ponto de entrada assíncrono. Encapsulado em função para permitir
 * `await` na resolução do repositório sem _top-level await_.
 */
async function bootstrap(): Promise<void> {
  bloquearZoom();

  const appRoot = document.getElementById('app');
  if (appRoot === null) {
    // Sem `#app` não há como montar a aplicação; falha ruidosa em dev.
    throw new Error('[main] elemento #app não encontrado em index.html');
  }

  const store = createStore(initialState);

  // --- Repositório ---
  let repo;
  try {
    repo = await createSalesRepository();
  } catch (cause) {
    // eslint-disable-next-line no-console
    console.error('[main] falha ao inicializar storage:', cause);
    renderFatalError(
      appRoot,
      'Não foi possível inicializar o armazenamento local. Verifique as permissões do navegador ou tente outro dispositivo.',
    );
    return;
  }

  // --- Singletons globais (fora de #app para não serem limpos pelo
  //     router ao trocar de view) ---
  //
  // O FAB flutuante foi absorvido pelo centro da BottomNav (ver
  // `./ui/components/BottomNav.ts`) — não há mais botão separado aqui.
  document.body.appendChild(BottomNav());
  mountSnackbar();

  // --- Router ---
  initRouter(
    {
      '#/dashboard': DashboardView(store, repo),
      '#/register': RegisterView(store, repo),
      '#/history': HistoryView(store, repo),
    },
    appRoot,
  );

  // --- Hidratação do store ---
  // Fire-and-forget: views mostram `EmptyState` até `getAll` resolver;
  // erros são registrados em `store.lastError` pela própria ação.
  void loadAllSales(store, repo);

  // --- Service Worker (Task 13.3) ---
  // Import dinâmico para não bloquear o _first paint_. O wrapper em
  // `infra/pwa/registerSW.ts` já captura e loga erros internamente,
  // portanto o app segue em modo degradado (sem offline) se o registro
  // falhar — Req 7.5.
  void import('./infra/pwa/registerSW')
    .then((m) => m.registerServiceWorker())
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.warn('[main] falha ao carregar registro do SW:', error);
    });
}

void bootstrap();
