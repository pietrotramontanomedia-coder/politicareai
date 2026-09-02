import { describe, expect, it } from 'vitest';
import { validaPack } from '../src/validazione';
import { calcolaClassifica } from '../src/punteggio';
import type { Risposta, TestPartitoPack } from '../src/tipi';
import pack from '../../../content/test-partito/_fixture-sviluppo.v1.json' with { type: 'json' };

// Verifica che il content pack di fixture (usato per sviluppare la UI) rispetti
// le stesse regole che varranno in CI per i pack reali.
describe('content pack di fixture', () => {
  const tipizzato = pack as unknown as TestPartitoPack;

  it('passa tutte le regole di validaPack', () => {
    expect(validaPack(tipizzato)).toEqual([]);
  });

  it('produce una classifica completa con risposte tutte neutre', () => {
    const risposte: Risposta[] = tipizzato.affermazioni.map((a) => ({
      affermazioneId: a.id,
      valore: 0,
      importante: false,
    }));
    const { risultati } = calcolaClassifica(risposte, tipizzato.partiti);
    expect(risultati).toHaveLength(tipizzato.partiti.length);
  });
});
