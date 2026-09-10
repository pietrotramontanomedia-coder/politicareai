/** Tipi di dominio del gioco "Crisi di Governo". Nessuna dipendenza da React. */

export type TipoCarta = 'sfida' | 'duello' | 'votazione' | 'legge' | 'minigioco' | 'tutti';

export type NomeMazzo = 'base' | 'attualita';

export interface FonteCarta {
  citazione: string;
  url: string;
}

export interface Carta {
  id: string;
  tipo: TipoCarta;
  titolo: string;
  /** Testo con i segnaposto {g1} e {g2}, sostituiti con i nomi dei giocatori. */
  testo: string;
  /** Sorsi (o penitenze) in gioco: da 0 a 3. Mai oltre 3. */
  penalita: number;
  /** Solo per le carte `legge`: per quante carte resta in vigore. */
  durataCarte?: number;
  /** Solo per le carte a tempo: secondi suggeriti. */
  secondi?: number;
  /** Obbligatoria sulle carte del mazzo attualità, che citano fatti reali. */
  fonte?: FonteCarta;
}

export interface PaccoCarte {
  id: string;
  mazzo: NomeMazzo;
  versione: string;
  data: string;
  titolo: string;
  descrizione: string;
  autori: string[];
  carte: Carta[];
}

/** Una carta pescata, con i nomi già inseriti al posto dei segnaposto. */
export interface CartaInGioco {
  carta: Carta;
  testo: string;
  /** I giocatori estratti per questa carta, nell'ordine {g1}, {g2}. */
  protagonisti: string[];
}

/** Una `legge` ancora in vigore, con le carte che le restano da vivere. */
export interface LeggeInVigore {
  id: string;
  titolo: string;
  testo: string;
  carteRimaste: number;
}

export const PENALITA_MASSIMA = 3;
export const GIOCATORI_MINIMO = 2;
export const GIOCATORI_MASSIMO = 12;
