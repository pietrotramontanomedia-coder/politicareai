import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Il webhook accetta solo Telegram, pubblica una volta sola e dice a Telegram quando riprovare. */

const pubblicaSuX = vi.fn(async () => ({ id: '999' }));
const scaricaFotoTelegram = vi.fn(async () => ({ dati: Buffer.from('jpg'), tipo: 'image/jpeg' }));
const registro = new Map<number, { x: string; data: string }>();

vi.mock('@/lib/x-server', () => ({
  pubblicaSuX: (...args: unknown[]) => pubblicaSuX(...(args as [])),
  rifiutatoDaX: (e: unknown) => e instanceof Error && e.message === 'rifiutato',
  xConfigurato: () => true,
}));
vi.mock('@/lib/telegram-bot-server', async (originale) => ({
  ...(await originale<typeof import('@/lib/telegram-bot-server')>()),
  scaricaFotoTelegram: (...args: unknown[]) => scaricaFotoTelegram(...(args as [])),
}));
vi.mock('@/lib/telegram-x-registro', () => ({
  giaPubblicato: async (n: number) => registro.get(n) ?? null,
  registraPubblicazione: async (n: number, x: string) => void registro.set(n, { x, data: 'ora' }),
}));

const SEGRETO = 'segreto-di-prova';
const chat = { id: -1, type: 'channel', username: 'politicare' };

function richiesta(corpo: unknown, segreto = SEGRETO) {
  return new Request('http://sito/api/telegram/x', {
    method: 'POST',
    headers: { 'x-telegram-bot-api-secret-token': segreto, 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
}

describe('webhook Telegram → X', () => {
  beforeEach(() => {
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', SEGRETO);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    pubblicaSuX.mockClear();
    scaricaFotoTelegram.mockClear();
    registro.clear();
  });

  it('rifiuta chi non conosce il segreto', async () => {
    const { POST } = await import('@/app/api/telegram/x/route');
    const risposta = await POST(richiesta({ channel_post: { message_id: 1, chat, text: 'x' } }, 'sbagliato'));
    expect(risposta.status).toBe(401);
    expect(pubblicaSuX).not.toHaveBeenCalled();
  });

  it('pubblica un post con foto e lo segna nel registro', async () => {
    const { POST } = await import('@/app/api/telegram/x/route');
    const post = { message_id: 42, chat, caption: 'Notizia con foto @politicare', photo: [{ file_id: 'f1', width: 800 }] };
    const risposta = await POST(richiesta({ channel_post: post }));

    expect(await risposta.json()).toEqual({ ok: true, x: '999' });
    expect(scaricaFotoTelegram).toHaveBeenCalledWith('f1');
    expect(pubblicaSuX).toHaveBeenCalledWith('Notizia con foto\n\n#Politicare', { dati: Buffer.from('jpg'), tipo: 'image/jpeg' });
    expect(registro.get(42)?.x).toBe('999');

    const ripetuta = await POST(richiesta({ channel_post: post }));
    expect(await ripetuta.json()).toMatchObject({ ok: true, ignorato: 'già pubblicato', x: '999' });
    expect(pubblicaSuX).toHaveBeenCalledTimes(1);
  });

  it('ignora altri canali, modifiche e foto senza testo', async () => {
    const { POST } = await import('@/app/api/telegram/x/route');
    const casi = [
      { channel_post: { message_id: 1, chat: { ...chat, username: 'altro' }, text: 'x' } },
      { edited_channel_post: { message_id: 1, chat, text: 'x' } },
      { channel_post: { message_id: 2, chat, photo: [{ file_id: 'f2', width: 10 }], media_group_id: 'g' } },
    ];
    for (const caso of casi) {
      const risposta = await POST(richiesta(caso));
      expect(risposta.status).toBe(200);
      expect(await risposta.json()).toMatchObject({ ok: true });
    }
    expect(pubblicaSuX).not.toHaveBeenCalled();
  });

  it('risponde 503 se X non è raggiungibile, così Telegram riprova; 200 se X rifiuta il post', async () => {
    const { POST } = await import('@/app/api/telegram/x/route');
    pubblicaSuX.mockRejectedValueOnce(new Error('rete'));
    const primo = await POST(richiesta({ channel_post: { message_id: 7, chat, text: 'Notizia' } }));
    expect(primo.status).toBe(503);
    expect(registro.has(7)).toBe(false);

    pubblicaSuX.mockRejectedValueOnce(new Error('rifiutato'));
    const secondo = await POST(richiesta({ channel_post: { message_id: 7, chat, text: 'Notizia' } }));
    expect(secondo.status).toBe(200);
    expect(await secondo.json()).toMatchObject({ ok: false, error: 'rifiutato' });
  });
});
