/**
 * Simulatore della legge elettorale approvata alla Camera il 16 luglio 2026.
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
  tetto: number;
  estero: number;
  totale: number;
  maggioranza: number;
}

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
  /** Voti utili: liste sopra soglia più, per le coalizioni, il miglior perdente. */
  voti: number;
  /** Quota sui voti validi, in percentuale. */
  quota: number;
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

    const sotto = reali.filter((l) => l.percentuale < sogliaLista && l.percentuale > 0).sort((a, b) => b.percentuale - a.percentuale);
    const migliorPerdente = sotto[0];
    const voti = sopra.reduce((a, l) => a + l.percentuale, 0) + (migliorPerdente?.percentuale ?? 0);
    const principale = [...sopra].sort((a, b) => b.percentuale - a.percentuale)[0];

    competitori.push({
      id,
      nome: opzioni.coalizioni[id] ?? id,
      tipo: 'coalizione',
      colore: principale.colore,
      voti,
      quota: 0,
      listeConSeggi: sopra,
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
      competitori.push({ id: l.id, nome: l.nome, tipo: 'lista', colore: l.colore, voti: l.percentuale, quota: 0, listeConSeggi: [l], seggiCamera: 0, seggiSenato: 0 });
      stati.set(l.id, { stato: 'in-parlamento', competitore: l.id });
    } else {
      stati.set(l.id, { stato: 'sotto-soglia', competitore: null });
    }
  }

  for (const c of competitori) c.quota = totaleVoti > 0 ? (c.voti / totaleVoti) * 100 : 0;

  // Premio: a chi arriva primo con almeno il 42% dei voti validi, in entrambe le Camere.
  const ordinati = [...competitori].sort((a, b) => b.voti - a.voti);
  const [primo, secondo] = ordinati;
  let motivo: MotivoPremio;
  if (!primo || totaleVoti <= 0) motivo = 'nessun-voto';
  else if (primo.quota < sogliaPremio) motivo = 'nessuno-al-42';
  else if (secondo && Math.abs(secondo.voti - primo.voti) < 1e-9) motivo = 'pareggio';
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
    competitori: [...competitori].sort((a, b) => b.seggiCamera - a.seggiCamera || b.voti - a.voti),
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
    descrizione: 'Gli 11 partiti del test, tutti a zero e senza coalizioni: scegli tu voti e alleanze.',
    coalizioni: { a: 'Coalizione A', b: 'Coalizione B', c: 'Coalizione C' },
    liste: [
      ...partiti.map((p) => ({ id: p.id, nome: p.nome, percentuale: 0, coalizione: null, colore: p.colore })),
      { id: 'altri', nome: 'Altre liste', percentuale: 0, coalizione: null, colore: '#374151', aggregato: true },
    ],
  };
}

export const FONTI_LEGGE = [
  {
    citazione: 'CISE LUISS, analisi e simulazioni della riforma approvata alla Camera (23 luglio 2026)',
    url: 'https://cise.luiss.it/2026/07/23/la-nuova-legge-elettorale-garantisce-davvero-stabilita-analisi-e-simulazioni-della-riforma-approvata-alla-camera/',
  },
  {
    citazione: 'AGI, Cosa prevede la nuova legge elettorale (16 luglio 2026)',
    url: 'https://www.agi.it/politica/news/2026-07-16/legge-elettorale-cosa-prevede-38066645/',
  },
  {
    citazione: 'lavoce.info, La nuova legge elettorale a metà del guado',
    url: 'https://lavoce.info/archives/111986/la-nuova-legge-elettorale-a-meta-del-guado/',
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
    'Inserisci i voti di liste e coalizioni e guarda come diventano seggi con la nuova legge elettorale: premio di maggioranza al 42%, soglie e tetti.',
  stato: 'Regole del testo approvato dalla Camera il 16 luglio 2026, all’esame del Senato: possono ancora cambiare.',
  partiDa: 'Parti da',
  liste: 'Liste e coalizioni',
  percentuale: 'Voti %',
  coalizione: 'Coalizione',
  daSola: 'Da sola',
  totale: (t: number) => `Totale ${formattaPercentuale(t)}%`,
  totaleAvviso: 'Il totale non fa 100: i seggi si calcolano comunque in proporzione ai voti inseriti.',
  maggioranzeDiverse: 'Al Senato arriva prima un’altra coalizione',
  maggioranzeDiverseNota: 'Il premio spetta solo a chi arriva primo con almeno il 42% in entrambe le Camere.',
  premio: {
    assegnato: (nome: string) => `Premio di maggioranza a ${nome}: +70 seggi alla Camera e +35 al Senato`,
    'nessuno-al-42': 'Nessuno raggiunge il 42%: i seggi si ripartiscono in modo proporzionale puro',
    pareggio: 'I primi due sono a pari voti: il premio non si assegna',
    'maggioranze-diverse': 'Maggioranze diverse fra Camera e Senato: il premio non si assegna',
    'nessun-voto': 'Inserisci i voti per vedere i seggi',
  },
  tetto: (ramo: string, n: number) => `${ramo}: tetto raggiunto, il vincitore si ferma a ${n} seggi e l’eccedenza va agli altri`,
  camera: 'Camera',
  senato: 'Senato',
  stima: 'stima',
  votiUtili: 'Voti utili',
  maggioranza: (n: number, tot: number) => `maggioranza ${n} su ${tot}`,
  conMaggioranza: 'ha la maggioranza',
  estero: 'Estero, non simulati',
  coalizioneDi: (nomi: string) => `con ${nomi}`,
  dispersi: (p: string) => `Voti a liste senza seggi: ${p}%`,
  coalizioniSottoSoglia: (nomi: string) => `${nomi}: sotto il 10%, le liste corrono da sole`,
  stati: {
    'in-parlamento': 'entra in Parlamento',
    'miglior-perdente': 'miglior perdente: i voti contano per la coalizione, nessun seggio',
    'sotto-soglia': 'sotto soglia',
    'altre-liste': 'nessuna lista supera le soglie',
  } satisfies Record<StatoLista, string>,
  dettaglioListe: 'Il dettaglio lista per lista',
  regoleTitolo: 'Le regole che applichiamo',
  regole: [
    'Proporzionale senza collegi uninominali: 400 deputati, 8 dei quali eletti all’Estero; 200 senatori, 4 all’Estero.',
    'Soglie: 3% per le liste, 10% per le coalizioni che hanno almeno una lista al 3%. Per ogni coalizione contano anche i voti del “miglior perdente”, la prima lista sotto il 3%.',
    'Premio: chi arriva primo con almeno il 42% dei voti validi in entrambe le Camere ottiene 70 seggi alla Camera e 35 al Senato, in aggiunta alla sua quota proporzionale.',
    'Tetti: il vincitore non supera 220 seggi alla Camera e 113 al Senato; i seggi in eccesso vanno alle altre liste.',
    'Se nessuno arriva al 42%, o se le due Camere danno maggioranze diverse, vale il proporzionale puro. Il ballottaggio non c’è più.',
  ],
  approssimazioniTitolo: 'Dove semplifichiamo',
  approssimazioni: [
    'Riparto con quozienti interi e resti più alti su base nazionale: le fonti consultate non indicano il metodo.',
    'Il Senato nella realtà si ripartisce su base regionale: qui è una stima nazionale.',
    'Il miglior perdente conta nei voti della coalizione ma non riceve seggi.',
    'Le fonti non concordano sul peso di Trentino-Alto Adige e Valle d’Aosta: seguiamo il CISE, secondo cui nella realtà il vincitore può arrivare fino a 228 deputati.',
    'I parlamentari eletti all’Estero non sono simulati.',
  ],
  verifica: 'Controllo automatico: una coalizione al 42% ottiene 205 deputati, come nell’esempio del CISE.',
  fonti: 'Fonti sulla legge',
  fontePreset: 'Dati di partenza',
  collegamenti: { confronta: 'Confronta le posizioni dei partiti', test: 'Fai il test dei partiti' },
} as const;
