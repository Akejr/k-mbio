/**
 * Settings — credenciais de sincronização do widget (GitHub Gist).
 *
 * Guarda em `localStorage` o `gistId` e o `token` (PAT) usados para
 * publicar um resumo do mês corrente num Gist, que o widget Scriptable
 * no iPhone lê para renderizar.
 *
 * ## Segurança
 *
 * O PAT fica no `localStorage` da origem do app. Recomenda-se um token
 * **fine-grained** com escopo apenas de Gist e validade curta. O app não
 * carrega scripts de terceiros, então a superfície de XSS é mínima — mas o
 * usuário deve estar ciente de que qualquer pessoa com acesso ao navegador
 * desbloqueado poderia ler o token via DevTools.
 *
 * Pub/sub no mesmo padrão de `privacy.ts` / `monthSelector.ts`.
 */

const STORAGE_KEY = 'kwanza-profit:settings';

export interface WidgetSettings {
  /** ID do Gist (a parte após a barra na URL do gist). */
  gistId: string;
  /** Personal Access Token com escopo `gist`. */
  token: string;
}

type Listener = (settings: WidgetSettings) => void;

const listeners = new Set<Listener>();

function loadFromStorage(): WidgetSettings {
  const empty: WidgetSettings = { gistId: '', token: '' };
  if (typeof localStorage === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return empty;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      return {
        gistId: typeof obj['gistId'] === 'string' ? obj['gistId'] : '',
        token: typeof obj['token'] === 'string' ? obj['token'] : '',
      };
    }
  } catch {
    // corrupção → vazio
  }
  return empty;
}

let current = loadFromStorage();

export function getSettings(): WidgetSettings {
  return current;
}

/** `true` quando ambos os campos estão preenchidos. */
export function isSyncConfigured(): boolean {
  return current.gistId.trim().length > 0 && current.token.trim().length > 0;
}

export function saveSettings(next: WidgetSettings): void {
  current = {
    gistId: next.gistId.trim(),
    token: next.token.trim(),
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // storage cheio → mantém em memória
    }
  }
  for (const listener of [...listeners]) {
    try {
      listener(current);
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.error('[settings] listener lançou exceção:', cause);
    }
  }
}

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
