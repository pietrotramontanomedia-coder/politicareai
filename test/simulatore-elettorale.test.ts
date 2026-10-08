import { describe, expect, it } from 'vitest';
import {
  LOCALI,
  presetPolitiche2022,
  puntiEmiciclo,
  REGIONI_SENATO,
  REGOLE,
  ribilancia,
  riparto,
  ripartoResti,
  simula,
  stimaRegionale,
  type Esito,
  type GeografiaSenato,
  type ListaInput,
} from '@/lib/simulatore-elettorale';
import { GEOGRAFIA_SENATO_2022 } from '@/lib/simulatore-geografia-2022';

const lista = (id: string, percentuale: number, coalizione: string | null = null, extra: Partial<ListaInput> = {}): ListaInput => ({
  id,
  nome: id,
  percentuale,
  coalizione,
  colore: '#000',
  ...extra,
});

const COALIZIONI = { x: 'Coalizione X', y: 'Coalizione Y' };
const chi = (esito: Esito, id: string) => esito.competitori.find((c) => c.id === id)!;
const stato = (esito: Esito, id: string) => esito.liste.find((l) => l.lista.id === id)!;
const somma = (esito: Esito, ramo: 'seggiCamera' | 'seggiSenato') => esito.competitori.reduce((a, c) => a + c[ramo], 0);

describe('riparto con quozienti interi e resti più alti', () => {
  it('assegna tutti i seggi e rispetta le proporzioni', () => {
    expect(ripartoResti([50, 30, 20], 10)).toEqual([5, 3, 2]);
    expect(ripartoResti([1, 1, 1], 10).reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('segna chi prende il seggio con il resto', () => {
    const r = riparto([42, 30, 28], 314);
    expect(r.seggi).toEqual([132, 94, 88]);
    expect(r.conResto).toEqual([true, false, true]);
  });

  it('senza voti non assegna seggi', () => {
    expect(ripartoResti([0, 0], 10)).toEqual([0, 0]);
  });
});

describe('Camera: premio e tetto (art. 83 TU Camera)', () => {
  it('senza voti dispersi una lista al 42% ottiene 132 + 70 = 202 deputati, come nel dossier ufficiale', () => {
    const esito = simula([lista('a', 42), lista('b', 30), lista('c', 28)], { coalizioni: {} });
    expect(esito.premio).toEqual({ motivo: 'assegnato', vincitore: 'a' });
    expect(chi(esito, 'a').camera).toMatchObject({ proporzionali: 132, premio: 70, speciali: 0, totale: 202 });
  });

  it('il premio si somma a una quota calcolata su 314 seggi', () => {
    const esito = simula([lista('a', 42), lista('b', 30), lista('c', 23), lista('d', 2.5), lista('e', 2.5)], { coalizioni: {} });
    expect(chi(esito, 'a').seggiCamera).toBe(139 + 70);
    expect(esito.votiDispersi).toBeCloseTo(5);
  });

  it('al 41,9% niente premio: 384 seggi in proporzione', () => {
    const esito = simula([lista('a', 41.9), lista('b', 30), lista('c', 28.1)], { coalizioni: {} });
    expect(esito.premio.motivo).toBe('nessuno-al-42');
    expect(chi(esito, 'a').camera.proporzionali).toBe(ripartoResti([41.9, 30, 28.1], 384)[0]);
  });

  it('tetto di 220: il vincitore si ferma a 150 proporzionali più il premio', () => {
    const esito = simula([lista('a', 55), lista('b', 45)], { coalizioni: {} });
    expect(esito.tettoCamera).toBe(true);
    expect(chi(esito, 'a').camera).toMatchObject({ proporzionali: 150, premio: 70, totale: 220 });
    expect(chi(esito, 'b').camera.proporzionali).toBe(164);
  });

  it('i seggi di Valle d’Aosta e Trentino-Alto Adige contano nel tetto', () => {
    const esito = simula([lista('a', 55), lista('b', 45)], { coalizioni: {}, speciali: { camera: { a: 5 } } });
    expect(chi(esito, 'a').camera).toMatchObject({ proporzionali: 145, premio: 70, speciali: 5, totale: 220 });
    expect(chi(esito, LOCALI).camera.speciali).toBe(3);
  });
});

describe('premio: condizioni (lett. e-ter / e-septies)', () => {
  it('non scatta se al Senato il primo è un altro', () => {
    const esito = simula([lista('a', 45), lista('b', 55)], { coalizioni: {}, maggioranzeDiverse: true });
    expect(esito.premio.motivo).toBe('maggioranze-diverse');
    expect(chi(esito, 'b').camera.premio).toBe(0);
    expect(chi(esito, 'b').senato.premio).toBe(0);
  });

  it('a pari voti per il primo posto non si assegna', () => {
    const esito = simula([lista('a', 42), lista('b', 42), lista('c', 16)], { coalizioni: {} });
    expect(esito.premio.motivo).toBe('pareggio');
  });
});

describe('soglie e coalizioni (lett. c ed e)', () => {
  it('una lista sotto il 3% resta fuori', () => {
    const esito = simula([lista('a', 60), lista('b', 37.1), lista('c', 2.9)], { coalizioni: {} });
    expect(stato(esito, 'c').stato).toBe('sotto-soglia');
    expect(esito.competitori.map((c) => c.id)).not.toContain('c');
  });

  it('una coalizione sotto il 10% non conta: le sue liste al 3% corrono da sole', () => {
    const esito = simula([lista('p', 5, 'x'), lista('q', 4, 'x'), lista('r', 91)], { coalizioni: COALIZIONI });
    expect(esito.coalizioniSottoSoglia).toEqual(['Coalizione X']);
    expect(esito.competitori.filter((c) => c.tipo !== 'locali').map((c) => c.id).sort()).toEqual(['p', 'q', 'r']);
  });

  it('i voti della coalizione sono la somma di tutte le liste, anche le più piccole', () => {
    const esito = simula([lista('p', 20, 'y'), lista('q', 2.5, 'y'), lista('s', 1, 'y'), lista('r', 76.5)], { coalizioni: COALIZIONI });
    expect(chi(esito, 'y').voti).toBeCloseTo(23.5);
  });

  it('il miglior perdente partecipa al riparto dei seggi della coalizione', () => {
    const esito = simula([lista('p', 30, 'y'), lista('q', 2.5, 'y'), lista('s', 1, 'y'), lista('r', 66.5)], { coalizioni: COALIZIONI });
    expect(stato(esito, 'q').stato).toBe('miglior-perdente');
    expect(stato(esito, 'q').seggiCamera).toBeGreaterThan(0);
    expect(stato(esito, 's')).toMatchObject({ stato: 'sotto-soglia', seggiCamera: 0, seggiSenato: 0 });
    const coalizione = chi(esito, 'y');
    expect(stato(esito, 'p').seggiCamera + stato(esito, 'q').seggiCamera).toBe(coalizione.camera.proporzionali);
  });

  it('le "altre liste" aggregate non superano mai le soglie', () => {
    const esito = simula([lista('a', 50), lista('b', 40), lista('altri', 10, null, { aggregato: true })], { coalizioni: {} });
    expect(stato(esito, 'altri').stato).toBe('altre-liste');
  });
});

describe('Senato regione per regione (art. 16-bis TU Senato)', () => {
  it('la stima regionale rispetta i totali nazionali inseriti', () => {
    const liste = [lista('fdi', 30), lista('pd', 22), lista('m5s', 15), lista('altri', 33, null, { aggregato: true })];
    const stima = stimaRegionale(liste, GEOGRAFIA_SENATO_2022);
    const pesi = REGIONI_SENATO.map((r) => GEOGRAFIA_SENATO_2022.regioni[r.id].validi);
    const pesoTot = pesi.reduce((a, b) => a + b, 0);
    for (const l of liste) {
      const media = REGIONI_SENATO.reduce((a, r, k) => a + stima[r.id][l.id] * pesi[k], 0) / pesoTot;
      expect(media).toBeCloseTo(l.percentuale, 6);
    }
    for (const r of REGIONI_SENATO) {
      expect(Object.values(stima[r.id]).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
    }
  });

  it('il M5S pesa più al Sud che al Nord, come nel 2022', () => {
    const stima = stimaRegionale([lista('m5s', 15), lista('altri', 85, null, { aggregato: true })], GEOGRAFIA_SENATO_2022);
    expect(stima.campania.m5s).toBeGreaterThan(stima.lombardia.m5s * 2);
  });

  it('con il premio il vincitore ha 35 seggi di premio e ogni regione assegna i suoi seggi', () => {
    const esito = simula([lista('a', 44), lista('b', 30), lista('c', 26)], { coalizioni: {}, geografia: GEOGRAFIA_SENATO_2022 });
    expect(chi(esito, 'a').senato.premio).toBe(35);
    for (const r of esito.regioniSenato) {
      expect(Object.values(r.seggi).reduce((x, y) => x + y, 0)).toBe(r.regione.proporzionaliConPremio);
    }
  });

  it('tetto di 113: si tolgono seggi nelle regioni e il vincitore si ferma a 113', () => {
    const esito = simula([lista('a', 60), lista('b', 40)], { coalizioni: {}, geografia: GEOGRAFIA_SENATO_2022 });
    expect(esito.tettoSenato).toBe(true);
    expect(chi(esito, 'a').seggiSenato).toBe(113);
    expect(esito.correzioniTettoSenato.length).toBeGreaterThan(0);
    expect(esito.correzioniTettoSenato.every((c) => c.a === 'b')).toBe(true);
  });

  it('al Senato una lista entra con il 20% in una regione anche sotto il 3% nazionale', () => {
    const geografia: GeografiaSenato = {
      regioni: Object.fromEntries(
        REGIONI_SENATO.map((r) => [r.id, { validi: 1000, quote: { loc: r.id === 'sardegna' ? 40 : 0.5, resto: r.id === 'sardegna' ? 60 : 99.5 } }]),
      ),
      italia: { loc: 2.69, resto: 97.31 },
      profilo: { s: 'loc' },
    };
    const esito = simula([lista('a', 50), lista('b', 47.5), lista('s', 2.5)], { coalizioni: {}, geografia });
    expect(stato(esito, 's').stato).toBe('sotto-soglia');
    expect(stato(esito, 's').statoSenato).toBe('in-parlamento');
    expect(stato(esito, 's').seggiSenato).toBeGreaterThan(0);
    expect(stato(esito, 's').seggiCamera).toBe(0);
  });
});

describe('verifica esterna: simulazioni CISE LUISS del 28 settembre 2026 (Camera, 384 seggi)', () => {
  const CISE = { cl: 'Campo largo', cdx: 'Centrodestra' };
  // Il CISE tratta le coalizioni come un blocco unico: qui ogni coalizione è una lista con la sua cifra.
  it('scenario con premio: Campo largo al 44% ottiene 215 seggi (70 di premio), centrodestra 133', () => {
    const esito = simula([lista('cl', 44), lista('cdx', 40.4), lista('fn', 8), lista('az', 3.1), lista('altri', 4.5, null, { aggregato: true })], { coalizioni: CISE });
    expect(chi(esito, 'cl').camera.proporzionali + chi(esito, 'cl').camera.premio).toBe(215);
    expect(chi(esito, 'cdx').camera.proporzionali).toBe(133);
    expect(chi(esito, 'fn').camera.proporzionali).toBe(26);
    expect(chi(esito, 'az').camera.proporzionali).toBe(10);
  });

  it('scenario senza premio: 171, 167, 33 e 13 seggi', () => {
    const esito = simula(
      [lista('cl', 41.6), lista('cdx', 40.4), lista('fn', 8), lista('az', 3.1), lista('iv', 2.4), lista('altri', 4.5, null, { aggregato: true })],
      { coalizioni: CISE },
    );
    expect(esito.premio.motivo).toBe('nessuno-al-42');
    expect(['cl', 'cdx', 'fn', 'az'].map((id) => chi(esito, id).camera.proporzionali)).toEqual([171, 167, 33, 13]);
  });
});

describe('totale sempre al 100%', () => {
  const tot = (l: ListaInput[]) => Math.round(l.reduce((a, x) => a + x.percentuale, 0) * 100) / 100;

  it('se una lista sale le altre scendono in proporzione', () => {
    const liste = ribilancia([lista('a', 40), lista('b', 40), lista('c', 20)], 'a', 50);
    expect(liste.map((l) => l.percentuale)).toEqual([50, 33.33, 16.67]);
    expect(tot(liste)).toBe(100);
  });

  it('le liste bloccate non si muovono', () => {
    const liste = ribilancia([lista('a', 40), lista('b', 40), lista('c', 20)], 'a', 50, new Set(['c']));
    expect(liste.map((l) => l.percentuale)).toEqual([50, 30, 20]);
  });

  it('non si può superare lo spazio lasciato dalle liste bloccate', () => {
    const liste = ribilancia([lista('a', 40), lista('b', 40), lista('c', 20)], 'a', 95, new Set(['b']));
    expect(liste.map((l) => l.percentuale)).toEqual([60, 40, 0]);
  });

  it('partendo da tutti a zero i punti si tolgono alle altre liste', () => {
    const liste = ribilancia([lista('a', 0), lista('b', 0), lista('altri', 100, null, { aggregato: true })], 'a', 30);
    expect(liste.map((l) => l.percentuale)).toEqual([30, 0, 70]);
  });

  it('un totale iniziale diverso da 100 torna a 100 al primo cambio', () => {
    const p = presetPolitiche2022({});
    const liste = ribilancia(p.liste, 'pd', 20);
    expect(tot(liste)).toBe(100);
    expect(liste.find((l) => l.id === 'pd')!.percentuale).toBe(20);
  });
});

describe('invarianti', () => {
  it('assegna sempre tutti i seggi italiani di Camera e Senato', () => {
    let seme = 7;
    const casuale = () => ((seme = (seme * 16807) % 2147483647) / 2147483647);
    for (let prova = 0; prova < 150; prova++) {
      const liste = Array.from({ length: 8 }, (_, i) =>
        lista(`l${i}`, Math.round(casuale() * 3000) / 100, casuale() < 0.5 ? (casuale() < 0.5 ? 'x' : 'y') : null),
      );
      const esito = simula(liste, { coalizioni: COALIZIONI, geografia: GEOGRAFIA_SENATO_2022 });
      if (esito.competitori.filter((c) => c.tipo !== 'locali').length === 0) continue;
      expect(somma(esito, 'seggiCamera')).toBe(REGOLE.camera.seggiItalia);
      expect(somma(esito, 'seggiSenato')).toBe(REGOLE.senato.seggiItalia);
      for (const c of esito.competitori) {
        const liste = esito.liste.filter((l) => l.competitore === c.id || (c.tipo === 'lista' && l.lista.id === c.id));
        expect(liste.reduce((a, l) => a + l.seggiCamera, 0)).toBe(c.camera.proporzionali);
        expect(liste.reduce((a, l) => a + l.seggiSenato, 0)).toBe(c.senato.proporzionali);
        expect(c.camera.totale).toBeLessThanOrEqual(c.id === esito.premio.vincitore ? REGOLE.camera.tetto : REGOLE.camera.seggiItalia);
        if (c.id === esito.premio.vincitore) expect(c.senato.totale).toBeLessThanOrEqual(REGOLE.senato.tetto);
      }
    }
  });

  it('l’emiciclo ha un punto per ogni seggio', () => {
    expect(puntiEmiciclo(400, 12)).toHaveLength(400);
  });
});

describe('risultati 2022 con le regole nuove', () => {
  const p = presetPolitiche2022({});
  const esito = simula(p.liste, { coalizioni: p.coalizioni, speciali: p.speciali, geografia: GEOGRAFIA_SENATO_2022 });

  it('il centrodestra supera il 42% con la somma di tutte le sue liste e prende il premio', () => {
    expect(esito.premio).toEqual({ motivo: 'assegnato', vincitore: 'cdx' });
    expect(chi(esito, 'cdx').quota).toBeCloseTo(43.79, 2);
  });

  it('alla Camera il centrodestra si ferma al tetto di 220', () => {
    expect(esito.tettoCamera).toBe(true);
    expect(chi(esito, 'cdx').seggiCamera).toBe(220);
  });

  it('assegna tutti i seggi', () => {
    expect(somma(esito, 'seggiCamera')).toBe(392);
    expect(somma(esito, 'seggiSenato')).toBe(196);
  });
});
