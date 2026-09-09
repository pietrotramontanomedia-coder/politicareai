import { load } from 'cheerio';
import { titoloETesto } from '@/lib/testo-notizia';

export const CANALE_TELEGRAM = 'politicare';
export const PREFISSO_ID_TELEGRAM = 'tg-';

export interface MessaggioTelegram {
  id: string;
  numero: number;
  titolo: string;
  testo: string;
  data: string;
  immagine?: string;
  link: string;
}

const REVALIDATE_S = 900;
const UA = 'Mozilla/5.0 (compatible; PoliticareBot/1.0)';
const FIRMA = /\s*@politicare\s*$/i;

function estraiMessaggi(html: string): MessaggioTelegram[] {
  const $ = load(html);
  const messaggi: MessaggioTelegram[] = [];

  $('.tgme_widget_message').each((_, el) => {
    const m = $(el);
    const numero = Number(m.attr('data-post')?.split('/')[1]);
    const data = m.find('time').attr('datetime');
    const nodoTesto = m.find('.tgme_widget_message_text').first();
    if (!numero || !data || nodoTesto.length === 0) return;

    nodoTesto.find('br').replaceWith('\n');
    const grezzo = nodoTesto.text().replace(FIRMA, '').trim();
    if (!grezzo) return;

    const stile = m.find('.tgme_widget_message_photo_wrap').first().attr('style') ?? '';
    const immagine = stile.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];

    messaggi.push({
      id: `${PREFISSO_ID_TELEGRAM}${numero}`,
      numero,
      ...titoloETesto(grezzo),
      data,
      immagine,
      link: `https://t.me/${CANALE_TELEGRAM}/${numero}`,
    });
  });

  return messaggi;
}

async function scarica(url: string): Promise<string | null> {
  const response = await fetch(url, { next: { revalidate: REVALIDATE_S }, headers: { 'User-Agent': UA } });
  return response.ok ? response.text() : null;
}

export async function leggiMessaggiTelegram(): Promise<MessaggioTelegram[]> {
  const html = await scarica(`https://t.me/s/${CANALE_TELEGRAM}`);
  if (!html) return [];
  return estraiMessaggi(html).sort((a, b) => b.numero - a.numero);
}

export async function leggiMessaggioTelegram(id: string): Promise<MessaggioTelegram | null> {
  const numero = id.startsWith(PREFISSO_ID_TELEGRAM) ? id.slice(PREFISSO_ID_TELEGRAM.length) : '';
  if (!/^\d+$/.test(numero)) return null;
  const html = await scarica(`https://t.me/${CANALE_TELEGRAM}/${numero}?embed=1`);
  if (!html) return null;
  return estraiMessaggi(html).find((m) => m.numero === Number(numero)) ?? null;
}
