import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione, corpoJson, nuovoId } from '@/lib/redazione/api-server';
import { nuovoContenuto, ordinaFeed, perLettore, validaBozza } from '@/lib/redazione/regole';

/** Feed della redazione (GET) e nuovo post o nuova storia (POST). */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return conSessione(request, async (sessione) => {
    const contenuti = ordinaFeed(await archivio().elenca()).map((c) => perLettore(sessione, c));
    return Response.json({ ok: true, sessione, contenuti });
  });
}

export async function POST(request: Request) {
  return conSessione(request, async (sessione) => {
    const dati = (await corpoJson(request)) as { tipo?: unknown };
    if (dati.tipo !== 'post' && dati.tipo !== 'storia') throw new ErroreRedazione(400, 'Scegli post o storia.');
    const bozza = validaBozza(dati.tipo, dati);
    if (!bozza.ok) throw new ErroreRedazione(400, bozza.errore);
    const contenuto = nuovoContenuto(nuovoId(), dati.tipo, sessione.nome, bozza.valore, new Date());
    await archivio().crea(contenuto);
    return Response.json({ ok: true, contenuto }, { status: 201 });
  });
}
