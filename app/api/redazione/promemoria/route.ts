import { autorizzatoCron } from '@/lib/cron';
import { archivio } from '@/lib/redazione/archivio-server';
import { testoPromemoria } from '@/lib/redazione/regole';
import { avvisiRedazioneConfigurati, inviaTestoRedazione } from '@/lib/redazione/telegram-server';

/**
 * Promemoria del mattino per chi coordina, nel gruppo Telegram: i contenuti che aspettano una
 * revisione da più di 24 ore. Se non ce ne sono non manda niente. Lo chiama il cron di Vercel
 * (vercel.json) con `Authorization: Bearer <CRON_SECRET>`; con ?anteprima=1 restituisce il testo.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!autorizzatoCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ ok: false, errore: 'non autorizzato' }, { status: 401 });
  }
  try {
    const base = process.env.SITO_URL?.replace(/\/$/, '') || new URL(request.url).origin;
    const testo = testoPromemoria(await archivio().elenca(), new Date(), `${base}/redazione`);
    if (new URL(request.url).searchParams.has('anteprima') || !testo) return Response.json({ ok: true, testo, inviato: false });
    if (!avvisiRedazioneConfigurati()) return Response.json({ ok: false, errore: 'bot della redazione non configurato' }, { status: 503 });
    await inviaTestoRedazione(testo);
    return Response.json({ ok: true, inviato: true });
  } catch (errore) {
    console.error('[redazione] promemoria', errore);
    return Response.json({ ok: false, errore: errore instanceof Error ? errore.message : 'errore' }, { status: 502 });
  }
}
