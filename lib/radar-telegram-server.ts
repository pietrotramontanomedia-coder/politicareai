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
