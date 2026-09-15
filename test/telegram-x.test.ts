import { describe, expect, it } from 'vitest';
import { componiTweet, contieneLink, estraiPostCanale, lunghezzaX } from '@/lib/telegram-x';

/* Il ponte Telegram → X: solo i post nuovi del canale, testo entro 280 caratteri come li conta X. */

const LINK = 'https://politicare-app.vercel.app/ultimora/tg-123';

describe('estraiPostCanale', () => {
  const chat = { id: -100123, type: 'channel', username: 'politicare' };

  it('legge testo e foto più grande di un post del canale', () => {
    const post = estraiPostCanale({
      channel_post: {
        message_id: 123,
        chat,
        caption: 'Notizia con foto',
        photo: [
          { file_id: 'piccola', width: 90 },
          { file_id: 'grande', width: 1280 },
          { file_id: 'media', width: 320 },
        ],
      },
    });
    expect(post).toEqual({ numero: 123, canale: 'politicare', testo: 'Notizia con foto', foto: 'grande', gruppoMedia: undefined });
  });

  it('ignora modifiche, messaggi privati e corpi non validi', () => {
    expect(estraiPostCanale({ edited_channel_post: { message_id: 1, chat, text: 'modificato' } })).toBeNull();
    expect(estraiPostCanale({ message: { message_id: 1, chat: { id: 5, type: 'private' }, text: 'ciao' } })).toBeNull();
    expect(estraiPostCanale(null)).toBeNull();
    expect(estraiPostCanale('x')).toBeNull();
  });
});

describe('lunghezzaX', () => {
  it('conta i link come 23 e le emoji come 2', () => {
    expect(lunghezzaX('ciao')).toBe(4);
    expect(lunghezzaX('vedi https://www.politicare.it/una/pagina/lunghissima ora')).toBe(5 + 23 + 4);
    expect(lunghezzaX('ok politicare.it')).toBe(3 + 23);
    expect(lunghezzaX('🔴 Ultim’ora')).toBe(2 + 1 + 9);
  });
});

describe('componiTweet', () => {
  it('toglie la firma @politicare e lascia intatto un post breve', () => {
    expect(componiTweet('🔴 Ultim’ora: approvata la legge.\n\nIl testo passa al Senato.\n@politicare', { link: LINK })).toBe(
      '🔴 Ultim’ora: approvata la legge.\n\nIl testo passa al Senato.',
    );
  });

  it('un post breve non riceve il link, che su X costa di più', () => {
    const testo = componiTweet('Notizia breve', { link: LINK });
    expect(contieneLink(testo)).toBe(false);
  });

  it('un post lungo viene troncato a una parola intera e rimanda alla notizia sul sito', () => {
    const lungo = Array.from({ length: 60 }, (_, i) => `parola${i}`).join(' ');
    const testo = componiTweet(lungo, { link: LINK });
    expect(lunghezzaX(testo)).toBeLessThanOrEqual(280);
    expect(testo.endsWith(`…\n\n${LINK}`)).toBe(true);
    expect(testo).toMatch(/parola\d+…/);
  });

  it('con «mai» tronca senza link, con «sempre» aggiunge il link anche ai post brevi', () => {
    const lungo = 'a'.repeat(300);
    expect(componiTweet(lungo, { link: LINK, politicaLink: 'mai' })).toBe('a'.repeat(278) + '…');
    expect(componiTweet('Breve', { link: LINK, politicaLink: 'sempre' })).toBe(`Breve\n\n${LINK}`);
  });

  it('un post pieno di emoji resta entro il limite contato da X', () => {
    const testo = componiTweet('🔴'.repeat(200), { link: LINK, politicaLink: 'mai' });
    expect(lunghezzaX(testo)).toBeLessThanOrEqual(280);
  });
});
