import { BlobPreconditionFailedError } from '@vercel/blob';

/*
 * Il client dell'archivio sul nostro server (servizi/archivio: PostgreSQL su Hetzner). Fa le
 * stesse cose che l'app faceva con Vercel Blob: metadati, lettura (con 304 se il file non è
 * cambiato), scrittura condizionata all'ETag, elenco per prefisso. Si accende con ARCHIVIO_URL e
 * ARCHIVIO_TOKEN; senza, l'app resta com'era.
 *
 * Una scrittura rifiutata perché il file è cambiato lancia BlobPreconditionFailedError, la stessa
 * di Vercel Blob, così chi riprova in caso di conflitto non deve cambiare.
 */

const TIMEOUT_MS = 15_000;
const TENTATIVI = 3;

export function archivioNostroConfigurato(): boolean {
  return Boolean(process.env.ARCHIVIO_URL?.trim() && process.env.ARCHIVIO_TOKEN?.trim());
}

// Senza «parameter property» nel costruttore: così anche gli strumenti in node (strumenti/*.mjs) lo importano.
export class ErroreArchivio extends Error {
  readonly status: number;

  constructor(status: number, messaggio: string) {
    super(messaggio);
    this.name = 'ErroreArchivio';
    this.status = status;
  }
}

function base(): string {
  return process.env.ARCHIVIO_URL!.trim().replace(/\/+$/, '');
}

function indirizzo(percorso: string): string {
  return `${base()}/o/${percorso.split('/').map(encodeURIComponent).join('/')}`;
}

/** Una richiesta all'archivio; riprova solo sugli intoppi di rete e sugli errori del server. */
async function chiama(url: string, init: RequestInit = {}): Promise<Response> {
  for (let tentativo = 1; ; tentativo++) {
    try {
      const r = await fetch(url, {
        ...init,
        headers: { authorization: `Bearer ${process.env.ARCHIVIO_TOKEN!.trim()}`, ...init.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
      if (r.status < 500 || tentativo >= TENTATIVI) return r;
    } catch (errore) {
      if (tentativo >= TENTATIVI) throw new ErroreArchivio(503, `Archivio non raggiungibile: ${errore instanceof Error ? errore.message : String(errore)}`);
    }
    await new Promise((r) => setTimeout(r, 300 * tentativo));
  }
}

async function errore(r: Response): Promise<ErroreArchivio> {
  const testo = await r.text().catch(() => '');
  let messaggio = testo;
  try {
    messaggio = (JSON.parse(testo) as { errore?: string }).errore ?? testo;
  } catch {
    /* testo semplice */
  }
  return new ErroreArchivio(r.status, `Archivio: ${r.status} ${messaggio}`.trim());
}

export interface MetadatiOggetto {
  etag: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
}

function metadatiDa(r: Response): MetadatiOggetto {
  return {
    etag: r.headers.get('etag') ?? '',
    contentType: r.headers.get('content-type') ?? 'application/octet-stream',
    size: Number(r.headers.get('content-length') ?? 0),
    uploadedAt: new Date(r.headers.get('x-aggiornato') ?? r.headers.get('last-modified') ?? Date.now()),
  };
}

export async function metadatiOggetto(percorso: string): Promise<MetadatiOggetto | null> {
  const r = await chiama(indirizzo(percorso), { method: 'HEAD' });
  if (r.status === 404) return null;
  if (!r.ok) throw await errore(r);
  return metadatiDa(r);
}

export type LetturaOggetto =
  | { statusCode: 200; corpo: Uint8Array; etag: string; contentType: string }
  | { statusCode: 304; etag: string; contentType: string };

export async function leggiOggetto(percorso: string, ifNoneMatch?: string): Promise<LetturaOggetto | null> {
  const r = await chiama(indirizzo(percorso), { headers: ifNoneMatch ? { 'if-none-match': ifNoneMatch } : {} });
  if (r.status === 404) return null;
  if (r.status === 304) return { statusCode: 304, etag: r.headers.get('etag') ?? ifNoneMatch ?? '', contentType: r.headers.get('content-type') ?? '' };
  if (!r.ok) throw await errore(r);
  const { etag, contentType } = metadatiDa(r);
  return { statusCode: 200, corpo: new Uint8Array(await r.arrayBuffer()), etag, contentType };
}

/** Un JSON letto per intero; null se il file non c'è. */
export async function leggiJsonNostro<T>(percorso: string): Promise<T | null> {
  const r = await leggiOggetto(percorso);
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(new TextDecoder().decode(r.corpo)) as T;
}

export interface OpzioniScritturaNostra {
  contentType: string;
  /** Scrive solo se il file ha ancora questo ETag. */
  ifMatch?: string;
  /** Senza ifMatch: sovrascrivere (true) o scrivere solo se il file non esiste (false, predefinito). */
  allowOverwrite?: boolean;
  /** Suffisso casuale nel nome, prima dell'estensione (per le copie dello storico). */
  addRandomSuffix?: boolean;
}

function conSuffisso(percorso: string): string {
  const suffisso = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const punto = percorso.lastIndexOf('.');
  return punto > percorso.lastIndexOf('/') ? `${percorso.slice(0, punto)}-${suffisso}${percorso.slice(punto)}` : `${percorso}-${suffisso}`;
}

export async function scriviOggetto(percorso: string, corpo: string | Uint8Array, opzioni: OpzioniScritturaNostra): Promise<{ etag: string; pathname: string }> {
  const finale = opzioni.addRandomSuffix ? conSuffisso(percorso) : percorso;
  const condizione: Record<string, string> = opzioni.ifMatch
    ? { 'if-match': opzioni.ifMatch }
    : opzioni.allowOverwrite
      ? {}
      : { 'if-none-match': '*' };
  const r = await chiama(indirizzo(finale), {
    method: 'PUT',
    headers: { 'content-type': opzioni.contentType, ...condizione },
    body: typeof corpo === 'string' ? corpo : new Blob([corpo as Uint8Array<ArrayBuffer>]),
  });
  if (r.status === 412) throw new BlobPreconditionFailedError();
  if (!r.ok) throw await errore(r);
  const dati = (await r.json()) as { etag: string };
  return { etag: dati.etag, pathname: finale };
}

/** Scrive un JSON sovrascrivendo quello che c'è. */
export async function scriviJsonNostro(percorso: string, dati: unknown): Promise<void> {
  await scriviOggetto(percorso, JSON.stringify(dati), { contentType: 'application/json', allowOverwrite: true });
}

export interface VoceNostra {
  pathname: string;
  size: number;
  uploadedAt: Date;
  etag: string;
}

export async function elencaOggetti(prefisso: string): Promise<VoceNostra[]> {
  const voci: VoceNostra[] = [];
  let dopo: string | null = '';
  while (dopo !== null) {
    const url = `${base()}/lista?${new URLSearchParams({ prefisso, dopo, limite: '1000' })}`;
    const r = await chiama(url);
    if (!r.ok) throw await errore(r);
    const pagina = (await r.json()) as { oggetti: { percorso: string; dimensione: number; aggiornato: string; etag: string }[]; dopo: string | null };
    voci.push(...pagina.oggetti.map((o) => ({ pathname: o.percorso, size: o.dimensione, uploadedAt: new Date(o.aggiornato), etag: o.etag })));
    dopo = pagina.dopo;
  }
  return voci;
}
