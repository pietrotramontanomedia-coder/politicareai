import { describe, expect, it } from 'vitest';
import packPartiti from '@/content/test-partito/politiche-2027.v1.json';
import {
  aggiornaLeggi,
  componiCarta,
  generatore,
  mescola,
  nomiRealiNelTesto,
  nomiValidi,
  PACCO_ATTUALITA,
  PACCO_BASE,
  partitaAvviabile,
  preparaPartita,
  validaPacco,
  type Carta,
  type PartitoGioco,
} from '@/lib/gioco';

const GIOCATORI = ['Anna', 'Bruno', 'Carla', 'Dario'];
const PARTITI: PartitoGioco[] = packPartiti.partiti.map(({ nome, sigla, leader }) => ({ nome, sigla, leader }));

function carta(parziale: Partial<Carta> = {}): Carta {
  return { id: 'x-1', tipo: 'sfida', titolo: 'Prova', testo: '{g1} fa una cosa.', penalita: 1, ...parziale };
}

describe('pacchi di carte pubblicati', () => {
  it('il mazzo base è valido', () => {
    expect(validaPacco(PACCO_BASE)).toEqual([]);
  });

  it('il mazzo attualità è valido', () => {
    expect(validaPacco(PACCO_ATTUALITA)).toEqual([]);
  });

  it('nessuna carta supera i tre sorsi', () => {
    const tutte = [...PACCO_BASE.carte, ...PACCO_ATTUALITA.carte];
    expect(tutte.every((c) => c.penalita <= 3)).toBe(true);
  });

  it('le carte di attualità che citano fatti hanno una fonte con URL', () => {
    const conFonte = PACCO_ATTUALITA.carte.filter((c) => c.fonte);
    expect(conFonte.length).toBeGreaterThan(0);
    expect(conFonte.every((c) => c.fonte!.url.startsWith('https://'))).toBe(true);
  });

  it('gli id sono unici fra i due mazzi', () => {
    const ids = [...PACCO_BASE.carte, ...PACCO_ATTUALITA.carte].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('il mazzo base non scrive nomi di partiti o leader: solo segnaposto estratti a caso', () => {
    expect(nomiRealiNelTesto(PACCO_BASE, PARTITI)).toEqual([]);
  });
});

describe('validaPacco', () => {
  it('segnala una penalità oltre il massimo', () => {
    const pacco = { ...PACCO_BASE, carte: [carta({ penalita: 5 })] };
    expect(validaPacco(pacco).join()).toContain('oltre il massimo');
  });

  it('segnala una legge senza durata', () => {
    const pacco = { ...PACCO_BASE, carte: [carta({ tipo: 'legge' })] };
    expect(validaPacco(pacco).join()).toContain('durataCarte');
  });

  it('segnala un duello con un solo giocatore', () => {
    const pacco = { ...PACCO_BASE, carte: [carta({ tipo: 'duello' })] };
    expect(validaPacco(pacco).join()).toContain('due giocatori');
  });

  it('segnala gli id duplicati', () => {
    const pacco = { ...PACCO_BASE, carte: [carta(), carta()] };
    expect(validaPacco(pacco).join()).toContain('duplicato');
  });

  it('segnala un segnaposto sconosciuto', () => {
    const pacco = { ...PACCO_BASE, carte: [carta({ testo: '{g1} imita {ministro}.' })] };
    expect(validaPacco(pacco).join()).toContain('{ministro}');
  });
});

describe('nomiRealiNelTesto', () => {
  it('trova un leader scritto per esteso e ignora i segnaposto', () => {
    const pacco = {
      ...PACCO_BASE,
      carte: [carta({ id: 'a', testo: '{g1} imita Salvini.' }), carta({ id: 'b', testo: '{g1} imita {leader}.' })],
    };
    expect(nomiRealiNelTesto(pacco, PARTITI)).toEqual([`${PACCO_BASE.id}/a: Salvini`]);
  });

  it('riconosce entrambi i leader quando un partito ne ha due', () => {
    const pacco = { ...PACCO_BASE, carte: [carta({ testo: 'Bonelli e Fratoianni ballano.' })] };
    expect(nomiRealiNelTesto(pacco, PARTITI)).toHaveLength(2);
  });
});

describe('componiCarta', () => {
  it('sostituisce i segnaposto con giocatori diversi', () => {
    const c = carta({ tipo: 'duello', testo: '{g1} sfida {g2}.' });
    const inGioco = componiCarta(c, GIOCATORI, generatore(1));
    expect(inGioco.testo).not.toContain('{g');
    expect(inGioco.protagonisti).toHaveLength(2);
    expect(inGioco.protagonisti[0]).not.toBe(inGioco.protagonisti[1]);
  });

  it('non estrae nessuno se la carta non ha segnaposto', () => {
    const inGioco = componiCarta(carta({ testo: 'Bevono tutti.' }), GIOCATORI, generatore(1));
    expect(inGioco.protagonisti).toEqual([]);
  });

  it('a parità di seme produce lo stesso risultato', () => {
    const c = carta({ testo: '{g1} parla.' });
    expect(componiCarta(c, GIOCATORI, generatore(7)).testo).toBe(componiCarta(c, GIOCATORI, generatore(7)).testo);
  });

  it('usa nome e leader dello stesso partito', () => {
    const c = carta({ testo: '{partito}|{leader}' });
    const [nome, leader] = componiCarta(c, GIOCATORI, generatore(4), PARTITI).testo.split('|');
    expect(PARTITI.find((p) => p.nome === nome)?.leader).toBe(leader);
  });

  it('estrae due partiti diversi quando la carta ne chiede due', () => {
    const c = carta({ testo: '{partito}|{partito2}' });
    for (let seme = 0; seme < 30; seme++) {
      const [a, b] = componiCarta(c, GIOCATORI, generatore(seme), PARTITI).testo.split('|');
      expect(a).not.toBe(b);
    }
  });

  it('su molte partite estrae ogni partito, senza favorirne uno', () => {
    const c = carta({ testo: '{partito}' });
    const conteggi = new Map<string, number>();
    const prove = 11 * 400;
    for (let seme = 0; seme < prove; seme++) {
      const nome = componiCarta(c, GIOCATORI, generatore(seme), PARTITI).testo;
      conteggi.set(nome, (conteggi.get(nome) ?? 0) + 1);
    }
    expect(conteggi.size).toBe(PARTITI.length);
    for (const volte of conteggi.values()) {
      expect(volte).toBeGreaterThan(400 * 0.75);
      expect(volte).toBeLessThan(400 * 1.25);
    }
  });
});

describe('preparaPartita', () => {
  it('unisce i pacchi e non perde carte quando giocatori e partiti bastano', () => {
    const carte = preparaPartita([PACCO_BASE, PACCO_ATTUALITA], GIOCATORI, generatore(3), PARTITI);
    expect(carte).toHaveLength(PACCO_BASE.carte.length + PACCO_ATTUALITA.carte.length);
  });

  it('scarta i duelli quando c’è un solo giocatore', () => {
    const carte = preparaPartita([PACCO_BASE], ['Anna'], generatore(3), PARTITI);
    expect(carte.every((c) => !c.testo.includes('{g2}'))).toBe(true);
  });

  it('scarta le carte sui partiti se l’elenco dei partiti manca', () => {
    const carte = preparaPartita([PACCO_BASE], GIOCATORI, generatore(3));
    expect(carte.every((c) => !/\{(partito|sigla|leader)/.test(c.testo))).toBe(true);
  });
});

describe('aggiornaLeggi', () => {
  it('registra una legge appena pescata con la sua durata', () => {
    const pescata = componiCarta(carta({ tipo: 'legge', durataCarte: 3 }), GIOCATORI, generatore(1));
    expect(aggiornaLeggi([], pescata)[0].carteRimaste).toBe(3);
  });

  it('scala le leggi già in vigore e scarta quelle scadute', () => {
    const vecchie = [
      { id: 'a', titolo: 'A', testo: 'A', carteRimaste: 1 },
      { id: 'b', titolo: 'B', testo: 'B', carteRimaste: 2 },
    ];
    const pescata = componiCarta(carta(), GIOCATORI, generatore(1));
    const dopo = aggiornaLeggi(vecchie, pescata);
    expect(dopo).toHaveLength(1);
    expect(dopo[0]).toMatchObject({ id: 'b', carteRimaste: 1 });
  });
});

describe('giocatori', () => {
  it('scarta nomi vuoti e duplicati', () => {
    expect(nomiValidi([' Anna ', '', 'Anna', 'Bruno'])).toEqual(['Anna', 'Bruno']);
  });

  it('la partita parte da due giocatori in su', () => {
    expect(partitaAvviabile(['Anna'])).toBe(false);
    expect(partitaAvviabile(['Anna', 'Bruno'])).toBe(true);
  });
});

describe('mescola', () => {
  it('conserva tutti gli elementi', () => {
    const mescolato = mescola([1, 2, 3, 4, 5], generatore(9));
    expect([...mescolato].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
