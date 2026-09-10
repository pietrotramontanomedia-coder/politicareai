import { describe, expect, it } from 'vitest';
import {
  presetPolitiche2022,
  puntiEmiciclo,
  REGOLE,
  ripartoResti,
  simula,
  type Esito,
  type ListaInput,
} from '@/lib/simulatore-elettorale';

const lista = (id: string, percentuale: number, coalizione: string | null = null, extra: Partial<ListaInput> = {}): ListaInput => ({
  id,
  nome: id,
  percentuale,
  coalizione,
  colore: '#000',
  ...extra,
});

const COALIZIONI = { x: 'Coalizione X', y: 'Coalizione Y' };
const seggi = (esito: Esito, id: string) => esito.competitori.find((c) => c.id === id)!;

describe('ripartoResti', () => {
  it('assegna tutti i seggi e rispetta le proporzioni', () => {
    expect(ripartoResti([50, 30, 20], 10)).toEqual([5, 3, 2]);
    expect(ripartoResti([1, 1, 1], 10).reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('senza voti non assegna seggi', () => {
    expect(ripartoResti([0, 0], 10)).toEqual([0, 0]);
  });
});

describe('esempi del CISE', () => {
  it('una lista al 42% senza voti dispersi ottiene 135 + 70 = 205 deputati', () => {
    const esito = simula([lista('a', 42), lista('b', 30), lista('c', 28)], { coalizioni: {} });
    expect(esito.premio).toEqual({ motivo: 'assegnato', vincitore: 'a' });
    expect(seggi(esito, 'a').seggiCamera).toBe(205);
  });

  it('con il 5% dei voti a liste escluse la stessa quota vale 212 deputati', () => {
    const esito = simula([lista('a', 42), lista('b', 30), lista('c', 23), lista('d', 2.5), lista('e', 2.5)], { coalizioni: {} });
    expect(seggi(esito, 'a').seggiCamera).toBe(212);
    expect(esito.votiDispersi).toBeCloseTo(5);
  });
});

describe('premio di maggioranza', () => {
  it('al 41,9% non scatta: proporzionale puro', () => {
    const esito = simula([lista('a', 41.9), lista('b', 30), lista('c', 28.1)], { coalizioni: {} });
    expect(esito.premio.motivo).toBe('nessuno-al-42');
    expect(seggi(esito, 'a').seggiCamera).toBe(ripartoResti([41.9, 30, 28.1], 392)[0]);
  });

  it('non scatta con maggioranze diverse fra Camera e Senato', () => {
    const esito = simula([lista('a', 45), lista('b', 55)], { coalizioni: {}, maggioranzeDiverse: true });
    expect(esito.premio.motivo).toBe('maggioranze-diverse');
  });

  it('non scatta con due primi a pari voti', () => {
    const esito = simula([lista('a', 42), lista('b', 42), lista('c', 16)], { coalizioni: {} });
    expect(esito.premio.motivo).toBe('pareggio');
  });

  it('applica il tetto di 220 deputati e dà l’eccedenza agli altri', () => {
    const esito = simula([lista('a', 55), lista('b', 45)], { coalizioni: {} });
    expect(esito.tettoCamera).toBe(true);
    expect(seggi(esito, 'a').seggiCamera).toBe(220);
    expect(seggi(esito, 'b').seggiCamera).toBe(172);
  });
});

describe('soglie', () => {
  it('una lista sotto il 3% resta fuori', () => {
    const esito = simula([lista('a', 60), lista('b', 37.1), lista('c', 2.9)], { coalizioni: {} });
    expect(esito.liste.find((l) => l.lista.id === 'c')?.stato).toBe('sotto-soglia');
    expect(esito.competitori.map((c) => c.id)).not.toContain('c');
  });

  it('una coalizione sotto il 10% non conta: le sue liste corrono da sole', () => {
    const esito = simula([lista('p', 5, 'x'), lista('q', 4, 'x'), lista('r', 91)], { coalizioni: COALIZIONI });
    expect(esito.coalizioniSottoSoglia).toEqual(['Coalizione X']);
    expect(esito.competitori.map((c) => c.id).sort()).toEqual(['p', 'q', 'r']);
  });

  it('il miglior perdente porta voti alla coalizione ma non prende seggi', () => {
    const esito = simula([lista('p', 20, 'y'), lista('q', 2.5, 'y'), lista('s', 1, 'y'), lista('r', 76.5)], { coalizioni: COALIZIONI });
    const coalizione = seggi(esito, 'y');
    expect(coalizione.voti).toBeCloseTo(22.5);
    const stato = (id: string) => esito.liste.find((l) => l.lista.id === id)!;
    expect(stato('q')).toMatchObject({ stato: 'miglior-perdente', seggiCamera: 0 });
    expect(stato('s').stato).toBe('sotto-soglia');
    expect(stato('p').seggiCamera).toBe(coalizione.seggiCamera);
  });

  it('le "altre liste" aggregate non superano mai le soglie', () => {
    const esito = simula([lista('a', 50), lista('b', 40), lista('altri', 10, null, { aggregato: true })], { coalizioni: {} });
    expect(esito.liste.find((l) => l.lista.id === 'altri')?.stato).toBe('altre-liste');
  });
});

describe('invarianti', () => {
  it('assegna sempre tutti i seggi italiani di Camera e Senato', () => {
    let seme = 7;
    const casuale = () => ((seme = (seme * 16807) % 2147483647) / 2147483647);
    for (let prova = 0; prova < 200; prova++) {
      const liste = Array.from({ length: 8 }, (_, i) => lista(`l${i}`, Math.round(casuale() * 3000) / 100, casuale() < 0.5 ? (casuale() < 0.5 ? 'x' : 'y') : null));
      const esito = simula(liste, { coalizioni: COALIZIONI });
      if (esito.competitori.length === 0) continue;
      expect(esito.competitori.reduce((a, c) => a + c.seggiCamera, 0)).toBe(REGOLE.camera.seggiItalia);
      expect(esito.competitori.reduce((a, c) => a + c.seggiSenato, 0)).toBe(REGOLE.senato.seggiItalia);
      for (const c of esito.competitori) {
        expect(c.listeConSeggi.reduce((a, l) => a + (esito.liste.find((e) => e.lista.id === l.id)?.seggiCamera ?? 0), 0)).toBe(c.seggiCamera);
      }
    }
  });

  it('l’emiciclo ha un punto per ogni seggio', () => {
    expect(puntiEmiciclo(400, 12)).toHaveLength(400);
  });
});

describe('risultati 2022 con le regole nuove', () => {
  const esito = simula(presetPolitiche2022({}).liste, { coalizioni: presetPolitiche2022({}).coalizioni });

  it('il centrodestra supera il 42% con il miglior perdente e prende il premio', () => {
    expect(esito.premio).toEqual({ motivo: 'assegnato', vincitore: 'cdx' });
    expect(seggi(esito, 'cdx').quota).toBeCloseTo(43.81);
  });

  it('alla Camera il centrodestra si ferma al tetto di 220', () => {
    expect(esito.tettoCamera).toBe(true);
    expect(seggi(esito, 'cdx').seggiCamera).toBe(220);
    expect(seggi(esito, 'csx').seggiCamera).toBe(90);
    expect(seggi(esito, 'm5s').seggiCamera).toBe(55);
    expect(seggi(esito, 'azione-iv').seggiCamera).toBe(27);
  });

  it('al Senato (stima nazionale) il centrodestra ha 111 seggi, sotto il tetto', () => {
    expect(esito.tettoSenato).toBe(false);
    expect(seggi(esito, 'cdx').seggiSenato).toBe(111);
  });
});
