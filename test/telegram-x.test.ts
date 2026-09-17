import { describe, expect, it, vi } from 'vitest';
import { aggiungiHashtag, componiPostConRiscrittura, componiTweet, componiTweetConRiscrittura, contieneLink, estraiPostCanale, lunghezzaX, opzioniFormato, spezzaInParti, type Riscrittore } from '@/lib/telegram-x';

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
    const testo = componiTweet(post, { firma: '#Politicare' });
    expect(lunghezzaX(testo)).toBeLessThanOrEqual(280);
    expect(testo.startsWith('Titolo di prova abbastanza lungo\n\nParola0')).toBe(true);
    expect(testo.endsWith('…\n\n#Politicare')).toBe(true);
  });

  it('di norma il link non si aggiunge mai, nemmeno ai post tagliati', () => {
    expect(contieneLink(componiTweet('a'.repeat(300), { link: LINK }))).toBe(false);
    const testo = componiTweet('Notizia breve', { link: LINK });
    expect(contieneLink(testo)).toBe(false);
  });

  it('con «se-troncato» un post lungo viene troncato a una parola intera e rimanda alla notizia sul sito', () => {
    const lungo = Array.from({ length: 60 }, (_, i) => `parola${i}`).join(' ');
    const testo = componiTweet(lungo, { link: LINK, politicaLink: 'se-troncato' });
    expect(lunghezzaX(testo)).toBeLessThanOrEqual(280);
    expect(testo.endsWith(`…\n\n${LINK}`)).toBe(true);
    expect(testo).toMatch(/parola\d+…/);
  });

  it('un post lungo viene accorciato per frasi intere, mai a metà frase', () => {
    const frasi = ['Prima frase della notizia con qualche dettaglio.', 'Seconda frase con altri dettagli utili.', 'Terza frase ancora più lunga che spiega il contesto.', 'Quarta frase finale.'];
    const testo = componiTweet(frasi.join(' '), { titolo: 'nessuno', limite: 100 });
    expect(testo).toBe('Prima frase della notizia con qualche dettaglio. Seconda frase con altri dettagli utili.');
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

describe('componiTweetConRiscrittura', () => {
  const lungo = 'Titolo della notizia lunga: ' + Array.from({ length: 50 }, (_, i) => `frase numero ${i} con dettagli.`).join(' ');

  it('un post che entra non viene riscritto', async () => {
    const riscrivi = vi.fn();
    expect(await componiTweetConRiscrittura('Breve notizia.', { firma: '#Politicare' }, riscrivi)).toBe('Breve notizia.\n\n#Politicare');
    expect(riscrivi).not.toHaveBeenCalled();
  });

  it('un post lungo viene riscritto entro il budget e poi formattato', async () => {
    const riscrivi = vi.fn(async (_testo: string, massimo: number, hashtag: number) => {
      expect(massimo).toBe(280 - 13 - 4); // firma «\n\n#Politicare» pesa 13
      expect(hashtag).toBe(0);
      return 'Titolo della notizia lunga: versione corta con gli stessi fatti.';
    });
    const testo = await componiTweetConRiscrittura(lungo, { firma: '#Politicare' }, riscrivi);
    expect(testo).toBe('Titolo della notizia lunga\n\nVersione corta con gli stessi fatti.\n\n#Politicare');
    expect(riscrivi).toHaveBeenCalledTimes(1);
  });

  it('se la riscrittura resta troppo lunga riprova con meno spazio, poi accorcia per frasi intere', async () => {
    const riscrivi = vi.fn<Riscrittore>(async () => lungo);
    const testo = await componiTweetConRiscrittura(lungo, { firma: '#Politicare' }, riscrivi);
    expect(riscrivi).toHaveBeenCalledTimes(2);
    expect(riscrivi.mock.calls[1][1]).toBe(263 - 30);
    expect(lunghezzaX(testo)).toBeLessThanOrEqual(280);
    expect(testo.endsWith('.\n\n#Politicare')).toBe(true);
  });

  it('senza riscrittore accorcia per frasi intere', async () => {
    const testo = await componiTweetConRiscrittura(lungo, { firma: '#Politicare' });
    expect(lunghezzaX(testo)).toBeLessThanOrEqual(280);
    expect(testo).toMatch(/dettagli\.\n\n#Politicare$/);
  });

  it('con gli hashtag richiesti il riscrittore viene chiamato anche per un post breve e sceglie lui le parole', async () => {
    const riscrivi = vi.fn<Riscrittore>(async () => '#Meloni a #Bruxelles per il vertice.');
    const testo = await componiTweetConRiscrittura('Meloni a Bruxelles per il vertice.', { hashtag: 2 }, riscrivi);
    expect(riscrivi).toHaveBeenCalledWith(expect.any(String), 280 - 4 - 2, 2);
    expect(testo).toBe('#Meloni a #Bruxelles per il vertice.');
  });

  it('se il riscrittore non mette hashtag, li aggiunge la regola automatica', async () => {
    const riscrivi = vi.fn<Riscrittore>(async () => 'Meloni a Bruxelles per il vertice.');
    expect(await componiTweetConRiscrittura('Meloni a Bruxelles per il vertice.', { hashtag: 2 }, riscrivi)).toBe('#Meloni a #Bruxelles per il vertice.');
  });
});

describe('aggiungiHashtag', () => {
  it('mette il cancelletto sui nomi propri più rilevanti, fino al massimo richiesto, sulla prima occorrenza', () => {
    const testo = 'Elezioni in Svezia, scarto minimo: la coalizione guidata da Magdalena Andersson è in testa. Lo schieramento di Ulf Kristersson insegue. In Svezia si vota ogni quattro anni.';
    expect(aggiungiHashtag(testo, 3)).toBe(
      'Elezioni in #Svezia, scarto minimo: la coalizione guidata da Magdalena #Andersson è in testa. Lo schieramento di Ulf #Kristersson insegue. In Svezia si vota ogni quattro anni.',
    );
  });

  it('salta articoli, parole generiche, parole dopo apostrofo o con trattino', () => {
    expect(aggiungiHashtag("Il governo ha deciso. Alla misura non ha aderito l'Italia. Vittoria in Sassonia-Anhalt.")).toBe(
      "Il governo ha deciso. Alla misura non ha aderito l'Italia. Vittoria in Sassonia-Anhalt.",
    );
    expect(aggiungiHashtag('Fratoianni commenta la vittoria di AFD: "Salvini esulta".', 3)).toBe('#Fratoianni commenta la vittoria di #AFD: "#Salvini esulta".');
  });

  it('riconosce i nomi composti nella forma usata su X e rispetta il massimo', () => {
    expect(aggiungiHashtag('Dodici paesi, tra cui Regno Unito, Francia, Canada e Spagna, hanno imposto sanzioni.', 2)).toBe(
      'Dodici paesi, tra cui #RegnoUnito, #Francia, Canada e Spagna, hanno imposto sanzioni.',
    );
    expect(aggiungiHashtag('Il Partito Democratico attacca Fratelli d’Italia sulla manovra.', 3)).toBe('Il #PD attacca #FdI sulla manovra.');
    expect(aggiungiHashtag('Il Partito Democratico attacca Fratelli d’Italia sulla manovra.')).toBe('Il #PD attacca Fratelli d’Italia sulla manovra.');
    expect(aggiungiHashtag('Meloni a Bruxelles.', 0)).toBe('Meloni a Bruxelles.');
  });

  it('il formato predefinito chiede tre hashtag e nessuna firma', () => {
    const opzioni = opzioniFormato({});
    expect(opzioni).toMatchObject({ hashtag: 3, firma: '' });
    expect(opzioniFormato({ X_HASHTAG: '0' }).hashtag).toBe(0);
    expect(componiTweet('Meloni a Bruxelles per il vertice.', opzioni)).toBe('#Meloni a #Bruxelles per il vertice.');
    expect(componiTweet('Meloni a Bruxelles per il vertice.', { ...opzioni, hashtag: 1 })).toBe('#Meloni a Bruxelles per il vertice.');
  });

  it('con un hashtag solo sceglie il nome politico, non cariche, testate o parole generiche', () => {
    const nordio = "Secondo un'indiscrezione del Fatto Quotidiano, il Ministro della Giustizia Nordio, di FdI, potrebbe rimanere senza seggio in Veneto; la premier Meloni ha ribadito la volontà di ricandidare tutti i ministri.";
    expect(aggiungiHashtag(nordio)).toBe(nordio.replace('Giustizia Nordio', 'Giustizia #Nordio'));
    const procaccini = 'Nicola Procaccini, capodelegazione FdI al Parlamento europeo, attacca von der Leyen: "Imbarazzante inchino di Von Der Leyen a Carney".';
    expect(aggiungiHashtag(procaccini)).toBe('Nicola #Procaccini, capodelegazione FdI al Parlamento europeo, attacca von der Leyen: "Imbarazzante inchino di Von Der Leyen a Carney".');
    expect(aggiungiHashtag(procaccini, 2)).toBe('Nicola #Procaccini, capodelegazione #FdI al Parlamento europeo, attacca von der Leyen: "Imbarazzante inchino di Von Der Leyen a Carney".');
  });

  it('corregge il refuso «Fdl» in «FdI»', () => {
    expect(componiTweet('Nicola Procaccini, capodelegazione Fdl al Parlamento europeo.', { hashtag: 0 })).toBe('Nicola Procaccini, capodelegazione FdI al Parlamento europeo.');
  });
});

describe('thread al posto del taglio', () => {
  const UNO = opzioniFormato({ X_HASHTAG: '1' });
  const frasi = ['Prima frase della notizia con qualche dettaglio.', 'Seconda frase con altri dettagli utili.', 'Terza frase ancora più lunga che spiega il contesto.', 'Quarta frase finale.'];

  it('spezzaInParti tiene le frasi intere e rispetta il budget del primo post', () => {
    expect(spezzaInParti(frasi.join(' '), 100)).toEqual([
      'Prima frase della notizia con qualche dettaglio. Seconda frase con altri dettagli utili.',
      'Terza frase ancora più lunga che spiega il contesto. Quarta frase finale.',
    ]);
    expect(spezzaInParti(frasi.join(' '), 100, 60)).toEqual([
      'Prima frase della notizia con qualche dettaglio.',
      'Seconda frase con altri dettagli utili. Terza frase ancora più lunga che spiega il contesto.',
      'Quarta frase finale.',
    ]);
  });

  it('una frase che da sola non entra si spezza a una pausa, mai a metà parola né con puntini', () => {
    const lunga = 'Il ministro potrebbe restare senza seggio in Veneto vista la nuova legge elettorale; la premier ha ribadito la volontà di ricandidare tutti i ministri, come già annunciato in conferenza stampa, senza eccezioni.';
    const parti = spezzaInParti(lunga, 120);
    expect(parti).toEqual([
      'Il ministro potrebbe restare senza seggio in Veneto vista la nuova legge elettorale.',
      'La premier ha ribadito la volontà di ricandidare tutti i ministri, come già annunciato in conferenza stampa.',
      'Senza eccezioni.',
    ]);
    for (const parte of parti) expect(lunghezzaX(parte)).toBeLessThanOrEqual(120);
    expect(parti.join(' ')).not.toContain('…');
  });

  it('un post che entra esce da solo; uno lungo senza riscrittore diventa un thread con titolo e hashtag solo nel primo', async () => {
    expect(await componiPostConRiscrittura('Meloni a Bruxelles per il vertice.', UNO)).toEqual(['#Meloni a Bruxelles per il vertice.']);
    const post = 'Salvini attacca il governo: ' + frasi.join(' ');
    const parti = await componiPostConRiscrittura(post, { ...UNO, limite: 110 });
    expect(parti).toEqual([
      '#Salvini attacca il governo\n\nPrima frase della notizia con qualche dettaglio.',
      'Seconda frase con altri dettagli utili. Terza frase ancora più lunga che spiega il contesto.',
      'Quarta frase finale.',
    ]);
    for (const parte of parti) expect(lunghezzaX(parte)).toBeLessThanOrEqual(110);
  });

  it('un post che entra resta parola per parola: se Claude cambia il testo, si scarta e vale la regola automatica', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const originale = 'Meloni a Bruxelles per il vertice sui dazi. La premier vede von der Leyen.';
    const manomesso = vi.fn<Riscrittore>(async () => '#Meloni vola a Bruxelles per il vertice sui dazi e incontra von der Leyen.');
    expect(await componiPostConRiscrittura(originale, UNO, manomesso)).toEqual(['#Meloni a Bruxelles per il vertice sui dazi\n\nLa premier vede von der Leyen.']);
    const unite = vi.fn<Riscrittore>(async () => '#Meloni a #Bruxelles per il #VerticeSuiDazi. La premier vede von der Leyen.');
    expect(await componiPostConRiscrittura(originale, opzioniFormato({}), unite)).toEqual(['#Meloni a #Bruxelles per il #VerticeSuiDazi\n\nLa premier vede von der Leyen.']);
    const soloCancelletto = vi.fn<Riscrittore>(async () => 'Meloni a #Bruxelles per il vertice sui dazi. La premier vede von der Leyen.');
    expect(await componiPostConRiscrittura(originale, UNO, soloCancelletto)).toEqual(['Meloni a #Bruxelles per il vertice sui dazi\n\nLa premier vede von der Leyen.']);
  });

  it('con il riscrittore prova prima a fare un post solo; se non basta, thread', async () => {
    const post = 'Salvini attacca il governo: ' + frasi.join(' ');
    const corto = vi.fn<Riscrittore>(async () => 'Salvini attacca il governo: #Salvini in due frasi. Fine.');
    expect(await componiPostConRiscrittura(post, { ...UNO, limite: 110 }, corto)).toEqual(['Salvini attacca il governo\n\n#Salvini in due frasi. Fine.']);
    const rotto = vi.fn<Riscrittore>(async () => {
      throw new Error('quota');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const parti = await componiPostConRiscrittura(post, { ...UNO, limite: 110 }, rotto);
    expect(parti).toHaveLength(3);
    expect(parti[0]).toMatch(/^#Salvini attacca il governo\n\n/);
  });
});
