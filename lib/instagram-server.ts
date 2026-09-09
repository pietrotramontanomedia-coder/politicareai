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
const MAX_TITOLO = 110;
const REVALIDATE_S = 900;

function troncaAParola(testo: string, max: number): string {
  if (testo.length <= max) return testo;
  const taglio = testo.lastIndexOf(' ', max);
  return testo.substring(0, taglio > max / 2 ? taglio : max).replace(/[,;:\s]+$/, '') + '…';
}

function pulisci(testo: string): string {
  return testo.replace(/#(\p{L})/gu, '$1').replace(/[ \t]+/g, ' ').trim();
}

function senzaEmojiIniziali(testo: string): string {
  return testo.replace(/^[\p{Extended_Pictographic}\p{Regional_Indicator}️‍\s]+/u, '');
}

/** Stile agenzia: la prima frase diventa il titolo, il resto della didascalia il testo. */
function spezzaDidascalia(caption: string): { titolo: string; testo: string } {
  const righe = caption
    .split('\n')
    .map((r) => pulisci(r))
    .filter(Boolean);
  const prima = righe[0] ?? '';

  const frase = prima.match(/^(.{20,}?[.!?:])(?:\s+(.*))?$/s);
  const titoloGrezzo = senzaEmojiIniziali(frase ? frase[1] : prima).replace(/[.:]$/, '');
  const restoPrima = frase?.[2] ?? '';
  const troncato = titoloGrezzo.length > MAX_TITOLO;

  const testo = [troncato ? prima : restoPrima, ...righe.slice(1)].filter(Boolean).join('\n');

  return { titolo: troncaAParola(titoloGrezzo, MAX_TITOLO), testo };
}

function normalizza(m: MediaInstagram): PostInstagram {
  return {
    id: m.id,
    immagine: m.media_type === 'VIDEO' ? (m.thumbnail_url ?? m.media_url) : m.media_url,
    link: m.permalink,
    ...spezzaDidascalia(m.caption ?? ''),
    tipo: m.media_type,
    data: m.timestamp,
  };
}

async function chiamaGraph(percorso: string): Promise<unknown | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
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
