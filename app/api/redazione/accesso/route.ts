import { rispostaErrore } from '@/lib/redazione/api-server';
import { archivio } from '@/lib/redazione/archivio-server';
import { chiaveNome, normalizzaNome } from '@/lib/redazione/regole';
import type { SessioneRedazione } from '@/lib/redazione/tipi';
import {
  cookieEntrata,
  cookieUscita,
  creaToken,
  redazioneConfigurata,
  passwordGiusta,
  ruoloPerAccesso,
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
    const codice = typeof dati.codice === 'string' ? dati.codice : '';
    const persone = await archivio().leggiPersone();
    const registrata = persone.find((p) => p.attiva && p.chiave === chiaveNome(nome));
    // Chi ha una password personale entra solo con quella.
    if (registrata?.password) {
      if (!passwordGiusta(codice, registrata.password)) return Response.json({ ok: false, errore: 'Password sbagliata.' }, { status: 401 });
      return entra({ nome: registrata.nome, ruolo: 'redattore' });
    }
    const accesso = ruoloPerAccesso(nome, codice);
    if ('errore' in accesso) return Response.json({ ok: false, errore: accesso.errore }, { status: 401 });
    // Con l'elenco dei ragazzi, il codice della redazione vale solo per i nomi registrati e attivi.
    if (accesso.ruolo === 'redattore' && persone.length > 0 && !registrata) {
      return Response.json({ ok: false, errore: 'Questo nome non è nell\'elenco della redazione: scrivilo come te l\'hanno dato o chiedi a chi coordina.' }, { status: 401 });
    }
    return entra({ nome, ruolo: accesso.ruolo });
  } catch (errore) {
    return rispostaErrore(errore);
  }
}

function entra(sessione: SessioneRedazione): Response {
  try {
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
