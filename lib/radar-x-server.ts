import { TwitterApi } from 'twitter-api-v2';
import type { Tendenza } from './radar';

/**
 * Letture su X per il radar, con l'accesso dell'app (nessun dato dell'account).
 * Ogni chiamata costa: tendenze 0,01 $ a richiesta, conteggi 0,005 $, ricerca 0,005 $ a post letto
 * (prezzi pay-per-use di X nel 2026). Il radar ne fa poche e solo sui temi che salgono.
 */

/** WOEID dell'Italia per le tendenze di X. */
export const WOEID_ITALIA = 23424853;

let lettore: Promise<TwitterApi> | null = null;

export function letturaXConfigurata(): boolean {
  return Boolean(process.env.X_BEARER_TOKEN || (process.env.X_API_KEY && process.env.X_API_SECRET));
}

function client(): Promise<TwitterApi> {
  if (!lettore) {
    if (process.env.X_BEARER_TOKEN) {
      lettore = Promise.resolve(new TwitterApi(process.env.X_BEARER_TOKEN));
    } else if (process.env.X_API_KEY && process.env.X_API_SECRET) {
      lettore = new TwitterApi({ appKey: process.env.X_API_KEY, appSecret: process.env.X_API_SECRET }).appLogin();
      lettore.catch(() => (lettore = null));
    } else {
      throw new Error('lettura da X non configurata: serve X_BEARER_TOKEN oppure X_API_KEY e X_API_SECRET');
    }
  }
  return lettore;
}

interface RispostaTendenze {
  data?: { trend_name: string; tweet_count?: number }[];
}

export async function leggiTendenze(woeid = WOEID_ITALIA, quante = 50): Promise<Tendenza[]> {
  const x = await client();
  const risposta = await x.v2.get<RispostaTendenze>(`trends/by/woeid/${woeid}`, { max_trends: quante });
  return (risposta.data ?? []).map((t) => ({ nome: t.trend_name, volume: t.tweet_count ?? null }));
}

/** Post all'ora sulle ultime ore, in ordine cronologico. */
export async function conteggiOrari(query: string, ore = 6): Promise<number[]> {
  const x = await client();
  const inizio = new Date(Date.now() - ore * 3_600_000).toISOString();
  const risposta = await x.v2.tweetCountRecent(query, { granularity: 'hour', start_time: inizio });
  return risposta.data.map((voce) => voce.tweet_count);
}

export interface PostCampione {
  testo: string;
  autore: string;
  like: number;
  repost: number;
}

/** I post più rilevanti sul tema, per capire di cosa si parla davvero. */
export async function campionePost(query: string, quanti = 10): Promise<PostCampione[]> {
  const x = await client();
  const risposta = await x.v2.get<{
    data?: { text: string; author_id?: string; public_metrics?: { like_count: number; retweet_count: number } }[];
    includes?: { users?: { id: string; username: string }[] };
  }>('tweets/search/recent', {
    query,
    max_results: quanti,
    sort_order: 'relevancy',
    'tweet.fields': 'public_metrics,author_id',
    expansions: 'author_id',
    'user.fields': 'username',
  });
  const utenti = new Map((risposta.includes?.users ?? []).map((u) => [u.id, u.username]));
  return (risposta.data ?? []).map((p) => ({
    testo: p.text,
    autore: utenti.get(p.author_id ?? '') ?? '',
    like: p.public_metrics?.like_count ?? 0,
    repost: p.public_metrics?.retweet_count ?? 0,
  }));
}
