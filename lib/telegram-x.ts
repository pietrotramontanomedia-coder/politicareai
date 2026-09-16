/**
 * Ponte Telegram → X: logica pura, senza rete.
 * Il canale Telegram è la fonte; ogni post nuovo diventa un post su X.
 */

/** Limite di un post su X per un account senza abbonamento Premium. */
export const LIMITE_X = 280;
/** X accorcia ogni link con t.co: conta sempre 23 caratteri. */
const PESO_URL = 23;
const FIRMA_TELEGRAM = /\s*@politicare\s*$/i;
const URL = /https?:\/\/\S+|(?<![\w@])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?/gi;

export interface PostCanale {
  numero: number;
  canale: string;
  testo: string;
  /** file_id della foto più grande, se il post ne ha una. */
  foto?: string;
  gruppoMedia?: string;
}

interface AggiornamentoTelegram {
  channel_post?: {
    message_id?: number;
    chat?: { id?: number; type?: string; username?: string };
    text?: string;
    caption?: string;
    photo?: { file_id: string; width?: number }[];
    media_group_id?: string;
  };
}

/** Riconosce un post nuovo di un canale; ignora modifiche, messaggi privati e gruppi. */
export function estraiPostCanale(aggiornamento: unknown): PostCanale | null {
  const post = (aggiornamento as AggiornamentoTelegram | null)?.channel_post;
  if (!post || post.chat?.type !== 'channel' || typeof post.message_id !== 'number') return null;
  const foto = post.photo?.reduce((max, f) => ((f.width ?? 0) > (max.width ?? 0) ? f : max));
  return {
    numero: post.message_id,
    canale: post.chat.username ?? String(post.chat.id),
    testo: post.text ?? post.caption ?? '',
    foto: foto?.file_id,
    gruppoMedia: post.media_group_id,
  };
}

function pesoCarattere(codice: number): number {
  const leggero =
    codice <= 4351 ||
    (codice >= 8192 && codice <= 8205) ||
    (codice >= 8208 && codice <= 8223) ||
    (codice >= 8242 && codice <= 8247);
  return leggero ? 1 : 2;
}

/** Lunghezza come la conta X: link a 23, emoji e alfabeti non latini a 2. */
export function lunghezzaX(testo: string): number {
  let totale = 0;
  const senzaLink = testo.replace(URL, () => {
    totale += PESO_URL;
    return '';
  });
  for (const carattere of senzaLink) totale += pesoCarattere(carattere.codePointAt(0) ?? 0);
  return totale;
}

export function contieneLink(testo: string): boolean {
  return new RegExp(URL.source, 'i').test(testo);
}

const EMOJI_INIZIALI = /^(?:(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}\uFE0F?)(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+/u;

function pulisciPerX(grezzo: string): string {
  return grezzo
    .replace(FIRMA_TELEGRAM, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\bFdl\b/g, 'FdI') // refuso frequente nel canale: «l» minuscola al posto della «I»
    .replace(EMOJI_INIZIALI, (emoji) => `${emoji} `)
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Tiene solo le frasi intere che entrano nel budget; se nemmeno la prima entra, taglia a parola con «…». */
function troncaPerPeso(testo: string, budget: number): string {
  if (lunghezzaX(testo) <= budget) return testo;
  const frasi = testo.match(/[^.!?\n]+(?:[.!?]+["»”)]?|\n+|$)/g) ?? [testo];
  let accumulato = '';
  for (const frase of frasi) {
    const candidato = accumulato + frase;
    if (lunghezzaX(candidato.trim()) > budget) break;
    accumulato = candidato;
  }
  const intere = accumulato.trim();
  if (intere) return intere;

  let peso = 0;
  let taglio = 0;
  for (const carattere of testo) {
    peso += pesoCarattere(carattere.codePointAt(0) ?? 0);
    if (peso > budget - 2) break; // «…» pesa 2
    taglio += carattere.length;
  }
  const spazio = testo.lastIndexOf(' ', taglio);
  return testo.slice(0, spazio > taglio / 2 ? spazio : taglio).replace(/[,;:\s]+$/, '') + '…';
}

/** Parole con l'iniziale maiuscola che non sono nomi propri: mai hashtag. */
const NON_HASHTAG = new Set(
  `il lo la i gli le un uno una di del dello della dei degli delle da dal dallo dalla dai dagli dalle in nel nello nella nei negli nelle con col coi su sul sullo sulla sui sugli sulle per tra fra a al allo alla ai agli alle e ed o od ma però anche non che chi cui come dove quando quanto se sì no
  questo questa questi queste quello quella quelli quelle qui qua là lì ora oggi ieri domani poi prima dopo intanto ancora già mai sempre solo tutto tutti tutta tutte altro altri altra altre ogni
  sono è era erano sarà saranno stato stata stati state ha hanno aveva avevano avrà fa fanno faceva farà può possono deve devono va vanno viene vengono resta restano
  secondo intanto inoltre infatti invece mentre perché quindi dunque così ecco lunedì martedì mercoledì giovedì venerdì sabato domenica
  uno due tre quattro cinque sei sette otto nove dieci undici dodici venti trenta cento mille
  ultim ultimora breaking flash notizia governo opposizione maggioranza elezioni voto voti legge decreto
  ministro ministra ministero ministri presidente presidenza premier vicepremier senatore senatrice senatori deputato deputata deputati
  sindaco sindaca governatore leader segretario segretaria capogruppo capodelegazione commissario commissaria portavoce
  sondaggio sondaggi indiscrezione esclusiva intervista dichiarazione nota comunicato giustizia interni esteri economia difesa
  fatto quotidiano corriere sera repubblica stampa messaggero giornale foglio sole ore ansa agi adnkronos tg1 tg2 tg3 tgcom24 skytg24 rai mediaset la7`
    .split(/\s+/)
    .filter(Boolean),
);

/** Cognomi, partiti e istituzioni che, se presenti, vincono sugli altri candidati. */
const PRIORITA = new Set(
  `meloni schlein salvini conte tajani renzi calenda bonelli fratoianni magi mattarella lollobrigida crosetto giorgetti nordio piantedosi
  santanchè valditara bernini urso schillaci fitto abodi casellati roccella zangrillo musumeci ciriani calderone locatelli
  fontana larussa russa donzelli bignami foti gasparri craxi ronzulli boccia braga malpezzi orlando bonaccini decaro
  zaia fedriga emiliano occhiuto fontana toti bucci vannacci moratti salis todde sala gualtieri lepore manfredi
  trump vance rubio musk putin zelensky macron merz starmer sánchez sanchez orbán orban milei netanyahu erdogan xi modi lula
  vonderleyen leyen costa kallas metsola draghi lagarde
  pd fdi m5s lega azione avs iv fi ue nato onu camera senato quirinale consulta colle chigi bce fmi ocse`
    .split(/\s+/)
    .filter(Boolean),
);

/** Nomi composti che diventano un hashtag unico, nella forma usata su X. */
const COMPOSTI: [RegExp, string][] = [
  [/\bRegno Unito\b/, 'RegnoUnito'],
  [/\bStati Uniti\b/, 'StatiUniti'],
  [/\bUnione [Ee]uropea\b/, 'UE'],
  [/\bParlamento [Ee]uropeo\b/, 'ParlamentoEuropeo'],
  [/\bCommissione [Ee]uropea\b/, 'CommissioneEuropea'],
  [/\bConsiglio dei [Mm]inistri\b/, 'CdM'],
  [/\bCorte dei [Cc]onti\b/, 'CorteDeiConti'],
  [/\bCorte [Cc]ostituzionale\b/, 'Consulta'],
  [/\bPalazzo Chigi\b/, 'PalazzoChigi'],
  [/\bPartito Democratico\b/, 'PD'],
  [/\bFratelli d['’]Italia\b/, 'FdI'],
  [/\bForza Italia\b/, 'ForzaItalia'],
  [/\bMovimento 5 Stelle\b/, 'M5S'],
  [/\bAlleanza Verdi e Sinistra\b/, 'AVS'],
  [/\b[Vv]on [Dd]er Leyen\b/, 'VonDerLeyen'],
  [/\bGran Bretagna\b/, 'GranBretagna'],
];

/**
 * Trasforma in hashtag le parole più rilevanti del testo: nomi propri (persone, luoghi,
 * partiti, istituzioni) scelti per frequenza e posizione. Al massimo `massimo` hashtag,
 * ciascuno sulla prima occorrenza. Non tocca parole già hashtag, dopo un apostrofo o con trattino.
 * Di norma uno solo: su X più di uno o due hashtag riducono la portata.
 */
export function aggiungiHashtag(testo: string, massimo = 1): string {
  if (massimo <= 0) return testo;
  const risultato = testo;

  interface Candidato {
    parola: string; // com'è nel testo
    tag: string; // com'è nell'hashtag
    prima: number;
    punteggio: number;
  }
  const candidati: Candidato[] = [];

  // Nomi composti (istituzioni, partiti): un hashtag unico nella forma usata su X.
  for (const [composto, tag] of COMPOSTI) {
    const m = risultato.match(composto);
    if (!m || m.index === undefined || risultato[m.index - 1] === '#') continue;
    candidati.push({ parola: m[0], tag, prima: m.index, punteggio: 6 });
  }

  const parola = /(?<![\p{L}\p{N}#'’@_-])(\p{Lu}[\p{L}\p{N}]{2,})(?![\p{L}\p{N}'’-])/gu;
  const nomi = new Map<string, { conteggio: number; prima: number; inRun: boolean; soloInizio: boolean }>();
  let m: RegExpExecArray | null;
  while ((m = parola.exec(risultato))) {
    const nome = m[1];
    if (NON_HASHTAG.has(nome.toLowerCase()) || /^\p{Lu}+$/u.test(nome) && nome.length < 3) continue;
    if (COMPOSTI.some(([composto]) => new RegExp(composto.source + '$').test(risultato.slice(0, m!.index + nome.length)))) continue;
    const precedente = risultato.slice(0, m.index).match(/(\p{Lu}[\p{L}\p{N}]*) $/u);
    const inRun = Boolean(precedente && !NON_HASHTAG.has(precedente[1].toLowerCase()));
    // A inizio frase la maiuscola non dice nulla: la parola conta solo se ricorre altrove (il primo termine del post fa eccezione).
    const inizioFrase = m.index > 0 && /[.!?]\s*$|\n\s*$/.test(risultato.slice(0, m.index));
    const voce = nomi.get(nome) ?? { conteggio: 0, prima: m.index, inRun, soloInizio: true };
    voce.conteggio++;
    if (!inizioFrase) voce.soloInizio = false;
    nomi.set(nome, voce);
  }
  for (const [nome, voce] of nomi) if (voce.soloInizio && voce.conteggio < 2) nomi.delete(nome);
  // In una coppia «Nome Cognome» l'hashtag va sul cognome: la prima parola della coppia esce.
  for (const [nome, voce] of nomi) {
    const seguito = new RegExp(`(?<![\\p{L}\\p{N}#])${nome} \\p{Lu}[\\p{L}\\p{N}]{2,}`, 'u').exec(risultato);
    if (seguito && !voce.inRun) nomi.delete(nome);
  }
  // Vince il cognome di un «Nome Cognome» o un nome noto della politica; chi ricorre guadagna qualcosa; a parità vince chi viene prima.
  for (const [nome, voce] of nomi) {
    candidati.push({ parola: nome, tag: nome, prima: voce.prima, punteggio: (voce.conteggio - 1) * 2 + (voce.inRun ? 8 : 0) + (PRIORITA.has(nome.toLowerCase()) ? 8 : 0) });
  }

  const scelti = candidati.sort((a, b) => b.punteggio - a.punteggio || a.prima - b.prima).slice(0, massimo);
  let finale = risultato;
  for (const { parola, tag } of scelti) {
    const testoParola = parola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    finale = finale.replace(new RegExp(`(?<![\\p{L}\\p{N}#'’@_-])${testoParola}(?![\\p{L}\\p{N}'’-])`, 'u'), `#${tag}`);
  }
  return finale;
}

export type PoliticaLink = 'mai' | 'se-troncato' | 'sempre';
export type StileTitolo = 'normale' | 'maiuscolo' | 'nessuno';

export interface OpzioniTweet {
  /** Link alla notizia sul sito, aggiunto secondo `politicaLink`. */
  link?: string;
  politicaLink?: PoliticaLink;
  /** La prima frase diventa un titolo su una riga a sé (stile agenzia). */
  titolo?: StileTitolo;
  /** Riga di chiusura, es. `#Politicare`; vuota per nessuna. */
  firma?: string;
  /** Quante parole rilevanti trasformare in hashtag nel testo (0 = nessuna). */
  hashtag?: number;
  limite?: number;
}

/** Oltre questa lunghezza la prima frase non è un titolo: il post resta un paragrafo unico. */
const MAX_TITOLO = 120;

function separaTitolo(testo: string, stile: StileTitolo): { testa: string; corpo: string } {
  if (stile === 'nessuno') return { testa: '', corpo: testo };
  const [prima = '', ...altre] = testo.split('\n');
  const frase = prima.match(/^(.{20,}?[.!?:])(?:\s+(.*))?$/s);
  if (!frase) return { testa: '', corpo: testo };
  const titolo = frase[1].replace(/[.:]$/, '');
  const corpo = [frase[2] ?? '', ...altre].filter(Boolean).join('\n');
  if (!corpo || titolo.length > MAX_TITOLO) return { testa: '', corpo: testo };
  const corpoMaiuscolo = corpo.replace(/^\p{Ll}/u, (c) => c.toUpperCase());
  return { testa: (stile === 'maiuscolo' ? titolo.toUpperCase() : titolo) + '\n\n', corpo: corpoMaiuscolo };
}

/** Trasforma il testo di un post Telegram nel testo del post su X, entro il limite. */
export function componiTweet(grezzo: string, opzioni: OpzioniTweet = {}): string {
  const { link, politicaLink = 'mai', titolo = 'normale', firma = '', hashtag = 0, limite = LIMITE_X } = opzioni;
  const { testa, corpo } = separaTitolo(aggiungiHashtag(pulisciPerX(grezzo), hashtag), titolo);
  const chiusura = firma ? `\n\n${firma}` : '';
  const coda = link ? `\n\n${link}` : '';
  const fisso = lunghezzaX(testa) + lunghezzaX(chiusura);

  if (politicaLink === 'sempre' && link) {
    const spazio = limite - fisso - lunghezzaX(coda);
    return testa + (lunghezzaX(corpo) <= spazio ? corpo : troncaEntro(corpo, spazio)) + coda + chiusura;
  }
  if (fisso + lunghezzaX(corpo) <= limite) return testa + corpo + chiusura;
  if (politicaLink === 'se-troncato' && link) {
    return testa + troncaEntro(corpo, limite - fisso - lunghezzaX(coda)) + coda + chiusura;
  }
  return testa + troncaEntro(corpo, limite - fisso) + chiusura;
}

function troncaEntro(testo: string, limite: number): string {
  return troncaPerPeso(testo, limite);
}

/** Un riscrittore riceve il testo, il numero massimo di caratteri (come li conta X) e quanti hashtag inserire; restituisce il testo pronto. */
export type Riscrittore = (testo: string, massimo: number, hashtag: number) => Promise<string>;

/**
 * Come `componiTweet`, ma passa dal riscrittore (Claude) quando serve: se il post non entra
 * nel limite lo fa accorciare (stessi fatti, frasi intere) invece di tagliarlo, e se sono
 * richiesti hashtag lascia a lui la scelta delle parole. Le regole automatiche restano
 * come ultima difesa se la riscrittura non basta o non è disponibile.
 */
export async function componiTweetConRiscrittura(grezzo: string, opzioni: OpzioniTweet, riscrivi?: Riscrittore): Promise<string> {
  const { titolo = 'normale', firma = '', hashtag = 0, limite = LIMITE_X } = opzioni;
  const pulito = pulisciPerX(grezzo);
  const chiusura = firma ? `\n\n${firma}` : '';
  const spazio = limite - lunghezzaX(chiusura);
  const { testa, corpo } = separaTitolo(pulito, titolo);
  const troppoLungo = lunghezzaX(testa + corpo) > spazio;
  if (!riscrivi || (!troppoLungo && hashtag <= 0)) return componiTweet(grezzo, opzioni);

  let massimo = spazio - 4 - hashtag; // margine: la riga vuota fra titolo e corpo pesa 2, ogni hashtag 1
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    const riscritto = pulisciPerX(await riscrivi(pulito, massimo, hashtag));
    if (riscritto && lunghezzaX(riscritto) <= massimo) {
      return componiTweet(riscritto, { ...opzioni, politicaLink: 'mai', hashtag: riscritto.includes('#') ? 0 : hashtag });
    }
    massimo -= 30;
  }
  return componiTweet(grezzo, opzioni);
}

/** Confini a cui si può spezzare un testo, dal più naturale al meno: fine frase, a capo, pausa, spazio. */
const CONFINI: RegExp[] = [/[.!?]+["»”)]?(?=\s|$)/g, /\n+/g, /[;:,](?=\s)/g, /\s+/g];

/** Il prefisso più lungo di `testo` che entra in `budget`, chiuso al confine più naturale possibile. */
function prefissoEntro(testo: string, budget: number): string {
  for (const confine of CONFINI) {
    let migliore = 0;
    for (const m of testo.matchAll(confine)) {
      const fine = m.index + m[0].length;
      if (lunghezzaX(testo.slice(0, fine).trim()) > budget) break;
      migliore = fine;
    }
    if (migliore > 0) return testo.slice(0, migliore);
  }
  return testo;
}

/**
 * Spezza un testo in post interi: frasi intere, e una frase che da sola non entra viene
 * spezzata a una pausa (punto e virgola, due punti, virgola), mai a metà parola.
 * Il primo post può avere un budget diverso (per il titolo).
 */
export function spezzaInParti(testo: string, limite: number, primoLimite = limite): string[] {
  const parti: string[] = [];
  let resto = testo.trim();
  let budget = primoLimite;
  while (resto) {
    if (lunghezzaX(resto) <= budget) {
      parti.push(resto);
      break;
    }
    const parte = prefissoEntro(resto, budget).trim();
    parti.push(parte);
    resto = resto.slice(parte.length).replace(/^[\s,;:]+/, '');
    budget = limite;
  }
  // Ogni parte è un post a sé: chiude con un punto e la successiva inizia con la maiuscola.
  return parti.filter(Boolean).map((parte, i) => {
    const chiusa = parte.replace(/[,;]$/, '.');
    return i === 0 ? chiusa : chiusa.replace(/^\p{Ll}/u, (c) => c.toUpperCase());
  });
}

/** Vero se i due testi coincidono a meno dei cancelletti e degli spazi. */
function stessoTesto(a: string, b: string): boolean {
  const norma = (t: string) => t.replace(/#/g, '').replace(/\s+/g, ' ').trim();
  return norma(a) === norma(b);
}

/**
 * Il post per X come sequenza: un post solo se entra nel limite, altrimenti un thread
 * (primo post con titolo e foto, il resto come risposte). Con un riscrittore (Claude) si prova
 * prima a far entrare tutto in un post; se non basta o non è disponibile, thread.
 * Nessuna frase viene mai tagliata né chiusa con puntini.
 */
export async function componiPostConRiscrittura(grezzo: string, opzioni: OpzioniTweet, riscrivi?: Riscrittore): Promise<string[]> {
  const { titolo = 'normale', firma = '', hashtag = 0, limite = LIMITE_X } = opzioni;
  const pulito = pulisciPerX(grezzo);
  const chiusura = firma ? `\n\n${firma}` : '';
  const spazio = limite - lunghezzaX(chiusura);
  const { testa, corpo } = separaTitolo(pulito, titolo);
  const troppoLungo = lunghezzaX(testa + corpo) > spazio;
  const intero = () => componiTweet(pulito, { ...opzioni, politicaLink: 'mai', limite: Number.POSITIVE_INFINITY });

  if (!troppoLungo && (!riscrivi || hashtag <= 0)) return [intero()];

  if (riscrivi) {
    let massimo = spazio - 4 - hashtag;
    for (let tentativo = 0; tentativo < 2; tentativo++) {
      let riscritto = '';
      try {
        riscritto = pulisciPerX(await riscrivi(pulito, massimo, hashtag));
      } catch (errore) {
        console.error(`[telegram-x] riscrittura non riuscita: ${errore instanceof Error ? errore.message : errore}`);
        break;
      }
      if (riscritto && lunghezzaX(riscritto) <= massimo) {
        // Un post che entrava già deve restare parola per parola: da Claude si accetta solo il cancelletto.
        if (!troppoLungo && !stessoTesto(riscritto, pulito)) {
          console.error('[telegram-x] riscrittura scartata: il testo era stato cambiato, resta l\'originale');
          break;
        }
        return [componiTweet(riscritto, { ...opzioni, politicaLink: 'mai', hashtag: riscritto.includes('#') ? 0 : hashtag })];
      }
      massimo -= 30;
    }
    if (!troppoLungo) return [intero()];
  }

  const { testa: testaTag, corpo: corpoTag } = separaTitolo(aggiungiHashtag(pulito, hashtag), titolo);
  const parti = spezzaInParti(corpoTag, spazio, spazio - lunghezzaX(testaTag));
  parti[0] = testaTag + parti[0];
  parti[parti.length - 1] += chiusura;
  return parti;
}

/**
 * Formato regolabile dalle variabili d'ambiente senza toccare il codice:
 *   X_TITOLO        normale | maiuscolo | nessuno   (prima frase su una riga a sé)
 *   X_FIRMA         riga di chiusura (predefinita: nessuna)
 *   X_HASHTAG       quante parole rilevanti diventano hashtag nel testo (predefinito 1, 0 per nessuna)
 *   X_LINK_NOTIZIE  mai (predefinito) | se-troncato | sempre
 *   X_LIMITE        280 (predefinito); con X Premium si può alzare, fino a 25000
 */
export const FORMATO_PREDEFINITO = { titolo: 'normale', firma: '', hashtag: 1, politicaLink: 'mai' } as const;

export function opzioniFormato(ambiente: Record<string, string | undefined>): Required<Pick<OpzioniTweet, 'titolo' | 'firma' | 'hashtag' | 'politicaLink' | 'limite'>> {
  const titolo = ambiente.X_TITOLO;
  const politicaLink = ambiente.X_LINK_NOTIZIE;
  return {
    titolo: titolo === 'maiuscolo' || titolo === 'nessuno' ? titolo : FORMATO_PREDEFINITO.titolo,
    firma: ambiente.X_FIRMA ?? FORMATO_PREDEFINITO.firma,
    hashtag: ambiente.X_HASHTAG === undefined || Number.isNaN(Number(ambiente.X_HASHTAG)) ? FORMATO_PREDEFINITO.hashtag : Math.max(0, Number(ambiente.X_HASHTAG)),
    politicaLink: politicaLink === 'mai' || politicaLink === 'sempre' ? politicaLink : FORMATO_PREDEFINITO.politicaLink,
    limite: Number(ambiente.X_LIMITE) > 0 ? Number(ambiente.X_LIMITE) : LIMITE_X,
  };
}
