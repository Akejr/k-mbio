/**
 * Helpers DOM minimalistas usados pelos componentes de UI.
 *
 * Este módulo é **sem dependências**: só usa APIs de `document`/`HTMLElement`.
 * Ele existe para eliminar a repetição de `document.createElement` + atribuição
 * de atributos/filhos + `appendChild` em cada componente, mantendo a intenção
 * do código mais próxima do HTML que o designer escreveu.
 *
 * Regras importantes:
 *
 * - **Segurança:** valores de texto passados como filhos (`string`) são
 *   inseridos via `textContent`, nunca `innerHTML`. Dados do usuário
 *   (`customerName`, `id` de venda, etc.) podem ser renderizados sem risco
 *   de injeção.
 * - **Atributos booleanos** (`disabled`, `hidden`) podem ser passados via
 *   `attrs` com valor booleano: `true` aplica o atributo, `false` o remove.
 * - **Eventos:** qualquer chave `attrs` começando com `on` (ex.: `onClick`)
 *   é tratada como listener e registrada via `addEventListener` na forma
 *   lowercased do nome (ex.: `click`).
 *
 * A assinatura é propositadamente genérica para permitir tipagem precisa
 * quando o chamador passa a tag (ex.: `el('a', ...)` devolve `HTMLAnchorElement`).
 */

/** Tipo do conjunto de filhos aceitos por `el`. */
type Child = string | number | Node | null | undefined | false;

/**
 * Atributos aceitos por `el`. Além de atributos nomeados, qualquer chave
 * iniciada por `on` é registrada como listener (ex.: `onClick` → `click`).
 * O valor `boolean` em chaves de atributo liga/desliga o atributo sem valor.
 */
export type Attrs = Record<
  string,
  string | number | boolean | ((ev: Event) => void) | null | undefined
>;

/**
 * Cria um `HTMLElement` da tag `tag`, aplica `attrs` e anexa `children`.
 *
 * Convenções:
 *
 * - `class` aceita string com classes separadas por espaço.
 * - Propriedades com prefixo `on` (ex.: `onClick`) viram listeners via
 *   `addEventListener('click', ...)`.
 * - `null`/`undefined`/`false` em `children` são silenciosamente ignorados
 *   (facilita renderização condicional: `cond && el(...)`).
 *
 * @example
 * el('button', { class: 'btn', onClick: () => alert('oi') }, 'Clique');
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs,
  children?: Child | Child[],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (attrs) {
    for (const [key, raw] of Object.entries(attrs)) {
      if (raw === null || raw === undefined || raw === false) {
        continue;
      }
      if (key.startsWith('on') && typeof raw === 'function') {
        const event = key.slice(2).toLowerCase();
        node.addEventListener(event, raw as EventListener);
        continue;
      }
      if (raw === true) {
        node.setAttribute(key, '');
        continue;
      }
      node.setAttribute(key, String(raw));
    }
  }

  if (children !== undefined && children !== null) {
    const list = Array.isArray(children) ? children : [children];
    for (const child of list) {
      if (child === null || child === undefined || child === false) {
        continue;
      }
      if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(String(child)));
      } else {
        node.appendChild(child);
      }
    }
  }

  return node;
}

/**
 * Atalho para criar um `<span class="material-symbols-outlined">` com o
 * nome do ícone. Aceita classes extras (o nome da classe base é sempre
 * incluído). Opcionalmente, `filled === true` aplica `font-variation-settings`
 * para o ícone preenchido — usado pelo BottomNav para destacar o item ativo.
 */
export function icon(
  name: string,
  extraClass: string = '',
  filled: boolean = false,
): HTMLSpanElement {
  const span = el('span', {
    class: ('material-symbols-outlined ' + extraClass).trim(),
  });
  if (filled) {
    span.style.fontVariationSettings = "'FILL' 1";
  }
  span.textContent = name;
  return span;
}
