/**
 * `currencyBadge` — emblema circular com a bandeira (ou marca) de uma moeda.
 *
 * Usamos SVGs inline 1:1 em vez de fontes de bandeiras externas para manter o
 * app 100% offline (Req 7). Cada bandeira é desenhada de forma estilizada e
 * simplificada, priorizando leitura em tamanhos pequenos (16–32 px) e
 * coerência com o dark mode do Design System.
 *
 * Para a moeda local AOA é usado um símbolo monetário (em vez da bandeira
 * angolana) para manter o foco no _ticker_, dado que AOA aparece em contextos
 * neutros (card principal, labels de lucro).
 *
 * Requisitos relacionados: 3.2, 3.6 (cada item do histórico exibe a moeda
 * visualmente reconhecível) e 9.3 (ícones consistentes).
 */

import type { CurrencyCode } from '../../domain/currency';

/**
 * Builder interno: devolve uma string SVG (conteúdo interno do `<svg>`) para
 * cada moeda. As viewBoxes são sempre 24×24 para uniformidade.
 */
function svgContent(code: CurrencyCode): string {
  switch (code) {
    case 'USD':
      // Listras vermelhas e brancas com cantão azul estilizado.
      return `
        <rect width="24" height="24" fill="#b22234"/>
        <g fill="#ffffff">
          <rect y="1.85" width="24" height="1.85"/>
          <rect y="5.54" width="24" height="1.85"/>
          <rect y="9.23" width="24" height="1.85"/>
          <rect y="12.92" width="24" height="1.85"/>
          <rect y="16.61" width="24" height="1.85"/>
          <rect y="20.3" width="24" height="1.85"/>
        </g>
        <rect width="10" height="12.92" fill="#3c3b6e"/>
        <g fill="#ffffff" font-family="Inter, sans-serif" font-weight="700" font-size="9">
          <text x="5" y="10" text-anchor="middle">★</text>
        </g>`;
    case 'EUR':
      // Fundo azul UE com círculo de estrelas amarelas (simplificado).
      return `
        <rect width="24" height="24" fill="#003399"/>
        <g fill="#ffcc00">
          <circle cx="12" cy="5" r="1"/>
          <circle cx="16" cy="6.5" r="1"/>
          <circle cx="18.5" cy="10" r="1"/>
          <circle cx="18.5" cy="14" r="1"/>
          <circle cx="16" cy="17.5" r="1"/>
          <circle cx="12" cy="19" r="1"/>
          <circle cx="8" cy="17.5" r="1"/>
          <circle cx="5.5" cy="14" r="1"/>
          <circle cx="5.5" cy="10" r="1"/>
          <circle cx="8" cy="6.5" r="1"/>
        </g>`;
    case 'GBP':
      // Union Jack simplificada.
      return `
        <rect width="24" height="24" fill="#012169"/>
        <path d="M0,0 L24,24 M24,0 L0,24" stroke="#ffffff" stroke-width="3"/>
        <path d="M0,0 L24,24 M24,0 L0,24" stroke="#c8102e" stroke-width="1.5"/>
        <path d="M12,0 L12,24 M0,12 L24,12" stroke="#ffffff" stroke-width="4"/>
        <path d="M12,0 L12,24 M0,12 L24,12" stroke="#c8102e" stroke-width="2.4"/>`;
    case 'ZAR':
      // Bandeira da África do Sul (simplificada).
      return `
        <rect width="24" height="24" fill="#ffffff"/>
        <polygon points="0,0 10,12 0,24" fill="#007a4d"/>
        <polygon points="10,12 24,0 24,7 14,12 24,17 24,24" fill="#ffffff"/>
        <polygon points="0,0 24,0 24,7 10,12" fill="#de3831"/>
        <polygon points="0,24 24,24 24,17 10,12" fill="#002395"/>
        <polygon points="0,3 7,12 0,21" fill="#000000"/>
        <polygon points="7,12 24,3 24,7 12,12 24,17 24,21" fill="#ffb612"/>`;
    case 'AOA':
    default:
      // Emblema circular com "Kz" dourado para AOA.
      return `
        <rect width="24" height="24" fill="#101415"/>
        <circle cx="12" cy="12" r="11" fill="#1d2022" stroke="#4edea3" stroke-width="1.5"/>
        <text x="12" y="16" text-anchor="middle" font-family="Inter, sans-serif"
              font-weight="700" font-size="10" fill="#4edea3">Kz</text>`;
  }
}

/**
 * Cria um `<span>` que contém o SVG inline da moeda, recortado num círculo.
 *
 * @param code  Código da moeda.
 * @param size  Diâmetro em pixels (padrão 24).
 * @param extraClass Classes Tailwind adicionais (ex.: `border border-outline`).
 */
export function CurrencyBadge(
  code: CurrencyCode,
  size: number = 24,
  extraClass: string = '',
): HTMLSpanElement {
  const wrapper = document.createElement('span');
  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', code);
  wrapper.className =
    'inline-flex items-center justify-center overflow-hidden rounded-full ring-1 ring-outline-variant/60 shadow-sm ' +
    extraClass;
  wrapper.style.width = `${size}px`;
  wrapper.style.height = `${size}px`;
  wrapper.style.flex = '0 0 auto';

  wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${svgContent(code)}</svg>`;
  return wrapper;
}
