import { autorizzatoCron } from '@/lib/cron';
import { rinnovaToken } from '@/lib/instagram-token';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!autorizzatoCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ success: false, error: 'non autorizzato' }, { status: 401 });
  }

  try {
    const esito = await rinnovaToken();
    return Response.json({ success: true, ...esito });
  } catch (errore) {
    return Response.json(
      { success: false, error: errore instanceof Error ? errore.message : 'errore sconosciuto' },
      { status: 502 },
    );
  }
}
