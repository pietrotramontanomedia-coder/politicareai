/*
 * Profilo dell'utente: tutto ciò che un giorno potrà sincronizzarsi con l'account.
 * Per costruzione non contiene opinioni politiche: il risultato del test partiti vive
 * altrove (lib/profilo/risultato-test-locale.ts) e resta solo sul dispositivo.
 */

export const VERSIONE_PROFILO = 1;

export interface RisultatoQuizSalvato {
  numero: number;
  /** Primo tentativo: è quello che conta per serie e traguardi. */
  percentuale: number;
  corrette: number;
  totale: number;
  completatoIl: string;
  /** Miglior punteggio fra tutti i tentativi. */
  migliorePercentuale: number;
  tentativi: number;
}

export interface Profilo {
  versione: typeof VERSIONE_PROFILO;
  nome: string;
  colore: string;
  creatoIl: string;
  aggiornatoIl: string;
  /** Aree tematiche (chiavi di ETICHETTE_AREA) di cui ricevere notizie e quiz. */
  temiSeguiti: string[];
  /** Dal quiz più recente al più vecchio. */
  storicoQuiz: RisultatoQuizSalvato[];
  /** Nomi del gruppo, per ritrovarli pronti nel gioco. */
  giocatori: string[];
}

export interface EsitoQuiz {
  numero: number;
  percentuale: number;
  corrette: number;
  totale: number;
}
