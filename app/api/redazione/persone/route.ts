import { archivio, ErroreRedazione } from '@/lib/redazione/archivio-server';
import { conSessione, corpoJson } from '@/lib/redazione/api-server';
import { aggiungiPersona, cambiaAttiva, chiaveNome, LUNGHEZZA_MINIMA_PASSWORD, perBrowser } from '@/lib/redazione/regole';
import { improntaPassword } from '@/lib/redazione/sessione-server';
import type { Persona } from '@/lib/redazione/tipi';

/**
 * Elenco dei ragazzi della redazione, gestito da chi coordina: aggiungere (POST { nome, password }),
 * disattivare o riattivare (PATCH { chiave, attiva }), cambiare password (PATCH { chiave, password }).
 * Nessuno si cancella: il lavoro resta. Le password si salvano solo come impronta.
 */

export const dynamic = 'force-dynamic';

function password(valore: unknown): string | null {
  if (valore === undefined || valore === null || valore === '') return null;
  const p = typeof valore === 'string' ? valore.trim() : '';
  if (p.length < LUNGHEZZA_MINIMA_PASSWORD) throw new ErroreRedazione(400, `La password deve avere almeno ${LUNGHEZZA_MINIMA_PASSWORD} caratteri.`);
  return p;
}

async function salva(persone: Persona[]): Promise<Response> {
  await archivio().salvaPersone(persone);
  return Response.json({ ok: true, persone: perBrowser(persone) });
}

export async function POST(request: Request) {
  return conSessione(request, async (sessione) => {
    if (sessione.ruolo !== 'revisore') throw new ErroreRedazione(403, 'Solo chi coordina gestisce l\'elenco.');
    const dati = (await corpoJson(request)) as { nome?: unknown; password?: unknown };
    const nuova = password(dati.password);
    const esito = aggiungiPersona(await archivio().leggiPersone(), typeof dati.nome === 'string' ? dati.nome : '', sessione.nome, new Date());
    if (!esito.ok) throw new ErroreRedazione(400, esito.errore);
    const chiave = chiaveNome(typeof dati.nome === 'string' ? dati.nome : '');
    return salva(nuova ? esito.valore.map((p) => (p.chiave === chiave ? { ...p, password: improntaPassword(nuova) } : p)) : esito.valore);
  });
}

export async function PATCH(request: Request) {
  return conSessione(request, async (sessione) => {
    if (sessione.ruolo !== 'revisore') throw new ErroreRedazione(403, 'Solo chi coordina gestisce l\'elenco.');
    const dati = (await corpoJson(request)) as { chiave?: unknown; attiva?: unknown; password?: unknown };
    const chiave = typeof dati.chiave === 'string' ? dati.chiave : '';
    const persone = await archivio().leggiPersone();
    if (!persone.some((p) => p.chiave === chiave)) throw new ErroreRedazione(404, 'Persona non trovata.');
    const nuova = password(dati.password);
    if (nuova) return salva(persone.map((p) => (p.chiave === chiave ? { ...p, password: improntaPassword(nuova) } : p)));
    const esito = cambiaAttiva(persone, chiave, dati.attiva === true);
    if (!esito.ok) throw new ErroreRedazione(400, esito.errore);
    return salva(esito.valore);
  });
}
