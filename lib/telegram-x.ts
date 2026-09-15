/**
 * Ponte Telegram → X: logica pura, senza rete.
 * Il canale Telegram è la fonte; ogni post nuovo diventa un post su X.
 */

/** Limite di un post su X per un account senza abbonamento Premium. */
export const LIMITE_X = 280;
/** X accorcia ogni link con t.co: conta sempre 23 caratteri. */
const PESO_URL = 23;
const FIRMA_TELEGRAM = /\s*@politicare\s*$/i;
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

const EMOJI_INIZIALI = /^(?:(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}\uFE0F?)(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+/u;

function pulisciPerX(grezzo: string): string {
  return grezzo
    .replace(FIRMA_TELEGRAM, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(EMOJI_INIZIALI, (emoji) => `${emoji} `)
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
export type StileTitolo = 'normale' | 'maiuscolo' | 'nessuno';

export interface OpzioniTweet {
  /** Link alla notizia sul sito, aggiunto secondo `politicaLink`. */
  link?: string;
  politicaLink?: PoliticaLink;
  /** La prima frase diventa un titolo su una riga a sé (stile agenzia). */
  titolo?: StileTitolo;
  /** Riga di chiusura, es. `#Politicare`. */
  firma?: string;
  limite?: number;
}

/** Oltre questa lunghezza la prima frase non è un titolo: il post resta un paragrafo unico. */
const MAX_TITOLO = 120;

function separaTitolo(testo: string, stile: StileTitolo): { testa: string; corpo: string } {
  if (stile === 'nessuno') return { testa: '', corpo: testo };
  const [prima = '', ...altre] = testo.split('\n');
  const frase = prima.match(/^(.{20,}?[.!?:])(?:\s+(.*))?$/s);
  if (!frase) return { testa: '', corpo: testo };
  const titolo = frase[1].replace(/[.:]$/, '');
  const corpo = [frase[2] ?? '', ...altre].filter(Boolean).join('\n');
  if (!corpo || titolo.length > MAX_TITOLO) return { testa: '', corpo: testo };
  const corpoMaiuscolo = corpo.replace(/^\p{Ll}/u, (c) => c.toUpperCase());
  return { testa: (stile === 'maiuscolo' ? titolo.toUpperCase() : titolo) + '\n\n', corpo: corpoMaiuscolo };
}

/** Trasforma il testo di un post Telegram nel testo del post su X, entro il limite. */
export function componiTweet(grezzo: string, opzioni: OpzioniTweet = {}): string {
  const { link, politicaLink = 'mai', titolo = 'normale', firma = '', limite = LIMITE_X } = opzioni;
  const { testa, corpo } = separaTitolo(pulisciPerX(grezzo), titolo);
  const chiusura = firma ? `\n\n${firma}` : '';
  const coda = link ? `\n\n${link}` : '';
  const fisso = lunghezzaX(testa) + lunghezzaX(chiusura);

  if (politicaLink === 'sempre' && link) {
    const spazio = limite - fisso - lunghezzaX(coda);
    return testa + (lunghezzaX(corpo) <= spazio ? corpo : troncaEntro(corpo, spazio)) + coda + chiusura;
  }
  if (fisso + lunghezzaX(corpo) <= limite) return testa + corpo + chiusura;
  if (politicaLink === 'se-troncato' && link) {
    return testa + troncaEntro(corpo, limite - fisso - lunghezzaX(coda)) + coda + chiusura;
  }
  return testa + troncaEntro(corpo, limite - fisso) + chiusura;
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

/**
 * Formato regolabile dalle variabili d'ambiente senza toccare il codice:
 *   X_TITOLO        normale | maiuscolo | nessuno   (prima frase su una riga a sé)
 *   X_FIRMA         riga di chiusura, vuota per nessuna
 *   X_LINK_NOTIZIE  mai (predefinito) | se-troncato | sempre
 *   X_LIMITE        280 (predefinito); con X Premium si può alzare, fino a 25000
 */
export const FORMATO_PREDEFINITO = { titolo: 'normale', firma: '#Politicare', politicaLink: 'mai' } as const;

export function opzioniFormato(ambiente: Record<string, string | undefined>): Required<Pick<OpzioniTweet, 'titolo' | 'firma' | 'politicaLink' | 'limite'>> {
  const titolo = ambiente.X_TITOLO;
  const politicaLink = ambiente.X_LINK_NOTIZIE;
  return {
    titolo: titolo === 'maiuscolo' || titolo === 'nessuno' ? titolo : FORMATO_PREDEFINITO.titolo,
    firma: ambiente.X_FIRMA ?? FORMATO_PREDEFINITO.firma,
    politicaLink: politicaLink === 'mai' || politicaLink === 'sempre' ? politicaLink : FORMATO_PREDEFINITO.politicaLink,
    limite: Number(ambiente.X_LIMITE) > 0 ? Number(ambiente.X_LIMITE) : LIMITE_X,
  };
}
