import { after } from 'next/server';
import { componiPagina, giornoDi, MINIMO_NOTIZIE, notizieDelGiorno, riassunto, slugGiorno, titoloGiorno } from '@/lib/live-giornaliera';
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

export type EsitoLive =
  | { stato: 'non configurato' }
  | { stato: 'poche notizie'; giorno: string; notizie: number }
  | { stato: 'invariata' | 'aggiornata' | 'creata'; giorno: string; notizie: number; url: string };

/** Crea o aggiorna la pagina del giorno. Chiamarla più volte è innocuo: riscrive solo se qualcosa è cambiato. */
export async function aggiornaLiveGiornaliera(adesso: Date = new Date(), opzioni: { fresco?: boolean } = {}): Promise<EsitoLive> {
  const c = config();
  if (!c) return { stato: 'non configurato' };

  const g = giornoDi(adesso);
  const voci = notizieDelGiorno(await leggiUltimOra(opzioni), g);
  if (voci.length < MINIMO_NOTIZIE) return { stato: 'poche notizie', giorno: g.chiave, notizie: voci.length };

  const slug = slugGiorno(g);
  const url = `${c.base}/${slug}/`;
  const contenuto = componiPagina(voci, g, url);
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
    await wp(c, `posts/${esistente.id}`, { method: 'POST', body: JSON.stringify({ content: contenuto, excerpt: estratto }) });
    return { stato: 'aggiornata', giorno: g.chiave, notizie: voci.length, url: esistente.link };
  }

  const [categoria, immagine] = await Promise.all([idPerSlug(c, 'categories', 'live'), idPerSlug(c, 'media', 'politicare-live-copertina')]);
  const creato = await wp<{ link: string }>(c, 'posts', {
    method: 'POST',
    body: JSON.stringify({
      title: titoloGiorno(g),
      slug,
      status: 'publish',
      content: contenuto,
      excerpt: estratto,
      author: c.autore,
      ...(categoria ? { categories: [categoria] } : {}),
      ...(immagine ? { featured_media: immagine } : {}),
    }),
  });
  return { stato: 'creata', giorno: g.chiave, notizie: voci.length, url: creato.link };
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
