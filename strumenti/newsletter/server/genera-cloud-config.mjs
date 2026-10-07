#!/usr/bin/env node
/**
 * Genera cloud-config.yaml: il testo da incollare in Hetzner («Cloud config») quando si crea il server.
 * All'accensione il server scrive i file di questa cartella in /opt/newsletter e lancia installa.sh,
 * senza bisogno di copiare niente a mano.
 *
 *   node strumenti/newsletter/server/genera-cloud-config.mjs [dominio]
 *
 * Va rilanciato dopo ogni modifica a docker-compose.yml, Caddyfile, installa.sh o backup.sh
 * (un test controlla che il file sia aggiornato).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DOMINIO_PREDEFINITO = 'newsletter.politicare.it';
const FILE = [
  ['docker-compose.yml', '0644'],
  ['Caddyfile', '0644'],
  ['installa.sh', '0755'],
  ['backup.sh', '0755'],
];

export function cloudConfig(cartella, dominio = DOMINIO_PREDEFINITO) {
  const righe = [
    '#cloud-config',
    '# Newsletter Politicare: incollare in Hetzner → Crea server → «Cloud config».',
    '# Generato da genera-cloud-config.mjs: non modificare a mano.',
    'write_files:',
  ];
  for (const [nome, permessi] of FILE) {
    const testo = readFileSync(new URL(nome, cartella), 'utf8');
    righe.push(`  - path: /opt/newsletter/${nome}`, `    permissions: '${permessi}'`, '    content: |');
    for (const riga of testo.replace(/\n$/, '').split('\n')) righe.push(riga ? `      ${riga}` : '');
  }
  righe.push('runcmd:', `  - [bash, /opt/newsletter/installa.sh, ${dominio}]`, '');
  return righe.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cartella = new URL('./', import.meta.url);
  writeFileSync(new URL('cloud-config.yaml', cartella), cloudConfig(cartella, process.argv[2]));
  console.log('Scritto cloud-config.yaml');
}
