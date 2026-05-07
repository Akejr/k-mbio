/**
 * Privacy toggle — esconde valores monetários sensíveis (Lucro Total e
 * lucro por transação) atrás de um blur.
 *
 * ## Persistência
 *
 * O estado é guardado em `localStorage` na chave `kwanza-profit:privacy`
 * (JSON com `{ hidden: boolean }`). Assim, ao fechar e reabrir o PWA, o
 * app respeita a última escolha do operador — útil quando ele trabalha
 * em público e prefere sempre deixar valores ocultos por padrão.
 *
 * ## Broadcast
 *
 * Em vez de depender do `Store<AppState>` (que mistura privacidade com
 * estado de domínio), exportamos um pub/sub mínimo. Assim qualquer
 * componente pode se inscrever sem precisar atualizar tipos do estado.
 */

const STORAGE_KEY = 'kwanza-profit:privacy';

type Listener = (hidden: boolean) => void;

const listeners = new Set<Listener>();
let currentHidden = loadFromStorage();

function loadFromStorage(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'hidden' in parsed &&
      typeof (parsed as { hidden: unknown }).hidden === 'boolean'
    ) {
      return (parsed as { hidden: boolean }).hidden;
    }
  } catch {
    // Ignora corrupção — padrão é `false` (visível).
  }
  return false;
}

function saveToStorage(hidden: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hidden }));
  } catch {
    // Se storage estiver cheio, manter o toggle só em memória.
  }
}

/**
 * Aplica o atributo `data-privacy` no `<html>`. Componentes que querem
 * reagir sem `subscribe` podem usar seletores CSS:
 *
 *   [data-privacy="hidden"] .privacy-target { filter: blur(10px); }
 *
 * Preferimos o seletor global para animar com transição CSS nativa em
 * todos os alvos simultaneamente, sem precisar recriar DOM.
 */
function applyToDocument(hidden: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset['privacy'] = hidden ? 'hidden' : 'visible';
}

applyToDocument(currentHidden);

/**
 * Estado atual (leitura síncrona).
 */
export function isPrivacyHidden(): boolean {
  return currentHidden;
}

/**
 * Inscreve um listener; devolve função de `unsubscribe`.
 */
export function subscribePrivacy(listener: Listener): () => void {
  listeners.add(listener);
  // Invoca imediatamente com o estado atual para simplificar o chamador.
  listener(currentHidden);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Alterna o estado; retorna o novo valor.
 */
export function togglePrivacy(): boolean {
  const next = !currentHidden;
  currentHidden = next;
  saveToStorage(next);
  applyToDocument(next);
  for (const listener of [...listeners]) {
    try {
      listener(next);
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.error('[privacy] listener lançou exceção:', cause);
    }
  }
  return next;
}
