import { describe, expect, it } from 'vitest';
import { caricaPackTestPartito } from '@/lib/contenuti';
import { confrontaAffermazione, SCHIERAMENTI, schieramento, temaPerArea, temi } from '@/lib/confronta';

const pack = caricaPackTestPartito();

describe('schieramento', () => {
  it('classifica i valori della scala', () => {
    expect(schieramento(2)).toBe('favorevoli');
    expect(schieramento(1)).toBe('favorevoli');
    expect(schieramento(0)).toBe('neutri');
    expect(schieramento(-1)).toBe('contrari');
    expect(schieramento(-2)).toBe('contrari');
    expect(schieramento(null)).toBe('senzaFonte');
  });
});

describe('temi', () => {
  it('ogni affermazione compare in un solo tema', () => {
    const ids = temi(pack).flatMap((t) => t.affermazioni.map((a) => a.id));
    expect(ids).toHaveLength(pack.affermazioni.length);
    expect(new Set(ids).size).toBe(pack.affermazioni.length);
  });

  it('i temi coincidono con le quote per area dichiarate nel pack', () => {
    const conteggi = Object.fromEntries(temi(pack).map((t) => [t.area, t.affermazioni.length]));
    expect(conteggi).toEqual(pack.quotePerArea);
  });

  it('un tema inesistente non viene trovato', () => {
    expect(temaPerArea(pack, 'astrologia')).toBeUndefined();
  });
});

describe('confrontaAffermazione', () => {
  it('ogni partito finisce in un solo gruppo, per ogni affermazione', () => {
    for (const a of pack.affermazioni) {
      const { gruppi } = confrontaAffermazione(pack, a);
      const ids = SCHIERAMENTI.flatMap((s) => gruppi[s].map((v) => v.partito.id));
      expect(ids.sort()).toEqual(pack.partiti.map((p) => p.id).sort());
    }
  });

  it('i gruppi rispettano il valore della posizione e contano tutte le caselle senza fonte', () => {
    let senzaFonte = 0;
    for (const a of pack.affermazioni) {
      const { gruppi } = confrontaAffermazione(pack, a);
      expect(gruppi.favorevoli.every((v) => (v.posizione.valore ?? 0) > 0)).toBe(true);
      expect(gruppi.contrari.every((v) => (v.posizione.valore ?? 0) < 0)).toBe(true);
      expect(gruppi.neutri.every((v) => v.posizione.valore === 0)).toBe(true);
      senzaFonte += gruppi.senzaFonte.length;
    }
    const nulli = pack.partiti.reduce((n, p) => n + p.posizioni.filter((x) => x.valore === null).length, 0);
    expect(senzaFonte).toBe(nulli);
  });

  it('dentro ogni gruppo i partiti sono in ordine alfabetico, non per punteggio', () => {
    const { gruppi } = confrontaAffermazione(pack, pack.affermazioni[0]);
    for (const s of SCHIERAMENTI) {
      const nomi = gruppi[s].map((v) => v.partito.nome);
      expect(nomi).toEqual([...nomi].sort((x, y) => x.localeCompare(y, 'it')));
    }
  });
});
