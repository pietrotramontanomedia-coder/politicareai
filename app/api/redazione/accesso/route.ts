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
  ruoloDaCodice,
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
    const no = (errore: string) => Response.json({ ok: false, errore }, { status: 401 });

    // Chi corregge entra con il codice dei revisori, anche se il suo nome fosse finito fra i ragazzi.
    if (ruoloDaCodice(codice) === 'revisore') {
      const accesso = ruoloPerAccesso(nome, codice);
      return 'errore' in accesso ? no(accesso.errore) : entra({ nome, ruolo: 'revisore' });
    }

    const persone = await archivio().leggiPersone();
    const registrata = persone.find((p) => p.attiva && p.chiave === chiaveNome(nome));
    // Chi ha una password personale entra solo con quella.
    if (registrata?.password) {
      if (!passwordGiusta(codice, registrata.password)) return no('Password sbagliata.');
      return entra({ nome: registrata.nome, ruolo: 'redattore' }, registrata.password);
    }
    const accesso = ruoloPerAccesso(nome, codice);
    if ('errore' in accesso) return no(accesso.errore);
    // Con l'elenco dei ragazzi, il codice della redazione vale solo per i nomi registrati e attivi.
    if (persone.length > 0 && !registrata) {
      return no('Questo nome non è nell\'elenco della redazione: scrivilo come te l\'hanno dato o chiedi a chi coordina.');
    }
    return entra({ nome: registrata?.nome ?? nome, ruolo: accesso.ruolo });
  } catch (errore) {
    return rispostaErrore(errore);
  }
}

function entra(sessione: SessioneRedazione, password?: { impronta: string }): Response {
  const token = creaToken(sessione, new Date(), password);
  if (!token) return Response.json({ ok: false, errore: 'Il portale non è configurato.' }, { status: 503 });
  return Response.json({ ok: true, sessione }, { headers: { 'set-cookie': cookieEntrata(token) } });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { 'set-cookie': cookieUscita() } });
}
