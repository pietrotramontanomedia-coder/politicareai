import crypto from 'node:crypto';
import http from 'node:http';
import postgres from 'postgres';

/*
 * L'archivio di Politicare sul nostro server: file (JSON e immagini) in PostgreSQL, con le stesse
 * operazioni che l'app usava su Vercel Blob. Ogni file ha un ETag; le scritture possono essere
 * condizionate (If-Match: solo se nessuno ha scritto dopo; If-None-Match: * solo se non esiste),
 * così due persone che salvano insieme non si cancellano a vicenda.
 *
 * Niente si cancella: non c'è nessuna operazione di cancellazione, e quando un file sotto
 * redazione/ viene sovrascritto la versione precedente finisce in oggetti_storico.
 *
 *   GET  /salute                         senza chiave, per il controllo del container
 *   HEAD /o/<percorso>                   metadati (ETag, tipo, dimensione)
 *   GET  /o/<percorso>                   contenuto; con If-None-Match uguale all'ETag → 304
 *   PUT  /o/<percorso>                   scrive; If-Match / If-None-Match: * → 412 se non vale
 *   GET  /lista?prefisso=&dopo=&limite=  elenco per prefisso, a pagine
 *
 * Ogni richiesta (tranne /salute) vuole Authorization: Bearer <ARCHIVIO_TOKEN>.
 */

const PORTA = Number(process.env.PORTA ?? 8090);
const TOKEN = process.env.ARCHIVIO_TOKEN ?? '';
const LIMITE_BYTE = 25 * 1024 * 1024;
const PERCORSO_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._\-/]{0,400}$/;
const CON_STORICO = ['redazione/'];

if (TOKEN.length < 32) {
  console.error('ARCHIVIO_TOKEN mancante o troppo corto (almeno 32 caratteri)');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: Number(process.env.PG_CONNESSIONI ?? 10), idle_timeout: 60 });

await sql`
  create table if not exists oggetti (
    percorso text collate "C" primary key,
    dati bytea not null,
    tipo text not null,
    etag text not null,
    dimensione integer not null,
    creato timestamptz not null default now(),
    aggiornato timestamptz not null default now()
  )`;
await sql`
  create table if not exists oggetti_storico (
    id bigserial primary key,
    percorso text collate "C" not null,
    dati bytea not null,
    tipo text not null,
    etag text not null,
    aggiornato timestamptz not null,
    sostituito timestamptz not null default now()
  )`;
await sql`create index if not exists oggetti_storico_percorso on oggetti_storico (percorso)`;

function nuovoEtag() {
  return `"${crypto.randomBytes(16).toString('hex')}"`;
}

function autorizzato(richiesta) {
  const atteso = Buffer.from(`Bearer ${TOKEN}`);
  const dato = Buffer.from(richiesta.headers.authorization ?? '');
  return dato.length === atteso.length && crypto.timingSafeEqual(dato, atteso);
}

function rispondi(risposta, stato, corpo, intestazioni = {}) {
  const testo = corpo === undefined ? '' : JSON.stringify(corpo);
  risposta.writeHead(stato, { 'content-type': 'application/json', 'cache-control': 'no-store', ...intestazioni });
  risposta.end(testo);
}

function percorsoDa(url) {
  let percorso;
  try {
    percorso = decodeURIComponent(url.pathname.slice('/o/'.length));
  } catch {
    return null;
  }
  if (!PERCORSO_VALIDO.test(percorso) || percorso.includes('..') || percorso.includes('//')) return null;
  return percorso;
}

function leggiCorpo(richiesta) {
  return new Promise((risolvi, rifiuta) => {
    const pezzi = [];
    let totale = 0;
    richiesta.on('data', (pezzo) => {
      totale += pezzo.length;
      if (totale > LIMITE_BYTE) {
        rifiuta(Object.assign(new Error('troppo grande'), { stato: 413 }));
        richiesta.destroy();
        return;
      }
      pezzi.push(pezzo);
    });
    richiesta.on('end', () => risolvi(Buffer.concat(pezzi)));
    richiesta.on('error', rifiuta);
  });
}

function intestazioniMeta(riga) {
  return {
    etag: riga.etag,
    'content-type': riga.tipo,
    'content-length': String(riga.dimensione),
    'last-modified': new Date(riga.aggiornato).toUTCString(),
    'x-aggiornato': new Date(riga.aggiornato).toISOString(),
    'cache-control': 'no-store',
  };
}

async function leggi(richiesta, risposta, percorso) {
  const soloMeta = richiesta.method === 'HEAD';
  const [riga] = soloMeta
    ? await sql`select tipo, etag, dimensione, aggiornato from oggetti where percorso = ${percorso}`
    : await sql`select dati, tipo, etag, dimensione, aggiornato from oggetti where percorso = ${percorso}`;
  if (!riga) return rispondi(risposta, 404, soloMeta ? undefined : { errore: 'non trovato' });
  if (!soloMeta && richiesta.headers['if-none-match'] === riga.etag) {
    risposta.writeHead(304, { etag: riga.etag, 'content-type': riga.tipo, 'cache-control': 'no-store' });
    return risposta.end();
  }
  risposta.writeHead(200, intestazioniMeta(riga));
  risposta.end(soloMeta ? undefined : riga.dati);
}

async function scrivi(richiesta, risposta, percorso) {
  const dati = await leggiCorpo(richiesta);
  const tipo = richiesta.headers['content-type'] || 'application/octet-stream';
  const seUguale = richiesta.headers['if-match'];
  const soloNuovo = richiesta.headers['if-none-match'] === '*';
  const etag = nuovoEtag();
  const storico = CON_STORICO.some((p) => percorso.startsWith(p));

  const esito = await sql.begin(async (tx) => {
    if (soloNuovo) {
      const righe = await tx`
        insert into oggetti (percorso, dati, tipo, etag, dimensione)
        values (${percorso}, ${dati}, ${tipo}, ${etag}, ${dati.length})
        on conflict (percorso) do nothing
        returning etag`;
      return righe.length ? etag : null;
    }
    const [attuale] = await tx`select etag from oggetti where percorso = ${percorso} for update`;
    if (seUguale && (!attuale || attuale.etag !== seUguale)) return null;
    if (attuale) {
      if (storico) {
        await tx`
          insert into oggetti_storico (percorso, dati, tipo, etag, aggiornato)
          select percorso, dati, tipo, etag, aggiornato from oggetti where percorso = ${percorso}`;
      }
      await tx`
        update oggetti set dati = ${dati}, tipo = ${tipo}, etag = ${etag}, dimensione = ${dati.length}, aggiornato = now()
        where percorso = ${percorso}`;
    } else {
      await tx`
        insert into oggetti (percorso, dati, tipo, etag, dimensione)
        values (${percorso}, ${dati}, ${tipo}, ${etag}, ${dati.length})`;
    }
    return etag;
  });

  if (!esito) return rispondi(risposta, 412, { errore: 'il file è cambiato o esiste già' });
  rispondi(risposta, 200, { percorso, etag: esito, dimensione: dati.length });
}

async function elenca(risposta, url) {
  const prefisso = url.searchParams.get('prefisso') ?? '';
  const dopo = url.searchParams.get('dopo') ?? '';
  const limite = Math.min(Math.max(Number(url.searchParams.get('limite')) || 1000, 1), 1000);
  const righe = await sql`
    select percorso, tipo, etag, dimensione, aggiornato from oggetti
    where starts_with(percorso, ${prefisso}) and percorso > ${dopo}
    order by percorso
    limit ${limite + 1}`;
  const pagina = righe.slice(0, limite);
  rispondi(risposta, 200, {
    oggetti: pagina.map((r) => ({ percorso: r.percorso, tipo: r.tipo, etag: r.etag, dimensione: r.dimensione, aggiornato: r.aggiornato })),
    dopo: righe.length > limite ? pagina[pagina.length - 1].percorso : null,
  });
}

const server = http.createServer(async (richiesta, risposta) => {
  const url = new URL(richiesta.url ?? '/', 'http://archivio');
  try {
    if (url.pathname === '/salute') {
      await sql`select 1`;
      return rispondi(risposta, 200, { ok: true });
    }
    if (!autorizzato(richiesta)) return rispondi(risposta, 401, { errore: 'chiave mancante o sbagliata' });
    if (url.pathname === '/lista' && richiesta.method === 'GET') return await elenca(risposta, url);
    if (url.pathname.startsWith('/o/')) {
      const percorso = percorsoDa(url);
      if (!percorso) return rispondi(risposta, 400, { errore: 'percorso non valido' });
      if (richiesta.method === 'GET' || richiesta.method === 'HEAD') return await leggi(richiesta, risposta, percorso);
      if (richiesta.method === 'PUT') return await scrivi(richiesta, risposta, percorso);
    }
    rispondi(risposta, 404, { errore: 'niente qui' });
  } catch (errore) {
    console.error(richiesta.method, url.pathname, errore);
    if (!risposta.headersSent) rispondi(risposta, errore.stato ?? 500, { errore: errore.stato ? errore.message : 'errore interno' });
  }
});

server.listen(PORTA, () => console.log(`archivio in ascolto sulla porta ${PORTA}`));

for (const segnale of ['SIGTERM', 'SIGINT']) {
  process.on(segnale, () => {
    server.close();
    sql.end({ timeout: 5 }).finally(() => process.exit(0));
  });
}
