/**
 * Cálculo do Lucro_Total em Kwanzas (AOA).
 *
 * Este módulo é **puro**: sem I/O, sem dependências de storage, sem efeitos
 * colaterais. Expõe duas funções complementares:
 *
 * - `calcularLucroTotal(sales)` — dobra total sobre uma lista de Vendas,
 *   usada pela `DashboardView` e pelo `TotalProfitCard`.
 * - `somaIncremental(prev, sale)` — passo atômico da dobra, usado pela
 *   `app/actions.createSale` para atualizar o Lucro_Total no `Store` sem
 *   refolhar toda a lista (útil em Vendas adicionadas uma-a-uma).
 *
 * ## Requisitos cobertos
 *
 * - **Req 2.2** — "THE Sistema SHALL calcular o Lucro_Total como a soma dos
 *   campos de lucro em AOA de todas as Vendas persistidas que não estejam
 *   marcadas como excluídas." Implementado pela soma sobre elementos com
 *   `deletedAt === null`.
 * - **Req 2.3** — "WHEN uma nova Venda é persistida, THE Dashboard SHALL
 *   refletir o novo Lucro_Total na próxima renderização." Suportado por
 *   `somaIncremental`, que permite ao `Store` recalcular o total em O(1) por
 *   inserção.
 * - **Req 2.4** — "WHEN o Histórico_de_Vendas está vazio, THE Dashboard SHALL
 *   exibir o Lucro_Total com valor 0." Satisfeito porque `calcularLucroTotal([])`
 *   retorna `0` (acumulador inicial da dobra).
 * - **Req 12.1** — "FOR ALL listas `V` de Vendas válidas, `calcularLucroTotal(V)`
 *   SHALL ser igual à soma aritmética dos campos de lucro em AOA" (invariante
 *   de soma).
 *
 * ## Propriedades garantidas pela implementação
 *
 * As propriedades abaixo são exercitadas pelos PBTs em
 * `tests/properties/profit.property.test.ts` (Tasks 5.4–5.6). Aqui apenas
 * documentamos como a implementação as satisfaz.
 *
 * ### P1 — Invariante de soma (Req 2.2 / 12.1)
 *
 * `calcularLucroTotal(V)` retorna exatamente `Σ { v.profitAoa | v ∈ V ∧
 * v.deletedAt === null }`. A dobra implementa isto literalmente, sem arredondar
 * nem filtrar por qualquer outro critério.
 *
 * ### P2 — Confluência / invariância à ordem (Req 12.2)
 *
 * A soma aritmética é associativa e comutativa sobre `Number` (modulo erro de
 * ponto flutuante). Como `calcularLucroTotal` só soma os mesmos elementos
 * independentemente da permutação de entrada, o resultado é o mesmo. O
 * `profitAoa` é tipicamente inteiro (Kwanzas sem casas decimais — Req 8.1),
 * caso em que a soma é exata.
 *
 * ### P3 — Incremento metamórfico (Req 12.3 / 2.3)
 *
 * Para toda `V` e Venda `x` com `x.deletedAt === null`:
 *
 * - `calcularLucroTotal([...V, x]) − calcularLucroTotal(V) === x.profitAoa`.
 *
 * Equivalentemente: `somaIncremental(calcularLucroTotal(V), x) ===
 * calcularLucroTotal([...V, x])`. Esta equivalência é o que permite ao `Store`
 * usar `somaIncremental` para atualizar o total sem varrer toda a lista.
 *
 * Para Vendas excluídas (`x.deletedAt !== null`), tanto `calcularLucroTotal`
 * quanto `somaIncremental` preservam o total inalterado.
 */

import type { Sale } from './sale';

/**
 * Retorna o Lucro_Total em AOA para uma lista de Vendas.
 *
 * Soma o campo `profitAoa` de **todos** os elementos cujo `deletedAt` é
 * exatamente `null`. Vendas com `deletedAt` numérico (_soft delete_ — Req 10)
 * são ignoradas, mesmo que permaneçam no array em memória.
 *
 * Contrato:
 *
 * - Pura: dado o mesmo array, retorna sempre o mesmo número.
 * - Não-mutante: recebe `readonly Sale[]` para garantir que a entrada não é
 *   alterada.
 * - `calcularLucroTotal([])` é `0` (Req 2.4).
 *
 * @param sales Lista de Vendas (tipicamente já ordenada e persistida).
 * @returns Lucro_Total em AOA.
 *
 * @example
 * calcularLucroTotal([]); // 0
 * calcularLucroTotal([
 *   { ...v1, profitAoa: 10_000, deletedAt: null },
 *   { ...v2, profitAoa: 30_000, deletedAt: null },
 *   { ...v3, profitAoa: 50_000, deletedAt: 1_700_000_000_000 }, // excluída
 * ]); // 40_000
 */
export function calcularLucroTotal(sales: readonly Sale[]): number {
  let total = 0;
  for (const sale of sales) {
    if (sale.deletedAt === null) {
      total += sale.profitAoa;
    }
  }
  return total;
}

/**
 * Passo incremental da dobra que produz o Lucro_Total.
 *
 * Equivalente (por construção) a: "dado o total anterior `prev` sobre uma
 * lista `V`, qual é o novo total sobre `[...V, sale]`?". Retorna
 * `prev + sale.profitAoa` se a Venda está ativa (`deletedAt === null`),
 * ou `prev` caso contrário.
 *
 * Esta função é o fecho (em `sale`) da relação metamórfica P3 descrita no
 * cabeçalho: permite ao `Store` manter o Lucro_Total atualizado a cada nova
 * Venda em O(1), sem re-varrer a lista completa.
 *
 * Contrato:
 *
 * - Pura: não usa `this`, não lê variáveis externas, não tem efeitos.
 * - Ignora Vendas marcadas como excluídas (`deletedAt !== null`).
 * - Não valida `prev` nem `sale.profitAoa` — o chamador deve garantir que
 *   ambos são finitos (o que é preservado pelo `validateSaleInput`).
 *
 * @param prev Total acumulado antes desta Venda.
 * @param sale Venda a incorporar.
 * @returns Novo total acumulado.
 *
 * @example
 * somaIncremental(40_000, { ...v, profitAoa: 5_000, deletedAt: null });
 * // → 45_000
 *
 * somaIncremental(40_000, { ...v, profitAoa: 5_000, deletedAt: 1_700_000_000_000 });
 * // → 40_000 (Venda excluída, não contribui)
 */
export function somaIncremental(prev: number, sale: Sale): number {
  if (sale.deletedAt === null) {
    return prev + sale.profitAoa;
  }
  return prev;
}
