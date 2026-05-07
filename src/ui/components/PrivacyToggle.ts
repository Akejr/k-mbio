/**
 * `PrivacyToggle` — botão no canto superior direito que alterna o modo
 * privado (esconde valores monetários atrás de um blur).
 *
 * ## Comportamento
 *
 * - Ícone alterna entre `visibility` (valores visíveis) e `visibility_off`
 *   (valores ocultos), com animação de fade-rotate.
 * - Ao clicar, aplica `togglePrivacy()` que:
 *     1. Persiste o estado em `localStorage`;
 *     2. Define `data-privacy` no `<html>`, disparando uma transição CSS
 *        global que borra os elementos marcados com `.privacy-target`.
 * - Tecla Enter/Space também aciona (comportamento nativo de `<button>`).
 *
 * ## Acessibilidade
 *
 * - `aria-pressed` reflete o estado;
 * - `aria-label` descreve a ação atual ("Ocultar valores"/"Mostrar valores").
 */

import { isPrivacyHidden, subscribePrivacy, togglePrivacy } from '../../app/privacy';
import { el, icon } from './dom';

export function PrivacyToggle(): HTMLButtonElement {
  const iconSpan = icon('visibility', 'text-[20px] transition-all duration-300');

  const button = el(
    'button',
    {
      type: 'button',
      class:
        'press-scale relative flex items-center justify-center w-10 h-10 rounded-full ' +
        'bg-surface-container-high/60 border border-outline-variant/50 ' +
        'text-on-surface-variant hover:text-on-surface ' +
        'transition-colors duration-200',
      onClick: () => {
        togglePrivacy();
      },
    },
    iconSpan,
  ) as HTMLButtonElement;

  const applyState = (hidden: boolean): void => {
    button.setAttribute('aria-pressed', String(hidden));
    button.setAttribute(
      'aria-label',
      hidden ? 'Mostrar valores' : 'Ocultar valores',
    );
    iconSpan.textContent = hidden ? 'visibility_off' : 'visibility';
    iconSpan.classList.toggle('text-primary', hidden);
    // Micro-animação: pequena rotação quando alterna.
    iconSpan.style.transform = hidden ? 'rotate(-8deg) scale(1.05)' : 'rotate(0) scale(1)';
  };

  // Primeira aplicação (síncrona, antes de subscrever).
  applyState(isPrivacyHidden());

  // Mantém o botão sincronizado com mudanças externas (ex.: outra aba).
  subscribePrivacy(applyState);

  return button;
}
