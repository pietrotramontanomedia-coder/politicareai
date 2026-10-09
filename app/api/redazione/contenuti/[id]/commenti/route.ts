import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione, corpoJson, nuovoId } from '@/lib/redazione/api-server';
import { aggiungiCommento, validaCommento } from '@/lib/redazione/regole';

/** Correzioni, consigli e risposte; chi corregge può anche cambiare lo stato del contenuto. */

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSessione(request, async (sessione) => {
    const { id } = await params;
    const dati = await corpoJson(request);
    const idCommento = nuovoId();
    const contenuto = await archivio().aggiorna(id, (attuale) => {
      const richiesta = validaCommento(sessione, attuale, dati);
      if (!richiesta.ok) throw new ErroreRedazione(400, richiesta.errore);
      return aggiungiCommento(attuale, sessione, richiesta.valore, idCommento, new Date());
    });
    return Response.json({ ok: true, contenuto });
  });
}
