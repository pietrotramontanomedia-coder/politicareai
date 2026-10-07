import { spezzaMessaggi, testoInHtml } from '@/lib/avviso-telegram';
import { autorizzatoCron } from '@/lib/cron';
import { avvisiTelegramConfigurati, inviaAvvisoTelegram } from '@/lib/radar-telegram-server';

/**
 * Avviso privato a Pietro su Telegram, con il bot del radar (@politicareradar_bot).
 * Lo usa l'attività del mattino «notizie del giorno» per mandare le proposte.
 * POST con `Authorization: Bearer <CRON_SECRET>` e corpo `{ "testo": "..." }` (testo semplice, **grassetto** ammesso).
 */

export const dynamic = 'force-dynamic';

const MASSIMO_TESTO = 20000;

export async function POST(request: Request) {
  if (!autorizzatoCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ ok: false, error: 'non autorizzato' }, { status: 401 });
  }
  if (!avvisiTelegramConfigurati()) {
    return Response.json({ ok: false, error: 'bot Telegram non configurato' }, { status: 500 });
  }
  const corpo = (await request.json().catch(() => null)) as { testo?: unknown } | null;
  const testo = typeof corpo?.testo === 'string' ? corpo.testo.trim() : '';
  if (!testo) return Response.json({ ok: false, error: 'testo mancante' }, { status: 400 });
  if (testo.length > MASSIMO_TESTO) return Response.json({ ok: false, error: 'testo troppo lungo' }, { status: 413 });

  const messaggi = spezzaMessaggi(testo);
  for (const messaggio of messaggi) await inviaAvvisoTelegram(testoInHtml(messaggio));
  return Response.json({ ok: true, messaggi: messaggi.length });
}
