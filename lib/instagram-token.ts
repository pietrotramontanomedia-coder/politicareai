import { createHash } from 'node:crypto';
import { get, put } from '@vercel/blob';

/**
 * Il token Instagram dura 60 giorni. Un job settimanale lo rinnova e salva la
 * versione nuova in uno storage privato: l'app legge da lì e usa la variabile
 * d'ambiente solo finché il primo rinnovo non è avvenuto.
 */

const PERCORSO = 'instagram/token.json';
const URL_RINNOVO = 'https://graph.instagram.com/refresh_access_token';
/** Evita una lettura dallo storage a ogni richiesta del feed. */
const DURATA_CACHE_MS = 15 * 60 * 1000;

export interface TokenSalvato {
  token: string;
  rinnovatoIl: string;
  scadeIl: string;
  /** Impronta del token d'ambiente da cui discende questo token: se il token d'ambiente cambia, vince quello. */
  origineAmbiente?: string;
}

/** Impronta corta e non reversibile di un token, per confrontarli senza salvarli in chiaro. */
export function impronta(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16);
}

/**
 * Sceglie il token da usare. Quello salvato (rinnovato ogni settimana) vale finché discende dal
 * token d'ambiente attuale. Se su Vercel viene messo un token nuovo, per esempio dopo che Meta ha
 * invalidato la sessione, vince il token d'ambiente e il primo rinnovo lo salva di nuovo.
 */
export function scegliToken(salvato: TokenSalvato | null, ambiente: string | undefined): string | null {
  if (salvato && (!ambiente || salvato.origineAmbiente === impronta(ambiente))) return salvato.token;
  return ambiente ?? salvato?.token ?? null;
}

let cache: { valore: TokenSalvato | null; letto: number } | null = null;

export function calcolaScadenza(secondiValidita: number, da: Date): string {
  return new Date(da.getTime() + secondiValidita * 1000).toISOString();
}

async function leggiDaStorage(): Promise<TokenSalvato | null> {
  if (cache && Date.now() - cache.letto < DURATA_CACHE_MS) return cache.valore;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  let valore: TokenSalvato | null = null;
  try {
    const risultato = await get(PERCORSO, { access: 'private' });
    if (risultato?.statusCode === 200) {
      valore = (await new Response(risultato.stream).json()) as TokenSalvato;
    }
  } catch {
    valore = null;
  }
  cache = { valore, letto: Date.now() };
  return valore;
}

export async function leggiToken(): Promise<string | null> {
  return scegliToken(await leggiDaStorage(), process.env.INSTAGRAM_ACCESS_TOKEN);
}

/** Sotto questo intervallo un nuovo rinnovo non serve: Instagram non allunga la scadenza e troppi rinnovi insospettiscono. */
export const INTERVALLO_MINIMO_RINNOVO_MS = 24 * 60 * 60 * 1000;

/** Chiede a Instagram un token nuovo (valido altri 60 giorni) e lo salva. Non espone mai il token. */
export async function rinnovaToken(
  adesso: Date = new Date(),
): Promise<{ scadeIl: string; partitoDa: 'storage' | 'ambiente'; saltato?: boolean }> {
  const ambiente = process.env.INSTAGRAM_ACCESS_TOKEN;
  const letto = await leggiDaStorage();
  // Un token salvato che non discende dal token d'ambiente attuale è superato: si riparte da quello d'ambiente.
  const salvato = letto && scegliToken(letto, ambiente) === letto.token ? letto : null;
  if (salvato && adesso.getTime() - Date.parse(salvato.rinnovatoIl) < INTERVALLO_MINIMO_RINNOVO_MS) {
    return { scadeIl: salvato.scadeIl, partitoDa: 'storage', saltato: true };
  }
  const attuale = salvato?.token ?? ambiente;
  if (!attuale) throw new Error('nessun token Instagram configurato');

  const url = new URL(URL_RINNOVO);
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', attuale);

  const risposta = await fetch(url, { cache: 'no-store' });
  const dati = (await risposta.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!risposta.ok || !dati.access_token || !dati.expires_in) {
    throw new Error(`rinnovo rifiutato da Instagram: ${dati.error?.message ?? `HTTP ${risposta.status}`}`);
  }

  const nuovo: TokenSalvato = {
    token: dati.access_token,
    rinnovatoIl: adesso.toISOString(),
    scadeIl: calcolaScadenza(dati.expires_in, adesso),
    origineAmbiente: ambiente ? impronta(ambiente) : undefined,
  };
  await put(PERCORSO, JSON.stringify(nuovo), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
  cache = { valore: nuovo, letto: Date.now() };

  return { scadeIl: nuovo.scadeIl, partitoDa: salvato ? 'storage' : 'ambiente' };
}
