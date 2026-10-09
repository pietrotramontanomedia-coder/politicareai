import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione, corpoJson } from '@/lib/redazione/api-server';
import { aggiungiVersione, immaginiOrfane, perLettore, puoEliminare, puoModificare, validaBozza } from '@/lib/redazione/regole';

/** Un contenuto: lettura, nuova versione dell'autore (PUT), eliminazione. */

export const dynamic = 'force-dynamic';

type Parametri = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Parametri) {
  return conSessione(request, async (sessione) => {
    const contenuto = await archivio().leggi((await params).id);
    if (!contenuto) throw new ErroreRedazione(404, 'Contenuto non trovato.');
    return Response.json({ ok: true, contenuto: perLettore(sessione, contenuto) });
  });
}

export async function PUT(request: Request, { params }: Parametri) {
  return conSessione(request, async (sessione) => {
    const { id } = await params;
    const dati = await corpoJson(request);
    const contenuto = await archivio().aggiorna(id, (attuale) => {
      if (!puoModificare(sessione, attuale)) throw new ErroreRedazione(403, 'Solo chi l\'ha scritto può pubblicare una nuova versione.');
      const bozza = validaBozza(attuale.tipo, dati);
      if (!bozza.ok) throw new ErroreRedazione(400, bozza.errore);
      return aggiungiVersione(attuale, bozza.valore, new Date());
    });
    return Response.json({ ok: true, contenuto });
  });
}

export async function DELETE(request: Request, { params }: Parametri) {
  return conSessione(request, async (sessione) => {
    const { id } = await params;
    const deposito = archivio();
    const eliminato = await deposito.elimina(id, (attuale) => {
      if (!puoEliminare(sessione, attuale)) throw new ErroreRedazione(403, 'Non puoi eliminare questo contenuto.');
    });
    // Le immagini si tolgono solo se nessun altro contenuto le usa.
    try {
      await deposito.eliminaMedia(immaginiOrfane(eliminato, await deposito.elenca()));
    } catch (errore) {
      console.error('[redazione] immagini non eliminate', errore);
    }
    return Response.json({ ok: true });
  });
}
