/**
 * Sincronização do resumo mensal para um GitHub Gist.
 *
 * O widget Scriptable (iPhone) lê o JSON publicado aqui. Calculamos o
 * resumo do **mês corrente** (não o mês selecionado na UI — o widget é
 * sempre sobre "agora"):
 *
 *   - `profitAoa`: lucro total do mês em AOA;
 *   - `byCurrency`: total vendido por moeda estrangeira no mês.
 *
 * A escrita usa a REST API do GitHub (`PATCH /gists/:id`), que suporta
 * CORS a partir do browser. O arquivo dentro do gist chama-se
 * `kambio-widget.json`.
 */

import type { Sale } from '../domain/sale';
import { calcularLucroTotal } from '../domain/profit';
import { FOREIGN_CURRENCIES, type CurrencyCode } from '../domain/currency';
import { getSettings, isSyncConfigured } from '../app/settings';

/** Nome do arquivo dentro do Gist. */
const GIST_FILENAME = 'kambio-widget.json';

export interface WidgetPayload {
  updatedAt: string;
  monthLabel: string;
  profitAoa: number;
  byCurrency: { code: CurrencyCode; amount: number }[];
}

/**
 * Constrói o payload do widget a partir das vendas, considerando o mês
 * corrente do dispositivo. Apenas vendas ativas (`deletedAt === null`).
 */
export function buildWidgetPayload(sales: readonly Sale[]): WidgetPayload {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const ofMonth = sales.filter((s) => {
    if (s.deletedAt !== null) return false;
    const d = new Date(s.createdAt);
    return d.getFullYear() === y && d.getMonth() === m;
  });

  const profitAoa = calcularLucroTotal(ofMonth);

  const byCurrency = FOREIGN_CURRENCIES.map((code) => {
    const amount = ofMonth
      .filter((s) => s.currency === code)
      .reduce((sum, s) => sum + s.amount, 0);
    return { code: code as CurrencyCode, amount };
  }).filter((entry) => entry.amount > 0);

  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
    .format(now)
    .replace(/\sde\s/i, ' ');

  return {
    updatedAt: now.toISOString(),
    monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    profitAoa,
    byCurrency,
  };
}

/**
 * Publica o payload no Gist configurado. Retorna `true` em sucesso.
 *
 * Silencioso por padrão (loga warnings). Não lança — chamadores fazem
 * fire-and-forget.
 */
export async function syncToGist(sales: readonly Sale[]): Promise<boolean> {
  if (!isSyncConfigured()) return false;
  const { gistId, token } = getSettings();
  const payload = buildWidgetPayload(sales);

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(payload, null, 2),
          },
        },
      }),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[gistSync] PATCH falhou: ${res.status} ${res.statusText}`);
      return false;
    }
    return true;
  } catch (cause) {
    // eslint-disable-next-line no-console
    console.warn('[gistSync] erro de rede ao publicar no Gist:', cause);
    return false;
  }
}

/**
 * Faz uma chamada de teste (GET) para validar credenciais — usado pelo
 * botão "Testar conexão" no modal de configurações.
 */
export async function testGistConnection(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (!isSyncConfigured()) {
    return { ok: false, reason: 'Preencha o Gist ID e o token.' };
  }
  const { gistId, token } = getSettings();
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 404) {
      return { ok: false, reason: 'Gist não encontrado (verifique o ID).' };
    }
    if (res.status === 401) {
      return { ok: false, reason: 'Token inválido ou sem permissão de Gist.' };
    }
    if (!res.ok) {
      return { ok: false, reason: `Erro ${res.status}.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Falha de rede.' };
  }
}
