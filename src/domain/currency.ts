/**
 * Tipos e metadados de moeda suportados pelo KwanzaProfit.
 *
 * Cobre os Requisitos 1.2 (conjunto de moedas estrangeiras aceitas no formulário
 * de cadastro) e 8.1–8.5 (formatação monetária específica por moeda).
 *
 * Este módulo é puro: sem dependências de I/O, sem efeitos colaterais.
 */

/**
 * Conjunto fechado de moedas suportadas pelo sistema.
 *
 * - `AOA` é a moeda de apuração do Lucro_Total (sempre presente).
 * - `USD`, `EUR`, `GBP`, `ZAR` são as moedas estrangeiras vendidas ao cliente.
 */
export type CurrencyCode = 'AOA' | 'USD' | 'EUR' | 'GBP' | 'ZAR';

/**
 * Metadados de formatação associados a cada moeda suportada.
 *
 * Não carrega lógica de formatação — apenas dados. O `Formatador_de_Moeda`
 * (`domain/formatter.ts`) consome este mapa para produzir strings conforme
 * o Requisito 8.
 */
export interface CurrencyMeta {
  /** Código ISO-like da moeda. */
  code: CurrencyCode;
  /** Símbolo apresentado ao usuário (`"$"`, `"€"`, `"£"`, `"ZAR "`, `"AOA"`). */
  symbol: string;
  /** Onde o símbolo aparece em relação ao número formatado. */
  symbolPosition: 'prefix' | 'suffix';
  /** Casas decimais fracionárias. `AOA = 0`, demais `= 2`. */
  fractionDigits: number;
  /** Separador de milhar. */
  thousandsSep: '.' | ',' | ' ';
  /** Separador decimal. */
  decimalSep: '.' | ',';
}

/**
 * Lista de moedas estrangeiras suportadas, na ordem canônica de exibição.
 *
 * Usada pela UI (select do formulário de cadastro) e por testes para gerar
 * entradas válidas.
 */
export const FOREIGN_CURRENCIES: readonly Exclude<CurrencyCode, 'AOA'>[] = [
  'USD',
  'EUR',
  'GBP',
  'ZAR',
] as const;

/**
 * Todas as moedas suportadas (AOA + estrangeiras).
 */
export const ALL_CURRENCIES: readonly CurrencyCode[] = [
  'AOA',
  ...FOREIGN_CURRENCIES,
] as const;

/**
 * Mapa imutável de moeda → metadados de formatação.
 *
 * Regras por moeda (Requisitos 8.1–8.5):
 *
 * | Moeda | Símbolo | Posição | fractionDigits | Milhar | Decimal |
 * | ----- | ------- | ------- | -------------- | ------ | ------- |
 * | AOA   | "AOA"   | suffix  | 0              | "."    | ","     |
 * | USD   | "$"     | prefix  | 2              | ","    | "."     |
 * | EUR   | "€"     | prefix  | 2              | ","    | "."     |
 * | GBP   | "£"     | prefix  | 2              | ","    | "."     |
 * | ZAR   | "ZAR "  | prefix  | 2              | ","    | "."     |
 *
 * Observação: para ZAR o símbolo inclui o espaço final por contrato; o
 * `Formatador_de_Moeda` concatena símbolo e número diretamente.
 */
export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  AOA: {
    code: 'AOA',
    symbol: 'AOA',
    symbolPosition: 'suffix',
    fractionDigits: 0,
    thousandsSep: '.',
    decimalSep: ',',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    symbolPosition: 'prefix',
    fractionDigits: 2,
    thousandsSep: ',',
    decimalSep: '.',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    symbolPosition: 'prefix',
    fractionDigits: 2,
    thousandsSep: ',',
    decimalSep: '.',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    symbolPosition: 'prefix',
    fractionDigits: 2,
    thousandsSep: ',',
    decimalSep: '.',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'ZAR ',
    symbolPosition: 'prefix',
    fractionDigits: 2,
    thousandsSep: ',',
    decimalSep: '.',
  },
};

/**
 * Type guard: verifica se `c` é um `CurrencyCode` suportado.
 *
 * Útil para validar entradas vindas de formulários, storage ou query params
 * sem confiar em casts.
 */
export function isCurrencyCode(c: unknown): c is CurrencyCode {
  return typeof c === 'string' && Object.prototype.hasOwnProperty.call(CURRENCY_META, c);
}

/**
 * Type guard: verifica se `c` é uma moeda estrangeira (qualquer `CurrencyCode`
 * exceto `AOA`).
 *
 * Conforme design, Vendas só podem ser registradas em moeda estrangeira
 * (Requisito 1.2); o campo `Sale.currency` é tipado como
 * `Exclude<CurrencyCode, 'AOA'>`.
 */
export function isForeignCurrency(c: unknown): c is Exclude<CurrencyCode, 'AOA'> {
  return isCurrencyCode(c) && c !== 'AOA';
}
