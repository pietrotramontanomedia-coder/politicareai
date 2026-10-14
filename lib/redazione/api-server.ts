import { randomUUID } from 'node:crypto';
import { archivio, ErroreRedazione } from './archivio-server';
import { gettoneDaRichiesta, redazioneConfigurata, sessioneAncoraValida } from './sessione-server';
import type { SessioneRedazione } from './tipi';

/** Pezzi comuni alle API del portale della redazione. */

export function nuovoId(): string {
  return randomUUID().replace(/-/g, '');
}

/** Nome e messaggio dell'errore, per i log e per chi coordina (mai il token: gli errori di Blob non lo contengono). */
export function descriviErrore(errore: unknown): string {
  if (errore instanceof Error) return `${errore.name}: ${errore.message}`;
  return String(errore);
}

/** Chi coordina vede anche il dettaglio tecnico dell'errore, così un problema in produzione si capisce dalla pagina. */
export function rispostaErrore(errore: unknown, perRevisore = false): Response {
  if (errore instanceof ErroreRedazione) {
    return Response.json({ ok: false, errore: errore.message, ...(errore.codice ? { codice: errore.codice } : {}) }, { status: errore.status });
  }
  console.error('[redazione]', errore);
  return Response.json({ ok: false, errore: 'Qualcosa è andato storto, riprova.', ...(perRevisore ? { dettaglio: descriviErrore(errore) } : {}) }, { status: 500 });
}

/**
 * Esegue la richiesta solo con una sessione valida; ogni errore diventa una risposta JSON.
 * Di norma controlla anche che chi l'ha aperta possa ancora entrare (non disattivato, password
 * non cambiata); le foto saltano il controllo, che costerebbe una lettura per immagine: senza
 * l'elenco dei contenuti non si sa quali chiedere.
 */
export async function conSessione(
  request: Request,
  fn: (sessione: SessioneRedazione) => Promise<Response>,
  { controllaPersona = true }: { controllaPersona?: boolean } = {},
): Promise<Response> {
  const gettone = redazioneConfigurata() ? gettoneDaRichiesta(request) : null;
  try {
    if (!redazioneConfigurata()) throw new ErroreRedazione(503, 'Il portale della redazione non è configurato.');
    if (!gettone) throw new ErroreRedazione(401, 'Accedi per continuare.');
    if (controllaPersona && !sessioneAncoraValida(gettone, await archivio().leggiPersone())) {
      throw new ErroreRedazione(401, 'La tua sessione non vale più: entra di nuovo.');
    }
    return await fn(gettone.sessione);
  } catch (errore) {
    return rispostaErrore(errore, gettone?.sessione.ruolo === 'revisore');
  }
}

export async function corpoJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErroreRedazione(400, 'Richiesta non valida.');
  }
}
