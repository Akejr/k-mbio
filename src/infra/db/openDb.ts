/**
 * Abertura e migração do banco IndexedDB do KwanzaProfit.
 *
 * Este módulo é o **único** ponto de contato com `idb.openDB` — todo o
 * restante da camada `infra/*` consome o `IDBPDatabase<KwanzaProfitDB>`
 * retornado aqui. Mantê-lo pequeno e auditável facilita evoluções de schema
 * e testes de integração (`fake-indexeddb` em `tests/setup.ts`).
 *
 * ## Requisitos cobertos
 *
 * - **Req 5.1** — persistência local: abre o banco e cria as stores/índices
 *   declarados em `./schema.ts`.
 * - **Req 5.3** — restauração após recarregar/reabrir: ao abrir um banco já
 *   existente, o callback `upgrade` **não** é chamado e os registros
 *   persistidos ficam imediatamente disponíveis via `db.getAll(...)`.
 * - **Req 5.6** — quota excedida: o `upgrade` só cria estrutura (vazia),
 *   nunca escreve dados do usuário; falhas de quota só podem ocorrer
 *   depois, em `putSale`, e são tratadas em `../salesRepository.ts`.
 *
 * ## Invariantes de migração
 *
 * - O callback `upgrade` é **aditivo**: para cada versão nova, cria apenas
 *   as stores/índices que ainda não existem na versão anterior do usuário.
 *   A verificação `!db.objectStoreNames.contains(...)` torna o callback
 *   idempotente dentro da mesma transação `versionchange`.
 * - O `keyPath` das stores é fixado aqui e **nunca** deve ser alterado em
 *   versões futuras — mudanças no formato de id exigiriam migração de dados
 *   explícita (criar nova store + copiar registros + remover antiga).
 */

import { openDB, type IDBPDatabase } from 'idb';
import {
  DB_NAME,
  DB_VERSION,
  INDEX_BY_CREATED_AT,
  INDEX_BY_DELETED_AT,
  META_STORE,
  SALES_STORE,
  type KwanzaProfitDB,
} from './schema';

/**
 * Abre (ou cria) o banco `kwanza-profit` na versão atual do schema.
 *
 * - Se o banco ainda não existe, o callback `upgrade` é executado em uma
 *   transação `versionchange` que cria as stores `sales` (com índices
 *   `byCreatedAt` e `byDeletedAt`) e `meta`.
 * - Se o banco já existe na versão corrente, `upgrade` não é chamado e o
 *   banco é aberto imediatamente.
 * - Se existir numa versão anterior, o callback roda com `oldVersion <
 *   DB_VERSION` e aplica apenas as etapas aditivas necessárias.
 *
 * A factory `createSalesRepository` em `./factory.ts` trata rejeições desta
 * Promise (ex.: IndexedDB indisponível) caindo para o `localStorageAdapter`
 * ou lançando `StorageUnavailableError`.
 *
 * @returns Handle tipado do banco, pronto para uso em transações.
 */
export function openKwanzaProfitDb(): Promise<IDBPDatabase<KwanzaProfitDB>> {
  return openDB<KwanzaProfitDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // --- Store de Vendas --------------------------------------------------
      if (!db.objectStoreNames.contains(SALES_STORE)) {
        const salesStore = db.createObjectStore(SALES_STORE, {
          keyPath: 'id',
        });
        // Índice temporal para varredura ordenada do Histórico (Req 3.3).
        salesStore.createIndex(INDEX_BY_CREATED_AT, 'createdAt');
        // Índice sobre `deletedAt` para futuros filtros de soft delete
        // (Req 10.3). Registros com `deletedAt === null` são naturalmente
        // omitidos do índice pelo IndexedDB.
        salesStore.createIndex(INDEX_BY_DELETED_AT, 'deletedAt');
      }

      // --- Store de metadados ----------------------------------------------
      // Guarda o contador `saleSeq` usado por `gerarIdTransacao` — ver
      // `SalesRepository.getNextSequence`.
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    },
  });
}
