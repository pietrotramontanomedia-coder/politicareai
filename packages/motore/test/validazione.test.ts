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

describe('validaPack: fonti, completezza e copertura', () => {
  it('accetta url vuoto solo per posizioni null', () => {
    const pack = packBase();
    pack.partiti[0].posizioni[0] = {
      affermazioneId: 'a1',
      valore: null,
      fonte: { tipo: 'programma', citazione: 'nessuna fonte verificabile trovata', url: '' },
    };
    expect(validaPack(pack).filter((e) => e.regola === 'fonte-obbligatoria')).toEqual([]);

    pack.partiti[0].posizioni[0].valore = 1;
    expect(validaPack(pack).some((e) => e.regola === 'fonte-obbligatoria' && /URL/.test(e.messaggio))).toBe(true);
  });

  it('richiede la data per le dichiarazioni e la valida', () => {
    const pack = packBase();
    pack.partiti[0].posizioni[0].fonte = { tipo: 'dichiarazione', citazione: 'x', url: 'https://example.org/a' };
    expect(validaPack(pack).some((e) => /dichiarazione deve avere la data/.test(e.messaggio))).toBe(true);
    pack.partiti[0].posizioni[0].fonte.data = '12/03/2026';
    expect(validaPack(pack).some((e) => /formato YYYY-MM-DD/.test(e.messaggio))).toBe(true);
    pack.partiti[0].posizioni[0].fonte.data = '2026-03-12';
    expect(validaPack(pack).filter((e) => e.regola === 'fonte-obbligatoria')).toEqual([]);
  });

  it('rifiuta il tipo stampa nel test partito e ±2 con confidenza bassa', () => {
    const pack = packBase();
    pack.partiti[0].posizioni[0].fonte = { tipo: 'stampa' as never, citazione: 'x', url: 'https://example.org/a' };
    expect(validaPack(pack).some((e) => /non ammesso/.test(e.messaggio))).toBe(true);

    const pack2 = packBase();
    pack2.partiti[0].posizioni[0].confidenza = 'bassa';
    expect(validaPack(pack2).some((e) => e.regola === 'confidenza-valore')).toBe(true);
    pack2.partiti[0].posizioni[0].valore = 1;
    expect(validaPack(pack2).filter((e) => e.regola === 'confidenza-valore')).toEqual([]);
  });

  it('segnala voci mancanti, duplicate o su affermazioni inesistenti', () => {
    const pack = packBase();
    pack.partiti[0].posizioni.pop();
    pack.partiti[1].posizioni.push({ ...pack.partiti[1].posizioni[0] });
    pack.partiti[1].posizioni.push({ ...pack.partiti[1].posizioni[0], affermazioneId: 'zz' });
    const messaggi = validaPack(pack).filter((e) => e.regola === 'posizioni-complete').map((e) => e.messaggio);
    expect(messaggi.some((m) => /non ha alcuna voce su "a2"/.test(m))).toBe(true);
    expect(messaggi.some((m) => /due posizioni su "a1"/.test(m))).toBe(true);
    expect(messaggi.some((m) => /"zz", che non esiste/.test(m))).toBe(true);
  });

  it('segnala un partito con copertura sotto il 50%', () => {
    const pack = packBase();
    for (const p of pack.partiti[0].posizioni) p.valore = null;
    expect(validaPack(pack).some((e) => e.regola === 'copertura-minima')).toBe(true);
  });
});
