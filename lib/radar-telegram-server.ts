/**
 * Avvisi del radar su Telegram, con un bot tutto suo (RADAR_TELEGRAM_BOT_TOKEN).
 * Volutamente separato dal ponte Telegram → X: altro bot, altro codice, nessuna variabile in comune.
 */

const API = 'https://api.telegram.org';

export function avvisiTelegramConfigurati(): boolean {
  return Boolean(process.env.RADAR_TELEGRAM_BOT_TOKEN && process.env.RADAR_TELEGRAM_CHAT);
}

/** Messaggio privato (HTML di Telegram) a chi riceve gli avvisi. */
export async function inviaAvvisoTelegram(testo: string): Promise<void> {
  const token = process.env.RADAR_TELEGRAM_BOT_TOKEN;
  const chat = process.env.RADAR_TELEGRAM_CHAT;
  if (!token || !chat) throw new Error('RADAR_TELEGRAM_BOT_TOKEN o RADAR_TELEGRAM_CHAT mancante');
  // RADAR_TELEGRAM_CHAT_EXTRA: altre chat (id separati da virgola) che ricevono gli stessi avvisi.
  const extra = (process.env.RADAR_TELEGRAM_CHAT_EXTRA ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  for (const destinatario of [chat, ...extra]) {
    const risposta = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: destinatario, text: testo, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
      cache: 'no-store',
    });
    const corpo = (await risposta.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!corpo.ok && destinatario === chat) throw new Error(`sendMessage fallito: ${corpo.description ?? risposta.status}`);
  }
}

/**
 * Chi ha scritto al bot di recente (getUpdates): serve a trovare l'id di chi ha fatto /start, e
 * quello dei canali in cui il bot è stato aggiunto (per esempio il canale della redazione).
 */
export async function chiHaScrittoAlBot(): Promise<{ id: number; nome: string; testo: string }[]> {
  const token = process.env.RADAR_TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('RADAR_TELEGRAM_BOT_TOKEN mancante');
  const r = await fetch(`${API}/bot${token}/getUpdates`, { cache: 'no-store' });
  type Chat = { id: number; type?: string; title?: string; first_name?: string; last_name?: string; username?: string };
  const d = (await r.json().catch(() => ({}))) as {
    ok?: boolean; description?: string;
    result?: { message?: { chat?: Chat; text?: string }; channel_post?: { chat?: Chat; text?: string }; my_chat_member?: { chat?: Chat } }[];
  };
  if (!d.ok) throw new Error(`getUpdates fallito: ${d.description ?? r.status}`);
  return (d.result ?? []).flatMap((u) => {
    const evento = u.message ?? u.channel_post;
    const c = evento?.chat ?? u.my_chat_member?.chat;
    if (!c) return [];
    const nome = [c.title, c.first_name, c.last_name, c.username && `@${c.username}`, c.type && c.type !== 'private' && `(${c.type})`].filter(Boolean).join(' ');
    return [{ id: c.id, nome, testo: (evento?.text ?? '').slice(0, 40) }];
  });
}

/**
 * Chi scrive e a chi: nome del bot e tipo/nome della chat di RADAR_TELEGRAM_CHAT, senza mostrare il token.
 * Serve quando «il messaggio è partito» ma la persona non lo trova.
 */
export async function descriviDestinatario(): Promise<{ bot: string; chat: string }> {
  const token = process.env.RADAR_TELEGRAM_BOT_TOKEN;
  const chat = process.env.RADAR_TELEGRAM_CHAT;
  if (!token || !chat) throw new Error('RADAR_TELEGRAM_BOT_TOKEN o RADAR_TELEGRAM_CHAT mancante');
  const chiama = async (metodo: string, corpo: object = {}) => {
    const r = await fetch(`${API}/bot${token}/${metodo}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
      cache: 'no-store',
    });
    return (await r.json().catch(() => ({}))) as { ok?: boolean; result?: Record<string, unknown>; description?: string };
  };
  const io = await chiama('getMe');
  const lei = await chiama('getChat', { chat_id: chat });
  const bot = io.ok ? `@${io.result?.username} (${io.result?.first_name})` : `getMe fallito: ${io.description}`;
  const c = lei.result ?? {};
  const nome = [c.title, c.first_name, c.last_name].filter(Boolean).join(' ');
  const descrizione = lei.ok
    ? `${c.type}${nome ? ` «${nome}»` : ''}${c.username ? ` @${c.username}` : ''}`
    : `getChat fallito: ${lei.description}`;
  return { bot, chat: descrizione };
}
