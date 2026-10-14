import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione, corpoJson, nuovoId } from '@/lib/redazione/api-server';
import { chiaveNome, nuovoContenuto, perBrowser, schedaPersona, sincronizza, validaBozza } from '@/lib/redazione/regole';
import { avvisaDopoLaRisposta } from '@/lib/redazione/telegram-server';

/**
 * Elenco della redazione (GET) e nuovo post o nuova storia (POST).
 *
 * GET senza parametri: le ultime settimane e i contenuti ancora aperti. Con `dal=<revisione>`: solo
 * quello che è cambiato dopo. Con `autore=<chiave>` (e `prima=<data>` per le pagine successive): la
 * scheda di una persona, per chi coordina o per la persona stessa.
 */

export const dynamic = 'force-dynamic';
/** La prima costruzione dell'indice legge molti file: più dei 10 secondi predefiniti. */
export const maxDuration = 60;

export async function GET(request: Request) {
  return conSessione(request, async (sessione) => {
    const parametri = new URL(request.url).searchParams;
    const adesso = new Date();
    const autore = parametri.get('autore');
    if (autore !== null) {
      if (sessione.ruolo !== 'revisore' && autore !== chiaveNome(sessione.nome)) throw new ErroreRedazione(403, 'Puoi vedere solo la tua scheda.');
      const [{ contenuti }, obiettivi] = await Promise.all([archivio().stato(), archivio().leggiObiettivi()]);
      return Response.json({ ok: true, ...schedaPersona(sessione, contenuti, autore, obiettivi, adesso, parametri.get('prima')) });
    }
    const dal = Number.parseInt(parametri.get('dal') ?? '', 10);
    const [stato, obiettivi, persone] = await Promise.all([archivio().stato(), archivio().leggiObiettivi(), archivio().leggiPersone()]);
    return Response.json({
      ok: true,
      sessione,
      ...sincronizza(sessione, stato, Number.isFinite(dal) && dal >= 0 ? dal : null, adesso, persone),
      obiettivi,
      // L'elenco dei ragazzi serve solo a chi lo gestisce.
      persone: sessione.ruolo === 'revisore' ? perBrowser(persone) : [],
    });
  });
}

export async function POST(request: Request) {
  return conSessione(request, async (sessione) => {
    const dati = (await corpoJson(request)) as { tipo?: unknown };
    if (dati.tipo !== 'post' && dati.tipo !== 'storia') throw new ErroreRedazione(400, 'Scegli post o storia.');
    const bozza = validaBozza(dati.tipo, dati);
    if (!bozza.ok) throw new ErroreRedazione(400, bozza.errore);
    const contenuto = await archivio().crea(nuovoContenuto(nuovoId(), dati.tipo, sessione.nome, bozza.valore, new Date()));
    avvisaDopoLaRisposta(request, contenuto);
    return Response.json({ ok: true, contenuto }, { status: 201 });
  });
}
