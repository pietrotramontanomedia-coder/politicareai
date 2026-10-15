import { describe, expect, it } from 'vitest';
// @ts-expect-error: lo strumento è JavaScript senza tipi, come gli altri in strumenti/
import { migra, ordina } from '../strumenti/migra-blob.mjs';

/* La copia dal vecchio store Vercel Blob all'archivio nostro: solo dove il file manca, mai sopra. */

type Voce = { pathname: string; size: number; url: string };

function finto(blobFile: Record<string, string>, nostriFile: Record<string, string>, opzioni: { scaricaFallisce?: string } = {}) {
  const nostri = new Map<string, Uint8Array>(Object.entries(nostriFile).map(([p, t]) => [p, new TextEncoder().encode(t)]));
  const scaricati: string[] = [];
  const scritture: string[] = [];
  const blob = {
    async elenca(prefisso: string): Promise<Voce[]> {
      return Object.entries(blobFile)
        .filter(([p]) => p.startsWith(prefisso))
        .map(([p, t]) => ({ pathname: p, size: new TextEncoder().encode(t).length, url: `https://x.private.blob.vercel-storage.com/${p}` }));
    },
    async scarica(voce: Voce) {
      if (opzioni.scaricaFallisce) throw new Error(opzioni.scaricaFallisce);
      scaricati.push(voce.pathname);
      return { corpo: new TextEncoder().encode(blobFile[voce.pathname]), contentType: 'application/json' };
    },
  };
  const archivio = {
    async metadati(percorso: string) {
      const dati = nostri.get(percorso);
      return dati ? { size: dati.length } : null;
    },
    async scriviSeManca(percorso: string, corpo: Uint8Array) {
      scritture.push(percorso);
      if (nostri.has(percorso)) return false;
      nostri.set(percorso, corpo);
      return true;
    },
  };
  return { blob, archivio, nostri, scaricati, scritture };
}

const silenzio = () => {};

describe('migra-blob', () => {
  it('copia solo i file che mancano e non tocca quelli che ci sono già', async () => {
    const f = finto(
      { 'redazione/contenuti/a.json': '{"id":"a"}', 'redazione/contenuti/b.json': '{"id":"b"}', 'redazione/impostazioni/persone.json': '[{"nome":"vecchio"}]' },
      { 'redazione/impostazioni/persone.json': '[{"nome":"nuovo"}]' },
    );
    const esito = await migra({ blob: f.blob, archivio: f.archivio, log: silenzio });
    expect(esito.copiati.sort()).toEqual(['redazione/contenuti/a.json', 'redazione/contenuti/b.json']);
    expect(esito.giaPresenti).toEqual(['redazione/impostazioni/persone.json']);
    expect(new TextDecoder().decode(f.nostri.get('redazione/impostazioni/persone.json'))).toBe('[{"nome":"nuovo"}]');
    expect(f.scaricati).not.toContain('redazione/impostazioni/persone.json');
    expect(esito.diversi).toEqual([{ percorso: 'redazione/impostazioni/persone.json', blob: 20, nostro: 18 }]);
  });

  it('in prova elenca soltanto: niente download, niente scritture', async () => {
    const f = finto({ 'redazione/contenuti/a.json': '{}', 'radar/stato.json': '{}' }, { 'radar/stato.json': '{}' });
    const esito = await migra({ blob: f.blob, archivio: f.archivio, prova: true, log: silenzio });
    expect(esito.daCopiare).toEqual(['redazione/contenuti/a.json']);
    expect(esito.giaPresenti).toEqual(['radar/stato.json']);
    expect(f.scaricati).toEqual([]);
    expect(f.scritture).toEqual([]);
    expect(f.nostri.has('redazione/contenuti/a.json')).toBe(false);
  });

  it('se il file compare nel frattempo, la scrittura condizionata lo lascia stare', async () => {
    const f = finto({ 'redazione/indice.json': '{"vecchio":true}' }, {});
    const scriviSeManca = f.archivio.scriviSeManca;
    f.archivio.scriviSeManca = async (p, corpo) => {
      f.nostri.set(p, new TextEncoder().encode('{"nuovo":1}'));
      return scriviSeManca(p, corpo);
    };
    const esito = await migra({ blob: f.blob, archivio: f.archivio, log: silenzio });
    expect(esito.copiati).toEqual([]);
    expect(esito.giaPresenti).toEqual(['redazione/indice.json']);
    expect(new TextDecoder().decode(f.nostri.get('redazione/indice.json'))).toBe('{"nuovo":1}');
  });

  it('con lo store ancora sospeso si ferma subito e non scrive niente', async () => {
    const f = finto({ 'redazione/contenuti/a.json': '{}', 'redazione/media/x.jpg': 'jpg' }, {}, { scaricaFallisce: 'Vercel Blob: Failed to fetch blob: 403 Forbidden' });
    const esito = await migra({ blob: f.blob, archivio: f.archivio, log: silenzio });
    expect(esito.fermato).toMatch(/403/);
    expect(esito.copiati).toEqual([]);
    expect(f.scritture).toEqual([]);
  });

  it('copia per primi contenuti, foto e impostazioni', () => {
    const voci = ['radar/stato.json', 'redazione/storico/a/1.json', 'redazione/media/f.jpg', 'instagram/token.json', 'redazione/impostazioni/obiettivi.json', 'redazione/contenuti/a.json', 'telegram-x/registro.json'].map((pathname) => ({ pathname }));
    expect(ordina(voci).map((v: { pathname: string }) => v.pathname)).toEqual([
      'redazione/contenuti/a.json',
      'redazione/media/f.jpg',
      'redazione/impostazioni/obiettivi.json',
      'redazione/storico/a/1.json',
      'radar/stato.json',
      'instagram/token.json',
      'telegram-x/registro.json',
    ]);
  });
});
