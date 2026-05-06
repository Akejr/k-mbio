/**
 * `HistoryView` — tela dedicada ao Histórico_de_Vendas com swipe-to-delete.
 *
 * Mesmo padrão da DashboardView mas sem o card de Lucro_Total; traz
 * banner-resumo minimalista no topo. Itens são `SwipeableSaleItem`.
 *
 * Cobre Req 3.1–3.7, 10.3.
 */

import type { Store } from '../../app/store';
import type { AppState } from '../../app/state';
import type { Mount } from '../../app/router';
import type { SalesRepository } from '../../infra/salesRepository';
import { calcularLucroTotal } from '../../domain/profit';
import { formatCurrency } from '../../domain/formatter';
import { deleteSale, restoreSale } from '../../app/actions';
import { el, icon } from '../components/dom';
import { TopAppBar } from '../components/TopAppBar';
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
      const count = state.sales.filter((s) => s.deletedAt === null).length;
      const total = calcularLucroTotal(state.sales);

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
                    'Total de vendas',
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
                'Lucro acumulado',
              ),
              el(
                'span',
                {
                  class:
                    'font-data-mono text-[16px] text-primary font-bold tracking-tight',
                },
                formatCurrency(total, 'AOA'),
              ),
            ],
          ),
        ],
      );

      let body: HTMLElement;
      if (state.sales.length === 0) {
        body = EmptyState();
      } else {
        body = el(
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

      const titleRow = el(
        'div',
        { class: 'flex items-baseline justify-between' },
        [
          el(
            'h3',
            { class: 'font-headline-md text-[20px] text-on-surface font-bold' },
            'Histórico de Vendas',
          ),
          el(
            'span',
            {
              class:
                'font-label-caps text-[10px] text-on-surface-variant uppercase tracking-[0.15em]',
            },
            'Arraste para excluir',
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
            'pt-topbar-safe px-margin-mobile max-w-4xl mx-auto flex flex-col gap-lg pb-[140px]',
        },
        [banner, section],
      );

      root.innerHTML = '';
      root.appendChild(TopAppBar({ variant: 'default', subtitle: 'Histórico' }));
      root.appendChild(main);
    };

    const unsub = store.subscribe(render);
    render();
    return () => {
      unsub();
    };
  };
}
