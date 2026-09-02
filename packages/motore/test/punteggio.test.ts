import { describe, expect, it } from 'vitest';
import {
  accordo,
  calcolaClassifica,
  calcolaPunteggio,
  principaliConvergenze,
  principaliDivergenze,
} from '../src/punteggio';
import type { Partito, Risposta } from '../src/tipi';

const fonte = { tipo: 'programma' as const, citazione: 'test', url: 'https://example.org' };

function partito(id: string, nome: string, posizioni: Array<[string, number]>): Partito {
  return {
    id,
    nome,
    posizioni: posizioni.map(([affermazioneId, valore]) => ({
      affermazioneId,
      valore: valore as -2 | -1 | 0 | 1 | 2,
      fonte,
    })),
  };
}

describe('accordo', () => {
  it('è 1 quando risposta e posizione coincidono', () => {
    expect(accordo(2, 2)).toBe(1);
    expect(accordo(-2, -2)).toBe(1);
    expect(accordo(0, 0)).toBe(1);
  });

  it('è 0 quando risposta e posizione sono agli estremi opposti', () => {
    expect(accordo(2, -2)).toBe(0);
    expect(accordo(-2, 2)).toBe(0);
  });

  it('è 0.5 a metà distanza', () => {
    expect(accordo(0, 2)).toBe(0.5);
    expect(accordo(-1, 1)).toBe(0.5);
  });
});

describe('calcolaPunteggio', () => {
  it('dà punteggio 1 se le risposte coincidono su tutte le affermazioni', () => {
    const p = partito('p1', 'Partito Uno', [
      ['a1', 2],
      ['a2', -1],
    ]);
    const risposte: Risposta[] = [
      { affermazioneId: 'a1', valore: 2, importante: false },
      { affermazioneId: 'a2', valore: -1, importante: false },
    ];
    expect(calcolaPunteggio(risposte, p).punteggio).toBe(1);
  });

  it('esclude le risposte saltate (valore null) dal calcolo', () => {
    const p = partito('p1', 'Partito Uno', [
      ['a1', 2],
      ['a2', -2],
    ]);
    const risposte: Risposta[] = [
      { affermazioneId: 'a1', valore: 2, importante: false },
      { affermazioneId: 'a2', valore: null, importante: false }, // saltata
    ];
    expect(calcolaPunteggio(risposte, p).punteggio).toBe(1);
  });

  it('pesa doppio le affermazioni segnate come importanti', () => {
    const p = partito('p1', 'Partito Uno', [
      ['a1', 2], // pieno accordo, peso 2
      ['a2', -2], // pieno disaccordo, peso 1
    ]);
    const risposte: Risposta[] = [
      { affermazioneId: 'a1', valore: 2, importante: true },
      { affermazioneId: 'a2', valore: 2, importante: false },
    ];
    // (2*1 + 1*0) / (2+1) = 2/3
    expect(calcolaPunteggio(risposte, p).punteggio).toBeCloseTo(2 / 3);
  });

  it('ignora affermazioni per cui il partito non ha posizione registrata', () => {
    const p = partito('p1', 'Partito Uno', [['a1', 2]]);
    const risposte: Risposta[] = [
      { affermazioneId: 'a1', valore: 2, importante: false },
      { affermazioneId: 'a-inesistente', valore: -2, importante: false },
    ];
    expect(calcolaPunteggio(risposte, p).punteggio).toBe(1);
  });

  it('restituisce 0 se non ci sono risposte utili', () => {
    const p = partito('p1', 'Partito Uno', [['a1', 2]]);
    expect(calcolaPunteggio([], p).punteggio).toBe(0);
  });
});

describe('calcolaClassifica', () => {
  const risposte: Risposta[] = [
    { affermazioneId: 'a1', valore: 2, importante: false },
    { affermazioneId: 'a2', valore: -2, importante: false },
  ];

  it('ordina i partiti dal punteggio più alto al più basso', () => {
    const partiti = [
      partito('p1', 'Basso', [
        ['a1', -2],
        ['a2', 2],
      ]),
      partito('p2', 'Alto', [
        ['a1', 2],
        ['a2', -2],
      ]),
    ];
    const { risultati } = calcolaClassifica(risposte, partiti);
    expect(risultati.map((r) => r.partitoId)).toEqual(['p2', 'p1']);
  });

  it('segnala pari merito quando i primi due sono entro 3 punti percentuali', () => {
    // 9 affermazioni: p1 in pieno accordo su tutte, p2 diverge di un solo
    // "gradino" su una sola affermazione. Differenza di punteggio = 0.25/9 ≈ 0.028.
    const ids = Array.from({ length: 9 }, (_, i) => `q${i}`);
    const rispostePrecise: Risposta[] = ids.map((id) => ({ affermazioneId: id, valore: 2, importante: false }));
    const p1 = partito('p1', 'A', ids.map((id) => [id, 2] as [string, number]));
    const p2 = partito(
      'p2',
      'B',
      ids.map((id, i) => [id, i === 0 ? 1 : 2] as [string, number]),
    );
    const { pariMerito } = calcolaClassifica(rispostePrecise, [p1, p2]);
    expect(pariMerito).toBe(true);
  });

  it('non segnala pari merito quando la distanza supera la soglia', () => {
    const partiti = [
      partito('p1', 'A', [
        ['a1', 2],
        ['a2', -2],
      ]),
      partito('p2', 'B', [
        ['a1', -2],
        ['a2', 2],
      ]),
    ];
    const { pariMerito } = calcolaClassifica(risposte, partiti);
    expect(pariMerito).toBe(false);
  });
});

describe('principaliDivergenze / principaliConvergenze', () => {
  it('ordinano correttamente il dettaglio per accordo crescente/decrescente', () => {
    const p = partito('p1', 'Partito Uno', [
      ['a1', 2], // accordo pieno con risposta 2
      ['a2', -2], // accordo nullo con risposta 2
      ['a3', 0], // accordo medio con risposta 2
    ]);
    const risposte: Risposta[] = [
      { affermazioneId: 'a1', valore: 2, importante: false },
      { affermazioneId: 'a2', valore: 2, importante: false },
      { affermazioneId: 'a3', valore: 2, importante: false },
    ];
    const risultato = calcolaPunteggio(risposte, p);

    expect(principaliDivergenze(risultato, 1)[0].affermazioneId).toBe('a2');
    expect(principaliConvergenze(risultato, 1)[0].affermazioneId).toBe('a1');
  });
});
