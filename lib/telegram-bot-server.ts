import { timingSafeEqual } from 'node:crypto';
import type { Immagine } from '@/lib/x-server';

/** Bot API di Telegram: serve solo a ricevere i post del canale e a scaricare le foto. */

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
