/**
 * Geração e parse de identificadores de transação (`TRX-<sequência>`).
 *
 * Cobre o Requisito 1.4: "WHEN uma Venda é persistida, THE Sistema SHALL
 * atribuir a ela um identificador único no formato `TRX-<sequência>`".
 *
 * Módulo puro: sem I/O, sem acesso a storage e sem dependências externas. O
 * contador monotônico é responsabilidade do `SalesRepository.getNextSequence`;
 * aqui apenas formatamos o número recebido.
 *
 * Contrato de formatação:
 * - Prefixo literal `"TRX-"`.
 * - Sequência numérica em base 10, com **zero-padding mínimo de 4 dígitos**.
 * - Para `seq ≥ 10000`, o número é escrito sem padding extra (o `padStart(4)`
 *   preserva a largura natural).
 *
 * Exemplos:
 * - `gerarIdTransacao(1)     === "TRX-0001"`
 * - `gerarIdTransacao(42)    === "TRX-0042"`
 * - `gerarIdTransacao(9999)  === "TRX-9999"`
 * - `gerarIdTransacao(10000) === "TRX-10000"`
 *
 * O zero-padding garante que a comparação lexicográfica entre ids coincide
 * com a comparação numérica das sequências **enquanto todas permanecem no
 * mesmo número de dígitos**. Quando o padding cresce (ex.: `"TRX-9999"` →
 * `"TRX-10000"`), a comparação lexicográfica pura deixa de coincidir com a
 * numérica; por isso o desempate em `ordenarVendas` (Requisitos 3.3/3.4) é
 * seguro apenas sob as premissas do design — ver comentário em
 * `domain/ordering.ts`.
 */

/** Prefixo fixo do identificador de transação. */
const PREFIXO = 'TRX-';

/** Largura mínima da sequência em dígitos (zero-padding à esquerda). */
const LARGURA_MINIMA = 4;

/**
 * Regex canônico dos identificadores gerados.
 *
 * - `^TRX-` — prefixo literal obrigatório.
 * - `(\d{4,})` — um ou mais dígitos, com no mínimo 4 (coerente com o padding
 *   mínimo de `gerarIdTransacao`).
 * - `$` — ancoragem ao fim da string (sem sufixo, sem espaços).
 */
const REGEX_ID = /^TRX-(\d{4,})$/;

/**
 * Produz o identificador de transação para uma sequência `seq`.
 *
 * @param seq Inteiro positivo (`> 0`) e finito. Tipicamente vem de
 *   `SalesRepository.getNextSequence()`.
 * @returns String no formato `"TRX-<seq>"` com zero-padding mínimo de 4.
 * @throws {RangeError} Se `seq` não é um inteiro finito ou é `≤ 0`.
 *
 * @example
 * gerarIdTransacao(1);      // "TRX-0001"
 * gerarIdTransacao(9999);   // "TRX-9999"
 * gerarIdTransacao(10000);  // "TRX-10000"
 */
export function gerarIdTransacao(seq: number): string {
  if (!Number.isInteger(seq) || seq <= 0) {
    throw new RangeError(
      `gerarIdTransacao: seq deve ser um inteiro positivo finito; recebido ${String(seq)}`,
    );
  }
  return `${PREFIXO}${String(seq).padStart(LARGURA_MINIMA, '0')}`;
}

/**
 * Extrai a sequência numérica de um identificador de transação.
 *
 * Complementa `gerarIdTransacao` e serve como parser canônico para reconhecer
 * ids persistidos (ex.: varredura de `Sale.id` ao ordenar ou deduplicar) e
 * para testes de round-trip (`parseSequencia(gerarIdTransacao(n)) === n`).
 *
 * Regras:
 * - Só aceita strings que casam exatamente `^TRX-(\d{4,})$`. Espaços extras,
 *   sufixos, prefixos ou menos de 4 dígitos fazem o parser retornar `null`.
 * - Nunca lança: entradas malformadas resultam em `null`, deixando ao
 *   chamador decidir se tratar como corrompido ou ignorar.
 *
 * @param id Candidato a identificador de transação.
 * @returns Inteiro extraído (`> 0`) ou `null` se `id` não casa o formato.
 *
 * @example
 * parseSequencia("TRX-0001");  // 1
 * parseSequencia("TRX-9999");  // 9999
 * parseSequencia("TRX-10000"); // 10000
 * parseSequencia("TRX-1");     // null (menos de 4 dígitos)
 * parseSequencia("trx-0001");  // null (case-sensitive)
 * parseSequencia(" TRX-0001"); // null (espaço à esquerda)
 */
export function parseSequencia(id: string): number | null {
  const match = REGEX_ID.exec(id);
  if (match === null) {
    return null;
  }
  // Grupo 1 garantido pelo regex: sempre ≥ 4 dígitos decimais.
  const digitos = match[1]!;
  return Number.parseInt(digitos, 10);
}
