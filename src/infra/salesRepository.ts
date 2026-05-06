/**
 * Interface e implementação **IndexedDB** do `SalesRepository`.
 *
 * Esta camada é o único caminho de leitura/escrita para Vendas; todos os
 * erros específicos do DOM (`DOMException`) são normalizados em exceções
 * tipadas de `./db/errors.ts` para que a camada de aplicação e a UI não
 * dependam da superfície do IndexedDB.
 *
 * ## Requisitos cobertos
 *
 * - **Req 1.4** — identificador `TRX-<seq>`: `getNextSequence` incrementa o
 *   contador monotônico `saleSeq` em `meta` dentro de uma única transação
 *   `readwrite`, garantindo unicidade.
 * - **Req 5.1** — persistência local no Armazenamento_Local.
 * - **Req 5.3** — restauração ao recarregar: `getAll` devolve todos os
 *   registros persistidos (incluindo _soft-deleted_; cabe à camada de
 *   aplicação filtrar).
 * - **Req 5.4** — _round-trip_ de persistência: `putSale` grava o objeto
 *   produzido por `domain/sale.serialize`; `getAll` passa cada registro por
 *   `domain/sale.deserialize`, descartando entradas corrompidas (sem
 *   apagá-las do storage).
 * - **Req 5.5** — idempotência por `id`: `putSale` usa `IDBObjectStore.put`,
 *   que substitui o registro de mesma chave (`keyPath: 'id'`).
 * - **Req 5.6** — quota excedida: `DOMException.name === 'QuotaExceededError'`
 *   é convertido para `QuotaExceededError`; a transação aborta sem efeitos
 *   colaterais nas Vendas previamente persistidas.
 *
 * ## Relação com o design
 *
 * Este módulo corresponde ao bloco `Repo → DB (IndexedDB via idb)` do
 * diagrama de camadas. A interface `SalesRepository` é propositalmente
 * pequena — a camada de aplicação (`app/actions.ts`) compõe `putSale`,
 * `getNextSequence`, `getAll` e `softDelete` para implementar as ações
 * `createSale`, `loadAllSales` e `deleteSale`.
 */

import type { IDBPDatabase } from 'idb';

import { deserialize, serialize, type Sale } from '../domain/sale';
import {
  META_KEY_SALE_SEQ,
  META_STORE,
  SALES_STORE,
  type KwanzaProfitDB,
} from './db/schema';
import { CorruptedDataError, QuotaExceededError } from './db/errors';

// ============================================================================
// Interface pública
// ============================================================================

/**
 * Contrato do repositório de Vendas.
 *
 * Todas as operações são assíncronas para acomodar backends baseados em
 * IndexedDB (esta implementação) e backends potencialmente remotos em
 * versões futuras. A implementação atual (IndexedDB) e o fallback
 * (`localStorageAdapter`) implementam exatamente esta interface.
 */
export interface SalesRepository {
  /**
   * Persiste ou substitui uma Venda pelo seu `id`.
   *
   * Idempotente (Req 5.5): chamar `putSale(s)` várias vezes com a mesma
   * `s` resulta em exatamente uma entrada com `id === s.id`.
   *
   * @throws {QuotaExceededError} Quando o navegador recusa a gravação por
   *   limite de cota (Req 5.6). As Vendas previamente persistidas
   *   permanecem intactas porque a transação do IndexedDB aborta.
   */
  putSale(sale: Sale): Promise<void>;

  /**
   * Retorna todas as Vendas persistidas, **incluindo** as _soft-deleted_
   * (`deletedAt !== null`).
   *
   * É responsabilidade da camada de aplicação filtrar `deletedAt === null`
   * antes de exibir ou somar (Req 2.2). Devolver tudo aqui permite:
   *
   * - visualizar Vendas excluídas em telas administrativas futuras;
   * - manter o repo livre de regras de negócio.
   *
   * Registros que falham em `deserialize` são **excluídos do retorno** e
   * logados via `console.warn`; não são apagados do banco, permitindo
   * recuperação manual (§Tratamento de Erros do design).
   */
  getAll(): Promise<Sale[]>;

  /**
   * Retorna o próximo número de sequência para uso em `gerarIdTransacao`.
   *
   * Incrementa o contador `saleSeq` na store `meta` dentro de uma única
   * transação `readwrite`, garantindo atomicidade e monotonicidade mesmo
   * sob chamadas concorrentes a partir de abas diferentes.
   *
   * @throws {QuotaExceededError} Quando o navegador recusa a gravação do
   *   contador por limite de cota (Req 5.6).
   */
  getNextSequence(): Promise<number>;

  /**
   * Marca uma Venda como excluída (`deletedAt = Date.now()`).
   *
   * Se o `id` não existir no banco, a operação é um no-op. Preserva o
   * registro fisicamente; apenas o campo `deletedAt` é atualizado. Base
   * para o Req 10.3/10.4.
   */
  softDelete(id: string): Promise<void>;
}

// ============================================================================
// Implementação IndexedDB
// ============================================================================

/**
 * Cria uma implementação de `SalesRepository` sobre um banco IndexedDB já
 * aberto.
 *
 * A separação entre abertura (em `./db/openDb.ts`) e uso (aqui) mantém esta
 * factory trivialmente testável: basta abrir um `fake-indexeddb` nos testes
 * e passar o handle.
 *
 * @param db Handle tipado do banco (ver `openKwanzaProfitDb`).
 * @returns Instância de `SalesRepository` pronta para uso.
 */
export function createIndexedDbSalesRepository(
  db: IDBPDatabase<KwanzaProfitDB>,
): SalesRepository {
  return {
    async putSale(sale) {
      try {
        const tx = db.transaction(SALES_STORE, 'readwrite');
        // `serialize` devolve um objeto JSON-safe com o mesmo shape de `Sale`.
        // Cast é seguro porque o schema tipa `value: Sale` e `serialize`
        // preserva todas as chaves obrigatórias.
        await tx.store.put(serialize(sale) as unknown as Sale);
        await tx.done;
      } catch (cause) {
        if (isQuotaExceeded(cause)) {
          throw new QuotaExceededError();
        }
        throw cause;
      }
    },

    async getAll() {
      const raws = await db.getAll(SALES_STORE);
      const result: Sale[] = [];
      for (const raw of raws) {
        try {
          result.push(deserialize(raw));
        } catch (cause) {
          if (cause instanceof CorruptedDataError) {
            // Política: loga e exclui da lista em memória; **não** apaga do
            // banco — cabe ao operador/DX decidir recuperar o registro.
            // eslint-disable-next-line no-console
            console.warn(
              `[SalesRepository] registro corrompido descartado${
                cause.id !== undefined ? ` (id=${cause.id})` : ''
              }: ${cause.reason}`,
            );
            continue;
          }
          // Erros não-esperados de `deserialize` são re-lançados.
          throw cause;
        }
      }
      return result;
    },

    async getNextSequence() {
      try {
        const tx = db.transaction(META_STORE, 'readwrite');
        const existing = await tx.store.get(META_KEY_SALE_SEQ);
        // Se ainda não existe, começa em 0; o próximo valor gerado é 1.
        const current =
          existing !== undefined && typeof existing.value === 'number'
            ? existing.value
            : 0;
        const next = current + 1;
        await tx.store.put({ key: META_KEY_SALE_SEQ, value: next });
        await tx.done;
        return next;
      } catch (cause) {
        if (isQuotaExceeded(cause)) {
          throw new QuotaExceededError();
        }
        throw cause;
      }
    },

    async softDelete(id) {
      try {
        const tx = db.transaction(SALES_STORE, 'readwrite');
        const existing = await tx.store.get(id);
        if (existing === undefined) {
          // No-op: `id` inexistente. Ainda assim aguardamos `tx.done` para
          // não deixar a transação aberta.
          await tx.done;
          return;
        }
        const updated: Sale = { ...existing, deletedAt: Date.now() };
        await tx.store.put(serialize(updated) as unknown as Sale);
        await tx.done;
      } catch (cause) {
        if (isQuotaExceeded(cause)) {
          throw new QuotaExceededError();
        }
        throw cause;
      }
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Detecta `DOMException` com `name === 'QuotaExceededError'`.
 *
 * `DOMException` não está tipado em todos os ambientes (ex.: Node sem DOM);
 * por isso testamos de forma estrutural e com defesa contra _cross-realm_
 * (ambiente onde `instanceof DOMException` poderia falhar).
 */
function isQuotaExceeded(cause: unknown): boolean {
  if (typeof cause !== 'object' || cause === null) {
    return false;
  }
  const name = (cause as { name?: unknown }).name;
  return name === 'QuotaExceededError';
}
