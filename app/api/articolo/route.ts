import { load } from 'cheerio';

interface BloccoContenuto {
  tipo: 'titolo' | 'paragrafo' | 'lista';
  testo: string;
  voci?: string[];
}

interface ArticoloCompleto {
  titolo: string;
  immagine?: string;
  data?: string;
  autore?: string;
  contenuto: BloccoContenuto[];
  link: string;
}

function estraiContenuto($: ReturnType<typeof load>): BloccoContenuto[] {
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

    const blocchi: BloccoContenuto[] = [];

    el.find('h2, h3, h4, p, ul, ol').each((_, node) => {
      const tag = (node as { tagName?: string }).tagName?.toLowerCase();
      const $node = $(node);

      // Salta elementi annidati dentro elementi già catturati (es. p dentro li)
      if ($node.parents('li').length > 0) return;

      if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
        const testo = $node.text().trim();
        if (testo.length > 2 && testo.length < 150) {
          blocchi.push({ tipo: 'titolo', testo });
        }
        return;
      }

      if (tag === 'ul' || tag === 'ol') {
        const voci = $node
          .find('li')
          .map((_, li) => $(li).text().trim())
          .get()
          .filter((v) => v.length > 0);
        if (voci.length > 0) {
          blocchi.push({ tipo: 'lista', testo: '', voci });
        }
        return;
      }

      const testo = $node.text().trim();
      if (testo.length > 30) {
        blocchi.push({ tipo: 'paragrafo', testo });
      }
    });

    const numParagrafi = blocchi.filter((b) => b.tipo === 'paragrafo').length;
    if (numParagrafi > 0) {
      return blocchi;
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
