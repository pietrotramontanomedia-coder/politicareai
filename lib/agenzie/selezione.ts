import type { Agenzia, LancioAgenzia } from './tipi';

/**
 * Selezione dei lanci: fusione della stessa notizia data da più agenzie e
 * filtro per rilevanza. Regole deterministiche e leggibili: chiunque può
 * ricalcolare a mano perché un lancio è entrato o è stato scartato.
 * Nessun modello linguistico decide qui.
 */

/** Parole ignorate nel confronto fra titoli: non distinguono una notizia dall'altra. */
export const PAROLE_VUOTE = new Set([
  'alla', 'alle', 'allo', 'agli', 'anche', 'come', 'con', 'contro', 'dal', 'dalla', 'dalle', 'dallo', 'dagli',
  'degli', 'dei', 'del', 'della', 'delle', 'dello', 'dopo', 'dove', 'due', 'ecco', 'fra', 'gli', 'le', 'lo',
  'nel', 'nella', 'nelle', 'nello', 'negli', 'non', 'oggi', 'ore', 'per', 'più', 'poi', 'prima', 'questa',
  'questo', 'sarà', 'sono', 'sotto', 'sul', 'sulla', 'sulle', 'sullo', 'sugli', 'tra', 'tutti', 'tutto',
  'una', 'uno', 'verso',
  // etichetta dei feed finti di sviluppo: comune a tutti i titoli, non va pesata
  'simulazione',
]);

/** Termini che segnalano un fatto istituzionale o di processo legislativo. */
export const PAROLE_ISTITUZIONALI = [
  'consiglio dei ministri', 'cdm', 'palazzo chigi', 'governo', 'premier', 'presidente del consiglio', 'ministro',
  'ministra', 'viceministro', 'sottosegretari', 'camera', 'senato', 'parlamento', 'commissione', 'aula',
  'quirinale', 'colle', 'mattarella', 'decreto', 'ddl', 'disegno di legge', 'legge', 'emendament', 'riforma',
  'referendum', 'premierato', 'elezioni', 'elettorale', 'voto', 'fiducia', 'manovra', 'bilancio', 'legge di bilancio',
  'consulta', 'corte costituzionale', 'regione', 'regioni', 'conferenza', 'sindaci', 'comuni', 'unione europea',
  'commissione europea', 'consiglio europeo', 'parlamento europeo', 'bruxelles', 'sciopero', 'sindacati',
  'liste', 'candidat', 'coalizione', 'maggioranza', 'opposizione', 'primarie', 'congresso',
];

/** Nomi di partito: un lancio che ne cita uno riguarda quasi sempre la vita politica. */
export const PARTITI = [
  'fratelli d\'italia', 'fdi', 'partito democratico', ' pd', 'lega', 'forza italia', 'movimento 5 stelle', 'm5s',
  'azione', 'italia viva', 'più europa', 'avs', 'alleanza verdi', 'sinistra italiana', 'noi moderati',
  'futuro nazionale', 'terzo polo',
];

/** Formati che non sono notizie: rassegne, video, foto, agende, dirette, rubriche. */
export const RUMORE = [
  /\bvideo\b/i, /\bfoto\b/i, /\bgallery\b/i, /\bfotogallery\b/i, /\bdiretta\b/i, /\blive\b/i, /\bpodcast\b/i,
  /prime pagine/i, /rassegna stampa/i, /accade oggi/i, /\bagenda\b/i, /\boroscopo\b/i, /\bmeteo\b/i,
  /gli appuntamenti/i, /le notizie del giorno/i, /cosa è successo/i, /il punto/i, /\bsondaggi?\b.*\bvip\b/i,
];

const LUNGHEZZA_MINIMA_TITOLO = 30;
const FINESTRA_DOPPIONE_MS = 24 * 3_600_000;
const MIN_PAROLE_IN_COMUNE = 3;
const SOGLIA_CONTENIMENTO = 0.6;
/** Punteggio minimo perché un lancio sia "interessante". */
export const SOGLIA_RILEVANZA = 2;

function senzaAccenti(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Parole significative di un titolo, normalizzate: base del confronto fra agenzie. */
export function paroleSignificative(titolo: string): Set<string> {
  return new Set(
    senzaAccenti(titolo.toLowerCase())
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((p) => p.length >= 3 && !PAROLE_VUOTE.has(p)),
  );
}

/**
 * Due titoli raccontano la stessa notizia se condividono almeno tre parole
 * significative e queste coprono almeno il 60% del titolo più corto.
 * Il contenimento, e non l'indice di Jaccard, evita che un titolo lungo e
 * uno breve sullo stesso fatto risultino diversi.
 */
export function stessaNotizia(a: string, b: string): boolean {
  const pa = paroleSignificative(a);
  const pb = paroleSignificative(b);
  if (pa.size === 0 || pb.size === 0) return false;
  let comuni = 0;
  for (const p of pa) if (pb.has(p)) comuni += 1;
  return comuni >= MIN_PAROLE_IN_COMUNE && comuni / Math.min(pa.size, pb.size) >= SOGLIA_CONTENIMENTO;
}

/**
 * Fonde i lanci di agenzie diverse sulla stessa notizia entro 24 ore.
 * Resta il primo in ordine di tempo (chi l'ha data per prima); le altre
 * agenzie finiscono in `altreAgenzie`, così l'interfaccia può dirlo.
 * Presuppone che dentro ogni agenzia i doppioni siano già stati tolti.
 */
export function fondiTraAgenzie(lanci: LancioAgenzia[]): LancioAgenzia[] {
  const ordinati = [...lanci].sort((a, b) => Date.parse(a.data) - Date.parse(b.data));
  const risultato: LancioAgenzia[] = [];

  for (const lancio of ordinati) {
    const principale = risultato.find(
      (r) =>
        r.agenzia !== lancio.agenzia &&
        !(r.altreAgenzie ?? []).includes(lancio.agenzia) &&
        Math.abs(Date.parse(lancio.data) - Date.parse(r.data)) <= FINESTRA_DOPPIONE_MS &&
        stessaNotizia(r.titolo, lancio.titolo),
    );
    if (principale) {
      principale.altreAgenzie = [...(principale.altreAgenzie ?? []), lancio.agenzia];
      // Se il primo lancio era senza sommario, si prende quello dell'altra agenzia.
      if (!principale.testo && lancio.testo) principale.testo = lancio.testo;
    } else {
      risultato.push({ ...lancio, altreAgenzie: lancio.altreAgenzie ?? [] });
    }
  }

  return risultato.sort((a, b) => Date.parse(b.data) - Date.parse(a.data));
}

export interface Valutazione {
  punteggio: number;
  /** Motivi leggibili, per la pagina di metodologia e per il debug. */
  motivi: string[];
}

/**
 * Punteggio di rilevanza, tutto dichiarato:
 *   +2  cita un'istituzione o un passaggio legislativo
 *   +1  cita un partito
 *   +1  ha un sommario (il lancio racconta qualcosa, non è un titolo secco)
 *   +1  lo hanno dato più agenzie
 *   -3  è un formato che non è notizia (video, foto, rassegna, agenda, diretta)
 *   -1  titolo cortissimo
 * Entra chi arriva almeno a SOGLIA_RILEVANZA.
 */
export function valuta(lancio: LancioAgenzia): Valutazione {
  const titolo = ` ${senzaAccenti(lancio.titolo.toLowerCase())} `;
  const testo = senzaAccenti(lancio.testo.toLowerCase());
  const motivi: string[] = [];
  let punteggio = 0;

  if (PAROLE_ISTITUZIONALI.some((p) => titolo.includes(senzaAccenti(p)))) {
    punteggio += 2;
    motivi.push('istituzioni o iter legislativo nel titolo');
  } else if (PAROLE_ISTITUZIONALI.some((p) => testo.includes(senzaAccenti(p)))) {
    punteggio += 1;
    motivi.push('istituzioni o iter legislativo nel sommario');
  }
  if (PARTITI.some((p) => titolo.includes(senzaAccenti(p)) || testo.includes(senzaAccenti(p)))) {
    punteggio += 1;
    motivi.push('cita un partito');
  }
  if (lancio.testo.length > 0) {
    punteggio += 1;
    motivi.push('ha un sommario');
  }
  if ((lancio.altreAgenzie?.length ?? 0) > 0) {
    punteggio += 1;
    motivi.push('data da più agenzie');
  }
  if (RUMORE.some((r) => r.test(lancio.titolo))) {
    punteggio -= 3;
    motivi.push('formato non notizia (video, foto, rassegna, agenda, diretta)');
  }
  if (lancio.titolo.length < LUNGHEZZA_MINIMA_TITOLO) {
    punteggio -= 1;
    motivi.push('titolo troppo corto');
  }

  return { punteggio, motivi };
}

export interface EsitoSelezione {
  scelti: LancioAgenzia[];
  scartati: LancioAgenzia[];
}

/** Fusione fra agenzie e poi filtro per rilevanza. I lanci scelti portano il loro punteggio. */
export function selezionaInteressanti(lanci: LancioAgenzia[], soglia: number = SOGLIA_RILEVANZA): EsitoSelezione {
  const fusi = fondiTraAgenzie(lanci);
  const scelti: LancioAgenzia[] = [];
  const scartati: LancioAgenzia[] = [];
  for (const lancio of fusi) {
    const { punteggio } = valuta(lancio);
    const conPunteggio = { ...lancio, rilevanza: punteggio };
    (punteggio >= soglia ? scelti : scartati).push(conPunteggio);
  }
  return { scelti, scartati };
}

export function agenzieDi(lancio: LancioAgenzia): Agenzia[] {
  return [lancio.agenzia, ...(lancio.altreAgenzie ?? [])];
}
