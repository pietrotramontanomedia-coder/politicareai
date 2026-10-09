import type {
  BozzaVersione,
  Commento,
  Contenuto,
  FormatoPost,
  SessioneRedazione,
  StatistichePersona,
  StatoContenuto,
  TipoCommento,
  TipoContenuto,
} from './tipi';

/*
 * Regole del portale della redazione, tutte funzioni pure: le usano sia le API sia l'interfaccia,
 * così i limiti mostrati a schermo sono gli stessi che il server fa rispettare.
 */

/** Limiti presi da Instagram dove esistono (didascalia, hashtag, foto del carosello). */
export const LIMITI = {
  nome: 40,
  didascalia: 2200,
  hashtag: 30,
  immaginiPost: 10,
  commento: 2000,
  /** Byte massimi di un'immagine già ridotta dal browser: sotto il tetto di 4,5 MB delle funzioni Vercel. */
  byteImmagine: 4 * 1024 * 1024,
} as const;

/** Ore in cui una storia resta nel cerchio in cima al feed, come su Instagram. */
export const ORE_STORIA = 24;

/** Dove si fanno card e storie: nel portale si pubblicano soltanto. */
export const URL_GENERATORE = 'https://politicare-storie.vercel.app';

export const STATI: StatoContenuto[] = ['da_rivedere', 'da_correggere', 'approvato'];
export const TIPI_COMMENTO_REVISORE: TipoCommento[] = ['correzione', 'consiglio', 'complimento'];

const FORMATI: FormatoPost[] = ['1:1', '4:5'];
/** Identificativi generati dal server (UUID senza trattini): nient'altro entra nei percorsi dell'archivio. */
export const ID_VALIDO = /^[a-f0-9]{32}$/;

export function normalizzaNome(nome: string): string {
  return nome.replace(/\s+/g, ' ').trim().slice(0, LIMITI.nome);
}

/** Chiave della persona: "Giulia Rossi", "giulia  rossi" e "Giùlia Rossi" sono la stessa. */
export function chiaveNome(nome: string): string {
  return normalizzaNome(nome)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function contaHashtag(testo: string): number {
  return testo.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0;
}

type Esito<T> = { ok: true; valore: T } | { ok: false; errore: string };

const errore = <T>(messaggio: string): Esito<T> => ({ ok: false, errore: messaggio });

function testo(valore: unknown): string {
  return typeof valore === 'string' ? valore.replace(/\r\n/g, '\n').trim() : '';
}

/** Controlla una stesura inviata dal browser e la riduce ai soli campi previsti. */
export function validaBozza(tipo: TipoContenuto, dati: unknown): Esito<BozzaVersione> {
  if (!dati || typeof dati !== 'object') return errore('Dati mancanti.');
  const d = dati as Record<string, unknown>;
  const immagini = Array.isArray(d.immagini) ? d.immagini : [];
  if (!immagini.every((id) => typeof id === 'string' && ID_VALIDO.test(id))) return errore('Immagine non valida.');
  if (new Set(immagini).size !== immagini.length) return errore('La stessa immagine compare due volte.');

  if (tipo === 'post') {
    if (immagini.length === 0) return errore('Un post ha bisogno di almeno una card.');
    if (immagini.length > LIMITI.immaginiPost) return errore(`Al massimo ${LIMITI.immaginiPost} card per post.`);
    const didascalia = testo(d.didascalia);
    if (!didascalia) return errore('Scrivi il copy del post.');
    if (didascalia.length > LIMITI.didascalia) return errore(`Il copy supera i ${LIMITI.didascalia} caratteri.`);
    if (contaHashtag(didascalia) > LIMITI.hashtag) return errore(`Al massimo ${LIMITI.hashtag} hashtag.`);
    const formato = FORMATI.includes(d.formato as FormatoPost) ? (d.formato as FormatoPost) : '4:5';
    return { ok: true, valore: { immagini: immagini as string[], didascalia, formato } };
  }

  if (immagini.length !== 1) return errore('Una storia è una sola immagine.');
  return { ok: true, valore: { immagini: immagini as string[], didascalia: '', formato: '1:1' } };
}

export function nuovoContenuto(id: string, tipo: TipoContenuto, autore: string, bozza: BozzaVersione, adesso: Date): Contenuto {
  const quando = adesso.toISOString();
  return {
    id,
    tipo,
    autore: normalizzaNome(autore),
    chiaveAutore: chiaveNome(autore),
    creatoIl: quando,
    aggiornatoIl: quando,
    stato: 'da_rivedere',
    versioni: [{ numero: 1, inviataIl: quando, ...bozza }],
    commenti: [],
  };
}

/** Nuova stesura dell'autore: torna fra quelli da rivedere, le precedenti restano consultabili. */
export function aggiungiVersione(contenuto: Contenuto, bozza: BozzaVersione, adesso: Date): Contenuto {
  const quando = adesso.toISOString();
  return {
    ...contenuto,
    aggiornatoIl: quando,
    stato: 'da_rivedere',
    versioni: [...contenuto.versioni, { numero: versioneCorrente(contenuto).numero + 1, inviataIl: quando, ...bozza }],
  };
}

export function versioneCorrente(contenuto: Contenuto) {
  return contenuto.versioni[contenuto.versioni.length - 1];
}

export function eAutore(sessione: SessioneRedazione, contenuto: Contenuto): boolean {
  return chiaveNome(sessione.nome) === contenuto.chiaveAutore;
}

/** Solo l'autore scrive nuove versioni: chi corregge suggerisce, non riscrive. */
export function puoModificare(sessione: SessioneRedazione, contenuto: Contenuto): boolean {
  return eAutore(sessione, contenuto);
}

export function puoEliminare(sessione: SessioneRedazione, contenuto: Contenuto): boolean {
  return sessione.ruolo === 'revisore' || eAutore(sessione, contenuto);
}

/** Le correzioni sono fra l'autore e chi corregge: i colleghi vedono il lavoro, non il giudizio. */
export function puoVedereCommenti(sessione: SessioneRedazione, contenuto: Contenuto): boolean {
  return sessione.ruolo === 'revisore' || eAutore(sessione, contenuto);
}

export interface RichiestaCommento {
  tipo: TipoCommento;
  testo: string;
  /** Solo chi corregge cambia lo stato. */
  stato: StatoContenuto | null;
}

export function validaCommento(sessione: SessioneRedazione, contenuto: Contenuto, dati: unknown): Esito<RichiestaCommento> {
  if (!puoVedereCommenti(sessione, contenuto)) return errore('Non puoi commentare questo contenuto.');
  const d = (dati && typeof dati === 'object' ? dati : {}) as Record<string, unknown>;
  const scritto = testo(d.testo);
  if (scritto.length > LIMITI.commento) return errore(`Il commento supera i ${LIMITI.commento} caratteri.`);

  if (sessione.ruolo === 'revisore') {
    const stato = STATI.includes(d.stato as StatoContenuto) ? (d.stato as StatoContenuto) : null;
    if (!scritto && !stato) return errore('Scrivi un commento o cambia lo stato.');
    const tipo = TIPI_COMMENTO_REVISORE.includes(d.tipo as TipoCommento) ? (d.tipo as TipoCommento) : 'consiglio';
    return { ok: true, valore: { tipo, testo: scritto, stato } };
  }
  if (!scritto) return errore('Il commento è vuoto.');
  return { ok: true, valore: { tipo: 'risposta', testo: scritto, stato: null } };
}

export function aggiungiCommento(
  contenuto: Contenuto,
  sessione: SessioneRedazione,
  richiesta: RichiestaCommento,
  id: string,
  adesso: Date,
): Contenuto {
  const quando = adesso.toISOString();
  const commenti: Commento[] = richiesta.testo
    ? [
        ...contenuto.commenti,
        {
          id,
          autore: normalizzaNome(sessione.nome),
          ruolo: sessione.ruolo,
          tipo: richiesta.tipo,
          testo: richiesta.testo,
          versione: versioneCorrente(contenuto).numero,
          creatoIl: quando,
        },
      ]
    : contenuto.commenti;
  return { ...contenuto, commenti, stato: richiesta.stato ?? contenuto.stato, aggiornatoIl: quando };
}

/** Quello che una persona vede di un contenuto: senza commenti se non è sua e non corregge. */
export function perLettore(sessione: SessioneRedazione, contenuto: Contenuto): Contenuto {
  return puoVedereCommenti(sessione, contenuto) ? contenuto : { ...contenuto, commenti: [] };
}

/** Quello che arriva al browser: i contenuti eliminati (il cestino) solo a chi corregge. */
export function perElenco(sessione: SessioneRedazione, contenuti: Contenuto[]): Contenuto[] {
  return contenuti.filter((c) => !c.eliminatoIl || sessione.ruolo === 'revisore').map((c) => perLettore(sessione, c));
}

export function eliminato(contenuto: Contenuto): boolean {
  return Boolean(contenuto.eliminatoIl);
}

/** Eliminazione morbida: il contenuto esce da feed e profili ma resta tutto nell'archivio. */
export function segnaEliminato(contenuto: Contenuto, sessione: SessioneRedazione, adesso: Date): Contenuto {
  return { ...contenuto, eliminatoIl: adesso.toISOString(), eliminatoDa: normalizzaNome(sessione.nome) };
}

export function ripristina(contenuto: Contenuto, adesso: Date): Contenuto {
  // undefined non finisce nel JSON salvato: i due campi spariscono.
  return { ...contenuto, eliminatoIl: undefined, eliminatoDa: undefined, aggiornatoIl: adesso.toISOString() };
}

/** Feed: prima l'ultima stesura arrivata. */
export function ordinaFeed(contenuti: Contenuto[]): Contenuto[] {
  return [...contenuti].sort((a, b) => versioneCorrente(b).inviataIl.localeCompare(versioneCorrente(a).inviataIl));
}

/** Coda di chi corregge: prima chi aspetta da più tempo. */
export function codaRevisione(contenuti: Contenuto[]): Contenuto[] {
  return contenuti
    .filter((c) => c.stato === 'da_rivedere')
    .sort((a, b) => versioneCorrente(a).inviataIl.localeCompare(versioneCorrente(b).inviataIl));
}

/** Storie delle ultime 24 ore raggruppate per persona, in ordine cronologico dentro il gruppo. */
export function storieRecenti(contenuti: Contenuto[], adesso: Date): { autore: string; chiave: string; storie: Contenuto[] }[] {
  const soglia = adesso.getTime() - ORE_STORIA * 3600_000;
  const gruppi = new Map<string, { autore: string; chiave: string; storie: Contenuto[] }>();
  for (const c of contenuti) {
    if (c.tipo !== 'storia' || Date.parse(versioneCorrente(c).inviataIl) < soglia) continue;
    const gruppo = gruppi.get(c.chiaveAutore) ?? { autore: c.autore, chiave: c.chiaveAutore, storie: [] };
    gruppo.storie.push(c);
    gruppi.set(c.chiaveAutore, gruppo);
  }
  const ultima = (g: { storie: Contenuto[] }) => versioneCorrente(g.storie[g.storie.length - 1]).inviataIl;
  return [...gruppi.values()]
    .map((g) => ({ ...g, storie: [...g.storie].sort((a, b) => versioneCorrente(a).inviataIl.localeCompare(versioneCorrente(b).inviataIl)) }))
    .sort((a, b) => ultima(b).localeCompare(ultima(a)));
}

/** Quadro della squadra per chi corregge: quanto pubblica ognuno e a che punto è. */
export function statistiche(contenuti: Contenuto[], adesso: Date): StatistichePersona[] {
  const settimanaFa = adesso.getTime() - 7 * 24 * 3600_000;
  const persone = new Map<string, StatistichePersona>();
  for (const c of contenuti) {
    const p = persone.get(c.chiaveAutore) ?? {
      nome: c.autore,
      chiave: c.chiaveAutore,
      post: 0,
      storie: 0,
      settimana: 0,
      daRivedere: 0,
      daCorreggere: 0,
      approvati: 0,
      ultimoInvio: null,
    };
    if (c.tipo === 'post') p.post++;
    else p.storie++;
    if (Date.parse(c.creatoIl) >= settimanaFa) p.settimana++;
    if (c.stato === 'da_rivedere') p.daRivedere++;
    else if (c.stato === 'da_correggere') p.daCorreggere++;
    else p.approvati++;
    const invio = versioneCorrente(c).inviataIl;
    if (!p.ultimoInvio || invio > p.ultimoInvio) {
      p.ultimoInvio = invio;
      p.nome = c.autore;
    }
    persone.set(c.chiaveAutore, p);
  }
  return [...persone.values()].sort((a, b) => b.settimana - a.settimana || a.nome.localeCompare(b.nome, 'it'));
}

/** Riconosce JPEG, PNG e WebP dai primi byte: il tipo dichiarato dal browser non basta. */
export function tipoImmagine(byte: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (byte.length >= 3 && byte[0] === 0xff && byte[1] === 0xd8 && byte[2] === 0xff) return 'image/jpeg';
  if (byte.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => byte[i] === b)) return 'image/png';
  const ascii = (da: number, a: number) => String.fromCharCode(...byte.slice(da, a));
  if (byte.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}
