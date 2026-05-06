/**
 * Ordenação do Histórico_de_Vendas para exibição no Dashboard e na HistoryView.
 *
 * Este módulo é **puro**: sem I/O, sem dependências de storage e sem efeitos
 * colaterais. Expõe uma única função, `ordenarVendas`, que produz uma **cópia**
 * da lista recebida já ordenada segundo as regras dos Requisitos 3.3 e 3.4.
 *
 * ## Regras de ordenação
 *
 * 1. **Primário — Req 3.3**: `createdAt` em ordem **decrescente** (mais recente
 *    primeiro).
 * 2. **Desempate — Req 3.4**: quando dois registros possuem o mesmo `createdAt`,
 *    ordena-se por `id` em ordem **decrescente** (id maior primeiro).
 *
 * A comparação de `id` é **lexicográfica** (operadores `<`/`>` de string).
 * Para o conjunto de ids gerados por `gerarIdTransacao` — prefixo fixo `TRX-`
 * seguido de sequência numérica com **zero-padding mínimo de 4 dígitos** — a
 * ordem lexicográfica coincide com a ordem numérica **enquanto todos os ids
 * comparados tiverem o mesmo número de dígitos na sequência**. Isso é
 * verdadeiro em três faixas estáveis (1–9999, 10000–99999, …) e por
 * construção do gerador ids criados em sequência mantêm a mesma largura até
 * que a sequência "transborde" a próxima potência de 10.
 *
 * Na transição de largura (ex.: de `TRX-9999` para `TRX-10000`), a ordem
 * lexicográfica diverge da numérica (`'TRX-10000' < 'TRX-9999'` em
 * lexicográfico, mas `10000 > 9999` em numérico). Como a ordenação só é
 * aplicada em caso de empate de `createdAt`, e o `createdAt` é carimbado com
 * o relógio do dispositivo (monotônico em escala humana), esse cenário
 * limite só ocorre quando duas Vendas são criadas no **mesmo milissegundo**
 * exatamente na transição de largura — situação que, segundo o design, é
 * aceitável e determinística (mesma entrada → mesma ordem).
 *
 * ## Requisitos cobertos
 *
 * - **Req 3.3** — ordenação por `createdAt` decrescente.
 * - **Req 3.4** — desempate por `id` decrescente.
 * - **Req 12.4** — idempotência da ordenação (`P4`).
 * - **Req 12.5** — preservação do multiset (`P5`).
 *
 * ## Propriedades garantidas pela implementação
 *
 * As propriedades abaixo são exercitadas pelos PBTs em
 * `tests/properties/ordering.property.test.ts` (Tasks 5.7–5.9). Aqui
 * documentamos como a implementação as satisfaz.
 *
 * ### P4 — Idempotência (Req 12.4)
 *
 * `ordenarVendas(ordenarVendas(V))` é profundamente igual a `ordenarVendas(V)`.
 *
 * Justificativa: a função de comparação define uma **ordem total estrita** sobre
 * `Sale` (via `createdAt` desc + `id` desc, com `id` único em cada store).
 * `Array.prototype.sort` é estável em todas as _runtimes_ ES2019+, e como a
 * lista já está ordenada na segunda chamada, nenhum elemento é reposicionado
 * — o resultado é estruturalmente idêntico.
 *
 * ### P5 — Preservação do multiset (Req 12.5)
 *
 * O multiset de `ordenarVendas(V)` é igual ao de `V`.
 *
 * Justificativa: `ordenarVendas` chama `sales.slice().sort(cmp)`. `.slice()`
 * cria uma cópia rasa com **exatamente** os mesmos elementos, e `.sort()`
 * apenas reorganiza as referências do array — nunca adiciona, remove ou
 * substitui elementos. Portanto, para qualquer função `count(x, arr)`,
 * `count(x, ordenarVendas(V)) === count(x, V)`.
 *
 * ### Não-mutação da entrada
 *
 * `ordenarVendas` recebe `readonly Sale[]` e retorna uma cópia (`.slice()`).
 * A lista original passada pelo chamador é preservada intacta — invariante
 * crítico para o `Store` reativo, que compara arrays por referência.
 */

import type { Sale } from './sale';

/**
 * Retorna uma **nova** lista contendo os mesmos elementos de `sales`, ordenada
 * por `createdAt` decrescente, com desempate por `id` decrescente.
 *
 * Contrato:
 *
 * - Pura: dado o mesmo array (por valor), retorna sempre um array com os
 *   mesmos elementos na mesma ordem.
 * - Não-mutante: o array de entrada não é alterado.
 * - Idempotente: `ordenarVendas(ordenarVendas(V))` produz uma lista igual a
 *   `ordenarVendas(V)` (P4).
 * - Preserva o multiset: elementos não são adicionados, removidos ou
 *   substituídos (P5).
 *
 * @param sales Lista de Vendas (tipicamente vinda do `SalesRepository.getAll`).
 * @returns Cópia ordenada — mais recente primeiro; em empate de `createdAt`,
 *   id lexicograficamente maior primeiro.
 *
 * @example
 * ordenarVendas([
 *   { ...v1, id: 'TRX-0001', createdAt: 100 },
 *   { ...v2, id: 'TRX-0003', createdAt: 200 },
 *   { ...v3, id: 'TRX-0002', createdAt: 200 },
 * ]);
 * // → [
 * //     { ...v2, id: 'TRX-0003', createdAt: 200 },  // createdAt maior
 * //     { ...v3, id: 'TRX-0002', createdAt: 200 },  // empate: id maior primeiro
 * //     { ...v1, id: 'TRX-0001', createdAt: 100 },
 * //   ]
 */
export function ordenarVendas(sales: readonly Sale[]): Sale[] {
  return sales.slice().sort((a, b) => {
    // Primário: createdAt desc.
    if (a.createdAt !== b.createdAt) {
      return b.createdAt - a.createdAt;
    }
    // Desempate: id desc (lexicográfico — ver nota no cabeçalho do módulo).
    if (a.id < b.id) {
      return 1;
    }
    if (a.id > b.id) {
      return -1;
    }
    return 0;
  });
}
