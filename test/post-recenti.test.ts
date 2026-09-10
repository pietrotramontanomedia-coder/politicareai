import { describe, expect, it } from 'vitest';
import type { PostInstagram } from '@/lib/instagram-server';
import type { NotiziaUltimOra } from '@/lib/ultimora-server';
import { scegliPostRecenti } from '@/lib/post-recenti';

const postIg: PostInstagram = { id: '1', immagine: 'https://ig/1.jpg', link: 'https://instagram.com/p/1', titolo: 'Post IG', testo: '', tipo: 'IMAGE', data: '2026-09-10T10:00:00Z' };
const tgConImmagine: NotiziaUltimOra = { id: 'tg-2', titolo: 'Messaggio con grafica', testo: '', data: '2026-09-10T09:00:00Z', immagine: 'https://tg/2.jpg', fonte: 'telegram' };
const tgSoloTesto: NotiziaUltimOra = { id: 'tg-3', titolo: 'Solo testo', testo: '', data: '2026-09-10T08:00:00Z', fonte: 'telegram' };

describe('carosello "I nostri ultimi post"', () => {
  it('usa i post di Instagram quando ci sono', () => {
    expect(scegliPostRecenti([postIg], [tgConImmagine]).map((p) => p.fonte)).toEqual(['instagram']);
  });

  it('se Instagram non restituisce post, mostra i messaggi Telegram con immagine invece di sparire', () => {
    const post = scegliPostRecenti([], [tgConImmagine, tgSoloTesto]);
    expect(post).toEqual([{ id: 'tg-2', immagine: 'https://tg/2.jpg', titolo: 'Messaggio con grafica', data: '2026-09-10T09:00:00Z', fonte: 'telegram' }]);
  });

  it('senza nessuna fonte il carosello resta vuoto', () => {
    expect(scegliPostRecenti([], [tgSoloTesto])).toEqual([]);
  });
});
