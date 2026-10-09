import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione, corpoJson } from '@/lib/redazione/api-server';
import { aggiungiVersione, eliminato, perLettore, puoEliminare, puoModificare, ripristina, segnaEliminato, validaBozza } from '@/lib/redazione/regole';
import { avvisaDopoLaRisposta } from '@/lib/redazione/telegram-server';

/**
 * Un contenuto: lettura, nuova versione dell'autore (PUT), eliminazione (DELETE) e ripristino dal
 * cestino (PATCH). Eliminare non cancella niente: il contenuto resta nell'archivio.
 */

export const dynamic = 'force-dynamic';

type Parametri = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Parametri) {
  return conSessione(request, async (sessione) => {
    const contenuto = await archivio().leggi((await params).id);
    if (!contenuto || (eliminato(contenuto) && sessione.ruolo !== 'revisore')) throw new ErroreRedazione(404, 'Contenuto non trovato.');
    return Response.json({ ok: true, contenuto: perLettore(sessione, contenuto) });
  });
}

export async function PUT(request: Request, { params }: Parametri) {
  return conSessione(request, async (sessione) => {
    const { id } = await params;
    const dati = await corpoJson(request);
    const contenuto = await archivio().aggiorna(id, (attuale) => {
      if (eliminato(attuale)) throw new ErroreRedazione(404, 'Contenuto non trovato.');
      if (!puoModificare(sessione, attuale)) throw new ErroreRedazione(403, 'Solo chi l\'ha scritto può pubblicare una nuova versione.');
      const bozza = validaBozza(attuale.tipo, dati);
      if (!bozza.ok) throw new ErroreRedazione(400, bozza.errore);
      return aggiungiVersione(attuale, bozza.valore, new Date());
    });
    avvisaDopoLaRisposta(request, contenuto);
    return Response.json({ ok: true, contenuto });
  });
}

export async function DELETE(request: Request, { params }: Parametri) {
  return conSessione(request, async (sessione) => {
    const { id } = await params;
    await archivio().aggiorna(id, (attuale) => {
      if (eliminato(attuale)) throw new ErroreRedazione(404, 'Contenuto non trovato.');
      if (!puoEliminare(sessione, attuale)) throw new ErroreRedazione(403, 'Non puoi eliminare questo contenuto.');
      return segnaEliminato(attuale, sessione, new Date());
    });
    return Response.json({ ok: true });
  });
}

/** Ripristino dal cestino: solo chi corregge. */
export async function PATCH(request: Request, { params }: Parametri) {
  return conSessione(request, async (sessione) => {
    if (sessione.ruolo !== 'revisore') throw new ErroreRedazione(403, 'Solo chi corregge può ripristinare.');
    const { id } = await params;
    const contenuto = await archivio().aggiorna(id, (attuale) => ripristina(attuale, new Date()));
    return Response.json({ ok: true, contenuto });
  });
}
