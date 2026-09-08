import { load } from 'cheerio';

interface ArticoloCompleto {
  titolo: string;
  immagine?: string;
  data?: string;
  autore?: string;
  contenuto: string[];
  link: string;
}

function estraiContenuto($: ReturnType<typeof load>): string[] {
  const selettori = [
    'article .content',
    'article .entry-content',
    '.post-content',
    '.entry-content',
    'article',
    'main',
  ];

  for (const sel of selettori) {
    const el = $(sel).first();
    if (el.length === 0) continue;

    const paragrafi: string[] = [];
    el.find('p').each((_, p) => {
      const testo = $(p).text().trim();
      if (testo.length > 30) {
        paragrafi.push(testo);
      }
    });

    if (paragrafi.length > 0) {
      return paragrafi;
    }
  }

  return [];
}

async function scaricaArticolo(url: string): Promise<ArticoloCompleto | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PoliticareBot/1.0)',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = load(html);

    const titolo =
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      $('title').text().trim();

    const immagine = $('meta[property="og:image"]').attr('content');
    const data = $('time').first().attr('datetime') || $('time').first().text().trim();
    const autore = $('.author, .byline, [rel="author"]').first().text().trim();

    const contenuto = estraiContenuto($);

    if (!titolo || contenuto.length === 0) return null;

    return {
      titolo,
      immagine,
      data,
      autore: autore || undefined,
      contenuto,
      link: url,
    };
  } catch (error) {
    console.error('Errore scaricamento articolo:', error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !url.startsWith('https://www.politicare.it')) {
    return Response.json({ success: false, error: 'URL non valido' }, { status: 400 });
  }

  const articolo = await scaricaArticolo(url);

  if (!articolo) {
    return Response.json({ success: false, error: 'Impossibile leggere articolo' }, { status: 404 });
  }

  return Response.json({ success: true, articolo });
}
