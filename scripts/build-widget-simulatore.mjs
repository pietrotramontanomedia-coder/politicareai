// Costruisce public/widget/simulatore.js, il simulatore da mettere nelle pagine di politicare.it.
import { readFileSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

// Solo nome e colore dei partiti: il pack completo resta fuori dal file.
const pack = JSON.parse(readFileSync('content/test-partito/politiche-2027.v1.json', 'utf8'));
writeFileSync('widget/partiti.json', JSON.stringify(pack.partiti.map((p) => ({ id: p.id, nome: p.nome, colore: p.colore ?? '#6b7280' })), null, 2) + '\n');

await build({
  entryPoints: ['widget/simulatore-widget.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: 'public/widget/simulatore.js',
  legalComments: 'none',
  logLevel: 'info',
});
