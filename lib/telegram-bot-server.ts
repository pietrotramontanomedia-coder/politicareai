import { timingSafeEqual } from 'node:crypto';
import type { Immagine } from '@/lib/x-server';

/** Bot API di Telegram: riceve i post del canale, scarica le foto e manda gli avvisi del radar. */

const API = 'https://api.telegram.org';
const TIPI: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

function token(): string {
  const valore = process.env.TELEGRAM_BOT_TOKEN;
  if (!valore) throw new Error('TELEGRAM_BOT_TOKEN mancante');
  return valore;
}

/** Telegram invia l'intestazione `X-Telegram-Bot-Api-Secret-Token`: confronto a tempo costante. */
export function segretoTelegramValido(intestazione: string | null, segreto: string | undefined): boolean {
  if (!segreto || !intestazione) return false;
  const atteso = Buffer.from(segreto);
  const ricevuto = Buffer.from(intestazione);
  return atteso.length === ricevuto.length && timingSafeEqual(atteso, ricevuto);
}

export async function scaricaFotoTelegram(fileId: string): Promise<Immagine> {
  const info = await fetch(`${API}/bot${token()}/getFile?file_id=${encodeURIComponent(fileId)}`, { cache: 'no-store' });
  const corpo = (await info.json()) as { ok: boolean; result?: { file_path?: string }; description?: string };
  if (!corpo.ok || !corpo.result?.file_path) throw new Error(`getFile fallito: ${corpo.description ?? info.status}`);

  const file = await fetch(`${API}/file/bot${token()}/${corpo.result.file_path}`, { cache: 'no-store' });
  if (!file.ok) throw new Error(`download foto fallito: ${file.status}`);
  const estensione = corpo.result.file_path.split('.').pop()?.toLowerCase() ?? '';
  return { dati: Buffer.from(await file.arrayBuffer()), tipo: TIPI[estensione] ?? 'image/jpeg' };
}

/** Messaggio privato del bot (HTML di Telegram), per gli avvisi del radar. */
export async function inviaMessaggioTelegram(chatId: string, testo: string): Promise<void> {
  const risposta = await fetch(`${API}/bot${token()}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: testo, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    cache: 'no-store',
  });
  const corpo = (await risposta.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!corpo.ok) throw new Error(`sendMessage fallito: ${corpo.description ?? risposta.status}`);
}
