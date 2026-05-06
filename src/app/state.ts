/**
 * Estado global da aplicação (`AppState`) e seu valor inicial.
 *
 * Este módulo é **puro** e sem I/O: apenas declara os tipos consumidos pelo
 * `Store` (ver `./store.ts`) e pela camada de UI. As ações assíncronas que
 * mutam o estado vivem em `./actions.ts`.
 *
 * ## Requisitos cobertos
 *
 * - **Req 2.1** — "THE Dashboard SHALL exibir um card principal denominado
 *   'Lucro Total' com o valor em AOA." O campo `sales` é a fonte-da-verdade
 *   a partir da qual `calcularLucroTotal` é derivado na renderização.
 *
 * - **Req 2.3** — "WHEN uma nova Venda é persistida, THE Dashboard SHALL
 *   refletir o novo Lucro_Total na próxima renderização." O `Store`
 *   propaga a nova `sales` e as views recalculam.
 *
 * - **Req 3.5** — "WHEN o Histórico_de_Vendas está vazio, THE Dashboard
 *   SHALL exibir um estado vazio". `initialState.sales === []` garante que
 *   a UI comece no estado vazio até `loadAllSales` concluir.
 *
 * ## Invariantes do `AppState`
 *
 * - `sales` está **sempre ordenado** por `ordenarVendas` (Req 3.3/3.4). As
 *   ações (`loadAllSales`, `createSale`, `deleteSale`) são responsáveis por
 *   manter esse invariante ao atualizar o campo. As views consomem a lista
 *   assumindo que já está ordenada.
 *
 * - `status` reflete o ciclo de vida da operação em curso:
 *   - `'idle'` — nenhum trabalho assíncrono pendente; UI pode interagir.
 *   - `'loading'` — hidratação em curso (`loadAllSales`).
 *   - `'saving'` — persistência de uma Venda em curso (`createSale`,
 *     `deleteSale`).
 *   - `'error'` — última operação falhou em modo irrecuperável; ver
 *     `lastError` para a causa.
 *
 * - `validationErrors` é a lista **atual** de erros retornada por
 *   `validateSaleInput`. A `RegisterView` lê esse campo para renderizar
 *   mensagens inline por campo. Vazia quando não há submissão inválida
 *   ativa; é limpa ao navegar para fora da view ou ao registrar com
 *   sucesso.
 *
 * - `lastError` é o último `AppError` não-validação produzido por uma
 *   ação (ex.: `QuotaExceeded` em `createSale`). Usado pelo snackbar
 *   global da UI; é limpo quando a ação seguinte é bem-sucedida.
 */

import type { Sale, ValidationError, AppError } from '../domain/sale';

/**
 * Fases do ciclo de vida das ações assíncronas. A UI pode usá-las para
 * desabilitar formulários (`'saving'`), exibir _spinners_ (`'loading'`)
 * ou destacar o snackbar de erro (`'error'`).
 */
export type AppStatus = 'idle' | 'loading' | 'saving' | 'error';

/**
 * Estado global consumido por todas as views. Imutável por convenção: cada
 * transição é produzida por `Store.set(updater)` retornando um objeto novo.
 */
export interface AppState {
  /**
   * Lista completa de Vendas não-excluídas conhecidas pela sessão.
   * Invariante: sempre ordenada por `ordenarVendas` (`createdAt` desc,
   * desempate por `id` desc).
   */
  sales: Sale[];
  /** Fase corrente do ciclo de vida de ações (ver `AppStatus`). */
  status: AppStatus;
  /**
   * Erros de validação da submissão atual do formulário de cadastro.
   * Vazio quando não há formulário inválido ativo.
   */
  validationErrors: ValidationError[];
  /**
   * Último erro tipado não-validação. `null` quando nenhuma ação falhou ou
   * após uma ação bem-sucedida subsequente.
   */
  lastError: AppError | null;
}

/**
 * Estado inicial da aplicação. Usado em `createStore` durante o _bootstrap_
 * em `src/main.ts`.
 *
 * A lista de Vendas começa vazia: o `RegisterView` não depende de carga
 * prévia, e o `DashboardView` exibe o `EmptyState` até `loadAllSales`
 * popular o array.
 */
export const initialState: AppState = {
  sales: [],
  status: 'idle',
  validationErrors: [],
  lastError: null,
};
