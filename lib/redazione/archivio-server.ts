import { BlobPreconditionFailedError, get, list, put } from '@vercel/blob';
import { ID_VALIDO, OBIETTIVI_PREDEFINITI } from './regole';
import type { Contenuto, Obiettivi, Persona } from './tipi';

/*
 * Archivio del portale della redazione nello storage privato di Vercel Blob.
 *
 * Tutti i contenuti (con versioni, commenti e registro) stanno in un solo indice,
 * redazione/indice.json: è la fonte di verità. Ogni scrittura è condizionata all'ETag letto, così
 * due persone che commentano insieme non si cancellano a vicenda, e porta la revisione
 * dell'archivio un passo avanti. Il server tiene l'indice in memoria e a ogni richiesta chiede
 * allo storage solo se è cambiato (If-None-Match): un aggiornamento del portale costa una sola
 * domanda leggera, non una lettura per contenuto.
 *
 * Non si perde niente: nessuna funzione cancella file. Ogni contenuto ha anche la sua copia in
 * redazione/contenuti/<id>.json, e ogni scrittura lascia una copia datata in
 * redazione/storico/<id>/. Se l'indice manca (il primo avvio dopo questo cambio) si ricostruisce
 * dalle copie dei contenuti. Le immagini sono un file ciascuna e passano da
 * /api/redazione/media, che controlla la sessione. Senza storage (sviluppo) resta tutto in memoria.
 */

const FILE_INDICE = 'redazione/indice.json';
const CARTELLA_CONTENUTI = 'redazione/contenuti/';
const CARTELLA_MEDIA = 'redazione/media/';
const CARTELLA_STORICO = 'redazione/storico/';
const FILE_OBIETTIVI = 'redazione/impostazioni/obiettivi.json';
const FILE_PERSONE = 'redazione/impostazioni/persone.json';
/** Scritture concorrenti sullo stesso file: si rilegge e si riprova, con un'attesa a caso. */
const TENTATIVI_SCRITTURA = 8;
/** Letture ripetute prima di arrendersi: un intoppo di rete non deve far sparire niente. */
const TENTATIVI_LETTURA = 3;
const LETTURE_IN_PARALLELO = 16;

export class ErroreRedazione extends Error {
  constructor(
    readonly status: number,
    messaggio: string,
    /** Codice per il browser, quando deve fare qualcosa di diverso dal mostrare il messaggio. */
    readonly codice?: string,
  ) {
    super(messaggio);
    this.name = 'ErroreRedazione';
  }
}

/** L'indice è in costruzione: il browser aspetta qualche secondo e riprova da solo. */
export const CODICE_IN_COSTRUZIONE = 'in_costruzione';

export interface Media {
  corpo: ReadableStream<Uint8Array> | Uint8Array;
  tipo: string;
}

/** Lo stato dell'archivio: la revisione (cresce a ogni scrittura) e tutti i contenuti. */
export interface StatoArchivio {
  revisione: number;
  contenuti: Contenuto[];
  /**
   * Solo durante la prima costruzione: gli id delle copie ancora da leggere. Una funzione Vercel ha
   * pochi secondi: si legge quel che si fa in tempo, si salva, e la richiesta dopo continua da qui.
   */
  daLeggere?: string[];
}

/** Tempo che una richiesta dedica a costruire l'indice prima di salvare e passare la mano. */
function budgetCostruzioneMs(): number {
  const n = Number(process.env.REDAZIONE_COSTRUZIONE_MS);
  return Number.isFinite(n) && n >= 0 ? n : 7000;
}

export interface Archivio {
  /** Tutti i contenuti con la revisione dell'archivio. Non va modificato: è condiviso. */
  stato(): Promise<StatoArchivio>;
  elenca(): Promise<Contenuto[]>;
  leggi(id: string): Promise<Contenuto | null>;
  crea(contenuto: Contenuto): Promise<Contenuto>;
  /** Legge, applica la modifica e riscrive; se nel frattempo qualcuno ha scritto, riprova. */
  aggiorna(id: string, modifica: (contenuto: Contenuto) => Contenuto): Promise<Contenuto>;
  salvaMedia(id: string, dati: Uint8Array, tipo: string): Promise<void>;
  leggiMedia(id: string): Promise<Media | null>;
  /** Obiettivi giornalieri decisi da chi corregge; finché nessuno li cambia, quelli predefiniti. */
  leggiObiettivi(): Promise<Obiettivi>;
  salvaObiettivi(obiettivi: Obiettivi): Promise<void>;
  /** I ragazzi registrati da chi coordina (vuoto = chiunque abbia il codice). */
  leggiPersone(): Promise<Persona[]>;
  /** Modifica l'elenco a partire dall'ultima versione salvata, senza perdere modifiche altrui. */
  aggiornaPersone(modifica: (persone: Persona[]) => Persona[]): Promise<Persona[]>;
  /**
   * Rete di sicurezza: riporta nell'indice i contenuti che hanno una copia più recente
   * dell'indice stesso (per esempio scritti dalla versione precedente del sito durante il cambio).
   * Restituisce quanti ne ha recuperati.
   */
  riallinea(): Promise<number>;
}

function percorsoContenuto(id: string): string {
  if (!ID_VALIDO.test(id)) throw new ErroreRedazione(404, 'Contenuto non trovato.');
  return `${CARTELLA_CONTENUTI}${id}.json`;
}

function percorsoMedia(id: string): string {
  if (!ID_VALIDO.test(id)) throw new ErroreRedazione(404, 'Immagine non trovata.');
  return `${CARTELLA_MEDIA}${id}`;
}

function controllaId(id: string): void {
  percorsoContenuto(id);
}

async function aGruppi<T, R>(elementi: T[], quanti: number, fn: (e: T) => Promise<R>): Promise<R[]> {
  const risultati: R[] = [];
  for (let i = 0; i < elementi.length; i += quanti) {
    risultati.push(...(await Promise.all(elementi.slice(i, i + quanti).map(fn))));
  }
  return risultati;
}

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function conTentativi<T>(fn: () => Promise<T>): Promise<T> {
  for (let tentativo = 1; ; tentativo++) {
    try {
      return await fn();
    } catch (errore) {
      if (tentativo >= TENTATIVI_LETTURA) throw errore;
      await pausa(250 * tentativo);
    }
  }
}

/** Indice vuoto o con i contenuti di prima: la revisione parte da qui. */
function nuovoStato(contenuti: Contenuto[] = []): StatoArchivio {
  return { revisione: Math.max(0, ...contenuti.map((c) => c.rev ?? 0)), contenuti };
}

/** Applica una modifica all'archivio: il contenuto toccato prende la revisione successiva. */
function applica(stato: StatoArchivio, contenuto: Contenuto): { stato: StatoArchivio; contenuto: Contenuto } {
  const revisione = stato.revisione + 1;
  const nuovo = { ...contenuto, rev: revisione };
  const presente = stato.contenuti.some((c) => c.id === nuovo.id);
  const contenuti = presente ? stato.contenuti.map((c) => (c.id === nuovo.id ? nuovo : c)) : [...stato.contenuti, nuovo];
  return { stato: { revisione, contenuti }, contenuto: nuovo };
}

/* ---------- Vercel Blob ---------- */

/**
 * File JSON letti di recente, con il loro ETag: si richiedono con If-None-Match e, se non sono
 * cambiati, lo storage risponde 304 senza mandarli di nuovo.
 */
const cacheJson = new Map<string, { etag: string; dati: unknown }>();

async function leggiJson<T>(percorso: string): Promise<{ dati: T; etag: string } | null> {
  return conTentativi(async () => {
    const inCache = cacheJson.get(percorso);
    const risultato = await get(percorso, { access: 'private', useCache: false, ...(inCache ? { ifNoneMatch: inCache.etag } : {}) });
    if (!risultato) {
      cacheJson.delete(percorso);
      return null;
    }
    if (risultato.statusCode === 304 && inCache) return { dati: inCache.dati as T, etag: inCache.etag };
    if (risultato.statusCode !== 200) throw new Error(`lettura di ${percorso}: stato ${risultato.statusCode}`);
    const dati = (await new Response(risultato.stream).json()) as T;
    cacheJson.set(percorso, { etag: risultato.blob.etag, dati });
    return { dati, etag: risultato.blob.etag };
  });
}

/** Scrive un JSON solo se nessuno l'ha cambiato dopo la lettura (etag), o solo se non esiste (null). */
async function scriviJson(percorso: string, dati: unknown, etag: string | null): Promise<void> {
  const risultato = await put(percorso, JSON.stringify(dati), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
  });
  cacheJson.set(percorso, { etag: risultato.etag, dati });
}

/**
 * Legge l'ultima versione, applica la modifica e scrive a condizione che nessuno abbia scritto nel
 * frattempo; altrimenti riprova. Gli errori della modifica (permessi, validazione) passano subito.
 */
async function modificaJson<T, R>(percorso: string, iniziale: () => Promise<T>, modifica: (dati: T) => { dati: T; risultato: R }): Promise<R> {
  for (let tentativo = 1; ; tentativo++) {
    const letto = await leggiJson<T>(percorso);
    const { dati, risultato } = modifica(letto ? letto.dati : await iniziale());
    try {
      await scriviJson(percorso, dati, letto?.etag ?? null);
      return risultato;
    } catch (errore) {
      // Qualcuno ha scritto prima: si dimentica la copia in memoria e si riparte dall'ultima versione.
      cacheJson.delete(percorso);
      if (tentativo >= TENTATIVI_SCRITTURA) throw errore;
      if (!(errore instanceof BlobPreconditionFailedError) && letto) throw errore;
      await pausa(50 + Math.random() * 150 * tentativo);
    }
  }
}

/** Le copie per contenuto presenti nello storage, con la data in cui sono state scritte. */
async function elencaCopie(): Promise<{ percorso: string; id: string; scrittaIl: number }[]> {
  const copie: { percorso: string; id: string; scrittaIl: number }[] = [];
  let cursor: string | undefined;
  do {
    const pagina = await list({ prefix: CARTELLA_CONTENUTI, cursor });
    for (const b of pagina.blobs) {
      const id = b.pathname.slice(CARTELLA_CONTENUTI.length).replace(/\.json$/, '');
      if (ID_VALIDO.test(id)) copie.push({ percorso: b.pathname, id, scrittaIl: new Date(b.uploadedAt).getTime() });
    }
    cursor = pagina.hasMore ? pagina.cursor : undefined;
  } while (cursor);
  return copie;
}

/**
 * Legge le copie indicate. Una copia che non si legge nemmeno riprovando si salta e si segnala:
 * il file resta dov'è e il riallineamento la riprende alla prossima occasione.
 */
async function leggiCopie(percorsi: string[]): Promise<Contenuto[]> {
  const letti = await aGruppi(percorsi, LETTURE_IN_PARALLELO, async (p) => {
    try {
      return await conTentativi(async () => {
        const r = await get(p, { access: 'private', useCache: false });
        if (!r || r.statusCode !== 200) throw new Error(`stato ${r?.statusCode ?? 'assente'}`);
        return (await new Response(r.stream).json()) as Contenuto;
      });
    } catch (errore) {
      console.error('[redazione] copia non leggibile, la riprende il riallineamento', p, errore);
      return null;
    }
  });
  return letti.filter((c): c is Contenuto => c !== null && ID_VALIDO.test(c.id));
}

/**
 * Prima costruzione dell'indice, a tappe: ogni richiesta legge le copie che fa in tempo nel suo
 * budget, salva i progressi e, se non ha finito, risponde «in costruzione». Due richieste insieme
 * non si pestano i piedi: la seconda a scrivere trova l'ETag cambiato e lascia valere la prima.
 */
async function costruisciIndice(parziale: { dati: StatoArchivio; etag: string } | null): Promise<StatoArchivio> {
  const inizio = Date.now();
  let stato: StatoArchivio = parziale ? parziale.dati : { revisione: 0, contenuti: [], daLeggere: (await elencaCopie()).map((c) => c.id) };
  const etag: string | null = parziale?.etag ?? null;
  let restanti = stato.daLeggere ?? [];
  do {
    const lotto = restanti.slice(0, LETTURE_IN_PARALLELO);
    const letti = await leggiCopie(lotto.map(percorsoContenuto));
    restanti = restanti.slice(lotto.length);
    const contenuti = [...stato.contenuti, ...letti];
    stato = restanti.length > 0 ? { revisione: 0, contenuti, daLeggere: restanti } : nuovoStato(contenuti);
  } while (restanti.length > 0 && Date.now() - inizio < budgetCostruzioneMs());
  try {
    await scriviJson(FILE_INDICE, stato, etag);
  } catch (errore) {
    // Un'altra richiesta ha salvato prima (ETag cambiato, o il file è comparso): alla prossima si
    // riparte dal suo punto. Qualsiasi altro errore si vede.
    cacheJson.delete(FILE_INDICE);
    const altrui = errore instanceof BlobPreconditionFailedError || (etag === null && (await leggiJson<StatoArchivio>(FILE_INDICE)) !== null);
    if (!altrui) throw errore;
  }
  if (stato.daLeggere) {
    throw new ErroreRedazione(503, 'Sto preparando l\'archivio: ci vuole ancora qualche secondo.', CODICE_IN_COSTRUZIONE);
  }
  return stato;
}

/** Margine fra la scrittura nell'indice e quella della copia: oltre, la copia è più nuova dell'indice. */
const MARGINE_COPIA_MS = 5 * 60_000;

/** L'ultima modifica di un contenuto (le eliminazioni di prima non aggiornavano aggiornatoIl). */
function ultimaModifica(c: Contenuto): string {
  return c.eliminatoIl && c.eliminatoIl > c.aggiornatoIl ? c.eliminatoIl : c.aggiornatoIl;
}

/** Copia del contenuto nel suo file e nello storico: la verità resta l'indice, queste sono la rete. */
async function scriviCopie(contenuto: Contenuto): Promise<void> {
  const corpo = JSON.stringify(contenuto);
  const quando = new Date().toISOString().replace(/[:.]/g, '-');
  const esiti = await Promise.allSettled([
    put(percorsoContenuto(contenuto.id), corpo, { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true }),
    put(`${CARTELLA_STORICO}${contenuto.id}/${quando}.json`, corpo, { access: 'private', contentType: 'application/json', addRandomSuffix: true }),
  ]);
  for (const esito of esiti) {
    // Il contenuto è già salvato nell'indice: la copia mancata si segnala ma non blocca chi pubblica.
    if (esito.status === 'rejected') console.error('[redazione] copia del contenuto non riuscita', contenuto.id, esito.reason);
  }
}

async function scriviNelloIndice(fn: (stato: StatoArchivio) => { stato: StatoArchivio; contenuto: Contenuto }): Promise<Contenuto> {
  // Finché l'indice è in costruzione non si scrive: la pubblicazione riprova fra qualche secondo.
  const contenuto = await modificaJson<StatoArchivio, Contenuto>(FILE_INDICE, () => costruisciIndice(null), (stato) => {
    if (stato.daLeggere) throw new ErroreRedazione(503, 'Sto preparando l\'archivio: riprova fra qualche secondo.', CODICE_IN_COSTRUZIONE);
    const esito = fn(stato);
    return { dati: esito.stato, risultato: esito.contenuto };
  });
  await scriviCopie(contenuto);
  return contenuto;
}

const archivioBlob: Archivio = {
  async stato() {
    const letto = await leggiJson<StatoArchivio>(FILE_INDICE);
    if (letto && !letto.dati.daLeggere) return letto.dati;
    // Primo avvio con l'indice: si costruisce dalle copie dei contenuti, a tappe se non si fa in tempo.
    return costruisciIndice(letto);
  },

  async elenca() {
    return (await this.stato()).contenuti;
  },

  async leggi(id) {
    controllaId(id);
    return (await this.stato()).contenuti.find((c) => c.id === id) ?? null;
  },

  async crea(contenuto) {
    controllaId(contenuto.id);
    return scriviNelloIndice((stato) => {
      if (stato.contenuti.some((c) => c.id === contenuto.id)) throw new ErroreRedazione(409, 'Contenuto già esistente.');
      return applica(stato, contenuto);
    });
  },

  async aggiorna(id, modifica) {
    controllaId(id);
    return scriviNelloIndice((stato) => {
      const attuale = stato.contenuti.find((c) => c.id === id);
      if (!attuale) throw new ErroreRedazione(404, 'Contenuto non trovato.');
      return applica(stato, modifica(structuredClone(attuale)));
    });
  },

  async salvaMedia(id, dati, tipo) {
    await put(percorsoMedia(id), Buffer.from(dati), { access: 'private', contentType: tipo, addRandomSuffix: false, allowOverwrite: false });
  },

  async leggiMedia(id) {
    const risultato = await conTentativi(() => get(percorsoMedia(id), { access: 'private' }));
    if (!risultato || risultato.statusCode !== 200) return null;
    return { corpo: risultato.stream, tipo: risultato.blob.contentType };
  },

  async leggiObiettivi() {
    const letto = await leggiJson<Partial<Obiettivi>>(FILE_OBIETTIVI);
    return { ...OBIETTIVI_PREDEFINITI, ...(letto?.dati ?? {}) };
  },

  async salvaObiettivi(obiettivi) {
    await modificaJson<Obiettivi, null>(FILE_OBIETTIVI, async () => OBIETTIVI_PREDEFINITI, () => ({ dati: obiettivi, risultato: null }));
    await scriviStoricoImpostazione('obiettivi', obiettivi);
  },

  async leggiPersone() {
    return structuredClone((await leggiJson<Persona[]>(FILE_PERSONE))?.dati ?? []);
  },

  async aggiornaPersone(modifica) {
    const persone = await modificaJson<Persona[], Persona[]>(FILE_PERSONE, async () => [], (attuali) => {
      const nuove = modifica(structuredClone(attuali));
      return { dati: nuove, risultato: nuove };
    });
    await scriviStoricoImpostazione('persone', persone);
    return persone;
  },

  async riallinea() {
    const indice = new Map((await this.stato()).contenuti.map((c) => [c.id, c]));
    // Si leggono solo le copie che mancano nell'indice o scritte ben dopo l'ultima modifica nota.
    const sospette = (await elencaCopie()).filter((c) => {
      const noto = indice.get(c.id);
      return !noto || c.scrittaIl > Date.parse(ultimaModifica(noto)) + MARGINE_COPIA_MS;
    });
    if (sospette.length === 0) return 0;
    const copie = await leggiCopie(sospette.map((c) => c.percorso));
    const recuperate = await modificaJson<StatoArchivio, Contenuto[]>(FILE_INDICE, () => costruisciIndice(null), (stato) => {
      if (stato.daLeggere) throw new ErroreRedazione(503, 'Archivio in costruzione.', CODICE_IN_COSTRUZIONE);
      let nuovo = stato;
      const fatte: Contenuto[] = [];
      for (const copia of copie) {
        const attuale = nuovo.contenuti.find((c) => c.id === copia.id);
        if (attuale && ultimaModifica(copia) <= ultimaModifica(attuale)) continue;
        const esito = applica(nuovo, copia);
        nuovo = esito.stato;
        fatte.push(esito.contenuto);
      }
      return { dati: nuovo, risultato: fatte };
    });
    await Promise.all(recuperate.map(scriviCopie));
    if (recuperate.length > 0) console.warn('[redazione] contenuti recuperati nell\'indice', recuperate.map((c) => c.id));
    return recuperate.length;
  },
};

/** Copia datata di un file di impostazioni. */
async function scriviStoricoImpostazione(nome: string, dati: unknown): Promise<void> {
  await put(`${CARTELLA_STORICO}${nome}/${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(dati), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: true,
  }).catch((errore) => console.error(`[redazione] copia di ${nome} non riuscita`, errore));
}

/* ---------- Memoria (sviluppo e test) ---------- */

interface Memoria {
  stato: StatoArchivio;
  media: Map<string, { dati: Uint8Array; tipo: string }>;
  obiettivi?: Obiettivi;
  persone?: Persona[];
}

const globale = globalThis as typeof globalThis & { __memoriaRedazione?: Memoria };

function memoria(): Memoria {
  globale.__memoriaRedazione ??= { stato: nuovoStato(), media: new Map() };
  return globale.__memoriaRedazione;
}

export function svuotaMemoria(): void {
  globale.__memoriaRedazione = { stato: nuovoStato(), media: new Map() };
  cacheJson.clear();
}

const archivioMemoria: Archivio = {
  async stato() {
    return structuredClone(memoria().stato);
  },
  async elenca() {
    return (await this.stato()).contenuti;
  },
  async leggi(id) {
    controllaId(id);
    return (await this.stato()).contenuti.find((c) => c.id === id) ?? null;
  },
  async crea(contenuto) {
    controllaId(contenuto.id);
    const m = memoria();
    if (m.stato.contenuti.some((c) => c.id === contenuto.id)) throw new ErroreRedazione(409, 'Contenuto già esistente.');
    const esito = applica(m.stato, structuredClone(contenuto));
    m.stato = esito.stato;
    return structuredClone(esito.contenuto);
  },
  async aggiorna(id, modifica) {
    controllaId(id);
    const m = memoria();
    const attuale = m.stato.contenuti.find((c) => c.id === id);
    if (!attuale) throw new ErroreRedazione(404, 'Contenuto non trovato.');
    const esito = applica(m.stato, modifica(structuredClone(attuale)));
    m.stato = esito.stato;
    return structuredClone(esito.contenuto);
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
  async leggiObiettivi() {
    return memoria().obiettivi ?? OBIETTIVI_PREDEFINITI;
  },
  async salvaObiettivi(obiettivi) {
    memoria().obiettivi = obiettivi;
  },
  async leggiPersone() {
    return structuredClone(memoria().persone ?? []);
  },
  async aggiornaPersone(modifica) {
    const nuove = modifica(structuredClone(memoria().persone ?? []));
    memoria().persone = structuredClone(nuove);
    return nuove;
  },
  async riallinea() {
    return 0;
  },
};

export function archivio(): Archivio {
  return process.env.BLOB_READ_WRITE_TOKEN ? archivioBlob : archivioMemoria;
}
