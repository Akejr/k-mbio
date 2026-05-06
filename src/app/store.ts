/**
 * Store observável genérico.
 *
 * Pequena abstração reativa que a camada de aplicação usa para expor o
 * `AppState` (ver `./state.ts`) à camada de UI. Nenhum framework — a API é
 * deliberadamente mínima: `get` para leitura, `set(updater)` para atualizar
 * funcionalmente e `subscribe(listener)` para receber o próximo estado.
 *
 * Este módulo é **puro** e **sem I/O**: não importa `domain/*`, `infra/*`
 * nem DOM. Pode ser usado em testes com qualquer tipo `T`.
 *
 * ## Requisito coberto
 *
 * - **Req 2.3** — "WHEN uma nova Venda é persistida, THE Dashboard SHALL
 *   refletir o novo Lucro_Total na próxima renderização sem exigir recarga
 *   manual". O `Store` é o canal reativo que propaga a atualização: a ação
 *   `createSale` chama `set(...)` com o array novo e os listeners registrados
 *   (uma por view) re-renderizam.
 *
 * ## Semântica
 *
 * - `get()` retorna a referência **atual** do estado. Para garantir
 *   comparação por referência ser útil, os chamadores devem produzir um
 *   objeto novo a cada transição relevante (é o que `set(updater)` já exige
 *   por contrato: `updater(prev) => next`).
 *
 * - `set(updater)` chama `updater(prev)` para obter `next` e compara com
 *   `Object.is(prev, next)`:
 *
 *   - Se **iguais** (mesma referência; updater retornou `prev` inalterado),
 *     a chamada é um _no-op_: nenhum listener é notificado. Essa curto-
 *     circuitação evita re-renders desnecessários quando uma ação decide,
 *     ao inspecionar `prev`, que não há mudança a aplicar.
 *
 *   - Se **diferentes** (updater devolveu um objeto novo), o estado interno
 *     é atualizado e **todos** os listeners subscritos são invocados com o
 *     novo valor, na ordem de inscrição.
 *
 * - `subscribe(listener)` registra o listener e devolve uma função de
 *   _unsubscribe_. A função é idempotente: chamá-la múltiplas vezes remove
 *   apenas uma inscrição (a primeira chamada é efetiva; as demais são
 *   no-op). Se o mesmo listener é subscrito duas vezes, ele recebe duas
 *   notificações por `set` — o comportamento esperado de um `Set` de
 *   referências.
 *
 * ## Notas de implementação
 *
 * - Listeners são armazenados num `Set<Listener<T>>` — inserção e remoção
 *   em O(1), iteração determinística pela ordem de inserção.
 *
 * - Durante `set`, iteramos sobre uma **cópia** do `Set` de listeners. Isso
 *   torna seguro um listener se-desubscrever ou subscrever outro listener
 *   em resposta à mudança sem afetar o laço de notificação atual.
 *
 * - Exceções lançadas por um listener **não** interrompem a notificação
 *   dos demais: são reportadas via `console.error` (política consistente
 *   com EventTargets nativos). Isso evita que um bug de UI paralise o
 *   resto da aplicação.
 */

/**
 * Função de atualização funcional para `Store.set`. Recebe o estado atual
 * e retorna o próximo estado. Se retornar a mesma referência, a chamada é
 * um no-op (ver semântica de `set`).
 */
export type StoreUpdater<T> = (prev: T) => T;

/**
 * Listener subscrito por `Store.subscribe`. Chamado após cada transição
 * efetiva de estado com a nova referência.
 */
export type StoreListener<T> = (state: T) => void;

/**
 * Contrato público do store observável.
 */
export interface Store<T> {
  /** Retorna a referência atual do estado. */
  get(): T;
  /**
   * Aplica `updater` ao estado atual. Se `Object.is(prev, next) === false`,
   * atualiza o estado interno e notifica todos os listeners com `next`.
   */
  set(updater: StoreUpdater<T>): void;
  /**
   * Registra `listener` e retorna a função de _unsubscribe_ (idempotente).
   */
  subscribe(listener: StoreListener<T>): () => void;
}

/**
 * Cria um novo `Store<T>` inicializado com `initial`.
 *
 * @param initial Estado inicial. Nenhuma cópia é feita — o chamador é
 *   responsável por passar o objeto que deseja expor.
 */
export function createStore<T>(initial: T): Store<T> {
  let state: T = initial;
  const listeners: Set<StoreListener<T>> = new Set();

  return {
    get() {
      return state;
    },
    set(updater) {
      const prev = state;
      const next = updater(prev);
      if (Object.is(prev, next)) {
        // No-op: updater decidiu que não há mudança a aplicar.
        return;
      }
      state = next;
      // Iteramos sobre uma cópia para tolerar (un)subscribes durante a
      // notificação e para isolar exceções de um listener dos demais.
      for (const listener of [...listeners]) {
        try {
          listener(next);
        } catch (cause) {
          // eslint-disable-next-line no-console
          console.error('[store] listener lançou exceção durante notificação:', cause);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      let unsubscribed = false;
      return () => {
        if (unsubscribed) {
          return;
        }
        unsubscribed = true;
        listeners.delete(listener);
      };
    },
  };
}
