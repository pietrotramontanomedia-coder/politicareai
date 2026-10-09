import { after } from 'next/server';
import { archivio } from './archivio-server';
import { versioneCorrente } from './regole';
import type { Contenuto } from './tipi';

/*
 * Avviso su Telegram a ogni pubblicazione della redazione: le card (o la storia) con il copy e il
 * link al portale, in un canale di chi corregge. Ha un bot tutto suo (@redazionepoliticare_bot),
 * separato dal radar e soprattutto dal ponte Telegram → X: un post della redazione non deve poter
 * finire su X.
 */

const API = 'https://api.telegram.org';
/** Tetto di Telegram per la didascalia di una foto. */
const MASSIMO_DIDASCALIA = 1024;

/** Il token copiato da BotFather arriva spesso con spazi, a capo o virgolette attorno: si tolgono. */
function tokenBot(): string | undefined {
  return process.env.REDAZIONE_TELEGRAM_BOT_TOKEN?.replace(/[\s"'`]/g, '') || undefined;
}

/** Forma di un token di BotFather: numeri, due punti, 35 caratteri. */
const FORMA_TOKEN = /^\d{6,}:[A-Za-z0-9_-]{30,}$/;

function configurazione(): { token: string; chat: string } | null {
  const token = tokenBot();
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

async function chiama<T = unknown>(token: string, metodo: string, corpo: FormData | object = {}): Promise<T> {
  const risposta = await fetch(`${API}/bot${token}/${metodo}`, {
    method: 'POST',
    ...(corpo instanceof FormData ? { body: corpo } : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) }),
    cache: 'no-store',
  });
  const esito = (await risposta.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: T };
  if (!esito.ok) throw new Error(`${metodo} fallito: ${esito.description ?? risposta.status}`);
  return esito.result as T;
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

type Chat = { id: number; type?: string; title?: string; first_name?: string; username?: string };

/**
 * Per accendere gli avvisi: il nome del bot, la chat impostata e le chat dove il bot è stato
 * aggiunto di recente (getUpdates), così si trova l'id del canale da mettere in REDAZIONE_TELEGRAM_CHAT.
 */
export async function statoBotRedazione(): Promise<{ bot: string; chatImpostata: string | null; chatViste: { id: number; nome: string; tipo: string }[] }> {
  const token = tokenBot();
  if (!token) throw new Error('REDAZIONE_TELEGRAM_BOT_TOKEN mancante');
  // Senza mai mostrare il token: dice solo se ha la forma giusta, per capire un «Not Found».
  if (!FORMA_TOKEN.test(token)) throw new Error(`il token non ha la forma di BotFather (numeri:lettere); lunghezza ${token.length}, due punti ${token.includes(':') ? 'presenti' : 'assenti'}`);
  const io = await chiama<{ username?: string }>(token, 'getMe');
  const aggiornamenti = await chiama<{ message?: { chat?: Chat }; channel_post?: { chat?: Chat }; my_chat_member?: { chat?: Chat } }[]>(token, 'getUpdates');
  const viste = new Map<number, { id: number; nome: string; tipo: string }>();
  for (const u of aggiornamenti) {
    const c = u.channel_post?.chat ?? u.my_chat_member?.chat ?? u.message?.chat;
    if (c) viste.set(c.id, { id: c.id, nome: c.title ?? c.first_name ?? c.username ?? '', tipo: c.type ?? '' });
  }
  return { bot: `@${io.username}`, chatImpostata: process.env.REDAZIONE_TELEGRAM_CHAT ?? null, chatViste: [...viste.values()] };
}

/** Messaggio di prova nella chat impostata. */
export async function provaBotRedazione(): Promise<void> {
  const conf = configurazione();
  if (!conf) throw new Error('REDAZIONE_TELEGRAM_BOT_TOKEN o REDAZIONE_TELEGRAM_CHAT mancante');
  await chiama(conf.token, 'sendMessage', {
    chat_id: conf.chat,
    text: '✅ Avvisi della redazione attivi: qui arriverà ogni post, storia e nuova versione pubblicata nel portale.',
  });
}
