/**
 * Registro do Service Worker do KwanzaProfit (Task 13.3).
 *
 * Este módulo é um wrapper fino sobre `virtual:pwa-register` do
 * `vite-plugin-pwa`. A separação em arquivo próprio permite que
 * `main.ts` importe-o dinamicamente (`import('./infra/pwa/registerSW')`),
 * postergando a carga e o registro para depois do _first paint_,
 * e também tolerar a ausência do módulo virtual em ambientes de
 * teste (jsdom) onde o plugin não está ativo.
 *
 * ## Política de atualização
 *
 * `registerType: 'autoUpdate'` é configurado em `vite.config.ts`, o
 * que significa que o Workbox instala a nova versão em background e
 * aplica-a na próxima navegação. Não exibimos prompt "Nova versão
 * disponível" — o app é de uso rápido e a troca silenciosa é preferível
 * à interrupção do operador. Caso essa decisão mude, bastar substituir
 * `immediate: true` por um callback `onNeedRefresh` que exponha o
 * `updateSW(true)` à UI.
 *
 * ## Tratamento de erros (Req 7.5)
 *
 * Qualquer falha (navegador sem suporte a Service Worker, modo privado
 * restrito, origem não-segura, etc.) é capturada e logada. A aplicação
 * **não** propaga o erro nem bloqueia o usuário — segue funcional em
 * modo degradado (sem capacidade offline). Isso está alinhado com o
 * design: "App continua funcional em modo degradado (sem offline).
 * Log do erro; nenhuma barreira ao usuário."
 */

/**
 * Registra o Service Worker gerado pelo `vite-plugin-pwa`.
 *
 * Idempotente: pode ser chamado múltiplas vezes sem efeito colateral
 * (o `registerSW` do plugin lida internamente com re-registros).
 *
 * Retorna uma Promise que sempre **resolve** — erros internos são
 * apenas logados, nunca rejeitados, para que chamadores `void`-ados
 * não derrubem o bootstrap.
 */
export async function registerServiceWorker(): Promise<void> {
  // Em ambientes sem suporte (jsdom em testes, navegadores antigos)
  // evitamos sequer carregar o módulo virtual.
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    // Import dinâmico: o módulo virtual só existe sob `vite build`/`vite dev`
    // com o plugin PWA ativo. Em outros contextos o `catch` abaixo registra
    // a ausência silenciosamente.
    const mod = await import('virtual:pwa-register');
    const register = mod.registerSW;
    if (typeof register !== 'function') {
      return;
    }
    register({
      immediate: true,
      onRegisterError(error: unknown) {
        // eslint-disable-next-line no-console
        console.warn('[pwa] falha ao registrar Service Worker:', error);
      }
    });
  } catch (error) {
    // Módulo virtual indisponível ou erro inesperado. Não propagamos.
    // eslint-disable-next-line no-console
    console.warn('[pwa] Service Worker não registrado:', error);
  }
}
