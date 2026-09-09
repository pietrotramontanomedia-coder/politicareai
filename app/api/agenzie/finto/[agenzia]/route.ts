import { notFound } from 'next/navigation';
import { leggiXmlFinto } from '@/lib/agenzie/server';
import { eAgenzia } from '@/lib/agenzie/tipi';

/**
 * Serve il feed RSS finto di un'agenzia come farebbe il sito reale:
 * GET /api/agenzie/finto/ansa, GET /api/agenzie/finto/adnkronos.
 * Utile per puntarci un lettore RSS esterno o per provare il parser via HTTP.
 * Il feed dichiara nel titolo del canale che è una simulazione.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ agenzia: string }> }) {
  const { agenzia } = await params;
  if (!eAgenzia(agenzia)) notFound();

  const xml = await leggiXmlFinto(agenzia);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Politicare-Feed': 'simulato',
    },
  });
}
