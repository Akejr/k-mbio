/**
 * `Fab` — _Floating Action Button_ para acesso rápido ao `RegisterView`.
 *
 * ## Redesign moderno
 *
 * - Botão circular (`rounded-full`) com gradiente emerald, aura pulsante
 *   (`animate-pulse-glow`) e anéis concêntricos que confirmam ao usuário
 *   que o botão é interativo.
 * - Animação de pressão (`press-scale`) e rotação sutil do `+` no hover.
 * - Oculto em `#/register` com transição de escala (não mais `display:none`
 *   bruto) — evita "salto" ao entrar/sair do cadastro.
 *
 * ## Requisitos cobertos
 *
 * - **Req 4.1** — FAB fixo com ícone "+" acima da barra inferior.
 * - **Req 4.2** — clique abre o `RegisterView`.
 * - **Req 9.4** — botão primário em `bg-primary` com radius adequado.
 */

import { currentRoute, navigate } from '../../app/router';
import { el, icon } from './dom';

export function Fab(): HTMLButtonElement {
  const plusIcon = icon('add', 'text-on-primary text-[28px] relative z-10 transition-transform duration-300');

  // Aura pulsante — camada absoluta atrás do botão.
  const glow = el('span', {
    class:
      'pointer-events-none absolute inset-0 rounded-full bg-primary/40 blur-xl animate-pulse-glow',
    'aria-hidden': 'true',
  });

  const innerRing = el('span', {
    class:
      'pointer-events-none absolute inset-[6px] rounded-full border border-white/10',
    'aria-hidden': 'true',
  });

  const button = el(
    'button',
    {
      type: 'button',
      'aria-label': 'Registrar nova venda',
      class:
        'group fixed bottom-[96px] right-margin-mobile z-40 ' +
        'w-16 h-16 rounded-full ' +
        'bg-gradient-to-br from-primary-fixed via-primary to-primary-container ' +
        'flex items-center justify-center ' +
        'shadow-[0_12px_28px_rgba(78,222,163,0.35)] ' +
        'border border-primary/40 press-scale ' +
        'transition-all duration-300 ease-out ' +
        'hover:shadow-[0_16px_40px_rgba(78,222,163,0.55)] ' +
        'animate-scale-in',
      onClick: () => navigate('#/register'),
    },
    [glow, innerRing, plusIcon],
  );

  // Rotação sutil do + no hover — charme visual sem exagero.
  button.addEventListener('mouseenter', () => {
    plusIcon.style.transform = 'rotate(90deg)';
  });
  button.addEventListener('mouseleave', () => {
    plusIcon.style.transform = 'rotate(0deg)';
  });

  const updateVisibility = (): void => {
    const onRegister = currentRoute() === '#/register';
    if (onRegister) {
      // Fade-out + scale-down com transição já definida na classe.
      button.style.opacity = '0';
      button.style.pointerEvents = 'none';
      button.style.transform = 'scale(0.6)';
    } else {
      button.style.opacity = '1';
      button.style.pointerEvents = 'auto';
      button.style.transform = 'scale(1)';
    }
  };

  updateVisibility();
  window.addEventListener('hashchange', updateVisibility);

  return button;
}
