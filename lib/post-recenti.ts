import type { PostInstagram } from '@/lib/instagram-server';
import type { FonteUltimOra, NotiziaUltimOra } from '@/lib/ultimora-server';

export interface PostRecente {
  id: string;
  immagine: string;
  titolo: string;
  data: string;
  fonte: FonteUltimOra;
}

/**
 * Post del carosello della home: quelli di Instagram; se Instagram non ne restituisce
 * (token scaduto o API bloccata da Meta), quelli del canale Telegram che hanno un'immagine.
 */
export function scegliPostRecenti(instagram: PostInstagram[], notizie: NotiziaUltimOra[]): PostRecente[] {
  const daInstagram = instagram
    .filter((p) => p.immagine)
    .map((p) => ({ id: p.id, immagine: p.immagine, titolo: p.titolo, data: p.data, fonte: 'instagram' as const }));
  if (daInstagram.length > 0) return daInstagram;

  return notizie
    .filter((n): n is NotiziaUltimOra & { immagine: string } => n.fonte === 'telegram' && Boolean(n.immagine))
    .map((n) => ({ id: n.id, immagine: n.immagine, titolo: n.titolo, data: n.data, fonte: 'telegram' as const }));
}
