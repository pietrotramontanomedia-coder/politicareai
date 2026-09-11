/**
 * Scarica dai dati aperti della Camera (dati.camera.it) i voti dei deputati e prepara
 * i file del Fantaparlamento: giornate (sedute con voto) e listone (deputati e prezzi).
 *
 * Uso:
 *   node strumenti/camera-fanta.mjs giorni 20260101 20260910
 *   node strumenti/camera-fanta.mjs raccogli 20260601 20260910 > /tmp/grezzo.json
 *
 * L'endpoint SPARQL è fragile sulle aggregazioni grandi: si interroga un giorno per volta.
 */

const ENDPOINT = 'https://dati.camera.it/sparql';
const LEG = '<http://dati.camera.it/ocd/legislatura.rdf/repubblica_19>';
const PREFISSI = `
PREFIX ocd: <http://dati.camera.it/ocd/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
`;

export async function sparql(query, tentativi = 3) {
  const url = `${ENDPOINT}?${new URLSearchParams({ query, format: 'application/sparql-results+json' })}`;
  for (let i = 1; i <= tentativi; i++) {
    try {
      const risposta = await fetch(url, {
        headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'PoliticareBot/1.0' },
        signal: AbortSignal.timeout(180_000),
      });
      if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
      const dati = await risposta.json();
      return dati.results.bindings.map((riga) => Object.fromEntries(Object.entries(riga).map(([k, v]) => [k, v.value])));
    } catch (errore) {
      if (i === tentativi) throw errore;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  return [];
}

/** Giorni in cui l'Aula ha votato, nell'intervallo indicato (formato AAAAMMGG). */
export async function giorniDiVoto(dal, al) {
  const righe = await sparql(`${PREFISSI}
    SELECT DISTINCT ?data WHERE {
      ?v a ocd:votazione ; dc:date ?data ; ocd:rif_leg ${LEG} .
      FILTER(?data >= "${dal}" && ?data <= "${al}")
    } ORDER BY ?data`);
  return righe.map((r) => r.data);
}

/** Votazioni di un giorno, con i pesi (finale, fiducia, segreta). */
export async function votazioniDelGiorno(data) {
  const righe = await sparql(`${PREFISSI}
    SELECT DISTINCT ?vz ?desc ?finale ?fiducia ?segreta ?approvato WHERE {
      ?vz a ocd:votazione ; dc:date "${data}" ; dc:description ?desc ; ocd:rif_leg ${LEG} .
      OPTIONAL { ?vz ocd:votazioneFinale ?finale }
      OPTIONAL { ?vz ocd:richiestaFiducia ?fiducia }
      OPTIONAL { ?vz ocd:votazioneSegreta ?segreta }
      OPTIONAL { ?vz ocd:approvato ?approvato }
    }`);
  return righe.map((r) => ({
    id: r.vz,
    descrizione: r.desc,
    finale: r.finale === '1',
    fiducia: r.fiducia === '1',
    segreta: r.segreta === '1',
    approvata: r.approvato === '1',
  }));
}

/**
 * Come ha votato ogni deputato, una votazione per volta: l'endpoint tronca a 10.000 righe
 * e va in errore se gli si chiede di ordinare un giorno intero, mentre regge bene le richieste piccole.
 */
export async function votiDellaVotazione(idVotazione) {
  const righe = await sparql(`${PREFISSI}
    SELECT DISTINCT ?dep ?tipo WHERE {
      ?voto a ocd:voto ; ocd:rif_votazione <${idVotazione}> ; ocd:rif_deputato ?dep ; dc:type ?tipo .
    }`);
  return righe.map((r) => ({ votazione: idVotazione, deputato: r.dep, tipo: r.tipo }));
}

/** Esegue al massimo `quante` richieste per volta, per non stressare l'endpoint. */
async function aGruppi(elementi, quante, funzione) {
  const risultati = [];
  for (let i = 0; i < elementi.length; i += quante) {
    risultati.push(...(await Promise.all(elementi.slice(i, i + quante).map(funzione))));
  }
  return risultati;
}

export async function votiDelGiorno(votazioni) {
  const gruppi = await aGruppi(votazioni.map((v) => v.id), 4, votiDellaVotazione);
  return gruppi.flat();
}

/** Settimana parlamentare (ISO) a cui appartiene un giorno: è la "giornata" del gioco. */
export function giornataDi(data) {
  const d = new Date(Date.UTC(+data.slice(0, 4), +data.slice(4, 6) - 1, +data.slice(6, 8)));
  const giorno = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - giorno);
  const inizioAnno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const settimana = Math.ceil(((d - inizioAnno) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(settimana).padStart(2, '0')}`;
}

const ESPRESSI = new Set(['Favorevole', 'Contrario', 'Astensione', 'Ha votato']);
/** Il dissenso conta solo se il gruppo aveva una linea chiara: tanti votanti e larga concordia. */
const MINIMO_VOTANTI_GRUPPO = 10;
const CONCORDIA_MINIMA = 0.7;

/** "FRATELLI D'ITALIA (FDI) (18.10.2022 - ..." -> { nome: "Fratelli d'Italia", sigla: "FDI" } */
export function normalizzaGruppo(titolo) {
  const senzaDate = titolo.replace(/\s*\(\d{2}\.\d{2}\.\d{4}.*$/, '').trim();
  const sigla = senzaDate.match(/\(([^()]+)\)\s*$/)?.[1] ?? senzaDate;
  const nome = senzaDate.replace(/\s*\([^()]+\)\s*$/, '').trim();
  return { nome, sigla };
}

/** "http://dati.camera.it/ocd/deputato.rdf/d309220_19" -> "d309220_19": unico nella legislatura, e più leggero nel profilo. */
export const idCorto = (uri) => uri.slice(uri.lastIndexOf('/') + 1);

/**
 * Da sedute grezze a giornate: per ogni deputato conta voti espressi, voti pesati
 * (finali e fiducie valgono di più) e voti in dissenso dal proprio gruppo.
 */
export function componiGiornate(grezzo) {
  const adesioni = (grezzo.adesioni ?? []).map((a) => ({ ...a, deputato: idCorto(a.deputato) }));
  const gruppoDi = (deputato, data) => gruppoAllaData(adesioni, deputato, data);
  const giornate = new Map();

  for (const seduta of grezzo.sedute) {
    const chiave = giornataDi(seduta.data);
    if (!giornate.has(chiave)) {
      giornate.set(chiave, { id: chiave, giorni: [], votazioni: 0, finali: 0, fiducie: 0, deputati: new Map() });
    }
    const giornata = giornate.get(chiave);
    if (!giornata.giorni.includes(seduta.data)) giornata.giorni.push(seduta.data);

    const pesoDi = new Map(seduta.votazioni.map((v) => [v.id, v]));
    giornata.votazioni += seduta.votazioni.length;
    giornata.finali += seduta.votazioni.filter((v) => v.finale).length;
    giornata.fiducie += seduta.votazioni.filter((v) => v.fiducia).length;

    // Per ogni votazione, il voto prevalente di ciascun gruppo: serve a riconoscere il dissenso.
    const perVotazione = new Map();
    const voti = seduta.voti.map((v) => ({ ...v, deputato: idCorto(v.deputato) }));
    for (const voto of voti) {
      if (!ESPRESSI.has(voto.tipo)) continue;
      const gruppo = gruppoDi(voto.deputato, seduta.data);
      if (!gruppo) continue;
      if (!perVotazione.has(voto.votazione)) perVotazione.set(voto.votazione, new Map());
      const perGruppo = perVotazione.get(voto.votazione);
      if (!perGruppo.has(gruppo)) perGruppo.set(gruppo, new Map());
      const conteggi = perGruppo.get(gruppo);
      conteggi.set(voto.tipo, (conteggi.get(voto.tipo) ?? 0) + 1);
    }
    const prevalente = new Map();
    for (const [votazione, perGruppo] of perVotazione) {
      const scelte = new Map();
      for (const [gruppo, conteggi] of perGruppo) {
        const votanti = [...conteggi.values()].reduce((a, b) => a + b, 0);
        const [tipo, quanti] = [...conteggi.entries()].sort((a, b) => b[1] - a[1])[0];
        const misto = /^MISTO/i.test(gruppo);
        if (!misto && votanti >= MINIMO_VOTANTI_GRUPPO && quanti / votanti >= CONCORDIA_MINIMA) scelte.set(gruppo, tipo);
      }
      prevalente.set(votazione, scelte);
    }

    for (const voto of voti) {
      const stato = giornata.deputati.get(voto.deputato) ?? { espressi: 0, finali: 0, fiducie: 0, dissensi: 0 };
      if (ESPRESSI.has(voto.tipo)) {
        stato.espressi++;
        const votazione = pesoDi.get(voto.votazione);
        if (votazione?.finale) stato.finali++;
        if (votazione?.fiducia) stato.fiducie++;
        const gruppo = gruppoDi(voto.deputato, seduta.data);
        const scelta = gruppo ? prevalente.get(voto.votazione)?.get(gruppo) : undefined;
        // Il dissenso si conta solo nei voti palesi: nei segreti il gruppo non è osservabile.
        if (gruppo && scelta && scelta !== voto.tipo && !votazione?.segreta) stato.dissensi++;
      }
      giornata.deputati.set(voto.deputato, stato);
    }
  }

  return [...giornate.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((g) => ({ ...g, deputati: Object.fromEntries(g.deputati) }));
}

/**
 * Adesioni ai gruppi con le date: servono per sapere in che gruppo era un deputato
 * il giorno di ogni votazione. Chi cambia gruppo non deve risultare "in dissenso"
 * per i voti dati quando stava altrove.
 */
export async function adesioniAiGruppi() {
  const righe = await sparql(`${PREFISSI}
    SELECT DISTINCT ?dep ?cognome ?nome ?gruppo ?dal ?al WHERE {
      ?dep a ocd:deputato ; foaf:surname ?cognome ; foaf:firstName ?nome ; ocd:rif_leg ${LEG} ; ocd:aderisce ?ad .
      ?ad ocd:rif_gruppoParlamentare ?g ; ocd:startDate ?dal .
      ?g dc:title ?gruppo .
      OPTIONAL { ?ad ocd:endDate ?al }
    }`);
  return righe.map((r) => ({
    deputato: r.dep,
    cognome: r.cognome,
    nome: r.nome,
    gruppo: normalizzaGruppo(r.gruppo).nome,
    dal: r.dal,
    al: r.al ?? null,
  }));
}

/** Gruppo di un deputato in una certa data (AAAAMMGG). */
export function gruppoAllaData(adesioni, deputato, data) {
  const valide = adesioni.filter((a) => a.deputato === deputato && a.dal <= data && (!a.al || a.al >= data));
  return valide.sort((x, y) => y.dal.localeCompare(x.dal))[0]?.gruppo ?? null;
}

/** Deputati in carica, con il gruppo di oggi. */
export function deputatiDaAdesioni(adesioni) {
  const perDeputato = new Map();
  for (const a of adesioni.filter((x) => !x.al)) {
    const id = idCorto(a.deputato);
    const precedente = perDeputato.get(id);
    if (!precedente || precedente.dal < a.dal) {
      perDeputato.set(id, { id, cognome: a.cognome, nome: a.nome, gruppo: a.gruppo, dal: a.dal });
    }
  }
  return [...perDeputato.values()].map(({ dal: _dal, ...resto }) => resto);
}

async function principale() {
  const [comando, dal, al] = process.argv.slice(2);

  if (comando === 'giorni') {
    const giorni = await giorniDiVoto(dal, al);
    console.error(`${giorni.length} giorni con voto fra ${dal} e ${al}`);
    console.log(JSON.stringify(giorni));
    return;
  }

  if (comando === 'raccogli') {
    const giorni = await giorniDiVoto(dal, al);
    console.error(`${giorni.length} giorni da scaricare`);
    const adesioni = await adesioniAiGruppi();
    const deputati = deputatiDaAdesioni(adesioni);
    console.error(`${deputati.length} deputati in carica, ${adesioni.length} adesioni ai gruppi`);
    const sedute = [];
    for (const data of giorni) {
      const votazioni = await votazioniDelGiorno(data);
      const voti = await votiDelGiorno(votazioni);
      sedute.push({ data, votazioni, voti });
      console.error(`  ${data}: ${votazioni.length} votazioni, ${voti.length} voti`);
    }
    console.log(JSON.stringify({ scaricatoIl: new Date().toISOString(), dal, al, deputati, adesioni, sedute }));
    return;
  }

  if (comando === 'giornate') {
    const grezzo = JSON.parse(await (await import('node:fs/promises')).readFile(dal, 'utf8'));
    const giornate = componiGiornate(grezzo);
    console.error(`${giornate.length} giornate`);
    for (const g of giornate) {
      console.error(`  ${g.id}: giorni ${g.giorni.join(',')} · votazioni ${g.votazioni} (finali ${g.finali}, fiducie ${g.fiducie}) · deputati con voti ${Object.keys(g.deputati).length}`);
    }
    console.log(JSON.stringify({ generatoIl: new Date().toISOString(), deputati: grezzo.deputati, giornate }));
    return;
  }

  if (comando === 'riaggrega') {
    // Ricalcola le giornate su dati già scaricati, aggiornando solo le adesioni ai gruppi.
    const fs = await import('node:fs/promises');
    const grezzo = JSON.parse(await fs.readFile(dal, 'utf8'));
    grezzo.adesioni = await adesioniAiGruppi();
    grezzo.deputati = deputatiDaAdesioni(grezzo.adesioni);
    console.error(`${grezzo.deputati.length} deputati, ${grezzo.adesioni.length} adesioni`);
    const giornate = componiGiornate(grezzo);
    console.log(JSON.stringify({ generatoIl: new Date().toISOString(), deputati: grezzo.deputati, giornate }));
    return;
  }

  console.error('comandi: giorni <dal> <al> | raccogli <dal> <al> | giornate <file-grezzo>');
  process.exit(1);
}

import { pathToFileURL } from 'node:url';

// Confronto con pathToFileURL: il percorso del progetto contiene uno spazio, che nell'URL diventa %20.
if (import.meta.url === pathToFileURL(process.argv[1]).href) await principale();
