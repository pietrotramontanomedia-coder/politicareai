import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

/*
 * Convertitore dei contatti della newsletter (strumenti/newsletter/convertitore).
 * logica.js è uno script classico, caricato da converti.html aperto dal disco:
 * qui lo si esegue in un contesto isolato, come farebbe il browser.
 */

type Contatto = { email: string; nome: string; attributi: Record<string, unknown> };
type Esito = {
  errore?: string;
  contatti: Contatto[];
  scarti: { riga: number; email: string; motivo: string }[];
  avvisi: { riga: number; email: string; avviso: string }[];
  mappatura: { intestazione: string; campo: string; chiave: string }[];
  riepilogo: Record<string, number>;
};
type Api = {
  leggiTesto(b: Uint8Array): string;
  analizzaCsv(t: string, sep?: string): string[][];
  riconosciColonna(n: string): { campo: string };
  normalizzaEmail(e: string): { valore?: string; avviso?: string | null; errore?: string };
  normalizzaTelefono(t: string): { valore: string | null; avviso?: string };
  normalizzaData(d: string): { valore: string | null; avviso?: string };
  sistemaMaiuscole(s: string): string;
  converti(t: string, o?: Record<string, unknown>): Esito;
  csvListmonk(c: Contatto[]): string;
  csvControllo(s: Esito['scarti'], a: Esito['avvisi']): string;
};

const codice = readFileSync(new URL('../strumenti/newsletter/convertitore/logica.js', import.meta.url), 'utf8');
const contesto: { ConvertiNewsletter?: Api } = { TextDecoder } as never;
runInNewContext(codice, contesto);
const C = contesto.ConvertiNewsletter!;
const OGGI = { oggi: '2026-10-06' };

describe('lettura del CSV', () => {
  it('riconosce punto e virgola, virgolette e a capo dentro le celle', () => {
    expect(C.analizzaCsv('a;b\n"x;1";"riga\nnuova"\n')).toEqual([['a', 'b'], ['x;1', 'riga\nnuova']]);
  });

  it('riconosce la virgola e ignora le righe vuote', () => {
    expect(C.analizzaCsv('a,b\r\n1,2\r\n;\r\n,\r\n')).toEqual([['a', 'b'], ['1', '2'], [';']]);
  });

  it('legge un CSV di Excel in Windows-1252', () => {
    const byte = new Uint8Array([0x43, 0x69, 0x74, 0x74, 0xe0]); // «Città» in Windows-1252
    expect(C.leggiTesto(byte)).toBe('Città');
  });

  it('toglie il BOM dei file UTF-8', () => {
    expect(C.leggiTesto(new TextEncoder().encode('﻿Email'))).toBe('Email');
  });
});

describe('riconoscimento delle colonne', () => {
  it.each([
    ['E-mail', 'email'],
    ['Indirizzo email', 'email'],
    ['Cellulare', 'telefono'],
    ['Tel.', 'telefono'],
    ['Città', 'citta'],
    ['Luogo evento', 'citta'],
    ['Data evento', 'data_iscrizione'],
    ['Nome evento', 'evento'],
    ['Provenienza', 'evento'],
    ['Nome e cognome', 'nome_completo'],
    ['Cognome', 'cognome'],
    ['Nome', 'nome'],
    ['Consenso newsletter', 'consenso_newsletter'],
    ['Consenso SMS', 'consenso_sms'],
    ['Consenso privacy', 'consenso_privacy'],
  ])('%s → %s', (intestazione, campo) => {
    expect(C.riconosciColonna(intestazione).campo).toBe(campo);
  });
});

describe('normalizzazioni', () => {
  it('email: minuscole, spazi, mailto e domini sbagliati', () => {
    expect(C.normalizzaEmail('  Mario.Rossi@Gmail.COM ').valore).toBe('mario.rossi@gmail.com');
    expect(C.normalizzaEmail('mailto:a@b.it').valore).toBe('a@b.it');
    const corretta = C.normalizzaEmail('anna@gmial.com');
    expect(corretta.valore).toBe('anna@gmail.com');
    expect(corretta.avviso).toMatch(/gmial\.com/);
    expect(C.normalizzaEmail('senza-chiocciola.it').errore).toBe('email non valida');
    expect(C.normalizzaEmail('a@b').errore).toBe('email non valida');
    expect(C.normalizzaEmail('').errore).toBe('email mancante');
  });

  it('telefono: tutto in formato +39', () => {
    expect(C.normalizzaTelefono('333 123 4567').valore).toBe('+393331234567');
    expect(C.normalizzaTelefono('0039 333.1234567').valore).toBe('+393331234567');
    expect(C.normalizzaTelefono('393331234567').valore).toBe('+393331234567');
    expect(C.normalizzaTelefono('+39 (081) 123456').valore).toBe('+39081123456');
    expect(C.normalizzaTelefono('081 1234567').valore).toBe('+390811234567');
    expect(C.normalizzaTelefono('+44 20 7946 0958').valore).toBe('+442079460958');
    expect(C.normalizzaTelefono('').valore).toBeNull();
  });

  it('telefono rovinato da Excel in notazione scientifica: scartato con avviso', () => {
    const r = C.normalizzaTelefono('3,33123E+09');
    expect(r.valore).toBeNull();
    expect(r.avviso).toMatch(/Excel/);
  });

  it('date: formati italiani, ISO e numeri seriali di Excel', () => {
    expect(C.normalizzaData('12/03/2025').valore).toBe('2025-03-12');
    expect(C.normalizzaData('1-3-25').valore).toBe('2025-03-01');
    expect(C.normalizzaData('12.03.2025 18:30').valore).toBe('2025-03-12');
    expect(C.normalizzaData('2025-03-12').valore).toBe('2025-03-12');
    expect(C.normalizzaData('45728').valore).toBe('2025-03-12');
    expect(C.normalizzaData('31/02/2025').avviso).toMatch(/impossibile/);
    expect(C.normalizzaData('marzo').avviso).toMatch(/non riconosciuta/);
  });

  it('maiuscole: sistema solo i nomi tutti maiuscoli o tutti minuscoli', () => {
    expect(C.sistemaMaiuscole('MARIO DE LUCA')).toBe('Mario De Luca');
    expect(C.sistemaMaiuscole("anna d'amico")).toBe("Anna D'Amico");
    expect(C.sistemaMaiuscole('McDonald')).toBe('McDonald');
  });
});

describe('conversione completa', () => {
  const csv = [
    'Nome;Cognome;Email;Telefono;Città;Data iscrizione;Evento;Consenso newsletter;Consenso SMS;Note',
    'MARIO;ROSSI;Mario.Rossi@gmail.com;333 1234567;napoli;12/03/2025;Festa Napoli;sì;no;',
    'Anna;Bianchi;anna@gmial.com;;Milano;01/09/2026;;x;;volontaria',
    'Luca;Verdi;non-una-email;;;;;sì;;',
    'Sara;Neri;sara@libero.it;;;;;no;;',
    ';;mario.rossi@gmail.com;;;01/01/2024;;sì;sì;',
    'Gino;Blu;gino@libero.it;;;;;;;',
  ].join('\n');
  const r = C.converti(csv, OGGI);

  it('tiene i contatti validi e unisce i doppioni', () => {
    expect(r.errore).toBeUndefined();
    expect(r.contatti.map((c) => c.email)).toEqual(['mario.rossi@gmail.com', 'anna@gmail.com']);
    expect(r.riepilogo).toMatchObject({ righeLette: 6, contatti: 2, doppioniUniti: 1, scartati: 3 });
  });

  it('scarta email non valide e chi non ha detto sì alla newsletter', () => {
    expect(r.scarti).toEqual([
      { riga: 4, email: 'non-una-email', motivo: 'email non valida' },
      { riga: 5, email: 'sara@libero.it', motivo: 'senza consenso alla newsletter' },
      { riga: 7, email: 'gino@libero.it', motivo: 'consenso alla newsletter non indicato' },
    ]);
  });

  it('senza colonna del consenso importa tutti gli indirizzi validi', () => {
    expect(C.converti('Email\na@b.it\n', OGGI).contatti).toHaveLength(1);
  });

  it('sistema nomi, telefono, città e data; tiene la data di iscrizione più vecchia', () => {
    const mario = r.contatti[0];
    expect(mario.nome).toBe('Mario Rossi');
    expect(mario.attributi).toMatchObject({
      telefono: '+393331234567',
      citta: 'Napoli',
      data_iscrizione: '2024-01-01',
      evento: 'Festa Napoli',
      consenso_newsletter: true,
      consenso_sms: false,
      importato_il: '2026-10-06',
    });
  });

  it('conserva le colonne non riconosciute e segnala le correzioni', () => {
    expect(r.contatti[1].attributi.note).toBe('volontaria');
    expect(r.avvisi).toEqual([{ riga: 3, email: 'anna@gmail.com', avviso: expect.stringMatching(/gmial/) }]);
  });

  it("l'evento scritto nella pagina vale per tutti i contatti", () => {
    const conEvento = C.converti(csv, { ...OGGI, evento: 'Assemblea Roma' });
    expect(conEvento.contatti.every((c) => c.attributi.evento === 'Assemblea Roma')).toBe(true);
  });

  it('senza colonna email spiega cosa manca', () => {
    expect(C.converti('Nome;Telefono\nMario;333\n', OGGI).errore).toMatch(/colonna delle email/);
  });
});

describe('gruppi di avvio graduale', () => {
  it('5% / 10% / 20% / 30% / resto, partendo dagli iscritti più recenti', () => {
    const righe = ['Email;Data iscrizione'];
    for (let i = 0; i < 200; i++) {
      const giorno = new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10);
      righe.push(`p${i}@esempio.it;${giorno}`);
    }
    righe.push('senzadata@esempio.it;');
    const r = C.converti(righe.join('\n'), OGGI);
    const conta = [1, 2, 3, 4, 5].map((g) => r.contatti.filter((c) => c.attributi.gruppo_avvio === g).length);
    expect(conta).toEqual([10, 20, 40, 61, 70]); // soglie arrotondate su 201: 10, 30, 70, 131
    const primo = r.contatti.find((c) => c.attributi.gruppo_avvio === 1)!;
    expect(primo.attributi.data_iscrizione! >= '2025-07-01').toBe(true);
    expect(r.contatti.find((c) => c.email === 'senzadata@esempio.it')!.attributi.gruppo_avvio).toBe(5);
  });

  it('si possono non assegnare', () => {
    const r = C.converti('Email\na@b.it\n', { ...OGGI, gruppiAvvio: false });
    expect(r.contatti[0].attributi.gruppo_avvio).toBeUndefined();
  });
});

describe('file in uscita', () => {
  it('CSV per Listmonk: email,name,attributes con il JSON tra virgolette', () => {
    const csv = C.csvListmonk([{ email: 'a@b.it', nome: 'Anna, detta "Nina"', attributi: { citta: 'Roma' } }]);
    expect(csv).toBe('email,name,attributes\r\na@b.it,"Anna, detta ""Nina""","{""citta"":""Roma""}"\r\n');
    const [, riga] = C.analizzaCsv(csv, ',');
    expect(JSON.parse(riga[2])).toEqual({ citta: 'Roma' });
  });

  it('CSV di controllo per Excel: BOM e punto e virgola', () => {
    const csv = C.csvControllo([{ riga: 4, email: 'x', motivo: 'email non valida' }], []);
    expect(csv.startsWith('﻿Riga;Email;Esito;Dettaglio')).toBe(true);
    expect(csv).toContain('4;x;SCARTATA;email non valida');
  });
});
