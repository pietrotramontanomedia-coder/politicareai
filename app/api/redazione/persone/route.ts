import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione, corpoJson } from '@/lib/redazione/api-server';
import { aggiungiPersona, cambiaAttiva, chiaveNome, LUNGHEZZA_MINIMA_PASSWORD, perBrowser } from '@/lib/redazione/regole';
import { improntaPassword, nomeDiRevisore } from '@/lib/redazione/sessione-server';
import type { Persona } from '@/lib/redazione/tipi';

/**
 * Elenco dei ragazzi della redazione, gestito da chi coordina: aggiungere (POST { nome, password }),
 * disattivare o riattivare (PATCH { chiave, attiva }), cambiare password (PATCH { chiave, password }).
 * Nessuno si cancella: il lavoro resta. Le password si salvano solo come impronta; cambiarla o
 * disattivare qualcuno chiude subito le sue sessioni aperte.
 */

export const dynamic = 'force-dynamic';
/** La prima costruzione dell'indice legge molti file: più dei 10 secondi predefiniti. */
export const maxDuration = 60;

function password(valore: unknown): string | null {
  if (valore === undefined || valore === null || valore === '') return null;
  const p = typeof valore === 'string' ? valore.trim() : '';
  if (p.length < LUNGHEZZA_MINIMA_PASSWORD) throw new ErroreRedazione(400, `La password deve avere almeno ${LUNGHEZZA_MINIMA_PASSWORD} caratteri.`);
  return p;
}

const risposta = (persone: Persona[]) => Response.json({ ok: true, persone: perBrowser(persone) });

export async function POST(request: Request) {
  return conSessione(request, async (sessione) => {
    if (sessione.ruolo !== 'revisore') throw new ErroreRedazione(403, 'Solo chi coordina gestisce l\'elenco.');
    const dati = (await corpoJson(request)) as { nome?: unknown; password?: unknown };
    const nome = typeof dati.nome === 'string' ? dati.nome : '';
    const nuova = password(dati.password);
    // Chi corregge entra col codice dei revisori: in elenco con una password resterebbe chiuso fuori.
    if (nomeDiRevisore(nome)) throw new ErroreRedazione(400, 'Questo nome è fra chi corregge: entra con il codice dei revisori, non va aggiunto.');
    const chiave = chiaveNome(nome);
    const impronta = nuova ? improntaPassword(nuova) : null;
    const persone = await archivio().aggiornaPersone((attuali) => {
      const esito = aggiungiPersona(attuali, nome, sessione.nome, new Date());
      if (!esito.ok) throw new ErroreRedazione(400, esito.errore);
      return impronta ? esito.valore.map((p) => (p.chiave === chiave ? { ...p, password: impronta } : p)) : esito.valore;
    });
    return risposta(persone);
  });
}

export async function PATCH(request: Request) {
  return conSessione(request, async (sessione) => {
    if (sessione.ruolo !== 'revisore') throw new ErroreRedazione(403, 'Solo chi coordina gestisce l\'elenco.');
    const dati = (await corpoJson(request)) as { chiave?: unknown; attiva?: unknown; password?: unknown };
    const chiave = typeof dati.chiave === 'string' ? dati.chiave : '';
    const nuova = password(dati.password);
    const impronta = nuova ? improntaPassword(nuova) : null;
    const persone = await archivio().aggiornaPersone((attuali) => {
      if (!attuali.some((p) => p.chiave === chiave)) throw new ErroreRedazione(404, 'Persona non trovata.');
      if (impronta) return attuali.map((p) => (p.chiave === chiave ? { ...p, password: impronta } : p));
      const esito = cambiaAttiva(attuali, chiave, dati.attiva === true);
      if (!esito.ok) throw new ErroreRedazione(400, esito.errore);
      return esito.valore;
    });
    return risposta(persone);
  });
}
