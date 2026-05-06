/**
 * Factory unificada do `SalesRepository`.
 *
 * Estratégia de seleção de backend (§2 do design — Persistência):
 *
 * 1. Tenta abrir o IndexedDB via `openKwanzaProfitDb`. Se sucesso, retorna
 *    o repositório baseado em `idb`.
 * 2. Se `indexedDB === undefined` ou `openKwanzaProfitDb` rejeita, tenta
 *    `localStorage`. Se disponível, retorna o adaptador _fallback_.
 * 3. Se nenhum dos dois backends está operacional, lança
 *    `StorageUnavailableError` — a UI mapeia para a página de erro
 *    `AppError { kind: 'StorageUnavailable' }`.
 *
 * ## Requisitos cobertos
 *
 * - **Req 5.1** — Armazenamento_Local: seleciona automaticamente entre os
 *   dois backends suportados.
 * - **Req 5.3** — restauração após recarregar/reabrir: tanto o backend
 *   IndexedDB quanto o `localStorageAdapter` preservam os registros entre
 *   sessões.
 *
 * ## Por que _try_ IndexedDB primeiro?
 *
 * IndexedDB oferece cota maior, API assíncrona e índices nativos; é a
 * escolha padrão para volumes de Vendas realistas. O `localStorage` só
 * entra em cena em modos restritos onde o IndexedDB está explicitamente
 * bloqueado (alguns modos privados no Firefox/Safari).
 */

import { createLocalStorageSalesRepository } from '../localStorageAdapter';
import {
  createIndexedDbSalesRepository,
  type SalesRepository,
} from '../salesRepository';
import { StorageUnavailableError } from './errors';
import { openKwanzaProfitDb } from './openDb';

/**
 * Resolve com uma implementação viável de `SalesRepository`.
 *
 * Em ambientes de teste (com `fake-indexeddb/auto` em `tests/setup.ts`) a
 * primeira via sempre funciona; o fallback é exercitado por testes
 * dedicados (Task 8.8).
 *
 * @throws {StorageUnavailableError} Quando nenhum backend está disponível.
 */
export async function createSalesRepository(): Promise<SalesRepository> {
  // --- Caminho principal: IndexedDB -----------------------------------------
  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await openKwanzaProfitDb();
      return createIndexedDbSalesRepository(db);
    } catch (cause) {
      // Deliberadamente silencioso aqui: a falha do IndexedDB é esperada em
      // ambientes restritos. Prossegue para o fallback.
      // eslint-disable-next-line no-console
      console.warn(
        `[createSalesRepository] IndexedDB indisponível, tentando fallback localStorage (${String(cause)})`,
      );
    }
  }

  // --- Fallback: localStorage ----------------------------------------------
  if (typeof localStorage !== 'undefined') {
    try {
      // Teste de escrita mínima: alguns modos privados expõem `localStorage`
      // mas rejeitam `setItem`. Fazemos um round-trip para confirmar que o
      // backend está de fato operacional.
      const probeKey = '__kwanza_probe__';
      localStorage.setItem(probeKey, '1');
      localStorage.removeItem(probeKey);
      return createLocalStorageSalesRepository();
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.warn(
        `[createSalesRepository] localStorage indisponível para escrita (${String(cause)})`,
      );
    }
  }

  // --- Nenhum backend --------------------------------------------------------
  throw new StorageUnavailableError(
    'Nem IndexedDB nem localStorage estão disponíveis neste navegador.',
  );
}
