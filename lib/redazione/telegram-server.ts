import { after } from 'next/server';
import { archivio } from './archivio-server';
import { versioneCorrente } from './regole';
import type { Contenuto } from './tipi';

/*
 * Avviso su Telegram a ogni pubblicazione della redazione: le card (o la storia) con il copy e il
 * link al portale, in un canale di chi corregge. Usa il bot del radar (o uno suo, se impostato),
 * mai quello del ponte Telegram → X: un post della redazione non deve poter finire su X.
 */

const API = 'https://api.telegram.org';
/** Tetto di Telegram per la didascalia di una foto. */
const MASSIMO_DIDASCALIA = 1024;

function configurazione(): { token: string; chat: string } | null {
  const token = process.env.REDAZIONE_TELEGRAM_BOT_TOKEN || process.env.RADAR_TELEGRAM_BOT_TOKEN;
  const chat = process.env.REDAZIONE_TELEGRAM_CHAT;
  return token && chat ? { token, chat } : null;
}

export function avvisiRedazioneConfigurati(): boolean {
  return configurazione() !== null;
}

const html = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Intestazione, copy (accorciato se serve) e link: sempre dentro il limite della didascalia. */
export function testoAvviso(contenuto: Contenuto, link: string): string {
  const v = versioneCorrente(contenuto);
  const cosa = contenuto.tipo === 'post' ? 'post' : 'storia';
  const titolo =
    v.numero > 1
      ? `✏️ <b>${html(contenuto.autore)}</b> ha corretto ${cosa === 'post' ? 'il post' : 'la storia'} (versione ${v.numero})`
      : `🆕 <b>${html(contenuto.autore)}</b> ha pubblicato ${cosa === 'post' ? 'un post' : 'una storia'}`;
  const coda = `\n\n<a href="${html(link)}">Apri nel portale</a>`;
  if (!v.didascalia) return titolo + coda;
  const spazio = MASSIMO_DIDASCALIA - titolo.length - coda.length - 4;
  let copy = v.didascalia;
  if (html(copy).length > spazio) {
    while (copy.length > 0 && html(copy).length > spazio - 1) copy = copy.slice(0, -20);
    copy = `${copy.trimEnd()}…`;
  }
  return `${titolo}\n\n${html(copy)}${coda}`;
}

async function chiama(token: string, metodo: string, corpo: FormData | object): Promise<void> {
  const risposta = await fetch(`${API}/bot${token}/${metodo}`, {
    method: 'POST',
    ...(corpo instanceof FormData ? { body: corpo } : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) }),
    cache: 'no-store',
  });
  const esito = (await risposta.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!esito.ok) throw new Error(`${metodo} fallito: ${esito.description ?? risposta.status}`);
}

/**
 * Manda l'avviso. Le immagini sono private: si leggono dall'archivio e si caricano su Telegram
 * come file. Se le foto non partono, arriva almeno il testo. Non lancia mai: chi pubblica non
 * deve accorgersi di un Telegram che non risponde.
 */
export async function avvisaPubblicazione(contenuto: Contenuto, link: string): Promise<void> {
  const conf = configurazione();
  if (!conf) return;
  const testo = testoAvviso(contenuto, link);
  try {
    const foto: Blob[] = [];
    for (const id of versioneCorrente(contenuto).immagini.slice(0, 10)) {
      const media = await archivio().leggiMedia(id);
      if (!media) continue;
      foto.push(new Blob([await new Response(media.corpo as BodyInit).arrayBuffer()], { type: media.tipo }));
    }
    if (foto.length === 0) throw new Error('nessuna immagine leggibile');
    const modulo = new FormData();
    modulo.set('chat_id', conf.chat);
    if (foto.length === 1) {
      modulo.set('photo', foto[0], 'immagine.jpg');
      modulo.set('caption', testo);
      modulo.set('parse_mode', 'HTML');
      await chiama(conf.token, 'sendPhoto', modulo);
    } else {
      foto.forEach((f, i) => modulo.set(`f${i}`, f, `${i + 1}.jpg`));
      const media = foto.map((_, i) => ({ type: 'photo', media: `attach://f${i}`, ...(i === 0 ? { caption: testo, parse_mode: 'HTML' } : {}) }));
      modulo.set('media', JSON.stringify(media));
      await chiama(conf.token, 'sendMediaGroup', modulo);
    }
  } catch (errore) {
    console.error('[redazione] avviso Telegram con le foto non riuscito', errore);
    try {
      await chiama(conf.token, 'sendMessage', { chat_id: conf.chat, text: testo, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
    } catch (e) {
      console.error('[redazione] avviso Telegram non riuscito', e);
    }
  }
}

/** Link al contenuto nel portale, sullo stesso indirizzo da cui è arrivata la pubblicazione. */
export function linkContenuto(request: Request, id: string): string {
  const base = process.env.SITO_URL?.replace(/\/$/, '') || new URL(request.url).origin;
  return `${base}/redazione?apri=${id}`;
}

/** Avviso dopo la risposta: chi pubblica non aspetta Telegram. Fuori da una richiesta (test) parte e basta. */
export function avvisaDopoLaRisposta(request: Request, contenuto: Contenuto): void {
  if (!avvisiRedazioneConfigurati()) return;
  const invia = () => avvisaPubblicazione(contenuto, linkContenuto(request, contenuto.id));
  try {
    after(invia);
  } catch {
    void invia();
  }
}
