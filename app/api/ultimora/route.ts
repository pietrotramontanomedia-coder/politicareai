import { leggiUltimOra } from '@/lib/ultimora-server';

/**
 * Il sito politicare.it legge questo feed dal browser per la pagina Live e la striscia in home.
 * Sono notizie pubbliche e la risposta è in cache sul CDN: l'intestazione è sempre la stessa,
 * così la copia in cache vale per qualsiasi pagina che la chiede.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function GET() {
  const voci = await leggiUltimOra();

  return Response.json(
    {
      success: voci.length > 0,
      voci,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        ...CORS,
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
