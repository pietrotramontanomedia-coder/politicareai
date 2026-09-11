import { describe, expect, it } from 'vitest';
import { validaSquadra, type DeputatoListone } from '@politicare/motore';
import { GIORNATE, listone, REGOLE, STAGIONE } from '@/lib/fantaparlamento/dati';

describe('dati del Fantaparlamento', () => {
  it('la stagione ha i campi di ogni pack e fonti http(s)', () => {
    expect(STAGIONE.id).toBeTruthy();
    expect(STAGIONE.versione).toMatch(/^\d+\.\d+\.\d+$/);
    expect(STAGIONE.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(STAGIONE.autori.length).toBeGreaterThan(0);
    expect(STAGIONE.changelog.length).toBeGreaterThan(0);
    expect(STAGIONE.fonti.length).toBeGreaterThan(0);
    for (const fonte of STAGIONE.fonti) expect(fonte.url).toMatch(/^https?:\/\//);
  });

  it('ogni gruppo della Camera è riconosciuto: fra i "misto" finisce solo il gruppo Misto', () => {
    const nonRiconosciuti = listone()
      .filter((d) => d.schieramento === 'misto' && !/MISTO/i.test(d.gruppo))
      .map((d) => d.gruppo);
    expect([...new Set(nonRiconosciuti)]).toEqual([]);
  });

  it('prezzi fra il minimo e il budget, id brevi e senza doppioni', () => {
    const tutti = listone();
    expect(new Set(tutti.map((d) => d.id)).size).toBe(tutti.length);
    for (const d of tutti) {
      expect(d.id).toMatch(/^d\d+_\d+$/);
      expect(d.prezzo).toBeGreaterThanOrEqual(REGOLE.prezzoMinimo);
      expect(d.prezzo).toBeLessThan(REGOLE.crediti);
    }
  });

  it('le giornate sono settimane ISO in ordine, ciascuna con votazioni e votanti', () => {
    const id = GIORNATE.map((g) => g.id);
    expect(id).toEqual([...id].sort());
    for (const g of GIORNATE) {
      expect(g.id).toMatch(/^\d{4}-W\d{2}$/);
      expect(g.votazioni).toBeGreaterThan(0);
      expect(Object.keys(g.deputati).length).toBeGreaterThan(0);
    }
  });

  it('esiste almeno una rosa valida dentro il budget', () => {
    const economici = [...listone()].sort((a, b) => a.prezzo - b.prezzo);
    const scelti: DeputatoListone[] = [];
    const prendi = (filtro: (d: DeputatoListone) => boolean, quanti: number) => {
      for (const d of economici) {
        if (quanti === 0) return;
        const pieno = scelti.filter((x) => x.gruppo === d.gruppo).length >= REGOLE.maxPerGruppo;
        if (!scelti.includes(d) && !pieno && filtro(d)) {
          scelti.push(d);
          quanti--;
        }
      }
    };
    prendi((d) => d.schieramento === 'maggioranza', REGOLE.minMaggioranza);
    prendi((d) => d.schieramento === 'opposizione', REGOLE.minOpposizione);
    prendi(() => true, REGOLE.titolari - scelti.length);

    const squadra = { deputati: scelti.map((d) => d.id), capitano: scelti[0].id };
    expect(validaSquadra(squadra, listone(), REGOLE)).toEqual([]);
  });
});
