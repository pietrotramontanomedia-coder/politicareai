/**
 * Motore del simulatore della legge elettorale approvata in via definitiva l'8 ottobre 2026 (A.C. 2822-B).
 * Logica pura e deterministica: dalle percentuali nazionali di liste e coalizioni ai seggi.
 * Ogni passaggio cita la norma. TU Camera = DPR 361/1957, TU Senato = d.lgs. 533/1993.
 * Le regole e le fonti complete sono in docs/legge-elettorale-2026-regole.md.
 */

import { REGIONI_SENATO, type RegioneSenato } from './simulatore-regioni';

export interface ListaInput {
  id: string;
  nome: string;
  /** Voti validi in Italia, in percentuale. */
  percentuale: number;
  /** Id della coalizione, o null se la lista corre da sola. */
  coalizione: string | null;
  colore: string;
  /** Somma di liste minori: non supera mai le soglie e non entra in coalizione. */
  aggregato?: boolean;
}

/** Chi vince i seggi di Valle d'Aosta e Trentino-Alto Adige: id di coalizione o lista, oppure LOCALI. */
export type SeggiSpeciali = Record<string, number>;

export const LOCALI = 'locali';

export const REGOLE = {
  camera: {
    totale: 400,
    estero: 8,
    seggiItalia: 392,
    /** Valle d'Aosta 1 collegio, Trentino-Alto Adige 4 collegi e 3 seggi proporzionali (art. 2 TU Camera). */
    speciali: 8,
    /** Seggi del riparto nazionale senza premio (art. 3 TU Camera). */
    nazionali: 384,
    /** Seggi del riparto nazionale quando scatta il premio (art. 83, c. 1, lett. f). */
    proporzionaliConPremio: 314,
    premio: 70,
    /** Tetto del vincitore, Valle d'Aosta e Trentino-Alto Adige compresi, Estero escluso (art. 1, c. 4). */
    tetto: 220,
    maggioranza: 201,
  },
  senato: {
    totale: 200,
    estero: 4,
    seggiItalia: 196,
    /** Valle d'Aosta 1 collegio, Trentino-Alto Adige 6 collegi (art. 1, cc. 3-4, TU Senato). */
    speciali: 7,
    nazionali: 189,
    proporzionaliConPremio: 154,
    premio: 35,
    tetto: 113,
    maggioranza: 101,
  },
  sogliaPremio: 42,
  sogliaLista: 3,
  sogliaCoalizione: 10,
  /** Al Senato qualsiasi lista supera lo sbarramento anche con il 20% in una regione (art. 16-bis, c. 1, lett. e). */
  sogliaRegionaleSenato: 20,
} as const;

export type Camera = 'camera' | 'senato';

export type StatoLista = 'in-parlamento' | 'miglior-perdente' | 'sotto-soglia' | 'altre-liste';

export type MotivoPremio = 'assegnato' | 'nessuno-al-42' | 'pareggio' | 'maggioranze-diverse' | 'nessun-voto';

export interface SeggiRamo {
  proporzionali: number;
  premio: number;
  /** Seggi di Valle d'Aosta e Trentino-Alto Adige. */
  speciali: number;
  totale: number;
}

export interface Competitore {
  id: string;
  nome: string;
  tipo: 'coalizione' | 'lista' | 'locali';
  colore: string;
  /** Cifra elettorale: per le coalizioni la somma di tutte le liste coalizzate (art. 83, c. 1, lett. c). */
  voti: number;
  /** Quota sui voti validi, in percentuale. */
  quota: number;
  /** Liste che partecipano al riparto dei seggi del competitore (art. 83, c. 1, lett. e, nn. 2-bis e 2-ter). */
  listeConSeggi: ListaInput[];
  camera: SeggiRamo;
  senato: SeggiRamo;
  seggiCamera: number;
  seggiSenato: number;
  /** Id di tutte le liste della coalizione: servono per le cifre regionali. */
  membri?: string[];
}

export interface EsitoLista {
  lista: ListaInput;
  stato: StatoLista;
  /** Stato al Senato: può essere diverso per la soglia regionale del 20%. */
  statoSenato: StatoLista;
  competitore: string | null;
  /** Seggi proporzionali della lista (il premio va al listino della coalizione). */
  seggiCamera: number;
  seggiSenato: number;
}

export interface EsitoRegione {
  regione: RegioneSenato;
  /** Stima dei voti in regione, in percentuale dei voti validi regionali. */
  quote: Record<string, number>;
  seggi: Record<string, number>;
}

export interface Esito {
  totaleVoti: number;
  competitori: Competitore[];
  liste: EsitoLista[];
  premio: { motivo: MotivoPremio; vincitore: string | null };
  tettoCamera: boolean;
  tettoSenato: boolean;
  /** Seggi tolti al vincitore al Senato per il tetto, regione per regione. */
  correzioniTettoSenato: { regione: string; a: string }[];
  /** Percentuale dei voti validi andata a liste senza seggi alla Camera. */
  votiDispersi: number;
  coalizioniSottoSoglia: string[];
  regioniSenato: EsitoRegione[];
}

export interface GeografiaSenato {
  /** Voti validi 2022 per regione: pesano le regioni nella stima. */
  regioni: Record<string, { validi: number; quote: Record<string, number> }>;
  /** Quote nazionali 2022 delle stesse chiavi. */
  italia: Record<string, number>;
  /** Da id della lista di oggi alla chiave 2022 da cui prende la geografia. */
  profilo: Record<string, string>;
}

export interface OpzioniSimulazione {
  coalizioni: Record<string, string>;
  /** Il primo al Senato è un altro: nessun premio (art. 83, c. 1, lett. e-quinquies). */
  maggioranzeDiverse?: boolean;
  speciali?: { camera?: SeggiSpeciali; senato?: SeggiSpeciali };
  geografia?: GeografiaSenato;
}

// ---------------------------------------------------------------------------
// Riparto con quozienti interi e resti più alti (Hare)
// ---------------------------------------------------------------------------

export interface Riparto {
  seggi: number[];
  /** Parte decimale del quoziente di ciascuno. */
  resti: number[];
  /** Chi ha preso un seggio con il resto. */
  conResto: boolean[];
}

/**
 * Quozienti interi e resti più alti (art. 83, c. 1, lett. f, TU Camera; art. 16-bis, c. 1, lett. f, TU Senato).
 * A parità di resto vince la cifra più alta; la legge prevede poi il sorteggio, qui sostituito dall'ordine di arrivo.
 */
export function riparto(pesi: readonly number[], seggi: number): Riparto {
  const n = pesi.length;
  const totale = pesi.reduce((a, b) => a + Math.max(0, b), 0);
  if (seggi <= 0 || totale <= 0) return { seggi: pesi.map(() => 0), resti: pesi.map(() => 0), conResto: pesi.map(() => false) };

  const quozienti = pesi.map((p) => (Math.max(0, p) * seggi) / totale);
  const assegnati = quozienti.map((q) => Math.floor(q + 1e-9));
  const resti = quozienti.map((q, i) => Math.max(0, q - assegnati[i]));
  const conResto = pesi.map(() => false);
  let restanti = seggi - assegnati.reduce((a, b) => a + b, 0);

  const ordine = Array.from({ length: n }, (_, i) => i)
    .filter((i) => pesi[i] > 0)
    .sort((a, b) => resti[b] - resti[a] || pesi[b] - pesi[a] || a - b);
  for (let k = 0; restanti > 0 && ordine.length > 0; k = (k + 1) % ordine.length, restanti--) {
    assegnati[ordine[k]]++;
    conResto[ordine[k]] = true;
  }
  return { seggi: assegnati, resti, conResto };
}

/** Compatibilità con il codice precedente. */
export function ripartoResti(pesi: readonly number[], seggi: number): number[] {
  return riparto(pesi, seggi).seggi;
}

// ---------------------------------------------------------------------------
// Stima regionale per il Senato
// ---------------------------------------------------------------------------

/**
 * Distribuisce le percentuali nazionali nelle 18 regioni con la geografia del voto 2022 al Senato.
 * Parte dal profilo regionale 2022 di ogni lista e lo ricalibra (iterative proportional fitting) finché
 * ogni regione somma al totale dei voti e la media nazionale pesata coincide con le percentuali inserite.
 * Le liste senza un corrispettivo nel 2022 hanno lo stesso peso in tutte le regioni.
 */
export function stimaRegionale(liste: readonly ListaInput[], geografia: GeografiaSenato | undefined): Record<string, Record<string, number>> {
  const ids = liste.map((l) => l.id);
  const p = liste.map((l) => Math.max(0, l.percentuale));
  const totale = p.reduce((a, b) => a + b, 0);
  const regioni = REGIONI_SENATO.map((r) => r.id);
  const peso = regioni.map((r) => geografia?.regioni[r]?.validi ?? 1);
  const pesoTot = peso.reduce((a, b) => a + b, 0);

  const profilo = (i: number, r: string) => {
    if (!geografia) return 1;
    const chiave = geografia.profilo[ids[i]];
    const naz = chiave ? geografia.italia[chiave] : undefined;
    const reg = chiave ? geografia.regioni[r]?.quote[chiave] : undefined;
    return naz && naz > 0 && reg !== undefined ? Math.max(0.01, reg / naz) : 1;
  };

  const x = regioni.map((r) => p.map((v, i) => v * profilo(i, r)));
  for (let giro = 0; giro < 200 && totale > 0; giro++) {
    for (const riga of x) {
      const s = riga.reduce((a, b) => a + b, 0);
      if (s > 0) for (let i = 0; i < riga.length; i++) riga[i] = (riga[i] * totale) / s;
    }
    let scarto = 0;
    for (let i = 0; i < p.length; i++) {
      const media = x.reduce((a, riga, k) => a + riga[i] * peso[k], 0) / pesoTot;
      if (media > 0) {
        const f = p[i] / media;
        scarto = Math.max(scarto, Math.abs(f - 1));
        for (const riga of x) riga[i] *= f;
      }
    }
    if (scarto < 1e-10) break;
  }

  return Object.fromEntries(regioni.map((r, k) => [r, Object.fromEntries(ids.map((id, i) => [id, x[k][i]]))]));
}

// ---------------------------------------------------------------------------
// Ammissione al riparto (art. 83, c. 1, lett. e, TU Camera; art. 16-bis, c. 1, lett. e, TU Senato)
// ---------------------------------------------------------------------------

interface Ammissione {
  competitori: Competitore[];
  stati: Map<string, { stato: StatoLista; competitore: string | null }>;
  coalizioniSottoSoglia: string[];
}

function nuovoRamo(): SeggiRamo {
  return { proporzionali: 0, premio: 0, speciali: 0, totale: 0 };
}

function ammetti(liste: readonly ListaInput[], coalizioni: Record<string, string>, superaSoglia: (l: ListaInput) => boolean): Ammissione {
  const { sogliaCoalizione } = REGOLE;
  const stati = new Map<string, { stato: StatoLista; competitore: string | null }>();
  const competitori: Competitore[] = [];
  const coalizioniSottoSoglia: string[] = [];
  const singole: ListaInput[] = [];

  const perCoalizione = new Map<string, ListaInput[]>();
  for (const l of liste) {
    if (l.aggregato) stati.set(l.id, { stato: 'altre-liste', competitore: null });
    else if (l.coalizione) perCoalizione.set(l.coalizione, [...(perCoalizione.get(l.coalizione) ?? []), l]);
    else singole.push(l);
  }

  for (const [id, membri] of perCoalizione) {
    // Una «coalizione» di una sola lista è una lista singola.
    if (membri.length < 2) {
      singole.push(...membri);
      continue;
    }
    // La cifra della coalizione è la somma di tutte le liste coalizzate, nessuna esclusa (art. 83, c. 1, lett. c).
    const totale = membri.reduce((a, l) => a + Math.max(0, l.percentuale), 0);
    const sopra = membri.filter(superaSoglia);
    // n. 1: almeno il 10% e almeno una lista sopra soglia.
    if (totale < sogliaCoalizione || sopra.length === 0) {
      coalizioniSottoSoglia.push(coalizioni[id] ?? id);
      // n. 2: le sue liste sopra soglia entrano come liste singole.
      singole.push(...membri);
      continue;
    }
    // n. 2-ter: la lista più votata sotto soglia («miglior perdente») partecipa al riparto.
    const sotto = membri.filter((l) => !superaSoglia(l) && l.percentuale > 0).sort((a, b) => b.percentuale - a.percentuale);
    const migliorPerdente = sotto[0];
    const conSeggi = migliorPerdente ? [...sopra, migliorPerdente] : sopra;
    const principale = [...sopra].sort((a, b) => b.percentuale - a.percentuale)[0];

    competitori.push({
      id,
      nome: coalizioni[id] ?? id,
      tipo: 'coalizione',
      colore: principale.colore,
      voti: totale,
      quota: 0,
      listeConSeggi: conSeggi,
      camera: nuovoRamo(),
      senato: nuovoRamo(),
      seggiCamera: 0,
      seggiSenato: 0,
    });
    for (const l of membri) {
      const stato: StatoLista = sopra.includes(l) ? 'in-parlamento' : l === migliorPerdente ? 'miglior-perdente' : 'sotto-soglia';
      stati.set(l.id, { stato, competitore: id });
    }
  }

  for (const l of singole) {
    if (superaSoglia(l)) {
      competitori.push({
        id: l.id,
        nome: l.nome,
        tipo: 'lista',
        colore: l.colore,
        voti: Math.max(0, l.percentuale),
        quota: 0,
        listeConSeggi: [l],
        camera: nuovoRamo(),
        senato: nuovoRamo(),
        seggiCamera: 0,
        seggiSenato: 0,
      });
      stati.set(l.id, { stato: 'in-parlamento', competitore: l.id });
    } else {
      stati.set(l.id, { stato: 'sotto-soglia', competitore: null });
    }
  }

  return { competitori, stati, coalizioniSottoSoglia };
}

// ---------------------------------------------------------------------------
// Premio (art. 83, c. 1, lett. e-ter / e-septies, TU Camera; art. 16-bis, c. 1, lett. e-bis / e-sexies, TU Senato)
// ---------------------------------------------------------------------------

function primo(competitori: readonly Competitore[], totaleVoti: number): { motivo: MotivoPremio; vincitore: Competitore | null } {
  const ordinati = [...competitori].sort((a, b) => b.voti - a.voti);
  const [a, b] = ordinati;
  if (!a || totaleVoti <= 0) return { motivo: 'nessun-voto', vincitore: null };
  if ((a.voti / totaleVoti) * 100 < REGOLE.sogliaPremio - 1e-9) return { motivo: 'nessuno-al-42', vincitore: null };
  // La legge non dice chi vince a pari cifra: qui il premio non si assegna.
  if (b && Math.abs(b.voti - a.voti) < 1e-9) return { motivo: 'pareggio', vincitore: null };
  return { motivo: 'assegnato', vincitore: a };
}

// ---------------------------------------------------------------------------
// Seggi di Valle d'Aosta e Trentino-Alto Adige
// ---------------------------------------------------------------------------

function speciali(richiesta: SeggiSpeciali | undefined, totale: number, ammessi: Set<string>): Record<string, number> {
  const esito: Record<string, number> = {};
  let resto = totale;
  for (const [id, n] of Object.entries(richiesta ?? {})) {
    const seggi = Math.min(resto, Math.max(0, Math.floor(n)));
    if (seggi <= 0) continue;
    // Chi non è ammesso al riparto non può essere il destinatario: i seggi restano alle liste locali.
    const chi = id === LOCALI || ammessi.has(id) ? id : LOCALI;
    esito[chi] = (esito[chi] ?? 0) + seggi;
    resto -= seggi;
  }
  if (resto > 0) esito[LOCALI] = (esito[LOCALI] ?? 0) + resto;
  return esito;
}

// ---------------------------------------------------------------------------
// Camera (art. 83 TU Camera)
// ---------------------------------------------------------------------------

function calcolaCamera(competitori: Competitore[], vincitore: Competitore | null, specialiCamera: Record<string, number>): boolean {
  const R = REGOLE.camera;
  const voti = competitori.map((c) => c.voti);
  competitori.forEach((c) => (c.camera.speciali = specialiCamera[c.id] ?? 0));

  if (!vincitore) {
    // Nessun premio: 384 seggi in proporzione (art. 83, c. 1-bis).
    riparto(voti, R.nazionali).seggi.forEach((s, i) => (competitori[i].camera.proporzionali = s));
    return false;
  }

  const iv = competitori.indexOf(vincitore);
  const base = riparto(voti, R.proporzionaliConPremio).seggi;
  vincitore.camera.premio = R.premio;
  let tetto = false;
  // Tetto di 220 seggi, Valle d'Aosta e Trentino-Alto Adige compresi (art. 83, c. 1, lett. f-bis, e c. 1-ter).
  if (base[iv] + R.premio + vincitore.camera.speciali > R.tetto) {
    tetto = true;
    const alVincitore = Math.max(0, R.tetto - R.premio - vincitore.camera.speciali);
    const altri = voti.map((v, i) => (i === iv ? 0 : v));
    const agliAltri = riparto(altri, R.proporzionaliConPremio - alVincitore).seggi;
    agliAltri[iv] = alVincitore;
    agliAltri.forEach((s, i) => (competitori[i].camera.proporzionali = s));
  } else {
    base.forEach((s, i) => (competitori[i].camera.proporzionali = s));
  }
  return tetto;
}

// ---------------------------------------------------------------------------
// Senato (art. 16-bis e 17 TU Senato)
// ---------------------------------------------------------------------------

interface RipartoRegionale {
  regione: RegioneSenato;
  cifre: number[];
  seggi: number[];
  resti: number[];
  restoUsato: boolean[];
}

function calcolaSenato(
  competitori: Competitore[],
  vincitore: Competitore | null,
  specialiSenato: Record<string, number>,
  regionale: Record<string, Record<string, number>>,
): { tetto: boolean; correzioni: { regione: string; a: string }[]; riparti: RipartoRegionale[] } {
  const R = REGOLE.senato;
  competitori.forEach((c) => (c.senato.speciali = specialiSenato[c.id] ?? 0));
  const cifraRegionale = (c: Competitore, r: string) =>
    c.tipo === 'coalizione'
      ? (c.membri ?? []).reduce((a, id) => a + (regionale[r]?.[id] ?? 0), 0)
      : regionale[r]?.[c.id] ?? 0;

  // Riparto regione per regione con le cifre regionali (art. 16-bis, c. 1, lett. f).
  const riparti: RipartoRegionale[] = REGIONI_SENATO.map((regione) => {
    const cifre = competitori.map((c) => cifraRegionale(c, regione.id));
    const seggiDaDare = vincitore ? regione.proporzionaliConPremio : regione.seggi;
    const r = riparto(cifre, seggiDaDare);
    return { regione, cifre, seggi: r.seggi, resti: r.resti, restoUsato: [...r.conResto] };
  });

  const correzioni: { regione: string; a: string }[] = [];
  let tetto = false;
  if (vincitore) {
    const iv = competitori.indexOf(vincitore);
    vincitore.senato.premio = R.premio;
    const proporzionali = () => riparti.reduce((a, r) => a + r.seggi[iv], 0);
    let eccedenza = proporzionali() + R.premio + vincitore.senato.speciali - R.tetto;
    if (eccedenza > 0) tetto = true;

    const cedi = (rr: RipartoRegionale) => {
      rr.seggi[iv]--;
      // Il seggio va, nella stessa regione, al perdente con il resto non utilizzato più alto;
      // senza resti, a quello con la cifra regionale più alta (art. 16-bis, c. 1-ter, lett. b).
      const candidati = competitori
        .map((_, i) => i)
        .filter((i) => i !== iv && rr.cifre[i] > 0);
      const conResto = candidati.filter((i) => !rr.restoUsato[i] && rr.resti[i] > 0);
      const scelto = (conResto.length ? conResto : candidati).sort(
        (a, b) => (conResto.length ? rr.resti[b] - rr.resti[a] : 0) || rr.cifre[b] - rr.cifre[a] || a - b,
      )[0];
      if (scelto === undefined) {
        rr.seggi[iv]++;
        return false;
      }
      rr.seggi[scelto]++;
      rr.restoUsato[scelto] = true;
      correzioni.push({ regione: rr.regione.id, a: competitori[scelto].id });
      return true;
    };

    // 1. Si tolgono i seggi presi con i resti, partendo dai resti più piccoli (graduatoria nazionale).
    const conResti = riparti.filter((r) => r.restoUsato[iv] && r.seggi[iv] > 0).sort((a, b) => a.resti[iv] - b.resti[iv]);
    for (const rr of conResti) {
      if (eccedenza <= 0) break;
      rr.restoUsato[iv] = false;
      if (cedi(rr)) eccedenza--;
    }
    // 2. Poi un seggio per regione dove il vincitore ha la percentuale più bassa,
    //    escluse le regioni dove ha un solo seggio (art. 16-bis, c. 1-ter, lett. a).
    for (let giro = 0; eccedenza > 0 && giro < 50; giro++) {
      const totaleRegione = (r: RipartoRegionale) => r.cifre.reduce((a, b) => a + b, 0);
      const regioni = riparti
        .filter((r) => r.seggi[iv] > 1)
        .sort((a, b) => a.cifre[iv] / (totaleRegione(a) || 1) - b.cifre[iv] / (totaleRegione(b) || 1));
      if (!regioni.length) break;
      for (const rr of regioni) {
        if (eccedenza <= 0) break;
        if (cedi(rr)) eccedenza--;
      }
    }
  }

  competitori.forEach((c, i) => (c.senato.proporzionali = riparti.reduce((a, r) => a + r.seggi[i], 0)));
  return { tetto, correzioni, riparti };
}

// ---------------------------------------------------------------------------
// Simulazione completa
// ---------------------------------------------------------------------------

export function simula(liste: readonly ListaInput[], opzioni: OpzioniSimulazione): Esito {
  const totaleVoti = liste.reduce((a, l) => a + Math.max(0, l.percentuale), 0);
  const regionale = stimaRegionale(liste, opzioni.geografia);

  // Camera: soglie nazionali.
  const camera = ammetti(liste, opzioni.coalizioni, (l) => l.percentuale >= REGOLE.sogliaLista);
  // Senato: soglie nazionali, oppure il 20% in almeno una regione.
  const alVentiPerCento = (l: ListaInput) => REGIONI_SENATO.some((r) => (regionale[r.id]?.[l.id] ?? 0) >= REGOLE.sogliaRegionaleSenato * (totaleVoti / 100));
  const senato = ammetti(liste, opzioni.coalizioni, (l) => l.percentuale >= REGOLE.sogliaLista || (!l.aggregato && alVentiPerCento(l)));

  for (const a of [camera, senato]) {
    for (const c of a.competitori) {
      c.quota = totaleVoti > 0 ? (c.voti / totaleVoti) * 100 : 0;
      c.membri = c.tipo === 'coalizione' ? liste.filter((l) => l.coalizione === c.id && !l.aggregato).map((l) => l.id) : [c.id];
    }
  }

  // Il premio scatta solo se lo stesso vincitore supera il 42% in tutte e due le Camere.
  const pc = primo(camera.competitori, totaleVoti);
  const ps = primo(senato.competitori, totaleVoti);
  let motivo: MotivoPremio = pc.motivo;
  if (motivo === 'assegnato' && (opzioni.maggioranzeDiverse || ps.motivo !== 'assegnato' || ps.vincitore?.id !== pc.vincitore?.id)) {
    motivo = opzioni.maggioranzeDiverse || ps.motivo === 'assegnato' ? 'maggioranze-diverse' : ps.motivo;
  }
  const idVincitore = motivo === 'assegnato' ? pc.vincitore!.id : null;

  const ammessiCamera = new Set(camera.competitori.map((c) => c.id));
  const ammessiSenato = new Set(senato.competitori.map((c) => c.id));
  const specialiCamera = speciali(opzioni.speciali?.camera, REGOLE.camera.speciali, ammessiCamera);
  const specialiSenato = speciali(opzioni.speciali?.senato, REGOLE.senato.speciali, ammessiSenato);

  const tettoCamera = calcolaCamera(camera.competitori, camera.competitori.find((c) => c.id === idVincitore) ?? null, specialiCamera);
  const sen = calcolaSenato(senato.competitori, senato.competitori.find((c) => c.id === idVincitore) ?? null, specialiSenato, regionale);

  // Dentro ogni coalizione i seggi proporzionali si dividono tra le liste ammesse (art. 83, c. 1, lett. g;
  // art. 17, c. 1, lett. b, TU Senato: regione per regione). Il premio va al listino della coalizione.
  const seggiListe = new Map<string, { camera: number; senato: number }>();
  const aggiungi = (id: string, ramo: Camera, n: number) => {
    const s = seggiListe.get(id) ?? { camera: 0, senato: 0 };
    s[ramo] += n;
    seggiListe.set(id, s);
  };
  for (const c of camera.competitori) {
    const pesi = c.listeConSeggi.map((l) => l.percentuale);
    riparto(pesi, c.camera.proporzionali).seggi.forEach((n, j) => aggiungi(c.listeConSeggi[j].id, 'camera', n));
  }
  senato.competitori.forEach((c, i) => {
    for (const rr of sen.riparti) {
      const n = rr.seggi[i];
      if (n <= 0) continue;
      const pesi = c.listeConSeggi.map((l) => regionale[rr.regione.id]?.[l.id] ?? 0);
      riparto(pesi, n).seggi.forEach((m, j) => aggiungi(c.listeConSeggi[j].id, 'senato', m));
    }
  });

  // Unisce i due rami in un solo elenco di competitori.
  const unione = new Map<string, Competitore>();
  for (const c of camera.competitori) unione.set(c.id, c);
  for (const s of senato.competitori) {
    const c = unione.get(s.id);
    if (c) {
      c.senato = s.senato;
      const extra = s.listeConSeggi.filter((l) => !c.listeConSeggi.includes(l));
      if (extra.length) c.listeConSeggi = [...c.listeConSeggi, ...extra];
    } else {
      s.camera = nuovoRamo();
      unione.set(s.id, s);
    }
  }
  const locali = (specialiCamera[LOCALI] ?? 0) + (specialiSenato[LOCALI] ?? 0);
  if (locali > 0) {
    unione.set(LOCALI, {
      id: LOCALI,
      nome: 'Liste locali',
      tipo: 'locali',
      colore: '#9ca3af',
      voti: 0,
      quota: 0,
      listeConSeggi: [],
      camera: { ...nuovoRamo(), speciali: specialiCamera[LOCALI] ?? 0 },
      senato: { ...nuovoRamo(), speciali: specialiSenato[LOCALI] ?? 0 },
      seggiCamera: 0,
      seggiSenato: 0,
    });
  }
  const competitori = [...unione.values()];
  for (const c of competitori) {
    c.camera.totale = c.camera.proporzionali + c.camera.premio + c.camera.speciali;
    c.senato.totale = c.senato.proporzionali + c.senato.premio + c.senato.speciali;
    c.seggiCamera = c.camera.totale;
    c.seggiSenato = c.senato.totale;
  }

  const votiUtiliCamera = camera.competitori.reduce((a, c) => a + c.listeConSeggi.reduce((b, l) => b + l.percentuale, 0), 0);
  const ordine = (c: Competitore) => (c.tipo === 'locali' ? -1 : c.seggiCamera);

  return {
    totaleVoti,
    competitori: competitori.sort((a, b) => ordine(b) - ordine(a) || b.voti - a.voti),
    liste: liste.map((lista) => {
      const s = camera.stati.get(lista.id) ?? { stato: 'sotto-soglia' as const, competitore: null };
      const ss = senato.stati.get(lista.id) ?? s;
      const seggi = seggiListe.get(lista.id) ?? { camera: 0, senato: 0 };
      return { lista, stato: s.stato, statoSenato: ss.stato, competitore: s.competitore ?? ss.competitore, seggiCamera: seggi.camera, seggiSenato: seggi.senato };
    }),
    premio: { motivo, vincitore: idVincitore },
    tettoCamera,
    tettoSenato: sen.tetto,
    correzioniTettoSenato: sen.correzioni,
    votiDispersi: totaleVoti > 0 ? ((totaleVoti - votiUtiliCamera) / totaleVoti) * 100 : 0,
    coalizioniSottoSoglia: camera.coalizioniSottoSoglia,
    regioniSenato: sen.riparti.map((rr) => ({
      regione: rr.regione,
      quote: Object.fromEntries(liste.map((l) => [l.id, totaleVoti > 0 ? ((regionale[rr.regione.id]?.[l.id] ?? 0) / totaleVoti) * 100 : 0])),
      seggi: Object.fromEntries(senato.competitori.map((c, i) => [c.id, rr.seggi[i]])),
    })),
  };
}
