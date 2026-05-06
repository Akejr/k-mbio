/**
 * Adaptador `SalesRepository` sobre `window.localStorage` — **fallback**
 * usado quando o IndexedDB está indisponível (modo privado restritivo,
 * navegadores antigos, WebView sem suporte).
 *
 * Mantém **a mesma interface** do repositório principal
 * (`./salesRepository.ts`) e as mesmas garantias observáveis pela camada
 * de aplicação: idempotência por `id`, tolerância a registros corrompidos
 * e conversão de `QuotaExceededError` nativo para a exceção tipada.
 *
 * ## Requisitos cobertos
 *
 * - **Req 5.1** — persistência local: todas as Vendas são serializadas como
 *   JSON e guardadas na chave `kwanza-profit:sales:v1`.
 * - **Req 5.3** — restauração após recarregar/reabrir: `getAll` lê a chave
 *   e reconstrói a lista com `deserialize`.
 *
 * ## Particularidades do `localStorage`
 *
 * - É **síncrono** e limitado (~5 MB em Chromium). Para volumes grandes, o
 *   IndexedDB (repositório principal) é preferido; este adaptador só entra
 *   em cena quando o IndexedDB é inoperante.
 * - O JS é _single-threaded_ no escopo desta aba: `getItem` seguido de
 *   `setItem` forma, na prática, uma operação atômica ler-modificar-escrever.
 *   Outras abas, contudo, compartilham o storage — conflitos entre abas
 *   fogem do escopo deste MVP (§Itens em aberto do design).
 * - `setItem` lança `DOMException` com `name === 'QuotaExceededError'` em
 *   overflow de cota (assim como o IndexedDB); normalizamos para
 *   `QuotaExceededError`.
 * - `JSON.parse` pode falhar se o conteúdo da chave for corrompido
 *   externamente; tratamos como "storage vazio" para manter o app
 *   navegável (loga via `console.warn`).
 */

import { deserialize, serialize, type Sale } from '../domain/sale';
import { CorruptedDataError, QuotaExceededError } from './db/errors';
import type { SalesRepository } from './salesRepository';

// ============================================================================
// Chaves — versionadas para permitir migrações futuras sem reset destrutivo
// ============================================================================

/** Chave do `localStorage` que guarda o array JSON de Vendas. */
const LS_KEY_SALES = 'kwanza-profit:sales:v1';

/** Chave do `localStorage` que guarda o contador `saleSeq` como string. */
const LS_KEY_SEQ = 'kwanza-profit:seq:v1';

// ============================================================================
// Factory
// ============================================================================

/**
 * Cria uma instância de `SalesRepository` que persiste em
 * `window.localStorage`.
 *
 * Pré-condição: `typeof localStorage !== 'undefined'`. A verificação é
 * responsabilidade da factory principal (`./db/factory.ts`).
 *
 * @returns Implementação _fallback_ de `SalesRepository`.
 */
export function createLocalStorageSalesRepository(): SalesRepository {
  return {
    async putSale(sale) {
      const list = readSales();
      // Idempotência por `id` (Req 5.5): remove entrada anterior com mesmo id.
      const withoutOld = list.filter((s) => s.id !== sale.id);
      withoutOld.push(serialize(sale));
      writeSales(withoutOld);
    },

    async getAll() {
      const raws = readSales();
      const result: Sale[] = [];
      for (const raw of raws) {
        try {
          result.push(deserialize(raw));
        } catch (cause) {
          if (cause instanceof CorruptedDataError) {
            // eslint-disable-next-line no-console
            console.warn(
              `[localStorageAdapter] registro corrompido descartado${
                cause.id !== undefined ? ` (id=${cause.id})` : ''
              }: ${cause.reason}`,
            );
            continue;
          }
          throw cause;
        }
      }
      return result;
    },

    async getNextSequence() {
      const current = readSequence();
      const next = current + 1;
      writeSequence(next);
      return next;
    },

    async softDelete(id) {
      const list = readSales();
      let changed = false;
      const updated = list.map((raw) => {
        if (raw['id'] === id && raw['deletedAt'] == null) {
          changed = true;
          return { ...raw, deletedAt: Date.now() };
        }
        return raw;
      });
      if (!changed) {
        return; // No-op: id inexistente ou já excluído.
      }
      writeSales(updated);
    },
  };
}

// ============================================================================
// Helpers de baixo nível — isolam o acesso cru ao `localStorage`
// ============================================================================

/**
 * Tipo cru dos registros guardados no array JSON. `deserialize` validará
 * cada campo ao sair.
 */
type RawSale = Record<string, unknown>;

/**
 * Lê e faz parse do array de Vendas cru. Em caso de corrupção do JSON da
 * chave (conteúdo editado externamente, truncamento), retorna `[]` e loga —
 * o app continua navegável, mas aquela sessão "esquece" o conteúdo anterior.
 */
function readSales(): RawSale[] {
  const raw = localStorage.getItem(LS_KEY_SALES);
  if (raw === null) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[localStorageAdapter] conteúdo da chave "${LS_KEY_SALES}" não é array; tratando como vazio`,
      );
      return [];
    }
    // Filtra entradas que não são objetos planos (corrupção parcial) para
    // não quebrar o `deserialize` com tipos absurdos (arrays aninhados, etc.).
    return parsed.filter(
      (item): item is RawSale =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  } catch (cause) {
    // eslint-disable-next-line no-console
    console.warn(
      `[localStorageAdapter] JSON inválido em "${LS_KEY_SALES}"; tratando como vazio (${String(cause)})`,
    );
    return [];
  }
}

/**
 * Serializa e escreve o array de Vendas. Normaliza `DOMException` de quota
 * para `QuotaExceededError` (Req 5.6).
 *
 * Observação: as Vendas previamente persistidas permanecem intactas porque
 * o `setItem` ou **substitui atomicamente** a chave inteira ou **falha sem
 * alterar** o valor anterior — não existe estado intermediário no
 * `localStorage` para uma única chamada de `setItem`.
 */
function writeSales(list: readonly RawSale[]): void {
  try {
    localStorage.setItem(LS_KEY_SALES, JSON.stringify(list));
  } catch (cause) {
    if (isQuotaExceeded(cause)) {
      throw new QuotaExceededError();
    }
    throw cause;
  }
}

/**
 * Lê o contador `saleSeq`. Ausente ou inválido → `0` (próximo gerado será
 * `1`, coerente com a política do repositório IndexedDB).
 */
function readSequence(): number {
  const raw = localStorage.getItem(LS_KEY_SEQ);
  if (raw === null) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[localStorageAdapter] contador "${LS_KEY_SEQ}" inválido ("${raw}"); reiniciando em 0`,
    );
    return 0;
  }
  return parsed;
}

/**
 * Escreve o contador `saleSeq`. Normaliza quota excedida.
 */
function writeSequence(next: number): void {
  try {
    localStorage.setItem(LS_KEY_SEQ, String(next));
  } catch (cause) {
    if (isQuotaExceeded(cause)) {
      throw new QuotaExceededError();
    }
    throw cause;
  }
}

/**
 * Detecta `DOMException` com `name === 'QuotaExceededError'` — mesma
 * heurística usada em `salesRepository.ts` para uniformizar o contrato
 * entre os dois backends.
 */
function isQuotaExceeded(cause: unknown): boolean {
  if (typeof cause !== 'object' || cause === null) {
    return false;
  }
  const name = (cause as { name?: unknown }).name;
  return name === 'QuotaExceededError';
}
