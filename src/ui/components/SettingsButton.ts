/**
 * `SettingsButton` — engrenagem no header que abre o modal de configurações
 * do widget/sync. Fica ao lado do `PrivacyToggle`.
 *
 * O `Store` é injetado via `setSettingsStore` no bootstrap (`main.ts`),
 * evitando alterar a assinatura do `TopAppBar` (que é instanciado pelas
 * três views sem acesso direto ao store).
 */

import type { Store } from '../../app/store';
import type { AppState } from '../../app/state';
import { openSettingsModal } from './SettingsModal';
import { el, icon } from './dom';

let storeRef: Store<AppState> | null = null;

/** Registra o store usado pelo modal. Chamado uma vez no bootstrap. */
export function setSettingsStore(store: Store<AppState>): void {
  storeRef = store;
}

export function SettingsButton(): HTMLButtonElement {
  const gear = icon('settings', 'text-[20px] transition-transform duration-300');

  const button = el(
    'button',
    {
      type: 'button',
      'aria-label': 'Configurações',
      class:
        'press-scale flex items-center justify-center w-10 h-10 rounded-full ' +
        'bg-surface-container-high/60 border border-outline-variant/50 ' +
        'text-on-surface-variant hover:text-on-surface transition-colors duration-200',
      onClick: () => {
        gear.style.transform = 'rotate(90deg)';
        window.setTimeout(() => (gear.style.transform = 'rotate(0deg)'), 300);
        if (storeRef) openSettingsModal(storeRef);
      },
    },
    gear,
  ) as HTMLButtonElement;

  return button;
}
