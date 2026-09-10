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
const REVALIDATE_S = 900;

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

async function chiamaGraph(percorso: string): Promise<unknown | null> {
  const token = await leggiToken();
  if (!token) return null;

  const url = new URL(`https://graph.instagram.com/v21.0/${percorso}`);
  url.searchParams.set('fields', CAMPI);
  url.searchParams.set('access_token', token);
  if (percorso.endsWith('/media')) url.searchParams.set('limit', String(LIMITE));

  const response = await fetch(url, { next: { revalidate: REVALIDATE_S } });
  if (!response.ok) return null;
  return response.json();
}

export async function leggiPost(): Promise<PostInstagram[]> {
  const risposta = (await chiamaGraph('me/media')) as { data?: MediaInstagram[] } | null;
  if (!risposta?.data) return [];
  return risposta.data.filter((m) => m.media_url || m.thumbnail_url).map(normalizza);
}

export async function leggiPostSingolo(id: string): Promise<PostInstagram | null> {
  if (!/^\d+$/.test(id)) return null;
  const media = (await chiamaGraph(id)) as MediaInstagram | null;
  if (!media?.id) return null;
  return normalizza(media);
}
