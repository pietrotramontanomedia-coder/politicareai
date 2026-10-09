import { randomUUID } from 'node:crypto';
import { ErroreRedazione } from './archivio-server';
import { redazioneConfigurata, sessioneDaRichiesta } from './sessione-server';
import type { SessioneRedazione } from './tipi';

/** Pezzi comuni alle API del portale della redazione. */

export function nuovoId(): string {
  return randomUUID().replace(/-/g, '');
}

export function rispostaErrore(errore: unknown): Response {
  if (errore instanceof ErroreRedazione) return Response.json({ ok: false, errore: errore.message }, { status: errore.status });
  console.error('[redazione]', errore);
  return Response.json({ ok: false, errore: 'Qualcosa è andato storto, riprova.' }, { status: 500 });
}

/** Esegue la richiesta solo con una sessione valida; ogni errore diventa una risposta JSON. */
export async function conSessione(request: Request, fn: (sessione: SessioneRedazione) => Promise<Response>): Promise<Response> {
  try {
    if (!redazioneConfigurata()) throw new ErroreRedazione(503, 'Il portale della redazione non è configurato.');
    const sessione = sessioneDaRichiesta(request);
    if (!sessione) throw new ErroreRedazione(401, 'Accedi per continuare.');
    return await fn(sessione);
  } catch (errore) {
    return rispostaErrore(errore);
  }
}

export async function corpoJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErroreRedazione(400, 'Richiesta non valida.');
  }
}
