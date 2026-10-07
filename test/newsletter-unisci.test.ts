import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

/*
 * Unione dei contatti (strumenti/newsletter/convertitore/unisci.js), con dati inventati
 * nel formato degli export reali di Shopify, Mailchimp ed Eventbrite.
 */

type Contatto = {
  email: string; nomeCompleto: string; telefono: string; citta: string; provincia: string; paese: string;
  fonti: string[]; segmenti: string[]; tag: string[]; eventi: string[];
  nOrdini: number; spesa: number; ultimoOrdine: string; statoMailchimp: string;
  invia: boolean; blocklist: boolean; motivo: string; gruppoAvvio?: number;
};
type Esito = { contatti: Contatto[]; fonti: { nome: string; tipo: string; righe: number; scartate: number }[]; scarti: unknown[] };
type Api = {
  leggiZip(b: Uint8Array): Promise<{ nome: string; byte: Uint8Array }[]>;
  tipoFonte(nome: string, testo: string): string;
  statoMailchimp(nome: string): string;
  unisci(f: { nome: string; testo: string }[], o?: Record<string, unknown>): Esito;
  riepilogo(e: Esito): Record<string, unknown>;
  csvDatabase(c: Contatto[]): string;
  csvListmonkIscritti(c: Contatto[]): string;
  csvListmonkBlocklist(c: Contatto[]): string;
};

const cartella = new URL('../strumenti/newsletter/convertitore/', import.meta.url);
const contesto = {
  TextDecoder, Blob, Response, DecompressionStream,
} as Record<string, unknown>;
runInNewContext(readFileSync(new URL('logica.js', cartella), 'utf8'), contesto);
runInNewContext(readFileSync(new URL('unisci.js', cartella), 'utf8'), contesto);
const U = contesto.UnisciContatti as Api;
const OGGI = { oggi: '2026-10-07' };

const SHOPIFY_CLIENTI = [
  'Customer ID,First Name,Last Name,Email,Accepts Email Marketing,Default Address City,Default Address Province Code,Default Address Country Code,Default Address Zip,Default Address Phone,Phone,Total Spent,Total Orders,Tags',
  "1,ANNA,BIANCHI,anna@esempio.it,yes,roma,RM,IT,00100,'+39 333 1111111,,79.80,2,newsletter",
  '2,Luca,Verdi,luca@esempio.it,no,Milano,MI,IT,20100,,,39.90,1,',
  '3,Sara,Neri,sara@esempio.it,no,Bari,BA,IT,70100,,,0.00,0,',
].join('\n');

const SHOPIFY_ORDINI = [
  'Name,Email,Financial Status,Accepts Marketing,Total,Refunded Amount,Created at,Lineitem name,Billing Name,Billing City,Billing Province,Billing Country,Billing Zip,Billing Phone',
  '#1001,luca@esempio.it,paid,no,46.36,0.00,2024-02-21 10:00:00 +0100,Felpa Politico X - M,Luca Verdi,Milano,MI,IT,20100,3332222222',
  '#1002,marco@esempio.it,paid,yes,46.36,0.00,2024-02-22 10:00:00 +0100,Felpa Politico Y - L,Marco Gialli,Torino,TO,IT,10100,',
  '#1002,marco@esempio.it,,,,,2024-02-22 10:00:00 +0100,Maglietta Politico Y - L,,,,,,',
  '#1003,hans@esempio.de,paid,yes,50.00,0.00,2024-02-23 10:00:00 +0100,Felpa Politico Z - M,Hans Muller,Berlin,,DE,10115,',
].join('\n');

const MAILCHIMP = 'Email Address,First Name,Last Name,Phone Number,MEMBER_RATING,OPTIN_TIME,CONFIRM_TIME,CC,TAGS,SOURCE\n';
const MC_ISCRITTI = MAILCHIMP + 'giulia@esempio.it,Giulia,Rosa,,3,2023-05-01 10:00:00,2023-05-01 10:05:00,IT,"""Evento Roma"",""Volontari""",Hosted Signup Form\n'
  + 'luca@esempio.it,Luca,Verdi,,2,2023-01-01 10:00:00,,IT,,Embedded Form\n'
  + 'importato@esempio.it,,,,2,2024-02-01 10:00:00,,IT,Cliente,List Import from File\n'
  + 'sara@esempio.it,,,,2,2024-02-01 10:00:00,,IT,Cliente,List Import from File\n';
const MC_DISISCRITTI = MAILCHIMP + 'anna@esempio.it,Anna,Bianchi,,1,2022-01-01 10:00:00,,IT,,Hosted Signup Form\n';
const MC_PULITI = MAILCHIMP + 'rimbalza@esempio.it,,,,1,2022-01-01 10:00:00,,IT,,Hosted Signup Form\n';

const EVENTBRITE = [
  'Order #,Order Date,First Name,Last Name,Email,Event Name,Ticket Type,Attendee Status,Tieni informato dall\'organizzatore',
  '111,2025-03-10 18:00,Paolo,Blu,paolo@esempio.it,Politicare Live Roma,Ingresso,Attending,Sì',
  '112,2025-03-10 18:05,Elena,Viola,elena@esempio.it,Politicare Live Roma,Ingresso,Attending,No',
  '113,2025-06-01 18:00,Paolo,Blu,paolo@esempio.it,Politicare Live Napoli,Ingresso,Attending,',
].join('\n');

function tutti() {
  return U.unisci([
    { nome: 'customers_export.csv', testo: SHOPIFY_CLIENTI },
    { nome: 'orders_export_1.csv', testo: SHOPIFY_ORDINI },
    { nome: 'subscribed_email_audience_export_abc.csv', testo: MC_ISCRITTI },
    { nome: 'unsubscribed_email_audience_export_abc.csv', testo: MC_DISISCRITTI },
    { nome: 'cleaned_email_audience_export_abc.csv', testo: MC_PULITI },
    { nome: 'report-partecipanti.csv', testo: EVENTBRITE },
  ], OGGI);
}
const per = (e: Esito, email: string) => e.contatti.find((c) => c.email === email)!;

describe('riconoscimento delle fonti', () => {
  it('dai nomi delle colonne', () => {
    expect(U.tipoFonte('x.csv', SHOPIFY_CLIENTI)).toBe('shopify-clienti');
    expect(U.tipoFonte('orders_export.csv', SHOPIFY_ORDINI)).toBe('shopify-ordini');
    expect(U.tipoFonte('abandoned_checkouts.csv', SHOPIFY_ORDINI)).toBe('shopify-carrelli');
    expect(U.tipoFonte('x.csv', MC_ISCRITTI)).toBe('mailchimp');
    expect(U.tipoFonte('x.csv', 'Indirizzo email,Nome,Cognome,Numero di telefono,MEMBER_RATING,OPTIN_TIME,LEID\n')).toBe('mailchimp');
    expect(U.tipoFonte('x.csv', EVENTBRITE)).toBe('eventbrite');
    expect(U.tipoFonte('x.csv', 'Nome;Email\nMario;m@b.it')).toBe('generico');
  });

  it('stato Mailchimp dal nome del file', () => {
    expect(U.statoMailchimp('subscribed_email_audience_export_1.csv')).toBe('iscritto');
    expect(U.statoMailchimp('unsubscribed_email_audience_export_1.csv')).toBe('disiscritto');
    expect(U.statoMailchimp('cleaned_email_audience_export_1.csv')).toBe('non_valido');
    expect(U.statoMailchimp('non-subscribed_email_audience_export_1.csv')).toBe('mai_iscritto');
  });
});

describe('unione', () => {
  const e = tutti();

  it('un contatto per email, da tutte le fonti', () => {
    expect(e.contatti.map((c) => c.email).sort()).toEqual([
      'anna@esempio.it', 'elena@esempio.it', 'giulia@esempio.it', 'hans@esempio.de', 'importato@esempio.it', 'luca@esempio.it',
      'marco@esempio.it', 'paolo@esempio.it', 'rimbalza@esempio.it', 'sara@esempio.it',
    ]);
    expect(per(e, 'luca@esempio.it').fonti.sort()).toEqual(['mailchimp', 'shopify']);
  });

  it('chi si è disiscritto da Mailchimp non riceve nulla, anche con il consenso su Shopify', () => {
    const anna = per(e, 'anna@esempio.it');
    expect(anna.invia).toBe(false);
    expect(anna.blocklist).toBe(true);
    expect(anna.motivo).toBe('disiscritto da Mailchimp');
    expect(per(e, 'rimbalza@esempio.it').motivo).toMatch(/non valido/);
  });

  it('il consenso in una fonte basta', () => {
    expect(per(e, 'luca@esempio.it')).toMatchObject({ invia: true, motivo: 'consenso: Mailchimp' });
    expect(per(e, 'marco@esempio.it')).toMatchObject({ invia: true, motivo: 'consenso: Shopify' });
    expect(per(e, 'paolo@esempio.it')).toMatchObject({ invia: true, motivo: 'consenso: Eventbrite' });
  });

  it('senza consenso resta nel database ma non riceve la newsletter', () => {
    expect(per(e, 'elena@esempio.it')).toMatchObject({ invia: false, motivo: 'partecipante a eventi senza consenso alla newsletter' });
    expect(e.contatti.some((c) => c.email === 'elena@esempio.it')).toBe(true);
  });

  it('Eventbrite con intestazioni in italiano: eventi distinti per data, nessun consenso', () => {
    const csv = [
      "ID dell'ordine,Data dell'ordine,Nome del partecipante,Cognome del partecipante,E-mail del partecipante,Numero di telefono,Nome dell'evento,ID evento,Data di inizio dell'evento,Ospite",
      '1,2024-09-02 21:10:58,Ugo,Neri,ugo@esempio.it,,La Giovane Politica,1,2024-10-01,No',
      '2,2025-09-02 21:10:58,Ugo,Neri,ugo@esempio.it,3331234567,La Giovane Politica,2,2025-10-01,No',
      'TOTALI,,,,,,,,,',
    ].join('\n');
    expect(U.tipoFonte('x.csv', csv)).toBe('eventbrite');
    const esito = U.unisci([{ nome: 'La_Giovane_Politica_Attendees.csv', testo: csv }], OGGI);
    expect(esito.scarti).toEqual([]);
    expect(esito.contatti).toHaveLength(1);
    expect(esito.contatti[0]).toMatchObject({
      nomeCompleto: 'Ugo Neri', telefono: '+393331234567', invia: false,
      eventi: ['La Giovane Politica (2024-10-01)', 'La Giovane Politica (2025-10-01)'],
    });
  });

  it('su Mailchimp chi è stato importato da file non conta come iscritto', () => {
    expect(per(e, 'importato@esempio.it')).toMatchObject({ invia: false, motivo: 'importato in Mailchimp da file, consenso da verificare' });
    expect(per(e, 'sara@esempio.it')).toMatchObject({ invia: false, motivo: 'importato in Mailchimp da file, consenso da verificare (su Shopify ha detto no)' });
  });

  it('chi ha detto no su Shopify non riceve la newsletter', () => {
    const e2 = U.unisci([{ nome: 'customers_export.csv', testo: SHOPIFY_CLIENTI }], OGGI);
    expect(per(e2, 'sara@esempio.it')).toMatchObject({ invia: false, motivo: 'ha rifiutato il marketing su Shopify' });
  });

  it('ordini: uno per numero, spesa sommata, totali di sempre dall\'export clienti', () => {
    expect(per(e, 'marco@esempio.it')).toMatchObject({ nOrdini: 1, spesa: 46.36, ultimoOrdine: '2024-02-22' });
    expect(per(e, 'anna@esempio.it')).toMatchObject({ nOrdini: 2, spesa: 79.8 });
  });

  it('segmenti: fonti, clienti, zone, estero, eventi', () => {
    expect(per(e, 'anna@esempio.it').segmenti).toEqual(expect.arrayContaining(['fonte_shopify', 'fonte_mailchimp', 'cliente_ricorrente', 'cliente', 'zona_RM']));
    expect(per(e, 'sara@esempio.it').segmenti).toContain('shopify_senza_acquisti');
    expect(per(e, 'hans@esempio.de').segmenti).toContain('estero');
    expect(per(e, 'paolo@esempio.it').eventi).toEqual(['Politicare Live Roma', 'Politicare Live Napoli']);
    expect(per(e, 'elena@esempio.it').motivo).toBe('partecipante a eventi senza consenso alla newsletter');
    expect(per(e, 'paolo@esempio.it').segmenti).toContain('partecipante_eventi');
  });

  it('Mailchimp con intestazioni in italiano', () => {
    const it = U.unisci([{
      nome: 'unsubscribed_email_audience_export_x.csv',
      testo: 'Indirizzo email,Nome,Cognome,Numero di telefono,MEMBER_RATING,OPTIN_TIME,LEID,TAGS\nzeta@esempio.it,ZETA,ROSSI,333 4444444,2,2023-01-01 10:00:00,1,\n',
    }], OGGI).contatti[0];
    expect(it).toMatchObject({ email: 'zeta@esempio.it', nomeCompleto: 'Zeta Rossi', telefono: '+393334444444', blocklist: true, invia: false });
  });

  it('tag di Mailchimp e di Shopify', () => {
    expect(per(e, 'giulia@esempio.it').tag).toEqual(['Evento Roma', 'Volontari', 'origine Mailchimp: Hosted Signup Form']);
    expect(per(e, 'anna@esempio.it').tag).toEqual(['newsletter', 'origine Mailchimp: Hosted Signup Form']);
  });

  it('nomi, telefoni e città sistemati', () => {
    expect(per(e, 'anna@esempio.it')).toMatchObject({ nomeCompleto: 'Anna Bianchi', telefono: '+393331111111', citta: 'Roma' });
    expect(per(e, 'luca@esempio.it').telefono).toBe('+393332222222');
  });

  it('i prodotti acquistati non finiscono da nessuna parte', () => {
    const tutto = U.csvDatabase(e.contatti) + U.csvListmonkIscritti(e.contatti);
    expect(tutto).not.toMatch(/Politico|Felpa|Maglietta/);
  });

  it('gruppi di avvio solo per chi riceve la newsletter', () => {
    expect(e.contatti.filter((c) => c.invia).every((c) => c.gruppoAvvio! >= 1)).toBe(true);
    expect(e.contatti.filter((c) => !c.invia).every((c) => c.gruppoAvvio === undefined)).toBe(true);
  });
});

describe('consenso di Shopify', () => {
  const intestazione = 'Customer ID,First Name,Last Name,Email,Accepts Email Marketing,Accepts SMS Marketing,Total Orders,Tags';

  it('un export con tutti «yes» è stato modificato: la colonna viene ignorata', () => {
    const righe = [intestazione];
    for (let i = 0; i < 60; i++) righe.push(`${i},N,C,c${i}@esempio.it,yes,yes,1,`);
    const e = U.unisci([{ nome: 'customers_export_pulito.csv', testo: righe.join('\n') }], OGGI);
    expect(e.fonti[0].avviso).toMatch(/modificato/);
    expect(e.contatti.every((c) => !c.invia)).toBe(true);
  });

  it('un «no» vero resta tale anche se un file modificato dice «yes»', () => {
    const modificato = [intestazione];
    for (let i = 0; i < 60; i++) modificato.push(`${i},N,C,c${i}@esempio.it,yes,yes,1,`);
    const originale = `${intestazione}\n0,N,C,c0@esempio.it,no,no,1,\n`;
    const e = U.unisci([
      { nome: 'customers_export.csv', testo: originale },
      { nome: 'customers_export_pulito.csv', testo: modificato.join('\n') },
    ], OGGI);
    expect(e.contatti.find((c) => c.email === 'c0@esempio.it')).toMatchObject({ invia: false, motivo: 'ha rifiutato il marketing su Shopify' });
  });

  it('con poche righe o con qualche «no» il file è credibile', () => {
    const e = U.unisci([{ nome: 'c.csv', testo: `${intestazione}\n1,N,C,a@esempio.it,yes,no,1,\n` }], OGGI);
    expect(e.fonti[0].avviso).toBeUndefined();
    expect(e.contatti[0].invia).toBe(true);
  });

  it('il tag «newsletter» del modulo del negozio vale come consenso', () => {
    const righe = [intestazione];
    for (let i = 0; i < 60; i++) righe.push(`${i},N,C,c${i}@esempio.it,yes,yes,1,${i === 5 ? 'newsletter' : ''}`);
    const e = U.unisci([{ nome: 'customers_export_pulito.csv', testo: righe.join('\n') }], OGGI);
    expect(e.contatti.filter((c) => c.invia).map((c) => [c.email, c.motivo])).toEqual([
      ['c5@esempio.it', 'consenso: Shopify (modulo newsletter)'],
    ]);
  });
});

describe('file in uscita', () => {
  const e = tutti();

  it('iscritti per Listmonk: solo chi ha il consenso', () => {
    const csv = U.csvListmonkIscritti(e.contatti);
    const righe = csv.trim().split('\r\n');
    expect(righe[0]).toBe('email,name,attributes');
    expect(righe).toHaveLength(1 + e.contatti.filter((c) => c.invia).length);
    expect(csv).not.toContain('anna@esempio.it');
    expect(csv).not.toContain('elena@esempio.it');
  });

  it('blocklist: disiscritti e indirizzi non validi', () => {
    const csv = U.csvListmonkBlocklist(e.contatti);
    expect(csv).toContain('anna@esempio.it');
    expect(csv).toContain('rimbalza@esempio.it');
    expect(csv.trim().split('\r\n')).toHaveLength(3);
  });

  it('database per Excel: BOM, punto e virgola, colonna Newsletter', () => {
    const csv = U.csvDatabase(e.contatti);
    expect(csv.startsWith('﻿Email;Nome;Cognome')).toBe(true);
    expect(csv).toMatch(/luca@esempio\.it;Luca;Verdi;.*;SÌ;consenso: Mailchimp;/);
  });
});

describe('zip di Mailchimp', () => {
  function zip(voci: { nome: string; testo: string }[]) {
    const locali: Buffer[] = [];
    const centrali: Buffer[] = [];
    let offset = 0;
    for (const v of voci) {
      const nome = Buffer.from(v.nome);
      const dati = deflateRawSync(Buffer.from(v.testo));
      const l = Buffer.alloc(30);
      l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(8, 8); l.writeUInt32LE(dati.length, 18);
      l.writeUInt32LE(Buffer.byteLength(v.testo), 22); l.writeUInt16LE(nome.length, 26);
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(dati.length, 20);
      c.writeUInt32LE(Buffer.byteLength(v.testo), 24); c.writeUInt16LE(nome.length, 28); c.writeUInt32LE(offset, 42);
      locali.push(l, nome, dati);
      centrali.push(c, nome);
      offset += 30 + nome.length + dati.length;
    }
    const dir = Buffer.concat(centrali);
    const fine = Buffer.alloc(22);
    fine.writeUInt32LE(0x06054b50, 0); fine.writeUInt16LE(voci.length, 8); fine.writeUInt16LE(voci.length, 10);
    fine.writeUInt32LE(dir.length, 12); fine.writeUInt32LE(offset, 16);
    return new Uint8Array(Buffer.concat([...locali, dir, fine]));
  }

  it('estrae i CSV compressi', async () => {
    const voci = await U.leggiZip(zip([
      { nome: 'subscribed_email_audience_export_abc.csv', testo: MC_ISCRITTI },
      { nome: 'unsubscribed_email_audience_export_abc.csv', testo: MC_DISISCRITTI },
    ]));
    expect(voci.map((v) => v.nome)).toEqual(['subscribed_email_audience_export_abc.csv', 'unsubscribed_email_audience_export_abc.csv']);
    expect(new TextDecoder().decode(voci[0].byte)).toBe(MC_ISCRITTI);
  });
});
