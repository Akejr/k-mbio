/**
 * `HistoryView` — tela dedicada com seleção por mês.
 *
 * Banner topo mostra contagem e lucro do mês selecionado. MonthNavigator
 * acima do banner permite alternar.
 */

import type { Store } from '../../app/store';
import type { AppState } from '../../app/state';
import type { Mount } from '../../app/router';
import type { SalesRepository } from '../../infra/salesRepository';
import { calcularLucroTotal } from '../../domain/profit';
import { formatCurrency } from '../../domain/formatter';
import { deleteSale, restoreSale } from '../../app/actions';
import {
  getSelectedMonth,
  subscribeMonth,
  timestampBelongsTo,
} from '../../app/monthSelector';
import { el, icon } from '../components/dom';
import { TopAppBar } from '../components/TopAppBar';
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

export function HistoryView(
  store: Store<AppState>,
  repo: SalesRepository,
): Mount {
  return (root: HTMLElement): (() => void) => {
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
      const count = salesOfMonth.filter((s) => s.deletedAt === null).length;
      const total = calcularLucroTotal(salesOfMonth);

      const banner = el(
        'section',
        {
          class:
            'rounded-2xl p-md border border-outline-variant/50 bg-surface-container/70 backdrop-blur-md flex items-center justify-between animate-slide-up',
        },
        [
          el(
            'div',
            { class: 'flex items-center gap-sm' },
            [
              el(
                'span',
                {
                  class:
                    'flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/25',
                },
                icon('history', 'text-primary text-[20px]'),
              ),
              el(
                'div',
                { class: 'flex flex-col' },
                [
                  el(
                    'span',
                    {
                      class:
                        'font-label-caps text-[10px] text-on-surface-variant uppercase tracking-[0.15em]',
                    },
                    'Vendas no mês',
                  ),
                  el(
                    'span',
                    {
                      class:
                        'font-headline-md text-[18px] text-on-surface font-bold tracking-tight',
                    },
                    String(count),
                  ),
                ],
              ),
            ],
          ),
          el(
            'div',
            { class: 'flex flex-col items-end' },
            [
              el(
                'span',
                {
                  class:
                    'font-label-caps text-[10px] text-on-surface-variant uppercase tracking-[0.15em]',
                },
                'Lucro do mês',
              ),
              el(
                'span',
                {
                  class:
                    'privacy-target font-data-mono text-[16px] text-primary font-bold tracking-tight',
                },
                formatCurrency(total, 'AOA'),
              ),
            ],
          ),
        ],
      );

      let body: HTMLElement;
      if (salesOfMonth.length === 0) {
        body = EmptyState({
          title: 'Nenhuma venda neste mês',
          message:
            'Use as setas acima para navegar entre meses, ou cadastre uma nova venda.',
        });
      } else {
        body = el(
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

      const titleRow = el(
        'div',
        { class: 'flex items-baseline justify-between' },
        [
          el(
            'h3',
            { class: 'font-headline-md text-[20px] text-on-surface font-bold' },
            'Histórico de Vendas',
          ),
        ],
      );

      const section = el(
        'section',
        { class: 'flex flex-col gap-md' },
        [titleRow, body],
      );

      const main = el(
        'main',
        {
          class:
            'pt-topbar-safe px-margin-mobile max-w-4xl mx-auto flex flex-col gap-md pb-[140px]',
        },
        [MonthNavigator(), banner, section],
      );

      root.innerHTML = '';
      root.appendChild(TopAppBar({ variant: 'default', subtitle: 'Histórico' }));
      root.appendChild(main);
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
