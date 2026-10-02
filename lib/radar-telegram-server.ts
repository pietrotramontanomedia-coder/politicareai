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
  const risposta = await fetch(`${API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: testo, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    cache: 'no-store',
  });
  const corpo = (await risposta.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!corpo.ok) throw new Error(`sendMessage fallito: ${corpo.description ?? risposta.status}`);
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
