import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contenuto } from '@/lib/redazione/tipi';

/*
 * Archivio su Vercel Blob, con uno storage finto: la lettura passa dalla CDN, che dà un ETag
 * «debole» (W/"…") diverso da quello che l'API confronta nelle scritture condizionate. Era il
 * motivo per cui nessun commento si salvava.
 */

const blob = vi.hoisted(() => {
  class BlobNotFoundError extends Error {}
  class BlobPreconditionFailedError extends Error {}
  const file = new Map<string, { corpo: string; versione: number }>();
  const etag = (versione: number) => `"v${versione}"`;
  return {
    file,
    BlobNotFoundError,
    BlobPreconditionFailedError,
    /** Chiamata prima di ogni scrittura: serve a simulare chi scrive nello stesso momento. */
    primaDiScrivere: { fn: (() => {}) as (percorso: string) => void },
    modulo: {
      BlobNotFoundError,
      BlobPreconditionFailedError,
      head: vi.fn(async (percorso: string) => {
        const f = file.get(percorso);
        if (!f) throw new BlobNotFoundError();
        return { etag: etag(f.versione) };
      }),
      get: vi.fn(async (percorso: string) => {
        const f = file.get(percorso);
        if (!f) return null;
        return { statusCode: 200, stream: new Response(f.corpo).body, blob: { etag: `W/${etag(f.versione)}` } };
      }),
      put: vi.fn(async (percorso: string, corpo: string, opzioni: { ifMatch?: string; allowOverwrite?: boolean }) => {
        blob.primaDiScrivere.fn(percorso);
        const f = file.get(percorso);
        if (opzioni.ifMatch !== undefined && (!f || etag(f.versione) !== opzioni.ifMatch)) throw new BlobPreconditionFailedError();
        if (opzioni.allowOverwrite === false && f) throw new Error('esiste già');
        file.set(percorso, { corpo, versione: (f?.versione ?? 0) + 1 });
        return {};
      }),
      list: vi.fn(async () => ({ blobs: [], hasMore: false })),
    },
  };
});

vi.mock('@vercel/blob', () => blob.modulo);

const { archivio, ErroreRedazione } = await import('@/lib/redazione/archivio-server');

const ID = 'a'.repeat(32);
const PERCORSO = `redazione/contenuti/${ID}.json`;

function contenuto(): Contenuto {
  return {
    id: ID,
    tipo: 'post',
    autore: 'Matteo',
    chiaveAutore: 'matteo',
    creatoIl: '2026-10-13T14:22:00Z',
    aggiornatoIl: '2026-10-13T14:22:00Z',
    stato: 'da_rivedere',
    versioni: [{ numero: 1, inviataIl: '2026-10-13T14:22:00Z', immagini: [], didascalia: 'copy', formato: '4:5' }],
    commenti: [],
  };
}

function letto(): Contenuto {
  return JSON.parse(blob.file.get(PERCORSO)!.corpo) as Contenuto;
}

describe('archivio su Vercel Blob', () => {
  beforeEach(async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'finto');
    blob.file.clear();
    blob.primaDiScrivere.fn = () => {};
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await archivio().crea(contenuto());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('aggiorna usa l\'ETag dell\'API, non quello della CDN', async () => {
    const nuovo = await archivio().aggiorna(ID, (c) => ({ ...c, stato: 'da_correggere' }));
    expect(nuovo.stato).toBe('da_correggere');
    expect(letto().stato).toBe('da_correggere');
  });

  it('se qualcuno scrive in mezzo, rilegge e non cancella la sua modifica', async () => {
    let interferenze = 1;
    blob.primaDiScrivere.fn = (percorso) => {
      if (percorso !== PERCORSO || interferenze-- <= 0) return;
      const f = blob.file.get(PERCORSO)!;
      const altro = { ...(JSON.parse(f.corpo) as Contenuto), stato: 'approvato' as const };
      blob.file.set(PERCORSO, { corpo: JSON.stringify(altro), versione: f.versione + 1 });
    };
    const commento = { id: 'c1', autore: 'Jacopo', ruolo: 'revisore' as const, tipo: 'consiglio' as const, testo: 'Usa il condizionale', versione: 1, creatoIl: '2026-10-13T14:30:00Z' };
    await archivio().aggiorna(ID, (c) => ({ ...c, commenti: [...c.commenti, commento] }));
    expect(letto().stato).toBe('approvato');
    expect(letto().commenti).toEqual([commento]);
  });

  it('contenuto che non esiste: 404', async () => {
    await expect(archivio().aggiorna('b'.repeat(32), (c) => c)).rejects.toMatchObject({ status: 404 });
  });

  it('conflitto che non si risolve: errore chiaro, non un 500', async () => {
    blob.primaDiScrivere.fn = (percorso) => {
      if (percorso !== PERCORSO) return;
      const f = blob.file.get(PERCORSO)!;
      blob.file.set(PERCORSO, { ...f, versione: f.versione + 1 });
    };
    const errore = await archivio().aggiorna(ID, (c) => c).catch((e) => e);
    expect(errore).toBeInstanceOf(ErroreRedazione);
    expect(errore.status).toBe(409);
  });
});
