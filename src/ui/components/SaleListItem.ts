/**
 * `SaleListItem` — linha do Histórico_de_Vendas com visual moderno.
 *
 * ## Redesign moderno
 *
 * - Badge circular com a bandeira/símbolo da moeda à esquerda do conteúdo.
 * - Segundo badge menor (inicial do cliente) quando a bandeira não for
 *   suficiente — não: usamos apenas a bandeira para não poluir.
 * - Valores em duas colunas com labels em _caps_ minúsculos, e a coluna de
 *   lucro tem fundo verde-translúcido quando positivo.
 * - Hover: elevação sutil + glow verde nas bordas.
 * - Animação de entrada escalonada (a view aplica `anim-delay-*`).
 *
 * ## Segurança
 *
 * Tanto `customerName` quanto `id` vêm da entrada do operador e podem
 * conter qualquer unicode. Toda inserção é feita via `textContent` ou
 * `document.createTextNode` (via helper `el`), nunca `innerHTML`.
 *
 * ## Requisitos cobertos
 *
 * - **Req 3.2** — nome, id, valor e lucro visíveis.
 * - **Req 3.6** — valor formatado na moeda.
 * - **Req 3.7** — lucro com "+" para positivos via `signed: true`.
 */

import type { Sale } from '../../domain/sale';
import { formatCurrency } from '../../domain/formatter';
import { CurrencyBadge } from './currencyBadge';
import { el } from './dom';

export function SaleListItem(sale: Sale): HTMLElement {
  const isProfitPositive = sale.profitAoa > 0;

  // --- Badge da moeda ---
  const badge = CurrencyBadge(sale.currency, 40, 'shadow-md');

  // --- Coluna de cliente ---
  const customerName = el(
    'span',
    {
      class:
        'font-body-base text-[15px] text-on-surface font-semibold leading-tight truncate',
    },
    sale.customerName,
  );
  const transactionId = el(
    'span',
    {
      class:
        'font-data-mono text-[11px] text-on-surface-variant/80 leading-none mt-1 tracking-wider',
    },
    sale.id,
  );
  const customerBlock = el(
    'div',
    { class: 'flex flex-col min-w-0' },
    [customerName, transactionId],
  );

  const leftGroup = el(
    'div',
    { class: 'flex items-center gap-sm min-w-0 flex-1' },
    [badge, customerBlock],
  );

  // --- Valor vendido ---
  const amountText = el(
    'span',
    {
      class:
        'font-data-mono text-[14px] text-on-surface font-bold tracking-tight',
    },
    formatCurrency(sale.amount, sale.currency),
  );
  const amountLabel = el(
    'span',
    {
      class:
        'font-label-caps text-[10px] text-on-surface-variant uppercase tracking-[0.12em] leading-none mt-1',
    },
    'Valor',
  );
  const amountCol = el(
    'div',
    { class: 'flex flex-col items-end text-right' },
    [amountText, amountLabel],
  );

  // --- Lucro com pill verde translúcida ---
  const profitText = el(
    'span',
    {
      class:
        'font-data-mono text-[14px] font-bold tracking-tight ' +
        (isProfitPositive ? 'text-primary' : 'text-on-surface'),
    },
    formatCurrency(sale.profitAoa, 'AOA', { signed: true }),
  );
  const profitLabel = el(
    'span',
    {
      class:
        'font-label-caps text-[10px] text-on-surface-variant uppercase tracking-[0.12em] leading-none mt-1',
    },
    'Lucro',
  );
  const profitCol = el(
    'div',
    {
      class:
        'flex flex-col items-end text-right pl-sm border-l ' +
        (isProfitPositive ? 'border-primary/30' : 'border-outline-variant'),
    },
    [profitText, profitLabel],
  );

  const rightGroup = el(
    'div',
    { class: 'flex items-center gap-md flex-shrink-0' },
    [amountCol, profitCol],
  );

  return el(
    'div',
    {
      class:
        'group relative overflow-hidden rounded-2xl p-md press-scale ' +
        'bg-surface-container/80 backdrop-blur-md ' +
        'border border-outline-variant/50 ' +
        'flex items-center justify-between gap-md ' +
        'shadow-[0_4px_16px_rgba(0,0,0,0.25)] ' +
        'hover:border-primary/40 hover:bg-surface-container-high/70 ' +
        'animate-slide-up',
      role: 'listitem',
    },
    [leftGroup, rightGroup],
  );
}
