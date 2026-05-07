/**
 * `DashboardView` — tela inicial com redesign moderno + swipe-to-delete.
 *
 * - Hero do Lucro_Total com contador animado.
 * - Itens do histórico via `SwipeableSaleItem` — arrastar lateralmente
 *   remove a venda (soft delete) e mostra snackbar com "Desfazer".
 *
 * Cobre Req 2.1–2.4, 3.1, 3.2, 3.3, 3.5, 10.3 (exclusão com confirmação
 * implícita via snackbar de desfazer).
 */

import type { Store } from '../../app/store';
import type { AppState } from '../../app/state';
import type { Mount } from '../../app/router';
import type { SalesRepository } from '../../infra/salesRepository';
import { calcularLucroTotal } from '../../domain/profit';
import { deleteSale, restoreSale } from '../../app/actions';
import { el, icon } from '../components/dom';
import { TopAppBar } from '../components/TopAppBar';
import { TotalProfitCard } from '../components/TotalProfitCard';
import { SwipeableSaleItem } from '../components/SwipeableSaleItem';
import { EmptyState } from '../components/EmptyState';
import { showSnackbar } from '../components/Snackbar';

const DELAY_CLASSES = [
  'anim-delay-60',
  'anim-delay-120',
  'anim-delay-180',
  'anim-delay-240',
  'anim-delay-320',
];

export function DashboardView(
  store: Store<AppState>,
  repo: SalesRepository,
): Mount {
  return (root: HTMLElement): (() => void) => {
    let previousTotal = 0;

    const handleDelete = async (id: string): Promise<void> => {
      const deleted = await deleteSale(id, store, repo);
      if (deleted === null) return;
      showSnackbar(
        `Venda de ${deleted.customerName} excluída`,
        {
          label: 'Desfazer',
          onClick: () => {
            void restoreSale(deleted, store, repo);
          },
        },
        5000,
      );
    };

    const render = (): void => {
      const state = store.get();
      const total = calcularLucroTotal(state.sales);
      const salesCount = state.sales.filter((s) => s.deletedAt === null).length;

      const historyHeader = el(
        'div',
        { class: 'flex items-center justify-between' },
        [
          el(
            'h3',
            { class: 'font-headline-md text-[20px] text-on-surface font-bold' },
            'Histórico',
          ),
          el(
            'div',
            {
              class:
                'flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/60 border border-outline-variant/40',
            },
            [
              icon('receipt_long', 'text-[14px] text-on-surface-variant'),
              el(
                'span',
                {
                  class:
                    'font-data-mono text-[12px] text-on-surface-variant tracking-tight font-semibold',
                },
                String(salesCount),
              ),
            ],
          ),
        ],
      );

      let historyBody: HTMLElement;
      if (state.sales.length === 0) {
        historyBody = EmptyState();
      } else {
        historyBody = el(
          'div',
          { class: 'flex flex-col gap-sm', role: 'list' },
          state.sales.map((sale, idx) => {
            const item = SwipeableSaleItem({
              sale,
              onDelete: (s) => {
                void handleDelete(s.id);
              },
            });
            const delay = DELAY_CLASSES[Math.min(idx, DELAY_CLASSES.length - 1)];
            if (delay) item.classList.add(delay);
            return item;
          }),
        );
      }

      const historySection = el(
        'section',
        { class: 'flex flex-col gap-md' },
        [historyHeader, historyBody],
      );

      const main = el(
        'main',
        {
          class:
            'pt-topbar-safe px-margin-mobile max-w-4xl mx-auto flex flex-col gap-lg pb-[140px]',
        },
        [TotalProfitCard({ total, previousTotal }), historySection],
      );

      root.innerHTML = '';
      root.appendChild(TopAppBar({ variant: 'default', subtitle: 'Dashboard' }));
      root.appendChild(main);

      previousTotal = total;
    };

    const unsub = store.subscribe(render);
    render();
    return () => {
      unsub();
    };
  };
}
