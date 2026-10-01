#!/usr/bin/env node
/**
 * Radar dei trend su X: giro di prova sul sito pubblicato.
 *
 *   node strumenti/radar.mjs prova [https://sito]   un giro completo senza mandare messaggi: mostra segnali e bozze
 *
 * Legge CRON_SECRET da .env.local (o dall'ambiente): deve essere lo stesso valore impostato su Vercel.
 */
import { readFileSync } from 'node:fs';

const SITO_PREDEFINITO = 'https://politicare-app.vercel.app';

function caricaEnv() {
  try {
    for (const riga of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*?)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* senza .env.local si usa solo l'ambiente */
  }
}

const [comando, argomento] = process.argv.slice(2);
caricaEnv();

if (comando !== 'prova') {
  console.log('Uso: npm run radar prova [https://sito]');
  process.exit(comando ? 1 : 0);
}

const segreto = process.env.CRON_SECRET;
if (!segreto) throw new Error('CRON_SECRET mancante: mettilo in .env.local, uguale a quello su Vercel');
const sito = (argomento ?? process.env.SITO_URL ?? SITO_PREDEFINITO).replace(/\/$/, '');

const risposta = await fetch(`${sito}/api/radar?prova=1`, { headers: { authorization: `Bearer ${segreto}` } });
const corpo = await risposta.json().catch(() => ({ ok: false, error: `risposta non valida (${risposta.status})` }));
if (!corpo.ok) {
  console.error(`Errore: ${corpo.error ?? risposta.status}`);
  process.exit(1);
}

console.log(`Tendenze lette: ${corpo.tendenze}`);
if (!corpo.segnali.length) console.log('Nessun tema in salita rispetto a un\'ora fa (al primo giro è normale: il radar sta registrando).');
for (const s of corpo.segnali) console.log(`  • ${s.nome} — ${s.motivo} (forza ${s.forza})`);
for (const v of corpo.valutati) {
  console.log(`\n${v.nome}: ${v.esito}${v.accelerazione != null ? `, ultima ora ×${v.accelerazione}` : ''}`);
  if (v.dettaglio) console.log(`  ${v.dettaglio}`);
  for (const [i, b] of (v.bozze ?? []).entries()) console.log(`  Bozza ${i + 1}: ${b}`);
}
if (corpo.nota) console.log(`\nNota: ${corpo.nota}`);
