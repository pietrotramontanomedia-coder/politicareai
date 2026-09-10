/**
 * Tipi di dominio del motore di punteggio.
 *
 * Convenzione di scala: interi da -2 a +2 per posizioni di partito e risposte
 * dell'utente. -2 = molto contrario, 0 = neutro, +2 = molto favorevole.
 */

export type Valore = -2 | -1 | 0 | 1 | 2;

/** +1 se l'affermazione propone un cambiamento, -1 se difende l'assetto vigente. */
export type Verso = 1 | -1;

/**
 * Gerarchia delle fonti per le posizioni di partito, dalla più forte:
 *   voto          voto parlamentare registrato su un atto specifico
 *   programma     estratto testuale dal programma o da un documento ufficiale del partito
 *   dichiarazione dichiarazione pubblica del leader o di un dirigente a nome del partito,
 *                 con citazione diretta e data (agenzia, testata o canale ufficiale)
 *   questionario  risposta diretta del partito al questionario (metodo preferito quando disponibile)
 * 'stampa' è usato solo dal quiz settimanale (articoli di agenzie e testate).
 */
export type TipoFonte = 'questionario' | 'programma' | 'voto' | 'dichiarazione' | 'stampa';

export interface Fonte {
  tipo: TipoFonte;
  /** Estratto testuale o descrizione puntuale (es. "voto favorevole, seduta del 12/03/2026"). */
  citazione: string;
  url: string;
  /** Data della fonte, ISO 8601 (YYYY-MM-DD). Obbligatoria per le dichiarazioni. */
  data?: string;
}

/**
 * Quanto è solida la codifica: 'alta' con voto o programma esplicito, 'media' con
 * dichiarazione chiara del leader, 'bassa' con dichiarazione indiretta o di un
 * dirigente minore. Con confidenza bassa il valore non può essere ±2.
 */
export type Confidenza = 'alta' | 'media' | 'bassa';

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
  confidenza?: Confidenza;
  /** Contesto: divergenza fra programma e posizione recente, condizioni, spaccature interne. */
  nota?: string;
}

export interface Partito {
  id: string;
  nome: string;
  sigla?: string;
  leader?: string;
  sito?: string;
  colore?: string;
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
  /**
   * Quota delle risposte date dall'utente su cui il partito ha una posizione
   * documentata, in [0, 1]. Sotto la soglia il partito non entra in classifica.
   */
  copertura: number;
  /** Numero di affermazioni effettivamente confrontate. */
  confrontate: number;
  /** Punteggio per area tematica, in [0, 1], solo per le aree con almeno un confronto. */
  perArea: Record<string, number>;
  dettaglio: DettaglioAffermazione[];
}

export interface Classifica {
  /** Partiti con copertura sufficiente, dal punteggio più alto. */
  risultati: RisultatoPartito[];
  /** Partiti con troppe posizioni non documentate rispetto alle risposte date: mostrati a parte, non ordinati con gli altri. */
  esclusi: RisultatoPartito[];
  /** true se primo e secondo sono entro 3 punti percentuali di punteggio. */
  pariMerito: boolean;
}

/** Quiz settimanale su fatti politici correnti. */
export type DifficoltaQuiz = 'facile' | 'media' | 'difficile';

/** Raggruppamento tematico delle domande, es. "italia" / "estero". */
export interface SezioneQuiz {
  id: string;
  titolo: string;
  /** Emoji o simbolo mostrato accanto al titolo. */
  icona: string;
  descrizione?: string;
}

export interface DomandaQuiz {
  id: string;
  /** Riferimento a `SezioneQuiz.id`. */
  sezione: string;
  difficolta: DifficoltaQuiz;
  testo: string;
  /** Risposte possibili (3-4 opzioni), nell'ordine editoriale: la UI le mescola a runtime. */
  opzioni: string[];
  /** Indice della risposta corretta in `opzioni`. */
  rispostaCorretta: number;
  /** Spiegazione della risposta corretta, con il contesto necessario. */
  spiegazione: string;
  /** Ogni domanda è un fatto verificabile: la fonte è obbligatoria. */
  fonte: Fonte;
}

export interface VoceChangelogQuiz {
  versione: string;
  data: string;
  note: string;
}

export interface QuizSettimanale {
  id: string;
  versione: string;
  /** Numero progressivo del quiz (1 = primo quiz pubblicato). */
  numero: number;
  /** Data di pubblicazione, ISO 8601. */
  data: string;
  /** Intervallo di date coperto dalle domande. */
  periodo: { dal: string; al: string };
  titolo: string;
  sottotitolo: string;
  descrizione: string;
  autori: string[];
  changelog: VoceChangelogQuiz[];
  sezioni: SezioneQuiz[];
  domande: DomandaQuiz[];
}
