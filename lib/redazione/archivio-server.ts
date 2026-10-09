import { BlobPreconditionFailedError, del, get, list, put } from '@vercel/blob';
import { ID_VALIDO } from './regole';
import type { Contenuto } from './tipi';

/*
 * Archivio del portale della redazione nello storage privato di Vercel Blob: un file JSON per
 * contenuto (con versioni e commenti) e un file per immagine. Niente è pubblico: le immagini
 * passano da /api/redazione/media, che controlla la sessione. Le modifiche sono condizionate
 * all'ETag letto, così due persone che commentano insieme non si cancellano a vicenda.
 * Senza storage (sviluppo) resta tutto in memoria.
 */

const CARTELLA_CONTENUTI = 'redazione/contenuti/';
const CARTELLA_MEDIA = 'redazione/media/';
const TENTATIVI = 4;
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
  /** Cancella il contenuto (dopo il controllo sui permessi) e lo restituisce. */
  elimina(id: string, controlla: (contenuto: Contenuto) => void): Promise<Contenuto>;
  salvaMedia(id: string, dati: Uint8Array, tipo: string): Promise<void>;
  eliminaMedia(ids: string[]): Promise<void>;
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

async function scriviBlob(percorso: string, contenuto: Contenuto, etag: string | null): Promise<void> {
  await put(percorso, JSON.stringify(contenuto), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
  });
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
    const letti = await aGruppi(percorsi, LETTURE_IN_PARALLELO, (p) => leggiBlob(p).catch(() => null));
    return letti.flatMap((l) => (l ? [l.contenuto] : []));
  },

  async leggi(id) {
    return (await leggiBlob(percorsoContenuto(id)))?.contenuto ?? null;
  },

  async crea(contenuto) {
    await scriviBlob(percorsoContenuto(contenuto.id), contenuto, null);
  },

  async aggiorna(id, modifica) {
    const percorso = percorsoContenuto(id);
    for (let tentativo = 1; ; tentativo++) {
      const letto = await leggiBlob(percorso);
      if (!letto) throw new ErroreRedazione(404, 'Contenuto non trovato.');
      const nuovo = modifica(letto.contenuto);
      try {
        await scriviBlob(percorso, nuovo, letto.etag);
        return nuovo;
      } catch (e) {
        if (!(e instanceof BlobPreconditionFailedError) || tentativo >= TENTATIVI) throw e;
      }
    }
  },

  async elimina(id, controlla) {
    const percorso = percorsoContenuto(id);
    const letto = await leggiBlob(percorso);
    if (!letto) throw new ErroreRedazione(404, 'Contenuto non trovato.');
    controlla(letto.contenuto);
    await del(percorso);
    return letto.contenuto;
  },

  async salvaMedia(id, dati, tipo) {
    await put(percorsoMedia(id), Buffer.from(dati), { access: 'private', contentType: tipo, addRandomSuffix: false });
  },

  async eliminaMedia(ids) {
    if (ids.length > 0) await del(ids.map(percorsoMedia));
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
  async elimina(id, controlla) {
    const c = await this.leggi(id);
    if (!c) throw new ErroreRedazione(404, 'Contenuto non trovato.');
    controlla(c);
    memoria().contenuti.delete(id);
    return c;
  },
  async salvaMedia(id, dati, tipo) {
    percorsoMedia(id);
    memoria().media.set(id, { dati, tipo });
  },
  async eliminaMedia(ids) {
    for (const id of ids) memoria().media.delete(id);
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
