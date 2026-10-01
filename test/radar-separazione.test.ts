import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Il radar deve restare scollegato dal ponte Telegram → X: non importa il suo codice
 * e non legge le sue variabili. Così un errore o un consumo del radar non tocca il ponte.
 */

const FILE_RADAR = [
  'app/api/radar/route.ts',
  'lib/radar.ts',
  'lib/radar-x-server.ts',
  'lib/radar-claude-server.ts',
  'lib/radar-registro.ts',
  'lib/radar-telegram-server.ts',
];
const MODULI_PONTE = ['telegram-x', 'telegram-x-registro', 'telegram-bot-server', 'x-server', 'riscrittura-server', 'telegram-server'];
const VARIABILI_PONTE = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'X_API_KEY',
  'X_API_SECRET',
  'X_ACCESS_TOKEN',
  'X_ACCESS_SECRET',
  'X_BEARER_TOKEN',
  'ANTHROPIC_API_KEY',
];

describe('separazione dal ponte Telegram → X', () => {
  for (const file of FILE_RADAR) {
    const codice = readFileSync(file, 'utf8');

    it(`${file} non importa moduli del ponte`, () => {
      const importati = [...codice.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1].split('/').pop());
      expect(importati.filter((m) => MODULI_PONTE.includes(m!))).toEqual([]);
    });

    it(`${file} non legge variabili del ponte`, () => {
      const lette = [...codice.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]);
      expect(lette.filter((v) => VARIABILI_PONTE.includes(v))).toEqual([]);
    });
  }

  it('il radar scrive solo nel suo file di stato', () => {
    expect(readFileSync('lib/radar-registro.ts', 'utf8')).toContain("const PERCORSO = 'radar/stato.json'");
  });
});
