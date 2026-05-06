/**
 * Formatador_de_Moeda — formatação e parse de valores monetários por moeda.
 *
 * Este módulo é **puro**: sem I/O, sem dependências de storage, sem efeitos
 * colaterais. Expõe duas funções complementares:
 *
 * - `formatCurrency(value, code, opts?)` — produz a string de exibição de
 *   `value` para a moeda `code`, respeitando símbolo, posição, separadores e
 *   casas decimais declarados em `CURRENCY_META` (Requisito 8). Suporta sinal
 *   negativo e, opcionalmente, sinal positivo explícito (`opts.signed`).
 * - `parseCurrency(text, code)` — reverte `formatCurrency`: aceita qualquer
 *   string produzida pelo próprio formatador e devolve o número original;
 *   retorna `null` para entradas que não casam o formato canônico.
 *
 * ## Requisitos cobertos
 *
 * - **Req 8.1** — AOA: sufixo " AOA", separador de milhar ".", sem decimais.
 * - **Req 8.2** — USD: prefixo "$", 2 casas.
 * - **Req 8.3** — EUR: prefixo "€", 2 casas.
 * - **Req 8.4** — GBP: prefixo "£", 2 casas.
 * - **Req 8.5** — ZAR: prefixo "ZAR ", 2 casas.
 * - **Req 8.6** — round-trip numérico: `|parse(format(v, m)) − v| ≤ 10⁻ᶠᵐ`.
 * - **Req 8.7** — preservação de sinal: "-" antes do símbolo em negativos.
 * - **Req 2.5** — card de Lucro_Total formata via este módulo em AOA.
 * - **Req 3.7** — item do Histórico_de_Vendas usa `opts.signed === true`
 *   para prefixar "+" em lucros positivos.
 *
 * ## Propriedades garantidas pela implementação
 *
 * As propriedades abaixo são exercitadas pelos PBTs em
 * `tests/properties/formatter.property.test.ts` (Tasks 6.4–6.6). Aqui
 * apenas documentamos como a implementação as satisfaz.
 *
 * ### P12 — Forma estrutural por moeda (Req 8.1–8.5)
 *
 * Para toda `(v, m)` finita:
 *
 * - `m === 'AOA'` — `formatCurrency(v, m)` termina em `" AOA"`, tem 0 casas
 *   decimais e usa `"."` como separador de milhar.
 * - `m ∈ {'USD','EUR','GBP'}` — começa com o símbolo (ou `"-<símbolo>"`),
 *   tem exatamente 2 casas decimais, separador de milhar `","` e decimal
 *   `"."`.
 * - `m === 'ZAR'` — começa com `"ZAR "` (ou `"-ZAR "`), demais regras como
 *   USD/EUR/GBP.
 *
 * ### P13 — Round-trip numérico (Req 8.6)
 *
 * Para todo `v` finito e `m` suportada:
 *
 *     |parseCurrency(formatCurrency(v, m), m) − v| ≤ 10⁻ᶠᵐ
 *
 * onde `fm = 0` para AOA e `fm = 2` para as demais. A implementação satisfaz
 * isto porque:
 *
 * 1. `formatCurrency` arredonda `|v|` para `fractionDigits` casas via
 *    `Number.prototype.toFixed`, o que introduz erro máximo `0.5 · 10⁻ᶠᵐ`.
 * 2. `parseCurrency` remove símbolo, sinal e separadores de milhar, e
 *    converte o separador decimal para `"."`, produzindo o mesmo número
 *    arredondado (± erro inerente de IEEE 754, desprezível nesse domínio).
 *
 * ### P14 — Preservação de sinal (Req 8.7, 3.7)
 *
 * Para toda `(v, m)`:
 *
 * - `v < 0` ⇒ `formatCurrency(v, m)` começa com `"-"`;
 * - `v > 0` e `opts.signed === true` ⇒ começa com `"+"`;
 * - `v === 0` (incluindo `-0`) ⇒ não começa com `"-"` nem `"+"`.
 *
 * Negativos posicionam o sinal **antes** do símbolo em moedas prefixadas
 * (`-$10.00`, `-€5.00`, `-ZAR 100.00`) e no **início da string inteira** em
 * moedas sufixadas (`-1.000 AOA`, `+1.000 AOA`).
 */

import { CURRENCY_META, type CurrencyCode } from './currency';

/**
 * Opções de `formatCurrency`.
 */
export interface FormatCurrencyOptions {
  /**
   * Quando `true`, valores estritamente positivos recebem prefixo `"+"`
   * (antes do símbolo em moedas prefixadas, no início da string em
   * sufixadas). Valores zero nunca recebem sinal. O padrão é `false`.
   *
   * Usado pelo `SaleListItem` para destacar lucros positivos em AOA
   * (Requisito 3.7).
   */
  signed?: boolean;
}

/**
 * Formata um valor numérico para exibição na moeda `code`.
 *
 * Regras (ver `CURRENCY_META` e Requisito 8):
 *
 * | Moeda | Forma                      | Exemplo       |
 * | ----- | -------------------------- | ------------- |
 * | AOA   | `<n> AOA` (0 casas, `.`)   | `1.234.567 AOA` |
 * | USD   | `$<n>` (2 casas, `,`/`.`)  | `$1,234.50`   |
 * | EUR   | `€<n>` (2 casas, `,`/`.`)  | `€1,234.50`   |
 * | GBP   | `£<n>` (2 casas, `,`/`.`)  | `£1,234.50`   |
 * | ZAR   | `ZAR <n>` (2 casas, `,`/`.`) | `ZAR 15,000.00` |
 *
 * Sinal (Requisito 8.7):
 *
 * - `v < 0`: prefixo `"-"`. Em moedas prefixadas, o `"-"` vai antes do
 *   símbolo (`-$10.00`, `-€5.00`, `-ZAR 100.00`). Em moedas sufixadas, o
 *   `"-"` vai no início da string inteira (`-10 AOA`).
 * - `v > 0` + `opts.signed === true`: adiciona `"+"` nas mesmas posições
 *   (`+$10.00`, `+1.000 AOA`).
 * - `v === 0` (e `-0`): nenhum sinal.
 *
 * A função é pura e determinística. Assume `value` finito; entradas
 * não-finitas (`NaN`, `±Infinity`) não são exercitadas pelas propriedades e
 * podem produzir strings de pouco valor semântico (`"$NaN"`).
 *
 * @param value Valor numérico finito a formatar.
 * @param code  Código da moeda suportada (chave de `CURRENCY_META`).
 * @param opts  Opções adicionais; `signed` adiciona `+` para positivos.
 * @returns Representação textual canônica do valor.
 *
 * @example
 * formatCurrency(1234567, 'AOA');                 // "1.234.567 AOA"
 * formatCurrency(1234.5, 'USD');                  // "$1,234.50"
 * formatCurrency(-10, 'EUR');                     // "-€10.00"
 * formatCurrency(15000, 'ZAR');                   // "ZAR 15,000.00"
 * formatCurrency(5000, 'AOA', { signed: true });  // "+5.000 AOA"
 * formatCurrency(0, 'USD', { signed: true });     // "$0.00"
 */
export function formatCurrency(
  value: number,
  code: CurrencyCode,
  opts: FormatCurrencyOptions = {},
): string {
  const meta = CURRENCY_META[code];

  // Determina o sinal a exibir. `-0 < 0` é `false`, portanto `-0` é tratado
  // como zero (sem sinal) — coerente com o Requisito 8.7.
  const isNegative = value < 0;
  const isPositive = value > 0;

  // Formatação dos dígitos sempre sobre o valor absoluto: o sinal é
  // reposicionado manualmente conforme `symbolPosition`.
  const absValue = Math.abs(value);

  // `toFixed` arredonda para `fractionDigits` casas e produz uma string
  // canônica com "." como separador decimal, o que simplifica o split.
  const fixed = absValue.toFixed(meta.fractionDigits);

  // Divide em parte inteira e fracionária. Para `fractionDigits === 0`,
  // `fixed` não contém `.` e o split devolve apenas o primeiro elemento.
  const pontoIndex = fixed.indexOf('.');
  const intPart = pontoIndex === -1 ? fixed : fixed.slice(0, pontoIndex);
  const fracPart = pontoIndex === -1 ? '' : fixed.slice(pontoIndex + 1);

  // Agrupamento de milhar manual: inserção do separador a cada 3 dígitos
  // a partir da direita. Implementação previsível (não depende de locale).
  const intAgrupado = agruparMilhar(intPart, meta.thousandsSep);

  // Concatena parte inteira com fracionária usando o separador decimal da
  // moeda (ex.: AOA usa "," mas como `fractionDigits = 0`, nunca chega aqui).
  const numStr =
    meta.fractionDigits > 0 && fracPart.length > 0
      ? intAgrupado + meta.decimalSep + fracPart
      : intAgrupado;

  // Prefixo de sinal.
  let sinal = '';
  if (isNegative) {
    sinal = '-';
  } else if (isPositive && opts.signed === true) {
    sinal = '+';
  }

  // Posicionamento do símbolo:
  // - prefix: `[sinal][símbolo][número]`   → `-$10.00`, `+€5.00`, `-ZAR 100.00`
  // - suffix: `[sinal][número] [símbolo]`  → `-10 AOA`, `+1.000 AOA`
  //
  // Observação: `CURRENCY_META.ZAR.symbol` inclui o espaço final ("ZAR "), por
  // contrato — o formatador concatena diretamente. Para sufixos (AOA), o
  // espaço entre número e símbolo é adicionado explicitamente aqui.
  if (meta.symbolPosition === 'prefix') {
    return sinal + meta.symbol + numStr;
  }
  return sinal + numStr + ' ' + meta.symbol;
}

/**
 * Insere o separador de milhar `sep` na parte inteira `intPart` (sem sinal,
 * sem casas decimais). Determinística e independente de locale.
 *
 * Exemplo: `agruparMilhar("1234567", ".")` → `"1.234.567"`.
 *
 * Implementação: regex `\B(?=(\d{3})+(?!\d))` casa toda fronteira de palavra
 * que seja seguida de um múltiplo de 3 dígitos até o fim da string — ou seja,
 * todas as posições "entre blocos de três" vindo da direita.
 */
function agruparMilhar(intPart: string, sep: string): string {
  if (intPart.length <= 3) {
    return intPart;
  }
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * Escapa caracteres especiais de regex em uma string literal, para que ela
 * possa ser usada com segurança em `new RegExp(...)`.
 *
 * Necessário porque os separadores declarados em `CURRENCY_META` (`"."` e
 * `","`) têm significado em regex: `"."` casa qualquer caractere.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Reverte `formatCurrency` para a moeda `code`.
 *
 * Contrato:
 *
 * - Aceita qualquer string produzida por `formatCurrency(v, code, ...)` e
 *   devolve um `number` cuja diferença absoluta em relação a `v` é ≤ `10⁻ᶠᵐ`
 *   (Requisito 8.6 / Propriedade 13).
 * - **Tolerante a espaços extremos**: `text.trim()` é aplicado antes do
 *   processamento.
 * - **Estrito com o restante da forma**: se a string não apresentar o
 *   símbolo/sufixo esperado para `code`, ou se os dígitos remanescentes não
 *   casarem `^[0-9]+(\.[0-9]+)?$`, retorna `null`.
 * - **Nunca lança**: entradas malformadas produzem `null`; cabe ao chamador
 *   decidir como reagir.
 *
 * Estratégia (espelha `formatCurrency` em ordem inversa):
 *
 * 1. Captura o sinal inicial (`"+"` ou `"-"`), se houver.
 * 2. Remove o símbolo/sufixo da moeda de acordo com `symbolPosition`.
 * 3. Remove todas as ocorrências do separador de milhar.
 * 4. Substitui o separador decimal por `"."`.
 * 5. Valida que o restante é um literal numérico bem-formado.
 * 6. Aplica o sinal e retorna.
 *
 * @param text Texto a converter.
 * @param code Moeda que rege símbolo e separadores.
 * @returns Número representado, ou `null` quando a forma não casa.
 *
 * @example
 * parseCurrency("$1,234.50", 'USD');     // 1234.5
 * parseCurrency("-€10.00", 'EUR');       // -10
 * parseCurrency("1.234.567 AOA", 'AOA'); // 1234567
 * parseCurrency("+5.000 AOA", 'AOA');    // 5000
 * parseCurrency("ZAR 15,000.00", 'ZAR'); // 15000
 * parseCurrency("abc", 'USD');           // null
 * parseCurrency("1,234.50", 'USD');      // null (sem símbolo)
 */
export function parseCurrency(text: string, code: CurrencyCode): number | null {
  if (typeof text !== 'string') {
    return null;
  }

  const meta = CURRENCY_META[code];
  let s = text.trim();
  if (s.length === 0) {
    return null;
  }

  // 1) Extrai sinal. Em AOA/ZAR, o `-`/`+` aparece no início absoluto da
  //    string; em USD/EUR/GBP/ZAR (prefix) também — então a lógica é a
  //    mesma para ambas as posições.
  let sinal = 1;
  if (s.startsWith('-')) {
    sinal = -1;
    s = s.slice(1).trimStart();
  } else if (s.startsWith('+')) {
    sinal = 1;
    s = s.slice(1).trimStart();
  }

  // 2) Remove símbolo/sufixo. Para sufixo, também toleramos um espaço
  //    separador (produzido por `formatCurrency` para AOA).
  if (meta.symbolPosition === 'prefix') {
    if (!s.startsWith(meta.symbol)) {
      return null;
    }
    s = s.slice(meta.symbol.length);
  } else {
    if (!s.endsWith(meta.symbol)) {
      return null;
    }
    s = s.slice(0, s.length - meta.symbol.length);
  }
  s = s.trim();
  if (s.length === 0) {
    return null;
  }

  // 3) Remove separadores de milhar (todas as ocorrências).
  const milharRegex = new RegExp(escapeRegExp(meta.thousandsSep), 'g');
  s = s.replace(milharRegex, '');

  // 4) Normaliza separador decimal para "." (se diferente).
  if (meta.decimalSep !== '.') {
    // Só deve haver no máximo uma ocorrência; `replace` sem flag `g` troca
    // a primeira, o que é suficiente para a forma canônica produzida por
    // `formatCurrency`. Se houver múltiplas, o teste de regex abaixo
    // rejeita a string como malformada.
    s = s.replace(meta.decimalSep, '.');
  }

  // 5) Valida a forma final: dígitos, com fracionária opcional.
  if (!/^[0-9]+(\.[0-9]+)?$/.test(s)) {
    return null;
  }

  const n = Number(s);
  if (!Number.isFinite(n)) {
    return null;
  }

  // 6) Aplica o sinal. `sinal * 0` pode produzir `-0` quando `sinal === -1`;
  //    normaliza para `0` — coerente com `formatCurrency`, que trata `-0`
  //    como zero sem sinal.
  if (n === 0) {
    return 0;
  }
  return sinal * n;
}
