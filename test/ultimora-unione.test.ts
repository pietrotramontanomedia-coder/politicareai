import { afterEach, describe, expect, it, vi } from 'vitest';
import { inizioDiIeri } from '@/lib/live-giornaliera';
import { leggiMessaggiTelegram } from '@/lib/telegram-server';
import { unisciNotizie, type NotiziaUltimOra } from '@/lib/ultimora-server';

const voce = (id: string, data: string, titolo: string, fonte: 'telegram' | 'instagram' = 'telegram'): NotiziaUltimOra => ({ id, data, titolo, testo: '', fonte });

describe('unione delle notizie', () => {
  it('tiene tutti i post di una diretta, anche se cominciano con le stesse parole', () => {
    const inizio = 'LeggeElettorale, live adesso il voto finale a Montecitorio - ';
    const telegram = [
      voce('tg-3', '2026-10-08T09:53:00Z', `${inizio}Benigni (FI) alla sinistra`),
      voce('tg-2', '2026-10-08T09:48:00Z', `${inizio}Conte (M5S) annuncia il no`),
      voce('tg-1', '2026-10-08T09:31:00Z', `${inizio}Bonelli (AVS)`),
    ];
    expect(unisciNotizie([], telegram).map((n) => n.id)).toEqual(['tg-3', 'tg-2', 'tg-1']);
  });

  it('scarta il post Instagram che ripete una notizia già su Telegram', () => {
    const telegram = [voce('tg-1', '2026-10-08T09:00:00Z', 'Mattarella concede tre grazie')];
    const instagram = [
      voce('ig-1', '2026-10-08T10:00:00Z', 'Mattarella concede tre grazie', 'instagram'),
      voce('ig-2', '2026-10-08T11:00:00Z', 'Un altro post', 'instagram'),
    ];
    expect(unisciNotizie(instagram, telegram).map((n) => n.id)).toEqual(['ig-2', 'tg-1']);
  });
});

describe('lettura del canale a pagine', () => {
  afterEach(() => vi.unstubAllGlobals());

  const pagina = (numeri: number[], data: (n: number) => string) =>
    numeri
      .map(
        (n) =>
          `<div class="tgme_widget_message" data-post="politicare/${n}"><div class="tgme_widget_message_text">Notizia ${n}.</div><time datetime="${data(n)}"></time></div>`,
      )
      .join('');

  it('con `da` torna indietro finché non supera quel momento', async () => {
    const richieste: string[] = [];
    const data = (n: number) => new Date(Date.UTC(2026, 9, 8, 0, 0) + (n - 100) * 3_600_000).toISOString();
    vi.stubGlobal('fetch', async (url: string) => {
      richieste.push(url);
      const prima = Number(new URL(url).searchParams.get('before') ?? 141);
      const numeri = Array.from({ length: 20 }, (_, i) => prima - 20 + i).filter((n) => n > 0);
      return new Response(pagina(numeri, data));
    });
    const messaggi = await leggiMessaggiTelegram({ da: new Date('2026-10-07T12:00:00Z') });
    expect(richieste).toEqual(['https://t.me/s/politicare', 'https://t.me/s/politicare?before=121', 'https://t.me/s/politicare?before=101']);
    expect(messaggi).toHaveLength(60);
    expect(messaggi[0].numero).toBe(140);
  });

  it('senza `da` legge una pagina sola', async () => {
    const richieste: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      richieste.push(url);
      return new Response(pagina([1, 2], () => '2026-10-08T09:00:00Z'));
    });
    await leggiMessaggiTelegram();
    expect(richieste).toHaveLength(1);
  });
});

describe('inizio di ieri', () => {
  it('è la mezzanotte di Roma, con ora legale e solare', () => {
    expect(inizioDiIeri(new Date('2026-10-08T10:00:00Z')).toISOString()).toBe('2026-10-06T22:00:00.000Z');
    expect(inizioDiIeri(new Date('2026-12-08T10:00:00Z')).toISOString()).toBe('2026-12-06T23:00:00.000Z');
  });
});
