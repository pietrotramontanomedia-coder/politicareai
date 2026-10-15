import { BlobPreconditionFailedError } from '@vercel/blob';
import { beforeAll, describe, expect, it } from 'vitest';

/*
 * Prova dal vivo dell'archivio sul nostro server (servizi/archivio). Gira solo se c'è un archivio
 * di prova da usare: ARCHIVIO_PROVA_URL e ARCHIVIO_PROVA_TOKEN (per esempio il servizio avviato in
 * locale su un PostgreSQL vuoto). Mai contro l'archivio di produzione: scrive file veri.
 */

const URL_PROVA = process.env.ARCHIVIO_PROVA_URL;
const TOKEN_PROVA = process.env.ARCHIVIO_PROVA_TOKEN;
const giro = `prova/${Date.now()}`;
const ID = (n: number) => n.toString(16).padStart(32, '0');

describe.skipIf(!URL_PROVA || !TOKEN_PROVA)('archivio nostro (dal vivo)', () => {
  beforeAll(() => {
    process.env.ARCHIVIO_URL = URL_PROVA;
    process.env.ARCHIVIO_TOKEN = TOKEN_PROVA;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it('scrive solo se il file non esiste, poi solo con l\'ETag giusto', async () => {
    const { scriviOggetto, leggiOggetto, metadatiOggetto } = await import('@/lib/archivio-nostro');
    const p = `${giro}/a.json`;
    const primo = await scriviOggetto(p, '{"n":1}', { contentType: 'application/json' });
    await expect(scriviOggetto(p, '{"n":9}', { contentType: 'application/json' })).rejects.toBeInstanceOf(BlobPreconditionFailedError);
    const secondo = await scriviOggetto(p, '{"n":2}', { contentType: 'application/json', ifMatch: primo.etag });
    await expect(scriviOggetto(p, '{"n":3}', { contentType: 'application/json', ifMatch: primo.etag })).rejects.toBeInstanceOf(BlobPreconditionFailedError);
    const meta = await metadatiOggetto(p);
    expect(meta?.etag).toBe(secondo.etag);
    const letto = await leggiOggetto(p);
    expect(letto?.statusCode).toBe(200);
    if (letto?.statusCode === 200) expect(new TextDecoder().decode(letto.corpo)).toBe('{"n":2}');
    expect((await leggiOggetto(p, secondo.etag))?.statusCode).toBe(304);
    expect(await leggiOggetto(`${giro}/manca.json`)).toBeNull();
    expect(await metadatiOggetto(`${giro}/manca.json`)).toBeNull();
  });

  it('tiene i byte delle immagini, mette il suffisso casuale ed elenca per prefisso', async () => {
    const { scriviOggetto, leggiOggetto, elencaOggetti } = await import('@/lib/archivio-nostro');
    const byte = new Uint8Array(300_000).map((_, i) => (i * 7) % 256);
    await scriviOggetto(`${giro}/media/foto`, byte, { contentType: 'image/jpeg' });
    const r = await leggiOggetto(`${giro}/media/foto`);
    expect(r?.statusCode === 200 && r.contentType).toBe('image/jpeg');
    expect(r?.statusCode === 200 && Buffer.from(r.corpo).equals(Buffer.from(byte))).toBe(true);
    const copia = await scriviOggetto(`${giro}/storico/x.json`, '{}', { contentType: 'application/json', addRandomSuffix: true });
    expect(copia.pathname).toMatch(new RegExp(`^${giro}/storico/x-[a-f0-9]{20}\\.json$`));
    const voci = await elencaOggetti(`${giro}/`);
    expect(voci.map((v) => v.pathname)).toEqual([`${giro}/a.json`, `${giro}/media/foto`, copia.pathname]);
  });

  it('il portale della redazione ci lavora sopra: crea, aggiorna, immagini e impostazioni', async () => {
    const { archivio } = await import('@/lib/redazione/archivio-server');
    const { nuovoContenuto, aggiungiCommento } = await import('@/lib/redazione/regole');
    const a = archivio();
    const adesso = new Date();
    const id = ID(Date.now());
    await a.crea(nuovoContenuto(id, 'storia', 'Giulia', { immagini: [ID(Date.now() + 1)], didascalia: '', formato: '1:1' }, adesso));
    await a.aggiorna(id, (c) => aggiungiCommento(c, { nome: 'Pietro', ruolo: 'revisore' }, { tipo: 'consiglio', testo: 'Va bene così', stato: 'approvato' }, ID(Date.now() + 9), adesso));
    const letto = await a.leggi(id);
    expect(letto?.commenti).toHaveLength(1);
    const stato = await a.stato();
    expect(stato.contenuti.some((c) => c.id === id)).toBe(true);
    await a.salvaMedia(ID(Date.now() + 2), new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]), 'image/jpeg');
    expect(await a.leggiMedia(ID(Date.now() + 3))).toBeNull();
    const obiettivi = await a.leggiObiettivi();
    await a.salvaObiettivi(obiettivi);
    expect(await a.leggiObiettivi()).toEqual(obiettivi);
  });

  it('radar, ponte Telegram → X e token Instagram leggono e scrivono lì', async () => {
    const { leggiStato, salvaStato } = await import('@/lib/radar-registro');
    await salvaStato({ rilevazioni: [], avvisi: [] });
    expect(await leggiStato()).toEqual({ rilevazioni: [], avvisi: [] });
    const { registraPubblicazione, giaPubblicato } = await import('@/lib/telegram-x-registro');
    await registraPubblicazione(424242, 'x-prova', 'impronta-prova');
    expect((await giaPubblicato(424242))?.x).toBe('x-prova');
  });
});
