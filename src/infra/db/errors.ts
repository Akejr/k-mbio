/**
 * Erros tipados da camada de persistência.
 *
 * Este módulo centraliza as exceções que a camada `infra/*` pode produzir e
 * que são convertidas pela camada de aplicação (`app/actions.ts`) em
 * variantes do `AppError` (`domain/sale.ts` §Tratamento de Erros do design).
 *
 * Mantê-los como **classes** (e não como union de objetos) permite:
 *
 * - Distinguir rapidamente via `instanceof` em `catch` sem perder a pilha.
 * - Aproveitar `Error.cause` e `stack` no log do desenvolvedor.
 * - Propagar pela borda síncrona/assíncrona de forma idiomática.
 *
 * Convenções:
 *
 * - Cada classe define `this.name` explicitamente para que `toString()` e
 *   logs reflitam o subtipo.
 * - Propriedades estruturadas (`id`, `reason`) são `readonly`; nunca são
 *   reatribuídas após a construção.
 * - Com `exactOptionalPropertyTypes: true`, a propriedade opcional `id` só
 *   é atribuída quando o chamador fornece o valor (evita `id: undefined`).
 */

/**
 * Indica que o navegador recusou uma gravação porque o Armazenamento_Local
 * atingiu a cota disponível.
 *
 * Emitido por `SalesRepository.putSale` quando `IDBRequest` ou `IDBTransaction`
 * reportam `DOMException` com `name === 'QuotaExceededError'`. A camada
 * `infra/*` deve **normalizar** o erro nativo para esta classe antes de
 * propagar, de modo que `app/actions.ts` consiga mapear para
 * `AppError { kind: 'QuotaExceeded' }` sem depender da superfície do DOM.
 *
 * Cobre o **Requisito 5.6** ("IF o Armazenamento_Local atinge seu limite de
 * quota durante uma gravação, THEN THE Sistema SHALL exibir mensagem de erro
 * descritiva e NÃO remover Vendas previamente persistidas") — a transação do
 * IndexedDB deve abortar sem efeitos colaterais nas Vendas já persistidas.
 */
export class QuotaExceededError extends Error {
  constructor(message = 'Armazenamento local cheio: cota excedida.') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Indica que um registro lido do Armazenamento_Local não respeita os
 * invariantes da entidade `Sale`.
 *
 * Emitido por `deserialize` em `domain/sale.ts` quando qualquer campo está
 * ausente, tem tipo incorreto ou viola um invariante (ex.: `amount <= 0`,
 * `id` fora do formato `TRX-\d{4,}`, `createdAt` não-inteiro).
 *
 * Quando disponível, o `id` do registro com defeito é propagado junto com
 * o `reason` para permitir logging rastreável e recuperação manual. A
 * política do repositório (`SalesRepository.getAll`) é **excluir da lista
 * em memória** — sem apagar do DB — os registros que lançam esta exceção,
 * preservando os demais (§Tratamento de Erros do design).
 *
 * O design usa esta classe como complemento da variante
 * `AppError { kind: 'CorruptedData', id?, reason }`.
 */
export class CorruptedDataError extends Error {
  /** Identificador do registro corrompido, quando extraído. */
  readonly id?: string;
  /** Descrição estável e sem formatação para consumo por UI/logs. */
  readonly reason: string;

  constructor(reason: string, id?: string) {
    super(id === undefined ? `CorruptedData: ${reason}` : `CorruptedData[${id}]: ${reason}`);
    this.name = 'CorruptedDataError';
    this.reason = reason;
    // `exactOptionalPropertyTypes: true` impede atribuir `undefined` a uma
    // propriedade opcional — por isso o set é condicional.
    if (id !== undefined) {
      this.id = id;
    }
  }
}

/**
 * Indica que nenhum backend de Armazenamento_Local está disponível para a
 * sessão atual (IndexedDB ausente/bloqueado e `localStorage` também
 * inacessível, p.ex.: modo privado restritivo).
 *
 * Emitido pela factory `createSalesRepository` em `infra/db/factory.ts`
 * quando ambos os backends falham ao abrir. A UI mapeia esta variante para
 * uma tela de erro com orientação ao operador — o app fica em estado
 * degradado, mas sem silenciar o problema.
 *
 * Relaciona-se ao **Requisito 5.3** ("WHEN o operador recarrega o app ou o
 * reabre após fechar, THE Sistema SHALL restaurar a lista completa de
 * Vendas previamente persistidas a partir do Armazenamento_Local") — se o
 * storage é inacessível, a restauração não pode ser cumprida e o erro
 * precisa ser explícito ao usuário.
 */
export class StorageUnavailableError extends Error {
  /** Descrição estável e sem formatação para consumo por UI/logs. */
  readonly reason: string;

  constructor(reason: string) {
    super(`StorageUnavailable: ${reason}`);
    this.name = 'StorageUnavailableError';
    this.reason = reason;
  }
}
