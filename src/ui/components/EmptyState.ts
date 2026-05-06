/**
 * `EmptyState` — estado vazio do Histórico_de_Vendas.
 *
 * ## Redesign moderno
 *
 * - Ilustração composta por círculos concêntricos + ícone central,
 *   evocando "radar vazio" — sinaliza que não há dados ainda sem
 *   parecer erro.
 * - Título + descrição hierarquizados; botão CTA em pill esmeralda
 *   com press-scale.
 * - Animação de entrada `scale-in`.
 *
 * Cobre o Req 3.5.
 */

import { navigate } from '../../app/router';
import { el, icon } from './dom';

export interface EmptyStateProps {
  message?: string;
  title?: string;
  cta?: { label: string; route: '#/dashboard' | '#/register' | '#/history' };
  iconName?: string;
}

export function EmptyState(props: EmptyStateProps = {}): HTMLElement {
  const message = props.message ?? 'Comece cadastrando a primeira venda para ver o lucro total.';
  const title = props.title ?? 'Nenhuma venda ainda';
  const cta = props.cta ?? { label: 'Registrar venda', route: '#/register' as const };
  const iconName = props.iconName ?? 'receipt_long';

  // Círculos concêntricos decorativos.
  const ring1 = el('span', {
    class:
      'pointer-events-none absolute inset-0 rounded-full border border-primary/15 animate-pulse-glow',
    'aria-hidden': 'true',
  });
  const ring2 = el('span', {
    class:
      'pointer-events-none absolute inset-[12px] rounded-full border border-primary/10',
    'aria-hidden': 'true',
  });
  const ring3 = el('span', {
    class:
      'pointer-events-none absolute inset-[28px] rounded-full bg-primary/10',
    'aria-hidden': 'true',
  });
  const iconEl = icon(iconName, 'relative z-10 text-primary text-[44px] filled');

  const illustration = el(
    'div',
    {
      class:
        'relative w-[168px] h-[168px] flex items-center justify-center',
    },
    [ring1, ring2, ring3, iconEl],
  );

  const titleEl = el(
    'h3',
    {
      class:
        'font-headline-md text-[20px] text-on-surface font-bold text-center',
    },
    title,
  );

  const paragraph = el(
    'p',
    {
      class:
        'font-body-base text-[14px] text-on-surface-variant text-center max-w-[280px]',
    },
    message,
  );

  const ctaButton = el(
    'button',
    {
      type: 'button',
      class:
        'press-scale inline-flex items-center gap-sm px-5 py-3 rounded-full ' +
        'bg-gradient-to-r from-primary-fixed via-primary to-primary-container ' +
        'text-on-primary font-label-caps text-[12px] uppercase tracking-[0.15em] font-bold ' +
        'shadow-[0_8px_20px_rgba(78,222,163,0.35)] hover:shadow-[0_12px_28px_rgba(78,222,163,0.5)] transition-shadow',
      onClick: () => navigate(cta.route),
    },
    [
      icon('add_circle', 'text-[18px] filled'),
      document.createTextNode(cta.label),
    ],
  );

  return el(
    'section',
    {
      class:
        'flex flex-col items-center justify-center gap-md py-xl px-md animate-scale-in',
      'aria-label': 'Histórico vazio',
    },
    [illustration, titleEl, paragraph, ctaButton],
  );
}
