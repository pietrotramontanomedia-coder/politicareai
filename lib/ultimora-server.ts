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
}

const LIMITE = 20;

function chiaveDuplicato(titolo: string): string {
  return titolo
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 40);
}

/** Notizie da Instagram e Telegram unite e ordinate per data; la stessa notizia su entrambi conta una volta. */
export async function leggiUltimOra(): Promise<NotiziaUltimOra[]> {
  const [instagram, telegram] = await Promise.all([leggiPost(), leggiMessaggiTelegram()]);

  const tutte: NotiziaUltimOra[] = [
    ...instagram.map((p) => ({ id: p.id, titolo: p.titolo, testo: p.testo, data: p.data, immagine: p.immagine, fonte: 'instagram' as const })),
    ...telegram.map((m) => ({ id: m.id, titolo: m.titolo, testo: m.testo, data: m.data, immagine: m.immagine, fonte: 'telegram' as const })),
  ]
    .filter((n) => n.titolo)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const viste = new Set<string>();
  return tutte
    .filter((n) => {
      const chiave = chiaveDuplicato(n.titolo);
      if (viste.has(chiave)) return false;
      viste.add(chiave);
      return true;
    })
    .slice(0, LIMITE);
}

export async function leggiNotizia(id: string): Promise<NotiziaUltimOra | null> {
  if (id.startsWith(PREFISSO_ID_TELEGRAM)) {
    const m = await leggiMessaggioTelegram(id);
    return m ? { id: m.id, titolo: m.titolo, testo: m.testo, data: m.data, immagine: m.immagine, fonte: 'telegram' } : null;
  }
  const p = await leggiPostSingolo(id);
  return p ? { id: p.id, titolo: p.titolo, testo: p.testo, data: p.data, immagine: p.immagine, fonte: 'instagram' } : null;
}
