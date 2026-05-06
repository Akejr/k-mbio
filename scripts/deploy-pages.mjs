/**
 * Deploy manual do Kâmbio no GitHub Pages.
 *
 * Fluxo:
 *  1. Roda `vite build` (já deve ter sido rodado antes — o script apenas
 *     garante que `dist/` é a fonte-da-verdade).
 *  2. Atualiza o worktree `.gh-pages/` (branch órfã `gh-pages`) com o
 *     conteúdo de `dist/`, preservando o histórico de deploys.
 *  3. Faz commit e push para `origin/gh-pages`.
 *
 * Uso:
 *   npm run deploy
 *
 * Pré-requisito: o repositório já precisa ter a branch `gh-pages` no
 * remoto (criada na primeira vez). Em Settings → Pages selecione
 * "Deploy from a branch" apontando para `gh-pages / (root)`.
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist');
const worktreeDir = resolve(root, '.gh-pages');

function run(cmd, options = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...options });
}

// 1) Garantir que dist/ existe — rodar o build se necessário.
if (!existsSync(distDir)) {
  run('npm run build');
}

// 2) Criar o worktree da branch gh-pages se não existir.
if (!existsSync(resolve(worktreeDir, '.git'))) {
  run(`git worktree add .gh-pages gh-pages`);
}

// 3) Sincronizar os arquivos: limpa o worktree (exceto `.git`) e copia dist/.
run(
  `node -e "import('node:fs').then(fs => { const dir = '.gh-pages'; for (const entry of fs.readdirSync(dir)) { if (entry === '.git') continue; fs.rmSync(dir + '/' + entry, { recursive: true, force: true }); } })"`,
);
run(
  `node -e "import('node:fs').then(fs => { const src = 'dist'; const dst = '.gh-pages'; for (const entry of fs.readdirSync(src)) { fs.cpSync(src + '/' + entry, dst + '/' + entry, { recursive: true }); } })"`,
);

// 4) Commit e push.
run('git add -A', { cwd: worktreeDir });
try {
  run(
    `git -c user.name=Ecasanovs -c user.email=contato@evandrocasanova.com commit -m "deploy: ${new Date().toISOString()}"`,
    { cwd: worktreeDir },
  );
} catch {
  console.log('[deploy] nada para commitar (dist idêntico ao último deploy).');
  process.exit(0);
}
run('git push', { cwd: worktreeDir });

console.log('\n✓ Deploy concluído. URL: https://akejr.github.io/k-mbio/');
