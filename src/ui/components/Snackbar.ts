/**
 * `Snackbar` — toast singleton com ação opcional (ex.: "Desfazer").
 *
 * Fica fixado no rodapé, acima da BottomNav em mobile e centralizado em
 * desktop. Anima entrada (`slide-up`) e saída (`fade-out`). Um único
 * snackbar é exibido por vez; chamadas subsequentes substituem o atual
 * imediatamente (cancela o timer anterior).
 *
 * Acessibilidade: usa `role="status"` + `aria-live="polite"` para que
 * leitores de tela anunciem a mensagem sem roubar foco.
 */

import { el, icon } from './dom';

interface SnackbarAction {
  label: string;
  onClick: () => void;
}

interface SnackbarApi {
  show(message: string, action?: SnackbarAction, durationMs?: number): void;
  hide(): void;
}

let instance: SnackbarApi | null = null;

export function mountSnackbar(): SnackbarApi {
  const container = el('div', {
    class:
      'fixed left-1/2 -translate-x-1/2 bottom-[100px] md:bottom-8 z-[60] ' +
      'pointer-events-none opacity-0 translate-y-4 transition-all duration-300 ease-out',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });

  document.body.appendChild(container);

  let currentTimer: number | null = null;

  const render = (message: string, action: SnackbarAction | undefined): void => {
    container.innerHTML = '';

    const iconEl = icon('check_circle', 'text-primary text-[20px] filled');
    const messageEl = el(
      'span',
      {
        class:
          'font-body-base text-[14px] text-on-surface leading-tight',
      },
      message,
    );

    const children: HTMLElement[] = [
      el(
        'div',
        { class: 'flex items-center gap-sm flex-1' },
        [iconEl, messageEl],
      ),
    ];

    if (action) {
      const actionBtn = el(
        'button',
        {
          type: 'button',
          class:
            'press-scale px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 ' +
            'text-primary font-label-caps text-[11px] uppercase tracking-[0.15em] font-bold ' +
            'hover:bg-primary/25 transition-colors',
          onClick: () => {
            try {
              action.onClick();
            } finally {
              hide();
            }
          },
        },
        action.label,
      );
      children.push(actionBtn);
    }

    const card = el(
      'div',
      {
        class:
          'pointer-events-auto flex items-center gap-md ' +
          'bg-surface-container-high/95 backdrop-blur-xl ' +
          'rounded-2xl border border-outline-variant/60 ' +
          'shadow-[0_16px_40px_rgba(0,0,0,0.5)] ' +
          'px-md py-3 min-w-[280px] max-w-[400px]',
      },
      children,
    );

    container.appendChild(card);
  };

  const show = (
    message: string,
    action?: SnackbarAction,
    durationMs: number = 5000,
  ): void => {
    if (currentTimer !== null) {
      window.clearTimeout(currentTimer);
      currentTimer = null;
    }
    render(message, action);
    // Força reflow antes de animar para garantir transição confiável.
    void container.offsetWidth;
    container.classList.remove('opacity-0', 'translate-y-4');
    container.classList.add('opacity-100', 'translate-y-0');

    currentTimer = window.setTimeout(() => {
      hide();
    }, durationMs);
  };

  const hide = (): void => {
    if (currentTimer !== null) {
      window.clearTimeout(currentTimer);
      currentTimer = null;
    }
    container.classList.remove('opacity-100', 'translate-y-0');
    container.classList.add('opacity-0', 'translate-y-4');
  };

  instance = { show, hide };
  return instance;
}

/**
 * Atalho global para emitir um snackbar. `mountSnackbar` deve ter sido
 * chamado (tipicamente em `main.ts`).
 */
export function showSnackbar(
  message: string,
  action?: SnackbarAction,
  durationMs?: number,
): void {
  if (!instance) {
    // Fallback silencioso em contextos sem bootstrap (testes unitários).
    // eslint-disable-next-line no-console
    console.warn('[snackbar] mountSnackbar() não foi chamado; mensagem ignorada:', message);
    return;
  }
  instance.show(message, action, durationMs);
}
