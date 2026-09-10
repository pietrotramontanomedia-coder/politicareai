import { describe, expect, it } from 'vitest';
import { etichettaGiorno, formattaDataRelativa, formattaOra, raggruppaPerGiorno } from '@/lib/data-ora';
import { CANALE_TELEGRAM } from '@/lib/telegram-server';
import { FONTI_ULTIMORA } from '@/lib/ultimora-testi';

const ADESSO = new Date('2026-09-10T20:00:00+02:00');

describe("date delle ultim'ora", () => {
  it("mostra l'ora nel fuso di Roma", () => {
    expect(formattaOra('2026-09-10T13:27:00Z')).toBe('15:27');
  });

  it('etichetta i giorni: oggi, ieri e poi il giorno per esteso', () => {
    expect(etichettaGiorno('2026-09-10T08:00:00+02:00', ADESSO)).toBe('Oggi');
    expect(etichettaGiorno('2026-09-09T22:30:00Z', ADESSO)).toBe('Oggi');
    expect(etichettaGiorno('2026-09-09T23:30:00+02:00', ADESSO)).toBe('Ieri');
    expect(etichettaGiorno('2026-09-06T12:00:00+02:00', ADESSO)).toBe('domenica 6 settembre');
    expect(etichettaGiorno('2025-12-31T12:00:00+01:00', ADESSO)).toBe('mercoledì 31 dicembre 2025');
  });

  it('la data relativa usa il momento passato come riferimento', () => {
    expect(formattaDataRelativa('2026-09-10T09:05:00+02:00', ADESSO)).toBe('09:05');
    expect(formattaDataRelativa('2026-09-09T09:05:00+02:00', ADESSO)).toBe('Ieri');
    expect(formattaDataRelativa('2026-09-08T09:05:00+02:00', ADESSO)).toBe("L'altro ieri");
  });

  it('raggruppa per giorno mantenendo l’ordine dalla più recente', () => {
    const voci = [
      { id: 'a', orario: '2026-09-10T18:00:00+02:00' },
      { id: 'b', orario: '2026-09-10T09:00:00+02:00' },
      { id: 'c', orario: '2026-09-09T21:00:00+02:00' },
      { id: 'd', orario: '2026-09-06T10:00:00+02:00' },
    ];
    const gruppi = raggruppaPerGiorno(voci, ADESSO);
    expect(gruppi.map((g) => g.etichetta)).toEqual(['Oggi', 'Ieri', 'domenica 6 settembre']);
    expect(gruppi.map((g) => g.voci.map((v) => v.id))).toEqual([['a', 'b'], ['c'], ['d']]);
  });
});

describe("fonti delle ultim'ora", () => {
  it('il link Telegram punta al canale da cui leggiamo i messaggi', () => {
    expect(FONTI_ULTIMORA.telegram.url).toBe(`https://t.me/${CANALE_TELEGRAM}`);
  });
});
