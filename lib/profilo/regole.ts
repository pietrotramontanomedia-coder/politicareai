import { VERSIONE_PROFILO, type EsitoQuiz, type Profilo, type RisultatoQuizSalvato } from './tipi';
import type { RisultatoTestLocale } from './risultato-test-locale';

/* Regole del profilo: funzioni pure, senza storage né rete, verificabili nei test. */

export const COLORI_AVATAR = ['#FEDC01', '#60A5FA', '#34D399', '#A78BFA', '#F472B6', '#FB923C'] as const;
export const MAX_GIOCATORI = 12;
export const MAX_NOME = 40;
export const MAX_CITTA = 60;
export const ANNO_MINIMO = 1900;
/** Sotto i 14 anni in Italia serve il consenso di chi esercita la responsabilità genitoriale (GDPR art. 8). */
export const ETA_MINIMA_AUTONOMA = 14;

export function profiloVuoto(adesso: Date = new Date()): Profilo {
  const iso = adesso.toISOString();
  return {
    versione: VERSIONE_PROFILO,
    nome: '',
    colore: COLORI_AVATAR[0],
    annoNascita: null,
    citta: '',
    creatoIl: iso,
    aggiornatoIl: iso,
    temiSeguiti: [],
    storicoQuiz: [],
    giocatori: [],
  };
}

export function iniziali(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

/** Registra un quiz completato: il primo tentativo resta, i successivi aggiornano tentativi e miglior punteggio. */
export function registraQuiz(profilo: Profilo, esito: EsitoQuiz, adesso: Date = new Date()): Profilo {
  const esistente = profilo.storicoQuiz.find((q) => q.numero === esito.numero);
  const storicoQuiz: RisultatoQuizSalvato[] = esistente
    ? profilo.storicoQuiz.map((q) =>
        q.numero === esito.numero
          ? { ...q, tentativi: q.tentativi + 1, migliorePercentuale: Math.max(q.migliorePercentuale, esito.percentuale) }
          : q,
      )
    : [
        ...profilo.storicoQuiz,
        { ...esito, completatoIl: adesso.toISOString(), migliorePercentuale: esito.percentuale, tentativi: 1 },
      ];
  return { ...profilo, storicoQuiz: storicoQuiz.sort((a, b) => b.numero - a.numero), aggiornatoIl: adesso.toISOString() };
}

/**
 * Settimane di fila con il quiz completato, contando all'indietro dall'ultimo pubblicato.
 * Se l'ultimo non è ancora fatto la serie non si spezza: la settimana è ancora aperta.
 */
export function serieQuiz(storico: RisultatoQuizSalvato[], ultimoPubblicato: number): number {
  const fatti = new Set(storico.map((q) => q.numero));
  let numero = fatti.has(ultimoPubblicato) ? ultimoPubblicato : ultimoPubblicato - 1;
  let serie = 0;
  while (numero > 0 && fatti.has(numero)) {
    serie++;
    numero--;
  }
  return serie;
}

export function serieMassima(storico: RisultatoQuizSalvato[]): number {
  const numeri = [...new Set(storico.map((q) => q.numero))].sort((a, b) => a - b);
  let migliore = 0;
  let corrente = 0;
  numeri.forEach((n, i) => {
    corrente = i > 0 && n === numeri[i - 1] + 1 ? corrente + 1 : 1;
    migliore = Math.max(migliore, corrente);
  });
  return migliore;
}

export function statisticheQuiz(storico: RisultatoQuizSalvato[]): { completati: number; media: number; migliore: number } {
  if (storico.length === 0) return { completati: 0, media: 0, migliore: 0 };
  return {
    completati: storico.length,
    media: Math.round(storico.reduce((a, q) => a + q.percentuale, 0) / storico.length),
    migliore: Math.max(...storico.map((q) => q.migliorePercentuale)),
  };
}

export type IdTraguardo = 'primo-quiz' | 'tre-di-fila' | 'en-plein' | 'cinque-quiz' | 'esperto';

/** Traguardi calcolati solo sui quiz: il test partiti non deve lasciare tracce nel profilo. */
export function traguardi(storico: RisultatoQuizSalvato[]): { id: IdTraguardo; ottenuto: boolean }[] {
  const { completati, media } = statisticheQuiz(storico);
  return [
    { id: 'primo-quiz', ottenuto: completati >= 1 },
    { id: 'tre-di-fila', ottenuto: serieMassima(storico) >= 3 },
    { id: 'en-plein', ottenuto: storico.some((q) => q.percentuale === 100) },
    { id: 'cinque-quiz', ottenuto: completati >= 5 },
    { id: 'esperto', ottenuto: completati >= 3 && media >= 70 },
  ];
}

/** Età compiuta a partire dall'anno di nascita: approssimata all'anno, non chiediamo il giorno. */
export function etaDa(annoNascita: number | null, adesso: Date = new Date()): number | null {
  if (!annoNascita) return null;
  const eta = adesso.getFullYear() - annoNascita;
  return eta >= 0 && eta <= 120 ? eta : null;
}

export function annoNascitaValido(anno: number, adesso: Date = new Date()): boolean {
  return Number.isInteger(anno) && anno >= ANNO_MINIMO && anno <= adesso.getFullYear();
}

/** Anno di nascita e città: entrambi facoltativi, vuoti se non validi. */
export function impostaAnagrafica(
  profilo: Profilo,
  dati: { annoNascita?: number | null; citta?: string },
  adesso: Date = new Date(),
): Profilo {
  const annoNascita =
    dati.annoNascita === undefined
      ? profilo.annoNascita
      : dati.annoNascita !== null && annoNascitaValido(dati.annoNascita, adesso)
        ? dati.annoNascita
        : null;
  const citta = dati.citta === undefined ? profilo.citta : dati.citta.trim().replace(/\s+/g, ' ').slice(0, MAX_CITTA);
  return { ...profilo, annoNascita, citta, aggiornatoIl: adesso.toISOString() };
}

export function alternaTema(profilo: Profilo, area: string, adesso: Date = new Date()): Profilo {
  const temiSeguiti = profilo.temiSeguiti.includes(area)
    ? profilo.temiSeguiti.filter((t) => t !== area)
    : [...profilo.temiSeguiti, area];
  return { ...profilo, temiSeguiti, aggiornatoIl: adesso.toISOString() };
}

export function impostaGiocatori(profilo: Profilo, nomi: string[], adesso: Date = new Date()): Profilo {
  const visti = new Set<string>();
  const giocatori = nomi
    .map((n) => n.trim().slice(0, MAX_NOME))
    .filter((n) => {
      const chiave = n.toLowerCase();
      if (!n || visti.has(chiave)) return false;
      visti.add(chiave);
      return true;
    })
    .slice(0, MAX_GIOCATORI);
  return { ...profilo, giocatori, aggiornatoIl: adesso.toISOString() };
}

const TESTO = (v: unknown): v is string => typeof v === 'string';
const NUMERO = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function normalizzaQuiz(grezzo: unknown): RisultatoQuizSalvato | null {
  if (!grezzo || typeof grezzo !== 'object') return null;
  const q = grezzo as Record<string, unknown>;
  if (!NUMERO(q.numero) || !NUMERO(q.percentuale) || !NUMERO(q.corrette) || !NUMERO(q.totale) || !TESTO(q.completatoIl)) return null;
  return {
    numero: q.numero,
    percentuale: q.percentuale,
    corrette: q.corrette,
    totale: q.totale,
    completatoIl: q.completatoIl,
    migliorePercentuale: NUMERO(q.migliorePercentuale) ? q.migliorePercentuale : q.percentuale,
    tentativi: NUMERO(q.tentativi) ? q.tentativi : 1,
  };
}

/**
 * Ricostruisce un profilo da dati letti da uno storage (locale o account), tenendo solo i
 * campi previsti: qualsiasi altro dato, per errore o manomissione, viene scartato.
 */
export function normalizzaProfilo(grezzo: unknown): Profilo | null {
  if (!grezzo || typeof grezzo !== 'object') return null;
  const p = grezzo as Record<string, unknown>;
  if (p.versione !== VERSIONE_PROFILO || !TESTO(p.creatoIl)) return null;
  const elenco = (v: unknown) => (Array.isArray(v) ? v.filter(TESTO) : []);
  return {
    versione: VERSIONE_PROFILO,
    nome: TESTO(p.nome) ? p.nome.slice(0, MAX_NOME) : '',
    colore: TESTO(p.colore) && (COLORI_AVATAR as readonly string[]).includes(p.colore) ? p.colore : COLORI_AVATAR[0],
    creatoIl: p.creatoIl,
    aggiornatoIl: TESTO(p.aggiornatoIl) ? p.aggiornatoIl : p.creatoIl,
    annoNascita: NUMERO(p.annoNascita) && annoNascitaValido(p.annoNascita) ? p.annoNascita : null,
    citta: TESTO(p.citta) ? p.citta.slice(0, MAX_CITTA) : '',
    temiSeguiti: elenco(p.temiSeguiti),
    storicoQuiz: (Array.isArray(p.storicoQuiz) ? p.storicoQuiz : [])
      .map(normalizzaQuiz)
      .filter((q): q is RisultatoQuizSalvato => q !== null)
      .sort((a, b) => b.numero - a.numero),
    giocatori: elenco(p.giocatori).slice(0, MAX_GIOCATORI),
  };
}

/** I soli dati che possono lasciare il dispositivo verso l'account. */
export function datiSincronizzabili(profilo: Profilo): Profilo {
  return normalizzaProfilo(profilo) ?? profiloVuoto(new Date(profilo.creatoIl));
}

/**
 * Al primo accesso unisce il profilo del dispositivo con quello dell'account: per ogni quiz
 * tiene il primo tentativo più vecchio e somma i tentativi; nome e colore dell'account vincono se impostati.
 */
export function unisciProfili(dispositivo: Profilo, account: Profilo, adesso: Date = new Date()): Profilo {
  const perNumero = new Map<number, RisultatoQuizSalvato>();
  for (const q of [...account.storicoQuiz, ...dispositivo.storicoQuiz]) {
    const esistente = perNumero.get(q.numero);
    if (!esistente) {
      perNumero.set(q.numero, q);
      continue;
    }
    const primo = Date.parse(q.completatoIl) < Date.parse(esistente.completatoIl) ? q : esistente;
    perNumero.set(q.numero, {
      ...primo,
      tentativi: esistente.tentativi + q.tentativi,
      migliorePercentuale: Math.max(esistente.migliorePercentuale, q.migliorePercentuale),
    });
  }
  return {
    ...account,
    nome: account.nome || dispositivo.nome,
    colore: account.nome ? account.colore : dispositivo.colore,
    annoNascita: account.annoNascita ?? dispositivo.annoNascita,
    citta: account.citta || dispositivo.citta,
    creatoIl: Date.parse(dispositivo.creatoIl) < Date.parse(account.creatoIl) ? dispositivo.creatoIl : account.creatoIl,
    aggiornatoIl: adesso.toISOString(),
    temiSeguiti: [...new Set([...account.temiSeguiti, ...dispositivo.temiSeguiti])],
    storicoQuiz: [...perNumero.values()].sort((a, b) => b.numero - a.numero),
    giocatori: impostaGiocatori(account, [...account.giocatori, ...dispositivo.giocatori], adesso).giocatori,
  };
}

/** Esportazione completa di ciò che Politicare conserva sul dispositivo, per il diritto di accesso ai dati. */
export function esportaDati(profilo: Profilo | null, risultatoTest: RisultatoTestLocale | null, adesso: Date = new Date()): string {
  return JSON.stringify(
    {
      esportatoIl: adesso.toISOString(),
      profilo: profilo ? datiSincronizzabili(profilo) : null,
      soloSuQuestoDispositivo: { risultatoTestPartiti: risultatoTest },
    },
    null,
    2,
  );
}
