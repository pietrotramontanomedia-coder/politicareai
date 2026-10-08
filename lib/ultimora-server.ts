import { leggiPost, leggiPostSingolo } from '@/lib/instagram-server';
import { leggiMessaggiTelegram, leggiMessaggioTelegram, PREFISSO_ID_TELEGRAM } from '@/lib/telegram-server';

export type FonteUltimOra = 'instagram' | 'telegram';

export interface NotiziaUltimOra {
  id: string;
  titolo: string;
  testo: string;
  data: string;
  immagine?: string;
  fonte: FonteUltimOra;
  /** Il post originale su Telegram o Instagram. */
  link?: string;
}

const LIMITE = 20;

function chiaveDuplicato(titolo: string): string {
  return titolo
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 40);
}

/**
 * Notizie da Instagram e Telegram unite e ordinate per data, dalla più recente.
 * Ogni messaggio del canale è una notizia a sé, anche quando più post cominciano con le stesse parole
 * (una diretta: «#LeggeElettorale, live adesso il voto finale…»). Si scarta solo il post Instagram
 * che ripete una notizia già uscita su Telegram.
 */
export function unisciNotizie(instagram: NotiziaUltimOra[], telegram: NotiziaUltimOra[]): NotiziaUltimOra[] {
  const suTelegram = new Set(telegram.filter((n) => n.titolo).map((n) => chiaveDuplicato(n.titolo)));
  const visteInstagram = new Set<string>();
  const soloInstagram = instagram.filter((n) => {
    if (!n.titolo) return false;
    const chiave = chiaveDuplicato(n.titolo);
    if (suTelegram.has(chiave) || visteInstagram.has(chiave)) return false;
    visteInstagram.add(chiave);
    return true;
  });
  return [...telegram.filter((n) => n.titolo), ...soloInstagram].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

/**
 * Le ultime notizie per il feed del sito. Con `da` si leggono invece tutti i messaggi del canale
 * fino a quel momento (per la pagina del giorno), senza il limite di voci.
 */
export async function leggiUltimOra(opzioni: { fresco?: boolean; da?: Date } = {}): Promise<NotiziaUltimOra[]> {
  const [instagram, telegram] = await Promise.all([leggiPost(), leggiMessaggiTelegram(opzioni)]);

  const unite = unisciNotizie(
    instagram.map((p) => ({ id: p.id, titolo: p.titolo, testo: p.testo, data: p.data, immagine: p.immagine, fonte: 'instagram' as const, link: p.link })),
    telegram.map((m) => ({ id: m.id, titolo: m.titolo, testo: m.testo, data: m.data, immagine: m.immagine, fonte: 'telegram' as const, link: m.link })),
  );
  if (!opzioni.da) return unite.slice(0, LIMITE);
  // Niente più vecchio dell'ultimo messaggio letto: il giorno più vecchio resta quello tagliato a metà, che non si riscrive.
  const piuVecchio = telegram.at(-1)?.data;
  return piuVecchio ? unite.filter((n) => new Date(n.data) >= new Date(piuVecchio)) : unite;
}

export async function leggiNotizia(id: string): Promise<NotiziaUltimOra | null> {
  if (id.startsWith(PREFISSO_ID_TELEGRAM)) {
    const m = await leggiMessaggioTelegram(id);
    return m ? { id: m.id, titolo: m.titolo, testo: m.testo, data: m.data, immagine: m.immagine, fonte: 'telegram' } : null;
  }
  const p = await leggiPostSingolo(id);
  return p ? { id: p.id, titolo: p.titolo, testo: p.testo, data: p.data, immagine: p.immagine, fonte: 'instagram' } : null;
}
