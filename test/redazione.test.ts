import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { svuotaMemoria } from '@/lib/redazione/archivio-server';
import {
  aggiungiCommento,
  aggiungiVersione,
  chiaveNome,
  codaRevisione,
  immaginiOrfane,
  LIMITI,
  nuovoContenuto,
  perLettore,
  puoEliminare,
  puoModificare,
  statistiche,
  storieRecenti,
  tipoImmagine,
  validaBozza,
  validaCommento,
} from '@/lib/redazione/regole';
import { cookieEntrata, creaToken, leggiToken, ruoloDaCodice } from '@/lib/redazione/sessione-server';
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

  it('le immagini si cancellano solo se nessun altro contenuto le usa', () => {
    const a = nuovoContenuto(ID(1), 'post', 'A', post([ID(10), ID(11)]), ADESSO);
    const b = nuovoContenuto(ID(2), 'post', 'B', post([ID(11)]), ADESSO);
    expect(immaginiOrfane(a, [b])).toEqual([ID(10)]);
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

  it('giro completo: foto, post, correzione, nuova versione, approvazione, eliminazione', async () => {
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

    // Il revisore elimina: spariscono anche le foto.
    expect((await uno.DELETE(richiesta(`/api/redazione/contenuti/${contenuto.id}`, capo, { method: 'DELETE' }), parametri(contenuto.id))).status).toBe(200);
    expect((await mediaId.GET(richiesta(`/api/redazione/media/${foto}`, capo), parametri(foto))).status).toBe(404);
  });

  it('identificativi strani non arrivano all\'archivio', async () => {
    const uno = await import('@/app/api/redazione/contenuti/[id]/route');
    const r = await uno.GET(richiesta('/api/redazione/contenuti/..%2Fradar', capo), parametri('../radar/stato'));
    expect(r.status).toBe(404);
  });
});
