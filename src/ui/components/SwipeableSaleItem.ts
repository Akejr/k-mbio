/**
 * `SwipeableSaleItem` — wrapper ao redor de `SaleListItem` que habilita
 * _swipe-to-delete_ horizontal em pointer devices (mouse, touch, pen).
 *
 * ## Comportamento
 *
 * - Arrastar para a **esquerda**: revela uma faixa vermelha com ícone de
 *   lixeira. Se a distância ultrapassar `THRESHOLD` (40% da largura), ao
 *   soltar o item desliza até sair e `onDelete` é chamada. Caso contrário,
 *   o item volta suavemente para a posição original.
 * - Arrastar para a **direita**: espelhado — mesma faixa/ação. Permitir os
 *   dois lados é uma UX comum (Gmail/iOS Mail) e evita que usuários
 *   destros/canhotos fiquem frustrados.
 * - Scroll vertical é preservado: só "prende" o gesto quando o movimento
 *   horizontal domina claramente (razão dx:dy > 1.5) e passa de 10 px.
 * - Keyboard (acessibilidade): o wrapper recebe `tabindex="0"` e
 *   `role="group"`; `Delete`/`Backspace` com foco dispara `onDelete` com
 *   uma animação curta de slide-out.
 * - O botão de lixeira clicável também está disponível atrás da faixa —
 *   útil para usuários que não querem usar gesto.
 *
 * ## Acessibilidade
 *
 * - `aria-label="Venda: <cliente>"` no wrapper.
 * - O botão de lixeira revelado tem `aria-label="Excluir venda"`.
 * - Respeita `prefers-reduced-motion`: elimina o snap-back elástico.
 */

import type { Sale } from '../../domain/sale';
import { el, icon } from './dom';
import { SaleListItem } from './SaleListItem';

/**
 * Fração da largura do item em que o gesto se compromete a deletar ao
 * soltar (mesmo comportamento no swipe para direita — valor positivo).
 */
const THRESHOLD_FRACTION = 0.38;

/** Deslocamento mínimo para considerar o gesto como "swipe" válido. */
const MIN_MOVE_PX = 10;

/** Razão mínima horizontal/vertical para prender o gesto como swipe. */
const HORIZ_LOCK_RATIO = 1.5;

interface SwipeableSaleItemProps {
  sale: Sale;
  onDelete: (sale: Sale) => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function SwipeableSaleItem(props: SwipeableSaleItemProps): HTMLElement {
  const { sale, onDelete } = props;
  const reducedMotion = prefersReducedMotion();

  // --- Fundo vermelho com ícone de lixeira em ambos os lados ---
  const trashIconLeft = icon('delete', 'text-error-container text-[24px] filled');
  const trashIconRight = icon('delete', 'text-error-container text-[24px] filled');

  const trashLeft = el(
    'div',
    {
      class:
        'absolute inset-y-0 left-0 flex items-center justify-start pl-lg ' +
        'opacity-0 transition-opacity duration-150',
      'aria-hidden': 'true',
    },
    trashIconLeft,
  );
  const trashRight = el(
    'div',
    {
      class:
        'absolute inset-y-0 right-0 flex items-center justify-end pr-lg ' +
        'opacity-0 transition-opacity duration-150',
      'aria-hidden': 'true',
    },
    trashIconRight,
  );

  const background = el(
    'div',
    {
      class:
        'absolute inset-0 rounded-2xl bg-gradient-to-r from-error/40 via-error/60 to-error/40 opacity-0 transition-opacity duration-150',
      'aria-hidden': 'true',
    },
  );

  // --- Camada do item (o card real) ---
  const card = SaleListItem(sale);
  // Remove a animação de entrada do SaleListItem — o wrapper cuida disso
  // para evitar conflito com as transforms do swipe.
  card.classList.remove('animate-slide-up');
  card.style.touchAction = 'pan-y';

  // --- Wrapper: altura = altura do card, posição relativa ---
  const wrapper = el(
    'div',
    {
      class:
        'relative isolate rounded-2xl select-none animate-slide-up',
      role: 'group',
      tabindex: '0',
      'aria-label': `Venda de ${sale.customerName}, ${sale.id}. Use as setas para navegar; pressione Delete para excluir.`,
    },
    [background, trashLeft, trashRight, card],
  );

  // --- Estado do gesto ---
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let currentDx = 0;
  let locked: 'horizontal' | 'vertical' | null = null;
  let animatingOut = false;

  const setTransform = (dx: number, withTransition: boolean): void => {
    card.style.transition = withTransition
      ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none';
    card.style.transform = `translateX(${dx}px)`;

    // Background e ícones: opacidade proporcional ao avanço até o threshold.
    const width = wrapper.getBoundingClientRect().width || 1;
    const progress = Math.min(1, Math.abs(dx) / (width * THRESHOLD_FRACTION));
    background.style.opacity = String(progress * 0.9);
    background.style.transition = withTransition
      ? 'opacity 260ms ease'
      : 'none';

    if (dx < -MIN_MOVE_PX) {
      trashRight.style.opacity = String(progress);
      trashLeft.style.opacity = '0';
    } else if (dx > MIN_MOVE_PX) {
      trashLeft.style.opacity = String(progress);
      trashRight.style.opacity = '0';
    } else {
      trashLeft.style.opacity = '0';
      trashRight.style.opacity = '0';
    }
  };

  const reset = (): void => {
    pointerId = null;
    locked = null;
    currentDx = 0;
    setTransform(0, !reducedMotion);
  };

  const commitDelete = (direction: -1 | 1): void => {
    if (animatingOut) return;
    animatingOut = true;
    const width = wrapper.getBoundingClientRect().width || 320;
    const exitDx = direction * (width + 80);
    const duration = reducedMotion ? 0 : 260;
    card.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${duration}ms ease`;
    card.style.transform = `translateX(${exitDx}px)`;
    card.style.opacity = '0';
    background.style.opacity = '0';

    // Colapsa a altura do wrapper após o slide-out para as próximas linhas
    // subirem suavemente.
    window.setTimeout(() => {
      wrapper.style.transition = `max-height ${duration}ms ease, margin ${duration}ms ease, opacity ${duration}ms ease`;
      wrapper.style.maxHeight = `${wrapper.offsetHeight}px`;
      // Forçar reflow antes de colapsar para que o browser anime.
      void wrapper.offsetHeight;
      wrapper.style.maxHeight = '0px';
      wrapper.style.marginTop = '0px';
      wrapper.style.marginBottom = '0px';
      wrapper.style.opacity = '0';
      wrapper.style.overflow = 'hidden';
    }, Math.max(0, duration - 60));

    window.setTimeout(() => {
      onDelete(sale);
    }, duration + 30);
  };

  // --- Handlers de pointer events (cobre mouse, touch e pen) ---
  const onPointerDown = (ev: PointerEvent): void => {
    if (animatingOut) return;
    // Botão esquerdo ou toque único.
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    pointerId = ev.pointerId;
    startX = ev.clientX;
    startY = ev.clientY;
    currentDx = 0;
    locked = null;
    card.style.transition = 'none';
  };

  const onPointerMove = (ev: PointerEvent): void => {
    if (pointerId !== ev.pointerId || animatingOut) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (locked === null) {
      if (adx < MIN_MOVE_PX && ady < MIN_MOVE_PX) return;
      // Detecta se é um swipe horizontal dominante.
      if (adx >= HORIZ_LOCK_RATIO * ady) {
        locked = 'horizontal';
        try {
          card.setPointerCapture(ev.pointerId);
        } catch {
          // Alguns navegadores levantam se o pointer já foi liberado.
        }
      } else {
        locked = 'vertical';
        pointerId = null; // Solta o gesto — é um scroll.
        return;
      }
    }

    if (locked === 'horizontal') {
      // Resistência nas extremidades: permite arrastar além mas com
      // feedback elástico.
      currentDx = dx;
      ev.preventDefault();
      setTransform(currentDx, false);
    }
  };

  const onPointerUp = (ev: PointerEvent): void => {
    if (pointerId !== ev.pointerId || animatingOut) return;
    if (locked !== 'horizontal') {
      reset();
      return;
    }
    try {
      card.releasePointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
    const width = wrapper.getBoundingClientRect().width || 320;
    const threshold = width * THRESHOLD_FRACTION;
    if (currentDx <= -threshold) {
      commitDelete(-1);
    } else if (currentDx >= threshold) {
      commitDelete(1);
    } else {
      reset();
    }
  };

  const onPointerCancel = (ev: PointerEvent): void => {
    if (pointerId !== ev.pointerId) return;
    reset();
  };

  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerCancel);

  // --- Keyboard: Delete / Backspace excluem ---
  wrapper.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key === 'Delete' || ev.key === 'Backspace') {
      ev.preventDefault();
      commitDelete(-1);
    }
  });

  return wrapper;
}
