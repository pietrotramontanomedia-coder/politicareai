import { describe, expect, it } from 'vitest';
import {
  costoSquadra,
  mediaPunti,
  prezzoDa,
  puntiDeputato,
  puntiSquadra,
  squadraCompleta,
  validaSquadra,
  type DeputatoListone,
  type Giornata,
  type RegoleFanta,
} from '../src/fantaparlamento';

const REGOLE: RegoleFanta = {
  crediti: 350,
  titolari: 11,
  puntiPerVoto: 1,
  moltiplicatoreFinale: 2,
  moltiplicatoreFiducia: 3,
  puntiDissenso: 3,
  bonusPresenzaPiena: 5,
  sogliaPresenzaPiena: 0.9,
  moltiplicatoreCapitano: 1.5,
  minMaggioranza: 4,
  minOpposizione: 4,
  maxPerGruppo: 3,
  fattorePrezzo: 1,
  prezzoMinimo: 1,
};

const giornata: Giornata = {
  id: '2026-W37',
  giorni: ['20260909', '20260910'],
  votazioni: 44,
  finali: 2,
  fiducie: 1,
  deputati: {
    presente: { espressi: 44, finali: 2, fiducie: 1, dissensi: 0 },
    ribelle: { espressi: 20, finali: 1, fiducie: 0, dissensi: 4 },
    assente: { espressi: 0, finali: 0, fiducie: 0, dissensi: 0 },
  },
};

describe('punti di una giornata', () => {
  it('conta i voti espressi, con i finali doppi e le fiducie triple', () => {
    // 41 voti semplici + 2 finali (x2) + 1 fiducia (x3) + bonus presenza piena
    expect(puntiDeputato(giornata.deputati.presente, giornata, REGOLE)).toBe(41 + 4 + 3 + 5);
  });

  it('premia il voto in dissenso dal proprio gruppo', () => {
    // 19 semplici + 1 finale (x2) + 4 dissensi (x3), niente bonus presenza
    expect(puntiDeputato(giornata.deputati.ribelle, giornata, REGOLE)).toBe(19 + 2 + 12);
  });

  it('chi non vota fa zero, senza penalità: l’assenza può essere istituzionale', () => {
    expect(puntiDeputato(giornata.deputati.assente, giornata, REGOLE)).toBe(0);
    expect(puntiDeputato(undefined, giornata, REGOLE)).toBe(0);
  });

  it('il capitano vale una volta e mezzo', () => {
    const esito = puntiSquadra({ deputati: ['presente', 'ribelle'], capitano: 'ribelle' }, giornata, REGOLE);
    expect(esito.perDeputato.find((d) => d.id === 'ribelle')?.punti).toBe(Math.round(33 * 1.5 * 10) / 10);
    expect(esito.totale).toBe(53 + 49.5);
  });

  it('la media usa solo le giornate in cui l’Aula ha votato', () => {
    const vuota: Giornata = { id: '2026-W38', giorni: [], votazioni: 0, finali: 0, fiducie: 0, deputati: {} };
    expect(mediaPunti('ribelle', [giornata, vuota], REGOLE)).toEqual({ media: 33, giocate: 1 });
  });

  it('il prezzo segue la media, con un minimo per tutti', () => {
    expect(prezzoDa(33, REGOLE)).toBe(33);
    expect(prezzoDa(0, REGOLE)).toBe(1);
  });
});

function deputato(id: string, sigla: string, schieramento: DeputatoListone['schieramento'], prezzo: number): DeputatoListone {
  return { id, nome: id, cognome: id.toUpperCase(), gruppo: sigla, sigla, schieramento, prezzo, mediaPunti: prezzo, giornateGiocate: 5 };
}

const LISTONE: DeputatoListone[] = [
  ...['f0', 'f1', 'f2', 'f3'].map((id) => deputato(id, 'FDI', 'maggioranza', 30)),
  ...['l0', 'l1', 'l2'].map((id) => deputato(id, 'LEGA', 'maggioranza', 30)),
  ...['p0', 'p1', 'p2', 'p3'].map((id) => deputato(id, 'PD', 'opposizione', 30)),
  ...['c0', 'c1', 'c2'].map((id) => deputato(id, 'M5S', 'opposizione', 30)),
  deputato('caro', 'FDI', 'maggioranza', 300),
];

describe('regole della rosa', () => {
  // 6 di maggioranza (3 FdI + 3 Lega) e 5 di opposizione (3 PD + 2 M5S): nessun gruppo oltre tre.
  const valida = { deputati: ['f0', 'f1', 'f2', 'l0', 'l1', 'l2', 'p0', 'p1', 'p2', 'c0', 'c1'], capitano: 'p0' };

  it('accetta una rosa equilibrata dentro il budget', () => {
    expect(validaSquadra(valida, LISTONE, REGOLE)).toEqual([]);
    expect(costoSquadra(valida, LISTONE)).toBe(330);
    expect(squadraCompleta(valida, LISTONE, REGOLE)).toBe(true);
  });

  it('rifiuta rose sbilanciate, troppo costose o con troppi dello stesso gruppo', () => {
    // 8 di maggioranza (4 FdI, oltre il massimo) e solo 3 di opposizione, con un acquisto fuori budget.
    const soloMaggioranza = { deputati: ['f0', 'f1', 'f2', 'f3', 'l0', 'l1', 'l2', 'caro', 'p0', 'p1', 'p2'], capitano: 'f0' };
    const regole = validaSquadra(soloMaggioranza, LISTONE, REGOLE).map((e) => e.regola);
    expect(regole).toContain('crediti');
    expect(regole).toContain('equilibrio');
    expect(regole).toContain('gruppo');
  });

  it('controlla numero, doppioni e capitano', () => {
    const corta = { deputati: ['f0', 'f0'], capitano: 'p0' };
    const regole = validaSquadra(corta, LISTONE, REGOLE).map((e) => e.regola);
    expect(regole).toEqual(expect.arrayContaining(['numero', 'doppioni', 'equilibrio', 'capitano']));
  });
});
