import { get, put } from '@vercel/blob';

/**
 * Registro dei post Telegram già pubblicati su X, per non pubblicare due volte
 * se Telegram rispedisce lo stesso aggiornamento. Vive nello storage privato;
 * senza storage (sviluppo) resta in memoria.
 */

const PERCORSO = 'telegram-x/pubblicati.json';
const MASSIMO_VOCI = 300;

export interface Pubblicazione {
  x: string;
  data: string;
}
interface Registro {
  voci: Record<string, Pubblicazione>;
}

const memoria: Registro = { voci: {} };
/** Ultima pubblicazione fatta da questo processo: vale anche se lo storage risponde in ritardo. */
let ultimaLocale = 0;

async function leggi(): Promise<Registro> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return memoria;
  try {
    // Senza cache: la copia sulla CDN può restare indietro di un minuto, e due post consegnati
    // a pochi secondi l'uno dall'altro passerebbero entrambi il controllo della distanza.
    const risultato = await get(PERCORSO, { access: 'private', useCache: false });
    if (risultato?.statusCode === 200) return (await new Response(risultato.stream).json()) as Registro;
  } catch {
    /* primo avvio o storage non raggiungibile: si riparte vuoti */
  }
  return { voci: {} };
}

export async function giaPubblicato(numero: number): Promise<Pubblicazione | null> {
  return (await leggi()).voci[String(numero)] ?? null;
}

/** Quando è uscito l'ultimo post su X, per tenere una distanza minima fra un post e l'altro. */
export async function ultimaPubblicazione(): Promise<Date | null> {
  const date = Object.values((await leggi()).voci)
    .map((voce) => Date.parse(voce.data))
    .filter((n) => !Number.isNaN(n));
  const ultima = Math.max(ultimaLocale, ...date);
  return ultima > 0 ? new Date(ultima) : null;
}

export async function registraPubblicazione(numero: number, idX: string, adesso: Date = new Date()): Promise<void> {
  ultimaLocale = Math.max(ultimaLocale, adesso.getTime());
  const registro = await leggi();
  registro.voci[String(numero)] = { x: idX, data: adesso.toISOString() };
  const chiavi = Object.keys(registro.voci).sort((a, b) => Number(b) - Number(a));
  for (const vecchia of chiavi.slice(MASSIMO_VOCI)) delete registro.voci[vecchia];
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await put(PERCORSO, JSON.stringify(registro), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}
