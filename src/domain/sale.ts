/**
 * Entidade **Venda** e validação de entrada do formulário de cadastro.
 *
 * Este módulo é **puro**: sem I/O, sem dependências de storage, sem efeitos
 * colaterais. Cobre os seguintes aspectos do domínio:
 *
 * - O tipo `Sale` — registro imutável de uma transação (Requisitos 1.3, 1.4).
 * - O tipo `SaleInput` — payload do formulário de cadastro antes de
 *   identificação (`id`) e carimbo (`createdAt`/`deletedAt`).
 * - Os tipos `ValidationError` e `AppError` — erros tipados consumidos pela
 *   camada de aplicação e pela UI (Requisitos 1.5–1.9; Design §Tratamento de
 *   Erros).
 * - A função `validateSaleInput` — valida um payload desconhecido (`unknown`)
 *   produzindo ou `{ ok: true, value }` com um `SaleInput` canônico (nome
 *   _trim-ado_, números coeridos), ou `{ ok: false, errors }` com o conjunto
 *   **completo** de erros detectados.
 *
 * A (de)serialização JSON (`serialize`/`deserialize`) será adicionada na
 * Task 4.2 — ver TODO ao final do arquivo.
 */

import type { CurrencyCode } from './currency';
import { isForeignCurrency } from './currency';
import { parseSequencia } from './idGen';
import { CorruptedDataError } from '../infra/db/errors';

/**
 * Registro imutável de uma Venda persistida.
 *
 * Invariantes (verificados por `validateSaleInput` na entrada e, futuramente,
 * por `deserialize` na leitura do storage):
 *
 * - `id` casa `^TRX-\d{4,}$` e é único por `SalesRepository` (Requisito 1.4).
 * - `customerName` tem conteúdo após `trim()` (Requisito 1.5).
 * - `currency` é moeda estrangeira suportada (Requisitos 1.2, 1.6).
 * - `amount` é finito e estritamente positivo (Requisito 1.7).
 * - `profitAoa` é finito; sinal governado por `allowNegativeProfit`
 *   (Requisitos 1.8, 1.9).
 * - `createdAt` é epoch em milissegundos.
 * - `deletedAt` é `null` por padrão; preenchido por _soft delete_
 *   (Requisitos 10.3, 10.4).
 */
export interface Sale {
  /** Identificador de transação no formato `"TRX-<sequência>"`. */
  id: string;
  /** Nome do cliente, já com espaços em branco extremos removidos. */
  customerName: string;
  /** Moeda estrangeira vendida (AOA não é permitido como `currency`). */
  currency: Exclude<CurrencyCode, 'AOA'>;
  /** Quantidade vendida na moeda estrangeira (> 0, finito). */
  amount: number;
  /** Lucro associado à venda, em Kwanzas (AOA). Finito. */
  profitAoa: number;
  /** Carimbo de criação em epoch milissegundos. */
  createdAt: number;
  /** Carimbo de _soft delete_ em epoch ms, ou `null` quando ativa. */
  deletedAt: number | null;
}

/**
 * Payload aceito pelo Registrador_de_Venda antes de o Sistema atribuir
 * identificador e carimbos. Corresponde aos campos editados pelo usuário.
 */
export type SaleInput = Omit<Sale, 'id' | 'createdAt' | 'deletedAt'>;

/**
 * Erro de validação de um campo do formulário. Cada variante é uma tupla
 * (campo, código) totalmente enumerada para permitir tradução e renderização
 * exaustiva sem `default`.
 */
export type ValidationError =
  | { field: 'customerName'; code: 'empty' }
  | { field: 'currency'; code: 'missing' | 'unsupported' }
  | { field: 'amount'; code: 'nonPositive' | 'notFinite' }
  | { field: 'profitAoa'; code: 'notFinite' | 'negativeNotAllowed' };

/**
 * Erro tipado consumido pela camada de aplicação. A UI reage de forma
 * específica a cada variante (ex.: `QuotaExceeded` produz snackbar;
 * `Validation` renderiza mensagens inline).
 *
 * As variantes `QuotaExceeded`, `CorruptedData` e `StorageUnavailable` são
 * emitidas pela camada `infra/*`; `Validation` é emitida por
 * `validateSaleInput`; `Unknown` envolve erros inesperados.
 */
export type AppError =
  | { kind: 'Validation'; errors: ValidationError[] }
  | { kind: 'QuotaExceeded' }
  | { kind: 'CorruptedData'; id?: string; reason: string }
  | { kind: 'StorageUnavailable'; reason: string }
  | { kind: 'Unknown'; cause: unknown };

/**
 * Resultado de `validateSaleInput`: ou o payload canônico, ou a lista
 * completa de erros detectados. Garante exaustividade via união discriminada
 * pelo campo `ok`.
 */
export type ValidateSaleInputResult =
  | { ok: true; value: SaleInput }
  | { ok: false; errors: ValidationError[] };

/**
 * Coage `raw` em um `number` quando possível, retornando `null` quando a
 * conversão não faz sentido.
 *
 * Regras:
 * - `number` passa adiante como está (o chamador verifica finitude).
 * - `string` é aceita se, após `trim()`, for não-vazia e `Number(...)` não
 *   resulta em `NaN`. Assim, `"10.50"` → `10.5`, `"1e3"` → `1000`, `"abc"` →
 *   `null`, `""`/`"   "` → `null`.
 * - Qualquer outro tipo (incluindo `boolean`, `null`, `undefined`, objetos,
 *   arrays) retorna `null`.
 *
 * Observação: `Number("Infinity")` é `Infinity` (finito falso). A função
 * retorna `Infinity`; cabe ao chamador rejeitá-lo via `Number.isFinite`.
 */
function coerceNumber(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const n = Number(trimmed);
    if (Number.isNaN(n)) {
      return null;
    }
    return n;
  }
  return null;
}

/**
 * Conjunto completo de erros emitido quando o próprio `input` não é um
 * objeto (e portanto não há como extrair campo algum). Cada campo é marcado
 * com o código mais conservador possível.
 */
function errosParaInputNaoObjeto(): ValidationError[] {
  return [
    { field: 'customerName', code: 'empty' },
    { field: 'currency', code: 'missing' },
    { field: 'amount', code: 'notFinite' },
    { field: 'profitAoa', code: 'notFinite' },
  ];
}

/**
 * Valida um payload desconhecido contra as regras do Registrador_de_Venda.
 *
 * Cobertura de requisitos:
 * - Req 1.5: `customerName` vazio ou apenas espaços ⇒
 *   `{ field: 'customerName', code: 'empty' }`.
 * - Req 1.6: `currency` ausente ⇒ `'missing'`; presente mas fora do conjunto
 *   `{USD, EUR, GBP, ZAR}` ⇒ `'unsupported'` (inclui `'AOA'`).
 * - Req 1.7: `amount` vazio, não-numérico, `NaN` ou `±Infinity` ⇒
 *   `'notFinite'`; `amount ≤ 0` ⇒ `'nonPositive'`.
 * - Req 1.8: `profitAoa` vazio, não-numérico, `NaN` ou `±Infinity` ⇒
 *   `'notFinite'`.
 * - Req 1.9: `profitAoa < 0` com `cfg.allowNegativeProfit === false` ⇒
 *   `'negativeNotAllowed'`.
 *
 * Contrato:
 * - Coleta **todos** os erros antes de retornar (um único `ok:false` com a
 *   lista agregada); a ordem segue a dos campos: customerName, currency,
 *   amount, profitAoa.
 * - Em caso de sucesso, retorna o `SaleInput` canônico:
 *   - `customerName` _trim-ado_ (sem espaços em branco extremos);
 *   - `amount` e `profitAoa` como `number` (coeridos se recebidos como
 *     strings numéricas).
 * - Se `input` não é um objeto (`null`, primitivo, etc.), retorna o conjunto
 *   completo de erros correspondente a todos os campos faltantes.
 *
 * A função é pura e determinística: dado o mesmo par `(input, cfg)`, produz
 * sempre o mesmo resultado.
 *
 * @param input  Payload vindo do formulário. Tipado como `unknown` porque a
 *               camada de UI manipula valores de `HTMLInputElement` (sempre
 *               strings) e a camada de aplicação pode chamar com objetos já
 *               parcialmente tipados.
 * @param cfg    Configuração de validação. `allowNegativeProfit` espelha a
 *               flag de produto descrita no Req 1.9 (padrão do sistema é
 *               `false`).
 * @returns      `{ ok: true, value }` em sucesso, ou `{ ok: false, errors }`
 *               em falha. Nunca lança.
 *
 * @example
 * validateSaleInput(
 *   { customerName: '  João ', currency: 'USD', amount: '10.50', profitAoa: 2000 },
 *   { allowNegativeProfit: false },
 * );
 * // → { ok: true, value: { customerName: 'João', currency: 'USD', amount: 10.5, profitAoa: 2000 } }
 *
 * @example
 * validateSaleInput(
 *   { customerName: '   ', currency: 'XXX', amount: -1, profitAoa: NaN },
 *   { allowNegativeProfit: false },
 * );
 * // → { ok: false, errors: [
 * //      { field: 'customerName', code: 'empty' },
 * //      { field: 'currency', code: 'unsupported' },
 * //      { field: 'amount', code: 'nonPositive' },
 * //      { field: 'profitAoa', code: 'notFinite' },
 * //    ] }
 */
export function validateSaleInput(
  input: unknown,
  cfg: { allowNegativeProfit: boolean },
): ValidateSaleInputResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: errosParaInputNaoObjeto() };
  }

  const record = input as Record<string, unknown>;
  const rawName = record['customerName'];
  const rawCurrency = record['currency'];
  const rawAmount = record['amount'];
  const rawProfit = record['profitAoa'];

  const errors: ValidationError[] = [];

  // --- customerName ---------------------------------------------------------
  // Req 1.5: bloqueia submissão quando vazio ou apenas espaços em branco.
  let trimmedName = '';
  if (typeof rawName !== 'string') {
    errors.push({ field: 'customerName', code: 'empty' });
  } else {
    trimmedName = rawName.trim();
    if (trimmedName.length === 0) {
      errors.push({ field: 'customerName', code: 'empty' });
    }
  }

  // --- currency -------------------------------------------------------------
  // Req 1.6 + Req 1.2: obrigatório e restrito a {USD, EUR, GBP, ZAR}.
  // `isForeignCurrency` também rejeita `'AOA'`, alinhando com o tipo
  // `Sale.currency = Exclude<CurrencyCode, 'AOA'>`.
  let currency: Exclude<CurrencyCode, 'AOA'> | null = null;
  if (rawCurrency === undefined || rawCurrency === null || rawCurrency === '') {
    errors.push({ field: 'currency', code: 'missing' });
  } else if (!isForeignCurrency(rawCurrency)) {
    errors.push({ field: 'currency', code: 'unsupported' });
  } else {
    currency = rawCurrency;
  }

  // --- amount ---------------------------------------------------------------
  // Req 1.7: vazio/não-numérico/NaN/±Infinity → 'notFinite';
  //          ≤ 0 → 'nonPositive'.
  const amountNum = coerceNumber(rawAmount);
  let amount: number | null = null;
  if (amountNum === null || !Number.isFinite(amountNum)) {
    errors.push({ field: 'amount', code: 'notFinite' });
  } else if (amountNum <= 0) {
    errors.push({ field: 'amount', code: 'nonPositive' });
  } else {
    amount = amountNum;
  }

  // --- profitAoa ------------------------------------------------------------
  // Req 1.8: vazio/não-numérico/NaN/±Infinity → 'notFinite'.
  // Req 1.9: negativo com `allowNegativeProfit === false` → 'negativeNotAllowed'.
  const profitNum = coerceNumber(rawProfit);
  let profitAoa: number | null = null;
  if (profitNum === null || !Number.isFinite(profitNum)) {
    errors.push({ field: 'profitAoa', code: 'notFinite' });
  } else if (!cfg.allowNegativeProfit && profitNum < 0) {
    errors.push({ field: 'profitAoa', code: 'negativeNotAllowed' });
  } else {
    profitAoa = profitNum;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Nesta ponta, as quatro ligações foram preenchidas. As asserções não-nulas
  // são seguras porque só chegamos aqui quando `errors` está vazio — o que
  // implica que todos os ramos de sucesso acima atribuíram seus valores.
  return {
    ok: true,
    value: {
      customerName: trimmedName,
      currency: currency!,
      amount: amount!,
      profitAoa: profitAoa!,
    },
  };
}

// ============================================================================
// Serialização / Desserialização (Task 4.2 · Requisito 5.4 · Propriedade 7)
// ============================================================================

/**
 * Converte uma `Sale` em um objeto **JSON-safe** preservando todos os campos.
 *
 * Como `Sale` já contém apenas primitivos (`string`, `number`, `null`), a
 * serialização é apenas uma **cópia rasa** — sem `structuredClone`, sem
 * `JSON.parse(JSON.stringify(...))`. Isso mantém o módulo puro, determinístico
 * e independente de APIs específicas do ambiente.
 *
 * Contrato:
 *
 * - O objeto retornado tem exatamente as chaves de `Sale` e pode ser passado
 *   diretamente para `IDBObjectStore.put`, `JSON.stringify` ou
 *   `localStorage.setItem` (após `JSON.stringify`).
 * - É um objeto **novo** (não referencia `sale`), portanto mutações externas
 *   não vazam de volta ao domínio.
 *
 * Cobre o **Requisito 5.4** em par com `deserialize`: a sequência
 * `serialize → storage → deserialize` produz um objeto profundamente igual
 * à `Sale` original (Propriedade 7 do design).
 *
 * @param sale Venda válida conforme invariantes de `Sale`.
 * @returns Objeto JSON-safe com os mesmos campos (cópia rasa).
 */
export function serialize(sale: Sale): Record<string, unknown> {
  return {
    id: sale.id,
    customerName: sale.customerName,
    currency: sale.currency,
    amount: sale.amount,
    profitAoa: sale.profitAoa,
    createdAt: sale.createdAt,
    deletedAt: sale.deletedAt,
  };
}

/**
 * Type guard: `value` é um inteiro positivo finito (representa `createdAt` ou
 * `deletedAt` preenchido — nunca zero).
 *
 * Usado internamente por `deserialize` para exigir carimbos monotônicos sem
 * permitir `NaN`, `±Infinity` nem floats parciais que indicariam corrupção.
 */
function isInteiroPositivoFinito(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value) && value > 0;
}

/**
 * Reconstroi uma `Sale` a partir de um valor desconhecido lido do
 * Armazenamento_Local, validando **todos** os invariantes de `Sale`.
 *
 * Contrato:
 *
 * - Em sucesso, retorna uma instância tipada de `Sale`. O objeto retornado
 *   é novo (não aliasa `raw`).
 * - Em qualquer violação de invariante, lança `CorruptedDataError` com um
 *   `reason` descritivo e — quando possível — o `id` extraído de `raw`,
 *   permitindo logging rastreável.
 *
 * Invariantes verificados (alinhados a `Sale` e ao design §Modelo de Dados):
 *
 * - `raw` é objeto não-nulo.
 * - `id` é string que casa `^TRX-\d{4,}$` (via `parseSequencia`).
 * - `customerName` é string não-vazia após `trim()`.
 * - `currency` é moeda estrangeira suportada (`isForeignCurrency`, exclui AOA).
 * - `amount` é finito e estritamente positivo.
 * - `profitAoa` é finito (o sinal é governado pela configuração de produto
 *   no momento da entrada, já aplicada por `validateSaleInput`; aqui apenas
 *   exigimos finitude para preservar o invariante do tipo).
 * - `createdAt` é inteiro positivo finito (epoch ms, `> 0`).
 * - `deletedAt` é `null` ou inteiro positivo finito.
 *
 * Cobre o **Requisito 5.4** (_round-trip_ de persistência — Propriedade 7).
 * Ver também `infra/salesRepository.ts`, onde `getAll` usa `deserialize`
 * para filtrar registros corrompidos sem perder os demais.
 *
 * @param raw Valor lido do storage. Tipado como `unknown` porque o registro
 *   pode ter sido persistido por uma versão anterior do schema ou corrompido
 *   por intervenção externa.
 * @returns `Sale` tipada e validada.
 * @throws {CorruptedDataError} Quando qualquer invariante não é satisfeito.
 */
export function deserialize(raw: unknown): Sale {
  if (typeof raw !== 'object' || raw === null) {
    throw new CorruptedDataError(
      `registro não é um objeto (typeof=${raw === null ? 'null' : typeof raw})`,
    );
  }

  const record = raw as Record<string, unknown>;

  // Tenta extrair o `id` o mais cedo possível para enriquecer mensagens de
  // erro subsequentes. Se a extração falhar, seguimos sem `id` no erro.
  const rawId = record['id'];
  const idExtraido = typeof rawId === 'string' ? rawId : undefined;

  // --- id -------------------------------------------------------------------
  if (typeof rawId !== 'string') {
    throw new CorruptedDataError(
      `campo "id" não é string (typeof=${typeof rawId})`,
      idExtraido,
    );
  }
  if (parseSequencia(rawId) === null) {
    throw new CorruptedDataError(
      `campo "id" não casa o formato TRX-<sequência≥4 dígitos>`,
      rawId,
    );
  }
  const id = rawId;

  // --- customerName --------------------------------------------------------
  const rawName = record['customerName'];
  if (typeof rawName !== 'string') {
    throw new CorruptedDataError(
      `campo "customerName" não é string (typeof=${typeof rawName})`,
      id,
    );
  }
  const customerName = rawName.trim();
  if (customerName.length === 0) {
    throw new CorruptedDataError(
      `campo "customerName" vazio após trim`,
      id,
    );
  }

  // --- currency ------------------------------------------------------------
  const rawCurrency = record['currency'];
  if (!isForeignCurrency(rawCurrency)) {
    throw new CorruptedDataError(
      `campo "currency" não é moeda estrangeira suportada (recebido=${String(rawCurrency)})`,
      id,
    );
  }
  const currency: Exclude<CurrencyCode, 'AOA'> = rawCurrency;

  // --- amount --------------------------------------------------------------
  const rawAmount = record['amount'];
  if (typeof rawAmount !== 'number' || !Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new CorruptedDataError(
      `campo "amount" não é número finito positivo (recebido=${String(rawAmount)})`,
      id,
    );
  }
  const amount = rawAmount;

  // --- profitAoa -----------------------------------------------------------
  const rawProfit = record['profitAoa'];
  if (typeof rawProfit !== 'number' || !Number.isFinite(rawProfit)) {
    throw new CorruptedDataError(
      `campo "profitAoa" não é número finito (recebido=${String(rawProfit)})`,
      id,
    );
  }
  const profitAoa = rawProfit;

  // --- createdAt -----------------------------------------------------------
  const rawCreatedAt = record['createdAt'];
  if (!isInteiroPositivoFinito(rawCreatedAt)) {
    throw new CorruptedDataError(
      `campo "createdAt" não é inteiro positivo finito (recebido=${String(rawCreatedAt)})`,
      id,
    );
  }
  const createdAt = rawCreatedAt;

  // --- deletedAt -----------------------------------------------------------
  const rawDeletedAt = record['deletedAt'];
  let deletedAt: number | null;
  if (rawDeletedAt === null) {
    deletedAt = null;
  } else if (isInteiroPositivoFinito(rawDeletedAt)) {
    deletedAt = rawDeletedAt;
  } else {
    throw new CorruptedDataError(
      `campo "deletedAt" não é null nem inteiro positivo finito (recebido=${String(rawDeletedAt)})`,
      id,
    );
  }

  return {
    id,
    customerName,
    currency,
    amount,
    profitAoa,
    createdAt,
    deletedAt,
  };
}
