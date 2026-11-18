// The Last Lighthouse — entry program for make.fun's best-game-01.
// Copies the game and its screenshots into the output directory and writes
// the dossier the judge reads, with the kit's own buildDossier library.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
for (const name of ['game', 'screenshots']) {
  const dest = join(outDir, name);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  cpSync(join(here, name), dest, { recursive: true });
}

const dossierPath = join(outDir, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  }),
);

// Verify the dossier we just wrote: it must parse, and its schema must be
// the one buildDossier declares, so a truncated write can never pass silent.
const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
if (dossier.schema !== 'makefun/dossier/v1') {
  throw new Error(`unexpected dossier schema: ${dossier.schema}`);
}
console.log(`wrote ${outDir} (game, screenshots, dossier.json ${statSync(dossierPath).size} bytes)`);
