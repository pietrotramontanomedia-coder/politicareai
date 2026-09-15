/**
 * Ponte Telegram → X: logica pura, senza rete.
 * Il canale Telegram è la fonte; ogni post nuovo diventa un post su X.
 */

/** Limite di un post su X per un account senza abbonamento Premium. */
export const LIMITE_X = 280;
/** X accorcia ogni link con t.co: conta sempre 23 caratteri. */
const PESO_URL = 23;
const FIRMA = /\s*@politicare\s*$/i;
const URL = /https?:\/\/\S+|(?<![\w@])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?/gi;

export interface PostCanale {
  numero: number;
  canale: string;
  testo: string;
  /** file_id della foto più grande, se il post ne ha una. */
  foto?: string;
  gruppoMedia?: string;
}

interface AggiornamentoTelegram {
  channel_post?: {
    message_id?: number;
    chat?: { id?: number; type?: string; username?: string };
    text?: string;
    caption?: string;
    photo?: { file_id: string; width?: number }[];
    media_group_id?: string;
  };
}

/** Riconosce un post nuovo di un canale; ignora modifiche, messaggi privati e gruppi. */
export function estraiPostCanale(aggiornamento: unknown): PostCanale | null {
  const post = (aggiornamento as AggiornamentoTelegram | null)?.channel_post;
  if (!post || post.chat?.type !== 'channel' || typeof post.message_id !== 'number') return null;
  const foto = post.photo?.reduce((max, f) => ((f.width ?? 0) > (max.width ?? 0) ? f : max));
  return {
    numero: post.message_id,
    canale: post.chat.username ?? String(post.chat.id),
    testo: post.text ?? post.caption ?? '',
    foto: foto?.file_id,
    gruppoMedia: post.media_group_id,
  };
}

function pesoCarattere(codice: number): number {
  const leggero =
    codice <= 4351 ||
    (codice >= 8192 && codice <= 8205) ||
    (codice >= 8208 && codice <= 8223) ||
    (codice >= 8242 && codice <= 8247);
  return leggero ? 1 : 2;
}

/** Lunghezza come la conta X: link a 23, emoji e alfabeti non latini a 2. */
export function lunghezzaX(testo: string): number {
  let totale = 0;
  const senzaLink = testo.replace(URL, () => {
    totale += PESO_URL;
    return '';
  });
  for (const carattere of senzaLink) totale += pesoCarattere(carattere.codePointAt(0) ?? 0);
  return totale;
}

export function contieneLink(testo: string): boolean {
  return new RegExp(URL.source, 'i').test(testo);
}

function pulisciPerX(grezzo: string): string {
  return grezzo
    .replace(FIRMA, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function troncaPerPeso(testo: string, budget: number): string {
  let peso = 0;
  let fine = 0;
  for (const carattere of testo) {
    peso += pesoCarattere(carattere.codePointAt(0) ?? 0);
    if (peso > budget) break;
    fine += carattere.length;
  }
  if (fine >= testo.length) return testo;
  const spazio = testo.lastIndexOf(' ', fine);
  const aCapo = testo.lastIndexOf('\n', fine);
  const taglio = Math.max(spazio, aCapo);
  return testo.slice(0, taglio > fine / 2 ? taglio : fine).replace(/[,;:\s]+$/, '') + '…';
}

export type PoliticaLink = 'mai' | 'se-troncato' | 'sempre';

export interface OpzioniTweet {
  /** Link alla notizia sul sito, aggiunto secondo `link`. */
  link?: string;
  politicaLink?: PoliticaLink;
  limite?: number;
}

/** Trasforma il testo di un post Telegram nel testo del post su X, entro il limite. */
export function componiTweet(grezzo: string, opzioni: OpzioniTweet = {}): string {
  const { link, politicaLink = 'se-troncato', limite = LIMITE_X } = opzioni;
  const testo = pulisciPerX(grezzo);
  const coda = link ? `\n\n${link}` : '';
  const pesoCoda = lunghezzaX(coda);

  if (politicaLink === 'sempre' && link) {
    if (lunghezzaX(testo) + pesoCoda <= limite) return testo + coda;
    return troncaEntro(testo, limite - pesoCoda) + coda;
  }
  if (lunghezzaX(testo) <= limite) return testo;
  if (politicaLink === 'se-troncato' && link) return troncaEntro(testo, limite - pesoCoda) + coda;
  return troncaEntro(testo, limite);
}

function troncaEntro(testo: string, limite: number): string {
  let budget = limite - 2; // spazio per «…»
  let risultato = troncaPerPeso(testo, budget);
  while (lunghezzaX(risultato) > limite && budget > 20) {
    budget -= 10;
    risultato = troncaPerPeso(testo, budget);
  }
  return risultato;
}
