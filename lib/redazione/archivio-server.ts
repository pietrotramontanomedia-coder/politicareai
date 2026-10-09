import { BlobPreconditionFailedError, get, list, put } from '@vercel/blob';
import { ID_VALIDO } from './regole';
import type { Contenuto } from './tipi';

/*
 * Archivio del portale della redazione nello storage privato di Vercel Blob: un file JSON per
 * contenuto (con versioni e commenti) e un file per immagine. Niente è pubblico: le immagini
 * passano da /api/redazione/media, che controlla la sessione. Le modifiche sono condizionate
 * all'ETag letto, così due persone che commentano insieme non si cancellano a vicenda.
 *
 * Non si perde niente: nessuna funzione cancella file (eliminare un contenuto è solo un segno nel
 * suo JSON), e ogni scrittura lascia anche una copia datata in redazione/storico/<id>/, da cui si
 * può ricostruire qualsiasi stato passato. Senza storage (sviluppo) resta tutto in memoria.
 */

const CARTELLA_CONTENUTI = 'redazione/contenuti/';
const CARTELLA_MEDIA = 'redazione/media/';
const CARTELLA_STORICO = 'redazione/storico/';
const TENTATIVI = 4;
/** Letture ripetute prima di arrendersi: un intoppo di rete non deve far sparire un contenuto dal feed. */
const TENTATIVI_LETTURA = 3;
const LETTURE_IN_PARALLELO = 16;

export class ErroreRedazione extends Error {
  constructor(
    readonly status: number,
    messaggio: string,
  ) {
    super(messaggio);
    this.name = 'ErroreRedazione';
  }
}

export interface Media {
  corpo: ReadableStream<Uint8Array> | Uint8Array;
  tipo: string;
}

export interface Archivio {
  elenca(): Promise<Contenuto[]>;
  leggi(id: string): Promise<Contenuto | null>;
  crea(contenuto: Contenuto): Promise<void>;
  /** Legge, applica la modifica e riscrive; se nel frattempo qualcuno ha scritto, riprova. */
  aggiorna(id: string, modifica: (contenuto: Contenuto) => Contenuto): Promise<Contenuto>;
  salvaMedia(id: string, dati: Uint8Array, tipo: string): Promise<void>;
  leggiMedia(id: string): Promise<Media | null>;
}

function percorsoContenuto(id: string): string {
  if (!ID_VALIDO.test(id)) throw new ErroreRedazione(404, 'Contenuto non trovato.');
  return `${CARTELLA_CONTENUTI}${id}.json`;
}

function percorsoMedia(id: string): string {
  if (!ID_VALIDO.test(id)) throw new ErroreRedazione(404, 'Immagine non trovata.');
  return `${CARTELLA_MEDIA}${id}`;
}

async function aGruppi<T, R>(elementi: T[], quanti: number, fn: (e: T) => Promise<R>): Promise<R[]> {
  const risultati: R[] = [];
  for (let i = 0; i < elementi.length; i += quanti) {
    risultati.push(...(await Promise.all(elementi.slice(i, i + quanti).map(fn))));
  }
  return risultati;
}

/* ---------- Vercel Blob ---------- */

async function leggiBlob(percorso: string): Promise<{ contenuto: Contenuto; etag: string } | null> {
  const risultato = await get(percorso, { access: 'private', useCache: false });
  if (!risultato || risultato.statusCode !== 200) return null;
  return { contenuto: (await new Response(risultato.stream).json()) as Contenuto, etag: risultato.blob.etag };
}

async function leggiConTentativi(percorso: string): Promise<{ contenuto: Contenuto; etag: string } | null> {
  for (let tentativo = 1; ; tentativo++) {
    try {
      return await leggiBlob(percorso);
    } catch (errore) {
      if (tentativo >= TENTATIVI_LETTURA) throw errore;
      await new Promise((r) => setTimeout(r, 250 * tentativo));
    }
  }
}

async function scriviBlob(percorso: string, contenuto: Contenuto, etag: string | null): Promise<void> {
  await put(percorso, JSON.stringify(contenuto), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
  });
}

/** Copia datata di ogni stato salvato: non si sovrascrive e non si cancella mai. */
async function scriviStorico(contenuto: Contenuto): Promise<void> {
  try {
    const quando = new Date().toISOString().replace(/[:.]/g, '-');
    await put(`${CARTELLA_STORICO}${contenuto.id}/${quando}.json`, JSON.stringify(contenuto), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: true,
    });
  } catch (errore) {
    // Il contenuto è già salvato: la copia mancata si segnala ma non blocca chi pubblica.
    console.error('[redazione] copia nello storico non riuscita', contenuto.id, errore);
  }
}

const archivioBlob: Archivio = {
  async elenca() {
    const percorsi: string[] = [];
    let cursor: string | undefined;
    do {
      const pagina = await list({ prefix: CARTELLA_CONTENUTI, cursor });
      percorsi.push(...pagina.blobs.map((b) => b.pathname));
      cursor = pagina.hasMore ? pagina.cursor : undefined;
    } while (cursor);
    // Se un contenuto non si legge neanche riprovando, meglio un errore (il browser tiene quello che
    // aveva già) che un feed in cui quel contenuto sembra sparito.
    const letti = await aGruppi(percorsi, LETTURE_IN_PARALLELO, (p) => leggiConTentativi(p));
    return letti.flatMap((l) => (l ? [l.contenuto] : []));
  },

  async leggi(id) {
    return (await leggiConTentativi(percorsoContenuto(id)))?.contenuto ?? null;
  },

  async crea(contenuto) {
    await scriviBlob(percorsoContenuto(contenuto.id), contenuto, null);
    await scriviStorico(contenuto);
  },

  async aggiorna(id, modifica) {
    const percorso = percorsoContenuto(id);
    for (let tentativo = 1; ; tentativo++) {
      const letto = await leggiBlob(percorso);
      if (!letto) throw new ErroreRedazione(404, 'Contenuto non trovato.');
      const nuovo = modifica(letto.contenuto);
      try {
        await scriviBlob(percorso, nuovo, letto.etag);
        await scriviStorico(nuovo);
        return nuovo;
      } catch (e) {
        if (!(e instanceof BlobPreconditionFailedError) || tentativo >= TENTATIVI) throw e;
      }
    }
  },

  async salvaMedia(id, dati, tipo) {
    await put(percorsoMedia(id), Buffer.from(dati), { access: 'private', contentType: tipo, addRandomSuffix: false, allowOverwrite: false });
  },

  async leggiMedia(id) {
    const risultato = await get(percorsoMedia(id), { access: 'private' });
    if (!risultato || risultato.statusCode !== 200) return null;
    return { corpo: risultato.stream, tipo: risultato.blob.contentType };
  },
};

/* ---------- Memoria (sviluppo e test) ---------- */

interface Memoria {
  contenuti: Map<string, Contenuto>;
  media: Map<string, { dati: Uint8Array; tipo: string }>;
}

const globale = globalThis as typeof globalThis & { __memoriaRedazione?: Memoria };

function memoria(): Memoria {
  globale.__memoriaRedazione ??= { contenuti: new Map(), media: new Map() };
  return globale.__memoriaRedazione;
}

export function svuotaMemoria(): void {
  globale.__memoriaRedazione = { contenuti: new Map(), media: new Map() };
}

const archivioMemoria: Archivio = {
  async elenca() {
    return [...memoria().contenuti.values()].map((c) => structuredClone(c));
  },
  async leggi(id) {
    percorsoContenuto(id);
    const c = memoria().contenuti.get(id);
    return c ? structuredClone(c) : null;
  },
  async crea(contenuto) {
    percorsoContenuto(contenuto.id);
    memoria().contenuti.set(contenuto.id, structuredClone(contenuto));
  },
  async aggiorna(id, modifica) {
    const c = await this.leggi(id);
    if (!c) throw new ErroreRedazione(404, 'Contenuto non trovato.');
    const nuovo = modifica(c);
    memoria().contenuti.set(id, structuredClone(nuovo));
    return nuovo;
  },
  async salvaMedia(id, dati, tipo) {
    percorsoMedia(id);
    memoria().media.set(id, { dati, tipo });
  },
  async leggiMedia(id) {
    percorsoMedia(id);
    const m = memoria().media.get(id);
    return m ? { corpo: m.dati, tipo: m.tipo } : null;
  },
};

export function archivio(): Archivio {
  return process.env.BLOB_READ_WRITE_TOKEN ? archivioBlob : archivioMemoria;
}
