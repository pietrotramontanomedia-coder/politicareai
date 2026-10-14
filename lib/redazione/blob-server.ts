import { BlobError, BlobNotFoundError, get, head, list, put } from '@vercel/blob';

/*
 * Lo strato fra il portale della redazione e Vercel Blob. Si adatta allo store com'è, senza
 * configurazione: capisce da solo se è pubblico o privato (dall'indirizzo dei file che contiene),
 * pulisce il token da spazi e virgolette, e se la lettura diretta di un file privato viene
 * rifiutata prova per l'indirizzo pubblico. Ogni lettura passa dai metadati (head, sempre
 * freschi): l'ETag che ne esce è lo stesso che accettano le scritture condizionate, e permette di
 * saltare il download quando il file non è cambiato.
 */

export type AccessoStore = 'public' | 'private';

/** Il token copiato nelle variabili d'ambiente arriva a volte con spazi, a capo o virgolette. */
export function tokenBlob(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN?.replace(/[\s"'`]/g, '') || undefined;
}

export function blobConfigurato(): boolean {
  return tokenBlob() !== undefined;
}

let accessoNoto: AccessoStore | null = null;
/** Store privato che rifiuta la lettura diretta ma serve i file per l'indirizzo pubblico: si legge da lì. */
let letturaPubblica = false;

/** Per i test e per chi cambia store a caldo. */
export function dimenticaAccessoStore(): void {
  accessoNoto = null;
  letturaPubblica = false;
}

/**
 * Pubblico o privato: lo dice l'indirizzo dei file già nello store (REDAZIONE_BLOB_ACCESSO per
 * forzarlo). Uno store vuoto si considera privato.
 */
export async function accessoStore(): Promise<AccessoStore> {
  if (accessoNoto) return accessoNoto;
  const forzato = process.env.REDAZIONE_BLOB_ACCESSO?.trim();
  if (forzato === 'public' || forzato === 'private') return (accessoNoto = forzato);
  const pagina = await list({ limit: 1, token: tokenBlob() });
  return (accessoNoto = accessoDaUrl(pagina.blobs[0]?.url) ?? 'private');
}

export function accessoDaUrl(url: string | undefined): AccessoStore | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host.includes('.public.blob.') ? 'public' : host.includes('.private.blob.') ? 'private' : null;
  } catch {
    return null;
  }
}

export interface MetadatiBlob {
  url: string;
  etag: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
}

/** I metadati di un file, sempre freschi (passano dall'API, non dalla CDN); null se non esiste. */
export async function metadatiBlob(percorso: string): Promise<MetadatiBlob | null> {
  try {
    const h = await head(percorso, { token: tokenBlob() });
    return { url: h.url, etag: h.etag, contentType: h.contentType, size: h.size, uploadedAt: h.uploadedAt };
  } catch (errore) {
    if (errore instanceof BlobNotFoundError) return null;
    throw errore;
  }
}

export type LetturaBlob = { statusCode: 200; stream: ReadableStream<Uint8Array>; etag: string; contentType: string } | { statusCode: 304; etag: string; contentType: string };

function eRifiuto(errore: unknown): boolean {
  return errore instanceof BlobError && /\b40[13]\b/.test(errore.message);
}

/** Il contenuto di un file per l'indirizzo che l'API dice suo, bypassando la cache della CDN. */
async function scaricaPerUrl(url: string, etag: string, accesso: AccessoStore): Promise<ReadableStream<Uint8Array>> {
  const indirizzo = new URL(url);
  // Con un parametro legato all'ETag ogni versione ha un indirizzo suo: la CDN non può servirne una vecchia.
  indirizzo.searchParams.set('v', etag.replace(/[^A-Za-z0-9]/g, ''));
  if (accesso === 'private') indirizzo.searchParams.set('cache', '0');
  const r = await get(indirizzo.toString(), { access: accesso, token: tokenBlob() });
  if (!r) throw new BlobError(`Failed to fetch blob: 404 (${url})`);
  if (r.statusCode !== 200) throw new BlobError(`Failed to fetch blob: ${r.statusCode}`);
  return r.stream;
}

/**
 * Legge un file. Con `ifNoneMatch` uguale all'ETag attuale non scarica niente (304). Se la lettura
 * per l'indirizzo privato è rifiutata, prova per quello pubblico e se funziona lo ricorda.
 */
export async function leggiBlob(percorso: string, ifNoneMatch?: string): Promise<LetturaBlob | null> {
  const meta = await metadatiBlob(percorso);
  if (!meta) return null;
  if (ifNoneMatch && ifNoneMatch === meta.etag) return { statusCode: 304, etag: meta.etag, contentType: meta.contentType };
  const accesso = accessoDaUrl(meta.url) ?? (await accessoStore());
  const pubblico = meta.url.replace('.private.blob.', '.public.blob.');
  if (accesso === 'private' && letturaPubblica) {
    return { statusCode: 200, stream: await scaricaPerUrl(pubblico, meta.etag, 'public'), etag: meta.etag, contentType: meta.contentType };
  }
  try {
    return { statusCode: 200, stream: await scaricaPerUrl(meta.url, meta.etag, accesso), etag: meta.etag, contentType: meta.contentType };
  } catch (errore) {
    if (accesso !== 'private' || !eRifiuto(errore)) throw errore;
    // Store privato che rifiuta la lettura diretta: per l'indirizzo pubblico, se il file è raggiungibile.
    try {
      const stream = await scaricaPerUrl(pubblico, meta.etag, 'public');
      letturaPubblica = true;
      return { statusCode: 200, stream, etag: meta.etag, contentType: meta.contentType };
    } catch {
      throw errore;
    }
  }
}

/** Un JSON letto per intero, con il suo ETag. */
export async function leggiBlobJson<T>(percorso: string, ifNoneMatch?: string): Promise<{ statusCode: 200; dati: T; etag: string } | { statusCode: 304; etag: string } | null> {
  const r = await leggiBlob(percorso, ifNoneMatch);
  if (!r) return null;
  if (r.statusCode === 304) return { statusCode: 304, etag: r.etag };
  return { statusCode: 200, dati: (await new Response(r.stream).json()) as T, etag: r.etag };
}

export interface OpzioniScrittura {
  contentType: string;
  /** Scrive solo se nessuno ha cambiato il file dopo questo ETag. */
  ifMatch?: string;
  /** Senza ifMatch: se il file esiste, sovrascriverlo (true) o fallire (false, predefinito). */
  allowOverwrite?: boolean;
  /** Suffisso casuale nel nome (per lo storico: nessun file viene mai sovrascritto). */
  addRandomSuffix?: boolean;
}

/** Scrive un file con l'accesso giusto per lo store. Restituisce l'ETag (quello dell'API, buono per ifMatch). */
export async function scriviBlob(percorso: string, corpo: string | Buffer, opzioni: OpzioniScrittura): Promise<{ etag: string; url: string; pathname: string }> {
  const accesso = await accessoStore();
  const r = await put(percorso, corpo, {
    access: accesso,
    token: tokenBlob(),
    contentType: opzioni.contentType,
    addRandomSuffix: opzioni.addRandomSuffix ?? false,
    ...(opzioni.ifMatch ? { ifMatch: opzioni.ifMatch } : { allowOverwrite: opzioni.allowOverwrite ?? false }),
    // Su uno store pubblico la CDN non deve tenere a lungo una versione vecchia.
    ...(accesso === 'public' ? { cacheControlMaxAge: 60 } : {}),
  });
  return { etag: r.etag, url: r.url, pathname: r.pathname };
}

export interface VoceElenco {
  pathname: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

/** Tutti i file con un prefisso, pagina dopo pagina. */
export async function elencaBlob(prefix: string): Promise<VoceElenco[]> {
  const voci: VoceElenco[] = [];
  let cursor: string | undefined;
  do {
    const pagina = await list({ prefix, cursor, token: tokenBlob() });
    voci.push(...pagina.blobs.map((b) => ({ pathname: b.pathname, url: b.url, size: b.size, uploadedAt: b.uploadedAt })));
    cursor = pagina.hasMore ? pagina.cursor : undefined;
  } while (cursor);
  return voci;
}
