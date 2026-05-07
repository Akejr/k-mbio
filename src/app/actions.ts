/**
 * Ações assíncronas da camada de aplicação.
 *
 * Este módulo compõe a **lógica pura de domínio** (`src/domain/*`) com o
 * **repositório de persistência** (`src/infra/salesRepository`) e projeta
 * os resultados no `Store<AppState>` (ver `./store.ts`, `./state.ts`).
 *
 * As ações são os únicos pontos do sistema que:
 *
 * - Disparam I/O (via `SalesRepository`).
 * - Mutam o `AppState` através de `Store.set(updater)`.
 * - Convertem exceções tipadas de infraestrutura (ex.: `QuotaExceededError`)
 *   em variantes do `AppError` consumidas pela UI.
 *
 * ## Requisitos cobertos
 *
 * - **Req 1.3** — submissão válida do formulário persiste uma Venda e
 *   dispara navegação (a navegação propriamente é decisão da `RegisterView`;
 *   aqui garantimos a persistência e a atualização do estado).
 * - **Req 1.4** — `createSale` compõe `getNextSequence` + `gerarIdTransacao`
 *   para produzir o id `TRX-<seq>`; carimba `createdAt` com o relógio do
 *   dispositivo e `deletedAt: null`.
 * - **Req 2.3** — após `createSale` bem-sucedido, `state.sales` é atualizado
 *   com a nova lista ordenada; o `Store` notifica as views.
 * - **Req 3.3/3.4** — `loadAllSales` e `createSale` passam por
 *   `ordenarVendas`, preservando o invariante de que `state.sales` está
 *   sempre ordenado.
 * - **Req 5.6** — `QuotaExceededError` lançado por `repo.putSale` é
 *   normalizado em `AppError { kind: 'QuotaExceeded' }`, sem alterar as
 *   Vendas previamente persistidas.
 *
 * ## Princípios
 *
 * - Uma ação **nunca** silencia erros: ou `lastError` é populado, ou a
 *   exceção é re-lançada (nenhuma ação faz isso hoje — todas retornam).
 *
 * - Transições de `status` são explícitas: `idle` → `loading`/`saving` →
 *   `idle` em sucesso, ou `idle`/`error` em falha (ver tabela em cada
 *   ação).
 *
 * - O estado inicial de uma ação de escrita **limpa** `lastError` e
 *   `validationErrors` apenas em sucesso; em falha, a ação preserva o
 *   contexto para a UI apresentar ao usuário.
 */

import {
  validateSaleInput,
  type Sale,
  type AppError,
} from '../domain/sale';
import { ordenarVendas } from '../domain/ordering';
import { gerarIdTransacao } from '../domain/idGen';
import type { SalesRepository } from '../infra/salesRepository';
import { QuotaExceededError } from '../infra/db/errors';

import type { Store } from './store';
import type { AppState } from './state';

/**
 * Configuração de produto consumida pelas ações que chamam
 * `validateSaleInput`. Hoje expõe apenas a flag de lucro negativo (Req 1.9).
 */
export interface CreateSaleConfig {
  /** Quando `true`, `profitAoa < 0` deixa de ser rejeitado na validação. */
  allowNegativeProfit?: boolean;
}

// ============================================================================
// Helpers internos
// ============================================================================

/**
 * Converte uma exceção desconhecida em uma variante de `AppError`.
 *
 * - `QuotaExceededError` → `{ kind: 'QuotaExceeded' }` (Req 5.6).
 * - Qualquer outro → `{ kind: 'Unknown', cause }` preservando a causa
 *   original para logs de desenvolvedor.
 */
function maparErroDeInfra(cause: unknown): AppError {
  if (cause instanceof QuotaExceededError) {
    return { kind: 'QuotaExceeded' };
  }
  return { kind: 'Unknown', cause };
}

// ============================================================================
// Ações
// ============================================================================

/**
 * Hidrata o `AppState` a partir do repositório.
 *
 * Fluxo:
 *
 * 1. Set `status: 'loading'`, preservando os demais campos.
 * 2. Chama `repo.getAll()`.
 * 3. Em sucesso: `sales = ordenarVendas(result)`, `status: 'idle'`,
 *    `lastError: null`.
 * 4. Em falha: `status: 'idle'`, `lastError` populado via
 *    `mapearErroDeInfra`.
 *
 * Nunca lança: erros são convertidos em `lastError`.
 *
 * Cobre o **Req 2.3** (atualização reativa do Dashboard) em conjunto com o
 * **Req 5.3** (restauração do Histórico após reabrir o app).
 */
export async function loadAllSales(
  store: Store<AppState>,
  repo: SalesRepository,
): Promise<void> {
  store.set((prev) => ({ ...prev, status: 'loading' }));
  try {
    const loaded = await repo.getAll();
    // Invariante da camada de aplicação: `state.sales` contém apenas
    // Vendas **ativas** (não soft-deleted). O repositório devolve TUDO
    // (ver JSDoc de `SalesRepository.getAll`), cabe a esta ação filtrar.
    // Sem isso, Vendas com `deletedAt !== null` voltariam a aparecer na
    // UI após reabrir o app, mesmo com o `calcularLucroTotal` ignorando-as.
    const active = loaded.filter((s) => s.deletedAt === null);
    const ordered = ordenarVendas(active);
    store.set((prev) => ({
      ...prev,
      sales: ordered,
      status: 'idle',
      lastError: null,
    }));
  } catch (cause) {
    const mapped = maparErroDeInfra(cause);
    store.set((prev) => ({
      ...prev,
      status: 'idle',
      lastError: mapped,
    }));
  }
}

/**
 * Valida e persiste uma nova Venda a partir do payload do formulário.
 *
 * Fluxo em caso de `input` inválido:
 *
 * 1. `validateSaleInput(input, cfg)` retorna `{ ok: false, errors }`.
 * 2. Store recebe `validationErrors: errors` e
 *    `lastError: { kind: 'Validation', errors }`.
 * 3. Retorna `null`.
 *
 * Fluxo em caso de `input` válido:
 *
 * 1. Set `status: 'saving'` e limpa `validationErrors`.
 * 2. Obtém `seq` via `repo.getNextSequence()` e compõe a `Sale` com
 *    `gerarIdTransacao(seq)`, `createdAt: Date.now()` e `deletedAt: null`
 *    (Req 1.4).
 * 3. Persiste via `repo.putSale(sale)` (Req 5.5 — idempotente por `id`).
 * 4. Atualiza `sales = ordenarVendas([sale, ...prev.sales])` (Req 3.3/3.4);
 *    limpa `lastError`; `status: 'idle'`.
 * 5. Retorna a `Sale` criada.
 *
 * Fluxo em caso de erro de infraestrutura:
 *
 * 1. Store recebe `status: 'error'` e `lastError` via `mapearErroDeInfra`
 *    (em especial `{ kind: 'QuotaExceeded' }` para o Req 5.6).
 * 2. Retorna `null`. Vendas previamente persistidas permanecem intactas
 *    (garantia da transação do IndexedDB no repositório).
 *
 * @param input Payload do formulário (`unknown` — a função é defensiva).
 * @param store Store da aplicação.
 * @param repo  Repositório de Vendas.
 * @param cfg   Configuração de validação (padrão: não permite lucro
 *   negativo — Req 1.9).
 * @returns A `Sale` persistida, ou `null` em validação/erro.
 */
export async function createSale(
  input: unknown,
  store: Store<AppState>,
  repo: SalesRepository,
  cfg: CreateSaleConfig = { allowNegativeProfit: false },
): Promise<Sale | null> {
  const allowNegativeProfit = cfg.allowNegativeProfit ?? false;
  const result = validateSaleInput(input, { allowNegativeProfit });
  if (!result.ok) {
    store.set((prev) => ({
      ...prev,
      validationErrors: result.errors,
      lastError: { kind: 'Validation', errors: result.errors },
    }));
    return null;
  }

  store.set((prev) => ({
    ...prev,
    status: 'saving',
    validationErrors: [],
  }));

  try {
    const seq = await repo.getNextSequence();
    const sale: Sale = {
      id: gerarIdTransacao(seq),
      customerName: result.value.customerName,
      currency: result.value.currency,
      amount: result.value.amount,
      profitAoa: result.value.profitAoa,
      createdAt: Date.now(),
      deletedAt: null,
    };
    await repo.putSale(sale);
    store.set((prev) => ({
      ...prev,
      sales: ordenarVendas([sale, ...prev.sales]),
      status: 'idle',
      validationErrors: [],
      lastError: null,
    }));
    return sale;
  } catch (cause) {
    const mapped = maparErroDeInfra(cause);
    store.set((prev) => ({
      ...prev,
      status: 'error',
      lastError: mapped,
    }));
    return null;
  }
}

/**
 * Exclui logicamente uma Venda (_soft delete_) e remove-a do array em
 * memória. Retorna a cópia do registro **antes** da exclusão, permitindo
 * à UI oferecer "Desfazer" via `restoreSale`.
 *
 * Fluxo:
 *
 * 1. Captura o snapshot da Venda em memória (para permitir undo).
 * 2. Set `status: 'saving'`; remove otimisticamente do `sales`.
 * 3. Chama `repo.softDelete(id)`.
 * 4. Em sucesso: confirma remoção, `status: 'idle'`.
 * 5. Em falha: restaura o elemento no `sales` (para manter a UI
 *    consistente com o storage) e popula `lastError`.
 *
 * @returns A `Sale` que estava no store, ou `null` quando `id` não existe.
 */
export async function deleteSale(
  id: string,
  store: Store<AppState>,
  repo: SalesRepository,
): Promise<Sale | null> {
  const snapshot = store.get().sales.find((s) => s.id === id) ?? null;
  if (snapshot === null) {
    return null;
  }

  // Remoção otimista: melhora a percepção de responsividade.
  store.set((prev) => ({
    ...prev,
    status: 'saving',
    sales: prev.sales.filter((s) => s.id !== id),
  }));

  try {
    await repo.softDelete(id);
    store.set((prev) => ({
      ...prev,
      status: 'idle',
      lastError: null,
    }));
    return snapshot;
  } catch (cause) {
    // Rollback: reinsere o snapshot na posição correta via `ordenarVendas`.
    const mapped = maparErroDeInfra(cause);
    store.set((prev) => ({
      ...prev,
      sales: ordenarVendas([...prev.sales, snapshot]),
      status: 'error',
      lastError: mapped,
    }));
    return null;
  }
}

/**
 * Restaura uma Venda previamente excluída (_undo_ do `deleteSale`).
 *
 * Usa `repo.putSale` com a Venda original (`deletedAt: null`), que é
 * idempotente por `id` (Req 5.5) e sobrescreve o registro marcado como
 * excluído. Após o put, a Venda volta para o `sales` em memória na
 * posição cronológica correta.
 *
 * @param sale  A `Sale` a restaurar (tipicamente retornada por
 *   `deleteSale` e guardada na closure do snackbar de undo).
 * @returns `true` em sucesso, `false` em falha (com `lastError` populado).
 */
export async function restoreSale(
  sale: Sale,
  store: Store<AppState>,
  repo: SalesRepository,
): Promise<boolean> {
  // Garante que o registro restaurado esteja ativo.
  const restored: Sale = { ...sale, deletedAt: null };
  store.set((prev) => ({ ...prev, status: 'saving' }));
  try {
    await repo.putSale(restored);
    store.set((prev) => {
      // Evita duplicar caso já esteja no array (e.g. clique duplo em
      // "Desfazer").
      const withoutDupe = prev.sales.filter((s) => s.id !== restored.id);
      return {
        ...prev,
        sales: ordenarVendas([restored, ...withoutDupe]),
        status: 'idle',
        lastError: null,
      };
    });
    return true;
  } catch (cause) {
    const mapped = maparErroDeInfra(cause);
    store.set((prev) => ({
      ...prev,
      status: 'error',
      lastError: mapped,
    }));
    return false;
  }
}
