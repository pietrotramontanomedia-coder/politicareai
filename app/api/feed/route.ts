import { load } from 'cheerio';
import { urlToSlug } from '@/lib/slug';

interface FeedArticle {
  id: string;
  slug: string;
  titolo: string;
  descrizione: string;
  immagine?: string;
  link: string;
  data?: string;
}

interface VoceSitemap {
  url: string;
  lastmod: string;
  immagine?: string;
}

async function leggiSitemap(): Promise<VoceSitemap[]> {
  const response = await fetch('https://www.politicare.it/post-sitemap.xml', {
    next: { revalidate: 3600 },
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PoliticareBot/1.0)' },
  });

  if (!response.ok) return [];

  const xml = await response.text();
  const $ = load(xml, { xmlMode: true });
  const voci: VoceSitemap[] = [];

  $('url').each((_, el) => {
    const url = $(el).find('loc').first().text().trim();
    const lastmod = $(el).find('lastmod').first().text().trim();
    const immagine = $(el).find('image\\:loc').first().text().trim() || undefined;

    if (url) {
      voci.push({ url, lastmod, immagine });
    }
  });

  return voci.sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());
}

function formattaData(iso: string): string {
  if (!iso) return '';
  const data = new Date(iso);
  const oggi = new Date();
  const giorni = Math.floor((oggi.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));

  if (giorni === 0) return 'Oggi';
  if (giorni === 1) return 'Ieri';
  if (giorni < 7) return `${giorni} giorni fa`;
  return data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function arricchisciArticolo(voce: VoceSitemap, id: string): Promise<FeedArticle | null> {
  try {
    const response = await fetch(voce.url, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PoliticareBot/1.0)' },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = load(html);

    const titolo =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('h1').first().text().trim();

    const descrizione =
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('p').first().text().trim();

    const immagine = $('meta[property="og:image"]').attr('content')?.trim() || voce.immagine;

    if (!titolo) return null;

    return {
      id,
      slug: urlToSlug(voce.url),
      titolo,
      descrizione: (descrizione || '').substring(0, 150),
      immagine,
      link: voce.url,
      data: formattaData(voce.lastmod),
    };
  } catch {
    return null;
  }
}

async function scrapaPoliticare(): Promise<FeedArticle[]> {
  const voci = await leggiSitemap();
  if (voci.length === 0) return [];

  const daArricchire = voci.slice(0, 24);

  const risultati = await Promise.all(
    daArricchire.map((voce, idx) => arricchisciArticolo(voce, `politicare-${idx}`)),
  );

  return risultati.filter((a): a is FeedArticle => a !== null);
}

export async function GET() {
  const articoli = await scrapaPoliticare();

  return Response.json({
    success: articoli.length > 0,
    articoli,
    timestamp: new Date().toISOString(),
  });
}
