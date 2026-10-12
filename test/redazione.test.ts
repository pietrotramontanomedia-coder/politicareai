import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { svuotaMemoria } from '@/lib/redazione/archivio-server';
import {
  aggiungiCommento,
  aggiungiPersona,
  andamentoGiornaliero,
  aggiungiVersione,
  chiaveNome,
  codaRevisione,
  cronologia,
  eventiDi,
  LIMITI,
  nuovoContenuto,
  OBIETTIVI_PREDEFINITI,
  obiettiviDiOggi,
  percentuale,
  perElenco,
  perLettore,
  puoEliminare,
  puoModificare,
  ripristina,
  segnaEliminato,
  statistiche,
  storieRecenti,
  testoPromemoria,
  testoResoconto,
  tipoImmagine,
  validaBozza,
  validaCommento,
  validaObiettivi,
} from '@/lib/redazione/regole';
import { testoAvviso } from '@/lib/redazione/telegram-server';
import { cookieEntrata, creaToken, leggiToken, ruoloDaCodice, ruoloPerAccesso } from '@/lib/redazione/sessione-server';
import type { BozzaVersione, Contenuto, SessioneRedazione } from '@/lib/redazione/tipi';

/* Portale della redazione: chi scrive, chi corregge, chi vede cosa. */

const ID = (n: number) => n.toString(16).padStart(32, '0');
const ADESSO = new Date('2026-10-09T12:00:00Z');
const giulia: SessioneRedazione = { nome: 'Giulia Rossi', ruolo: 'redattore' };
const marco: SessioneRedazione = { nome: 'Marco', ruolo: 'redattore' };
const capo: SessioneRedazione = { nome: 'Pietro', ruolo: 'revisore' };

function post(immagini = [ID(1)], didascalia = 'Ciao #politica'): BozzaVersione {
  return { immagini, didascalia, formato: '4:5' };
}

function contenuto(autore = giulia.nome, id = ID(100), quando = ADESSO, tipo: 'post' | 'storia' = 'post'): Contenuto {
  const bozza: BozzaVersione =
    tipo === 'post' ? post() : { immagini: [ID(2)], didascalia: '', formato: '1:1' };
  return nuovoContenuto(id, tipo, autore, bozza, quando);
}

describe('regole', () => {
  it('riconosce la stessa persona a prescindere da maiuscole, spazi e accenti', () => {
    expect(chiaveNome('  Giùlia   Rossi ')).toBe('giulia rossi');
  });

  it('valida i post: almeno una card, copy obbligatorio, limiti di Instagram, solo id generati dal server', () => {
    expect(validaBozza('post', { immagini: [], didascalia: 'x' }).ok).toBe(false);
    expect(validaBozza('post', { immagini: ['../segreti'], didascalia: 'x' }).ok).toBe(false);
    expect(validaBozza('post', { immagini: [ID(1)], didascalia: '   ' }).ok).toBe(false);
    expect(validaBozza('post', { immagini: [ID(1), ID(1)] }).ok).toBe(false);
    expect(validaBozza('post', { immagini: Array.from({ length: 11 }, (_, i) => ID(i)) }).ok).toBe(false);
    expect(validaBozza('post', { immagini: [ID(1)], didascalia: 'a'.repeat(LIMITI.didascalia + 1) }).ok).toBe(false);
    expect(validaBozza('post', { immagini: [ID(1)], didascalia: Array.from({ length: 31 }, (_, i) => `#t${i}`).join(' ') }).ok).toBe(false);
    const ok = validaBozza('post', { immagini: [ID(1)], didascalia: '  Ciao  ', formato: '1:1', extra: 'ignorato' });
    expect(ok).toEqual({ ok: true, valore: { immagini: [ID(1)], didascalia: 'Ciao', formato: '1:1' } });
  });

  it('valida le storie: esattamente una immagine, nessun testo', () => {
    expect(validaBozza('storia', { immagini: [] }).ok).toBe(false);
    expect(validaBozza('storia', { immagini: [ID(1), ID(2)] }).ok).toBe(false);
    const ok = validaBozza('storia', { immagini: [ID(1)], didascalia: 'ignorata', storia: { testo: 'vecchio campo' } });
    expect(ok).toEqual({ ok: true, valore: { immagini: [ID(1)], didascalia: '', formato: '1:1' } });
  });

  it('una nuova versione torna da rivedere e conserva le precedenti', () => {
    const c = aggiungiCommento(contenuto(), capo, { tipo: 'correzione', testo: 'Accorcia', stato: 'da_correggere' }, ID(9), ADESSO);
    expect(c.stato).toBe('da_correggere');
    expect(c.commenti[0]).toMatchObject({ autore: 'Pietro', versione: 1, tipo: 'correzione' });
    const v2 = aggiungiVersione(c, post([ID(2)], 'Più corta'), new Date('2026-10-09T13:00:00Z'));
    expect(v2.stato).toBe('da_rivedere');
    expect(v2.versioni.map((v) => v.numero)).toEqual([1, 2]);
    expect(v2.versioni[0].didascalia).toBe('Ciao #politica');
  });

  it('solo l\'autore riscrive; autore e revisori eliminano e vedono le correzioni', () => {
    const c = contenuto();
    expect(puoModificare({ nome: 'giulia rossi', ruolo: 'redattore' }, c)).toBe(true);
    expect(puoModificare(capo, c)).toBe(false);
    expect(puoEliminare(capo, c)).toBe(true);
    expect(puoEliminare(marco, c)).toBe(false);
    const commentato = aggiungiCommento(c, capo, { tipo: 'consiglio', testo: 'Bene', stato: null }, ID(9), ADESSO);
    expect(perLettore(marco, commentato).commenti).toEqual([]);
    expect(perLettore(giulia, commentato).commenti).toHaveLength(1);
  });

  it('i redattori rispondono ma non cambiano lo stato; i colleghi non commentano', () => {
    const c = contenuto();
    const autore = validaCommento(giulia, c, { tipo: 'complimento', testo: 'Fatto', stato: 'approvato' });
    expect(autore).toEqual({ ok: true, valore: { tipo: 'risposta', testo: 'Fatto', stato: null } });
    expect(validaCommento(marco, c, { testo: 'ciao' }).ok).toBe(false);
    expect(validaCommento(capo, c, { stato: 'approvato' })).toEqual({ ok: true, valore: { tipo: 'consiglio', testo: '', stato: 'approvato' } });
    expect(validaCommento(capo, c, {}).ok).toBe(false);
  });

  it('coda, storie del giorno e statistiche della squadra', () => {
    const vecchio = contenuto(giulia.nome, ID(1), new Date('2026-10-01T10:00:00Z'));
    const nuovo = contenuto(marco.nome, ID(2), new Date('2026-10-09T10:00:00Z'));
    const storiaOggi = contenuto(marco.nome, ID(3), new Date('2026-10-09T11:00:00Z'), 'storia');
    const storiaIeri = contenuto(marco.nome, ID(4), new Date('2026-10-07T11:00:00Z'), 'storia');
    const approvato = { ...contenuto(giulia.nome, ID(5)), stato: 'approvato' as const };
    const tutti = [nuovo, vecchio, storiaOggi, storiaIeri, approvato];

    expect(codaRevisione(tutti).map((c) => c.id)).toEqual([ID(1), ID(4), ID(2), ID(3)]);
    expect(storieRecenti(tutti, ADESSO)).toEqual([{ autore: 'Marco', chiave: 'marco', storie: [storiaOggi] }]);
    const stat = statistiche(tutti, ADESSO);
    expect(stat.map((s) => [s.nome, s.settimana, s.post, s.storie, s.approvati])).toEqual([
      ['Marco', 3, 1, 2, 0],
      ['Giulia Rossi', 1, 2, 0, 1],
    ]);
  });

  it('eliminare non cancella: il contenuto finisce nel cestino che vedono solo i revisori', () => {
    const c = nuovoContenuto(ID(1), 'post', giulia.nome, post(), ADESSO);
    const via = segnaEliminato(c, giulia, ADESSO);
    expect(via).toMatchObject({ eliminatoIl: ADESSO.toISOString(), eliminatoDa: 'Giulia Rossi', versioni: c.versioni });
    expect(perElenco(marco, [c, via].map((x, i) => ({ ...x, id: ID(i) })))).toHaveLength(1);
    expect(perElenco(capo, [via])).toHaveLength(1);
    const tornato = JSON.parse(JSON.stringify(ripristina(via, capo, ADESSO))) as Contenuto;
    expect(tornato.eliminatoIl).toBeUndefined();
    expect(perElenco(marco, [tornato])).toHaveLength(1);
  });

  it('obiettivi del giorno e percentuali: la giornata è quella italiana, gli eliminati contano solo nelle percentuali', () => {
    const sera = new Date('2026-10-12T21:30:00Z'); // 23:30 a Roma
    const storia = (n: number, quando: string) => nuovoContenuto(ID(n), 'storia', giulia.nome, { immagini: [ID(n)], didascalia: '', formato: '1:1' }, new Date(quando));
    const contenuti = [
      storia(1, '2026-10-12T06:00:00Z'),
      storia(2, '2026-10-11T22:30:00Z'), // 00:30 del 12 a Roma: conta per oggi
      storia(3, '2026-10-11T21:30:00Z'), // 23:30 dell'11 a Roma: ieri
      aggiungiCommento(nuovoContenuto(ID(4), 'post', giulia.nome, post(), sera), capo, { tipo: 'complimento', testo: '', stato: 'approvato' }, ID(9), sera),
      segnaEliminato(nuovoContenuto(ID(5), 'post', giulia.nome, post(), sera), giulia, sera),
    ];
    const [g] = statistiche(contenuti, sera);
    expect([g.storieOggi, g.postOggi, g.totale, g.eliminati, g.approvati]).toEqual([2, 1, 5, 1, 1]);
    expect([percentuale(g.approvati, g.totale), percentuale(g.eliminati, g.totale), percentuale(1, 0)]).toEqual([20, 20, 0]);
    const testo = testoResoconto(contenuti, OBIETTIVI_PREDEFINITI, sera, 'https://sito/redazione');
    expect(testo).toContain('⚠️ <b>Giulia Rossi</b>: storie 2/5 · post 1/2');
    expect(testo).toContain('In pari: 0 su 1');
    expect(testoResoconto(contenuti, { ...OBIETTIVI_PREDEFINITI, storieGiorno: 2, postGiorno: 1 }, sera, 'l')).toContain('✅ <b>Giulia Rossi</b>');
    // Sabato 17 ottobre valgono gli obiettivi del weekend: 2 storie e 1 post.
    expect(obiettiviDiOggi(OBIETTIVI_PREDEFINITI, new Date('2026-10-17T10:00:00Z'))).toEqual({ storie: 2, post: 1, weekend: true });
    expect(obiettiviDiOggi(OBIETTIVI_PREDEFINITI, sera)).toEqual({ storie: 5, post: 2, weekend: false });
    // Lunedì alle 00:30 a Roma (domenica sera in UTC) il weekend è finito.
    expect(obiettiviDiOggi(OBIETTIVI_PREDEFINITI, new Date('2026-10-18T22:30:00Z')).weekend).toBe(false);
  });

  it('«Non va bene»: solo con il perché, chiude il contenuto e conta a parte', () => {
    const c = nuovoContenuto(ID(1), 'post', giulia.nome, post(), ADESSO);
    expect(validaCommento(capo, c, { stato: 'non_va_bene', testo: '  ' }).ok).toBe(false);
    const r = validaCommento(capo, c, { stato: 'non_va_bene', testo: 'Fuori tema', tipo: 'consiglio' });
    expect(r).toEqual({ ok: true, valore: { tipo: 'bocciatura', testo: 'Fuori tema', stato: 'non_va_bene' } });
    expect(validaCommento(giulia, c, { stato: 'non_va_bene', testo: 'no' })).toMatchObject({ ok: true, valore: { stato: null } });
    const bocciato = aggiungiCommento(c, capo, (r as { valore: Parameters<typeof aggiungiCommento>[2] }).valore, ID(9), ADESSO);
    expect(bocciato.stato).toBe('non_va_bene');
    expect(puoModificare(giulia, bocciato)).toBe(false);
    const [g] = statistiche([bocciato], ADESSO);
    expect([g.nonVaBene, g.approvati]).toEqual([1, 0]);
  });

  it('registro: ogni azione resta, in ordine, e la cronologia mette insieme tutto', () => {
    const t = (m: number) => new Date(ADESSO.getTime() + m * 60_000);
    let c = nuovoContenuto(ID(1), 'post', giulia.nome, post(), t(0));
    c = aggiungiCommento(c, capo, { tipo: 'correzione', testo: 'Accorcia', stato: 'da_correggere' }, ID(8), t(1));
    c = aggiungiVersione(c, post([ID(1)], 'Più corto'), t(2));
    c = aggiungiCommento(c, capo, { tipo: 'complimento', testo: '', stato: 'approvato' }, ID(9), t(3));
    c = segnaEliminato(c, capo, t(4));
    c = ripristina(c, capo, t(5));
    expect(eventiDi(c).map((e) => [e.tipo, e.chi, e.stato ?? e.tipoCommento ?? e.versione ?? null])).toEqual([
      ['pubblicato', 'Giulia Rossi', 1],
      ['commento', 'Pietro', 'correzione'],
      ['stato', 'Pietro', 'da_correggere'],
      ['nuova_versione', 'Giulia Rossi', 2],
      ['stato', 'Pietro', 'approvato'],
      ['eliminato', 'Pietro', null],
      ['ripristinato', 'Pietro', null],
    ]);
    // I contenuti di prima del registro lo ricostruiscono da versioni e commenti.
    const vecchio = { ...c, id: ID(2), eventi: undefined };
    expect(eventiDi(vecchio).map((e) => e.tipo)).toEqual(['pubblicato', 'commento', 'nuova_versione']);
    const voci = cronologia([c, vecchio]);
    expect(voci[0]).toMatchObject({ tipo: 'ripristinato', contenutoId: ID(1), autore: 'Giulia Rossi' });
    expect(voci).toHaveLength(10);
  });

  it('andamento: 14 giorni con gli obiettivi di ciascun giorno, weekend compreso', () => {
    const lunedi = new Date('2026-10-12T18:00:00Z');
    const c = [nuovoContenuto(ID(1), 'post', giulia.nome, post(), new Date('2026-10-11T09:00:00Z'))];
    const giorni = andamentoGiornaliero(c, 'giulia rossi', OBIETTIVI_PREDEFINITI, lunedi);
    expect(giorni).toHaveLength(14);
    expect(giorni.at(-1)).toMatchObject({ giorno: '2026-10-12', obiettivoStorie: 5, inPari: false });
    expect(giorni.at(-2)).toMatchObject({ giorno: '2026-10-11', post: 1, obiettivoStorie: 2, obiettivoPost: 1, inPari: false });
  });

  it('persone: niente doppioni, chi esce si disattiva e torna', () => {
    const una = aggiungiPersona([], ' matteo ', 'Pietro', ADESSO);
    expect(una.ok && una.valore[0]).toMatchObject({ nome: 'matteo', chiave: 'matteo', attiva: true });
    expect(aggiungiPersona(una.ok ? una.valore : [], 'Matteo', 'Pietro', ADESSO).ok).toBe(false);
  });

  it('promemoria dei revisori: solo ciò che aspetta da più di 24 ore, dal più vecchio; niente se è tutto in pari', () => {
    const adesso = new Date('2026-10-13T07:00:00Z');
    const recente = nuovoContenuto(ID(1), 'post', giulia.nome, post(), new Date('2026-10-12T20:00:00Z'));
    const vecchio = nuovoContenuto(ID(2), 'storia', marco.nome, { immagini: [ID(2)], didascalia: '', formato: '1:1' }, new Date('2026-10-10T07:00:00Z'));
    const ieri = nuovoContenuto(ID(3), 'post', giulia.nome, post(), new Date('2026-10-12T05:00:00Z'));
    const testo = testoPromemoria([recente, vecchio, ieri], adesso, 'l')!;
    expect(testo).toContain('Da rivedere da più di 24 ore: 2');
    expect(testo.indexOf('Marco')).toBeLessThan(testo.indexOf('Giulia'));
    expect(testo).toContain('da 3 giorni');
    expect(testo).toContain('da 26 ore');
    expect(testoPromemoria([recente], adesso, 'l')).toBeNull();
    expect(testoResoconto([recente, vecchio], OBIETTIVI_PREDEFINITI, adesso, 'l')).toContain('⏰ In attesa da più di 24 ore: 1');
  });

  it('obiettivi: solo numeri interi ragionevoli', () => {
    expect(validaObiettivi({ storieGiorno: 5, postGiorno: 2 })).toEqual({ ok: true, valore: { storieGiorno: 5, postGiorno: 2, storieWeekend: 2, postWeekend: 1 } });
    expect(validaObiettivi({ storieGiorno: 5, postGiorno: 2, storieWeekend: 31, postWeekend: 1 }).ok).toBe(false);
    expect(validaObiettivi({ storieGiorno: -1, postGiorno: 2 }).ok).toBe(false);
    expect(validaObiettivi({ storieGiorno: 2.5, postGiorno: 2 }).ok).toBe(false);
    expect(validaObiettivi({ storieGiorno: '5', postGiorno: 2 }).ok).toBe(false);
  });

  it('avviso Telegram: chi, cosa, copy accorciato e link, dentro i 1024 caratteri', () => {
    const c = nuovoContenuto(ID(1), 'post', 'Giulia <b>', post([ID(1)], 'x'.repeat(3000)), ADESSO);
    const testo = testoAvviso(c, 'https://sito/redazione?apri=1');
    expect(testo.length).toBeLessThanOrEqual(1024);
    expect(testo).toContain('Giulia &lt;b&gt;</b> ha pubblicato un post');
    expect(testo).toContain('…');
    expect(testo).toMatch(/Apri nel portale<\/a>$/);
    const v2 = aggiungiVersione(c, post([ID(1)], 'corto'), ADESSO);
    expect(testoAvviso(v2, 'l')).toContain('ha corretto il post (versione 2)');
  });

  it('riconosce le immagini dai primi byte', () => {
    expect(tipoImmagine(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(tipoImmagine(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(tipoImmagine(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(tipoImmagine(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
  });
});

describe('sessione', () => {
  beforeEach(() => {
    vi.stubEnv('REDAZIONE_CODICE', 'ragazzi-2026');
    vi.stubEnv('REDAZIONE_CODICE_REVISORI', 'capi-2026');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('il codice decide il ruolo', () => {
    expect(ruoloDaCodice('ragazzi-2026')).toBe('redattore');
    expect(ruoloDaCodice(' capi-2026 ')).toBe('revisore');
    expect(ruoloDaCodice('sbagliato')).toBeNull();
  });

  it('con l\'elenco dei revisori la loro password vale solo per quei nomi, e quei nomi non entrano come redattori', () => {
    expect(ruoloPerAccesso('Chiunque', 'capi-2026')).toEqual({ ruolo: 'revisore' });
    vi.stubEnv('REDAZIONE_REVISORI', 'Pietro Tramontano, Jacopo Esposito,Federico Brignacca');
    expect(ruoloPerAccesso('  pietro  TRAMONTANO', 'capi-2026')).toEqual({ ruolo: 'revisore' });
    expect(ruoloPerAccesso('Giulia Rossi', 'capi-2026')).toHaveProperty('errore');
    expect(ruoloPerAccesso('Jacopo Esposito', 'ragazzi-2026')).toHaveProperty('errore');
    expect(ruoloPerAccesso('Giulia Rossi', 'ragazzi-2026')).toEqual({ ruolo: 'redattore' });
    expect(ruoloPerAccesso('Federico Brignacca', 'sbagliato')).toEqual({ errore: 'Codice non valido.' });
  });

  it('senza codici configurati non si entra', () => {
    vi.stubEnv('REDAZIONE_CODICE', '');
    expect(ruoloDaCodice('')).toBeNull();
    expect(creaToken(giulia, ADESSO)).toBeNull();
  });

  it('il token firmato non si può alterare e scade dopo 30 giorni', () => {
    const token = creaToken(giulia, ADESSO)!;
    expect(leggiToken(token, ADESSO)).toEqual(giulia);
    const [dati, firma] = token.split('.');
    const falsificato = Buffer.from(JSON.stringify({ n: 'Giulia Rossi', r: 'revisore', s: Date.now() + 1e9 })).toString('base64url');
    expect(leggiToken(`${falsificato}.${firma}`, ADESSO)).toBeNull();
    expect(leggiToken(`${dati}.x${firma.slice(1)}`, ADESSO)).toBeNull();
    expect(leggiToken(token, new Date(ADESSO.getTime() + 31 * 24 * 3600_000))).toBeNull();
  });

  it('cambiare un codice fa uscire tutti', () => {
    const token = creaToken(giulia, ADESSO)!;
    vi.stubEnv('REDAZIONE_CODICE', 'nuovo-codice');
    expect(leggiToken(token, ADESSO)).toBeNull();
  });

  it('il cookie è HttpOnly', () => {
    expect(cookieEntrata('abc')).toMatch(/HttpOnly; SameSite=Lax/);
  });
});

describe('API', () => {
  const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

  beforeEach(() => {
    vi.stubEnv('REDAZIONE_CODICE', 'ragazzi-2026');
    vi.stubEnv('REDAZIONE_CODICE_REVISORI', 'capi-2026');
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    svuotaMemoria();
  });
  afterEach(() => vi.unstubAllEnvs());

  function cookie(s: SessioneRedazione) {
    return `redazione_sessione=${encodeURIComponent(creaToken(s, new Date())!)}`;
  }

  function richiesta(url: string, s: SessioneRedazione | null, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (s) headers.set('cookie', cookie(s));
    if (typeof init.body === 'string') headers.set('content-type', 'application/json');
    return new Request(`http://sito${url}`, { ...init, headers });
  }

  const parametri = (id: string) => ({ params: Promise.resolve({ id }) });

  it('accesso: nome e codice giusti danno il cookie, altrimenti no', async () => {
    const { POST } = await import('@/app/api/redazione/accesso/route');
    const giusto = await POST(richiesta('/api/redazione/accesso', null, { method: 'POST', body: JSON.stringify({ nome: ' Giulia ', codice: 'ragazzi-2026' }) }));
    expect(giusto.status).toBe(200);
    expect(await giusto.json()).toMatchObject({ sessione: { nome: 'Giulia', ruolo: 'redattore' } });
    expect(giusto.headers.get('set-cookie')).toMatch(/^redazione_sessione=/);
    const sbagliato = await POST(richiesta('/api/redazione/accesso', null, { method: 'POST', body: JSON.stringify({ nome: 'Giulia', codice: 'no' }) }));
    expect(sbagliato.status).toBe(401);
    expect(sbagliato.headers.get('set-cookie')).toBeNull();
  });

  it('senza sessione niente contenuti né foto', async () => {
    const { GET } = await import('@/app/api/redazione/contenuti/route');
    expect((await GET(richiesta('/api/redazione/contenuti', null))).status).toBe(401);
    const media = await import('@/app/api/redazione/media/[id]/route');
    expect((await media.GET(richiesta(`/api/redazione/media/${ID(1)}`, null), parametri(ID(1)))).status).toBe(401);
  });

  it('giro completo: foto, post, correzione, nuova versione, approvazione, cestino e ripristino', async () => {
    const media = await import('@/app/api/redazione/media/route');
    const mediaId = await import('@/app/api/redazione/media/[id]/route');
    const contenuti = await import('@/app/api/redazione/contenuti/route');
    const uno = await import('@/app/api/redazione/contenuti/[id]/route');
    const commenti = await import('@/app/api/redazione/contenuti/[id]/commenti/route');

    // Foto: solo immagini vere.
    const svg = await media.POST(richiesta('/api/redazione/media', giulia, { method: 'POST', body: new TextEncoder().encode('<svg/>') }));
    expect(svg.status).toBe(415);
    const caricata = await media.POST(richiesta('/api/redazione/media', giulia, { method: 'POST', body: JPEG }));
    const { id: foto } = (await caricata.json()) as { id: string };
    const letta = await mediaId.GET(richiesta(`/api/redazione/media/${foto}`, marco), parametri(foto));
    expect(letta.headers.get('content-type')).toBe('image/jpeg');
    expect(letta.headers.get('cache-control')).toMatch(/^private/);

    // Post di Giulia.
    const creato = await contenuti.POST(
      richiesta('/api/redazione/contenuti', giulia, { method: 'POST', body: JSON.stringify({ tipo: 'post', immagini: [foto], didascalia: 'Primo post', formato: '4:5' }) }),
    );
    expect(creato.status).toBe(201);
    const { contenuto } = (await creato.json()) as { contenuto: Contenuto };
    expect(contenuto).toMatchObject({ autore: 'Giulia Rossi', stato: 'da_rivedere' });

    // Il revisore chiede una correzione.
    const corretto = await commenti.POST(
      richiesta(`/api/redazione/contenuti/${contenuto.id}/commenti`, capo, { method: 'POST', body: JSON.stringify({ tipo: 'correzione', testo: 'Gancio più forte', stato: 'da_correggere' }) }),
      parametri(contenuto.id),
    );
    expect(((await corretto.json()) as { contenuto: Contenuto }).contenuto.stato).toBe('da_correggere');

    // Marco vede il post nel feed ma non la correzione, e non può riscriverlo né cancellarlo.
    const feedMarco = (await (await contenuti.GET(richiesta('/api/redazione/contenuti', marco))).json()) as { contenuti: Contenuto[] };
    expect(feedMarco.contenuti).toHaveLength(1);
    expect(feedMarco.contenuti[0].commenti).toEqual([]);
    const riscrittoDaMarco = await uno.PUT(
      richiesta(`/api/redazione/contenuti/${contenuto.id}`, marco, { method: 'PUT', body: JSON.stringify({ immagini: [foto], didascalia: 'mio' }) }),
      parametri(contenuto.id),
    );
    expect(riscrittoDaMarco.status).toBe(403);
    expect((await uno.DELETE(richiesta(`/api/redazione/contenuti/${contenuto.id}`, marco, { method: 'DELETE' }), parametri(contenuto.id))).status).toBe(403);

    // Giulia vede la correzione e pubblica la versione 2.
    const feedGiulia = (await (await contenuti.GET(richiesta('/api/redazione/contenuti', giulia))).json()) as { contenuti: Contenuto[] };
    expect(feedGiulia.contenuti[0].commenti[0].testo).toBe('Gancio più forte');
    const v2 = await uno.PUT(
      richiesta(`/api/redazione/contenuti/${contenuto.id}`, giulia, { method: 'PUT', body: JSON.stringify({ immagini: [foto], didascalia: 'Lo sapevi che…', formato: '1:1' }) }),
      parametri(contenuto.id),
    );
    const { contenuto: dopo } = (await v2.json()) as { contenuto: Contenuto };
    expect(dopo.stato).toBe('da_rivedere');
    expect(dopo.versioni).toHaveLength(2);

    // Giulia non può approvarsi da sola.
    await commenti.POST(
      richiesta(`/api/redazione/contenuti/${contenuto.id}/commenti`, giulia, { method: 'POST', body: JSON.stringify({ testo: 'Fatto!', stato: 'approvato' }) }),
      parametri(contenuto.id),
    );
    const approvato = await commenti.POST(
      richiesta(`/api/redazione/contenuti/${contenuto.id}/commenti`, capo, { method: 'POST', body: JSON.stringify({ tipo: 'complimento', testo: 'Perfetto', stato: 'approvato' }) }),
      parametri(contenuto.id),
    );
    const finale = ((await approvato.json()) as { contenuto: Contenuto }).contenuto;
    expect(finale.stato).toBe('approvato');
    expect(finale.commenti.map((c) => [c.tipo, c.versione])).toEqual([
      ['correzione', 1],
      ['risposta', 2],
      ['complimento', 2],
    ]);

    // Il revisore elimina: sparisce dal feed dei ragazzi, ma foto e contenuto restano.
    expect((await uno.DELETE(richiesta(`/api/redazione/contenuti/${contenuto.id}`, capo, { method: 'DELETE' }), parametri(contenuto.id))).status).toBe(200);
    expect((await mediaId.GET(richiesta(`/api/redazione/media/${foto}`, capo), parametri(foto))).status).toBe(200);
    const feedDopo = (await (await contenuti.GET(richiesta('/api/redazione/contenuti', marco))).json()) as { contenuti: Contenuto[] };
    expect(feedDopo.contenuti).toHaveLength(0);
    expect((await uno.GET(richiesta(`/api/redazione/contenuti/${contenuto.id}`, giulia), parametri(contenuto.id))).status).toBe(404);
    const cestino = (await (await contenuti.GET(richiesta('/api/redazione/contenuti', capo))).json()) as { contenuti: Contenuto[] };
    expect(cestino.contenuti[0].eliminatoDa).toBe('Pietro');

    // Solo il revisore ripristina, e torna tutto com'era.
    expect((await uno.PATCH(richiesta(`/api/redazione/contenuti/${contenuto.id}`, giulia, { method: 'PATCH' }), parametri(contenuto.id))).status).toBe(403);
    const ripristinato = await uno.PATCH(richiesta(`/api/redazione/contenuti/${contenuto.id}`, capo, { method: 'PATCH' }), parametri(contenuto.id));
    expect(((await ripristinato.json()) as { contenuto: Contenuto }).contenuto).toMatchObject({ stato: 'approvato', versioni: [{}, {}] });
    expect(((await (await contenuti.GET(richiesta('/api/redazione/contenuti', marco))).json()) as { contenuti: Contenuto[] }).contenuti).toHaveLength(1);
  });

  it('obiettivi: li cambia solo chi corregge e arrivano a tutti con il feed', async () => {
    const route = await import('@/app/api/redazione/obiettivi/route');
    const contenuti = await import('@/app/api/redazione/contenuti/route');
    const corpo = JSON.stringify({ storieGiorno: 3, postGiorno: 1 });
    expect((await route.PUT(richiesta('/api/redazione/obiettivi', giulia, { method: 'PUT', body: corpo }))).status).toBe(403);
    expect((await route.PUT(richiesta('/api/redazione/obiettivi', capo, { method: 'PUT', body: corpo }))).status).toBe(200);
    const feed = (await (await contenuti.GET(richiesta('/api/redazione/contenuti', giulia))).json()) as { obiettivi: { storieGiorno: number; aggiornatoDa: string } };
    expect(feed.obiettivi).toMatchObject({ storieGiorno: 3, aggiornatoDa: 'Pietro' });
  });

  it('password personali: chi è in elenco entra solo con la sua, gli altri ragazzi non entrano più', async () => {
    const accesso = await import('@/app/api/redazione/accesso/route');
    const persone = await import('@/app/api/redazione/persone/route');
    const entra = (nome: string, codice: string) => accesso.POST(richiesta('/api/redazione/accesso', null, { method: 'POST', body: JSON.stringify({ nome, codice }) }));
    expect((await persone.POST(richiesta('/api/redazione/persone', giulia, { method: 'POST', body: JSON.stringify({ nome: 'Matteo', password: 'Matteo2026' }) }))).status).toBe(403);
    expect((await persone.POST(richiesta('/api/redazione/persone', capo, { method: 'POST', body: JSON.stringify({ nome: 'Matteo', password: '123' }) }))).status).toBe(400);
    const creata = await persone.POST(richiesta('/api/redazione/persone', capo, { method: 'POST', body: JSON.stringify({ nome: 'Matteo', password: 'Matteo2026' }) }));
    const elenco = (await creata.json()) as { persone: Record<string, unknown>[] };
    expect(elenco.persone[0]).toMatchObject({ nome: 'Matteo', conPassword: true });
    expect(elenco.persone[0]).not.toHaveProperty('password');
    expect((await entra('matteo', 'Matteo2026')).status).toBe(200);
    expect((await entra('Matteo', 'ragazzi-2026')).status).toBe(401);
    expect((await entra('Giulia', 'ragazzi-2026')).status).toBe(401);
    expect((await entra('Pietro', 'capi-2026')).status).toBe(200);
    // Disattivato non entra più, ma il suo lavoro resta.
    await persone.PATCH(richiesta('/api/redazione/persone', capo, { method: 'PATCH', body: JSON.stringify({ chiave: 'matteo', attiva: false }) }));
    expect((await entra('Matteo', 'Matteo2026')).status).toBe(401);
  });

  it('identificativi strani non arrivano all\'archivio', async () => {
    const uno = await import('@/app/api/redazione/contenuti/[id]/route');
    const r = await uno.GET(richiesta('/api/redazione/contenuti/..%2Fradar', capo), parametri('../radar/stato'));
    expect(r.status).toBe(404);
  });
});
