/**
 * `ValidationMessage` — renderiza uma mensagem de erro de validação em
 * PT-BR para um `ValidationError` do domínio.
 *
 * Usado pelo `FormField` e pela `RegisterView` para traduzir os erros
 * estruturados retornados por `validateSaleInput` em texto humano. Mantém
 * a _look-and-feel_ coesa: `text-error` + `text-label-caps` com
 * `role="alert"` para anúncio por leitores de tela.
 *
 * Cobre os Requisitos 1.5 a 1.9 (mensagens de validação por campo).
 */

import type { ValidationError } from '../../domain/sale';
import { el } from './dom';

/** Props aceitos por `ValidationMessage`. */
export interface ValidationMessageProps {
  /** Erro a renderizar. A função é exaustiva sobre todas as variantes. */
  error: ValidationError;
}

/**
 * Mapeia um `ValidationError` para uma string em PT-BR.
 *
 * O `switch` combinado com `never` no ramo final garante exaustividade:
 * se uma nova variante for adicionada a `ValidationError`, o TypeScript
 * acusa falha de compilação aqui até que ela seja tratada.
 *
 * - `customerName.empty` — Req 1.5
 * - `currency.missing` / `currency.unsupported` — Req 1.6 / 1.2
 * - `amount.nonPositive` / `amount.notFinite` — Req 1.7
 * - `profitAoa.notFinite` / `profitAoa.negativeNotAllowed` — Req 1.8 / 1.9
 */
export function validationErrorToMessage(error: ValidationError): string {
  switch (error.field) {
    case 'customerName':
      return 'Nome do cliente é obrigatório.';
    case 'currency':
      return error.code === 'missing'
        ? 'Selecione uma moeda.'
        : 'Moeda não suportada.';
    case 'amount':
      return error.code === 'nonPositive'
        ? 'Quantidade deve ser maior que zero.'
        : 'Quantidade inválida.';
    case 'profitAoa':
      return error.code === 'notFinite'
        ? 'Lucro inválido.'
        : 'Lucro não pode ser negativo.';
    default: {
      // Exaustividade: todas as variantes acima retornaram; este ramo nunca
      // é alcançado em tempo de execução, mas força uma verificação de
      // tipo em compilação caso `ValidationError` seja estendido.
      const _exhaustive: never = error;
      void _exhaustive;
      return 'Campo inválido.';
    }
  }
}

/**
 * Cria e retorna um `<p role="alert">` com a mensagem traduzida.
 */
export function ValidationMessage(props: ValidationMessageProps): HTMLElement {
  const text = validationErrorToMessage(props.error);
  return el(
    'p',
    {
      role: 'alert',
      class: 'text-error font-label-caps text-label-caps mt-xs',
    },
    text,
  );
}
