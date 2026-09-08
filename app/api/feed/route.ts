import { load } from 'cheerio';

interface FeedArticle {
  id: string;
  titolo: string;
  descrizione: string;
  immagine?: string;
  link: string;
  data?: string;
}

async function scrapaPoliticare(): Promise<FeedArticle[]> {
  try {
    const response = await fetch('https://www.politicare.it/', {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error('Fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = load(html);
    const articoli: FeedArticle[] = [];

    $('article, .post, .news-item, [role="article"]').each((idx, el) => {
      const titolo = $(el).find('h2, h3, .title').first().text().trim();
      const descrizione = $(el).find('p, .excerpt, .description').first().text().trim();
      const link = $(el).find('a').first().attr('href') || '';
      const immagine = $(el).find('img').first().attr('src');
      const data = $(el).find('time, .date, .published').first().text().trim();

      if (titolo && link) {
        articoli.push({
          id: `politicare-${idx}-${Date.now()}`,
          titolo,
          descrizione: descrizione.substring(0, 150),
          immagine,
          link: link.startsWith('http') ? link : `https://www.politicare.it${link}`,
          data,
        });
      }
    });

    return articoli.slice(0, 6);
  } catch (error) {
    console.error('Scraping error:', error);
    return [];
  }
}

export async function GET() {
  const articoli = await scrapaPoliticare();

  return Response.json({
    success: articoli.length > 0,
    articoli,
    timestamp: new Date().toISOString(),
  });
}
