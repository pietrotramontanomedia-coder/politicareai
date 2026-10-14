import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { chiaveNome, normalizzaNome } from './regole';
import type { Persona, Ruolo, SessioneRedazione } from './tipi';

/*
 * Accesso al portale della redazione: nome + codice condiviso. Il codice dei redattori apre la
 * palestra, quello dei revisori apre anche correzioni e quadro della squadra. Nessun account:
 * la sessione è un cookie firmato con una chiave derivata dai codici, così cambiare un codice
 * fa uscire tutti. Variabili in .env.example (REDAZIONE_*).
 */

export const COOKIE_SESSIONE = 'redazione_sessione';
const DURATA_GIORNI = 30;

interface Configurazione {
  codiceRedattori: string;
  codiceRevisori: string;
  chiave: Buffer;
}

function configurazione(): Configurazione | null {
  const codiceRedattori = process.env.REDAZIONE_CODICE?.trim();
  const codiceRevisori = process.env.REDAZIONE_CODICE_REVISORI?.trim();
  if (!codiceRedattori || !codiceRevisori) return null;
  const chiave = createHash('sha256')
    .update(`politicare-redazione|${process.env.REDAZIONE_SEGRETO ?? ''}|${codiceRedattori}|${codiceRevisori}`)
    .digest();
  return { codiceRedattori, codiceRevisori, chiave };
}

export function redazioneConfigurata(): boolean {
  return configurazione() !== null;
}

/** Confronto a tempo costante su impronte di lunghezza fissa. */
function uguali(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Il ruolo che apre il codice, o null. */
export function ruoloDaCodice(codice: string): Ruolo | null {
  const c = configurazione();
  if (!c) return null;
  const inserito = codice.trim();
  // Entrambi i confronti sempre: il tempo non dice quale codice si è sbagliato.
  const revisore = uguali(inserito, c.codiceRevisori);
  const redattore = uguali(inserito, c.codiceRedattori);
  return revisore ? 'revisore' : redattore ? 'redattore' : null;
}

/**
 * Chi può correggere: i nomi in REDAZIONE_REVISORI (separati da virgola). Se la lista c'è, la
 * password dei revisori vale solo con uno di quei nomi, e quei nomi non entrano come redattori:
 * nessuno dei ragazzi può presentarsi come un revisore.
 */
function nomiRevisori(): Set<string> | null {
  const elenco = (process.env.REDAZIONE_REVISORI ?? '').split(',').map((n) => chiaveNome(n)).filter(Boolean);
  return elenco.length > 0 ? new Set(elenco) : null;
}

/** Il nome è fra quelli di REDAZIONE_REVISORI: entra col codice dei revisori, non va fra i ragazzi. */
export function nomeDiRevisore(nome: string): boolean {
  return nomiRevisori()?.has(chiaveNome(nome)) ?? false;
}

export function ruoloPerAccesso(nome: string, codice: string): { ruolo: Ruolo } | { errore: string } {
  const ruolo = ruoloDaCodice(codice);
  if (!ruolo) return { errore: 'Codice non valido.' };
  const revisori = nomiRevisori();
  if (!revisori) return { ruolo };
  const capo = revisori.has(chiaveNome(nome));
  if (ruolo === 'revisore' && !capo) return { errore: 'Questo nome non è tra i revisori: scrivi nome e cognome come ti sono stati dati.' };
  if (ruolo === 'redattore' && capo) return { errore: 'Questo nome è riservato a chi corregge.' };
  return { ruolo };
}

/** Impronta di una password personale: scrypt con un sale suo, la password non si salva mai. */
export function improntaPassword(password: string): { sale: string; impronta: string } {
  const sale = randomBytes(16).toString('base64url');
  return { sale, impronta: scryptSync(password.trim(), sale, 32).toString('base64url') };
}

export function passwordGiusta(password: string, salvata: { sale: string; impronta: string }): boolean {
  const prova = scryptSync(password.trim(), salvata.sale, 32);
  const attesa = Buffer.from(salvata.impronta, 'base64url');
  return attesa.length === prova.length && timingSafeEqual(prova, attesa);
}

function firma(chiave: Buffer, dati: string): string {
  return createHmac('sha256', chiave).update(dati).digest('base64url');
}

/** Segno della password personale con cui si è entrati: cambiarla rende vecchie le sessioni aperte. */
function segnoPassword(chiave: Buffer, password: { impronta: string }): string {
  return firma(chiave, `password|${password.impronta}`).slice(0, 22);
}

/** La sessione firmata nel cookie, con il segno della password personale se si è entrati con quella. */
export interface Gettone {
  sessione: SessioneRedazione;
  password?: string;
}

export function creaToken(sessione: SessioneRedazione, adesso: Date, password?: { impronta: string }): string | null {
  const c = configurazione();
  if (!c) return null;
  const scade = adesso.getTime() + DURATA_GIORNI * 24 * 3600_000;
  const segno = password ? { p: segnoPassword(c.chiave, password) } : {};
  const dati = Buffer.from(JSON.stringify({ n: normalizzaNome(sessione.nome), r: sessione.ruolo, s: scade, ...segno })).toString('base64url');
  return `${dati}.${firma(c.chiave, dati)}`;
}

export function leggiGettone(token: string | undefined | null, adesso: Date): Gettone | null {
  const c = configurazione();
  if (!c || !token) return null;
  const [dati, firmato, ...resto] = token.split('.');
  if (!dati || !firmato || resto.length > 0) return null;
  const atteso = Buffer.from(firma(c.chiave, dati));
  const ricevuto = Buffer.from(firmato);
  if (atteso.length !== ricevuto.length || !timingSafeEqual(atteso, ricevuto)) return null;
  try {
    const { n, r, s, p } = JSON.parse(Buffer.from(dati, 'base64url').toString('utf8')) as { n: unknown; r: unknown; s: unknown; p: unknown };
    if (typeof n !== 'string' || !n || (r !== 'redattore' && r !== 'revisore') || typeof s !== 'number') return null;
    if (s < adesso.getTime()) return null;
    return { sessione: { nome: n, ruolo: r }, ...(typeof p === 'string' ? { password: p } : {}) };
  } catch {
    return null;
  }
}

export function leggiToken(token: string | undefined | null, adesso: Date): SessioneRedazione | null {
  return leggiGettone(token, adesso)?.sessione ?? null;
}

/**
 * Una sessione firmata vale finché chi l'ha aperta ha ancora diritto di entrare: un ragazzo
 * disattivato, o a cui è stata cambiata la password, esce subito invece che dopo 30 giorni; un
 * revisore tolto da REDAZIONE_REVISORI pure.
 */
export function sessioneAncoraValida(gettone: Gettone, persone: Persona[]): boolean {
  const c = configurazione();
  if (!c) return false;
  const { sessione } = gettone;
  const revisori = nomiRevisori();
  if (sessione.ruolo === 'revisore') return !revisori || revisori.has(chiaveNome(sessione.nome));
  if (revisori?.has(chiaveNome(sessione.nome))) return false;
  if (persone.length === 0) return true;
  const persona = persone.find((p) => p.attiva && p.chiave === chiaveNome(sessione.nome));
  if (!persona) return false;
  if (!persona.password) return true;
  const atteso = Buffer.from(segnoPassword(c.chiave, persona.password));
  const ricevuto = Buffer.from(gettone.password ?? '');
  return atteso.length === ricevuto.length && timingSafeEqual(atteso, ricevuto);
}

export function tokenDaRichiesta(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  for (const parte of cookie.split(';')) {
    const [nome, ...valore] = parte.trim().split('=');
    if (nome === COOKIE_SESSIONE) return decodeURIComponent(valore.join('='));
  }
  return null;
}

export function gettoneDaRichiesta(request: Request, adesso = new Date()): Gettone | null {
  return leggiGettone(tokenDaRichiesta(request), adesso);
}

export function sessioneDaRichiesta(request: Request, adesso = new Date()): SessioneRedazione | null {
  return gettoneDaRichiesta(request, adesso)?.sessione ?? null;
}

function attributiCookie(): string {
  const sicuro = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${sicuro}`;
}

export function cookieEntrata(token: string): string {
  return `${COOKIE_SESSIONE}=${encodeURIComponent(token)}; Max-Age=${DURATA_GIORNI * 24 * 3600}; ${attributiCookie()}`;
}

export function cookieUscita(): string {
  return `${COOKIE_SESSIONE}=; Max-Age=0; ${attributiCookie()}`;
}
