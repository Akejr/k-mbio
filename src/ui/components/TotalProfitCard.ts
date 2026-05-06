/**
 * `TotalProfitCard` — card hero do Dashboard exibindo o Lucro_Total em AOA.
 *
 * ## Redesign moderno
 *
 * - Fundo em gradiente diagonal (obsidiana → verde-floresta) com blobs
 *   esmeralda flutuantes (animação `float`) que criam profundidade sem
 *   distrair da leitura do número.
 * - Shimmer sutil atravessando o card (animado via keyframe `shimmer`).
 * - Contador animado: o valor cresce do `previousTotal` até `total` em
 *   800 ms com easing, dando sensação de "contabilização em tempo real".
 *   Reduz motion quando `prefers-reduced-motion: reduce` (atribuído
 *   imediatamente, sem animação).
 * - Metadados abaixo do número: "período · vendas registradas" — dando
 *   mais contexto do que um único valor solto.
 * - Chip de variação percentual quando fornecido (opcional, Req 2.6).
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
  /** Número de vendas (para subtítulo). */
  salesCount?: number;
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

/**
 * Anima um contador numérico de `from` a `to` durante `durationMs`,
 * atualizando `onUpdate` com o valor intermediário a cada frame.
 */
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
    // easeOutCubic — chega rapidamente e desacelera.
    const eased = 1 - Math.pow(1 - t, 3);
    onUpdate(from + delta * eased);
    if (t < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

export function TotalProfitCard(props: TotalProfitCardProps): HTMLElement {
  // --- Blobs decorativos (dois círculos borrados animados) ---
  const blobA = el('div', {
    class:
      'pointer-events-none absolute top-0 right-0 w-56 h-56 bg-primary rounded-full mix-blend-screen opacity-20 blur-3xl animate-float',
    'aria-hidden': 'true',
  });
  const blobB = el('div', {
    class:
      'pointer-events-none absolute -bottom-12 -left-8 w-44 h-44 bg-primary-container rounded-full mix-blend-screen opacity-10 blur-3xl',
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
        'font-label-caps text-label-caps text-primary/90 uppercase tracking-[0.18em]',
    },
    'Lucro Total Acumulado',
  );
  const header = el(
    'div',
    { class: 'flex items-center gap-sm relative z-10' },
    [headerLabel],
  );

  // --- Valor principal ---
  const amountNumber = el(
    'span',
    {
      class:
        'font-display-lg text-[44px] md:text-[56px] text-white font-extrabold tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)] leading-none',
    },
    formatCurrency(props.total, 'AOA').replace(' AOA', ''),
  );
  const amountSuffix = el(
    'span',
    {
      class:
        'font-label-caps text-[14px] text-primary/80 uppercase tracking-[0.18em] ml-2 align-middle',
    },
    'AOA',
  );
  const amountRow = el(
    'div',
    { class: 'flex items-baseline gap-2 relative z-10' },
    [amountNumber, amountSuffix],
  );

  // --- Chip de variação (opcional) ou subtítulo de contagem ---
  const metaItems: HTMLElement[] = [];
  if (typeof props.salesCount === 'number') {
    metaItems.push(
      el(
        'div',
        {
          class:
            'flex items-center gap-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm',
        },
        [
          icon('receipt_long', 'text-[14px] text-on-surface-variant'),
          el(
            'span',
            { class: 'font-label-caps text-[11px] text-on-surface-variant tracking-wider' },
            `${props.salesCount} ${props.salesCount === 1 ? 'venda' : 'vendas'}`,
          ),
        ],
      ),
    );
  }
  if (props.variation && Number.isFinite(props.variation.pct)) {
    const up = props.variation.pct >= 0;
    metaItems.push(
      el(
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
            {
              class: 'font-data-mono text-[12px] font-bold tracking-tight',
            },
            formatVariation(props.variation.pct),
          ),
        ],
      ),
    );
  }
  const metaRow = metaItems.length
    ? el('div', { class: 'flex items-center gap-sm relative z-10 mt-sm' }, metaItems)
    : null;

  // --- Seção ---
  const children: (HTMLElement | null)[] = [
    blobA,
    blobB,
    shimmer,
    header,
    amountRow,
    metaRow,
  ];

  const card = el(
    'section',
    {
      role: 'status',
      'aria-live': 'polite',
      'aria-label': 'Lucro Total',
      class:
        'relative overflow-hidden rounded-3xl p-lg md:p-xl ' +
        'bg-gradient-to-br from-[#0b1f17] via-[#0e2a20] to-[#052a1d] ' +
        'border border-primary/20 ' +
        'shadow-[0_24px_64px_-20px_rgba(16,185,129,0.35),0_8px_32px_rgba(0,0,0,0.4)] ' +
        'backdrop-blur-xl animate-scale-in',
    },
    children.filter((c): c is HTMLElement => c !== null),
  );

  // Anima o número do `previousTotal` (ou 0) até `total`. Precisa ocorrer
  // após o elemento existir; como o texto está em `amountNumber`, basta
  // atualizá-lo via `textContent`.
  const from = props.previousTotal ?? 0;
  animateCounter(from, props.total, 800, (value) => {
    const rounded = Math.round(value);
    amountNumber.textContent = formatCurrency(rounded, 'AOA').replace(' AOA', '');
  });

  return card;
}
