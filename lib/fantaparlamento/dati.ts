import {
  mediaPunti,
  prezzoDa,
  type DeputatoListone,
  type Giornata,
  type RegoleFanta,
  type SchieramentoDeputato,
} from '@politicare/motore';
import stagioneJson from '@/content/fantaparlamento/stagione.json';
import giornateJson from '@/content/fantaparlamento/giornate-2026.json';

/*
 * Dati del Fantaparlamento. Le giornate arrivano dai dati aperti della Camera
 * (strumenti/camera-fanta.mjs); il listone con i prezzi si calcola qui, sempre con le
 * stesse regole del motore: prezzo = quanto quel deputato ha reso in media.
 */

interface RegolaSchieramento {
  contiene: string;
  sigla: string;
  schieramento: SchieramentoDeputato;
}

export interface Stagione {
  id: string;
  versione: string;
  data: string;
  nome: string;
  ramo: string;
  descrizione: string;
  autori: string[];
  changelog: string[];
  regole: RegoleFanta;
  schieramenti: RegolaSchieramento[];
  fonti: { citazione: string; url: string }[];
}

export interface DeputatoGrezzo {
  id: string;
  nome: string;
  cognome: string;
  gruppo: string;
}

export const STAGIONE = stagioneJson as Stagione;
export const REGOLE = STAGIONE.regole;
// Il file delle giornate è grande: il tipo dedotto da TypeScript non combacia con quello del motore.
export const GIORNATE = giornateJson.giornate as unknown as Giornata[];
const DEPUTATI = giornateJson.deputati as unknown as DeputatoGrezzo[];

function regolaDi(gruppo: string): RegolaSchieramento | undefined {
  return STAGIONE.schieramenti.find((r) => gruppo.toUpperCase().includes(r.contiene.toUpperCase()));
}

/** Maggioranza o opposizione, dal nome del gruppo: le regole stanno nel file della stagione. */
export function schieramentoDa(gruppo: string): SchieramentoDeputato {
  return regolaDi(gruppo)?.schieramento ?? 'misto';
}

/** Sigla breve del gruppo, per l'interfaccia. */
export function siglaDa(gruppo: string): string {
  return regolaDi(gruppo)?.sigla ?? 'Misto';
}

function componiListone(): DeputatoListone[] {
  return DEPUTATI.map((d) => {
    const { media, giocate } = mediaPunti(d.id, GIORNATE, REGOLE);
    return {
      id: d.id,
      nome: d.nome,
      cognome: d.cognome,
      gruppo: d.gruppo,
      sigla: siglaDa(d.gruppo),
      schieramento: schieramentoDa(d.gruppo),
      mediaPunti: media,
      giornateGiocate: giocate,
      prezzo: prezzoDa(media, REGOLE),
    };
  }).sort((a, b) => b.prezzo - a.prezzo || a.cognome.localeCompare(b.cognome));
}

let cache: DeputatoListone[] | null = null;

/** Listone completo, ordinato dal più caro. Calcolato una volta sola per processo. */
export function listone(): DeputatoListone[] {
  cache ??= componiListone();
  return cache;
}

export function deputatoDa(id: string): DeputatoListone | undefined {
  return listone().find((d) => d.id === id);
}

/** L'ultima giornata in cui l'Aula ha votato. */
export function ultimaGiornata(): Giornata | null {
  const conVoti = GIORNATE.filter((g) => g.votazioni > 0);
  return conVoti[conVoti.length - 1] ?? null;
}

/** Formatta "2026-W37" come "settimana 37 del 2026". */
export function etichettaGiornata(id: string): string {
  const [anno, settimana] = id.split('-W');
  return `settimana ${Number(settimana)} del ${anno}`;
}
