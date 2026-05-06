/**
 * `BottomNav` — barra de navegação inferior _mobile-first_ com três itens
 * (`Dashboard`, `Register`, `History`). Oculta em viewports ≥ 768 px
 * (`md:hidden`), conforme Requisito 9.7.
 *
 * ## Redesign moderno
 *
 * - Layout em grid 3 colunas: elimina deslocamento ("torto") ao alternar o
 *   item ativo, porque cada coluna tem largura fixa independentemente da
 *   largura do conteúdo.
 * - Barra transparente com `backdrop-blur` reforçado e borda superior sutil
 *   (glassmorphism coerente com o resto do app).
 * - Indicador ativo com **pill** atrás do ícone ativo e um **traço verde**
 *   fino no topo da coluna ativa — ambos animados por `transition` ao mudar
 *   de aba (GPU-accelerated, sem reflow).
 * - Ícones "filled" quando ativos, outline quando inativos.
 * - `aria-current="page"` no item ativo; foco visível respeitado.
 *
 * ## Requisitos cobertos
 *
 * - **Req 4.3** — três itens nessa ordem.
 * - **Req 4.4/4.5/4.6** — destaque visual do item ativo.
 * - **Req 4.7** — navegação SPA sem recarregar.
 * - **Req 9.7** — oculta em viewports ≥ 768 px.
 */

import { currentRoute, navigate, type RouteHash } from '../../app/router';
import { el, icon } from './dom';

interface NavItem {
  route: RouteHash;
  label: string;
  iconName: string;
}

const ITEMS: readonly NavItem[] = [
  { route: '#/dashboard', label: 'Dashboard', iconName: 'dashboard' },
  { route: '#/register', label: 'Registrar', iconName: 'add_circle' },
  { route: '#/history', label: 'Histórico', iconName: 'history' },
];

/**
 * Cria e retorna o `<nav>` da `BottomNav`.
 *
 * Estrutura: cada item é uma célula de grid contendo um wrapper que
 * recebe a pill ativa (`absolute inset-0`) + ícone + label. A pill é
 * sempre montada, mas só fica visível na coluna ativa — eliminando
 * saltos de layout.
 */
export function BottomNav(): HTMLElement {
  interface Rendered {
    route: RouteHash;
    button: HTMLButtonElement;
    iconSpan: HTMLSpanElement;
    pill: HTMLSpanElement;
    topBar: HTMLSpanElement;
    label: HTMLSpanElement;
  }
  const rendered: Rendered[] = [];

  const renderItem = (item: NavItem): HTMLButtonElement => {
    const iconSpan = icon(item.iconName, 'relative z-10 text-[22px]');

    const label = el(
      'span',
      {
        class:
          'relative z-10 font-label-caps text-[11px] leading-none tracking-wider mt-1 transition-colors duration-200',
      },
      item.label,
    );

    // Pill arredondada atrás do ícone do item ativo. Usa scale para animar
    // entrada/saída sem mudar layout das demais colunas.
    const pill = el('span', {
      class:
        'pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-9 w-14 rounded-full bg-primary/15 border border-primary/25 transition-all duration-300 ease-out opacity-0 scale-90',
      'aria-hidden': 'true',
    });

    // Traço superior verde que só aparece na coluna ativa.
    const topBar = el('span', {
      class:
        'pointer-events-none absolute -top-[1px] left-1/2 -translate-x-1/2 h-[2px] w-8 bg-primary rounded-full transition-all duration-300 ease-out opacity-0 scale-0',
      'aria-hidden': 'true',
    });

    const button = el(
      'button',
      {
        type: 'button',
        class:
          'relative flex flex-col items-center justify-center gap-0 py-2 px-3 text-on-surface-variant transition-colors duration-200 hover:text-on-surface focus-visible:text-primary',
        'aria-label': item.label,
        onClick: () => navigate(item.route),
      },
      [topBar, pill, iconSpan, label],
    ) as HTMLButtonElement;

    rendered.push({ route: item.route, button, iconSpan, pill, topBar, label });
    return button;
  };

  const nav = el(
    'nav',
    {
      'aria-label': 'Navegação principal',
      class:
        'fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe ' +
        'bg-surface-container-lowest/80 backdrop-blur-xl border-t border-outline-variant/50 ' +
        'shadow-[0_-8px_24px_rgba(0,0,0,0.25)] animate-slide-up',
    },
    el(
      'div',
      {
        class:
          'grid grid-cols-3 items-center max-w-md mx-auto px-2 pt-2 pb-1',
      },
      ITEMS.map(renderItem),
    ),
  );

  const updateActive = (): void => {
    const active = currentRoute();
    for (const entry of rendered) {
      const isActive = entry.route === active;
      entry.button.setAttribute('aria-current', isActive ? 'page' : 'false');

      // Cores
      if (isActive) {
        entry.button.classList.add('text-primary');
        entry.button.classList.remove('text-on-surface-variant');
        entry.label.classList.add('text-primary', 'font-semibold');
        entry.label.classList.remove('text-on-surface-variant');
      } else {
        entry.button.classList.remove('text-primary');
        entry.button.classList.add('text-on-surface-variant');
        entry.label.classList.remove('text-primary', 'font-semibold');
      }

      // Ícone: preenchido no ativo.
      entry.iconSpan.classList.toggle('filled', isActive);

      // Pill e traço superior.
      if (isActive) {
        entry.pill.classList.remove('opacity-0', 'scale-90');
        entry.pill.classList.add('opacity-100', 'scale-100');
        entry.topBar.classList.remove('opacity-0', 'scale-0');
        entry.topBar.classList.add('opacity-100', 'scale-100');
      } else {
        entry.pill.classList.remove('opacity-100', 'scale-100');
        entry.pill.classList.add('opacity-0', 'scale-90');
        entry.topBar.classList.remove('opacity-100', 'scale-100');
        entry.topBar.classList.add('opacity-0', 'scale-0');
      }
    }
  };

  updateActive();
  window.addEventListener('hashchange', updateActive);

  return nav;
}
