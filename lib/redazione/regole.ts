import type {
  BozzaVersione,
  Commento,
  Contenuto,
  Evento,
  GiornoAndamento,
  Persona,
  PersonaPubblica,
  VoceAttivita,
  FormatoPost,
  Obiettivi,
  SessioneRedazione,
  StatistichePersona,
  StatoContenuto,
  TipoCommento,
  TipoContenuto,
} from './tipi';

/*
 * Regole del portale della redazione, tutte funzioni pure: le usano sia le API sia l'interfaccia,
 * così i limiti mostrati a schermo sono gli stessi che il server fa rispettare.
 */

/** Limiti presi da Instagram dove esistono (didascalia, hashtag, foto del carosello). */
export const LIMITI = {
  nome: 40,
  didascalia: 2200,
  hashtag: 30,
  immaginiPost: 10,
  commento: 2000,
  /** Byte massimi di un'immagine già ridotta dal browser: sotto il tetto di 4,5 MB delle funzioni Vercel. */
  byteImmagine: 4 * 1024 * 1024,
} as const;

/** Ore in cui una storia resta nel cerchio in cima al feed, come su Instagram. */
export const ORE_STORIA = 24;

/** Dove si fanno card e storie: nel portale si pubblicano soltanto. */
export const URL_GENERATORE = 'https://politicare-storie.vercel.app';

export const STATI: StatoContenuto[] = ['da_rivedere', 'da_correggere', 'approvato', 'non_va_bene'];
export const TIPI_COMMENTO_REVISORE: TipoCommento[] = ['correzione', 'consiglio', 'complimento'];

const FORMATI: FormatoPost[] = ['1:1', '4:5'];
/** Identificativi generati dal server (UUID senza trattini): nient'altro entra nei percorsi dell'archivio. */
export const ID_VALIDO = /^[a-f0-9]{32}$/;

export function normalizzaNome(nome: string): string {
  return nome.replace(/\s+/g, ' ').trim().slice(0, LIMITI.nome);
}

/** Chiave della persona: "Giulia Rossi", "giulia  rossi" e "Giùlia Rossi" sono la stessa. */
export function chiaveNome(nome: string): string {
  return normalizzaNome(nome)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function contaHashtag(testo: string): number {
  return testo.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0;
}

type Esito<T> = { ok: true; valore: T } | { ok: false; errore: string };

const errore = <T>(messaggio: string): Esito<T> => ({ ok: false, errore: messaggio });

function testo(valore: unknown): string {
  return typeof valore === 'string' ? valore.replace(/\r\n/g, '\n').trim() : '';
}

/** Controlla una stesura inviata dal browser e la riduce ai soli campi previsti. */
export function validaBozza(tipo: TipoContenuto, dati: unknown): Esito<BozzaVersione> {
  if (!dati || typeof dati !== 'object') return errore('Dati mancanti.');
  const d = dati as Record<string, unknown>;
  const immagini = Array.isArray(d.immagini) ? d.immagini : [];
  if (!immagini.every((id) => typeof id === 'string' && ID_VALIDO.test(id))) return errore('Immagine non valida.');
  if (new Set(immagini).size !== immagini.length) return errore('La stessa immagine compare due volte.');

  if (tipo === 'post') {
    if (immagini.length === 0) return errore('Un post ha bisogno di almeno una card.');
    if (immagini.length > LIMITI.immaginiPost) return errore(`Al massimo ${LIMITI.immaginiPost} card per post.`);
    const didascalia = testo(d.didascalia);
    if (!didascalia) return errore('Scrivi il copy del post.');
    if (didascalia.length > LIMITI.didascalia) return errore(`Il copy supera i ${LIMITI.didascalia} caratteri.`);
    if (contaHashtag(didascalia) > LIMITI.hashtag) return errore(`Al massimo ${LIMITI.hashtag} hashtag.`);
    const formato = FORMATI.includes(d.formato as FormatoPost) ? (d.formato as FormatoPost) : '4:5';
    return { ok: true, valore: { immagini: immagini as string[], didascalia, formato } };
  }

  if (immagini.length !== 1) return errore('Una storia è una sola immagine.');
  return { ok: true, valore: { immagini: immagini as string[], didascalia: '', formato: '1:1' } };
}

export function nuovoContenuto(id: string, tipo: TipoContenuto, autore: string, bozza: BozzaVersione, adesso: Date): Contenuto {
  const quando = adesso.toISOString();
  return {
    id,
    tipo,
    autore: normalizzaNome(autore),
    chiaveAutore: chiaveNome(autore),
    creatoIl: quando,
    aggiornatoIl: quando,
    stato: 'da_rivedere',
    versioni: [{ numero: 1, inviataIl: quando, ...bozza }],
    commenti: [],
    eventi: [{ tipo: 'pubblicato', chi: normalizzaNome(autore), ruolo: 'redattore', quando, versione: 1 }],
  };
}

/** Nuova stesura dell'autore: torna fra quelli da rivedere, le precedenti restano consultabili. */
export function aggiungiVersione(contenuto: Contenuto, bozza: BozzaVersione, adesso: Date): Contenuto {
  const quando = adesso.toISOString();
  return {
    ...contenuto,
    aggiornatoIl: quando,
    stato: 'da_rivedere',
    versioni: [...contenuto.versioni, { numero: versioneCorrente(contenuto).numero + 1, inviataIl: quando, ...bozza }],
    eventi: [...eventiDi(contenuto), { tipo: 'nuova_versione', chi: contenuto.autore, ruolo: 'redattore', quando, versione: versioneCorrente(contenuto).numero + 1 }],
  };
}

export function versioneCorrente(contenuto: Contenuto) {
  return contenuto.versioni[contenuto.versioni.length - 1];
}

export function eAutore(sessione: SessioneRedazione, contenuto: Contenuto): boolean {
  return chiaveNome(sessione.nome) === contenuto.chiaveAutore;
}

/** Solo l'autore scrive nuove versioni (chi corregge suggerisce, non riscrive); un contenuto che non va bene è chiuso. */
export function puoModificare(sessione: SessioneRedazione, contenuto: Contenuto): boolean {
  return eAutore(sessione, contenuto) && contenuto.stato !== 'non_va_bene';
}

export function puoEliminare(sessione: SessioneRedazione, contenuto: Contenuto): boolean {
  return sessione.ruolo === 'revisore' || eAutore(sessione, contenuto);
}

/** Le correzioni sono fra l'autore e chi corregge: i colleghi vedono il lavoro, non il giudizio. */
export function puoVedereCommenti(sessione: SessioneRedazione, contenuto: Contenuto): boolean {
  return sessione.ruolo === 'revisore' || eAutore(sessione, contenuto);
}

export interface RichiestaCommento {
  tipo: TipoCommento;
  testo: string;
  /** Solo chi corregge cambia lo stato. */
  stato: StatoContenuto | null;
}

export function validaCommento(sessione: SessioneRedazione, contenuto: Contenuto, dati: unknown): Esito<RichiestaCommento> {
  if (!puoVedereCommenti(sessione, contenuto)) return errore('Non puoi commentare questo contenuto.');
  const d = (dati && typeof dati === 'object' ? dati : {}) as Record<string, unknown>;
  const scritto = testo(d.testo);
  if (scritto.length > LIMITI.commento) return errore(`Il commento supera i ${LIMITI.commento} caratteri.`);

  if (sessione.ruolo === 'revisore') {
    const stato = STATI.includes(d.stato as StatoContenuto) ? (d.stato as StatoContenuto) : null;
    if (!scritto && !stato) return errore('Scrivi un commento o cambia lo stato.');
    // «Non va bene» senza spiegazione non serve a chi l'ha scritto.
    if (stato === 'non_va_bene') return scritto ? { ok: true, valore: { tipo: 'bocciatura', testo: scritto, stato } } : errore('Scrivi perché non va bene.');
    const tipo = TIPI_COMMENTO_REVISORE.includes(d.tipo as TipoCommento) ? (d.tipo as TipoCommento) : 'consiglio';
    return { ok: true, valore: { tipo, testo: scritto, stato } };
  }
  if (!scritto) return errore('Il commento è vuoto.');
  return { ok: true, valore: { tipo: 'risposta', testo: scritto, stato: null } };
}

export function aggiungiCommento(
  contenuto: Contenuto,
  sessione: SessioneRedazione,
  richiesta: RichiestaCommento,
  id: string,
  adesso: Date,
): Contenuto {
  const quando = adesso.toISOString();
  const commenti: Commento[] = richiesta.testo
    ? [
        ...contenuto.commenti,
        {
          id,
          autore: normalizzaNome(sessione.nome),
          ruolo: sessione.ruolo,
          tipo: richiesta.tipo,
          testo: richiesta.testo,
          versione: versioneCorrente(contenuto).numero,
          creatoIl: quando,
        },
      ]
    : contenuto.commenti;
  const chi = normalizzaNome(sessione.nome);
  const versione = versioneCorrente(contenuto).numero;
  const eventi: Evento[] = [...eventiDi(contenuto)];
  if (richiesta.testo) eventi.push({ tipo: 'commento', chi, ruolo: sessione.ruolo, quando, versione, tipoCommento: richiesta.tipo, testo: richiesta.testo });
  if (richiesta.stato && richiesta.stato !== contenuto.stato) eventi.push({ tipo: 'stato', chi, ruolo: sessione.ruolo, quando, versione, stato: richiesta.stato });
  return { ...contenuto, commenti, stato: richiesta.stato ?? contenuto.stato, aggiornatoIl: quando, eventi };
}

/** Quello che una persona vede di un contenuto: senza commenti se non è sua e non corregge. */
export function perLettore(sessione: SessioneRedazione, contenuto: Contenuto): Contenuto {
  return puoVedereCommenti(sessione, contenuto) ? contenuto : { ...contenuto, commenti: [] };
}

/**
 * Quello che arriva al browser: i contenuti eliminati solo a chi corregge (il cestino) e
 * all'autore (contano nelle sue percentuali); i colleghi non li vedono.
 */
export function perElenco(sessione: SessioneRedazione, contenuti: Contenuto[]): Contenuto[] {
  return contenuti.filter((c) => !c.eliminatoIl || sessione.ruolo === 'revisore' || eAutore(sessione, c)).map((c) => perLettore(sessione, c));
}

export function eliminato(contenuto: Contenuto): boolean {
  return Boolean(contenuto.eliminatoIl);
}

/** Eliminazione morbida: il contenuto esce da feed e profili ma resta tutto nell'archivio. */
export function segnaEliminato(contenuto: Contenuto, sessione: SessioneRedazione, adesso: Date): Contenuto {
  const quando = adesso.toISOString();
  const chi = normalizzaNome(sessione.nome);
  return { ...contenuto, eliminatoIl: quando, eliminatoDa: chi, eventi: [...eventiDi(contenuto), { tipo: 'eliminato', chi, ruolo: sessione.ruolo, quando }] };
}

export function ripristina(contenuto: Contenuto, sessione: SessioneRedazione, adesso: Date): Contenuto {
  const quando = adesso.toISOString();
  // undefined non finisce nel JSON salvato: i due campi spariscono.
  return {
    ...contenuto,
    eliminatoIl: undefined,
    eliminatoDa: undefined,
    aggiornatoIl: quando,
    eventi: [...eventiDi(contenuto), { tipo: 'ripristinato', chi: normalizzaNome(sessione.nome), ruolo: sessione.ruolo, quando }],
  };
}

/**
 * Il registro di un contenuto. Quelli nati prima del registro lo ricostruiscono da versioni,
 * commenti ed eliminazione: i cambi di stato senza commento di allora non si possono recuperare.
 */
export function eventiDi(contenuto: Contenuto): Evento[] {
  if (contenuto.eventi) return contenuto.eventi;
  const eventi: Evento[] = contenuto.versioni.map((v) => ({
    tipo: v.numero === 1 ? 'pubblicato' : 'nuova_versione',
    chi: contenuto.autore,
    ruolo: 'redattore',
    quando: v.inviataIl,
    versione: v.numero,
  }));
  for (const c of contenuto.commenti) {
    eventi.push({ tipo: 'commento', chi: c.autore, ruolo: c.ruolo, quando: c.creatoIl, versione: c.versione, tipoCommento: c.tipo, testo: c.testo });
  }
  if (contenuto.eliminatoIl) eventi.push({ tipo: 'eliminato', chi: contenuto.eliminatoDa ?? '', ruolo: 'revisore', quando: contenuto.eliminatoIl });
  return eventi.sort((a, b) => a.quando.localeCompare(b.quando));
}

/** Tutto quello che è successo in redazione, dal più recente: la cronologia di chi coordina. */
export function cronologia(contenuti: Contenuto[]): VoceAttivita[] {
  return contenuti
    .flatMap((c) =>
      eventiDi(c).map((e) => ({ ...e, contenutoId: c.id, tipoContenuto: c.tipo, autore: c.autore, chiaveAutore: c.chiaveAutore })),
    )
    .sort((a, b) => b.quando.localeCompare(a.quando));
}

/** Feed: prima l'ultima stesura arrivata. */
export function ordinaFeed(contenuti: Contenuto[]): Contenuto[] {
  return [...contenuti].sort((a, b) => versioneCorrente(b).inviataIl.localeCompare(versioneCorrente(a).inviataIl));
}

/** Coda di chi corregge: prima chi aspetta da più tempo. */
export function codaRevisione(contenuti: Contenuto[]): Contenuto[] {
  return contenuti
    .filter((c) => c.stato === 'da_rivedere')
    .sort((a, b) => versioneCorrente(a).inviataIl.localeCompare(versioneCorrente(b).inviataIl));
}

/** Storie delle ultime 24 ore raggruppate per persona, in ordine cronologico dentro il gruppo. */
export function storieRecenti(contenuti: Contenuto[], adesso: Date): { autore: string; chiave: string; storie: Contenuto[] }[] {
  const soglia = adesso.getTime() - ORE_STORIA * 3600_000;
  const gruppi = new Map<string, { autore: string; chiave: string; storie: Contenuto[] }>();
  for (const c of contenuti) {
    if (c.tipo !== 'storia' || Date.parse(versioneCorrente(c).inviataIl) < soglia) continue;
    const gruppo = gruppi.get(c.chiaveAutore) ?? { autore: c.autore, chiave: c.chiaveAutore, storie: [] };
    gruppo.storie.push(c);
    gruppi.set(c.chiaveAutore, gruppo);
  }
  const ultima = (g: { storie: Contenuto[] }) => versioneCorrente(g.storie[g.storie.length - 1]).inviataIl;
  return [...gruppi.values()]
    .map((g) => ({ ...g, storie: [...g.storie].sort((a, b) => versioneCorrente(a).inviataIl.localeCompare(versioneCorrente(b).inviataIl)) }))
    .sort((a, b) => ultima(b).localeCompare(ultima(a)));
}

/** Giorno nel fuso di Roma, "2026-10-12": la giornata degli obiettivi finisce a mezzanotte italiana. */
export function giornoRoma(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
}

/** Quadro della squadra: quanto pubblica ognuno, a che punto è, come va rispetto agli obiettivi. */
export function statistiche(contenuti: Contenuto[], adesso: Date, registrate: Pick<Persona, 'nome' | 'chiave' | 'attiva'>[] = []): StatistichePersona[] {
  const settimanaFa = adesso.getTime() - 7 * 24 * 3600_000;
  const oggi = giornoRoma(adesso);
  const persone = new Map<string, StatistichePersona>();
  // Chi è registrato compare anche se non ha ancora pubblicato niente.
  for (const r of registrate.filter((x) => x.attiva)) {
    persone.set(r.chiave, {
      nome: r.nome, chiave: r.chiave, post: 0, storie: 0, settimana: 0, daRivedere: 0, daCorreggere: 0, approvati: 0,
      nonVaBene: 0, eliminati: 0, totale: 0, storieOggi: 0, postOggi: 0, ultimoInvio: null,
    });
  }
  for (const c of contenuti) {
    const p = persone.get(c.chiaveAutore) ?? {
      nome: c.autore,
      chiave: c.chiaveAutore,
      post: 0,
      storie: 0,
      settimana: 0,
      daRivedere: 0,
      daCorreggere: 0,
      approvati: 0,
      nonVaBene: 0,
      eliminati: 0,
      totale: 0,
      storieOggi: 0,
      postOggi: 0,
      ultimoInvio: null,
    };
    p.totale++;
    if (eliminato(c)) {
      p.eliminati++;
      persone.set(c.chiaveAutore, p);
      continue;
    }
    if (c.tipo === 'post') p.post++;
    else p.storie++;
    if (Date.parse(c.creatoIl) >= settimanaFa) p.settimana++;
    if (giornoRoma(c.creatoIl) === oggi) {
      if (c.tipo === 'post') p.postOggi++;
      else p.storieOggi++;
    }
    if (c.stato === 'da_rivedere') p.daRivedere++;
    else if (c.stato === 'da_correggere') p.daCorreggere++;
    else if (c.stato === 'non_va_bene') p.nonVaBene++;
    else p.approvati++;
    const invio = versioneCorrente(c).inviataIl;
    if (!p.ultimoInvio || invio > p.ultimoInvio) {
      p.ultimoInvio = invio;
      p.nome = c.autore;
    }
    persone.set(c.chiaveAutore, p);
  }
  return [...persone.values()].sort((a, b) => b.settimana - a.settimana || a.nome.localeCompare(b.nome, 'it'));
}

/**
 * Giorno per giorno, dal più vecchio a oggi: storie e post pubblicati (eliminati esclusi) rispetto
 * agli obiettivi di quel giorno (feriale o weekend).
 */
export function andamentoGiornaliero(contenuti: Contenuto[], chiave: string, obiettivi: Obiettivi, adesso: Date, giorni = 14): GiornoAndamento[] {
  const conteggi = new Map<string, { storie: number; post: number }>();
  for (const c of contenuti) {
    if (c.chiaveAutore !== chiave || eliminato(c)) continue;
    const g = giornoRoma(c.creatoIl);
    const n = conteggi.get(g) ?? { storie: 0, post: 0 };
    if (c.tipo === 'post') n.post++;
    else n.storie++;
    conteggi.set(g, n);
  }
  const risultato: GiornoAndamento[] = [];
  for (let i = giorni - 1; i >= 0; i--) {
    // Mezzogiorno UTC: lontano dalla mezzanotte, il giorno a Roma è sempre quello giusto.
    const d = new Date(`${giornoRoma(adesso)}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    const giorno = giornoRoma(d);
    const o = obiettiviDiOggi(obiettivi, d);
    const n = conteggi.get(giorno) ?? { storie: 0, post: 0 };
    risultato.push({ giorno, ...n, obiettivoStorie: o.storie, obiettivoPost: o.post, inPari: n.storie >= o.storie && n.post >= o.post });
  }
  return risultato;
}

/** Quanti contenuti approvati alla prima versione, sui contenuti approvati. */
export function approvatiAlPrimoColpo(contenuti: Contenuto[], chiave: string): { primoColpo: number; approvati: number } {
  const approvati = contenuti.filter((c) => c.chiaveAutore === chiave && !eliminato(c) && c.stato === 'approvato');
  return { primoColpo: approvati.filter((c) => c.versioni.length === 1).length, approvati: approvati.length };
}

export const LUNGHEZZA_MINIMA_PASSWORD = 6;

export function perBrowser(persone: Persona[]): PersonaPubblica[] {
  return persone.map(({ password, ...resto }) => ({ ...resto, conPassword: Boolean(password) }));
}

/** Elenco delle persone: nomi puliti, niente doppioni, chi c'era resta (al massimo disattivato). */
export function aggiungiPersona(persone: Persona[], nome: string, da: string, adesso: Date): Esito<Persona[]> {
  const pulito = normalizzaNome(nome);
  if (pulito.length < 2) return errore('Scrivi nome e cognome.');
  const chiave = chiaveNome(pulito);
  const esistente = persone.find((p) => p.chiave === chiave);
  if (esistente?.attiva) return errore(`${esistente.nome} è già in elenco.`);
  if (esistente) return { ok: true, valore: persone.map((p) => (p.chiave === chiave ? { ...p, attiva: true } : p)) };
  return { ok: true, valore: [...persone, { nome: pulito, chiave, attiva: true, aggiuntaIl: adesso.toISOString(), aggiuntaDa: normalizzaNome(da) }] };
}

export function cambiaAttiva(persone: Persona[], chiave: string, attiva: boolean): Esito<Persona[]> {
  if (!persone.some((p) => p.chiave === chiave)) return errore('Persona non trovata.');
  return { ok: true, valore: persone.map((p) => (p.chiave === chiave ? { ...p, attiva } : p)) };
}

/** Percentuale intera su tutti i contenuti della persona (0 se non ha ancora pubblicato). */
export function percentuale(parte: number, totale: number): number {
  return totale > 0 ? Math.round((parte / totale) * 100) : 0;
}

export const OBIETTIVI_PREDEFINITI: Obiettivi = { storieGiorno: 5, postGiorno: 2, storieWeekend: 2, postWeekend: 1 };

/** Sabato o domenica, a Roma. */
export function eWeekend(adesso: Date): boolean {
  const giorno = adesso.toLocaleDateString('en-US', { timeZone: 'Europe/Rome', weekday: 'short' });
  return giorno === 'Sat' || giorno === 'Sun';
}

/** Quante storie e quanti post servono oggi: nel weekend valgono gli obiettivi ridotti. */
export function obiettiviDiOggi(o: Obiettivi, adesso: Date): { storie: number; post: number; weekend: boolean } {
  const weekend = eWeekend(adesso);
  return weekend ? { storie: o.storieWeekend, post: o.postWeekend, weekend } : { storie: o.storieGiorno, post: o.postGiorno, weekend };
}
const MASSIMO_OBIETTIVO = 30;

export function validaObiettivi(dati: unknown): Esito<Obiettivi> {
  const d = (dati && typeof dati === 'object' ? dati : {}) as Record<string, unknown>;
  const numero = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MASSIMO_OBIETTIVO ? v : null);
  const storieGiorno = numero(d.storieGiorno);
  const postGiorno = numero(d.postGiorno);
  const storieWeekend = numero(d.storieWeekend ?? OBIETTIVI_PREDEFINITI.storieWeekend);
  const postWeekend = numero(d.postWeekend ?? OBIETTIVI_PREDEFINITI.postWeekend);
  if (storieGiorno === null || postGiorno === null || storieWeekend === null || postWeekend === null) {
    return errore(`Gli obiettivi sono numeri interi da 0 a ${MASSIMO_OBIETTIVO}.`);
  }
  return { ok: true, valore: { storieGiorno, postGiorno, storieWeekend, postWeekend } };
}

export function obiettivoRaggiunto(p: StatistichePersona, o: Obiettivi, adesso: Date): boolean {
  const oggi = obiettiviDiOggi(o, adesso);
  return p.storieOggi >= oggi.storie && p.postOggi >= oggi.post;
}

/**
 * Resoconto serale per il gruppo Telegram (HTML di Telegram): per ognuno storie e post di oggi
 * rispetto agli obiettivi, chi è in pari e chi no, quanti contenuti aspettano una revisione.
 */
export function testoResoconto(
  contenuti: Contenuto[],
  obiettivi: Obiettivi,
  adesso: Date,
  link: string,
  registrate: Pick<Persona, 'nome' | 'chiave' | 'attiva'>[] = [],
): string {
  const html = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const attive = new Set(registrate.filter((r) => r.attiva).map((r) => r.chiave));
  // Con l'elenco delle persone contano solo loro (anche chi non ha pubblicato); senza, chi ha pubblicato.
  const squadra = statistiche(contenuti, adesso, registrate).filter((p) => (attive.size > 0 ? attive.has(p.chiave) : p.totale > p.eliminati));
  const giorno = adesso.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long' });
  const oggi = obiettiviDiOggi(obiettivi, adesso);
  const righe = [`📊 <b>Resoconto di ${giorno}</b>`, `Obiettivo${oggi.weekend ? ' del weekend' : ''}: ${oggi.storie} storie e ${oggi.post} post a testa`, ''];
  if (squadra.length === 0) righe.push('Nessuno ha ancora pubblicato nel portale.');
  const ordinati = [...squadra].sort((a, b) => b.storieOggi + b.postOggi - (a.storieOggi + a.postOggi) || a.nome.localeCompare(b.nome, 'it'));
  for (const p of ordinati) {
    const segno = obiettivoRaggiunto(p, obiettivi, adesso) ? '✅' : p.storieOggi + p.postOggi === 0 ? '⛔️' : '⚠️';
    righe.push(`${segno} <b>${html(p.nome)}</b>: storie ${p.storieOggi}/${oggi.storie} · post ${p.postOggi}/${oggi.post}`);
  }
  const inPari = squadra.filter((p) => obiettivoRaggiunto(p, obiettivi, adesso)).length;
  const coda = contenuti.filter((c) => !eliminato(c) && c.stato === 'da_rivedere').length;
  righe.push('', `In pari: ${inPari} su ${squadra.length}`, `Da rivedere: ${coda}`, '', `<a href="${html(link)}">Apri il portale</a>`);
  return righe.join('\n');
}

/** Riconosce JPEG, PNG e WebP dai primi byte: il tipo dichiarato dal browser non basta. */
export function tipoImmagine(byte: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (byte.length >= 3 && byte[0] === 0xff && byte[1] === 0xd8 && byte[2] === 0xff) return 'image/jpeg';
  if (byte.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => byte[i] === b)) return 'image/png';
  const ascii = (da: number, a: number) => String.fromCharCode(...byte.slice(da, a));
  if (byte.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}
