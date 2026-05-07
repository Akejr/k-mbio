/**
 * `TotalProfitCard` — card hero do Dashboard exibindo o Lucro_Total em AOA.
 *
 * ## Redesign limpo
 *
 * - **Fundo coeso:** camada base em `bg-surface-container` arredondada em
 *   `rounded-3xl`, seguida de um gradiente interno em `absolute inset-0`
 *   com o mesmo radius. Isso elimina o "sangramento" de cantos quadrados
 *   que apareciam quando o gradiente era aplicado como `bg-gradient-*` no
 *   próprio elemento root sem `overflow-hidden` eficaz.
 * - **Composição isolada:** `isolate` + `overflow-hidden` garantem que
 *   blobs, shimmer e conteúdo não vazem fora do radius — nem mesmo em
 *   navegadores que lidam mal com `backdrop-blur` + clipping.
 * - **Sem contagem de vendas:** removido o chip "N vendas"; o foco agora
 *   é só o número + variação opcional.
 * - **Tipografia maior e mais respirável:** headline em peso 700, número
 *   em 800 com tracking negativo. Sufixo "AOA" em pill separada para não
 *   competir com o número.
 * - **Borda sutil em gradiente:** uma camada extra de `mask` desenha uma
 *   borda interna esmeralda→transparente, típica de dashboards premium.
 *
 * ## Requisitos cobertos
 *
 * - **Req 2.1, 2.3, 2.4, 2.5** — exibição reativa do Lucro_Total em AOA.
 * - **Req 9.1, 9.5** — glassmorphism + gradiente + dark mode.
 */

import { formatCurrency } from '../../domain/formatter';
import { el, icon } from './dom';

export interface TotalProfitCardProps {
  /** Lucro total em AOA. */
  total: number;
  /** Valor anterior — usado para animar a transição do contador. */
  previousTotal?: number;
  /** Variação percentual opcional (Req 2.6). */
  variation?: { pct: number; label?: string };
}

function formatVariation(pct: number): string {
  if (!Number.isFinite(pct)) return '';
  const abs = Math.abs(pct).toFixed(1);
  if (pct > 0) return `+${abs}%`;
  if (pct < 0) return `-${abs}%`;
  return `${abs}%`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateCounter(
  from: number,
  to: number,
  durationMs: number,
  onUpdate: (value: number) => void,
): void {
  if (prefersReducedMotion() || from === to) {
    onUpdate(to);
    return;
  }
  const start = performance.now();
  const delta = to - from;
  const step = (now: number): void => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    onUpdate(from + delta * eased);
    if (t < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

export function TotalProfitCard(props: TotalProfitCardProps): HTMLElement {
  // --- Camada de fundo: gradiente diagonal dentro do card ---
  const bg = el('div', {
    class:
      'pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-[#0b1f17] via-[#0e2a20] to-[#052a1d]',
    'aria-hidden': 'true',
  });

  // --- Blobs decorativos (respeitam o radius porque o parent faz overflow-hidden) ---
  const blobA = el('div', {
    class:
      'pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/25 blur-3xl animate-float',
    'aria-hidden': 'true',
  });
  const blobB = el('div', {
    class:
      'pointer-events-none absolute -bottom-16 -left-12 w-48 h-48 rounded-full bg-primary-container/15 blur-3xl',
    'aria-hidden': 'true',
  });

  // --- Shimmer overlay ---
  const shimmer = el('div', {
    class:
      'pointer-events-none absolute inset-0 shimmer-overlay animate-shimmer',
    'aria-hidden': 'true',
  });

  // --- Cabeçalho ---
  const headerLabel = el(
    'span',
    {
      class:
        'font-label-caps text-[11px] text-primary/90 uppercase tracking-[0.22em]',
    },
    'Lucro Total',
  );
  const header = el(
    'div',
    { class: 'flex items-center justify-between relative z-10' },
    [headerLabel, buildVariationChip(props.variation)],
  );

  // --- Valor principal (alvo do blur de privacidade) ---
  const amountNumber = el(
    'span',
    {
      class:
        'privacy-target font-display-lg text-[48px] md:text-[64px] leading-[1.05] text-white font-extrabold tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]',
    },
    formatCurrency(props.total, 'AOA').replace(' AOA', ''),
  );
  const amountSuffix = el(
    'span',
    {
      class:
        'font-label-caps text-[13px] text-primary uppercase tracking-[0.2em] bg-primary/10 border border-primary/25 rounded-full px-2.5 py-1 ml-3 self-center',
    },
    'AOA',
  );
  const amountRow = el(
    'div',
    { class: 'flex items-end flex-wrap gap-x-1 relative z-10 mt-4' },
    [amountNumber, amountSuffix],
  );

  // --- Composição ---
  // `isolate` cria um stacking context local que previne que o shimmer e
  // os blobs interajam com elementos fora do card (incluindo a tela toda).
  // `overflow-hidden` aplicado ao root (com rounded-3xl) é quem recorta
  // efetivamente os blobs aos cantos arredondados.
  const card = el(
    'section',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-label': 'Lucro Total',
      class:
        'relative isolate overflow-hidden rounded-3xl p-lg md:p-xl ' +
        'bg-surface-container-low ' +
        'border border-primary/20 ' +
        'shadow-[0_24px_64px_-20px_rgba(16,185,129,0.3),0_8px_32px_rgba(0,0,0,0.4)] ' +
        'animate-scale-in',
    },
    [bg, blobA, blobB, shimmer, header, amountRow],
  );

  // Anima o contador.
  const from = props.previousTotal ?? 0;
  animateCounter(from, props.total, 800, (value) => {
    const rounded = Math.round(value);
    amountNumber.textContent = formatCurrency(rounded, 'AOA').replace(' AOA', '');
  });

  return card;
}

function buildVariationChip(
  variation?: { pct: number; label?: string },
): HTMLElement {
  if (!variation || !Number.isFinite(variation.pct)) {
    // Placeholder vazio para manter o justify-between equilibrado.
    return el('span', { class: 'w-0 h-0' });
  }
  const up = variation.pct >= 0;
  return el(
    'div',
    {
      class:
        'flex items-center gap-xs px-2.5 py-1 rounded-full backdrop-blur-sm border ' +
        (up
          ? 'bg-primary/15 border-primary/25 text-primary'
          : 'bg-error-container/30 border-error/25 text-error'),
    },
    [
      icon(up ? 'trending_up' : 'trending_down', 'text-[14px]'),
      el(
        'span',
        { class: 'font-data-mono text-[12px] font-bold tracking-tight' },
        formatVariation(variation.pct),
      ),
    ],
  );
}
