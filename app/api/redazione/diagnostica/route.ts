import { get, list, put } from '@vercel/blob';
import { conSessione, descriviErrore } from '@/lib/redazione/api-server';
import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';

/**
 * Diagnosi dell'archivio per chi coordina: ogni passo che il portale fa con lo storage, con i tempi
 * e l'errore esatto se qualcosa non va. Si apre in /api/redazione/diagnostica (serve la sessione
 * di un revisore). Scrive solo in redazione/diagnostica/, per provare le scritture condizionate.
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

export async function GET(request: Request) {
  return conSessione(request, async (sessione) => {
    if (sessione.ruolo !== 'revisore') throw new ErroreRedazione(403, 'Solo chi coordina.');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const passi: Passo[] = [];
    passi.push({
      passo: 'configurazione',
      ms: 0,
      esito: {
        blob: token ? `token presente (${token.length} caratteri, inizio «${token.slice(0, 16)}…»)` : 'BLOB_READ_WRITE_TOKEN assente: archivio in memoria',
        costruzioneMs: process.env.REDAZIONE_COSTRUZIONE_MS ?? '(7000)',
        regione: process.env.VERCEL_REGION ?? null,
        node: process.version,
      },
    });
    if (!token) return Response.json({ ok: true, passi });

    passi.push(
      await passo('list copie contenuti', async () => {
        const pagina = await list({ prefix: 'redazione/contenuti/', limit: 1000 });
        return { quante: pagina.blobs.length, altre: pagina.hasMore, prima: pagina.blobs[0]?.pathname ?? null, byte: pagina.blobs.reduce((n, b) => n + b.size, 0) };
      }),
    );
    passi.push(
      await passo('get indice', async () => {
        const r = await get('redazione/indice.json', { access: 'private', useCache: false });
        if (!r) return 'assente (ancora da costruire)';
        if (r.statusCode !== 200) return { statusCode: r.statusCode };
        const testo = await new Response(r.stream).text();
        const dati = JSON.parse(testo) as { revisione: number; contenuti: unknown[]; daLeggere?: string[] };
        return { byte: testo.length, etag: r.blob.etag, revisione: dati.revisione, contenuti: dati.contenuti.length, daLeggere: dati.daLeggere?.length ?? 0 };
      }),
    );
    passi.push(
      await passo('get persone', async () => {
        const r = await get('redazione/impostazioni/persone.json', { access: 'private', useCache: false });
        return r ? { statusCode: r.statusCode, etag: r.blob.etag } : 'assente';
      }),
    );
    passi.push(
      await passo('lettura di una copia', async () => {
        const pagina = await list({ prefix: 'redazione/contenuti/', limit: 1 });
        const p = pagina.blobs[0]?.pathname;
        if (!p) return 'nessuna copia';
        const r = await get(p, { access: 'private', useCache: false });
        if (!r || r.statusCode !== 200) return { p, statusCode: r?.statusCode ?? null };
        const c = (await new Response(r.stream).json()) as { id?: string; tipo?: string };
        return { p, id: c.id, tipo: c.tipo };
      }),
    );
    // Scrittura condizionata, come la fa l'archivio: crea, legge l'ETag, riscrive con ifMatch, poi con un ETag vecchio.
    const prova = `redazione/diagnostica/${Date.now()}.json`;
    passi.push(
      await passo('scrittura condizionata (ifMatch)', async () => {
        const creato = await put(prova, '{"n":1}', { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: false });
        const letto = await get(prova, { access: 'private', useCache: false });
        const etagLetto = letto?.statusCode === 200 ? letto.blob.etag : null;
        const riscritto = await put(prova, '{"n":2}', { access: 'private', contentType: 'application/json', addRandomSuffix: false, ifMatch: etagLetto ?? creato.etag });
        let vecchio: string = 'accettato (!)';
        try {
          await put(prova, '{"n":3}', { access: 'private', contentType: 'application/json', addRandomSuffix: false, ifMatch: creato.etag });
        } catch (e) {
          vecchio = descriviErrore(e);
        }
        return { etagPut: creato.etag, etagGet: etagLetto, uguali: creato.etag === etagLetto, riscrittoEtag: riscritto.etag, conEtagVecchio: vecchio };
      }),
    );
    passi.push(await passo('archivio().stato()', async () => {
      const s = await archivio().stato();
      return { revisione: s.revisione, contenuti: s.contenuti.length, daLeggere: s.daLeggere?.length ?? 0 };
    }));
    return Response.json({ ok: true, passi });
  });
}
