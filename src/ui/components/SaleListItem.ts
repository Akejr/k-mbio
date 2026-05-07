/**
 * `SaleListItem` — linha do Histórico_de_Vendas em duas faixas.
 *
 * ## Layout
 *
 * ```
 * ┌──────────────────────────────────────────────────────────┐
 * │ [flag]  Nome completo do cliente          R$ 20.000,00   │
 * │         TRX-0008                         +230.000 AOA    │
 * └──────────────────────────────────────────────────────────┘
 * ```
 *
 * - **Linha 1:** bandeira + nome do cliente (pode quebrar em duas linhas se
 *   muito longo) + valor vendido à direita.
 * - **Linha 2:** ID da transação + lucro à direita.
 *
 * Ganhos em relação ao layout anterior:
 *
 * - Nome **completo** sempre visível: usa `break-words` + `leading-snug`
 *   para quebrar em palavra. Ocupa largura máxima porque valores numéricos
 *   ficam num nível abaixo.
 * - Densidade de informação equivalente (mesmo número de linhas em média),
 *   mas mais respirável.
 * - Alinhamento perfeito entre valor/lucro (mesmo lado direito, mesmo peso
 *   tipográfico) para leitura vertical rápida.
 *
 * ## Segurança
 *
 * Todas as inserções de texto usam `textContent` (via `el`), nunca
 * `innerHTML`. Caracteres `<`, `>`, `&` não são interpretados.
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

/**
 * Formata um timestamp `createdAt` em `dd/mm/yyyy · hh:mm` usando o locale
 * `pt-BR` (coerente com o resto da UI, que é em português).
 *
 * Escolhi data + hora porque, em um mesmo dia, um operador pode cadastrar
 * várias vendas — só a data não diferencia o suficiente. O separador `·`
 * (interponto) mantém a legibilidade sem poluir com barras/vírgulas.
 */
function formatSaleDate(timestampMs: number): string {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} · ${hh}:${min}`;
}

export function SaleListItem(sale: Sale): HTMLElement {
  const isProfitPositive = sale.profitAoa > 0;

  // Badge da moeda — tamanho 40, alinhado à faixa superior.
  const badge = CurrencyBadge(sale.currency, 40, 'shadow-md');

  // --- Linha 1: nome + valor vendido ---
  const customerName = el(
    'span',
    {
      class:
        'flex-1 min-w-0 font-body-base text-[15px] text-on-surface font-semibold leading-snug break-words',
    },
    sale.customerName,
  );
  const amountText = el(
    'span',
    {
      class:
        'flex-shrink-0 font-data-mono text-[15px] text-on-surface font-bold tracking-tight whitespace-nowrap',
    },
    formatCurrency(sale.amount, sale.currency),
  );
  const topRow = el(
    'div',
    { class: 'flex items-start justify-between gap-sm' },
    [customerName, amountText],
  );

  // --- Linha 2: data de criação + lucro ---
  const transactionDate = el(
    'span',
    {
      class:
        'font-data-mono text-[11px] text-on-surface-variant/80 tracking-wide whitespace-nowrap',
    },
    formatSaleDate(sale.createdAt),
  );
  const profitText = el(
    'span',
    {
      class:
        'privacy-target flex-shrink-0 font-data-mono text-[14px] font-bold tracking-tight whitespace-nowrap ' +
        (isProfitPositive ? 'text-primary' : 'text-on-surface'),
    },
    formatCurrency(sale.profitAoa, 'AOA', { signed: true }),
  );
  const bottomRow = el(
    'div',
    { class: 'flex items-center justify-between gap-sm mt-1' },
    [transactionDate, profitText],
  );

  // Coluna direita com as duas linhas empilhadas.
  const contentColumn = el(
    'div',
    { class: 'flex-1 min-w-0 flex flex-col' },
    [topRow, bottomRow],
  );

  return el(
    'div',
    {
      class:
        'group relative overflow-hidden rounded-2xl p-md press-scale ' +
        'bg-surface-container/80 backdrop-blur-md ' +
        'border border-outline-variant/50 ' +
        'flex items-start gap-sm ' +
        'shadow-[0_4px_16px_rgba(0,0,0,0.25)] ' +
        'hover:border-primary/40 hover:bg-surface-container-high/70 ' +
        'animate-slide-up',
      role: 'listitem',
    },
    [badge, contentColumn],
  );
}
