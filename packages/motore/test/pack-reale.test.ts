import { describe, expect, it } from 'vitest';
import { validaPack } from '../src/validazione';
import { calcolaClassifica } from '../src/punteggio';
import type { Risposta, TestPartitoPack } from '../src/tipi';
import pack from '../../../content/test-partito/politiche-2027.v1.json' with { type: 'json' };

// Il pack reale in produzione deve rispettare le stesse regole del fixture:
// è questo test che blocca la merge se una posizione perde la fonte.
describe('content pack reale politiche-2027', () => {
  const tipizzato = pack as unknown as TestPartitoPack;

  it('passa tutte le regole di validaPack', () => {
    const errori = validaPack(tipizzato);
    expect(errori.map((e) => e.messaggio)).toEqual([]);
  });

  it('ha 20 affermazioni e 11 partiti, compreso Futuro Nazionale', () => {
    expect(tipizzato.affermazioni).toHaveLength(20);
    expect(tipizzato.partiti).toHaveLength(11);
    expect(tipizzato.partiti.map((p) => p.id)).toContain('futuronazionale');
  });

  it('ogni posizione documentata ha url http(s), data quando è una dichiarazione e confidenza', () => {
    for (const p of tipizzato.partiti) {
      for (const pos of p.posizioni) {
        if (pos.valore === null) continue;
        expect(pos.fonte.url, `${p.id}/${pos.affermazioneId}`).toMatch(/^https?:\/\//);
        expect(pos.confidenza, `${p.id}/${pos.affermazioneId}`).toBeDefined();
        if (pos.fonte.tipo === 'dichiarazione') expect(pos.fonte.data, `${p.id}/${pos.affermazioneId}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('con risposte tutte neutre nessun partito è escluso e la classifica è completa', () => {
    const risposte: Risposta[] = tipizzato.affermazioni.map((a) => ({ affermazioneId: a.id, valore: 0, importante: false }));
    const { risultati, esclusi } = calcolaClassifica(risposte, tipizzato.partiti, { affermazioni: tipizzato.affermazioni });
    expect(risultati.length + esclusi.length).toBe(tipizzato.partiti.length);
    expect(esclusi).toEqual([]);
  });
});
