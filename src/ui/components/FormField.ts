/**
 * `FormField` — campo de formulário com rótulo flutuante, ícone, foco
 * animado e slot de erro inline.
 *
 * ## Redesign moderno
 *
 * - Container com border suave que "glow" ao focar.
 * - Rótulo em caixa-alta pequena (`label-caps`) com tracking ampliado,
 *   coerente com o Design System.
 * - Ícone à esquerda colorido no foco; caret à direita nos selects.
 * - Input com `bg-surface-container-lowest` + transição 200ms nas bordas.
 * - Mensagem de erro anexada abaixo, com slide-down para aparecer suave.
 *
 * ## Requisitos cobertos
 *
 * - **Req 1.1** — quatro campos do formulário de cadastro.
 * - **Req 1.5–1.9** — slot de erro inline.
 * - **Req 9.3** — ícones Material Symbols Outlined.
 */

import type { ValidationError } from '../../domain/sale';
import { el, icon } from './dom';
import { ValidationMessage } from './ValidationMessage';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldProps {
  id: string;
  label: string;
  icon: string;
  type?: 'text' | 'number';
  placeholder?: string;
  step?: string;
  primary?: boolean;
  error?: ValidationError | null;
  kind?: 'input' | 'select';
  options?: readonly FormFieldOption[];
  suffix?: string;
}

export interface FormFieldResult {
  root: HTMLElement;
  input: HTMLInputElement | HTMLSelectElement;
}

export function FormField(props: FormFieldProps): FormFieldResult {
  const {
    id,
    label,
    icon: iconName,
    type = 'text',
    placeholder,
    step,
    primary = false,
    error,
    kind = 'input',
    options = [],
    suffix,
  } = props;

  // Classes base do input (mesmo para select).
  const baseField =
    'w-full bg-surface-container-lowest/80 rounded-xl py-3 pl-[48px] ' +
    'font-body-base text-[15px] placeholder:text-outline ' +
    'focus:outline-none transition-all duration-200 border backdrop-blur-md';

  const padRight = kind === 'select' ? 'pr-12' : suffix ? 'pr-14' : 'pr-4';
  const textClass = primary ? 'text-primary font-semibold' : 'text-on-surface';
  const borderClass = error
    ? 'border-error/70 focus:border-error focus:ring-2 focus:ring-error/30'
    : 'border-outline-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/30';

  let input: HTMLInputElement | HTMLSelectElement;
  if (kind === 'select') {
    const select = el('select', {
      id,
      class: `${baseField} ${borderClass} ${textClass} ${padRight} appearance-none cursor-pointer`,
    });
    if (options.length === 0 || options[0]?.value !== '') {
      const placeholderOpt = el(
        'option',
        { value: '', disabled: true, selected: true },
        'Selecione',
      );
      select.appendChild(placeholderOpt);
    }
    for (const opt of options) {
      select.appendChild(el('option', { value: opt.value }, opt.label));
    }
    input = select;
  } else {
    input = el('input', {
      id,
      type,
      placeholder: placeholder ?? '',
      step: step ?? null,
      inputmode: type === 'number' ? 'decimal' : null,
      class: `${baseField} ${borderClass} ${textClass} ${padRight}`,
    }) as HTMLInputElement;
  }

  const labelEl = el(
    'label',
    {
      for: id,
      class:
        'font-label-caps text-[11px] text-on-surface-variant uppercase tracking-[0.12em] pl-1',
    },
    label,
  );

  // Ícone à esquerda em caixinha arredondada — mais moderno.
  const leftIcon = el(
    'span',
    {
      class:
        'absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ' +
        'flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 ' +
        (error ? 'text-error' : 'text-primary'),
    },
    icon(iconName, 'text-[18px]'),
  );

  const wrapperChildren: HTMLElement[] = [leftIcon, input];

  if (kind === 'select') {
    wrapperChildren.push(
      icon(
        'expand_more',
        'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant',
      ),
    );
  } else if (suffix) {
    wrapperChildren.push(
      el(
        'span',
        {
          class:
            'absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant',
        },
        suffix,
      ),
    );
  }

  const inputWrapper = el('div', { class: 'relative' }, wrapperChildren);

  const root = el('div', { class: 'flex flex-col gap-2' }, [labelEl, inputWrapper]);

  if (error) {
    root.appendChild(ValidationMessage({ error }));
  }

  return { root, input };
}
