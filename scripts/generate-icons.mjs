/**
 * Gera os PNGs do Kâmbio a partir dos SVGs mestre em `public/icons/`.
 *
 * iOS/Safari não resolve SVG em `apple-touch-icon` de forma confiável;
 * por isso precisamos de PNGs dedicados para o "Adicionar à Tela de Início".
 * Android/Chrome aceita SVG no manifest normalmente — mantemos os SVGs
 * como fonte-da-verdade e derivamos os PNGs daqui.
 *
 * Tamanhos gerados:
 *  - icon-192.png        → manifest (Android)
 *  - icon-512.png        → manifest (Android)
 *  - icon-maskable.png   → manifest maskable (Android)
 *  - apple-touch-icon-180.png → <link rel="apple-touch-icon"> (iPhone/iPad)
 *
 * Uso:
 *   node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const iconsDir = resolve(root, 'public/icons');

await mkdir(iconsDir, { recursive: true });

/** Renderiza um SVG para PNG no tamanho informado. */
async function svgToPng(svgPath, pngPath, size) {
  const buf = await sharp(svgPath, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 90 })
    .toBuffer();
  await sharp(buf).toFile(pngPath);
  console.log(`✓ ${pngPath} (${size}x${size})`);
}

const tasks = [
  [resolve(iconsDir, 'icon-192.svg'), resolve(iconsDir, 'icon-192.png'), 192],
  [resolve(iconsDir, 'icon-512.svg'), resolve(iconsDir, 'icon-512.png'), 512],
  [resolve(iconsDir, 'icon-maskable.svg'), resolve(iconsDir, 'icon-maskable.png'), 512],
  // Apple Touch Icon oficial: 180x180 é o tamanho recomendado atual.
  [resolve(iconsDir, 'icon-512.svg'), resolve(iconsDir, 'apple-touch-icon-180.png'), 180],
  // Fallbacks para iPads/iPhones antigos:
  [resolve(iconsDir, 'icon-512.svg'), resolve(iconsDir, 'apple-touch-icon-152.png'), 152],
  [resolve(iconsDir, 'icon-512.svg'), resolve(iconsDir, 'apple-touch-icon-167.png'), 167],
  [resolve(iconsDir, 'icon-512.svg'), resolve(iconsDir, 'apple-touch-icon-120.png'), 120],
];

for (const [src, dst, size] of tasks) {
  await svgToPng(src, dst, size);
}

console.log('\nÍcones gerados em public/icons/.');
