import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione } from '@/lib/redazione/api-server';

/** Le foto della redazione sono private: si vedono solo con la sessione del portale. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSessione(request, async () => {
    const media = await archivio().leggiMedia((await params).id);
    if (!media) throw new ErroreRedazione(404, 'Immagine non trovata.');
    return new Response(media.corpo as BodyInit, {
      headers: {
        'content-type': media.tipo,
        // L'identificativo non cambia mai contenuto: cache lunga, ma solo nel browser di chi è dentro.
        'cache-control': 'private, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  });
}
