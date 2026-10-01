/**
 * Radar dei trend su X: logica pura, senza rete.
 *
 * Ogni giro legge le tendenze italiane di X e le confronta con i giri precedenti.
 * Un tema è un segnale quando entra in classifica, sale di posizione o cresce di volume;
 * i segnali migliori passano a Claude, che decide se Politicare ha qualcosa da dire
 * e prepara le bozze. Il post lo pubblica sempre una persona.
 */

export interface Tendenza {
  nome: string;
  /** Post sul tema secondo X; non sempre presente. */
  volume: number | null;
}

export interface Rilevazione {
  quando: string;
  /** In ordine di classifica: la prima è la più forte. */
  tendenze: Tendenza[];
}

export interface Segnale {
  nome: string;
  chiave: string;
  posizione: number;
  posizionePrima: number | null;
  volume: number | null;
  volumePrima: number | null;
  /** Più alto = più interessante. */
  forza: number;
  motivo: string;
}

export interface Valutazione {
  pertinente: boolean;
  motivo: string;
  tema: string;
  /** Lo strumento di Politicare a cui agganciare il post, se c'è. */
  gancio: string | null;
  bozze: string[];
  /** Fatti da verificare prima di pubblicare. */
  verifiche: string[];
}

export interface Avviso {
  chiave: string;
  nome: string;
  quando: string;
  inviato: boolean;
  forza: number;
  motivo: string;
  accelerazione: number | null;
  valutazione: Valutazione;
}

export type Modalita = 'spento' | 'registra' | 'avvisa';

export interface OpzioniRadar {
  modalita: Modalita;
  /** Quanti temi al massimo passano a Claude a ogni giro (ognuno costa letture su X). */
  valutazioni: number;
  /** Ore prima di riproporre lo stesso tema. */
  riposoOre: number;
  /** Rapporto minimo fra l'ultima ora e la media delle tre precedenti. */
  accelerazioneMinima: number;
  /** Post letti su X per capire di cosa si parla; 0 = nessuno (Claude vede solo il nome del tema). */
  campione: number;
  /** Fino a che posizione della classifica un tema conta. */
  classifica: number;
  /** Tetto di temi valutati al giorno (ora italiana): il freno sulla spesa. */
  massimoGiorno: number;
  /** Ore italiane in cui il radar lavora, [inizio, fine): fuori non legge nemmeno le tendenze. */
  orario: [number, number];
  /** Minuti minimi fra un giro e l'altro: un job chiamato troppo spesso non spende di più. */
  intervalloMinuti: number;
}

/** Temi che non sono mai politica o attualità: si scartano senza spendere una chiamata. */
const FUORI_TEMA = [
  /^#?(buongiorno|buonanotte|buonasera|buondomenica|buonweekend|felicegiornata)/,
  /^#?(lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica)$/,
  /^#?(seriea|serieb|championsleague|europaleague|conferenceleague|fantacalcio|motogp|f1|formula1)$/,
  /^#?(juve|juventus|inter|milan|napoli|roma|lazio|atalanta|fiorentina|torino|bologna)$/,
  /^#?(grandefratello|gfvip|uominiedonne|xfactor|amici\d*|ballandoconlestelle|temptationisland)$/,
];

export function chiaveTema(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function fuoriTema(nome: string): boolean {
  const chiave = chiaveTema(nome);
  return chiave.length < 3 || FUORI_TEMA.some((regola) => regola.test(chiave));
}

function intero(valore: string | undefined, predefinito: number, minimo = 0): number {
  const n = Number.parseInt(valore ?? '', 10);
  return Number.isFinite(n) && n >= minimo ? n : predefinito;
}

function decimale(valore: string | undefined, predefinito: number): number {
  const n = Number.parseFloat((valore ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : predefinito;
}

export function opzioniRadar(env: Record<string, string | undefined>): OpzioniRadar {
  const modalita = env.RADAR_MODALITA === 'avvisa' || env.RADAR_MODALITA === 'registra' ? env.RADAR_MODALITA : 'spento';
  return {
    modalita,
    valutazioni: intero(env.RADAR_VALUTAZIONI, 1),
    riposoOre: intero(env.RADAR_RIPOSO_ORE, 12),
    accelerazioneMinima: decimale(env.RADAR_ACCELERAZIONE, 1.5),
    campione: campione(env.RADAR_CAMPIONE),
    classifica: intero(env.RADAR_CLASSIFICA, 30, 5),
    massimoGiorno: intero(env.RADAR_MASSIMO_GIORNO, 3),
    orario: orario(env.RADAR_ORARIO),
    intervalloMinuti: intero(env.RADAR_INTERVALLO_MINUTI, 55),
  };
}

/** X restituisce da 10 a 100 post per ricerca: sotto 10 si salta la ricerca. */
function campione(valore: string | undefined): number {
  const n = intero(valore, 10);
  return n === 0 ? 0 : Math.min(Math.max(n, 10), 100);
}

/** «10-22» → dalle 10 alle 22, ultimo giro alle 21 (il predefinito); «0-24» → tutto il giorno; non valido → predefinito. */
function orario(valore: string | undefined): [number, number] {
  const m = (valore ?? '').match(/^\s*(\d{1,2})\s*-\s*(\d{1,2})\s*$/);
  if (!m) return [10, 22];
  const inizio = Number(m[1]);
  const fine = Number(m[2]);
  return inizio < fine && fine <= 24 ? [inizio, fine] : [10, 22];
}

/** Vero se l'ultimo giro è più recente dell'intervallo minimo. */
export function troppoPresto(rilevazioni: Pick<Rilevazione, 'quando'>[], minuti: number, adesso: Date): boolean {
  const ultima = Math.max(0, ...rilevazioni.map((r) => Date.parse(r.quando)).filter((t) => !Number.isNaN(t)));
  return ultima > 0 && adesso.getTime() - ultima < minuti * 60_000;
}

function oraItaliana(adesso: Date): number {
  return Number(new Intl.DateTimeFormat('it-IT', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Rome' }).format(adesso));
}

function giornoItaliano(data: Date): string {
  return data.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
}

export function inOrario(fascia: [number, number], adesso: Date): boolean {
  const ora = oraItaliana(adesso);
  return ora >= fascia[0] && ora < fascia[1];
}

/** Quanti temi si possono ancora valutare oggi, contando quelli già valutati da mezzanotte. */
export function valutazioniRimaste(avvisi: Pick<Avviso, 'quando'>[], massimo: number, adesso: Date): number {
  const oggi = giornoItaliano(adesso);
  const fatte = avvisi.filter((a) => giornoItaliano(new Date(a.quando)) === oggi).length;
  return Math.max(massimo - fatte, 0);
}

/**
 * Il giro più vicino a `ore` fa (almeno 20 minuti prima, al massimo 3 ore), per misurare la salita.
 * Dopo una pausa (la notte) non c'è confronto: il primo giro registra soltanto.
 */
function rilevazionePrecedente(storico: Rilevazione[], adesso: Date, ore: number): Rilevazione | null {
  const obiettivo = adesso.getTime() - ore * 3_600_000;
  const limite = adesso.getTime() - 20 * 60_000;
  const troppoVecchio = adesso.getTime() - 3 * 3_600_000;
  let migliore: Rilevazione | null = null;
  let distanza = Infinity;
  for (const r of storico) {
    const t = Date.parse(r.quando);
    if (Number.isNaN(t) || t > limite || t < troppoVecchio) continue;
    const d = Math.abs(t - obiettivo);
    if (d < distanza) {
      migliore = r;
      distanza = d;
    }
  }
  return migliore;
}

/**
 * Confronta la classifica di adesso con quella di circa un'ora fa.
 * Senza storico non c'è salita da misurare: il primo giro serve solo a registrare.
 */
export function trovaSegnali(storico: Rilevazione[], attuale: Rilevazione, classifica = 30): Segnale[] {
  const prima = rilevazionePrecedente(storico, new Date(attuale.quando), 1);
  if (!prima) return [];

  const posizioniPrima = new Map<string, { posizione: number; volume: number | null }>();
  prima.tendenze.forEach((t, i) => {
    const chiave = chiaveTema(t.nome);
    if (!posizioniPrima.has(chiave)) posizioniPrima.set(chiave, { posizione: i + 1, volume: t.volume });
  });

  const segnali: Segnale[] = [];
  const visti = new Set<string>();
  attuale.tendenze.slice(0, classifica).forEach((t, i) => {
    const chiave = chiaveTema(t.nome);
    if (visti.has(chiave) || fuoriTema(t.nome)) return;
    visti.add(chiave);

    const posizione = i + 1;
    const precedente = posizioniPrima.get(chiave);
    // Peso della posizione attuale: in cima alla classifica conta di più.
    const peso = (classifica + 1 - posizione) / classifica;
    let forza = 0;
    let motivo = '';

    if (!precedente) {
      forza = 2 + 3 * peso;
      motivo = `nuovo in classifica, ${posizione}° posto`;
    } else {
      const salita = precedente.posizione - posizione;
      const crescita =
        t.volume && precedente.volume && precedente.volume > 0 ? t.volume / precedente.volume : null;
      if (salita >= 3) {
        forza = Math.min(salita, 15) / 5 + 2 * peso;
        motivo = `da ${precedente.posizione}° a ${posizione}° posto`;
      }
      if (crescita !== null && crescita >= 1.5) {
        forza = Math.max(forza, Math.min(crescita, 6) + peso);
        motivo = motivo ? `${motivo}, volume ×${crescita.toFixed(1)}` : `volume ×${crescita.toFixed(1)}`;
      }
      if (!motivo) return;
    }

    segnali.push({
      nome: t.nome,
      chiave,
      posizione,
      posizionePrima: precedente?.posizione ?? null,
      volume: t.volume,
      volumePrima: precedente?.volume ?? null,
      forza: Math.round(forza * 100) / 100,
      motivo,
    });
  });

  return segnali.sort((a, b) => b.forza - a.forza);
}

/** I segnali più forti, tolti i temi già proposti nelle ultime ore. */
export function segnaliDaValutare(
  segnali: Segnale[],
  avvisi: Pick<Avviso, 'chiave' | 'quando'>[],
  opzioni: Pick<OpzioniRadar, 'valutazioni' | 'riposoOre'>,
  adesso: Date,
): Segnale[] {
  const limite = adesso.getTime() - opzioni.riposoOre * 3_600_000;
  const recenti = new Set(avvisi.filter((a) => Date.parse(a.quando) >= limite).map((a) => a.chiave));
  return segnali.filter((s) => !recenti.has(s.chiave)).slice(0, opzioni.valutazioni);
}

/**
 * Accelerazione: post dell'ultima ora completa rispetto alla media delle tre ore prima.
 * `orari` è in ordine cronologico, l'ultima voce è l'ora in corso (incompleta, si ignora).
 */
export function accelerazione(orari: number[]): number | null {
  const complete = orari.slice(0, -1);
  if (complete.length < 4) return null;
  const ultima = complete[complete.length - 1];
  const prima = complete.slice(-4, -1);
  const media = prima.reduce((s, n) => s + n, 0) / prima.length;
  if (media <= 0) return ultima > 0 ? Infinity : null;
  return Math.round((ultima / media) * 100) / 100;
}

/** Ricerca su X per un tema di tendenza: italiano, niente retweet. */
export function querySuX(nome: string): string {
  const pulito = nome.replace(/"/g, '').trim();
  const termine = pulito.startsWith('#') || !/\s/.test(pulito) ? pulito : `"${pulito}"`;
  return `${termine} lang:it -is:retweet`;
}

/** Conserva solo le ultime `ore` di rilevazioni e gli avvisi degli ultimi `giorni`. */
export function pota<T extends { quando: string }>(voci: T[], ore: number, adesso: Date): T[] {
  const limite = adesso.getTime() - ore * 3_600_000;
  return voci.filter((v) => Date.parse(v.quando) >= limite);
}

function escapeHtml(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Il link che apre X con il post già scritto: lo pubblica la persona, con un tocco. */
export function linkScrivi(testo: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(testo)}`;
}

/** Messaggio Telegram (HTML) con il tema, il perché, le bozze e cosa verificare. */
export function componiAvviso(segnale: Segnale, valutazione: Valutazione, accel: number | null): string {
  const righe = [
    `📈 <b>${escapeHtml(segnale.nome)}</b> sta salendo su X`,
    `${escapeHtml(segnale.motivo)}${segnale.volume ? ` · ${segnale.volume.toLocaleString('it-IT')} post` : ''}${
      accel !== null && Number.isFinite(accel) ? ` · ultima ora ×${accel.toLocaleString('it-IT')}` : ''
    }`,
    '',
    `<b>Di cosa si parla:</b> ${escapeHtml(valutazione.tema)}`,
    `<b>Perché per noi:</b> ${escapeHtml(valutazione.motivo)}`,
  ];
  if (valutazione.gancio) righe.push(`<b>Aggancio:</b> ${escapeHtml(valutazione.gancio)}`);
  valutazione.bozze.forEach((bozza, i) => {
    righe.push('', `<b>Bozza ${i + 1}</b>`, escapeHtml(bozza), `<a href="${escapeHtml(linkScrivi(bozza))}">✍️ Apri su X</a>`);
  });
  if (valutazione.verifiche.length) {
    righe.push('', '<b>Prima di pubblicare verifica:</b>', ...valutazione.verifiche.map((v) => `• ${escapeHtml(v)}`));
  }
  return righe.join('\n');
}
