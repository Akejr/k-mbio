/**
 * `MonthNavigator` — navegação entre meses em pill flutuante acima do
 * card de Lucro Total.
 *
 * ## Visual
 *
 * ```
 *   [ ‹ ]   Outubro 2025   [ › ]
 * ```
 *
 * - Pill arredondada (rounded-full) com backdrop-blur.
 * - Setas em botões circulares que ficam desabilitadas quando aplicável
 *   (a seta direita desabilita ao chegar no mês corrente).
 * - Ao tocar no rótulo central, volta para o mês corrente (atalho útil
 *   após explorar meses passados).
 * - Animação `slide-in` no rótulo cada vez que troca o mês — dá feedback
 *   visual claro de que algo mudou.
 *
 * ## Comportamento
 *
 * Subscreve `monthSelector` para refletir o estado e atualizar visual.
 * Não recria DOM ao trocar — apenas troca o `textContent` e dispara a
 * animação reaplicando a classe.
 */

import {
  formatMonthLabel,
  isCurrentMonth,
  jumpToCurrentMonth,
  nextMonth,
  prevMonth,
  subscribeMonth,
  type MonthSelection,
} from '../../app/monthSelector';
import { el, icon } from './dom';

export function MonthNavigator(): HTMLElement {
  const arrowLeft = el(
    'button',
    {
      type: 'button',
      'aria-label': 'Mês anterior',
      class:
        'flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors duration-200 active:scale-90',
      onClick: () => prevMonth(),
    },
    icon('chevron_left', 'text-[20px]'),
  ) as HTMLButtonElement;

  const arrowRight = el(
    'button',
    {
      type: 'button',
      'aria-label': 'Mês seguinte',
      class:
        'flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors duration-200 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-on-surface-variant',
      onClick: () => nextMonth(),
    },
    icon('chevron_right', 'text-[20px]'),
  ) as HTMLButtonElement;

  const labelEl = el(
    'button',
    {
      type: 'button',
      'aria-label': 'Voltar ao mês atual',
      class:
        'font-label-caps text-[12px] tracking-[0.12em] text-on-surface font-bold uppercase px-2 min-w-[120px] text-center',
      onClick: () => jumpToCurrentMonth(),
    },
    'Carregando…',
  );

  const todayBadge = el(
    'span',
    {
      class:
        'absolute -top-1.5 -right-1.5 px-1.5 py-px rounded-full bg-primary text-on-primary text-[9px] font-bold tracking-wider uppercase shadow-[0_2px_8px_rgba(78,222,163,0.5)] hidden',
      'aria-hidden': 'true',
    },
    'HOJE',
  );

  const labelWrapper = el(
    'div',
    { class: 'relative flex items-center justify-center' },
    [labelEl, todayBadge],
  );

  const root = el(
    'div',
    {
      class:
        'flex items-center justify-between gap-sm px-2 py-1 rounded-full bg-surface-container/70 border border-outline-variant/40 backdrop-blur-md w-fit mx-auto animate-slide-down',
      role: 'group',
      'aria-label': 'Navegação por mês',
    },
    [arrowLeft, labelWrapper, arrowRight],
  );

  const applyState = (sel: MonthSelection): void => {
    labelEl.textContent = formatMonthLabel(sel);
    // Re-dispara a animação removendo e reaplicando a classe.
    labelEl.classList.remove('animate-fade-in');
    void labelEl.offsetWidth; // força reflow
    labelEl.classList.add('animate-fade-in');

    const isCurrent = isCurrentMonth(sel);
    arrowRight.disabled = isCurrent;
    todayBadge.classList.toggle('hidden', !isCurrent);
  };

  subscribeMonth(applyState);
  return root;
}
