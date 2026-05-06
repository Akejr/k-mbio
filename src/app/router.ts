/**
 * Hash router minimalista para SPA.
 *
 * Três rotas fixas — `#/dashboard`, `#/register`, `#/history` — associadas a
 * _mount functions_ que recebem o `HTMLElement` raiz e devolvem uma função
 * de _unmount_. O router:
 *
 * - Escuta `hashchange` e `load` no `window`.
 * - Na primeira inicialização (e sempre que `location.hash` estiver vazio
 *   ou não corresponder a nenhuma rota registrada), redireciona para
 *   `#/dashboard` (rota default).
 * - Em cada transição: chama `unmount` da rota anterior antes de chamar
 *   `mount` da nova, garantindo que listeners/assinaturas sejam limpos.
 *
 * Este módulo é orientado a DOM e depende de `window` e `document`. Não
 * importa `domain/*` nem `infra/*` — as rotas recebem o `root` e se
 * organizam internamente (tipicamente compondo `ui/views/*`).
 *
 * ## Requisitos cobertos
 *
 * - **Req 4.7** — "WHEN o operador aciona qualquer item da barra de
 *   navegação inferior, THE Sistema SHALL navegar para a tela
 *   correspondente sem recarregar a página." `navigate(hash)` só altera
 *   `location.hash`; o browser dispara `hashchange` e a troca de view é
 *   feita em memória.
 *
 * - **Req 1.10** — "THE Registrador_de_Venda SHALL disponibilizar um botão
 *   'voltar' que retorna ao Dashboard sem persistir dados." O handler do
 *   botão chama `navigate('#/dashboard')` — nenhum dado é tocado.
 *
 * ## Semântica de `initRouter`
 *
 * Efeitos colaterais ao ser chamado:
 *
 * 1. Registra listener `hashchange` em `window`.
 * 2. Registra listener `load` em `window` **uma única vez**: se o
 *    `document.readyState !== 'loading'` no momento da chamada, o handler
 *    de `load` é executado imediatamente e de forma síncrona para garantir
 *    a primeira renderização (cenário comum quando o bootstrap chama
 *    `initRouter` depois do DOM já ter carregado).
 * 3. Invoca o handler inicial, que normaliza o hash (default ou rota
 *    desconhecida → `#/dashboard`) e monta a view correspondente.
 *
 * A função retornada pelo `initRouter` é o **teardown**: remove os
 * listeners registrados e chama o `unmount` atual (se houver). É
 * idempotente — chamá-la múltiplas vezes não produz efeito adicional.
 *
 * ## Navegação entre rotas
 *
 * `navigate(hash)` é um _thin wrapper_ sobre `location.hash = hash`. Se o
 * hash for igual ao atual, o browser **não** dispara `hashchange`; por isso,
 * chamadores que precisam "re-montar" a view atual (ex.: forçar reload de
 * dados) devem fazê-lo diretamente, não via `navigate` com o mesmo hash.
 */

/**
 * Hashes de rota reconhecidos. Tipos literais garantem chamadas seguras a
 * `navigate` e simplificam a discriminação no handler interno.
 */
export type RouteHash = '#/dashboard' | '#/register' | '#/history';

/**
 * Assinatura de uma _mount function_. Recebe o elemento raiz da
 * aplicação e retorna a função de _unmount_ — chamada pelo router antes
 * de montar a próxima rota.
 */
export type Mount = (root: HTMLElement) => () => void;

/**
 * Mapa das rotas para suas funções de montagem. Todas as três chaves são
 * obrigatórias para garantir que qualquer hash válido produza uma view.
 */
export interface Routes {
  '#/dashboard': Mount;
  '#/register': Mount;
  '#/history': Mount;
}

/** Rota default usada quando `location.hash` é vazio ou desconhecido. */
const DEFAULT_ROUTE: RouteHash = '#/dashboard';

/**
 * Conjunto de hashes válidos — usado pelo guard `isRouteHash`.
 *
 * Mantemos como _tuple_ de `RouteHash` para que, caso `Routes` seja
 * estendido no futuro, o TypeScript aponte a falta na lista.
 */
const KNOWN_ROUTES: readonly RouteHash[] = ['#/dashboard', '#/register', '#/history'];

/**
 * Type guard: `hash` é uma das rotas conhecidas?
 */
function isRouteHash(hash: string): hash is RouteHash {
  return (KNOWN_ROUTES as readonly string[]).includes(hash);
}

/**
 * Normaliza `location.hash`: se for uma rota conhecida, devolve-a;
 * caso contrário, devolve `DEFAULT_ROUTE`.
 */
function resolveHash(): RouteHash {
  const current = typeof window !== 'undefined' ? window.location.hash : '';
  return isRouteHash(current) ? current : DEFAULT_ROUTE;
}

/**
 * Retorna o hash atual como `RouteHash`. Se `location.hash` for vazio ou
 * desconhecido, devolve `#/dashboard`.
 *
 * Útil para componentes (ex.: `BottomNav`) que precisam destacar o item
 * ativo sem subscrever o router.
 */
export function currentRoute(): RouteHash {
  return resolveHash();
}

/**
 * Dispara navegação SPA para `hash`. Apenas atualiza `location.hash`; o
 * browser dispara `hashchange`, que é tratado pelo router.
 *
 * Se `hash` é igual ao atual, nenhum evento é disparado — comportamento
 * nativo do browser. Callers que precisam de re-renderização devem chamar
 * a lógica diretamente.
 */
export function navigate(hash: RouteHash): void {
  window.location.hash = hash;
}

/**
 * Inicializa o router. Ver documentação do módulo para semântica.
 *
 * @param routes Mapa de rotas (todas obrigatórias).
 * @param root   Elemento raiz onde as views serão montadas.
 * @returns Função de teardown (remove listeners + chama unmount atual).
 */
export function initRouter(routes: Routes, root: HTMLElement): () => void {
  let currentUnmount: (() => void) | null = null;
  let currentHash: RouteHash | null = null;
  let tornDown = false;

  /**
   * Aplica a rota resolvida de `location.hash`:
   *
   * - Se `location.hash` não casa uma rota conhecida, redireciona para
   *   `DEFAULT_ROUTE`. A mudança dispara `hashchange` novamente — portanto
   *   saímos cedo para evitar montar duas vezes no mesmo _tick_.
   * - Caso contrário, se o hash resolvido mudou desde a última aplicação,
   *   chama `unmount` anterior e monta a nova rota.
   */
  const apply = (): void => {
    if (tornDown) {
      return;
    }
    const raw = window.location.hash;
    // Hash vazio ou desconhecido: força navegação para a rota default.
    // A atribuição abaixo dispara um novo `hashchange` que entrará aqui
    // novamente com um hash válido, evitando loop porque, ao casar a rota
    // default, seguimos para o ramo de montagem.
    if (!isRouteHash(raw)) {
      if (window.location.hash !== DEFAULT_ROUTE) {
        window.location.hash = DEFAULT_ROUTE;
        return;
      }
      // Caso-limite: `raw` não casa mas já é igual a `DEFAULT_ROUTE` após
      // normalização de URL pelo browser. Prossegue montando a default.
    }
    const resolved = resolveHash();
    if (resolved === currentHash) {
      return;
    }
    if (currentUnmount !== null) {
      try {
        currentUnmount();
      } catch (cause) {
        // eslint-disable-next-line no-console
        console.error('[router] unmount lançou exceção:', cause);
      }
      currentUnmount = null;
    }
    currentHash = resolved;
    const mount = routes[resolved];
    currentUnmount = mount(root);
  };

  const onHashChange = (): void => {
    apply();
  };
  const onLoad = (): void => {
    apply();
  };

  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('load', onLoad);

  // Se o documento já está pronto (caso comum: o bootstrap executou após
  // o DOM carregar), `load` não dispararia mais — aplicamos imediatamente.
  // Se o documento ainda está em `loading`, o listener `load` cobrirá.
  if (typeof document !== 'undefined' && document.readyState !== 'loading') {
    apply();
  }

  return () => {
    if (tornDown) {
      return;
    }
    tornDown = true;
    window.removeEventListener('hashchange', onHashChange);
    window.removeEventListener('load', onLoad);
    if (currentUnmount !== null) {
      try {
        currentUnmount();
      } catch (cause) {
        // eslint-disable-next-line no-console
        console.error('[router] unmount lançou exceção no teardown:', cause);
      }
      currentUnmount = null;
    }
    currentHash = null;
  };
}
