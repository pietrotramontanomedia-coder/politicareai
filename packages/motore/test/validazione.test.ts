import { describe, expect, it } from 'vitest';
import { validaPack } from '../src/validazione';
import type { TestPartitoPack } from '../src/tipi';

const fonteValida = { tipo: 'programma' as const, citazione: 'Programma 2027, cap. 3', url: 'https://example.org/programma' };

function packBase(): TestPartitoPack {
  return {
    id: 'test-pack',
    versione: '1',
    data: '2026-09-02',
    autori: ['Redazione'],
    changelog: ['v1: prima versione'],
    quotePerArea: { fisco: 1, ambiente: 1 },
    affermazioni: [
      { id: 'a1', testo: 'Affermazione fisco', area: 'fisco', verso: 1 },
      { id: 'a2', testo: 'Affermazione ambiente', area: 'ambiente', verso: -1 },
    ],
    partiti: [
      {
        id: 'p1',
        nome: 'Partito Uno',
        posizioni: [
          { affermazioneId: 'a1', valore: 2, fonte: fonteValida },
          { affermazioneId: 'a2', valore: -1, fonte: fonteValida },
        ],
      },
      {
        id: 'p2',
        nome: 'Partito Due',
        posizioni: [
          { affermazioneId: 'a1', valore: -2, fonte: fonteValida },
          { affermazioneId: 'a2', valore: 1, fonte: fonteValida },
        ],
      },
    ],
  };
}

describe('validaPack', () => {
  it('non produce errori su un pack ben formato', () => {
    expect(validaPack(packBase())).toEqual([]);
  });

  it('segnala una posizione senza fonte', () => {
    const pack = packBase();
    pack.partiti[0].posizioni[0].fonte = { tipo: 'programma', citazione: '', url: '' };
    const errori = validaPack(pack);
    expect(errori.some((e) => e.regola === 'fonte-obbligatoria')).toBe(true);
  });

  it('segnala uno sbilanciamento di verso oltre il 10%', () => {
    const pack = packBase();
    // 10 affermazioni tutte con verso +1: sbilanciamento 50%
    pack.affermazioni = Array.from({ length: 10 }, (_, i) => ({
      id: `a${i}`,
      testo: `Affermazione ${i}`,
      area: 'fisco',
      verso: 1 as const,
    }));
    pack.quotePerArea = { fisco: 10 };
    pack.partiti = pack.partiti.map((p) => ({
      ...p,
      posizioni: pack.affermazioni.map((a) => ({ affermazioneId: a.id, valore: 0 as const, fonte: fonteValida })),
    }));
    const errori = validaPack(pack);
    expect(errori.some((e) => e.regola === 'bilanciamento-verso')).toBe(true);
  });

  it('segnala un\'affermazione non discriminante (>85% stessa posizione)', () => {
    const pack = packBase();
    pack.partiti = [
      ...pack.partiti,
      { id: 'p3', nome: 'Partito Tre', posizioni: [{ affermazioneId: 'a1', valore: 2, fonte: fonteValida }, { affermazioneId: 'a2', valore: -1, fonte: fonteValida }] },
      { id: 'p4', nome: 'Partito Quattro', posizioni: [{ affermazioneId: 'a1', valore: 2, fonte: fonteValida }, { affermazioneId: 'a2', valore: -1, fonte: fonteValida }] },
      { id: 'p5', nome: 'Partito Cinque', posizioni: [{ affermazioneId: 'a1', valore: 2, fonte: fonteValida }, { affermazioneId: 'a2', valore: -1, fonte: fonteValida }] },
    ];
    // 5 partiti su 6 condividono a1=2 (83.3%, sotto soglia): ne aggiungiamo un
    // settimo identico per arrivare a 6/7 = 85.7%, sopra la soglia dell'85%.
    pack.partiti.push({ id: 'p6', nome: 'Partito Sei', posizioni: [{ affermazioneId: 'a1', valore: 2, fonte: fonteValida }, { affermazioneId: 'a2', valore: -1, fonte: fonteValida }] });
    pack.partiti.push({ id: 'p7', nome: 'Partito Sette', posizioni: [{ affermazioneId: 'a1', valore: 2, fonte: fonteValida }, { affermazioneId: 'a2', valore: -1, fonte: fonteValida }] });
    const errori = validaPack(pack);
    expect(errori.some((e) => e.regola === 'potere-discriminante' && e.affermazioneId === 'a1')).toBe(true);
  });

  it('segnala una discrepanza fra quote dichiarate e affermazioni reali', () => {
    const pack = packBase();
    pack.quotePerArea = { fisco: 5, ambiente: 1 };
    const errori = validaPack(pack);
    expect(errori.some((e) => e.regola === 'quote-per-area')).toBe(true);
  });

  it('segnala metadati obbligatori mancanti', () => {
    const pack = packBase();
    pack.autori = [];
    const errori = validaPack(pack);
    expect(errori.some((e) => e.regola === 'metadati-obbligatori')).toBe(true);
  });
});
