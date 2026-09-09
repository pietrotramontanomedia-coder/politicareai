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
  didascalia: string;
  tipo: MediaInstagram['media_type'];
  data: string;
}

const CAMPI = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
const LIMITE = 6;

async function leggiPost(): Promise<PostInstagram[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  const url = new URL('https://graph.instagram.com/v21.0/me/media');
  url.searchParams.set('fields', CAMPI);
  url.searchParams.set('limit', String(LIMITE));
  url.searchParams.set('access_token', token);

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) return [];

  const { data } = (await response.json()) as { data?: MediaInstagram[] };
  if (!data) return [];

  return data
    .filter((m) => m.media_url || m.thumbnail_url)
    .map((m) => ({
      id: m.id,
      immagine: m.media_type === 'VIDEO' ? (m.thumbnail_url ?? m.media_url) : m.media_url,
      link: m.permalink,
      didascalia: (m.caption ?? '').split('\n')[0].substring(0, 140),
      tipo: m.media_type,
      data: m.timestamp,
    }));
}

export async function GET() {
  const post = await leggiPost();

  return Response.json({
    success: post.length > 0,
    post,
    timestamp: new Date().toISOString(),
  });
}
