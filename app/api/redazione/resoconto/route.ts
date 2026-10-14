import { autorizzatoCron } from '@/lib/cron';
import { archivio } from '@/lib/redazione/archivio-server';
import { testoResoconto } from '@/lib/redazione/regole';
import { avvisiRedazioneConfigurati, inviaTestoRedazione } from '@/lib/redazione/telegram-server';

/**
 * Resoconto serale della redazione nel gruppo Telegram: chi ha raggiunto gli obiettivi del giorno
 * e chi no. Lo chiama il cron di Vercel (vercel.json) con `Authorization: Bearer <CRON_SECRET>`.
 * Con ?anteprima=1 restituisce il testo senza mandarlo.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!autorizzatoCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ ok: false, errore: 'non autorizzato' }, { status: 401 });
  }
  try {
    // Rete di sicurezza due volte al giorno: nessun contenuto resta fuori dall'indice.
    await archivio()
      .riallinea()
      .catch((errore) => console.error('[redazione] riallineamento non riuscito', errore));
    const [contenuti, obiettivi, persone] = await Promise.all([archivio().elenca(), archivio().leggiObiettivi(), archivio().leggiPersone()]);
    const base = process.env.SITO_URL?.replace(/\/$/, '') || new URL(request.url).origin;
    const testo = testoResoconto(contenuti, obiettivi, new Date(), `${base}/redazione`, persone);
    if (new URL(request.url).searchParams.has('anteprima')) return Response.json({ ok: true, testo });
    if (!avvisiRedazioneConfigurati()) return Response.json({ ok: false, errore: 'bot della redazione non configurato' }, { status: 503 });
    await inviaTestoRedazione(testo);
    return Response.json({ ok: true });
  } catch (errore) {
    console.error('[redazione] resoconto', errore);
    return Response.json({ ok: false, errore: errore instanceof Error ? errore.message : 'errore' }, { status: 502 });
  }
}
