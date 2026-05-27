/**
 * `DashboardView` — tela inicial com seleção por mês.
 *
 * - Hero do Lucro_Total exibe **apenas** o lucro do mês selecionado.
 * - Itens do histórico filtrados pelo mês.
 * - `MonthNavigator` acima do card permite alternar entre meses.
 *
 * Cobre Req 2.1–2.4, 3.1, 3.2, 3.3, 3.5, 10.3.
 */

import type { Store } from '../../app/store';
import type { AppState } from '../../app/state';
import type { Mount } from '../../app/router';
import type { SalesRepository } from '../../infra/salesRepository';
import { calcularLucroTotal } from '../../domain/profit';
import { deleteSale, restoreSale } from '../../app/actions';
import {
  getSelectedMonth,
  subscribeMonth,
  timestampBelongsTo,
} from '../../app/monthSelector';
import { el, icon } from '../components/dom';
import { TopAppBar } from '../components/TopAppBar';
import { TotalProfitCard } from '../components/TotalProfitCard';
import { MonthNavigator } from '../components/MonthNavigator';
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
      const selectedMonth = getSelectedMonth();
      const salesOfMonth = state.sales.filter((s) =>
        timestampBelongsTo(s.createdAt, selectedMonth),
      );
      const total = calcularLucroTotal(salesOfMonth);
      const salesCount = salesOfMonth.filter((s) => s.deletedAt === null).length;

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
      if (salesOfMonth.length === 0) {
        historyBody = EmptyState({
          title: 'Nenhuma venda neste mês',
          message:
            'Use as setas acima para navegar entre meses, ou cadastre uma nova venda.',
        });
      } else {
        historyBody = el(
          'div',
          { class: 'flex flex-col gap-sm', role: 'list' },
          salesOfMonth.map((sale, idx) => {
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
            'pt-topbar-safe px-margin-mobile max-w-4xl mx-auto flex flex-col gap-md pb-[140px]',
        },
        [
          MonthNavigator(),
          TotalProfitCard({ total, previousTotal }),
          historySection,
        ],
      );

      root.innerHTML = '';
      root.appendChild(TopAppBar({ variant: 'default', subtitle: 'Dashboard' }));
      root.appendChild(main);

      previousTotal = total;
    };

    const unsubStore = store.subscribe(render);
    const unsubMonth = subscribeMonth(render);
    render();
    return () => {
      unsubStore();
      unsubMonth();
    };
  };
}
