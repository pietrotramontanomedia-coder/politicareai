/**
 * Simulatore della nuova legge elettorale nel testo approvato dal Senato il 15 settembre 2026
 * (terza lettura alla Camera con la fiducia, voto finale previsto l'8 ottobre 2026).
 * Logica pura e deterministica: dalle percentuali di liste e coalizioni ai seggi.
 * Regole e semplificazioni sono dichiarate in TESTI_SIMULATORE e nella pagina.
 */

export interface ListaInput {
  id: string;
  nome: string;
  percentuale: number;
  /** Id della coalizione, o null se la lista corre da sola. */
  coalizione: string | null;
  colore: string;
  /** Somma di liste minori: non supera mai le soglie. */
  aggregato?: boolean;
}

export interface Ramo {
  /** Seggi assegnati in Italia, esclusa la circoscrizione Estero. */
  seggiItalia: number;
  premio: number;
  /** Seggi massimi del vincitore, esclusi quelli dell'Estero. */
  tetto: number;
  estero: number;
  /** Seggi elettivi, Estero compreso. */
  totale: number;
  /** Maggioranza assoluta dei seggi elettivi. */
  maggioranza: number;
}

export type IdRamo = 'camera' | 'senato';

export const REGOLE = {
  camera: { seggiItalia: 392, premio: 70, tetto: 220, estero: 8, totale: 400, maggioranza: 201 },
  senato: { seggiItalia: 196, premio: 35, tetto: 113, estero: 4, totale: 200, maggioranza: 101 },
  sogliaPremio: 42,
  sogliaLista: 3,
  sogliaCoalizione: 10,
} as const satisfies { camera: Ramo; senato: Ramo; sogliaPremio: number; sogliaLista: number; sogliaCoalizione: number };

export type StatoLista = 'in-parlamento' | 'miglior-perdente' | 'sotto-soglia' | 'altre-liste';

export type MotivoPremio = 'assegnato' | 'nessuno-al-42' | 'pareggio' | 'maggioranze-diverse' | 'nessun-voto';

export interface Competitore {
  id: string;
  nome: string;
  tipo: 'coalizione' | 'lista';
  colore: string;
  /** Voti di tutte le liste: valgono per il 42% e per chi arriva primo. */
  votiTotali: number;
  /** Quota di votiTotali sui voti validi, in percentuale. */
  quota: number;
  /** Voti delle liste che prendono seggi (sopra il 3% e miglior perdente): valgono per il riparto. */
  voti: number;
  listeConSeggi: ListaInput[];
  seggiCamera: number;
  seggiSenato: number;
}

export interface EsitoLista {
  lista: ListaInput;
  stato: StatoLista;
  competitore: string | null;
  seggiCamera: number;
  seggiSenato: number;
}

export interface Esito {
  totaleVoti: number;
  competitori: Competitore[];
  liste: EsitoLista[];
  premio: { motivo: MotivoPremio; vincitore: string | null };
  tettoCamera: boolean;
  tettoSenato: boolean;
  /** Percentuale dei voti validi andata a liste senza seggi. */
  votiDispersi: number;
  coalizioniSottoSoglia: string[];
}

/** Quozienti interi e resti più alti. A parità di resto vince chi ha più voti. */
export function ripartoResti(pesi: readonly number[], seggi: number): number[] {
  const totale = pesi.reduce((a, b) => a + Math.max(0, b), 0);
  if (seggi <= 0 || totale <= 0) return pesi.map(() => 0);

  const quozienti = pesi.map((p) => (Math.max(0, p) * seggi) / totale);
  const assegnati = quozienti.map((q) => Math.floor(q + 1e-9));
  let restanti = seggi - assegnati.reduce((a, b) => a + b, 0);

  const ordine = quozienti
    .map((q, i) => ({ i, resto: q - assegnati[i], peso: pesi[i] }))
    .sort((a, b) => b.resto - a.resto || b.peso - a.peso || a.i - b.i);

  for (let k = 0; restanti > 0; k = (k + 1) % ordine.length, restanti--) {
    assegnati[ordine[k].i]++;
  }
  return assegnati;
}

function assegnaRamo(voti: number[], ramo: Ramo, vincitore: number): { seggi: number[]; tetto: boolean } {
  if (vincitore < 0) return { seggi: ripartoResti(voti, ramo.seggiItalia), tetto: false };

  const seggi = ripartoResti(voti, ramo.seggiItalia - ramo.premio);
  seggi[vincitore] += ramo.premio;

  const altri = voti.map((v, i) => (i === vincitore ? 0 : v));
  const eccedenza = seggi[vincitore] - ramo.tetto;
  if (eccedenza <= 0 || altri.every((v) => v <= 0)) return { seggi, tetto: false };

  seggi[vincitore] = ramo.tetto;
  const extra = ripartoResti(altri, eccedenza);
  return { seggi: seggi.map((s, i) => s + extra[i]), tetto: true };
}

export function simula(
  liste: readonly ListaInput[],
  opzioni: { coalizioni: Record<string, string>; maggioranzeDiverse?: boolean },
): Esito {
  const { sogliaLista, sogliaCoalizione, sogliaPremio } = REGOLE;
  const totaleVoti = liste.reduce((a, l) => a + Math.max(0, l.percentuale), 0);
  const stati = new Map<string, { stato: StatoLista; competitore: string | null }>();
  const competitori: Competitore[] = [];
  const coalizioniSottoSoglia: string[] = [];
  const singole: ListaInput[] = [];

  const perCoalizione = new Map<string, ListaInput[]>();
  for (const l of liste) {
    if (l.coalizione) perCoalizione.set(l.coalizione, [...(perCoalizione.get(l.coalizione) ?? []), l]);
    else singole.push(l);
  }

  for (const [id, membri] of perCoalizione) {
    const reali = membri.filter((l) => !l.aggregato);
    membri.filter((l) => l.aggregato).forEach((l) => stati.set(l.id, { stato: 'altre-liste', competitore: null }));
    if (reali.length < 2) {
      singole.push(...reali);
      continue;
    }

    const totale = reali.reduce((a, l) => a + l.percentuale, 0);
    const sopra = reali.filter((l) => l.percentuale >= sogliaLista);
    if (totale < sogliaCoalizione || sopra.length === 0) {
      coalizioniSottoSoglia.push(opzioni.coalizioni[id] ?? id);
      singole.push(...reali);
      continue;
    }

    // Miglior perdente: la lista più votata fra quelle sotto il 3% prende seggi come le altre.
    const sotto = reali.filter((l) => l.percentuale < sogliaLista && l.percentuale > 0).sort((a, b) => b.percentuale - a.percentuale);
    const migliorPerdente = sotto[0];
    const conSeggi = migliorPerdente ? [...sopra, migliorPerdente] : sopra;
    const principale = [...sopra].sort((a, b) => b.percentuale - a.percentuale)[0];

    competitori.push({
      id,
      nome: opzioni.coalizioni[id] ?? id,
      tipo: 'coalizione',
      colore: principale.colore,
      // Senza la norma "anti-cespugli" contano per il premio anche le liste sotto soglia.
      votiTotali: totale,
      quota: 0,
      voti: conSeggi.reduce((a, l) => a + l.percentuale, 0),
      listeConSeggi: conSeggi,
      seggiCamera: 0,
      seggiSenato: 0,
    });
    sopra.forEach((l) => stati.set(l.id, { stato: 'in-parlamento', competitore: id }));
    sotto.forEach((l) => stati.set(l.id, { stato: l === migliorPerdente ? 'miglior-perdente' : 'sotto-soglia', competitore: id }));
    reali.filter((l) => l.percentuale <= 0).forEach((l) => stati.set(l.id, { stato: 'sotto-soglia', competitore: id }));
  }

  for (const l of singole) {
    if (l.aggregato) {
      stati.set(l.id, { stato: 'altre-liste', competitore: null });
    } else if (l.percentuale >= sogliaLista) {
      competitori.push({
        id: l.id,
        nome: l.nome,
        tipo: 'lista',
        colore: l.colore,
        votiTotali: l.percentuale,
        quota: 0,
        voti: l.percentuale,
        listeConSeggi: [l],
        seggiCamera: 0,
        seggiSenato: 0,
      });
      stati.set(l.id, { stato: 'in-parlamento', competitore: l.id });
    } else {
      stati.set(l.id, { stato: 'sotto-soglia', competitore: null });
    }
  }

  for (const c of competitori) c.quota = totaleVoti > 0 ? (c.votiTotali / totaleVoti) * 100 : 0;

  // Premio: a chi arriva primo con almeno il 42% dei voti validi, in entrambe le Camere.
  // Primato e soglia si misurano su tutti i voti della coalizione, anche delle liste sotto il 3%.
  const ordinati = [...competitori].sort((a, b) => b.votiTotali - a.votiTotali);
  const [primo, secondo] = ordinati;
  let motivo: MotivoPremio;
  if (!primo || totaleVoti <= 0) motivo = 'nessun-voto';
  else if (primo.quota < sogliaPremio - 1e-9) motivo = 'nessuno-al-42';
  else if (secondo && Math.abs(secondo.votiTotali - primo.votiTotali) < 1e-9) motivo = 'pareggio';
  else if (opzioni.maggioranzeDiverse) motivo = 'maggioranze-diverse';
  else motivo = 'assegnato';

  const indiceVincitore = motivo === 'assegnato' ? competitori.indexOf(primo) : -1;
  const voti = competitori.map((c) => c.voti);
  const camera = assegnaRamo(voti, REGOLE.camera, indiceVincitore);
  const senato = assegnaRamo(voti, REGOLE.senato, indiceVincitore);

  const seggiListe = new Map<string, { camera: number; senato: number }>();
  competitori.forEach((c, i) => {
    c.seggiCamera = camera.seggi[i];
    c.seggiSenato = senato.seggi[i];
    const pesi = c.listeConSeggi.map((l) => l.percentuale);
    const perListaCamera = ripartoResti(pesi, c.seggiCamera);
    const perListaSenato = ripartoResti(pesi, c.seggiSenato);
    c.listeConSeggi.forEach((l, j) => seggiListe.set(l.id, { camera: perListaCamera[j], senato: perListaSenato[j] }));
  });

  const votiUtiliConSeggi = competitori.reduce((a, c) => a + c.listeConSeggi.reduce((b, l) => b + l.percentuale, 0), 0);

  return {
    totaleVoti,
    competitori: [...competitori].sort((a, b) => b.seggiCamera - a.seggiCamera || b.votiTotali - a.votiTotali),
    liste: liste.map((lista) => {
      const s = stati.get(lista.id) ?? { stato: 'sotto-soglia' as const, competitore: null };
      const seggi = seggiListe.get(lista.id) ?? { camera: 0, senato: 0 };
      return { lista, ...s, seggiCamera: seggi.camera, seggiSenato: seggi.senato };
    }),
    premio: { motivo, vincitore: motivo === 'assegnato' ? primo.id : null },
    tettoCamera: camera.tetto,
    tettoSenato: senato.tetto,
    votiDispersi: totaleVoti > 0 ? ((totaleVoti - votiUtiliConSeggi) / totaleVoti) * 100 : 0,
    coalizioniSottoSoglia,
  };
}

/** Coordinate dei seggi di un emiciclo, ordinate da sinistra a destra. */
export function puntiEmiciclo(totale: number, righe: number): { x: number; y: number }[] {
  const raggi = Array.from({ length: righe }, (_, i) => 0.42 + (0.58 * i) / Math.max(1, righe - 1));
  const somma = raggi.reduce((a, b) => a + b, 0);
  const perRiga = raggi.map((r) => Math.floor((totale * r) / somma));
  for (let i = righe - 1, resto = totale - perRiga.reduce((a, b) => a + b, 0); resto > 0; i = (i - 1 + righe) % righe, resto--) {
    perRiga[i]++;
  }

  const punti: { x: number; y: number; angolo: number }[] = [];
  raggi.forEach((r, riga) => {
    const n = perRiga[riga];
    for (let k = 0; k < n; k++) {
      const angolo = n === 1 ? Math.PI / 2 : Math.PI * (1 - k / (n - 1));
      punti.push({ x: r * Math.cos(angolo), y: r * Math.sin(angolo), angolo });
    }
  });
  // Arrotondate: seno e coseno differiscono all'ultima cifra fra server e browser e romperebbero l'idratazione.
  const arrotonda = (n: number) => Math.round(n * 10000) / 10000;
  return punti.sort((a, b) => b.angolo - a.angolo).map(({ x, y }) => ({ x: arrotonda(x), y: arrotonda(y) }));
}

export interface Preset {
  id: string;
  nome: string;
  descrizione: string;
  fonte?: { citazione: string; url: string };
  coalizioni: Record<string, string>;
  liste: ListaInput[];
}

const GRIGIO = '#6b7280';

export function presetPolitiche2022(colori: Record<string, string>): Preset {
  const c = (id: string) => colori[id] ?? GRIGIO;
  return {
    id: 'politiche-2022',
    nome: 'Risultati 2022',
    descrizione: 'I voti delle liste alla Camera nel 2022, con le coalizioni di allora, riletti con le regole nuove.',
    fonte: {
      citazione: 'Sky TG24, risultati delle elezioni politiche 2022 alla Camera',
      url: 'https://tg24.sky.it/politica/2022/09/25/risultati-elezioni-politiche-2022',
    },
    coalizioni: { cdx: 'Centrodestra', csx: 'Centrosinistra', terza: 'Terza coalizione' },
    liste: [
      { id: 'fdi', nome: "Fratelli d'Italia", percentuale: 26, coalizione: 'cdx', colore: c('fdi') },
      { id: 'lega', nome: 'Lega', percentuale: 8.78, coalizione: 'cdx', colore: c('lega') },
      { id: 'fi', nome: 'Forza Italia', percentuale: 8.12, coalizione: 'cdx', colore: c('fi') },
      { id: 'noimoderati', nome: 'Noi Moderati', percentuale: 0.91, coalizione: 'cdx', colore: c('noimoderati') },
      { id: 'pd', nome: 'Partito Democratico', percentuale: 19.06, coalizione: 'csx', colore: c('pd') },
      { id: 'avs', nome: 'Alleanza Verdi e Sinistra', percentuale: 3.63, coalizione: 'csx', colore: c('avs') },
      { id: 'piueuropa', nome: '+Europa', percentuale: 2.83, coalizione: 'csx', colore: c('piueuropa') },
      { id: 'impegnocivico', nome: 'Impegno Civico', percentuale: 0.6, coalizione: 'csx', colore: GRIGIO },
      { id: 'm5s', nome: 'Movimento 5 Stelle', percentuale: 15.42, coalizione: null, colore: c('m5s') },
      { id: 'azione-iv', nome: 'Azione – Italia Viva', percentuale: 7.78, coalizione: null, colore: c('azione') },
      { id: 'altri', nome: 'Altre liste', percentuale: 6.87, coalizione: null, colore: '#374151', aggregato: true },
    ],
  };
}

export function presetPartitiDiOggi(partiti: { id: string; nome: string; colore: string }[]): Preset {
  return {
    id: 'partiti-oggi',
    nome: 'Partiti di oggi',
    descrizione: `I ${partiti.length} partiti del test, tutti a zero e senza coalizioni: scegli tu voti e alleanze.`,
    coalizioni: { a: 'Coalizione A', b: 'Coalizione B', c: 'Coalizione C' },
    liste: [
      ...partiti.map((p) => ({ id: p.id, nome: p.nome, percentuale: 0, coalizione: null, colore: p.colore })),
      { id: 'altri', nome: 'Altre liste', percentuale: 0, coalizione: null, colore: '#374151', aggregato: true },
    ],
  };
}

/** Arrotonda ai centesimi, la precisione dei campi del simulatore. */
export function centesimi(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Legge un numero scritto da una persona: accetta la virgola, rifiuta il resto. Null se non è un numero. */
export function leggiPercentuale(testo: string): number | null {
  const pulito = testo.trim().replace(',', '.');
  if (!/^\d{0,3}(\.\d*)?$/.test(pulito) || pulito === '' || pulito === '.') return null;
  return Math.min(100, Math.max(0, centesimi(Number.parseFloat(pulito))));
}

const somma = (liste: readonly ListaInput[]) => liste.reduce((a, l) => a + l.percentuale, 0);

/** Riporta il totale a 100 mantenendo le proporzioni fra le liste. */
export function portaACento(liste: readonly ListaInput[]): ListaInput[] {
  const totale = somma(liste);
  if (totale <= 0) return [...liste];
  const nuove = liste.map((l) => ({ ...l, percentuale: centesimi((l.percentuale * 100) / totale) }));
  // L'arrotondamento può lasciare qualche centesimo: va alla lista più grande.
  const scarto = centesimi(100 - somma(nuove));
  const maggiore = nuove.reduce((m, l, i) => (l.percentuale > nuove[m].percentuale ? i : m), 0);
  nuove[maggiore] = { ...nuove[maggiore], percentuale: centesimi(nuove[maggiore].percentuale + scarto) };
  return nuove;
}

/** Mette nelle "Altre liste" quello che manca per arrivare a 100. Senza "Altre liste" non cambia nulla. */
export function restoAdAltre(liste: readonly ListaInput[]): ListaInput[] {
  const altre = liste.find((l) => l.aggregato);
  if (!altre) return [...liste];
  const resto = centesimi(100 - somma(liste.filter((l) => l !== altre)));
  return liste.map((l) => (l === altre ? { ...l, percentuale: Math.max(0, resto) } : l));
}

export interface Scenario {
  preset: string;
  liste: ListaInput[];
  coalizioni: Record<string, string>;
  maggioranzeDiverse: boolean;
}

/**
 * Lo scenario nel frammento dell'indirizzo (#p=...&v.fdi=26&c.fdi=cdx...), per condividerlo con un link.
 * Il frammento non arriva mai al server: resta fra chi manda il link e chi lo apre.
 */
export function scenarioInFrammento(scenario: Scenario): string {
  const parametri = new URLSearchParams({ p: scenario.preset });
  for (const l of scenario.liste) {
    parametri.set(`v.${l.id}`, String(l.percentuale));
    if (l.coalizione) parametri.set(`c.${l.id}`, l.coalizione);
  }
  for (const [id, nome] of Object.entries(scenario.coalizioni)) parametri.set(`n.${id}`, nome);
  if (scenario.maggioranzeDiverse) parametri.set('d', '1');
  return parametri.toString();
}

/** Rilegge uno scenario sopra il suo preset. Ignora liste e coalizioni sconosciute; null se il preset non c'è. */
export function scenarioDaFrammento(frammento: string, preset: readonly Preset[]): Scenario | null {
  const parametri = new URLSearchParams(frammento.replace(/^#/, ''));
  const base = preset.find((p) => p.id === parametri.get('p'));
  if (!base) return null;

  const coalizioni = Object.fromEntries(
    Object.entries(base.coalizioni).map(([id, nome]) => [id, parametri.get(`n.${id}`)?.trim().slice(0, 40) || nome]),
  );
  const liste = base.liste.map((l) => {
    // Una lista che il link non nomina resta com'è nel preset.
    if (!parametri.has(`v.${l.id}`)) return l;
    const percentuale = leggiPercentuale(parametri.get(`v.${l.id}`) ?? '') ?? l.percentuale;
    const coalizione = parametri.get(`c.${l.id}`);
    return {
      ...l,
      percentuale,
      coalizione: l.aggregato ? null : coalizione && coalizione in coalizioni ? coalizione : null,
    };
  });
  return { preset: base.id, liste, coalizioni, maggioranzeDiverse: parametri.get('d') === '1' };
}

export const FONTI_LEGGE = [
  {
    citazione: 'Il Post, il Senato approva la legge elettorale (15 settembre 2026)',
    url: 'https://www.ilpost.it/2026/09/15/senato-approvazione-legge-elettorale/',
  },
  {
    citazione: 'ANSA, via libera del Senato alla legge elettorale con 113 sì (15 settembre 2026)',
    url: 'https://www.ansa.it/sito/notizie/politica/2026/09/15/via-libera-del-senato-alla-legge-elettorale-con-113-si_a398356e-998c-482f-a11d-a5256441e9f0.html',
  },
  {
    citazione: 'L’Espresso, cosa prevede la legge elettorale approvata dal Senato (15 settembre 2026)',
    url: 'https://lespresso.it/c/politica/2026/9/15/legge-elettorale-senato-meloni-cosa-prevede/64698',
  },
  {
    citazione: 'Il Fatto Quotidiano, premio di maggioranza, soglie e miglior perdente (11 settembre 2026)',
    url: 'https://www.ilfattoquotidiano.it/2026/09/11/legge-elettorale-premio-maggioranza-soglia-notizie/8503813/',
  },
  {
    citazione: 'Sky TG24, simulazione dei risultati con la nuova legge (15 settembre 2026)',
    url: 'https://tg24.sky.it/politica/2026/09/15/legge-elettorale-simulazione-risultati-elezioni',
  },
  {
    citazione: 'CISE LUISS, le simulazioni: maggioranze, preferenze e confronto con il Rosatellum (28 settembre 2026)',
    url: 'https://cise.luiss.it/2026/09/28/legge-elettorale-le-simulazioni-maggioranze-preferenze-e-il-confronto-con-il-rosatellum-lanalisi-per-coalizioni-e-partiti/',
  },
  {
    citazione: 'CISE LUISS, esempi di calcolo del premio (23 luglio 2026)',
    url: 'https://cise.luiss.it/2026/07/23/la-nuova-legge-elettorale-garantisce-davvero-stabilita-analisi-e-simulazioni-della-riforma-approvata-alla-camera/',
  },
  {
    citazione: 'Il Fatto Quotidiano, fiducia alla Camera e voto finale: le tappe (5 ottobre 2026)',
    url: 'https://www.ilfattoquotidiano.it/2026/10/05/legge-elettorale-rush-finale-camera-fiducia-voto-segreto-tappe-notizie/8527870/',
  },
];

export function formattaPercentuale(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}

/** Testi di interfaccia del simulatore, tenuti fuori dai componenti. */
export const TESTI_SIMULATORE = {
  etichetta: 'Simulatore',
  titolo: 'Simulatore della legge elettorale',
  descrizione:
    'Inserisci i voti di liste e coalizioni e guarda come diventano seggi con la nuova legge elettorale: premio di maggioranza al 42%, miglior perdente, soglie e tetti.',
  stato:
    'Regole del testo approvato dal Senato il 15 settembre 2026. La Camera lo esamina in terza lettura con la fiducia, voto finale previsto l’8 ottobre: il testo non dovrebbe più cambiare.',
  partiDa: 'Parti da',
  ricomincia: 'Ricomincia',
  ricominciaAria: (nome: string) => `Riporta i valori di partenza di “${nome}”`,
  liste: 'Liste e coalizioni',
  percentuale: 'Voti %',
  meno: (nome: string) => `Togli mezzo punto a ${nome}`,
  piu: (nome: string) => `Aggiungi mezzo punto a ${nome}`,
  coalizione: 'Coalizione',
  daSola: 'Da sola',
  totale: (t: number) => `Totale ${formattaPercentuale(t)}%`,
  totaleAvviso: 'Il totale non fa 100: i seggi si calcolano comunque in proporzione ai voti inseriti.',
  portaACento: 'Porta a 100 in proporzione',
  restoAdAltre: (n: string) => `Metti il ${n}% che manca in “Altre liste”`,
  nomiCoalizioni: 'Nomi delle coalizioni',
  nomeCoalizione: (n: number) => `Nome della coalizione ${n}`,
  maggioranzeDiverse: 'Voto diverso al Senato',
  maggioranzeDiverseNota:
    'Spunta se al Senato il primo non è lo stesso della Camera o resta sotto il 42%: il premio non si assegna in nessuna delle due Camere.',
  premio: {
    assegnato: (nome: string) => `Premio di maggioranza a ${nome}: +70 seggi alla Camera e +35 al Senato`,
    'nessuno-al-42': 'Nessuno raggiunge il 42%: i seggi si ripartiscono in modo proporzionale puro',
    pareggio: 'I primi due sono a pari voti: il premio non si assegna',
    'maggioranze-diverse': 'Vincitori diversi fra Camera e Senato: il premio non si assegna',
    'nessun-voto': 'Inserisci i voti per vedere i seggi',
  },
  tetto: (ramo: string, n: number) => `${ramo}: tetto raggiunto, il vincitore si ferma a ${n} seggi e l’eccedenza va agli altri`,
  camera: 'Camera',
  senato: 'Senato',
  vista: 'Emiciclo da mostrare',
  emiciclo: (ramo: string, voci: string) => `Emiciclo: ${ramo}. ${voci}`,
  stima: 'stima',
  voti: 'Voti',
  seggiDi: (nome: string) => `seggi di ${nome}`,
  maggioranza: (n: number, tot: number) => `maggioranza ${n} su ${tot}`,
  conMaggioranza: { camera: 'maggioranza alla Camera', senato: 'maggioranza al Senato' } satisfies Record<IdRamo, string>,
  senzaMaggioranza: 'Nessuno ha da solo la maggioranza: serve un accordo fra più forze',
  estero: 'Estero, non simulati',
  coalizioneDi: (nomi: string) => `con ${nomi}`,
  dispersi: (p: string) => `Voti a liste senza seggi: ${p}%`,
  coalizioniSottoSoglia: (nomi: string) => `${nomi}: sotto il 10%, le liste corrono da sole`,
  riepilogo: 'Riepilogo dei seggi alla Camera',
  vaiAlRisultato: 'Vedi il risultato',
  copiaLink: 'Copia il link a questo scenario',
  linkCopiato: 'Link copiato',
  linkNonCopiato: 'Copia non riuscita: usa l’indirizzo nella barra',
  stati: {
    'in-parlamento': 'entra in Parlamento',
    'miglior-perdente': 'miglior perdente: entra con la coalizione',
    'sotto-soglia': 'sotto soglia',
    'altre-liste': 'nessuna lista supera le soglie',
  } satisfies Record<StatoLista, string>,
  dettaglioListe: 'Il dettaglio lista per lista',
  regoleTitolo: 'Le regole che applichiamo',
  regole: [
    'Proporzionale senza collegi uninominali, tranne in Valle d’Aosta e Trentino-Alto Adige: 400 deputati, 8 eletti all’Estero; 200 senatori elettivi, 4 all’Estero. Si danno fino a tre preferenze, il capolista è bloccato.',
    'Soglie: 3% per le liste, 10% per le coalizioni che hanno almeno una lista al 3%. In ogni coalizione prende seggi anche il “miglior perdente”, la lista più votata fra quelle sotto il 3%.',
    'Premio: chi arriva primo con almeno il 42% dei voti validi, alla Camera e al Senato, ottiene 70 deputati e 35 senatori in più della sua quota proporzionale.',
    'Per il 42% e per il primo posto contano i voti di tutte le liste della coalizione, anche di quelle sotto il 3%: il Senato ha tolto la norma “anti-cespugli”.',
    'Tetti: il vincitore non supera 220 deputati e 113 senatori, esclusi gli eletti all’Estero; i seggi in eccesso vanno agli altri.',
    'Il premio va alla stessa coalizione nelle due Camere. Se nessuno arriva al 42%, o se le Camere danno vincitori diversi, vale il proporzionale puro. Il ballottaggio non c’è.',
  ],
  approssimazioniTitolo: 'Dove semplifichiamo',
  approssimazioni: [
    'Riparto nazionale con quozienti interi e resti più alti: prima fra coalizioni e liste singole, poi dentro ogni coalizione.',
    'I seggi di Trentino-Alto Adige e Valle d’Aosta, dove restano i collegi uninominali, sono stimati in proporzione ai voti nazionali.',
    'Il Senato nella realtà si ripartisce regione per regione: qui è una stima nazionale, che può scostarsi di qualche seggio.',
    'Gli stessi voti valgono per Camera e Senato. Un risultato diverso fra le due Camere si prova con l’opzione “Voto diverso al Senato”.',
    'Al Senato siedono anche i senatori a vita: con i 5 di oggi i senatori sono 205 e la maggioranza assoluta sale a 103. Qui contiamo i 200 eletti.',
    'I parlamentari eletti all’Estero non sono simulati.',
  ],
  verifica: 'Controllo automatico: una coalizione al 42% senza voti dispersi ottiene 135 + 70 = 205 deputati, come negli esempi del CISE.',
  fonti: 'Fonti sulla legge',
  fontePreset: 'Dati di partenza',
  collegamenti: { confronta: 'Confronta le posizioni dei partiti', test: 'Fai il test dei partiti' },
} as const;
