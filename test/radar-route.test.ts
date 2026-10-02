import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatoRadar } from '@/lib/radar-registro';
import type { Valutazione } from '@/lib/radar';

/* Il radar gira solo se acceso, valuta i temi che salgono e manda le bozze in privato, mai su X. */

let stato: StatoRadar;
let tendenze = [{ nome: '#Premierato', volume: 9000 }, { nome: '#Manovra', volume: 4000 }];
let orari = [100, 100, 100, 400, 10];
let valutazione: Valutazione;
const inviaAvvisoTelegram = vi.fn<(testo: string) => Promise<void>>(async () => {});
let telegramConfigurato = true;
const valutaTendenza = vi.fn(async () => valutazione);
const campionePost = vi.fn(async () => [{ testo: 'Oggi in Senato', autore: 'qualcuno', like: 3, repost: 1 }]);

vi.mock('@/lib/radar-registro', () => ({
  leggiStato: async () => structuredClone(stato),
  salvaStato: async (nuovo: StatoRadar) => void (stato = nuovo),
}));
vi.mock('@/lib/radar-x-server', () => ({
  letturaXConfigurata: () => true,
  leggiTendenze: async () => tendenze,
  conteggiOrari: async () => orari,
  campionePost: (...args: unknown[]) => campionePost(...(args as [])),
}));
const scremaTendenze = vi.fn(async (nomi: string[]) => new Set(nomi));
vi.mock('@/lib/radar-claude-server', () => ({
  valutazioneDisponibile: () => true,
  valutaTendenza: (...args: unknown[]) => valutaTendenza(...(args as [])),
  scremaTendenze: (nomi: string[]) => scremaTendenze(nomi),
}));
vi.mock('@/lib/radar-telegram-server', () => ({
  avvisiTelegramConfigurati: () => telegramConfigurato,
  inviaAvvisoTelegram: (testo: string) => inviaAvvisoTelegram(testo),
  descriviDestinatario: async () => ({ bot: '@radar_bot (Radar)', chat: 'private «Pietro»' }),
}));

const SEGRETO = 'segreto-cron';

function richiesta(query = '', segreto = SEGRETO) {
  return new Request(`http://sito/api/radar${query}`, { headers: { authorization: `Bearer ${segreto}` } });
}

async function chiama(query = '') {
  const { GET } = await import('@/app/api/radar/route');
  const risposta = await GET(richiesta(query));
  return { status: risposta.status, corpo: await risposta.json() };
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SEGRETO);
  vi.stubEnv('RADAR_MODALITA', 'avvisa');
  telegramConfigurato = true;
  vi.stubEnv('RADAR_ORARIO', '0-24');
  vi.stubEnv('RADAR_MASSIMO_GIORNO', '10');
  // Un'ora fa in classifica c'era solo la manovra: il premierato è nuovo.
  stato = {
    rilevazioni: [{ quando: new Date(Date.now() - 3_600_000).toISOString(), tendenze: [{ nome: '#Manovra', volume: 4000 }] }],
    avvisi: [],
  };
  tendenze = [{ nome: '#Premierato', volume: 9000 }, { nome: '#Manovra', volume: 4000 }];
  orari = [100, 100, 100, 400, 10];
  valutazione = {
    pertinente: true,
    motivo: 'riforma costituzionale',
    tema: 'Il Senato vota il premierato',
    gancio: null,
    bozze: ['Oggi il Senato vota il #Premierato.'],
    verifiche: [],
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('/api/radar', () => {
  it('senza il segreto del cron non fa nulla', async () => {
    const { GET } = await import('@/app/api/radar/route');
    const risposta = await GET(richiesta('', 'sbagliato'));
    expect(risposta.status).toBe(401);
    expect(valutaTendenza).not.toHaveBeenCalled();
  });

  it('spento finché RADAR_MODALITA non è impostata', async () => {
    vi.stubEnv('RADAR_MODALITA', '');
    const { corpo } = await chiama();
    expect(corpo.attivo).toBe(false);
    expect(valutaTendenza).not.toHaveBeenCalled();
  });

  it('un tema nuovo che accelera viene valutato e mandato in privato, e non si ripete', async () => {
    const { corpo } = await chiama();
    expect(corpo.valutati).toEqual([expect.objectContaining({ nome: '#Premierato', esito: 'inviato', accelerazione: 4 })]);
    expect(inviaAvvisoTelegram).toHaveBeenCalledTimes(1);
    expect(inviaAvvisoTelegram).toHaveBeenCalledWith(expect.stringContaining('Oggi il Senato vota il #Premierato.'));
    expect(stato.avvisi.map((a) => a.chiave)).toEqual(['premierato']);
    expect(stato.rilevazioni).toHaveLength(2);

    // Al giro dopo il tema è a riposo.
    stato.rilevazioni[0].quando = new Date(Date.now() - 2 * 3_600_000).toISOString();
    stato.rilevazioni[1].quando = new Date(Date.now() - 3_600_000).toISOString();
    stato.rilevazioni[1].tendenze = [{ nome: '#Manovra', volume: 4000 }];
    await chiama();
    expect(inviaAvvisoTelegram).toHaveBeenCalledTimes(1);
  });

  it('un tema che non accelera non arriva a Claude', async () => {
    orari = [100, 100, 100, 110, 10];
    const { corpo } = await chiama();
    expect(corpo.valutati[0].esito).toBe('non accelera');
    expect(valutaTendenza).not.toHaveBeenCalled();
    expect(campionePost).not.toHaveBeenCalled();
  });

  it('un tema non pertinente viene registrato ma non inviato', async () => {
    valutazione = { ...valutazione, pertinente: false, bozze: [] };
    const { corpo } = await chiama();
    expect(corpo.valutati[0].esito).toBe('non pertinente');
    expect(inviaAvvisoTelegram).not.toHaveBeenCalled();
    expect(stato.avvisi).toHaveLength(1);
  });

  it('in modalità registra prepara le bozze ma non manda messaggi', async () => {
    vi.stubEnv('RADAR_MODALITA', 'registra');
    const { corpo } = await chiama();
    expect(corpo.valutati[0]).toMatchObject({ esito: 'registrato', bozze: ['Oggi il Senato vota il #Premierato.'] });
    expect(inviaAvvisoTelegram).not.toHaveBeenCalled();
    expect(stato.avvisi[0].inviato).toBe(false);
  });

  it('la prova gira anche da spento, non invia e non mette il tema a riposo', async () => {
    vi.stubEnv('RADAR_MODALITA', '');
    const { corpo } = await chiama('?prova=1');
    expect(corpo.modalita).toBe('prova');
    expect(corpo.valutati[0].esito).toBe('registrato');
    expect(inviaAvvisoTelegram).not.toHaveBeenCalled();
    expect(stato.avvisi).toEqual([]);
  });

  it('raggiunto il tetto giornaliero registra la classifica ma non valuta', async () => {
    vi.stubEnv('RADAR_MASSIMO_GIORNO', '1');
    stato.avvisi = [
      { chiave: 'altro', nome: 'Altro', quando: new Date().toISOString(), inviato: false, forza: 1, motivo: '', accelerazione: null, valutazione },
    ];
    const { corpo } = await chiama();
    expect(corpo.valutati).toEqual([]);
    expect(corpo.tetto).toContain('tetto di 1');
    expect(valutaTendenza).not.toHaveBeenCalled();
    expect(stato.rilevazioni).toHaveLength(2);
  });

  it('un giro a meno di 55 minuti dal precedente non legge nulla', async () => {
    stato.rilevazioni[0].quando = new Date(Date.now() - 10 * 60_000).toISOString();
    const { corpo } = await chiama();
    expect(corpo.attivo).toBe(false);
    expect(stato.rilevazioni).toHaveLength(1);
  });

  it('fuori orario non legge nemmeno le tendenze', async () => {
    vi.stubEnv('RADAR_ORARIO', '0-1');
    vi.useFakeTimers({ now: new Date('2026-10-01T10:00:00Z'), toFake: ['Date'] });
    try {
      const { corpo } = await chiama();
      expect(corpo.attivo).toBe(false);
      expect(stato.rilevazioni).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('con RADAR_CAMPIONE=0 non legge i post e Claude valuta solo dal nome', async () => {
    vi.stubEnv('RADAR_CAMPIONE', '0');
    const { corpo } = await chiama();
    expect(corpo.valutati[0].esito).toBe('inviato');
    expect(campionePost).not.toHaveBeenCalled();
  });

  it('senza il bot del radar valuta ma non invia, e lo dice', async () => {
    telegramConfigurato = false;
    const { corpo } = await chiama();
    expect(corpo.valutati[0].esito).toBe('registrato');
    expect(corpo.avviso).toContain('RADAR_TELEGRAM_BOT_TOKEN');
    expect(inviaAvvisoTelegram).not.toHaveBeenCalled();
  });

  it('se Claude sbaglia, il giro continua e la classifica viene salvata', async () => {
    valutaTendenza.mockRejectedValueOnce(new Error('rete'));
    const { status, corpo } = await chiama();
    expect(status).toBe(200);
    expect(corpo.valutati[0]).toMatchObject({ esito: 'errore', dettaglio: 'rete' });
    expect(stato.rilevazioni).toHaveLength(2);
    expect(stato.avvisi).toEqual([]);
  });

  it('il filtro scarta i temi non politici prima della valutazione, che va al tema politico', async () => {
    tendenze = [{ nome: 'Bridgerton', volume: 20000 }, { nome: '#Premierato', volume: 9000 }, { nome: '#Manovra', volume: 4000 }];
    scremaTendenze.mockImplementationOnce(async (nomi: string[]) => new Set(nomi.filter((n) => n !== 'Bridgerton')));
    const { corpo } = await chiama();
    expect(corpo.scartati).toEqual(['Bridgerton']);
    expect(corpo.valutati).toEqual([expect.objectContaining({ nome: '#Premierato', esito: 'inviato' })]);
    expect(valutaTendenza).toHaveBeenCalledTimes(1);
  });

  it('se il filtro non risponde si valutano i segnali come prima', async () => {
    scremaTendenze.mockRejectedValueOnce(new Error('rete'));
    const { corpo } = await chiama();
    expect(corpo.valutati).toEqual([expect.objectContaining({ nome: '#Premierato', esito: 'inviato' })]);
  });
});
