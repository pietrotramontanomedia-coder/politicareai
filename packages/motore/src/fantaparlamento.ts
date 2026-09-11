/**
 * Fantaparlamento: rosa stagionale di deputati con budget, punti dalle votazioni vere.
 *
 * Tutto qui è deterministico e verificabile a mano: i punti nascono solo da fatti registrati
 * nei dati aperti della Camera (voti espressi, votazioni finali, fiducie, voti in dissenso
 * dalla linea del proprio gruppo). Nessun giudizio: un'assenza non toglie punti, semplicemente
 * non ne fa, perché può avere ragioni istituzionali (governo, missioni).
 */

/** Nel gioco serve solo a tenere la rosa equilibrata. */
export type SchieramentoDeputato = 'maggioranza' | 'opposizione' | 'misto';

export interface RegoleFanta {
  /** Crediti a disposizione per comporre la rosa. */
  crediti: number;
  /** Quanti deputati compongono la rosa. */
  titolari: number;
  /** Punti per ogni voto espresso (favorevole, contrario, astensione, o "ha votato" nei segreti). */
  puntiPerVoto: number;
  /** Un voto finale vale di più. */
  moltiplicatoreFinale: number;
  /** Una fiducia vale ancora di più. */
  moltiplicatoreFiducia: number;
  /** Punti per ogni voto diverso dalla linea prevalente del proprio gruppo. */
  puntiDissenso: number;
  /** Bonus a chi partecipa a quasi tutte le votazioni della giornata. */
  bonusPresenzaPiena: number;
  /** Quota di votazioni oltre la quale scatta il bonus (0-1). */
  sogliaPresenzaPiena: number;
  /** Il capitano moltiplica i suoi punti. */
  moltiplicatoreCapitano: number;
  minMaggioranza: number;
  minOpposizione: number;
  maxPerGruppo: number;
  /** Da media punti a crediti: prezzo = mediaPunti * fattorePrezzo, minimo prezzoMinimo. */
  fattorePrezzo: number;
  prezzoMinimo: number;
}

/** Quello che un deputato ha fatto in una giornata. */
export interface StatisticheDeputato {
  espressi: number;
  finali: number;
  fiducie: number;
  dissensi: number;
}

export interface Giornata {
  /** Settimana parlamentare, es. "2026-W37". */
  id: string;
  /** Giorni di seduta con voto, formato AAAAMMGG. */
  giorni: string[];
  votazioni: number;
  finali: number;
  fiducie: number;
  deputati: Record<string, StatisticheDeputato>;
}

export interface DeputatoListone {
  id: string;
  nome: string;
  cognome: string;
  gruppo: string;
  sigla: string;
  schieramento: SchieramentoDeputato;
  prezzo: number;
  /** Media dei punti nelle giornate giocate, usata per il prezzo. */
  mediaPunti: number;
  giornateGiocate: number;
}

export interface Squadra {
  /** Id dei deputati scelti. */
  deputati: string[];
  /** Id del capitano, deve essere nella rosa. */
  capitano: string | null;
}

const VUOTE: StatisticheDeputato = { espressi: 0, finali: 0, fiducie: 0, dissensi: 0 };

/** Punti di un deputato in una giornata. Arrotondati a un decimale. */
export function puntiDeputato(statistiche: StatisticheDeputato | undefined, giornata: Giornata, regole: RegoleFanta): number {
  const s = statistiche ?? VUOTE;
  if (s.espressi === 0) return 0;

  const semplici = Math.max(0, s.espressi - s.finali - s.fiducie);
  const punti =
    semplici * regole.puntiPerVoto +
    s.finali * regole.puntiPerVoto * regole.moltiplicatoreFinale +
    s.fiducie * regole.puntiPerVoto * regole.moltiplicatoreFiducia +
    s.dissensi * regole.puntiDissenso +
    (giornata.votazioni > 0 && s.espressi / giornata.votazioni >= regole.sogliaPresenzaPiena ? regole.bonusPresenzaPiena : 0);

  return Math.round(punti * 10) / 10;
}

export interface PuntiSquadra {
  totale: number;
  perDeputato: { id: string; punti: number; capitano: boolean }[];
}

/** Punti di una rosa in una giornata: il capitano vale di più. */
export function puntiSquadra(squadra: Squadra, giornata: Giornata, regole: RegoleFanta): PuntiSquadra {
  const perDeputato = squadra.deputati.map((id) => {
    const base = puntiDeputato(giornata.deputati[id], giornata, regole);
    const capitano = id === squadra.capitano;
    return { id, punti: Math.round((capitano ? base * regole.moltiplicatoreCapitano : base) * 10) / 10, capitano };
  });
  const totale = Math.round(perDeputato.reduce((a, d) => a + d.punti, 0) * 10) / 10;
  return { totale, perDeputato };
}

/** Media dei punti di un deputato nelle giornate in cui l'Aula ha votato. */
export function mediaPunti(idDeputato: string, giornate: Giornata[], regole: RegoleFanta): { media: number; giocate: number } {
  const valide = giornate.filter((g) => g.votazioni > 0);
  if (valide.length === 0) return { media: 0, giocate: 0 };
  const somma = valide.reduce((a, g) => a + puntiDeputato(g.deputati[idDeputato], g, regole), 0);
  return { media: Math.round((somma / valide.length) * 10) / 10, giocate: valide.length };
}

/** Prezzo in crediti: quanto rende in media, con un minimo per tutti. */
export function prezzoDa(media: number, regole: RegoleFanta): number {
  return Math.max(regole.prezzoMinimo, Math.round(media * regole.fattorePrezzo));
}

export function costoSquadra(squadra: Squadra, listone: DeputatoListone[]): number {
  const prezzoDi = new Map(listone.map((d) => [d.id, d.prezzo]));
  return squadra.deputati.reduce((a, id) => a + (prezzoDi.get(id) ?? 0), 0);
}

export type ErroreSquadra =
  | { regola: 'numero'; messaggio: string }
  | { regola: 'doppioni'; messaggio: string }
  | { regola: 'sconosciuto'; messaggio: string }
  | { regola: 'crediti'; messaggio: string }
  | { regola: 'equilibrio'; messaggio: string }
  | { regola: 'gruppo'; messaggio: string }
  | { regola: 'capitano'; messaggio: string };

/**
 * Regole della rosa: numero esatto di titolari, budget, e un vincolo di equilibrio.
 * L'equilibrio (almeno N di maggioranza e N di opposizione, massimo M per gruppo) serve al
 * prodotto prima che al gioco: la squadra non deve poter essere una tifoseria.
 */
export function validaSquadra(squadra: Squadra, listone: DeputatoListone[], regole: RegoleFanta): ErroreSquadra[] {
  const errori: ErroreSquadra[] = [];
  const perId = new Map(listone.map((d) => [d.id, d]));

  if (squadra.deputati.length !== regole.titolari) {
    errori.push({ regola: 'numero', messaggio: `La rosa deve avere ${regole.titolari} deputati, ne ha ${squadra.deputati.length}.` });
  }
  if (new Set(squadra.deputati).size !== squadra.deputati.length) {
    errori.push({ regola: 'doppioni', messaggio: 'Lo stesso deputato compare più di una volta.' });
  }

  const sconosciuti = squadra.deputati.filter((id) => !perId.has(id));
  if (sconosciuti.length > 0) {
    errori.push({ regola: 'sconosciuto', messaggio: `${sconosciuti.length} deputati non sono nel listone.` });
  }

  const scelti = squadra.deputati.map((id) => perId.get(id)).filter((d): d is DeputatoListone => Boolean(d));
  const costo = scelti.reduce((a, d) => a + d.prezzo, 0);
  if (costo > regole.crediti) {
    errori.push({ regola: 'crediti', messaggio: `Servono ${costo} crediti, ne hai ${regole.crediti}.` });
  }

  const maggioranza = scelti.filter((d) => d.schieramento === 'maggioranza').length;
  const opposizione = scelti.filter((d) => d.schieramento === 'opposizione').length;
  if (maggioranza < regole.minMaggioranza || opposizione < regole.minOpposizione) {
    errori.push({
      regola: 'equilibrio',
      messaggio: `Servono almeno ${regole.minMaggioranza} di maggioranza e ${regole.minOpposizione} di opposizione: ora sono ${maggioranza} e ${opposizione}.`,
    });
  }

  const perGruppo = new Map<string, number>();
  for (const d of scelti) perGruppo.set(d.sigla, (perGruppo.get(d.sigla) ?? 0) + 1);
  const troppi = [...perGruppo.entries()].filter(([, quanti]) => quanti > regole.maxPerGruppo);
  if (troppi.length > 0) {
    errori.push({
      regola: 'gruppo',
      messaggio: `Massimo ${regole.maxPerGruppo} dello stesso gruppo: ${troppi.map(([g, q]) => `${g} (${q})`).join(', ')}.`,
    });
  }

  if (squadra.capitano && !squadra.deputati.includes(squadra.capitano)) {
    errori.push({ regola: 'capitano', messaggio: 'Il capitano deve essere nella rosa.' });
  }

  return errori;
}

export function squadraCompleta(squadra: Squadra, listone: DeputatoListone[], regole: RegoleFanta): boolean {
  return squadra.capitano !== null && validaSquadra(squadra, listone, regole).length === 0;
}
