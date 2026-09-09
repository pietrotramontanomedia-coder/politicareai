import { load } from 'cheerio';

interface BloccoContenuto {
  tipo: 'titolo' | 'paragrafo' | 'lista';
  testo: string;
  voci?: string[];
}

export interface SocialAutore {
  tipo: 'email' | 'sito' | 'instagram' | 'x' | 'linkedin' | 'facebook' | 'link';
  url: string;
  etichetta: string;
}

export interface Autore {
  nome: string;
  bio?: string;
  avatar?: string;
  social: SocialAutore[];
}

interface ArticoloCompleto {
  titolo: string;
  immagine?: string;
  data?: string;
  autore?: Autore;
  contenuto: BloccoContenuto[];
  link: string;
}

const SELETTORE_BOX_AUTORE = '.elementor-widget-cmsmasters-author-box__wrapper';

function normalizzaSocial(href: string, etichettaGrezza: string): SocialAutore | null {
  const h = href.trim();
  if (!h) return null;

  if (h.startsWith('mailto:')) {
    return { tipo: 'email', url: h, etichetta: 'Email' };
  }

  let url: URL;
  try {
    url = new URL(h.startsWith('http') ? h : `https://${h}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  // Alcuni autori inseriscono un handle Instagram al posto di un URL
  if (!host.includes('.')) {
    const handle = host.replace(/^@/, '');
    return { tipo: 'instagram', url: `https://www.instagram.com/${handle}/`, etichetta: `@${handle}` };
  }

  if (host === 'instagram.com') {
    const handle = url.pathname.split('/').filter(Boolean)[0];
    return { tipo: 'instagram', url: url.href, etichetta: handle ? `@${handle}` : 'Instagram' };
  }
  if (host === 'x.com' || host === 'twitter.com') return { tipo: 'x', url: url.href, etichetta: 'X' };
  if (host === 'linkedin.com') return { tipo: 'linkedin', url: url.href, etichetta: 'LinkedIn' };
  if (host === 'facebook.com') return { tipo: 'facebook', url: url.href, etichetta: 'Facebook' };
  if (/website|sito/i.test(etichettaGrezza)) return { tipo: 'sito', url: url.href, etichetta: host };

  return { tipo: 'link', url: url.href, etichetta: host };
}

function estraiAutore($: ReturnType<typeof load>): Autore | undefined {
  const box = $(SELETTORE_BOX_AUTORE).first();
  const nome =
    box.find('.elementor-widget-cmsmasters-author-box__name').text().trim() ||
    $('meta[name="author"]').attr('content')?.trim() ||
    $('.author, .byline, [rel="author"]').first().text().trim();

  if (!nome) return undefined;

  const bio = box.find('.elementor-widget-cmsmasters-author-box__bio').text().trim() || undefined;

  // Gravatar con d=404 invece del segnaposto: così il client sa quando mostrare le iniziali
  const avatar = box
    .find('.elementor-widget-cmsmasters-author-box__avatar img')
    .attr('src')
    ?.replace(/([?&])d=[^&]*/, '$1d=404')
    .replace(/([?&])s=\d+/, '$1s=160');

  const social: SocialAutore[] = [];
  box.find('.elementor-widget-cmsmasters-author-box__social-list a').each((_, a) => {
    const voce = normalizzaSocial($(a).attr('href') ?? '', $(a).attr('aria-label') ?? '');
    if (voce && !social.some((s) => s.url === voce.url)) social.push(voce);
  });

  return { nome, bio, avatar, social };
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
      if (testo.length === 0) return;

      // Molti editor (WordPress/Elementor) non usano <h2/h3> per i sottotitoli
      // ma un <p> il cui unico contenuto è un <strong>/<b>: lo trattiamo come titolo.
      const forti = $node.children('strong, b');
      const soloTestoForte = forti.length > 0 && forti.text().trim() === testo;
      if (soloTestoForte && testo.length < 100 && !/[.!?]$/.test(testo)) {
        blocchi.push({ tipo: 'titolo', testo });
        return;
      }

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
    const autore = estraiAutore($);

    const contenuto = estraiContenuto($);

    if (!titolo || contenuto.length === 0) return null;

    return {
      titolo,
      immagine,
      data,
      autore,
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
