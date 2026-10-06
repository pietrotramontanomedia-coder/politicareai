import { after } from 'next/server';
import { componiPagina, giorniDaPubblicare, MINIMO_NOTIZIE, notizieDelGiorno, riassunto, slugGiorno, titoloGiorno, type Giorno } from '@/lib/live-giornaliera';
import type { NotiziaUltimOra } from '@/lib/ultimora-server';
import { leggiUltimOra } from '@/lib/ultimora-server';

/**
 * Scrive su WordPress la pagina «Politica oggi» del giorno, con una password per le applicazioni.
 * Variabili su Vercel: WP_USER e WP_APP_PASSWORD (obbligatorie), WP_URL (facoltativa).
 * Categoria «Live» (slug `live`) e immagine «politicare-live-copertina» vengono cercate per slug.
 */

const AUTORE_PREDEFINITO = 3;

interface Config {
  base: string;
  autorizzazione: string;
  autore: number;
}

function config(): Config | null {
  const utente = process.env.WP_USER;
  const password = process.env.WP_APP_PASSWORD;
  if (!utente || !password) return null;
  const base = (process.env.WP_URL ?? 'https://www.politicare.it').replace(/\/$/, '');
  const autore = Number(process.env.WP_LIVE_AUTORE ?? AUTORE_PREDEFINITO);
  return {
    base,
    autorizzazione: `Basic ${Buffer.from(`${utente}:${password.replace(/\s+/g, '')}`).toString('base64')}`,
    autore: Number.isFinite(autore) ? autore : AUTORE_PREDEFINITO,
  };
}

export function liveGiornalieraConfigurata(): boolean {
  return config() !== null;
}

let ultimaVerifica: { quando: number; esito: string } | null = null;

/** Prova l'accesso a WordPress con la password per le applicazioni, senza scrivere nulla. Al massimo una volta al minuto. */
export async function verificaAccessoWordPress(): Promise<string> {
  if (ultimaVerifica && Date.now() - ultimaVerifica.quando < 60_000) return ultimaVerifica.esito;
  const c = config();
  let esito = 'non configurato';
  if (c) {
    try {
      const io = await wp<{ name?: string; capabilities?: Record<string, boolean> }>(c, 'users/me?context=edit&_fields=name,capabilities');
      esito = io.capabilities?.publish_posts ? `ok: accesso come ${io.name}, può pubblicare` : `accesso come ${io.name}, ma senza permesso di pubblicare`;
    } catch (errore) {
      esito = errore instanceof Error ? errore.message.slice(0, 160) : 'errore';
    }
  }
  ultimaVerifica = { quando: Date.now(), esito };
  return esito;
}

async function wp<T>(c: Config, percorso: string, init: RequestInit = {}): Promise<T> {
  const risposta = await fetch(`${c.base}/wp-json/wp/v2/${percorso}`, {
    ...init,
    cache: 'no-store',
    headers: { Authorization: c.autorizzazione, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!risposta.ok) {
    const corpo = await risposta.text().catch(() => '');
    throw new Error(`WordPress ${percorso.split('?')[0]}: HTTP ${risposta.status} ${corpo.slice(0, 200)}`);
  }
  return (await risposta.json()) as T;
}

async function idPerSlug(c: Config, tipo: 'categories' | 'media', slug: string): Promise<number | undefined> {
  const risultati = await wp<{ id: number }[]>(c, `${tipo}?slug=${encodeURIComponent(slug)}&_fields=id`);
  return risultati[0]?.id;
}

export type EsitoGiorno =
  | { stato: 'poche notizie'; giorno: string; notizie: number }
  | { stato: 'invariata' | 'aggiornata' | 'creata'; giorno: string; notizie: number; url: string };

export type EsitoLive = { stato: 'non configurato' } | (EsitoGiorno & { giorniPassati: EsitoGiorno[] });

/** Crea o aggiorna la pagina di un giorno. Riscrive solo se qualcosa è cambiato. */
async function pubblicaGiorno(c: Config, tutte: NotiziaUltimOra[], g: Giorno, oggi: boolean): Promise<EsitoGiorno> {
  const voci = notizieDelGiorno(tutte, g);
  if (voci.length < MINIMO_NOTIZIE) return { stato: 'poche notizie', giorno: g.chiave, notizie: voci.length };

  const slug = slugGiorno(g);
  const url = `${c.base}/${slug}/`;
  const contenuto = componiPagina(voci, g, url, oggi);
  const estratto = riassunto(voci, g);

  const esistenti = await wp<{ id: number; link: string; content: { raw: string } }[]>(
    c,
    `posts?slug=${encodeURIComponent(slug)}&status=publish,draft,pending,private&context=edit&_fields=id,link,content`,
  );
  const esistente = esistenti[0];
  if (esistente) {
    if (esistente.content.raw.trim() === contenuto.trim()) {
      return { stato: 'invariata', giorno: g.chiave, notizie: voci.length, url: esistente.link };
    }
    await wp(c, `posts/${esistente.id}`, { method: 'POST', body: JSON.stringify({ title: titoloGiorno(g, oggi), content: contenuto, excerpt: estratto }) });
    return { stato: 'aggiornata', giorno: g.chiave, notizie: voci.length, url: esistente.link };
  }

  const [categoria, immagine] = await Promise.all([idPerSlug(c, 'categories', 'live'), idPerSlug(c, 'media', 'politicare-live-copertina')]);
  const creato = await wp<{ link: string }>(c, 'posts', {
    method: 'POST',
    body: JSON.stringify({
      title: titoloGiorno(g, oggi),
      slug,
      status: 'publish',
      content: contenuto,
      excerpt: estratto,
      author: c.autore,
      // Data della pagina = ultima notizia del giorno, così l'archivio resta in ordine anche per i giorni recuperati.
      ...(oggi ? {} : { date_gmt: new Date(voci[0].data).toISOString().slice(0, 19) }),
      ...(categoria ? { categories: [categoria] } : {}),
      ...(immagine ? { featured_media: immagine } : {}),
    }),
  });
  return { stato: 'creata', giorno: g.chiave, notizie: voci.length, url: creato.link };
}

/**
 * Crea o aggiorna la pagina di oggi e chiude quelle dei giorni passati ancora nel feed
 * (per esempio le notizie arrivate dopo l'ultimo giro della sera). Chiamarla più volte è innocuo.
 */
export async function aggiornaLiveGiornaliera(adesso: Date = new Date(), opzioni: { fresco?: boolean } = {}): Promise<EsitoLive> {
  const c = config();
  if (!c) return { stato: 'non configurato' };

  const tutte = await leggiUltimOra(opzioni);
  const [oggi, ...passati] = giorniDaPubblicare(tutte, adesso);
  const esitoOggi = await pubblicaGiorno(c, tutte, oggi, true);
  const giorniPassati: EsitoGiorno[] = [];
  for (const g of passati) giorniPassati.push(await pubblicaGiorno(c, tutte, g, false));
  return { ...esitoOggi, giorniPassati };
}

/** Fa partire l'aggiornamento dopo la risposta HTTP; fuori da una richiesta (per esempio nei test) parte subito senza attendere. */
export function aggiornaLiveDopoLaRisposta(): void {
  const lavoro = async () => {
    try {
      const esito = await aggiornaLiveGiornaliera(new Date(), { fresco: true });
      console.log(`[live-giornaliera] ${esito.stato}`);
    } catch (errore) {
      console.error('[live-giornaliera]', errore);
    }
  };
  try {
    after(lavoro);
  } catch {
    void lavoro();
  }
}
