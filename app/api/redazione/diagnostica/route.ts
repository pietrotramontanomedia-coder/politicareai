import { get, head, list } from '@vercel/blob';
import { autorizzatoCron } from '@/lib/cron';
import { conSessione, descriviErrore, rispostaErrore } from '@/lib/redazione/api-server';
import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { accessoDaUrl, accessoStore, leggiBlobJson, metadatiBlob, scriviBlob, tokenBlob } from '@/lib/redazione/blob-server';
import { sincronizza } from '@/lib/redazione/regole';
import type { SessioneRedazione } from '@/lib/redazione/tipi';

/**
 * Diagnosi dell'archivio per chi coordina: ogni passo che il portale fa con lo storage, con i tempi
 * e l'errore esatto se qualcosa non va. Si apre in /api/redazione/diagnostica con la sessione di
 * un revisore, oppure con `Authorization: Bearer <CRON_SECRET>` (il workflow «Diagnosi redazione»
 * su GitHub). Scrive solo in redazione/diagnostica/, per provare le scritture condizionate.
 * Non espone mai il token: solo l'id dello store, che è già negli indirizzi dei file.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Passo = { passo: string; ms: number; esito: unknown } | { passo: string; ms: number; errore: string };

async function passo(nome: string, fn: () => Promise<unknown>): Promise<Passo> {
  const inizio = Date.now();
  try {
    return { passo: nome, ms: Date.now() - inizio, esito: await fn() };
  } catch (errore) {
    return { passo: nome, ms: Date.now() - inizio, errore: descriviErrore(errore) };
  }
}

/** Lettura diretta per un indirizzo, come la fa l'SDK: dice solo se lo storage la accetta. */
async function provaLettura(url: string, accesso: 'public' | 'private'): Promise<string> {
  const r = await get(url, { access: accesso, token: tokenBlob() });
  return r ? `stato ${r.statusCode}` : '404';
}

export async function GET(request: Request) {
  if (autorizzatoCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return diagnosi({ nome: 'Diagnosi (cron)', ruolo: 'revisore' }).catch((errore) => rispostaErrore(errore, true));
  }
  return conSessione(request, async (sessione) => {
    if (sessione.ruolo !== 'revisore') throw new ErroreRedazione(403, 'Solo chi coordina.');
    return diagnosi(sessione);
  });
}

async function diagnosi(sessione: SessioneRedazione): Promise<Response> {
  {
    const grezzo = process.env.BLOB_READ_WRITE_TOKEN;
    const token = tokenBlob();
    const passi: Passo[] = [];
    passi.push({
      passo: 'configurazione',
      ms: 0,
      esito: {
        blob: token ? `token presente (${token.length} caratteri, forma ${/^vercel_blob_rw_[A-Za-z0-9]+_[A-Za-z0-9]+$/.test(token) ? 'giusta' : 'INATTESA'}, store «${token.split('_')[3] ?? '?'}»)` : 'BLOB_READ_WRITE_TOKEN assente: archivio in memoria',
        tokenPulito: grezzo !== undefined && grezzo !== token ? 'sì: conteneva spazi o virgolette' : 'non serviva',
        accessoForzato: process.env.REDAZIONE_BLOB_ACCESSO ?? null,
        costruzioneMs: process.env.REDAZIONE_COSTRUZIONE_MS ?? '(7000)',
        regione: process.env.VERCEL_REGION ?? null,
        node: process.version,
      },
    });
    if (!token) return Response.json({ ok: true, passi });

    passi.push(
      await passo('tipo di store (dall\'indirizzo dei file)', async () => {
        const pagina = await list({ limit: 1, token });
        return { primoFile: pagina.blobs[0]?.url ?? null, accesso: accessoDaUrl(pagina.blobs[0]?.url) ?? 'sconosciuto (store vuoto)', usato: await accessoStore() };
      }),
    );
    passi.push(
      await passo('list copie contenuti', async () => {
        const pagina = await list({ prefix: 'redazione/contenuti/', limit: 1000, token });
        return { quante: pagina.blobs.length, altre: pagina.hasMore, prima: pagina.blobs[0]?.pathname ?? null, byte: pagina.blobs.reduce((n, b) => n + b.size, 0) };
      }),
    );
    passi.push(
      await passo('head indice', async () => {
        const m = await metadatiBlob('redazione/indice.json');
        return m ? { url: m.url, etag: m.etag, byte: m.size } : 'assente (ancora da costruire)';
      }),
    );
    passi.push(
      await passo('lettura di una copia: per l\'indirizzo privato e per quello pubblico', async () => {
        const pagina = await list({ prefix: 'redazione/contenuti/', limit: 1, token });
        const p = pagina.blobs[0];
        if (!p) return 'nessuna copia';
        const h = await head(p.pathname, { token });
        const esiti: Record<string, string> = { url: h.url, etag: h.etag };
        for (const [nome, url, accesso] of [
          ['privato', h.url.replace('.public.blob.', '.private.blob.'), 'private'],
          ['pubblico', h.url.replace('.private.blob.', '.public.blob.'), 'public'],
        ] as const) {
          try {
            esiti[nome] = await provaLettura(url, accesso);
          } catch (e) {
            esiti[nome] = descriviErrore(e);
          }
        }
        try {
          const r = await leggiBlobJson<{ id?: string; tipo?: string }>(p.pathname);
          esiti.conLoStratoDelPortale = r && r.statusCode === 200 ? `ok: ${r.dati.tipo} ${r.dati.id}` : String(r?.statusCode);
        } catch (e) {
          esiti.conLoStratoDelPortale = descriviErrore(e);
        }
        return esiti;
      }),
    );
    // Scrittura condizionata, come la fa l'archivio: crea, legge l'ETag dai metadati, riscrive con ifMatch, poi con un ETag vecchio.
    const prova = `redazione/diagnostica/${Date.now()}.json`;
    passi.push(
      await passo('scrittura condizionata (ifMatch)', async () => {
        const creato = await scriviBlob(prova, '{"n":1}', { contentType: 'application/json' });
        const meta = await metadatiBlob(prova);
        const riscritto = await scriviBlob(prova, '{"n":2}', { contentType: 'application/json', ifMatch: meta?.etag ?? creato.etag });
        let vecchio = 'accettato (!)';
        try {
          await scriviBlob(prova, '{"n":3}', { contentType: 'application/json', ifMatch: creato.etag });
        } catch (e) {
          vecchio = descriviErrore(e);
        }
        const riletto = await leggiBlobJson<{ n: number }>(prova);
        return { etagPut: creato.etag, etagHead: meta?.etag ?? null, uguali: creato.etag === meta?.etag, riscrittoEtag: riscritto.etag, conEtagVecchio: vecchio, riletto: riletto?.statusCode === 200 ? riletto.dati : riletto?.statusCode };
      }),
    );
    passi.push(
      await passo('archivio().stato()', async () => {
        const s = await archivio().stato();
        return { revisione: s.revisione, contenuti: s.contenuti.length, daLeggere: s.daLeggere?.length ?? 0 };
      }),
    );
    // Lo stesso lavoro della richiesta del feed, per un revisore: se passa, il portale si apre.
    passi.push(
      await passo('feed come lo chiede il portale', async () => {
        const [stato, obiettivi, persone] = await Promise.all([archivio().stato(), archivio().leggiObiettivi(), archivio().leggiPersone()]);
        const s = sincronizza(sessione, stato, null, new Date(), persone);
        return { revisione: s.revisione, contenutiInviati: s.contenuti.length, byte: JSON.stringify(s).length, squadra: s.statistiche.length, persone: persone.length, obiettivi };
      }),
    );
    return Response.json({ ok: true, passi });
  }
}
