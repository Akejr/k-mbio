/**
 * `RegisterView` — formulário de cadastro de venda, redesenhado.
 *
 * - Card de formulário com glassmorphism reforçado.
 * - Seletor de moeda em **pills** horizontais com bandeiras (tap-target
 *   amplo, feedback claro do item selecionado) — substitui o `<select>`
 *   nativo, que era pouco expressivo no mobile. O wrapper segue usando
 *   `FormField`s para os demais campos.
 * - Botão primário em gradiente esmeralda com press-scale.
 * - Loading state: ao submeter, botão mostra spinner e desabilita o form.
 *
 * Cobre Req 1.1–1.10.
 */

import type { Store } from '../../app/store';
import type { AppState } from '../../app/state';
import type { Mount } from '../../app/router';
import type { SalesRepository } from '../../infra/salesRepository';
import type { ValidationError } from '../../domain/sale';
import { createSale } from '../../app/actions';
import { navigate } from '../../app/router';
import { FOREIGN_CURRENCIES } from '../../domain/currency';
import type { CurrencyCode } from '../../domain/currency';
import { el, icon } from '../components/dom';
import { FormField } from '../components/FormField';
import { TopAppBar } from '../components/TopAppBar';
import { ValidationMessage } from '../components/ValidationMessage';
import { CurrencyBadge } from '../components/currencyBadge';

const CURRENCY_LABELS: Record<(typeof FOREIGN_CURRENCIES)[number], string> = {
  USD: 'Dólar (USD)',
  EUR: 'Euro (EUR)',
  GBP: 'Libra (GBP)',
  ZAR: 'Rand (ZAR)',
};

export function RegisterView(
  store: Store<AppState>,
  repo: SalesRepository,
): Mount {
  return (root: HTMLElement): (() => void) => {
    let unmounted = false;
    let selectedCurrency: Exclude<CurrencyCode, 'AOA'> | null = null;

    // --- Seletor de moeda em pills ---
    const currencyPills: Array<{ btn: HTMLButtonElement; code: Exclude<CurrencyCode, 'AOA'> }> = [];
    const currencyErrorSlot = el('div', { class: 'min-h-[0px]' });

    const updatePillStyles = (): void => {
      for (const { btn, code } of currencyPills) {
        const active = code === selectedCurrency;
        btn.classList.toggle('bg-primary/15', active);
        btn.classList.toggle('border-primary/50', active);
        btn.classList.toggle('text-primary', active);
        btn.classList.toggle('bg-surface-container-lowest/70', !active);
        btn.classList.toggle('border-outline-variant/50', !active);
        btn.classList.toggle('text-on-surface-variant', !active);
        btn.setAttribute('aria-pressed', String(active));
      }
    };

    const currencyPicker = el(
      'div',
      {
        class: 'flex flex-col gap-2',
      },
      [
        el(
          'span',
          {
            class:
              'font-label-caps text-[11px] text-on-surface-variant uppercase tracking-[0.12em] pl-1',
          },
          'Moeda',
        ),
        el(
          'div',
          {
            class: 'grid grid-cols-4 gap-2',
            role: 'radiogroup',
            'aria-label': 'Selecionar moeda',
          },
          FOREIGN_CURRENCIES.map((code) => {
            const badge = CurrencyBadge(code, 28);
            const label = el(
              'span',
              {
                class: 'font-label-caps text-[11px] font-semibold tracking-wider',
              },
              code,
            );
            const btn = el(
              'button',
              {
                type: 'button',
                role: 'radio',
                'aria-label': CURRENCY_LABELS[code],
                class:
                  'press-scale flex flex-col items-center justify-center gap-1 py-3 rounded-xl border backdrop-blur-md transition-colors duration-200 ' +
                  'bg-surface-container-lowest/70 border-outline-variant/50 text-on-surface-variant',
                onClick: () => {
                  selectedCurrency = code;
                  updatePillStyles();
                  // Limpa erro de currency se houver.
                  currencyErrorSlot.innerHTML = '';
                },
              },
              [badge, label],
            ) as HTMLButtonElement;
            currencyPills.push({ btn, code });
            return btn;
          }),
        ),
        currencyErrorSlot,
      ],
    );
    updatePillStyles();

    // --- Demais campos ---
    const nameField = FormField({
      id: 'customer_name',
      label: 'Nome do Cliente',
      icon: 'person',
      placeholder: 'Ex.: João Silva',
    });

    const amountField = FormField({
      id: 'amount',
      label: 'Quantidade Vendida',
      icon: 'payments',
      type: 'number',
      step: '0.01',
      placeholder: '0.00',
    });

    const profitField = FormField({
      id: 'profit',
      label: 'Lucro (AOA)',
      icon: 'trending_up',
      type: 'number',
      step: '1',
      placeholder: '0',
      primary: true,
      suffix: 'AOA',
    });

    type FieldKey = Exclude<ValidationError['field'], 'currency'>;
    const fieldsByName: Record<
      FieldKey,
      { root: HTMLElement; input: HTMLInputElement | HTMLSelectElement }
    > = {
      customerName: nameField,
      amount: amountField,
      profitAoa: profitField,
    };

    // --- Botão Salvar com spinner ---
    const saveSpinner = el('span', {
      class: 'animate-spin-slow w-4 h-4 rounded-full border-2 border-on-primary/30 border-t-on-primary hidden',
      'aria-hidden': 'true',
    });
    const saveIcon = icon('save', 'text-[18px] filled');
    const saveText = document.createTextNode('Salvar Registro');

    const saveButton = el(
      'button',
      {
        type: 'submit',
        class:
          'press-scale w-full bg-gradient-to-r from-primary-fixed via-primary to-primary-container ' +
          'text-on-primary font-label-caps text-[12px] uppercase tracking-[0.15em] font-bold ' +
          'py-4 rounded-full flex items-center justify-center gap-sm ' +
          'shadow-[0_12px_28px_rgba(78,222,163,0.35)] hover:shadow-[0_16px_40px_rgba(78,222,163,0.5)] transition-shadow ' +
          'disabled:opacity-70 disabled:cursor-not-allowed',
      },
      [saveSpinner, saveIcon, saveText],
    ) as HTMLButtonElement;

    // --- Grid 2 colunas em md+ ---
    const grid = el(
      'div',
      { class: 'grid grid-cols-1 md:grid-cols-2 gap-md' },
      [amountField.root, profitField.root],
    );

    // --- Card de formulário ---
    const formCard = el(
      'form',
      {
        class:
          'bg-surface-container/70 backdrop-blur-xl rounded-3xl ' +
          'border border-outline-variant/50 ' +
          'shadow-[0_24px_64px_-20px_rgba(0,0,0,0.5)] ' +
          'p-lg flex flex-col gap-md animate-slide-up',
        onSubmit: (ev: Event) => {
          ev.preventDefault();
          void handleSubmit();
        },
      },
      [nameField.root, currencyPicker, grid, saveButton],
    );

    // --- Cabeçalho da view ---
    const headerTitle = el(
      'h1',
      {
        class:
          'font-display-lg text-[32px] md:text-[40px] text-on-surface font-extrabold tracking-tight leading-tight',
      },
      'Nova Venda',
    );
    const headerSubtitle = el(
      'p',
      {
        class:
          'font-body-base text-[14px] text-on-surface-variant mt-1',
      },
      'Preencha os detalhes da transação abaixo.',
    );
    const header = el(
      'div',
      { class: 'mb-md animate-slide-down' },
      [headerTitle, headerSubtitle],
    );

    const main = el(
      'main',
      {
        class:
          'pt-[96px] pb-[140px] px-margin-mobile max-w-2xl mx-auto w-full',
      },
      [header, formCard],
    );

    root.innerHTML = '';
    root.appendChild(TopAppBar({ variant: 'back', subtitle: 'Cadastrar' }));
    root.appendChild(main);

    // --- Helpers ---
    const coletarInput = (): unknown => {
      return {
        customerName: nameField.input.value,
        currency: selectedCurrency ?? '',
        amount: amountField.input.value,
        profitAoa: profitField.input.value,
      };
    };

    const limparErros = (): void => {
      for (const field of Object.values(fieldsByName)) {
        const alerts = field.root.querySelectorAll('[role="alert"]');
        alerts.forEach((node) => node.remove());
      }
      currencyErrorSlot.innerHTML = '';
    };

    const mostrarErros = (errors: readonly ValidationError[]): void => {
      const vistos: Partial<Record<ValidationError['field'], true>> = {};
      for (const err of errors) {
        if (vistos[err.field]) continue;
        vistos[err.field] = true;

        if (err.field === 'currency') {
          currencyErrorSlot.innerHTML = '';
          currencyErrorSlot.appendChild(ValidationMessage({ error: err }));
        } else {
          const key = err.field;
          fieldsByName[key].root.appendChild(ValidationMessage({ error: err }));
        }
      }
    };

    const setLoading = (loading: boolean): void => {
      saveButton.disabled = loading;
      if (loading) {
        saveSpinner.classList.remove('hidden');
        saveIcon.classList.add('hidden');
      } else {
        saveSpinner.classList.add('hidden');
        saveIcon.classList.remove('hidden');
      }
    };

    const handleSubmit = async (): Promise<void> => {
      if (unmounted) return;
      limparErros();
      setLoading(true);
      try {
        const input = coletarInput();
        const sale = await createSale(input, store, repo);
        if (unmounted) return;
        if (sale !== null) {
          navigate('#/dashboard');
          return;
        }
        const current = store.get();
        if (current.validationErrors.length > 0) {
          mostrarErros(current.validationErrors);
        }
      } finally {
        if (!unmounted) {
          setLoading(false);
        }
      }
    };

    return () => {
      unmounted = true;
    };
  };
}
