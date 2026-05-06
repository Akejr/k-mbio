// Setup global para todos os testes executados pelo Vitest.
//
// 1. `fake-indexeddb/auto` registra um polyfill de IndexedDB no escopo global,
//    permitindo que módulos de infraestrutura usem `indexedDB` mesmo quando o
//    ambiente de teste (jsdom) não o expõe nativamente.
// 2. `fc.configureGlobal` define o número mínimo de iterações (100) para todos
//    os testes baseados em propriedade e permite reproduzir falhas via a
//    variável de ambiente FC_SEED.
import 'fake-indexeddb/auto';
import fc from 'fast-check';

const parsedSeed = Number(process.env.FC_SEED);
const seed = Number.isFinite(parsedSeed) && parsedSeed !== 0 ? parsedSeed : undefined;

fc.configureGlobal({
  numRuns: 100,
  ...(seed !== undefined ? { seed } : {})
});
