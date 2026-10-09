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
export type StatoContenuto = 'da_rivedere' | 'da_correggere' | 'approvato';

export type FormatoPost = '1:1' | '4:5';

export type PosizioneTesto = 'alto' | 'centro' | 'basso';

export interface Storia {
  testo: string;
  posizione: PosizioneTesto;
  /** Sfondo quando non c'è un'immagine (o dietro un'immagine che non copre tutto). */
  sfondo: string;
  coloreTesto: string;
  /** Riquadro scuro dietro il testo, per leggerlo sopra una foto. */
  riquadro: boolean;
}

/** Una stesura: ogni correzione dell'autore aggiunge una versione, le precedenti restano. */
export interface Versione {
  numero: number;
  inviataIl: string;
  /** Identificativi delle immagini nell'archivio, nell'ordine del carosello. */
  immagini: string[];
  /** Solo per i post. */
  didascalia: string;
  formato: FormatoPost;
  /** Solo per le storie. */
  storia: Storia | null;
}

export type TipoCommento = 'correzione' | 'consiglio' | 'complimento' | 'risposta';

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
}

/** Quello che l'autore invia per una nuova stesura, prima di ogni controllo. */
export interface BozzaVersione {
  immagini: string[];
  didascalia: string;
  formato: FormatoPost;
  storia: Storia | null;
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
  ultimoInvio: string | null;
}
