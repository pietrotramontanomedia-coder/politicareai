/**
 * La stessa base di codice produce due build:
 *
 *   web  `npm run build`      Next.js con server (Vercel): pagine, API, rendering dinamico.
 *   app  `npm run build:app`  esportazione statica impacchettata da Capacitor in iOS e Android.
 *
 * Nell'app test, quiz, gioco, simulatore e metodologia sono dentro il pacchetto:
 * funzionano offline e le risposte del test non lasciano il telefono. Le notizie
 * (feed, ultim'ora, articoli) vengono chieste alle API del sito in produzione,
 * perché richiedono un server.
 */

/** true solo nella build per Capacitor. Valore fissato al momento della build. */
export const IN_APP = process.env.NEXT_PUBLIC_PIATTAFORMA === 'app';

/** Indirizzo pubblico del sito, usato dall'app per API, link condivisi e ritorno dall'accesso. */
export const SITO_PUBBLICO = (process.env.NEXT_PUBLIC_SITO_URL ?? '').replace(/\/+$/, '');

/** Schema dell'app per i link che la riaprono (ritorno dall'accesso): it.politicare.app://... */
export const SCHEMA_APP = 'it.politicare.app';

/** Indirizzo di un endpoint interno, es. apiUrl('/api/feed'). */
export function apiUrl(percorso: string): string {
  if (!percorso.startsWith('/')) throw new Error(`Percorso API non assoluto: ${percorso}`);
  return IN_APP ? `${SITO_PUBBLICO}${percorso}` : percorso;
}

export type TipoDettaglio = 'ultimora' | 'leggi';

/** Percorso pubblico (sul sito) di una notizia: è quello da condividere, anche dall'app. */
export function percorsoWebDettaglio(tipo: TipoDettaglio, id: string): string {
  return `/${tipo}/${encodeURIComponent(id)}`;
}

/**
 * Link interno alla pagina di dettaglio di una notizia.
 * Sul web la pagina è dinamica (/ultimora/abc); nell'esportazione statica non può
 * esistere una pagina per ogni id: si usa una pagina sola con l'id in query
 * (/ultimora/?id=abc) che carica il contenuto dalle API.
 */
export function percorsoDettaglio(tipo: TipoDettaglio, id: string): string {
  if (!IN_APP) return percorsoWebDettaglio(tipo, id);
  const valore = encodeURIComponent(id);
  return tipo === 'ultimora' ? `/ultimora/?id=${valore}` : `/leggi/?slug=${valore}`;
}

/** Indirizzo completo da condividere per un percorso del sito. Solo nel browser. */
export function urlPubblico(percorso: string): string {
  return `${IN_APP ? SITO_PUBBLICO : window.location.origin}${percorso}`;
}

/** Dominio da stampare sulle grafiche condivise. Solo nel browser. */
export function hostPubblico(): string {
  return IN_APP ? new URL(SITO_PUBBLICO).host : window.location.host;
}

/** Dove torna l'utente dopo il link via email o l'accesso con Google. Solo nel browser. */
export function urlRitornoAccesso(): string {
  return IN_APP ? `${SCHEMA_APP}://accedi` : `${window.location.origin}/accedi`;
}
