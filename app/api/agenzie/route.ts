import { leggiLanci } from '@/lib/agenzie/server';
import { AGENZIE, eAgenzia } from '@/lib/agenzie/tipi';

/**
 * GET /api/agenzie            -> lanci di tutte le agenzie
 * GET /api/agenzie?agenzia=ansa -> lanci di una sola agenzia
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const richiesta = searchParams.get('agenzia');
  const agenzie = richiesta && eAgenzia(richiesta) ? [richiesta] : AGENZIE;

  const risposta = await leggiLanci(agenzie);
  return Response.json(risposta, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
