#!/usr/bin/env node
/**
 * Build dell'app Capacitor:
 *   1. legge .env.app (se c'è) per NEXT_PUBLIC_SITO_URL
 *   2. esporta il sito in statico con BUILD_TARGET=app (cartella out/)
 *   3. copia out/ nei progetti nativi con `cap sync`
 *
 * Uso: npm run build:app            (build + sync di entrambe le piattaforme)
 *      npm run build:app -- android (sync di una sola piattaforma)
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';

const env = { ...process.env, BUILD_TARGET: 'app' };

if (existsSync('.env.app')) {
  for (const riga of readFileSync('.env.app', 'utf8').split('\n')) {
    const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !m[1].startsWith('#') && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const base = env.NEXT_PUBLIC_SITO_URL ?? '';
if (!/^https:\/\/[^/]+/.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/.test(base)) {
  console.error(
    "\nNEXT_PUBLIC_SITO_URL mancante o non valido.\n" +
      "Serve l'indirizzo https del sito in produzione: espone /api ed è il dominio dei link condivisi (es. https://politicare-app.vercel.app).\n" +
      'Mettilo in .env.app (vedi .env.app.example) oppure passalo da riga di comando.\n',
  );
  process.exit(1);
}

const piattaforma = process.argv[2] ?? '';
console.log(`Build app con API su ${base}`);
rmSync('out', { recursive: true, force: true });
execSync('npx next build', { stdio: 'inherit', env });
execSync(`npx cap sync ${piattaforma}`.trim(), { stdio: 'inherit', env });
