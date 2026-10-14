import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aggiungiCommento, nuovoContenuto } from '@/lib/redazione/regole';
import type { Contenuto } from '@/lib/redazione/tipi';

/*
 * L'archivio su Vercel Blob, con uno storage finto in memoria che si comporta come quello vero:
 * ETag, scritture condizionate (ifMatch), 304 con If-None-Match, list.
 */

const finto = vi.hoisted(() => {
  class BlobError extends Error {}
  class BlobNotFoundError extends BlobError {}
  class BlobPreconditionFailedError extends BlobError {}
  const file = new Map<string, { corpo: string; etag: string; tipo: string; quando: Date }>();
  /** Orologio dello storage finto: le prove lo spostano avanti per simulare il tempo che passa. */
  const orologio = { adesso: new Date('2026-10-12T10:00:00Z') };
  let contatore = 0;
  const illeggibili = new Set<string>();
  const chiamate = { get: 0, head: 0, put: 0, list: 0 };
  /** Se impostata, gira subito prima della prossima scrittura: simula un'altra persona che scrive. */
  let intrusa: (() => void) | null = null;
  /** Com'è fatto lo store finto: pubblico o privato, e se rifiuta la lettura diretta per l'indirizzo privato. */
  const store = { accesso: 'private' as 'public' | 'private', rifiutaPrivato: false, tokenAtteso: 'vercel_blob_rw_finto_segreto' };
  const url = (pathname: string) => `https://finto.${store.accesso}.blob.vercel-storage.com/${pathname}`;
  const controllaToken = (opzioni?: { token?: string }) => {
    if (opzioni?.token !== store.tokenAtteso) throw new BlobError('Access denied, please provide a valid token for this resource.');
  };
  return {
    BlobError,
    BlobNotFoundError,
    BlobPreconditionFailedError,
    file,
    chiamate,
    orologio,
    store,
    /** Rende illeggibile un file (lo storage risponde, ma senza il contenuto). */
    rotti: illeggibili,
    intromettiti(fn: () => void) {
      intrusa = fn;
    },
    scrivi(percorso: string, corpo: string) {
      file.set(percorso, { corpo, etag: `e${++contatore}`, tipo: 'application/json', quando: orologio.adesso });
    },
    head: async (percorso: string, opzioni?: { token?: string }) => {
      chiamate.head++;
      controllaToken(opzioni);
      const f = file.get(percorso);
      if (!f) throw new BlobNotFoundError('not found');
      return { url: url(percorso), etag: f.etag, contentType: f.tipo, size: f.corpo.length, uploadedAt: f.quando, pathname: percorso };
    },
    get: async (urlOrPathname: string, opzioni: { access: 'public' | 'private'; token?: string }) => {
      chiamate.get++;
      controllaToken(opzioni);
      // Come l'SDK: un indirizzo completo si usa com'è, altrimenti si costruisce dall'accesso chiesto.
      const indirizzo = /^https?:/.test(urlOrPathname) ? new URL(urlOrPathname) : new URL(`https://finto.${opzioni.access}.blob.vercel-storage.com/${urlOrPathname}`);
      const percorso = indirizzo.pathname.slice(1);
      const perPrivato = indirizzo.hostname.includes('.private.');
      // Lo store serve i file per l'indirizzo del suo tipo; con rifiutaPrivato fa il contrario (il caso
      // visto in produzione: indirizzo privato negato, pubblico che funziona).
      const servito = store.rifiutaPrivato ? !perPrivato : perPrivato === (store.accesso === 'private');
      if (!servito) throw new BlobError('Vercel Blob: Failed to fetch blob: 403 Forbidden');
      if (illeggibili.has(percorso)) return { statusCode: 404, stream: null, blob: {} };
      const f = file.get(percorso);
      if (!f) return null;
      return { statusCode: 200, stream: new Response(f.corpo).body, blob: { etag: f.etag, contentType: f.tipo } };
    },
    put: async (percorso: string, corpo: unknown, opzioni: { access: 'public' | 'private'; token?: string; ifMatch?: string; allowOverwrite?: boolean; addRandomSuffix?: boolean; contentType: string }) => {
      chiamate.put++;
      controllaToken(opzioni);
      if (opzioni.access !== store.accesso) throw new BlobError(`Vercel Blob: this store accepts only ${store.accesso} blobs`);
      if (intrusa) {
        const fn = intrusa;
        intrusa = null;
        fn();
      }
      const f = file.get(percorso);
      if (opzioni.ifMatch && (!f || f.etag !== opzioni.ifMatch)) throw new BlobPreconditionFailedError('cambiato');
      if (!opzioni.ifMatch && opzioni.allowOverwrite === false && f) throw new BlobError('Vercel Blob: This blob already exists, use allowOverwrite: true');
      const dove = opzioni.addRandomSuffix ? `${percorso}~${++contatore}` : percorso;
      const etag = `e${++contatore}`;
      file.set(dove, { corpo: String(corpo), etag, tipo: opzioni.contentType, quando: orologio.adesso });
      return { pathname: dove, etag, url: url(dove) };
    },
    list: async ({ prefix = '', limit, token }: { prefix?: string; limit?: number; token?: string }) => {
      chiamate.list++;
      controllaToken({ token });
      const blobs = [...file.entries()].filter(([k]) => k.startsWith(prefix)).map(([pathname, f]) => ({ pathname, url: url(pathname), size: f.corpo.length, uploadedAt: f.quando }));
      return { blobs: limit ? blobs.slice(0, limit) : blobs, hasMore: false };
    },
  };
});

vi.mock('@vercel/blob', () => ({
  BlobError: finto.BlobError,
  BlobNotFoundError: finto.BlobNotFoundError,
  BlobPreconditionFailedError: finto.BlobPreconditionFailedError,
  get: finto.get,
  head: finto.head,
  put: finto.put,
  list: finto.list,
}));

const { archivio, svuotaMemoria } = await import('@/lib/redazione/archivio-server');
const { dimenticaAccessoStore } = await import('@/lib/redazione/blob-server');

const ID = (n: number) => n.toString(16).padStart(32, '0');
const ADESSO = new Date('2026-10-12T10:00:00Z');
const storia = (n: number): Contenuto => nuovoContenuto(ID(n), 'storia', 'Giulia', { immagini: [ID(900 + n)], didascalia: '', formato: '1:1' }, ADESSO);
const indice = () => JSON.parse(finto.file.get('redazione/indice.json')!.corpo) as { revisione: number; contenuti: Contenuto[] };
const azzera = () => Object.assign(finto.chiamate, { get: 0, head: 0, put: 0, list: 0 });

describe('archivio su Vercel Blob', () => {
  beforeEach(() => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_finto_segreto');
    finto.file.clear();
    finto.rotti.clear();
    finto.store.accesso = 'private';
    finto.store.rifiutaPrivato = false;
    dimenticaAccessoStore();
    finto.orologio.adesso = ADESSO;
    svuotaMemoria();
    azzera();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('al primo avvio costruisce l\'indice dai file dei contenuti, poi non li rilegge più', async () => {
    // I contenuti salvati prima dell'indice, un file ciascuno.
    finto.scrivi(`redazione/contenuti/${ID(1)}.json`, JSON.stringify(storia(1)));
    finto.scrivi(`redazione/contenuti/${ID(2)}.json`, JSON.stringify(storia(2)));

    const stato = await archivio().stato();
    expect(stato.contenuti.map((c) => c.id).sort()).toEqual([ID(1), ID(2)]);
    expect(indice().contenuti).toHaveLength(2);

    // Un aggiornamento del portale subito dopo: nessuna operazione sullo storage (Vercel le conta);
    // passati 15 secondi, una sola domanda sui metadati e nessun download.
    azzera();
    await archivio().stato();
    expect(finto.chiamate).toEqual({ get: 0, head: 0, put: 0, list: 0 });
    vi.useFakeTimers({ now: Date.now() + 20_000, toFake: ['Date'] });
    await archivio().stato();
    vi.useRealTimers();
    expect(finto.chiamate).toEqual({ get: 0, head: 1, put: 0, list: 0 });
  });

  it('una copia che non si legge non blocca l\'indice: si salta e la riprende il riallineamento', async () => {
    finto.scrivi(`redazione/contenuti/${ID(1)}.json`, JSON.stringify(storia(1)));
    finto.scrivi(`redazione/contenuti/${ID(2)}.json`, JSON.stringify(storia(2)));
    finto.rotti.add(`redazione/contenuti/${ID(2)}.json`);
    const silenzio = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect((await archivio().stato()).contenuti.map((c) => c.id)).toEqual([ID(1)]);
    finto.rotti.clear();
    expect(await archivio().riallinea()).toBe(1);
    expect((await archivio().stato()).contenuti).toHaveLength(2);
    silenzio.mockRestore();
  });

  it('con tanti contenuti l\'indice si costruisce a tappe: ogni richiesta salva i progressi e la successiva continua', async () => {
    // Budget zero: ogni richiesta legge un solo lotto (16 copie) e passa la mano.
    vi.stubEnv('REDAZIONE_COSTRUZIONE_MS', '0');
    for (let i = 1; i <= 20; i++) finto.scrivi(`redazione/contenuti/${ID(i)}.json`, JSON.stringify(storia(i)));

    await expect(archivio().stato()).rejects.toMatchObject({ status: 503, codice: 'in_costruzione' });
    const parziale = JSON.parse(finto.file.get('redazione/indice.json')!.corpo) as { contenuti: unknown[]; daLeggere: string[] };
    expect(parziale.contenuti).toHaveLength(16);
    expect(parziale.daLeggere).toHaveLength(4);
    // Nel frattempo non si pubblica: si riprova fra qualche secondo, niente va perso.
    await expect(archivio().crea(storia(99))).rejects.toMatchObject({ status: 503, codice: 'in_costruzione' });

    const completo = await archivio().stato();
    expect(completo.contenuti).toHaveLength(20);
    expect(completo.daLeggere).toBeUndefined();
    expect(await archivio().riallinea()).toBe(0);
    expect((await archivio().crea(storia(99))).rev).toBe(1);
  });

  it('due richieste che costruiscono insieme: vale la prima a salvare, la seconda continua da lì', async () => {
    vi.stubEnv('REDAZIONE_COSTRUZIONE_MS', '0');
    for (let i = 1; i <= 20; i++) finto.scrivi(`redazione/contenuti/${ID(i)}.json`, JSON.stringify(storia(i)));
    // La richiesta A sta leggendo il primo lotto; prima che salvi, B ha già salvato il suo.
    finto.intromettiti(() => {
      finto.scrivi('redazione/indice.json', JSON.stringify({ revisione: 0, contenuti: [storia(1)], daLeggere: [ID(2), ID(3)] }));
    });
    await expect(archivio().stato()).rejects.toMatchObject({ codice: 'in_costruzione' });
    const finale = await archivio().stato();
    expect(finale.contenuti.map((c) => c.id)).toEqual([ID(1), ID(2), ID(3)]);
  });

  it('riallinea: recupera i contenuti scritti fuori dall\'indice, senza toccare gli altri', async () => {
    await archivio().crea(storia(1));
    await archivio().crea(storia(2));
    expect(await archivio().riallinea()).toBe(0);

    // Un'ora dopo la versione precedente del sito scrive solo le copie: un contenuto nuovo e un commento.
    finto.orologio.adesso = new Date(ADESSO.getTime() + 3600_000);
    finto.scrivi(`redazione/contenuti/${ID(3)}.json`, JSON.stringify(storia(3)));
    const commentata = aggiungiCommento(storia(1), { nome: 'Pietro', ruolo: 'revisore' }, { tipo: 'consiglio', testo: 'Ok', stato: 'approvato' }, ID(55), finto.orologio.adesso);
    finto.scrivi(`redazione/contenuti/${ID(1)}.json`, JSON.stringify(commentata));

    azzera();
    expect(await archivio().riallinea()).toBe(2);
    const stato = await archivio().stato();
    expect(stato.contenuti.map((c) => [c.id, c.stato]).sort()).toEqual([
      [ID(1), 'approvato'],
      [ID(2), 'da_rivedere'],
      [ID(3), 'da_rivedere'],
    ]);
    // Fatto una volta, la volta dopo non c'è niente da leggere.
    expect(await archivio().riallinea()).toBe(0);
  });

  it('store pubblico: lo capisce dagli indirizzi e legge e scrive con l\'accesso giusto', async () => {
    finto.store.accesso = 'public';
    finto.scrivi(`redazione/contenuti/${ID(1)}.json`, JSON.stringify(storia(1)));
    expect((await archivio().stato()).contenuti).toHaveLength(1);
    const creato = await archivio().crea(storia(2));
    expect(creato.rev).toBe(1);
    expect(finto.file.has('redazione/indice.json')).toBe(true);
    expect((await archivio().leggi(ID(2)))?.id).toBe(ID(2));
  });

  it('store privato che rifiuta la lettura diretta (403): passa dall\'indirizzo pubblico e se lo ricorda', async () => {
    finto.store.rifiutaPrivato = true;
    finto.scrivi(`redazione/contenuti/${ID(1)}.json`, JSON.stringify(storia(1)));
    expect((await archivio().stato()).contenuti.map((c) => c.id)).toEqual([ID(1)]);
    // Da qui in poi va dritto per l'indirizzo pubblico: una lettura, non due.
    azzera();
    expect((await archivio().leggiMedia(ID(1)))).toBeNull();
    finto.scrivi(`redazione/media/${ID(5)}`, 'jpeg');
    expect((await archivio().leggiMedia(ID(5)))?.tipo).toBe('application/json');
    expect(finto.chiamate.get).toBe(1);
  });

  it('token con spazi o virgolette attorno: si pulisce prima di usarlo', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', ' "vercel_blob_rw_finto_segreto"\n');
    await archivio().crea(storia(1));
    expect((await archivio().stato()).contenuti).toHaveLength(1);
  });

  it('token sbagliato: l\'errore arriva chiaro, non si inventa un archivio vuoto', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_finto_altro');
    await expect(archivio().stato()).rejects.toThrow(/Access denied/);
  });

  it('ogni scrittura porta avanti la revisione e lascia la copia del contenuto e lo storico', async () => {
    const creato = await archivio().crea(storia(1));
    expect(creato.rev).toBe(1);
    const aggiornato = await archivio().aggiorna(ID(1), (c) => ({ ...c, stato: 'approvato' }));
    expect(aggiornato).toMatchObject({ rev: 2, stato: 'approvato' });
    expect(indice()).toMatchObject({ revisione: 2, contenuti: [{ id: ID(1), stato: 'approvato', rev: 2 }] });
    expect(JSON.parse(finto.file.get(`redazione/contenuti/${ID(1)}.json`)!.corpo)).toMatchObject({ stato: 'approvato' });
    expect([...finto.file.keys()].filter((k) => k.startsWith(`redazione/storico/${ID(1)}/`))).toHaveLength(2);
    await expect(archivio().crea(storia(1))).rejects.toMatchObject({ status: 409 });
  });

  it('due persone che scrivono insieme: la seconda rilegge e riprova, nessuna modifica si perde', async () => {
    await archivio().crea(storia(1));
    await archivio().crea(storia(2));
    // Mentre il revisore commenta la storia 1, un'altra richiesta approva la storia 2.
    finto.intromettiti(() => {
      const altro = indice();
      altro.revisione++;
      altro.contenuti = altro.contenuti.map((c) => (c.id === ID(2) ? { ...c, stato: 'approvato', rev: altro.revisione } : c));
      finto.scrivi('redazione/indice.json', JSON.stringify(altro));
    });
    await archivio().aggiorna(ID(1), (c) =>
      aggiungiCommento(c, { nome: 'Pietro', ruolo: 'revisore' }, { tipo: 'correzione', testo: 'Accorcia', stato: 'da_correggere' }, ID(77), ADESSO),
    );
    const finale = indice();
    expect(finale.contenuti.find((c) => c.id === ID(1))).toMatchObject({ stato: 'da_correggere', rev: 4 });
    expect(finale.contenuti.find((c) => c.id === ID(2))).toMatchObject({ stato: 'approvato', rev: 3 });
    expect(finale.revisione).toBe(4);
  });

  it('gli errori della modifica (permessi, validazione) non si riprovano', async () => {
    await archivio().crea(storia(1));
    azzera();
    const modifica = vi.fn(() => {
      throw new Error('vietato');
    });
    await expect(archivio().aggiorna(ID(1), modifica)).rejects.toThrow('vietato');
    expect(modifica).toHaveBeenCalledTimes(1);
    expect(finto.chiamate.put).toBe(0);
  });

  it('l\'elenco dei ragazzi si modifica senza perdere le modifiche di un altro revisore', async () => {
    await archivio().aggiornaPersone(() => [{ nome: 'Sara', chiave: 'sara', attiva: true, aggiuntaIl: '', aggiuntaDa: 'Pietro' }]);
    finto.intromettiti(() =>
      finto.scrivi(
        'redazione/impostazioni/persone.json',
        JSON.stringify([
          { nome: 'Sara', chiave: 'sara', attiva: true, aggiuntaIl: '', aggiuntaDa: 'Pietro' },
          { nome: 'Luca', chiave: 'luca', attiva: true, aggiuntaIl: '', aggiuntaDa: 'Jacopo' },
        ]),
      ),
    );
    const persone = await archivio().aggiornaPersone((p) => p.map((x) => (x.chiave === 'sara' ? { ...x, attiva: false } : x)));
    expect(persone.map((p) => [p.chiave, p.attiva])).toEqual([
      ['sara', false],
      ['luca', true],
    ]);
  });
});
