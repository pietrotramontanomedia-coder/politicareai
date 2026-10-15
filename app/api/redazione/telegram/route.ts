import { autorizzatoCron } from '@/lib/cron';
import { inviaTestoRedazione, provaBotRedazione, statoBotRedazione } from '@/lib/redazione/telegram-server';

/**
 * Messa a punto degli avvisi Telegram della redazione, con `Authorization: Bearer <CRON_SECRET>`.
 * GET: nome del bot e chat in cui è stato aggiunto (per trovare l'id del canale).
 * POST: messaggio di prova nel canale impostato; con `{ "testo": "…" }` manda quel testo (un avviso
 * di chi coordina, dal workflow GitHub «Avviso redazione»).
 */

export const dynamic = 'force-dynamic';

function vietato(request: Request): Response | null {
  return autorizzatoCron(request.headers.get('authorization'), process.env.CRON_SECRET)
    ? null
    : Response.json({ ok: false, errore: 'non autorizzato' }, { status: 401 });
}

export async function GET(request: Request) {
  const no = vietato(request);
  if (no) return no;
  try {
    return Response.json({ ok: true, ...(await statoBotRedazione()) });
  } catch (e) {
    return Response.json({ ok: false, errore: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const no = vietato(request);
  if (no) return no;
  try {
    const corpo = (await request.json().catch(() => null)) as { testo?: unknown } | null;
    const testo = typeof corpo?.testo === 'string' ? corpo.testo.trim() : '';
    if (testo) {
      if (testo.length > 3500) return Response.json({ ok: false, errore: 'testo troppo lungo' }, { status: 400 });
      await inviaTestoRedazione(testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    } else {
      await provaBotRedazione();
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, errore: (e as Error).message }, { status: 500 });
  }
}
