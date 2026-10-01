import { get, put } from '@vercel/blob';
import type { Avviso, Rilevazione } from './radar';

/**
 * Memoria del radar nello storage privato: le classifiche delle ultime 48 ore (per misurare
 * la salita e, a posteriori, se un avviso è arrivato prima del picco) e gli avvisi delle
 * ultime due settimane. Senza storage (sviluppo) resta in memoria.
 */

const PERCORSO = 'radar/stato.json';

export interface StatoRadar {
  rilevazioni: Rilevazione[];
  avvisi: Avviso[];
}

let memoria: StatoRadar = { rilevazioni: [], avvisi: [] };

export async function leggiStato(): Promise<StatoRadar> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return memoria;
  try {
    const risultato = await get(PERCORSO, { access: 'private', useCache: false });
    if (risultato?.statusCode === 200) return (await new Response(risultato.stream).json()) as StatoRadar;
  } catch {
    /* primo avvio o storage non raggiungibile: si riparte vuoti */
  }
  return { rilevazioni: [], avvisi: [] };
}

export async function salvaStato(stato: StatoRadar): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    memoria = stato;
    return;
  }
  await put(PERCORSO, JSON.stringify(stato), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
