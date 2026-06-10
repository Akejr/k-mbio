/**
 * `SettingsModal` — overlay com as credenciais de sincronização do widget.
 *
 * Campos:
 *   - Gist ID (texto)
 *   - GitHub Token (password, mascarado)
 *
 * Ações:
 *   - Salvar
 *   - Testar conexão (GET no gist)
 *   - Sincronizar agora (PATCH imediato com as vendas atuais)
 *
 * Acessibilidade: `role="dialog"`, `aria-modal`, foco inicial no primeiro
 * campo, fecha no Esc e no clique fora.
 */

import type { Store } from '../../app/store';
import type { AppState } from '../../app/state';
import { getSettings, saveSettings } from '../../app/settings';
import { syncToGist, testGistConnection } from '../../infra/gistSync';
import { el, icon } from './dom';

export function openSettingsModal(store: Store<AppState>): void {
  const existing = document.getElementById('settings-modal');
  if (existing) return;

  const current = getSettings();

  const gistInput = el('input', {
    id: 'cfg-gist',
    type: 'text',
    value: current.gistId,
    placeholder: 'ex.: 3a7f2c9e1b...',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    class:
      'w-full bg-surface-container-lowest/80 rounded-xl py-3 px-4 font-data-mono text-[16px] text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all',
  }) as HTMLInputElement;

  const tokenInput = el('input', {
    id: 'cfg-token',
    type: 'password',
    value: current.token,
    placeholder: 'github_pat_...',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    class:
      'w-full bg-surface-container-lowest/80 rounded-xl py-3 px-4 font-data-mono text-[16px] text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all',
  }) as HTMLInputElement;

  const status = el('p', {
    class: 'text-[13px] text-on-surface-variant min-h-[18px] text-center',
    role: 'status',
  });

  const setStatus = (msg: string, kind: 'ok' | 'err' | 'info'): void => {
    status.textContent = msg;
    status.className =
      'text-[13px] min-h-[18px] text-center ' +
      (kind === 'ok'
        ? 'text-primary'
        : kind === 'err'
          ? 'text-error'
          : 'text-on-surface-variant');
  };

  const field = (
    labelText: string,
    hint: string,
    input: HTMLInputElement,
  ): HTMLElement =>
    el('div', { class: 'flex flex-col gap-1.5' }, [
      el(
        'label',
        {
          for: input.id,
          class:
            'font-label-caps text-[11px] text-on-surface-variant uppercase tracking-[0.12em] pl-1',
        },
        labelText,
      ),
      input,
      el(
        'span',
        { class: 'text-[11px] text-on-surface-variant/70 pl-1' },
        hint,
      ),
    ]);

  const close = (): void => {
    overlay.classList.add('opacity-0');
    card.classList.add('scale-95', 'opacity-0');
    window.setTimeout(() => overlay.remove(), 200);
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') close();
  };

  const saveBtn = el(
    'button',
    {
      type: 'button',
      class:
        'press-scale flex-1 bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-label-caps text-[12px] uppercase tracking-[0.12em] font-bold py-3 rounded-full shadow-[0_8px_20px_rgba(78,222,163,0.3)]',
      onClick: () => {
        saveSettings({ gistId: gistInput.value, token: tokenInput.value });
        setStatus('Salvo. Sincronizando…', 'info');
        void syncToGist(store.get().sales).then((ok) => {
          setStatus(
            ok ? 'Salvo e sincronizado com sucesso.' : 'Salvo, mas a sincronização falhou.',
            ok ? 'ok' : 'err',
          );
        });
      },
    },
    'Salvar',
  );

  const testBtn = el(
    'button',
    {
      type: 'button',
      class:
        'press-scale flex-1 bg-surface-container-high/70 border border-outline-variant/50 text-on-surface font-label-caps text-[12px] uppercase tracking-[0.12em] font-bold py-3 rounded-full',
      onClick: () => {
        saveSettings({ gistId: gistInput.value, token: tokenInput.value });
        setStatus('Testando…', 'info');
        void testGistConnection().then((r) => {
          setStatus(r.ok ? 'Conexão OK!' : r.reason, r.ok ? 'ok' : 'err');
        });
      },
    },
    'Testar',
  );

  const closeBtn = el(
    'button',
    {
      type: 'button',
      'aria-label': 'Fechar',
      class:
        'absolute top-3 right-3 flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-variant/50 transition-colors',
      onClick: close,
    },
    icon('close', 'text-[20px]'),
  );

  const header = el('div', { class: 'flex items-center gap-sm mb-1' }, [
    el(
      'span',
      {
        class:
          'flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 border border-primary/25',
      },
      icon('widgets', 'text-primary text-[20px]'),
    ),
    el('div', { class: 'flex flex-col' }, [
      el(
        'h2',
        { class: 'font-headline-md text-[18px] text-on-surface font-bold' },
        'Widget & Sync',
      ),
      el(
        'span',
        { class: 'text-[12px] text-on-surface-variant' },
        'Conecte um Gist para o widget do iPhone',
      ),
    ]),
  ]);

  const card = el(
    'div',
    {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Configurações do widget',
      class:
        'relative w-full max-w-md bg-surface-container/95 backdrop-blur-xl rounded-3xl border border-outline-variant/50 shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-lg flex flex-col gap-md transition-all duration-200 scale-95 opacity-0',
    },
    [
      closeBtn,
      header,
      field('Gist ID', 'A parte final da URL do seu gist.', gistInput),
      field('GitHub Token', 'PAT fine-grained com escopo apenas de Gist.', tokenInput),
      status,
      el('div', { class: 'flex gap-sm mt-1' }, [testBtn, saveBtn]),
    ],
  );

  const overlay = el(
    'div',
    {
      id: 'settings-modal',
      class:
        'fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-margin-mobile bg-black/60 backdrop-blur-sm transition-opacity duration-200 opacity-0',
      onClick: (ev: Event) => {
        if (ev.target === overlay) close();
      },
    },
    card,
  );

  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey);

  // Animação de entrada (próximo frame).
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    card.classList.remove('scale-95', 'opacity-0');
  });

  gistInput.focus();
}
