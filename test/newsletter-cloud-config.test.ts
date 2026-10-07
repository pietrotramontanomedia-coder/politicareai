import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cloudConfig } from '../strumenti/newsletter/server/genera-cloud-config.mjs';

/*
 * cloud-config.yaml (da incollare in Hetzner) deve contenere esattamente i file del server:
 * se si modifica installa.sh o docker-compose.yml bisogna rigenerarlo.
 */

const cartella = new URL('../strumenti/newsletter/server/', import.meta.url);

describe('cloud-config per Hetzner', () => {
  it('è aggiornato rispetto ai file del server', () => {
    expect(readFileSync(new URL('cloud-config.yaml', cartella), 'utf8')).toBe(cloudConfig(cartella));
  });

  it('riporta ogni file senza perdere righe e lancia l\'installazione', () => {
    const yaml = cloudConfig(cartella);
    for (const nome of ['docker-compose.yml', 'Caddyfile', 'installa.sh', 'backup.sh']) {
      const righe = readFileSync(new URL(nome, cartella), 'utf8').replace(/\n$/, '').split('\n');
      for (const riga of righe.filter(Boolean)) expect(yaml).toContain(`      ${riga}`);
    }
    expect(yaml.startsWith('#cloud-config\n')).toBe(true);
    expect(yaml).toContain('  - [bash, /opt/newsletter/installa.sh, newsletter.politicare.it]');
  });
});
