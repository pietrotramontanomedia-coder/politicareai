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
  /** Registro di tutto quello che è successo al contenuto, in ordine. Mai riscritto, solo allungato. */
  eventi?: Evento[];
  /**
   * Revisione dell'archivio all'ultima modifica: cresce a ogni scrittura. Il browser chiede solo
   * quello che è cambiato dopo la revisione che ha già, e fra due copie tiene la più recente.
   */
  rev?: number;
}

export type TipoEvento = 'pubblicato' | 'nuova_versione' | 'commento' | 'stato' | 'eliminato' | 'ripristinato';

export interface Evento {
  tipo: TipoEvento;
  chi: string;
  ruolo: Ruolo;
  quando: string;
  versione?: number;
  /** Per «stato»: il nuovo stato. */
  stato?: StatoContenuto;
  /** Per «commento»: il tipo e il testo. */
  tipoCommento?: TipoCommento;
  testo?: string;
}

/** Una riga della cronologia di chi coordina: l'evento e il contenuto a cui si riferisce. */
export interface VoceAttivita extends Evento {
  contenutoId: string;
  tipoContenuto: TipoContenuto;
  autore: string;
  chiaveAutore: string;
}

/** Un ragazzo della redazione registrato da chi coordina. Non si cancella: si disattiva. */
export interface Persona {
  nome: string;
  chiave: string;
  attiva: boolean;
  aggiuntaIl: string;
  aggiuntaDa: string;
  /** Password personale, solo come impronta (scrypt con sale): non lascia mai il server. */
  password?: { sale: string; impronta: string };
}

/** Quello che arriva al browser di una persona: senza password, solo se ce l'ha. */
export type PersonaPubblica = Omit<Persona, 'password'> & { conPassword: boolean };

/** Un giorno nella scheda di una persona: quanto ha pubblicato e quanto serviva. */
export interface GiornoAndamento {
  giorno: string;
  storie: number;
  post: number;
  obiettivoStorie: number;
  obiettivoPost: number;
  inPari: boolean;
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

/** Risposta dell'elenco: tutto (prima volta) o solo quello che è cambiato dopo `dal`. */
export interface Sincronizzazione {
  /** Revisione dell'archivio letta: la prossima richiesta parte da qui. */
  revisione: number;
  contenuti: Contenuto[];
  /** Contenuti che chi legge non deve più vedere (eliminati da altri): [id, revisione]. */
  rimossi: [string, number][];
  /** Numeri della squadra su tutto l'archivio: per chi scrive solo la sua riga. */
  statistiche: StatistichePersona[];
}

/** La scheda di una persona: i suoi contenuti a pagine, più i numeri calcolati su tutto. */
export interface SchedaDati {
  contenuti: Contenuto[];
  /** Ci sono contenuti più vecchi da chiedere con `prima`. */
  altri: boolean;
  andamento: GiornoAndamento[];
  primoColpo: number;
  approvati: number;
  /** Versioni per contenuto, in media (null se non ha pubblicato). */
  versioniMedie: number | null;
}
