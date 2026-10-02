import { TwitterApi } from 'twitter-api-v2';
import type { Tendenza } from './radar';

/**
 * Letture su X per il radar, con il Bearer Token di un'app X dedicata (RADAR_X_BEARER_TOKEN):
 * nessuna chiave in comune con il ponte Telegram → X, che pubblica con le sue.
 * Ogni chiamata costa: tendenze 0,01 $ a richiesta, conteggi 0,005 $, ricerca 0,005 $ a post letto
 * (prezzi pay-per-use di X nel 2026). Il radar ne fa poche e solo sui temi che salgono.
 */

/** WOEID dell'Italia per le tendenze di X. */
export const WOEID_ITALIA = 23424853;

/**
 * Il Bearer Token senza spazi: la console di X lo mostra incolonnato su più righe e
 * copiandolo a mano ci finiscono dentro a capo che l'intestazione HTTP non accetta.
 */
function bearer(): string {
  return (process.env.RADAR_X_BEARER_TOKEN ?? '').replace(/\s+/g, '');
}

export function letturaXConfigurata(): boolean {
  return Boolean(bearer());
}

function client(): TwitterApi {
  const token = bearer();
  if (!token) throw new Error('RADAR_X_BEARER_TOKEN mancante');
  return new TwitterApi(token);
}

interface RispostaTendenze {
  data?: { trend_name: string; tweet_count?: number }[];
}

export async function leggiTendenze(woeid = WOEID_ITALIA, quante = 50): Promise<Tendenza[]> {
  const x = client();
  const risposta = await x.v2.get<RispostaTendenze>(`trends/by/woeid/${woeid}`, { max_trends: quante });
  return (risposta.data ?? []).map((t) => ({ nome: t.trend_name, volume: t.tweet_count ?? null }));
}

/** Post all'ora sulle ultime ore, in ordine cronologico. */
export async function conteggiOrari(query: string, ore = 6): Promise<number[]> {
  const x = client();
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
  const x = client();
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
