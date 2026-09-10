import { leggiToken } from '@/lib/instagram-token';
import { titoloETesto } from '@/lib/testo-notizia';

interface MediaInstagram {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
}

export interface PostInstagram {
  id: string;
  immagine: string;
  link: string;
  titolo: string;
  testo: string;
  tipo: MediaInstagram['media_type'];
  data: string;
}

const CAMPI = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const LIMITE = 12;
/** Lista dei post: al massimo una chiamata ogni 30 minuti, condivisa da tutte le pagine. */
const REVALIDATE_LISTA_S = 1800;
/** Un post singolo non cambia: la sua chiamata vale un giorno. */
const REVALIDATE_SINGOLO_S = 86_400;

/**
 * Instagram si chiama solo dal server di produzione, sempre con lo stesso token e dallo
 * stesso posto: chiamate da altre reti (per esempio lo sviluppo in locale) possono sembrare
 * sospette a Meta. In sviluppo serve INSTAGRAM_IN_SVILUPPO=1 per attivarle.
 */
export function chiamateInstagramAttive(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.INSTAGRAM_IN_SVILUPPO === '1';
}

function normalizza(m: MediaInstagram): PostInstagram {
  return {
    id: m.id,
    immagine: m.media_type === 'VIDEO' ? (m.thumbnail_url ?? m.media_url) : m.media_url,
    link: m.permalink,
    ...titoloETesto(m.caption ?? ''),
    tipo: m.media_type,
    data: m.timestamp,
  };
}

async function chiamaGraph(percorso: string, revalidate: number): Promise<unknown | null> {
  if (!chiamateInstagramAttive()) return null;
  const token = await leggiToken();
  if (!token) return null;

  const url = new URL(`https://graph.instagram.com/v21.0/${percorso}`);
  url.searchParams.set('fields', CAMPI);
  url.searchParams.set('access_token', token);
  if (percorso.endsWith('/media')) url.searchParams.set('limit', String(LIMITE));

  const response = await fetch(url, { next: { revalidate } });
  if (!response.ok) return null;
  return response.json();
}

export async function leggiPost(): Promise<PostInstagram[]> {
  const risposta = (await chiamaGraph('me/media', REVALIDATE_LISTA_S)) as { data?: MediaInstagram[] } | null;
  if (!risposta?.data) return [];
  return risposta.data.filter((m) => m.media_url || m.thumbnail_url).map(normalizza);
}

/** Cerca prima fra i post già in cache; chiama Instagram solo per i post più vecchi. */
export async function leggiPostSingolo(id: string): Promise<PostInstagram | null> {
  if (!/^\d+$/.test(id)) return null;
  const inElenco = (await leggiPost()).find((p) => p.id === id);
  if (inElenco) return inElenco;
  const media = (await chiamaGraph(id, REVALIDATE_SINGOLO_S)) as MediaInstagram | null;
  if (!media?.id) return null;
  return normalizza(media);
}
