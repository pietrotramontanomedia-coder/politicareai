import { leggiUltimOra } from '@/lib/ultimora-server';

/** Il sito politicare.it legge questo feed dal browser per la pagina Live e la striscia in home. */
const ORIGINI_AMMESSE = ['https://www.politicare.it', 'https://politicare.it'];

function intestazioniCors(origine: string | null): Record<string, string> {
  if (!origine || !ORIGINI_AMMESSE.includes(origine)) return {};
  return {
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
  };
}

export async function GET(request: Request) {
  const voci = await leggiUltimOra();

  return Response.json(
    {
      success: voci.length > 0,
      voci,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        ...intestazioniCors(request.headers.get('origin')),
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    },
  );
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: intestazioniCors(request.headers.get('origin')) });
}
