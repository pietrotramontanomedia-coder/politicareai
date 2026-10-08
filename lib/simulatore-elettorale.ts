/**
 * Simulatore della legge elettorale approvata in via definitiva l'8 ottobre 2026 (A.C. 2822-B).
 * Il calcolo sta in simulatore-motore.ts; qui ci sono preset, emiciclo e testi di interfaccia.
 * Regole e semplificazioni sono dichiarate in TESTI_SIMULATORE e nella pagina.
 */

import { LOCALI as LOCALI_ID, type ListaInput, type SeggiSpeciali, type StatoLista } from './simulatore-motore';

export * from './simulatore-motore';
export { REGIONI_SENATO } from './simulatore-regioni';

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
  /** Chi vince i seggi di Valle d'Aosta e Trentino-Alto Adige, se il preset lo sa. */
  speciali?: { camera?: SeggiSpeciali; senato?: SeggiSpeciali };
}

const GRIGIO = '#6b7280';

export function presetPolitiche2022(colori: Record<string, string>): Preset {
  const c = (id: string) => colori[id] ?? GRIGIO;
  return {
    id: 'politiche-2022',
    nome: 'Risultati 2022',
    descrizione:
      'I voti delle liste alla Camera nel 2022, con le coalizioni di allora, riletti con le regole nuove. In Valle d’Aosta e Trentino-Alto Adige i seggi vanno a chi li ha vinti nel 2022.',
    fonte: {
      citazione: 'Ministero dell’Interno, Eligendo: politiche 2022, Camera, Italia',
      url: 'https://elezionistorico.interno.gov.it/index.php?tpel=C&dtel=25/09/2022&tpa=I&tpe=A&lev0=0&levsut0=0&es0=S&ms=S',
    },
    coalizioni: { cdx: 'Centrodestra', csx: 'Centrosinistra', terza: 'Terza coalizione' },
    liste: [
      { id: 'fdi', nome: "Fratelli d'Italia", percentuale: 25.98, coalizione: 'cdx', colore: c('fdi') },
      { id: 'lega', nome: 'Lega', percentuale: 8.79, coalizione: 'cdx', colore: c('lega') },
      { id: 'fi', nome: 'Forza Italia', percentuale: 8.11, coalizione: 'cdx', colore: c('fi') },
      { id: 'noimoderati', nome: 'Noi Moderati', percentuale: 0.9, coalizione: 'cdx', colore: c('noimoderati') },
      { id: 'pd', nome: 'Partito Democratico', percentuale: 19.04, coalizione: 'csx', colore: c('pd') },
      { id: 'avs', nome: 'Alleanza Verdi e Sinistra', percentuale: 3.64, coalizione: 'csx', colore: c('avs') },
      { id: 'piueuropa', nome: '+Europa', percentuale: 2.83, coalizione: 'csx', colore: c('piueuropa') },
      { id: 'impegnocivico', nome: 'Impegno Civico', percentuale: 0.62, coalizione: 'csx', colore: GRIGIO },
      { id: 'm5s', nome: 'Movimento 5 Stelle', percentuale: 15.43, coalizione: null, colore: c('m5s') },
      { id: 'azione-iv', nome: 'Azione – Italia Viva', percentuale: 7.78, coalizione: null, colore: c('azione') },
      { id: 'altri', nome: 'Altre liste', percentuale: 6.86, coalizione: null, colore: '#374151', aggregato: true },
    ],
    // 2022: Camera, Valle d'Aosta a un autonomista, Trentino-Alto Adige 2 collegi al centrodestra e 2 a SVP-PATT,
    // proporzionale 1 a FdI, 1 al PD, 1 a SVP-PATT. Senato: Valle d'Aosta al centrodestra, Trentino-Alto Adige
    // 2 al centrodestra, 2 al centrosinistra, 2 a SVP-PATT (docs/dati-politiche-2022-regioni.json).
    speciali: { camera: { cdx: 3, csx: 1, [LOCALI_ID]: 4 }, senato: { cdx: 3, csx: 2, [LOCALI_ID]: 2 } },
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

export const FONTI_LEGGE = [
  {
    citazione: 'Camera dei deputati, testo A.C. 2822-B approvato in via definitiva l’8 ottobre 2026',
    url: 'https://documenti.camera.it/apps/commonServices/getDocumento.ashx?sezione=lavori&tipoDoc=testo_pdl_pdf&idlegislatura=19&codice=leg.19.pdl.camera.2822.19PDL0213710',
  },
  {
    citazione: 'Servizi Studi di Camera e Senato, dossier n. 666/4 sulla riforma (16 settembre 2026)',
    url: 'https://documenti.camera.it/leg19/dossier/Pdf/AC0469f.pdf',
  },
  {
    citazione: 'Testo a fronte tra norme vigenti e testo approvato (dossier n. 666/4)',
    url: 'https://documenti.camera.it/leg19/dossier/Pdf/AC0469g.pdf',
  },
  {
    citazione: 'Camera dei deputati, comunicato sull’approvazione definitiva (227 sì, 164 no)',
    url: 'https://comunicazione.camera.it/archivio-prima-pagina/19-62971',
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
    'Inserisci i voti di liste e coalizioni e guarda come diventano seggi con la nuova legge elettorale: premio di maggioranza al 42%, soglie, tetti e Senato regione per regione.',
  stato: 'Regole della legge approvata in via definitiva l’8 ottobre 2026 (A.C. 2822-B). In attesa della pubblicazione in Gazzetta Ufficiale.',
  partiDa: 'Parti da',
  liste: 'Liste e coalizioni',
  percentuale: 'Voti %',
  coalizione: 'Coalizione',
  daSola: 'Da sola',
  totale: (t: number) => `Totale ${formattaPercentuale(t)}%`,
  totaleAvviso: 'Il totale non fa 100: i seggi si calcolano comunque in proporzione ai voti inseriti.',
  maggioranzeDiverse: 'Al Senato arriva prima un’altra coalizione',
  maggioranzeDiverseNota: 'Il premio spetta solo a chi arriva primo con almeno il 42% in tutte e due le Camere. Se il primo è diverso, niente premio in nessuna delle due.',
  premio: {
    assegnato: (nome: string) => `Premio di maggioranza a ${nome}: +70 seggi alla Camera e +35 al Senato`,
    'nessuno-al-42': 'Nessuno raggiunge il 42%: i seggi si ripartiscono in modo proporzionale',
    pareggio: 'I primi due sono a pari voti: la legge non dice chi vince, qui il premio non si assegna',
    'maggioranze-diverse': 'Primo diverso fra Camera e Senato: il premio non si assegna in nessuna delle due',
    'nessun-voto': 'Inserisci i voti per vedere i seggi',
  },
  tetto: (ramo: string, n: number) => `${ramo}: tetto raggiunto, il vincitore si ferma a ${n} seggi e gli altri si dividono l’eccedenza`,
  correzioniSenato: (n: number) => `Senato: ${n} ${n === 1 ? 'seggio tolto' : 'seggi tolti'} al vincitore nelle regioni con i resti più bassi e ${n === 1 ? 'dato' : 'dati'} ai perdenti della stessa regione`,
  camera: 'Camera',
  senato: 'Senato',
  stima: 'stima regionale',
  votiUtili: 'Voti',
  maggioranza: (n: number, tot: number) => `maggioranza ${n} su ${tot}`,
  conMaggioranza: 'ha la maggioranza',
  maggioranzaSenato: 'maggioranza anche al Senato',
  estero: 'Estero, non simulati',
  coalizioneDi: (nomi: string) => `con ${nomi}`,
  composizione: (prop: number, premio: number, speciali: number) =>
    [`${prop} proporzionali`, premio ? `${premio} di premio` : '', speciali ? `${speciali} in Valle d’Aosta e Trentino-Alto Adige` : ''].filter(Boolean).join(' + '),
  dispersi: (p: string) => `Voti a liste senza seggi alla Camera: ${p}%`,
  coalizioniSottoSoglia: (nomi: string) => `${nomi}: sotto il 10%, le liste corrono da sole`,
  stati: {
    'in-parlamento': 'entra in Parlamento',
    'miglior-perdente': 'miglior perdente: sotto il 3% ma partecipa al riparto della coalizione',
    'sotto-soglia': 'sotto soglia',
    'altre-liste': 'nessuna lista supera le soglie',
  } satisfies Record<StatoLista, string>,
  statoSenatoDiverso: 'al Senato entra con il 20% in una regione',
  dettaglioListe: 'Il dettaglio lista per lista',
  dettaglioListeNota: 'Seggi proporzionali di ogni lista. I seggi di premio vanno ai listini della coalizione, quelli di Valle d’Aosta e Trentino-Alto Adige ai vincitori dei collegi.',
  premioListino: 'Premio (listini di coalizione)',
  specialiTitolo: 'Valle d’Aosta e Trentino-Alto Adige',
  specialiNota:
    'Qui si vota con collegi a parte: alla Camera 1 collegio in Valle d’Aosta, 4 collegi e 3 seggi proporzionali in Trentino-Alto Adige; al Senato 1 e 6 collegi. Scegli tu chi li vince. Contano per il tetto del vincitore.',
  specialiLocali: 'Liste locali (es. SVP, autonomisti)',
  regioniTitolo: 'Il Senato regione per regione',
  regioniNota:
    'Stima: i voti nazionali sono distribuiti nelle regioni con la geografia del voto 2022 al Senato. I seggi per regione sono quelli del dossier ufficiale (censimento 2021).',
  regione: 'Regione',
  seggiRegione: 'Seggi',
  regoleTitolo: 'Le regole che applichiamo',
  regole: [
    'Camera: 400 deputati, 8 all’Estero. In Italia 384 seggi si dividono su base nazionale, 8 si votano a parte in Valle d’Aosta e Trentino-Alto Adige (art. 2 e 3 del testo unico Camera).',
    'Senato: 200 senatori, 4 all’Estero. 189 seggi si dividono regione per regione, 7 sono collegi in Valle d’Aosta e Trentino-Alto Adige (art. 1 del testo unico Senato).',
    'Soglie: 3% per le liste, 10% per le coalizioni con almeno una lista al 3%. Al Senato una lista supera lo sbarramento anche con il 20% in una regione (art. 83, c. 1, lett. e, Camera; art. 16-bis, c. 1, lett. e, Senato).',
    'I voti di una coalizione sono la somma di tutte le sue liste, anche le più piccole (art. 83, c. 1, lett. c). Partecipano ai seggi le liste al 3% e la prima lista sotto il 3%, il «miglior perdente» (nn. 2-bis e 2-ter).',
    'Premio: chi arriva primo con almeno il 42% in tutte e due le Camere ottiene 70 seggi alla Camera e 35 al Senato, che si aggiungono a 314 e 154 seggi proporzionali. Altrimenti si divide tutto in proporzione. Non c’è ballottaggio.',
    'Tetti: il vincitore non supera 220 deputati e 113 senatori, Valle d’Aosta e Trentino-Alto Adige compresi. Alla Camera il vincitore si ferma a 150 seggi proporzionali meno quelli vinti nei collegi a parte. Al Senato si tolgono seggi nelle regioni dove il vincitore li ha presi con i resti più bassi (art. 83, c. 1-ter; art. 16-bis, c. 1-ter).',
    'Riparto con quozienti interi e resti più alti, come prevede la legge. Dentro la coalizione i seggi si dividono tra le liste con lo stesso metodo; al Senato regione per regione.',
  ],
  approssimazioniTitolo: 'Dove stimiamo',
  approssimazioni: [
    'Il Senato si calcola regione per regione, ma tu inserisci voti nazionali: li distribuiamo nelle regioni con la geografia del voto 2022. È una stima, non un risultato.',
    'Alla Camera la legge toglie dal riparto i voti di Valle d’Aosta e Trentino-Alto Adige (circa il 2% del totale): qui usiamo le percentuali nazionali.',
    'Chi vince i seggi di Valle d’Aosta e Trentino-Alto Adige lo scegli tu. Le liste delle minoranze linguistiche non sono simulate.',
    'Usiamo gli stessi voti per Camera e Senato. Se vuoi un primo diverso al Senato, usa l’opzione apposita.',
    'A parità di resti la legge prevede il sorteggio: qui vince chi è in alto nell’elenco. A pari voti per il primo posto la legge non dice nulla: qui il premio non si assegna.',
    'I seggi di premio per regione sono quelli calcolati dal dossier sul censimento 2021: quelli veri li fisserà il decreto di convocazione delle elezioni.',
    'I parlamentari eletti all’Estero non sono simulati.',
  ],
  verifica: 'Controllo automatico: senza voti dispersi una coalizione al 42% ottiene 132 + 70 = 202 deputati, come nel calcolo del dossier ufficiale.',
  fonti: 'Fonti sulla legge',
  fontePreset: 'Dati di partenza',
  collegamenti: { confronta: 'Confronta le posizioni dei partiti', test: 'Fai il test dei partiti' },
} as const;
