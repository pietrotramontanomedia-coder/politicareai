import { leggiAltre, leggiNotiziaOFlash } from '@/lib/ultimora-server';

/** Una notizia di ultim'ora con le altre recenti. La usa l'app, che non ha pagine dinamiche. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [notizia, altre] = await Promise.all([leggiNotiziaOFlash(id), leggiAltre(id)]);
  if (!notizia) return Response.json({ success: false }, { status: 404 });
  return Response.json(
    { success: true, notizia, altre },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } },
  );
}
