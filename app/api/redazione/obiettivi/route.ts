import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione, corpoJson } from '@/lib/redazione/api-server';
import { normalizzaNome, validaObiettivi } from '@/lib/redazione/regole';

/** Obiettivi giornalieri della redazione (storie e post a testa): li cambia solo chi corregge. */

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  return conSessione(request, async (sessione) => {
    if (sessione.ruolo !== 'revisore') throw new ErroreRedazione(403, 'Solo chi corregge cambia gli obiettivi.');
    const esito = validaObiettivi(await corpoJson(request));
    if (!esito.ok) throw new ErroreRedazione(400, esito.errore);
    const obiettivi = { ...esito.valore, aggiornatoIl: new Date().toISOString(), aggiornatoDa: normalizzaNome(sessione.nome) };
    await archivio().salvaObiettivi(obiettivi);
    return Response.json({ ok: true, obiettivi });
  });
}
