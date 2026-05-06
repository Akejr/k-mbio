/**
 * Declaração do **schema tipado** do IndexedDB usado pelo KwanzaProfit.
 *
 * Este módulo é puro: exporta apenas constantes e tipos. Nenhum I/O aqui —
 * a abertura propriamente dita do banco fica em `./openDb.ts`, e o uso das
 * stores/índices fica em `../salesRepository.ts`.
 *
 * ## Requisitos cobertos
 *
 * - **Req 5.1** — Armazenamento_Local para todas as Vendas: define nome do
 *   banco, nome da store `sales` e seus índices, e a store `meta` que
 *   sustenta o contador `saleSeq` para geração de `id` no formato `TRX-<seq>`.
 * - **Req 5.3** — Restauração da lista completa após recarregar/reabrir:
 *   o schema é o contrato que permite reabrir o mesmo banco e recuperar
 *   todos os registros persistidos em sessões anteriores.
 * - **Req 5.6** — Quota excedida: a separação de stores (`sales` vs `meta`)
 *   e a única versão inicial (`DB_VERSION = 1`) mantêm as migrações
 *   atômicas e permitem que uma escrita que falhe por quota aborte sem
 *   corromper a estrutura do banco.
 *
 * ## Design (§Modelo de Dados)
 *
 * | DB: `kwanza-profit` (v1) |                                        |
 * | ------------------------ | -------------------------------------- |
 * | Store `sales`            | `keyPath: 'id'`                        |
 * |   Índice `byCreatedAt`   | `keyPath: 'createdAt'`                 |
 * |   Índice `byDeletedAt`   | `keyPath: 'deletedAt'`                 |
 * | Store `meta`             | `keyPath: 'key'`                       |
 * |   Registro `saleSeq`     | `{ key: 'saleSeq', value: number }`    |
 */

import type { DBSchema } from 'idb';
import type { Sale } from '../../domain/sale';

// ============================================================================
// Nomes físicos — usados tanto no `upgrade` quanto nas transações do repo
// ============================================================================

/** Nome do banco IndexedDB. */
export const DB_NAME = 'kwanza-profit';

/**
 * Versão do schema.
 *
 * Incrementar **apenas** quando um novo upgrade for necessário (nova store,
 * novo índice, migração de dados). Sempre atualizar o `upgrade` em
 * `./openDb.ts` de forma aditiva — o callback é chamado a partir da versão
 * anterior armazenada no navegador.
 */
export const DB_VERSION = 1;

/** Store que guarda as Vendas (uma entrada por `Sale.id`). */
export const SALES_STORE = 'sales';

/** Store que guarda pares chave/valor de metadados (contador, flags, etc.). */
export const META_STORE = 'meta';

/** Índice sobre `Sale.createdAt`, usado para varreduras ordenadas por tempo. */
export const INDEX_BY_CREATED_AT = 'byCreatedAt';

/**
 * Índice sobre `Sale.deletedAt`.
 *
 * Base para o _soft delete_ (Req 10.3/10.4): permite filtrar registros
 * ativos sem varrer todas as entradas.
 */
export const INDEX_BY_DELETED_AT = 'byDeletedAt';

/** Chave do registro de contador monotônico na store `meta`. */
export const META_KEY_SALE_SEQ = 'saleSeq';

// ============================================================================
// Tipos das entradas persistidas
// ============================================================================

/**
 * Forma do registro guardado na store `meta`.
 *
 * `keyPath: 'key'` — a chave é parte do próprio objeto. Para `saleSeq`,
 * `value` é o último número de sequência gerado (começa em `0` quando
 * ausente; `SalesRepository.getNextSequence` sempre lê, incrementa e escreve
 * dentro da mesma transação).
 */
export interface MetaRecord {
  /** Identificador do metadado (ex.: `"saleSeq"`). */
  key: string;
  /**
   * Valor do metadado. Tipo amplo (`unknown`) para permitir novos
   * metadados no futuro sem migração de schema.
   */
  value: unknown;
}

// ============================================================================
// Schema tipado consumido por `idb`
// ============================================================================

/**
 * Descrição tipada do banco para uso com `openDB<KwanzaProfitDB>` do `idb`.
 *
 * O `idb` usa esta interface para inferir os tipos de valor, chave e
 * índices de cada store. Passar `KwanzaProfitDB` como parâmetro genérico
 * garante que chamadas como `db.get('sales', id)` ou `tx.objectStore('meta')`
 * sejam verificadas em tempo de compilação.
 *
 * Como `createObjectStore` é chamado na fase `versionchange` (ver
 * `./openDb.ts`), manter o nome das chaves sincronizado com as constantes
 * exportadas acima é essencial — qualquer divergência causará um erro em
 * tempo de execução ao abrir o banco numa nova versão.
 */
export interface KwanzaProfitDB extends DBSchema {
  [SALES_STORE]: {
    /** `keyPath: 'id'` — `Sale.id` no formato `TRX-<seq>`. */
    key: string;
    /** Valor serializado pela função `domain/sale.serialize`. */
    value: Sale;
    indexes: {
      /** Ordenação temporal (Req 3.3). */
      [INDEX_BY_CREATED_AT]: number;
      /**
       * Filtro de ativos/deletados (Req 10.3).
       *
       * Indexar um campo `number | null` é permitido pelo IndexedDB: entradas
       * com `deletedAt === null` simplesmente não são incluídas no índice.
       * Tipamos a chave como `number` porque o índice só tem registros
       * numéricos.
       */
      [INDEX_BY_DELETED_AT]: number;
    };
  };
  [META_STORE]: {
    /** `keyPath: 'key'`. */
    key: string;
    value: MetaRecord;
  };
}
