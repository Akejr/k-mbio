/**
 * Arbitrários compartilhados para os testes baseados em propriedades (PBTs).
 *
 * Este módulo reúne os geradores `fast-check` utilizados por todos os arquivos
 * `tests/properties/*.property.test.ts`. A lista de arbitrários e suas
 * configurações seguem **exatamente** a seção "Arbitrários compartilhados"
 * do documento de design (`.kiro/specs/kwanza-profit-pwa/design.md`
 * §Correctness Properties), garantindo que todas as propriedades são
 * exercitadas com o mesmo espaço de entradas descrito na especificação.
 *
 * Contratos gerais:
 *
 * - Todos os arbitrários são **puros** e **determinísticos** em relação à
 *   _seed_ do `fast-check` (ver `tests/setup.ts`).
 * - Os tipos do domínio (`CurrencyCode`, `Sale`, `SaleInput`) são importados
 *   via `import type`, garantindo que este arquivo não introduz dependência
 *   _runtime_ sobre `src/domain/*`.
 * - `arbSaleInputInvalido` intencionalmente produz valores com tipos "errados"
 *   (strings onde números seriam esperados, `null`, etc.) para exercitar o
 *   `validateSaleInput` — os casts para `any` refletem essa intenção.
 *
 * _Requisitos cobertos: 12.1–12.7._
 */

import fc from 'fast-check';
import type { CurrencyCode } from '../../src/domain/currency';
import type { Sale, SaleInput } from '../../src/domain/sale';

/**
 * Nome de cliente não-vazio após `trim()`. Cobre o domínio válido do
 * `customerName` aceito por `validateSaleInput` (Req 1.5) e persistido em
 * `Sale.customerName` (invariante de `Sale`).
 */
export const arbNomeCliente = fc.string({ minLength: 1, maxLength: 120 })
  .filter(s => s.trim().length > 0);

/**
 * Moeda estrangeira suportada pelo sistema (qualquer `CurrencyCode` exceto
 * `AOA`). Corresponde ao tipo `Sale.currency`.
 */
export const arbMoedaEstrangeira: fc.Arbitrary<Exclude<CurrencyCode, 'AOA'>> =
  fc.constantFrom('USD', 'EUR', 'GBP', 'BRL' as const);

/**
 * Qualquer moeda suportada pelo sistema (inclusive `AOA`), usada pelo
 * Formatador_de_Moeda.
 */
export const arbMoeda: fc.Arbitrary<CurrencyCode> =
  fc.constantFrom('AOA', 'USD', 'EUR', 'GBP', 'BRL' as const);

/**
 * Quantidade vendida em moeda estrangeira (`Sale.amount`). Constrange ao
 * domínio válido — estritamente positivo, finito e dentro de uma faixa
 * prática — para que não se confunda com os casos `arbSaleInputInvalido`.
 */
export const arbQuantidade = fc.double({ min: 0.01, max: 1e9, noNaN: true, noDefaultInfinity: true });

/**
 * Lucro em AOA (`Sale.profitAoa`) no cenário padrão de produto
 * (`allowNegativeProfit === false` — Req 1.9). Inteiro não-negativo, coerente
 * com a ausência de casas decimais do Kwanza (Req 8.1).
 */
export const arbLucroAoa = fc.integer({ min: 0, max: 1e12 });

/**
 * Carimbo de tempo em epoch milissegundos, limitado superiormente a ~2100
 * para evitar valores não representáveis em datas reais.
 */
export const arbTimestamp = fc.integer({ min: 1, max: 4_102_444_800_000 }); // até ~2100

/**
 * Timestamp em domínio pequeno (`0..10`) para **forçar colisões** em P6
 * (ordenação com desempate por `id`). Fora desse cenário, prefira
 * `arbTimestamp`.
 */
export const arbTimestampColisoes = fc.integer({ min: 0, max: 10 });        // força empates

/**
 * Sequência numérica usada para montar ids (`TRX-<sequência>`). Faixa larga
 * o suficiente para exercitar zero-padding e múltiplas larguras.
 */
export const arbSequencia = fc.integer({ min: 1, max: 1_000_000 });

/**
 * Venda válida conforme o tipo `Sale`. Gera `id` canonicamente via
 * `TRX-<padStart(4)>`, `currency` estrangeira, `amount` positivo, `profitAoa`
 * não-negativo, `createdAt` epoch e `deletedAt` opcional (`null` por padrão).
 */
export const arbSale: fc.Arbitrary<Sale> = fc.record({
  id: arbSequencia.map(n => `TRX-${String(n).padStart(4, '0')}`),
  customerName: arbNomeCliente,
  currency: arbMoedaEstrangeira,
  amount: arbQuantidade,
  profitAoa: arbLucroAoa,
  createdAt: arbTimestamp,
  deletedAt: fc.option(arbTimestamp, { nil: null }),
});

/**
 * Lista finita de Vendas. O limite superior (`200`) mantém as execuções do
 * PBT ágeis sem comprometer a cobertura de cenários.
 */
export const arbListaVendas: fc.Arbitrary<Sale[]> =
  fc.array(arbSale, { minLength: 0, maxLength: 200 });

/**
 * Payload **válido** para `validateSaleInput` — todos os campos respeitam os
 * invariantes do Req 1. Cobre o ramo `{ ok: true }` de P11.
 */
export const arbSaleInputValido: fc.Arbitrary<SaleInput> = fc.record({
  customerName: arbNomeCliente,
  currency: arbMoedaEstrangeira,
  amount: arbQuantidade,
  profitAoa: arbLucroAoa,
});

/**
 * Payload **inválido** para `validateSaleInput`. Constrói violações
 * sistemáticas de cada um dos quatro campos, cobrindo os Requisitos 1.5–1.9
 * e o ramo `{ ok: false }` de P11.
 *
 * Estratégia: parte de um payload válido (`arbSaleInputValido`) e, em seguida,
 * substitui **exatamente um** campo por um valor fora do domínio:
 *
 * - `customerName` vazio/whitespace (Req 1.5);
 * - `currency` fora de {USD, EUR, GBP, ZAR} (Req 1.6; inclui `null`);
 * - `amount` ≤ 0, `NaN`, `±Infinity` ou string não-numérica (Req 1.7);
 * - `profitAoa` `NaN`, `±Infinity` ou string não-numérica (Req 1.8).
 *
 * Os casts para `any` são intencionais — o gerador precisa produzir valores
 * propositalmente "tipados errado" para exercitar a coerção tolerante de
 * `validateSaleInput`.
 */
export const arbSaleInputInvalido = fc.oneof(
  // customerName vazio/whitespace
  arbSaleInputValido.chain(v => fc.constantFrom('', '   ', '\t\n', '\u00A0').map(s => ({ ...v, customerName: s }))),
  // currency fora do conjunto
  arbSaleInputValido.chain(v => fc.constantFrom('XXX', '', null as any).map(c => ({ ...v, currency: c }))),
  // amount inválido
  arbSaleInputValido.chain(v => fc.constantFrom(0, -1, Number.NaN, Number.POSITIVE_INFINITY, 'abc' as any).map(a => ({ ...v, amount: a }))),
  // profitAoa inválido
  arbSaleInputValido.chain(v => fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, 'xx' as any).map(p => ({ ...v, profitAoa: p }))),
);
