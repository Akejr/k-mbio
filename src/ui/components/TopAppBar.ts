/**
 * `TopAppBar` — barra superior fixa, elegante e institucional.
 *
 * ## Redesign moderno
 *
 * - Usa gradiente horizontal sutil no fundo + blur maior (`backdrop-blur-xl`).
 * - Variante `default`: logo com caixa arredondada em bg-primary/10
 *   realçando o ícone + título em Inter 700 com tracking ajustado.
 * - Variante `back`: botão com halo ao redor do ícone para feedback tátil.
 * - Entrada animada (`animate-slide-down`).
 *
 * ## Requisitos cobertos
 *
 * - **Req 1.10** — botão voltar na `RegisterView` retorna ao Dashboard
 *   sem persistir; aqui o handler chama `navigate('#/dashboard')`.
 * - **Req 9.1** — tema _dark mode_ consistente.
 * - **Req 9.3** — ícones Material Symbols Outlined.
 */

import { navigate } from '../../app/router';
import { el, icon } from './dom';
import { PrivacyToggle } from './PrivacyToggle';

export interface TopAppBarProps {
  variant?: 'default' | 'back';
  subtitle?: string;
}

export function TopAppBar(props: TopAppBarProps = {}): HTMLElement {
  const variant = props.variant ?? 'default';

  const leftSlot: HTMLElement | null =
    variant === 'back'
      ? el(
          'button',
          {
            type: 'button',
            class:
              'press-scale relative flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-high/60 hover:bg-surface-container-high text-on-surface border border-outline-variant/50 transition-colors',
            'aria-label': 'Voltar ao Dashboard',
            onClick: () => navigate('#/dashboard'),
          },
          icon('arrow_back', 'text-[22px]'),
        )
      : null;

  const title = el(
    'h1',
    {
      class:
        'font-headline-md text-[20px] leading-none font-bold text-on-surface tracking-tight',
    },
    'Kâmbio',
  );

  const subtitle = props.subtitle
    ? el(
        'span',
        {
          class:
            'font-label-caps text-[10px] text-on-surface-variant uppercase tracking-[0.15em] mt-[2px]',
        },
        props.subtitle,
      )
    : null;

  const titleGroup = el(
    'div',
    { class: 'flex flex-col justify-center' },
    subtitle ? [title, subtitle] : title,
  );

  const leftGroup = el(
    'div',
    { class: 'flex items-center gap-sm' },
    leftSlot ? [leftSlot, titleGroup] : [titleGroup],
  );

  // Botão de privacidade à direita: esconde valores monetários com blur.
  // Substitui o chip decorativo anterior — funcionalidade real > enfeite.
  const rightSlot = PrivacyToggle();

  return el(
    'header',
    {
      class:
        'fixed top-0 left-0 right-0 z-50 w-full ' +
        'bg-surface-container-lowest/75 backdrop-blur-xl border-b border-outline-variant/50 ' +
        'shadow-[0_1px_0_rgba(255,255,255,0.02)] animate-slide-down ' +
        'pt-safe',
    },
    el(
      'div',
      {
        class:
          'flex items-center justify-between px-margin-mobile h-16',
      },
      [leftGroup, rightSlot],
    ),
  );
}
