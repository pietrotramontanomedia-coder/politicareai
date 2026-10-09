import { rispostaErrore } from '@/lib/redazione/api-server';
import { normalizzaNome } from '@/lib/redazione/regole';
import {
  cookieEntrata,
  cookieUscita,
  creaToken,
  redazioneConfigurata,
  ruoloDaCodice,
  sessioneDaRichiesta,
} from '@/lib/redazione/sessione-server';

/** Entrata e uscita dal portale della redazione: nome + codice, sessione in un cookie firmato. */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return Response.json({ ok: true, configurata: redazioneConfigurata(), sessione: sessioneDaRichiesta(request) });
}

export async function POST(request: Request) {
  try {
    if (!redazioneConfigurata()) return Response.json({ ok: false, errore: 'Il portale non è configurato.' }, { status: 503 });
    const dati = (await request.json().catch(() => ({}))) as { nome?: unknown; codice?: unknown };
    const nome = normalizzaNome(typeof dati.nome === 'string' ? dati.nome : '');
    if (nome.length < 2) return Response.json({ ok: false, errore: 'Scrivi il tuo nome.' }, { status: 400 });
    const ruolo = ruoloDaCodice(typeof dati.codice === 'string' ? dati.codice : '');
    if (!ruolo) return Response.json({ ok: false, errore: 'Codice non valido.' }, { status: 401 });
    const sessione = { nome, ruolo };
    const token = creaToken(sessione, new Date());
    if (!token) return Response.json({ ok: false, errore: 'Il portale non è configurato.' }, { status: 503 });
    return Response.json({ ok: true, sessione }, { headers: { 'set-cookie': cookieEntrata(token) } });
  } catch (errore) {
    return rispostaErrore(errore);
  }
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { 'set-cookie': cookieUscita() } });
}
