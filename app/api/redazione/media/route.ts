import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione, nuovoId } from '@/lib/redazione/api-server';
import { LIMITI, tipoImmagine } from '@/lib/redazione/regole';

/**
 * Caricamento di una foto, già ridotta dal browser: una per richiesta, così si resta sotto
 * il tetto del corpo delle funzioni Vercel anche con un carosello di dieci immagini.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return conSessione(request, async () => {
    const dichiarati = Number(request.headers.get('content-length') ?? 0);
    if (dichiarati > LIMITI.byteImmagine) throw new ErroreRedazione(413, 'Immagine troppo pesante.');
    const byte = new Uint8Array(await request.arrayBuffer());
    if (byte.length === 0) throw new ErroreRedazione(400, 'Immagine mancante.');
    if (byte.length > LIMITI.byteImmagine) throw new ErroreRedazione(413, 'Immagine troppo pesante.');
    const tipo = tipoImmagine(byte);
    if (!tipo) throw new ErroreRedazione(415, 'Formato non supportato: usa JPEG, PNG o WebP.');
    const id = nuovoId();
    await archivio().salvaMedia(id, byte, tipo);
    return Response.json({ ok: true, id }, { status: 201 });
  });
}
