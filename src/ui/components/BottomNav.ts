/**
 * `BottomNav` — barra inferior com navegação + ação principal (cadastrar).
 *
 * ## Redesign integrado
 *
 * O FAB flutuante foi **absorvido** pelo centro da barra inferior, virando
 * um botão em destaque entre Dashboard e Histórico. Ganhos:
 *
 * - Menos elementos sobrepostos (o "+" flutuante sombreado contra a nav
 *   criava ruído visual e cobria o item "Register" da nav).
 * - Alvo de toque maior e mais previsível (centro absoluto da tela).
 * - Consistência com apps nativos modernos (Gmail, Instagram, Twitter).
 *
 * O botão central:
 *   - É maior (56px) que os outros itens;
 *   - Tem gradiente esmeralda + glow pulsante;
 *   - Ao estar na rota `#/register`, é substituído por um "X" que volta
 *     ao dashboard.
 *
 * ## Outros itens
 *
 * - **Dashboard** (esquerda) e **Histórico** (direita) com pill ativa.
 * - Grid 3 colunas mantém o alinhamento perfeito, independente do item
 *   ativo.
 * - Hashchange atualiza visual _in-place_ (sem recriar DOM).
 *
 * ## Requisitos cobertos
 *
 * - **Req 4.1/4.2** — ação primária para cadastrar, acessível com um toque.
 * - **Req 4.3–4.7** — navegação SPA, destaque do item ativo, sem reload.
 * - **Req 9.7** — oculta no desktop via `md:hidden`.
 */

import { currentRoute, navigate, type RouteHash } from '../../app/router';
import { el, icon } from './dom';

interface SideItem {
  route: Extract<RouteHash, '#/dashboard' | '#/history'>;
  label: string;
  iconName: string;
}

const SIDE_ITEMS: readonly SideItem[] = [
  { route: '#/dashboard', label: 'Dashboard', iconName: 'dashboard' },
  { route: '#/history', label: 'Histórico', iconName: 'history' },
];

const ACTIVE_TEXT = 'text-primary';
const INACTIVE_TEXT = 'text-on-surface-variant';

export function BottomNav(): HTMLElement {
  interface RenderedSide {
    route: RouteHash;
    button: HTMLButtonElement;
    iconSpan: HTMLSpanElement;
    pill: HTMLSpanElement;
    label: HTMLSpanElement;
  }
  const renderedSides: RenderedSide[] = [];

  const renderSide = (item: SideItem): HTMLButtonElement => {
    const iconSpan = icon(item.iconName, 'relative z-10 text-[22px]');
    const labelSpan = el(
      'span',
      {
        class:
          'relative z-10 font-label-caps text-[11px] leading-none tracking-wider mt-1 transition-colors duration-200',
      },
      item.label,
    );
    const pill = el('span', {
      class:
        'pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 h-9 w-14 rounded-full bg-primary/15 border border-primary/25 transition-all duration-300 ease-out opacity-0 scale-90',
      'aria-hidden': 'true',
    });

    const button = el(
      'button',
      {
        type: 'button',
        class:
          `relative flex flex-col items-center justify-center py-2 px-3 ${INACTIVE_TEXT} transition-colors duration-200 hover:text-on-surface focus-visible:text-primary`,
        'aria-label': item.label,
        onClick: () => navigate(item.route),
      },
      [pill, iconSpan, labelSpan],
    ) as HTMLButtonElement;
    renderedSides.push({ route: item.route, button, iconSpan, pill, label: labelSpan });
    return button;
  };

  // --- Botão central (ação principal) ---
  const centerIcon = icon('add', 'relative z-10 text-on-primary text-[28px] transition-transform duration-300');
  const centerGlow = el('span', {
    class:
      'pointer-events-none absolute inset-0 rounded-full bg-primary/40 blur-lg animate-pulse-glow',
    'aria-hidden': 'true',
  });
  const centerButton = el(
    'button',
    {
      type: 'button',
      'aria-label': 'Registrar nova venda',
      class:
        'relative -translate-y-4 w-14 h-14 rounded-full ' +
        'bg-gradient-to-br from-primary-fixed via-primary to-primary-container ' +
        'flex items-center justify-center ' +
        'shadow-[0_10px_24px_rgba(78,222,163,0.4)] ' +
        'border border-primary/50 press-scale ' +
        'transition-all duration-300 hover:shadow-[0_14px_34px_rgba(78,222,163,0.55)]',
      onClick: () => {
        const onRegister = currentRoute() === '#/register';
        navigate(onRegister ? '#/dashboard' : '#/register');
      },
    },
    [centerGlow, centerIcon],
  ) as HTMLButtonElement;

  // Wrapper que garante que o botão central se sobressai no grid.
  const centerCell = el(
    'div',
    { class: 'flex items-center justify-center' },
    centerButton,
  );

  const grid = el(
    'div',
    {
      class:
        'grid grid-cols-3 items-center max-w-md mx-auto px-2 pt-2 pb-1 relative',
    },
    [renderSide(SIDE_ITEMS[0]!), centerCell, renderSide(SIDE_ITEMS[1]!)],
  );

  const nav = el(
    'nav',
    {
      'aria-label': 'Navegação principal',
      class:
        'fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe ' +
        'bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline-variant/50 ' +
        'shadow-[0_-8px_24px_rgba(0,0,0,0.25)] animate-slide-up',
    },
    grid,
  );

  const updateActive = (): void => {
    const active = currentRoute();

    // Sides
    for (const entry of renderedSides) {
      const isActive = entry.route === active;
      entry.button.setAttribute('aria-current', isActive ? 'page' : 'false');
      entry.button.classList.toggle(ACTIVE_TEXT, isActive);
      entry.button.classList.toggle(INACTIVE_TEXT, !isActive);
      entry.label.classList.toggle(ACTIVE_TEXT, isActive);
      entry.label.classList.toggle('font-semibold', isActive);
      entry.iconSpan.classList.toggle('filled', isActive);

      if (isActive) {
        entry.pill.classList.remove('opacity-0', 'scale-90');
        entry.pill.classList.add('opacity-100', 'scale-100');
      } else {
        entry.pill.classList.remove('opacity-100', 'scale-100');
        entry.pill.classList.add('opacity-0', 'scale-90');
      }
    }

    // Centro: alterna entre "+" (outras rotas) e "×" (quando em register).
    const onRegister = active === '#/register';
    centerIcon.textContent = onRegister ? 'close' : 'add';
    centerIcon.style.transform = onRegister ? 'rotate(0deg)' : 'rotate(0deg)';
    centerButton.setAttribute(
      'aria-label',
      onRegister ? 'Voltar ao dashboard' : 'Registrar nova venda',
    );
  };

  updateActive();
  window.addEventListener('hashchange', updateActive);

  return nav;
}
