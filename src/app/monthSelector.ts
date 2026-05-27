/**
 * Month selector — controla qual mês está sendo visualizado no Dashboard
 * e no Histórico. Ao reabrir o app, o mês selecionado sempre volta para
 * o mês corrente (não persistimos a seleção em storage; a navegação entre
 * meses é uma exploração casual, não uma preferência duradoura).
 *
 * ## Modelo
 *
 * O mês é representado como `{ year, month }` onde `month` é 0-indexado
 * (compatível com `Date.getMonth()`). Comparações usam `isSameMonth` para
 * evitar bugs de comparação por referência.
 *
 * ## Pub/sub
 *
 * Mesmo padrão de `privacy.ts`: listeners recebem o estado atual ao se
 * subscrever (simplifica chamadores) e a cada mudança subsequente.
 */

export interface MonthSelection {
  /** Ano completo (ex.: 2025). */
  year: number;
  /** Mês 0-indexado (0 = janeiro, 11 = dezembro), compatível com `Date`. */
  month: number;
}

type Listener = (sel: MonthSelection) => void;

const listeners = new Set<Listener>();

function currentMonth(): MonthSelection {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

let selected: MonthSelection = currentMonth();

export function isSameMonth(a: MonthSelection, b: MonthSelection): boolean {
  return a.year === b.year && a.month === b.month;
}

export function isCurrentMonth(sel: MonthSelection): boolean {
  return isSameMonth(sel, currentMonth());
}

export function timestampBelongsTo(
  timestampMs: number,
  sel: MonthSelection,
): boolean {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === sel.year && date.getMonth() === sel.month;
}

export function getSelectedMonth(): MonthSelection {
  return selected;
}

export function subscribeMonth(listener: Listener): () => void {
  listeners.add(listener);
  listener(selected);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of [...listeners]) {
    try {
      listener(selected);
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.error('[monthSelector] listener lançou exceção:', cause);
    }
  }
}

export function setMonth(next: MonthSelection): void {
  if (isSameMonth(selected, next)) return;
  selected = next;
  notify();
}

export function prevMonth(): void {
  const { year, month } = selected;
  if (month === 0) {
    setMonth({ year: year - 1, month: 11 });
  } else {
    setMonth({ year, month: month - 1 });
  }
}

/** Bloqueia se já estamos no mês corrente — não exibimos o futuro. */
export function nextMonth(): void {
  if (isCurrentMonth(selected)) return;
  const { year, month } = selected;
  if (month === 11) {
    setMonth({ year: year + 1, month: 0 });
  } else {
    setMonth({ year, month: month + 1 });
  }
}

export function jumpToCurrentMonth(): void {
  setMonth(currentMonth());
}

/**
 * Formata a seleção como rótulo legível em PT-BR (ex.: "Outubro 2025").
 */
export function formatMonthLabel(sel: MonthSelection): string {
  const date = new Date(sel.year, sel.month, 1);
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  const raw = fmt.format(date);
  // Remove o "de" entre mês e ano para encurtar ("Outubro 2025").
  const cleaned = raw.replace(/\sde\s/i, ' ');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
