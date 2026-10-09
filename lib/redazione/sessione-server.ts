import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { normalizzaNome } from './regole';
import type { Ruolo, SessioneRedazione } from './tipi';

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

function firma(chiave: Buffer, dati: string): string {
  return createHmac('sha256', chiave).update(dati).digest('base64url');
}

export function creaToken(sessione: SessioneRedazione, adesso: Date): string | null {
  const c = configurazione();
  if (!c) return null;
  const scade = adesso.getTime() + DURATA_GIORNI * 24 * 3600_000;
  const dati = Buffer.from(JSON.stringify({ n: normalizzaNome(sessione.nome), r: sessione.ruolo, s: scade })).toString('base64url');
  return `${dati}.${firma(c.chiave, dati)}`;
}

export function leggiToken(token: string | undefined | null, adesso: Date): SessioneRedazione | null {
  const c = configurazione();
  if (!c || !token) return null;
  const [dati, firmato, ...resto] = token.split('.');
  if (!dati || !firmato || resto.length > 0) return null;
  const atteso = Buffer.from(firma(c.chiave, dati));
  const ricevuto = Buffer.from(firmato);
  if (atteso.length !== ricevuto.length || !timingSafeEqual(atteso, ricevuto)) return null;
  try {
    const { n, r, s } = JSON.parse(Buffer.from(dati, 'base64url').toString('utf8')) as { n: unknown; r: unknown; s: unknown };
    if (typeof n !== 'string' || !n || (r !== 'redattore' && r !== 'revisore') || typeof s !== 'number') return null;
    if (s < adesso.getTime()) return null;
    return { nome: n, ruolo: r };
  } catch {
    return null;
  }
}

export function tokenDaRichiesta(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  for (const parte of cookie.split(';')) {
    const [nome, ...valore] = parte.trim().split('=');
    if (nome === COOKIE_SESSIONE) return decodeURIComponent(valore.join('='));
  }
  return null;
}

export function sessioneDaRichiesta(request: Request, adesso = new Date()): SessioneRedazione | null {
  return leggiToken(tokenDaRichiesta(request), adesso);
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
