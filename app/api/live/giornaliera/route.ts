import { autorizzatoCron } from '@/lib/cron';
import { aggiornaLiveGiornaliera, liveGiornalieraConfigurata, verificaAccessoWordPress } from '@/lib/live-giornaliera-server';

/**
 * Aggiorna la pagina «Politica oggi» del giorno su politicare.it.
 * La chiama il cron di Vercel a fine giornata; durante il giorno parte da sola a ogni post
 * nuovo del canale Telegram (webhook in app/api/telegram/x).
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!autorizzatoCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    // Senza segreto si può solo controllare che l'accesso a WordPress funzioni (?verifica=1), senza scrivere nulla.
    const verifica = new URL(request.url).searchParams.has('verifica') ? await verificaAccessoWordPress() : undefined;
    return Response.json({ configurata: liveGiornalieraConfigurata(), ...(verifica ? { wordpress: verifica } : {}) }, { status: 401 });
  }
  try {
    const esito = await aggiornaLiveGiornaliera(new Date(), { fresco: true });
    return Response.json({ success: true, ...esito });
  } catch (errore) {
    console.error('[live-giornaliera]', errore);
    return Response.json({ success: false, error: errore instanceof Error ? errore.message : 'errore sconosciuto' }, { status: 502 });
  }
}
