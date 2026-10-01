import { describe, expect, it } from 'vitest';
import {
  accelerazione,
  chiaveTema,
  componiAvviso,
  fuoriTema,
  inOrario,
  linkScrivi,
  opzioniRadar,
  pota,
  querySuX,
  segnaliDaValutare,
  trovaSegnali,
  troppoPresto,
  valutazioniRimaste,
  type Rilevazione,
  type Valutazione,
} from '@/lib/radar';

/* Il radar segnala i temi che salgono su X, non quelli che ci sono sempre. */

const t = (nome: string, volume: number | null = null) => ({ nome, volume });

function rilevazione(quando: string, nomi: (string | [string, number])[]): Rilevazione {
  return { quando, tendenze: nomi.map((n) => (Array.isArray(n) ? t(n[0], n[1]) : t(n))) };
}

describe('trovaSegnali', () => {
  const unOraFa = rilevazione('2026-10-01T09:00:00Z', ['#Manovra', 'Meloni', ['Schlein', 1000], 'A', 'B', 'C', 'D', 'Conte']);

  it('senza storico non segnala nulla: il primo giro serve a registrare', () => {
    expect(trovaSegnali([], rilevazione('2026-10-01T10:00:00Z', ['#Premierato']))).toEqual([]);
  });

  it('segnala un tema nuovo in classifica, più forte se è in alto', () => {
    const adesso = rilevazione('2026-10-01T10:00:00Z', ['#Premierato', '#Manovra', 'Meloni', 'Tajani']);
    const segnali = trovaSegnali([unOraFa], adesso);
    expect(segnali.map((s) => s.nome)).toEqual(['#Premierato', 'Tajani']);
    expect(segnali[0].motivo).toBe('nuovo in classifica, 1° posto');
    expect(segnali[0].forza).toBeGreaterThan(segnali[1].forza);
  });

  it('segnala chi sale di almeno 3 posizioni o cresce di volume, non chi resta fermo', () => {
    const adesso = rilevazione('2026-10-01T10:00:00Z', ['Conte', '#Manovra', 'Meloni', ['Schlein', 2500]]);
    const segnali = trovaSegnali([unOraFa], adesso);
    expect(segnali.find((s) => s.nome === 'Conte')?.motivo).toBe('da 8° a 1° posto');
    expect(segnali.find((s) => s.nome === 'Schlein')?.motivo).toBe('volume ×2.5');
    expect(segnali.find((s) => s.nome === 'Meloni')).toBeUndefined();
  });

  it('scarta calcio, saluti e spettacolo senza spendere una valutazione', () => {
    const adesso = rilevazione('2026-10-01T10:00:00Z', ['#Buongiorno', 'Inter', '#GFVip', '#SerieA', '#Premierato']);
    expect(trovaSegnali([unOraFa], adesso).map((s) => s.nome)).toEqual(['#Premierato']);
    expect(fuoriTema('Sabato')).toBe(true);
    expect(fuoriTema('#Senato')).toBe(false);
  });

  it('confronta con il giro di circa un\'ora fa, non con quello di 5 minuti fa', () => {
    const cinqueMinutiFa = rilevazione('2026-10-01T09:55:00Z', ['#Premierato']);
    const adesso = rilevazione('2026-10-01T10:00:00Z', ['#Premierato']);
    expect(trovaSegnali([unOraFa, cinqueMinutiFa], adesso).map((s) => s.nome)).toEqual(['#Premierato']);
    expect(trovaSegnali([cinqueMinutiFa], adesso)).toEqual([]);
  });

  it('dopo la pausa notturna non confronta con la sera prima: il primo giro registra soltanto', () => {
    const ieriSera = rilevazione('2026-09-30T21:00:00Z', ['#Manovra']);
    const stamattina = rilevazione('2026-10-01T06:00:00Z', ['#Premierato', '#Manovra']);
    expect(trovaSegnali([ieriSera], stamattina)).toEqual([]);
  });

  it('riconosce lo stesso tema scritto in modo diverso', () => {
    expect(chiaveTema('#LeggeElettorale')).toBe(chiaveTema('Legge elettorale'));
    expect(chiaveTema('Città')).toBe('citta');
    const adesso = rilevazione('2026-10-01T10:00:00Z', ['#manovra']);
    expect(trovaSegnali([unOraFa], adesso)).toEqual([]);
  });
});

describe('segnaliDaValutare', () => {
  const adesso = new Date('2026-10-01T10:00:00Z');
  const segnali = trovaSegnali(
    [rilevazione('2026-10-01T09:00:00Z', ['X'])],
    rilevazione('2026-10-01T10:00:00Z', ['#Premierato', 'Tajani', 'Vannacci']),
  );

  it('non ripropone un tema già valutato nelle ultime ore e si ferma al massimo', () => {
    const avvisi = [{ chiave: 'premierato', quando: '2026-10-01T05:00:00Z' }];
    expect(segnaliDaValutare(segnali, avvisi, { valutazioni: 1, riposoOre: 12 }, adesso).map((s) => s.nome)).toEqual(['Tajani']);
  });

  it('dopo il riposo il tema torna valutabile', () => {
    const avvisi = [{ chiave: 'premierato', quando: '2026-09-30T20:00:00Z' }];
    expect(segnaliDaValutare(segnali, avvisi, { valutazioni: 1, riposoOre: 12 }, adesso).map((s) => s.nome)).toEqual(['#Premierato']);
  });
});

describe('accelerazione', () => {
  it("confronta l'ultima ora completa con la media delle tre prima, ignorando l'ora in corso", () => {
    expect(accelerazione([100, 100, 100, 300, 5])).toBe(3);
    expect(accelerazione([100, 200, 300, 200, 5])).toBe(1);
  });

  it('senza abbastanza ore non si pronuncia', () => {
    expect(accelerazione([100, 300, 5])).toBeNull();
    expect(accelerazione([0, 0, 0, 0, 0])).toBeNull();
    expect(accelerazione([0, 0, 0, 12, 0])).toBe(Infinity);
  });
});

describe('opzioniRadar', () => {
  it('è spento finché non si sceglie una modalità', () => {
    expect(opzioniRadar({}).modalita).toBe('spento');
    expect(opzioniRadar({ RADAR_MODALITA: 'pubblica' }).modalita).toBe('spento');
    expect(opzioniRadar({ RADAR_MODALITA: 'avvisa' }).modalita).toBe('avvisa');
  });

  it('valori predefiniti e limiti della ricerca su X', () => {
    expect(opzioniRadar({})).toEqual({
      modalita: 'spento',
      valutazioni: 1,
      riposoOre: 12,
      accelerazioneMinima: 1.5,
      campione: 10,
      classifica: 30,
      massimoGiorno: 3,
      orario: [8, 23],
      intervalloMinuti: 55,
    });
    expect(opzioniRadar({ RADAR_CAMPIONE: '500', RADAR_ACCELERAZIONE: '2,5' })).toMatchObject({ campione: 100, accelerazioneMinima: 2.5 });
    expect(opzioniRadar({ RADAR_CAMPIONE: '0' }).campione).toBe(0);
    expect(opzioniRadar({ RADAR_CAMPIONE: '3' }).campione).toBe(10);
  });

  it("legge la fascia oraria e ignora quelle non valide", () => {
    expect(opzioniRadar({ RADAR_ORARIO: '7-22' }).orario).toEqual([7, 22]);
    expect(opzioniRadar({ RADAR_ORARIO: '0-24' }).orario).toEqual([0, 24]);
    expect(opzioniRadar({ RADAR_ORARIO: '23-8' }).orario).toEqual([8, 23]);
    expect(opzioniRadar({ RADAR_ORARIO: 'giorno' }).orario).toEqual([8, 23]);
  });
});

describe('freni sulla spesa', () => {
  it("la fascia oraria è in ora italiana", () => {
    // 6:30 UTC = 8:30 in Italia con l'ora legale
    expect(inOrario([8, 23], new Date('2026-10-01T06:30:00Z'))).toBe(true);
    expect(inOrario([8, 23], new Date('2026-10-01T05:30:00Z'))).toBe(false);
    expect(inOrario([8, 23], new Date('2026-10-01T21:00:00Z'))).toBe(false);
  });

  it('al massimo un giro ogni intervallo, anche se il job chiama più spesso', () => {
    const adesso = new Date('2026-10-01T10:00:00Z');
    expect(troppoPresto([{ quando: '2026-10-01T09:30:00Z' }], 55, adesso)).toBe(true);
    expect(troppoPresto([{ quando: '2026-10-01T09:04:00Z' }], 55, adesso)).toBe(false);
    expect(troppoPresto([], 55, adesso)).toBe(false);
  });

  it('il tetto giornaliero conta i temi valutati da mezzanotte italiana', () => {
    const adesso = new Date('2026-10-01T10:00:00Z');
    const avvisi = [
      { quando: '2026-09-30T21:30:00Z' }, // 23:30 del 30 in Italia: ieri
      { quando: '2026-09-30T22:30:00Z' }, // 00:30 del 1° in Italia: oggi
      { quando: '2026-10-01T09:00:00Z' },
    ];
    expect(valutazioniRimaste(avvisi, 10, adesso)).toBe(8);
    expect(valutazioniRimaste(avvisi, 2, adesso)).toBe(0);
  });
});

describe('querySuX e pota', () => {
  it('cerca la frase esatta, in italiano, senza retweet', () => {
    expect(querySuX('#Premierato')).toBe('#Premierato lang:it -is:retweet');
    expect(querySuX('Legge "elettorale"')).toBe('"Legge elettorale" lang:it -is:retweet');
  });

  it('tiene solo le voci recenti', () => {
    const voci = [{ quando: '2026-09-28T10:00:00Z' }, { quando: '2026-10-01T09:00:00Z' }];
    expect(pota(voci, 48, new Date('2026-10-01T10:00:00Z'))).toEqual([{ quando: '2026-10-01T09:00:00Z' }]);
  });
});

describe('componiAvviso', () => {
  const segnale = trovaSegnali(
    [rilevazione('2026-10-01T09:00:00Z', ['X'])],
    rilevazione('2026-10-01T10:00:00Z', [['#Premierato', 12000]]),
  )[0];
  const valutazione: Valutazione = {
    pertinente: true,
    motivo: 'Riforma costituzionale <in aula>',
    tema: 'Il Senato vota il premierato',
    gancio: 'Test dei partiti',
    bozze: ['Oggi il Senato vota il #Premierato: cosa cambia & perché'],
    verifiche: ['Data del voto'],
  };

  it('contiene tema, bozze con link per scrivere su X e verifiche, con HTML sicuro', () => {
    const testo = componiAvviso(segnale, valutazione, 3);
    expect(testo).toContain('<b>#Premierato</b> sta salendo su X');
    expect(testo).toContain('12.000 post');
    expect(testo).toContain('ultima ora ×3');
    expect(testo).toContain('Riforma costituzionale &lt;in aula&gt;');
    expect(testo).toContain('cosa cambia &amp; perché');
    expect(testo).toContain('• Data del voto');
    expect(testo).toContain(`href="${linkScrivi(valutazione.bozze[0]).replace(/&/g, '&amp;')}"`);
  });

  it('il link apre X con il testo della bozza', () => {
    const url = new URL(linkScrivi('Prova & #Tag'));
    expect(url.origin + url.pathname).toBe('https://x.com/intent/post');
    expect(url.searchParams.get('text')).toBe('Prova & #Tag');
  });
});
