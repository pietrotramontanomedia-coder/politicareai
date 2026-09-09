/**
 * Tipi di dominio del motore di punteggio.
 *
 * Convenzione di scala: interi da -2 a +2 per posizioni di partito e risposte
 * dell'utente. -2 = molto contrario, 0 = neutro, +2 = molto favorevole.
 */

export type Valore = -2 | -1 | 0 | 1 | 2;

/** +1 se l'affermazione propone un cambiamento, -1 se difende l'assetto vigente. */
export type Verso = 1 | -1;

/** 'stampa' è usato solo dal quiz settimanale (articoli di agenzie e testate). */
export type TipoFonte = 'questionario' | 'programma' | 'voto' | 'stampa';

export interface Fonte {
  tipo: TipoFonte;
  /** Estratto testuale o descrizione puntuale (es. "voto favorevole, seduta del 12/03/2026"). */
  citazione: string;
  url: string;
}

export interface Affermazione {
  id: string;
  testo: string;
  /** Area tematica, es. "fisco", "ambiente", "lavoro". */
  area: string;
  verso: Verso;
}

export interface Posizione {
  affermazioneId: string;
  /**
   * null = posizione non reperita da nessuna fonte verificabile: l'affermazione
   * è esclusa dal calcolo del punteggio per questo partito (non conta né a favore
   * né contro), esattamente come una risposta saltata dall'utente. Non usare 0
   * per "non so" — 0 è una posizione neutra REALMENTE dichiarata dal partito,
   * e nel calcolo genera comunque un 50% di accordo con risposte estreme.
   */
  valore: Valore | null;
  fonte: Fonte;
}

export interface Partito {
  id: string;
  nome: string;
  posizioni: Posizione[];
}

export interface TestPartitoPack {
  id: string;
  versione: string;
  data: string;
  autori: string[];
  changelog: string[];
  /** Quote dichiarate per area tematica, es. { fisco: 3, ambiente: 2 }. Verificate in CI. */
  quotePerArea: Record<string, number>;
  affermazioni: Affermazione[];
  partiti: Partito[];
}

/** Risposta dell'utente. valore null = domanda saltata, esclusa dal calcolo. */
export interface Risposta {
  affermazioneId: string;
  valore: Valore | null;
  /** Se true, peso 2 invece di 1 nel calcolo del punteggio. */
  importante: boolean;
}

export interface DettaglioAffermazione {
  affermazioneId: string;
  /** Grado di accordo fra risposta utente e posizione del partito, in [0, 1]. */
  accordo: number;
  rispostaUtente: Valore;
  posizionePartito: Valore;
}

export interface RisultatoPartito {
  partitoId: string;
  nome: string;
  /** Punteggio complessivo in [0, 1]. */
  punteggio: number;
  dettaglio: DettaglioAffermazione[];
}

export interface Classifica {
  risultati: RisultatoPartito[];
  /** true se primo e secondo sono entro 3 punti percentuali di punteggio. */
  pariMerito: boolean;
}

/** Quiz settimanale su fatti politici correnti. */
export interface DomandaQuiz {
  id: string;
  testo: string;
  /** Risposte possibili (3-4 opzioni) */
  opzioni: string[];
  /** Indice della risposta corretta (0-3) */
  rispostaCorretta: number;
  /** Spiegazione della risposta corretta */
  spiegazione: string;
  fonte: Fonte;
  /** Difficoltà: 'facile' | 'media' | 'difficile' */
  difficolta: 'facile' | 'media' | 'difficile';
}

export interface QuizSettimanale {
  id: string;
  settimana: number;
  anno: number;
  data: string;
  titolo: string;
  descrizione: string;
  autori: string[];
  domande: DomandaQuiz[];
}
