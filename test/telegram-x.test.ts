import { describe, expect, it } from 'vitest';
import { componiTweet, contieneLink, estraiPostCanale, lunghezzaX, opzioniFormato } from '@/lib/telegram-x';

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
    expect(componiTweet('🔴 Ultim’ora: approvata la legge.\n\nIl testo passa al Senato.\n@politicare', { link: LINK, titolo: 'nessuno' })).toBe(
      '🔴 Ultim’ora: approvata la legge.\n\nIl testo passa al Senato.',
    );
  });

  it('stile agenzia: la prima frase diventa il titolo, poi il corpo, poi la firma', () => {
    const post = '🇸🇪Elezioni in Svezia, scarto minimo: si dovrà aspettare mercoledì per il conteggio. I risultati vedono il centrosinistra in testa.\n@Politicare';
    expect(componiTweet(post, { firma: '#Politicare' })).toBe(
      '🇸🇪 Elezioni in Svezia, scarto minimo\n\nSi dovrà aspettare mercoledì per il conteggio. I risultati vedono il centrosinistra in testa.\n\n#Politicare',
    );
    expect(componiTweet(post, { titolo: 'maiuscolo' })).toMatch(/^🇸🇪 ELEZIONI IN SVEZIA, SCARTO MINIMO\n\nSi dovrà/);
  });

  it('senza una frase breve iniziale il post resta un paragrafo unico', () => {
    const post = 'Corte dei Conti, Vittorio Sgarbi assolto dall’accusa di danno erariale in merito al filone dei danni dovuti ai compensi ricevuti per le conferenze tenute tra il 2022 e il 2024. La procura chiedeva 200mila euro.';
    expect(componiTweet(post)).toBe(post);
    expect(componiTweet('Una sola frase senza seguito.')).toBe('Una sola frase senza seguito.');
  });

  it('con titolo e firma il taglio cade sul corpo e il totale resta entro 280', () => {
    const post = 'Titolo di prova abbastanza lungo: ' + Array.from({ length: 60 }, (_, i) => `parola${i}`).join(' ');
    const testo = componiTweet(post, { link: LINK, firma: '#Politicare' });
    expect(lunghezzaX(testo)).toBeLessThanOrEqual(280);
    expect(testo.startsWith('Titolo di prova abbastanza lungo\n\nParola0')).toBe(true);
    expect(testo.endsWith(`…\n\n${LINK}\n\n#Politicare`)).toBe(true);
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
    expect(componiTweet('Breve', { link: LINK, politicaLink: 'sempre', firma: '#Politicare' })).toBe(`Breve\n\n${LINK}\n\n#Politicare`);
  });

  it('un post pieno di emoji resta entro il limite contato da X', () => {
    const testo = componiTweet('🔴'.repeat(200), { link: LINK, politicaLink: 'mai' });
    expect(lunghezzaX(testo)).toBeLessThanOrEqual(280);
  });

  it('toglie i caratteri invisibili e stacca le bandiere iniziali dal testo', () => {
    expect(componiTweet('🇩🇪🇮🇹Fratoianni commenta.\u200b Testo.', { titolo: 'nessuno' })).toBe('🇩🇪🇮🇹 Fratoianni commenta. Testo.');
    expect(componiTweet('🔴 Già staccato.', { titolo: 'nessuno' })).toBe('🔴 Già staccato.');
  });

  it('con X Premium il limite si alza e il post lungo esce intero, senza link', () => {
    const lungo = Array.from({ length: 60 }, (_, i) => `parola${i}`).join(' ');
    const opzioni = opzioniFormato({ X_LIMITE: '25000', X_FIRMA: '' });
    expect(componiTweet(lungo, { ...opzioni, link: LINK })).toBe(lungo);
    expect(opzioniFormato({}).limite).toBe(280);
  });
});
