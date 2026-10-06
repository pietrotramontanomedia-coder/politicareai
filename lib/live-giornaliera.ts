import type { NotiziaUltimOra } from '@/lib/ultimora-server';

/**
 * Pagina «Politica oggi» su politicare.it: una pagina al giorno con le notizie del canale
 * Telegram (e di Instagram), scritta dentro WordPress così Google la legge e la può mostrare
 * come diretta. Qui solo logica pura; le chiamate a WordPress stanno in live-giornaliera-server.
 */

export const FUSO = 'Europe/Rome';
/** Sotto questa soglia la pagina del giorno non esce: tre righe non sono una diretta. */
export const MINIMO_NOTIZIE = 3;

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export interface Giorno {
  /** AAAA-MM-GG nel fuso di Roma */
  chiave: string;
  giorno: number;
  mese: string;
  anno: number;
}

export function giornoDi(data: Date): Giorno {
  const parti = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(data);
  const valore = (tipo: string) => Number(parti.find((p) => p.type === tipo)?.value);
  const anno = valore('year');
  const mese = valore('month');
  const giorno = valore('day');
  return { chiave: `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`, giorno, mese: MESI[mese - 1], anno };
}

export function oraDi(data: Date): string {
  return new Intl.DateTimeFormat('it-IT', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(data);
}

export function slugGiorno(g: Giorno): string {
  return `politica-oggi-${g.giorno}-${g.mese}-${g.anno}`;
}

export function titoloGiorno(g: Giorno, oggi = true): string {
  return `Politica oggi, ${g.giorno} ${g.mese} ${g.anno}: ${oggi ? 'le notizie in diretta' : 'le notizie del giorno'}`;
}

/** Quanti giorni indietro si guardano per chiudere le pagine dei giorni passati. */
export const GIORNI_INDIETRO = 7;

/**
 * I giorni di cui scrivere (o riscrivere) la pagina: oggi più i giorni passati presenti nel feed.
 * Il giorno più vecchio del feed si salta, perché il feed ha un limite di voci e quel giorno
 * può essere tagliato a metà: riscriverlo toglierebbe notizie dalla pagina.
 */
export function giorniDaPubblicare(voci: NotiziaUltimOra[], adesso: Date): Giorno[] {
  const oggi = giornoDi(adesso);
  const limite = giornoDi(new Date(adesso.getTime() - GIORNI_INDIETRO * 86_400_000)).chiave;
  const chiavi = [...new Set(voci.map((v) => giornoDi(new Date(v.data)).chiave))].sort();
  const passati = chiavi.slice(1).filter((c) => c < oggi.chiave && c >= limite);
  return [oggi, ...passati.reverse().map((c) => giornoDi(new Date(`${c}T12:00:00Z`)))];
}

/** Le notizie di quel giorno (fuso di Roma), dalla più recente. */
export function notizieDelGiorno(voci: NotiziaUltimOra[], g: Giorno): NotiziaUltimOra[] {
  return voci
    .filter((v) => giornoDi(new Date(v.data)).chiave === g.chiave)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

function esc(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Telegram a volte lascia lettere vietnamite (Ạ, Ị…) al posto delle emoji personalizzate: in italiano non esistono. */
function ripulisci(testo: string): string {
  return testo.replace(/\s*[\u1EA0-\u1EF9]+\s*/g, ' ').trim();
}

function paragrafo(html: string): string {
  return `<!-- wp:paragraph -->\n<p>${html}</p>\n<!-- /wp:paragraph -->`;
}

/** Dati strutturati LiveBlogPosting: dicono a Google che è una diretta e quali sono gli aggiornamenti. */
export function datiStrutturati(voci: NotiziaUltimOra[], g: Giorno, url: string): string {
  const ordinate = [...voci].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  const dati = {
    '@context': 'https://schema.org',
    '@type': 'LiveBlogPosting',
    headline: titoloGiorno(g),
    url,
    datePublished: ordinate[0]?.data,
    dateModified: ordinate[ordinate.length - 1]?.data,
    coverageStartTime: `${g.chiave}T00:00:00${offsetRoma(g)}`,
    coverageEndTime: `${g.chiave}T23:59:59${offsetRoma(g)}`,
    publisher: { '@type': 'Organization', name: 'Politicare', url: 'https://www.politicare.it/' },
    author: { '@type': 'Organization', name: 'Redazione di Politicare', url: 'https://www.politicare.it/redazione-ragazzi/' },
    liveBlogUpdate: [...voci].map((v) => ({
      '@type': 'BlogPosting',
      headline: v.titolo,
      datePublished: v.data,
      articleBody: [v.titolo, v.testo].filter(Boolean).join('. '),
      url: `${url}#${ancora(v)}`,
    })),
  };
  // `<` codificato: il JSON sta dentro un tag <script> e non deve poterlo chiudere.
  const json = JSON.stringify(dati).replace(/</g, '\\u003c');
  return `<!-- wp:html -->\n<script type="application/ld+json">${json}</script>\n<!-- /wp:html -->`;
}

/** Fuso di Roma in quel giorno (+01:00 d'inverno, +02:00 d'estate). */
function offsetRoma(g: Giorno): string {
  const mezzogiorno = new Date(`${g.chiave}T12:00:00Z`);
  const ora = Number(new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', hourCycle: 'h23' }).format(mezzogiorno));
  const differenza = ora - 12;
  return `${differenza >= 0 ? '+' : '-'}${String(Math.abs(differenza)).padStart(2, '0')}:00`;
}

function ancora(v: NotiziaUltimOra): string {
  return `notizia-${v.id.replace(/[^a-zA-Z0-9-]/g, '')}`;
}

/** Il contenuto della pagina, in blocchi Gutenberg. Sono notizie della redazione: nessuna «fonte» da citare. */
export function componiPagina(voci: NotiziaUltimOra[], g: Giorno, url: string, oggi = true): string {
  const ultima = voci[0];
  const apertura = oggi
    ? `<strong>Aggiornato alle ${oraDi(new Date(ultima.data))}.</strong> Le notizie di politica di oggi, ${g.giorno} ${g.mese} ${g.anno}, scritte dalla redazione di Politicare. La più recente è in alto. Gli aggiornamenti in tempo reale sono nella pagina <a href="https://www.politicare.it/live/">Live</a>.`
    : `Le notizie di politica del ${g.giorno} ${g.mese} ${g.anno}, scritte dalla redazione di Politicare. La più recente è in alto. Gli aggiornamenti in tempo reale sono nella pagina <a href="https://www.politicare.it/live/">Live</a>.`;
  const blocchi = [paragrafo(apertura)];
  for (const v of voci) {
    blocchi.push(
      `<!-- wp:heading {"anchor":"${ancora(v)}"} -->\n<h2 class="wp-block-heading" id="${ancora(v)}">${oraDi(new Date(v.data))} · ${esc(v.titolo)}</h2>\n<!-- /wp:heading -->`,
    );
    if (v.testo) blocchi.push(paragrafo(esc(ripulisci(v.testo)).replace(/\n+/g, '<br>')));
  }
  blocchi.push(
    paragrafo(
      `Le notizie degli altri giorni sono nell'archivio <a href="https://www.politicare.it/category/live/">Politica oggi</a>. ` +
        `Guide e approfondimenti sul voto sono nella pagina <a href="https://www.politicare.it/elezioni-2027/">Elezioni 2027</a>.`,
    ),
  );
  blocchi.push(datiStrutturati(voci, g, url));
  return blocchi.join('\n\n');
}

/** Riassunto per Google e per le anteprime: i primi titoli del giorno. */
export function riassunto(voci: NotiziaUltimOra[], g: Giorno): string {
  const titoli = voci.slice(0, 3).map((v) => v.titolo.replace(/[.…]+$/, ''));
  const testo = `Le notizie di politica del ${g.giorno} ${g.mese}: ${titoli.join('; ')}.`;
  return testo.length > 300 ? `${testo.slice(0, 297).replace(/\s+\S*$/, '')}…` : testo;
}
