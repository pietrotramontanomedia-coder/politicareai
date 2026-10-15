#!/usr/bin/env node
/**
 * Copia il vecchio store Vercel Blob (sospeso dal 14/10/2026) nell'archivio nostro su PostgreSQL.
 *
 *   node strumenti/migra-blob.mjs prova [prefisso]   elenca cosa copierebbe: non scarica e non scrive niente
 *   node strumenti/migra-blob.mjs copia [prefisso]   copia i file che nell'archivio nostro mancano
 *
 * Scrive solo dove il file manca (If-None-Match: *): non sovrascrive e non cancella niente, né qui né
 * su Vercel. Un file già presente nell'archivio nostro resta com'è; se è diverso da quello del
 * vecchio store lo segnala, e si decide a mano. Si può lanciare più volte: riprende da dove manca.
 *
 * Legge BLOB_READ_WRITE_TOKEN, ARCHIVIO_URL e ARCHIVIO_TOKEN da .env.local (o dall'ambiente).
 * Dopo la copia: riallineare l'indice (vedi docs/REDAZIONE.md, «Recupero dal vecchio store»).
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { BlobPreconditionFailedError, get, list } from '@vercel/blob';
import { metadatiOggetto, scriviOggetto } from '../lib/archivio-nostro.ts';

/** Prima quello che serve al portale, poi il resto: se lo store si richiude a metà, l'essenziale c'è. */
export const PRIORITA = ['redazione/contenuti/', 'redazione/media/', 'redazione/impostazioni/', 'redazione/indice.json', 'redazione/', 'radar/', 'instagram/'];

const PARALLELE = 4;

export function ordina(voci) {
  const peso = (p) => {
    const i = PRIORITA.findIndex((prefisso) => p.startsWith(prefisso));
    return i === -1 ? PRIORITA.length : i;
  };
  return [...voci].sort((a, b) => peso(a.pathname) - peso(b.pathname) || a.pathname.localeCompare(b.pathname));
}

/** Lo store rifiuta il download (403 o sospeso): inutile continuare con gli altri file. */
export function storeNonLeggibile(errore) {
  return errore instanceof Error && /\b403\b|suspended|forbidden/i.test(errore.message);
}

/**
 * La copia vera e propria, con le due parti passate da fuori (così si prova senza rete).
 *   blob:     elenca(prefisso) → [{ pathname, size, url }]; scarica(voce) → { corpo: Uint8Array, contentType }
 *   archivio: metadati(percorso) → { size } | null; scriviSeManca(percorso, corpo, tipo) → true se scritto, false se c'era già
 */
export async function migra({ blob, archivio, prova = false, prefisso = '', log = console.log }) {
  const voci = ordina(await blob.elenca(prefisso));
  const esito = { totale: voci.length, daCopiare: [], copiati: [], giaPresenti: [], diversi: [], errori: [], fermato: null };
  let prossimo = 0;

  async function lavora() {
    while (prossimo < voci.length && !esito.fermato) {
      const voce = voci[prossimo++];
      try {
        const nostro = await archivio.metadati(voce.pathname);
        if (nostro) {
          esito.giaPresenti.push(voce.pathname);
          if (nostro.size !== voce.size) esito.diversi.push({ percorso: voce.pathname, blob: voce.size, nostro: nostro.size });
          continue;
        }
        if (prova) {
          esito.daCopiare.push(voce.pathname);
          continue;
        }
        const { corpo, contentType } = await blob.scarica(voce);
        if (await archivio.scriviSeManca(voce.pathname, corpo, contentType)) {
          esito.copiati.push(voce.pathname);
          log(`copiato  ${voce.pathname} (${corpo.length} byte)`);
        } else {
          esito.giaPresenti.push(voce.pathname);
        }
      } catch (errore) {
        const messaggio = errore instanceof Error ? errore.message : String(errore);
        if (storeNonLeggibile(errore)) esito.fermato = `il vecchio store non si lascia leggere (${messaggio})`;
        else esito.errori.push({ percorso: voce.pathname, errore: messaggio });
      }
    }
  }

  await Promise.all(Array.from({ length: PARALLELE }, lavora));
  return esito;
}

/* ---------- Le due parti vere: Vercel Blob e l'archivio nostro ---------- */

function tokenBlob() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.replace(/[\s"'`]/g, '');
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN mancante (mettilo in .env.local)');
  return token;
}

export function blobVercel() {
  const token = tokenBlob();
  return {
    async elenca(prefix) {
      const voci = [];
      let cursor;
      do {
        const pagina = await list({ prefix, cursor, limit: 1000, token });
        voci.push(...pagina.blobs.map((b) => ({ pathname: b.pathname, size: b.size, url: b.url })));
        cursor = pagina.hasMore ? pagina.cursor : undefined;
      } while (cursor);
      return voci;
    },
    async scarica(voce) {
      const accesso = voce.url.includes('.public.blob.') ? 'public' : 'private';
      let r;
      try {
        r = await get(voce.url, { access: accesso, token });
      } catch (errore) {
        // Come blob-server.ts: uno store privato che rifiuta la lettura diretta può servire il file dall'indirizzo pubblico.
        if (accesso !== 'private' || !storeNonLeggibile(errore)) throw errore;
        r = await get(voce.url.replace('.private.blob.', '.public.blob.'), { access: 'public', token }).catch(() => {
          throw errore;
        });
      }
      if (!r || r.statusCode !== 200) throw new Error(`lettura di ${voce.pathname}: ${r ? r.statusCode : 404}`);
      const corpo = new Uint8Array(await new Response(r.stream).arrayBuffer());
      if (corpo.length !== voce.size) throw new Error(`lettura di ${voce.pathname}: ${corpo.length} byte invece di ${voce.size}`);
      return { corpo, contentType: r.blob?.contentType ?? 'application/octet-stream' };
    },
  };
}

export function archivioNostro() {
  if (!process.env.ARCHIVIO_URL?.trim() || !process.env.ARCHIVIO_TOKEN?.trim()) throw new Error('ARCHIVIO_URL e ARCHIVIO_TOKEN mancanti (stessi valori di Vercel)');
  return {
    metadati: metadatiOggetto,
    async scriviSeManca(percorso, corpo, contentType) {
      try {
        await scriviOggetto(percorso, corpo, { contentType });
        return true;
      } catch (errore) {
        if (errore instanceof BlobPreconditionFailedError) return false;
        throw errore;
      }
    },
  };
}

/* ---------- Riga di comando ---------- */

function caricaEnv() {
  try {
    for (const riga of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
      const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*?)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* senza .env.local si usa solo l'ambiente */
  }
}

function riassunto(esito, prova) {
  const righe = [`File nel vecchio store: ${esito.totale}`];
  if (prova) righe.push(`Da copiare: ${esito.daCopiare.length}`, ...raggruppa(esito.daCopiare));
  else righe.push(`Copiati: ${esito.copiati.length}`, ...raggruppa(esito.copiati));
  righe.push(`Già nell'archivio nostro (lasciati com'erano): ${esito.giaPresenti.length}`);
  for (const d of esito.diversi) righe.push(`  DIVERSO ${d.percorso}: ${d.blob} byte sul Blob, ${d.nostro} nel nostro (da guardare a mano)`);
  for (const e of esito.errori) righe.push(`  ERRORE ${e.percorso}: ${e.errore}`);
  if (esito.fermato) righe.push(`FERMATO: ${esito.fermato}. Niente di male: rilancia quando Vercel riapre lo store.`);
  return righe.join('\n');
}

function raggruppa(percorsi) {
  const gruppi = new Map();
  for (const p of percorsi) {
    // Due livelli bastano: le copie dello storico non si elencano una cartella per contenuto.
    const parti = p.split('/');
    const cartella = parti.length > 1 ? `${parti.slice(0, Math.min(2, parti.length - 1)).join('/')}/` : '(radice)';
    gruppi.set(cartella, (gruppi.get(cartella) ?? 0) + 1);
  }
  return [...gruppi].map(([cartella, n]) => `  ${cartella} ${n}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [comando, prefisso = ''] = process.argv.slice(2);
  if (comando !== 'prova' && comando !== 'copia') {
    console.log('Uso: node strumenti/migra-blob.mjs prova|copia [prefisso]');
    process.exit(1);
  }
  caricaEnv();
  const prova = comando === 'prova';
  const esito = await migra({ blob: blobVercel(), archivio: archivioNostro(), prova, prefisso });
  console.log(riassunto(esito, prova));
  process.exit(esito.fermato || esito.errori.length ? 2 : 0);
}
