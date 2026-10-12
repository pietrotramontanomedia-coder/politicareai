/*
 * Portale della redazione: palestra interna dove i ragazzi pubblicano post e storie come su
 * Instagram e chi coordina li corregge. Nulla di qui va sui social: i contenuti restano nel
 * portale, dietro il codice della redazione. Niente a che vedere con il profilo pubblico
 * dell'app né con il test partiti.
 */

export type Ruolo = 'redattore' | 'revisore';

export interface SessioneRedazione {
  nome: string;
  ruolo: Ruolo;
}

export type TipoContenuto = 'post' | 'storia';

/** Dove si trova il contenuto nel giro di correzione. */
/** «Non va bene» chiude il contenuto: non si corregge, il perché è nel commento del revisore. */
export type StatoContenuto = 'da_rivedere' | 'da_correggere' | 'approvato' | 'non_va_bene';

export type FormatoPost = '1:1' | '4:5';

/** Una stesura: ogni correzione dell'autore aggiunge una versione, le precedenti restano. */
export interface Versione {
  numero: number;
  inviataIl: string;
  /**
   * Identificativi delle immagini nell'archivio: le card del post nell'ordine del carosello, o
   * l'unica immagine della storia. Le grafiche si fanno nel generatore, qui si pubblicano.
   */
  immagini: string[];
  /** Il copy del post (vuoto per le storie). */
  didascalia: string;
  formato: FormatoPost;
}

export type TipoCommento = 'correzione' | 'consiglio' | 'complimento' | 'risposta' | 'bocciatura';

export interface Commento {
  id: string;
  autore: string;
  ruolo: Ruolo;
  tipo: TipoCommento;
  testo: string;
  /** La versione a cui si riferisce il commento. */
  versione: number;
  creatoIl: string;
}

export interface Contenuto {
  id: string;
  tipo: TipoContenuto;
  autore: string;
  /** Nome normalizzato (minuscolo, senza accenti): "Giulia" e "giulia " sono la stessa persona. */
  chiaveAutore: string;
  creatoIl: string;
  aggiornatoIl: string;
  stato: StatoContenuto;
  versioni: Versione[];
  commenti: Commento[];
  /**
   * Eliminare non cancella: il contenuto sparisce da feed e profili ma resta nell'archivio, con
   * foto, versioni e commenti, e chi corregge lo può ripristinare dal cestino.
   */
  eliminatoIl?: string;
  eliminatoDa?: string;
}

/** Quello che l'autore invia per una nuova stesura, prima di ogni controllo. */
export interface BozzaVersione {
  immagini: string[];
  didascalia: string;
  formato: FormatoPost;
}

export interface StatistichePersona {
  nome: string;
  chiave: string;
  post: number;
  storie: number;
  /** Contenuti inviati negli ultimi sette giorni. */
  settimana: number;
  daRivedere: number;
  daCorreggere: number;
  approvati: number;
  nonVaBene: number;
  /** Contenuti eliminati (nel cestino): contano nelle percentuali, non negli obiettivi. */
  eliminati: number;
  /** Tutti i contenuti mai pubblicati, eliminati compresi: la base delle percentuali. */
  totale: number;
  /** Pubblicati oggi (giornata italiana), per gli obiettivi. */
  storieOggi: number;
  postOggi: number;
  ultimoInvio: string | null;
}

/** Quanto deve pubblicare ognuno ogni giorno: li decide chi corregge. */
export interface Obiettivi {
  /** Da lunedì a venerdì. */
  storieGiorno: number;
  postGiorno: number;
  /** Sabato e domenica. */
  storieWeekend: number;
  postWeekend: number;
  aggiornatoIl?: string;
  aggiornatoDa?: string;
}
