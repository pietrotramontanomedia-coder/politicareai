import { leggiUltimOra } from '@/lib/ultimora-server';

export async function GET() {
  const voci = await leggiUltimOra();

  return Response.json({
    success: voci.length > 0,
    voci,
    timestamp: new Date().toISOString(),
  });
}
