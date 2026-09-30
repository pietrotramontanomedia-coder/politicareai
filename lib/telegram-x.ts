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

/** Refusi ricorrenti del canale: la «l» minuscola battuta al posto della «I» maiuscola. */
const REFUSI: [RegExp, string][] = [
  [/\bFdl\b/g, 'FdI'],
  [/\bltal(ia|iano|iana|iani|iane)\b/g, 'Ital$1'],
  [/\blsrael(e|iano|iana|iani)\b/g, 'Israel$1'],
  [/\blran\b/g, 'Iran'],
  [/\blraq\b/g, 'Iraq'],
  [/\blstat\b/g, 'Istat'],
];

/**
 * Chi scrive sul canale va a capo a mano dentro la frase: su X il post esce a scalini
 * («Matteo» su una riga e «Renzi» su quella dopo). Un a capo singolo che non chiude
 * la frase torna a essere uno spazio; la riga vuota fra due paragrafi resta.
 */
function unisciRigheSpezzate(testo: string): string {
  return testo.replace(/([^\n.!?:;…»"”)\]])\n(?!\n)(?=[^\n])/g, '$1 ');
}

function pulisciPerX(grezzo: string): string {
  let testo = grezzo
    .replace(FIRMA_TELEGRAM, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
  for (const [refuso, giusto] of REFUSI) testo = testo.replace(refuso, giusto);
  return unisciRigheSpezzate(
    testo
      .replace(EMOJI_INIZIALI, (emoji) => `${emoji} `)
      .replace(/[ \t]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .replace(/\n{3,}/g, '\n\n'),
  ).trim();
}

/** Dove stanno i link nel testo: dentro un link non si tocca niente. */
function intervalliLink(testo: string): [number, number][] {
  const intervalli: [number, number][] = [];
  const cerca = new RegExp(URL.source, 'gi');
  let trovato: RegExpExecArray | null;
  while ((trovato = cerca.exec(testo))) intervalli.push([trovato.index, trovato.index + trovato[0].length]);
  return intervalli;
}

function dentroLink(intervalli: [number, number][], posizione: number): boolean {
  return intervalli.some(([inizio, fine]) => posizione >= inizio && posizione < fine);
}

/** Vero se il post non ha nulla da dire: solo un link, o un link e poche parole. */
export function soloLink(grezzo: string): boolean {
  const testo = grezzo.replace(FIRMA_TELEGRAM, '').trim();
  if (!testo) return true;
  const senzaLink = testo.replace(new RegExp(URL.source, 'gi'), ' ').trim();
  if (senzaLink === testo) return false;
  return senzaLink.split(/\s+/).filter((parola) => parola.length > 1).length < 4;
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
  fatto quotidiano corriere sera repubblica stampa messaggero giornale foglio sole ore ansa agi adnkronos tg1 tg2 tg3 tgcom24 skytg24 rai mediaset la7
  sto stiamo siamo ecco leggi leggete guarda guardate ascolta ricorda vedo credo penso dico voglio posso devo faccio arriva arrivano
  gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre
  aggiornamento commento commenti congetture congettura dichiarazione dichiarazioni parola parole risultato risultati
  candidato candidata candidati vittoria sconfitta intervista esclusiva retroscena polemica replica reazione nota lettera
  nazionale nazionali internazionale internazionali arabi uniti viva york monde libera nuovo nuova nuovi nuove`
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
  [/\bLa Russa\b/, 'LaRussa'],
  [/\bEmirati [Aa]rabi [Uu]niti\b/, 'EmiratiArabiUniti'],
  [/\bNew York\b/, 'NewYork'],
  [/\bItalia Viva\b/, 'ItaliaViva'],
  [/\bFuturo Nazionale\b/, 'FuturoNazionale'],
  [/\bSinistra Italiana\b/, 'SinistraItaliana'],
  [/\bCasa Riformista\b/, 'CasaRiformista'],
  [/\bNoi Moderati\b/, 'NoiModerati'],
  [/\bLe Monde\b/, 'LeMonde'],
  [/\bCasa Bianca\b/, 'CasaBianca'],
  [/\bMedio [Oo]riente\b/, 'MedioOriente'],
  [/\bPartito Democratico\b/, 'PD'],
  [/\bFratelli d['’]Italia\b/, 'FdI'],
  [/\bForza Italia\b/, 'ForzaItalia'],
  [/\bMovimento 5 Stelle\b/, 'M5S'],
  [/\bAlleanza Verdi e Sinistra\b/, 'AVS'],
  [/\b[Vv]on [Dd]er Leyen\b/, 'VonDerLeyen'],
  [/\bGran Bretagna\b/, 'GranBretagna'],
];

/** Cognome con la particella dopo un nome di battesimo: «Donatella Di Cesare» → «#DiCesare». */
const COGNOME_CON_PARTICELLA =
  /(?<![\p{L}\p{N}#@'’-])\p{Lu}[\p{L}]{2,}\s+((?:Di|De|Del|Della|Dei|Da|Dal|La|Le|Lo|Van|Von|Mac|Mc)\s+\p{Lu}[\p{L}]{2,})(?![\p{L}\p{N}'’-])/gu;

/** La forma dell'hashtag per una parola o una frase: «bollo auto» → «BolloAuto». */
function tagDa(frase: string): string {
  return frase
    .split(/[\s'’-]+/)
    .filter(Boolean)
    .map((parola) => parola[0].toUpperCase() + parola.slice(1))
    .join('');
}

/** Dove compare per la prima volta una frase, fuori dai link e non già marcata. */
function trovaFrase(testo: string, frase: string, link: [number, number][]): { indice: number; lunghezza: number } | null {
  const schema = frase.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const cerca = new RegExp(`(?<![\\p{L}\\p{N}#@'’-])${schema}(?![\\p{L}\\p{N}'’-])`, 'giu');
  let trovato: RegExpExecArray | null;
  while ((trovato = cerca.exec(testo))) {
    if (!dentroLink(link, trovato.index)) return { indice: trovato.index, lunghezza: trovato[0].length };
  }
  return null;
}

interface Candidato {
  parola: string;
  tag: string;
  prima: number;
  lunghezza: number;
  punteggio: number;
}

/**
 * Trasforma in hashtag le parole più rilevanti del testo. Se `scelte` è pieno le parole
 * le ha scelte Claude e comandano loro; altrimenti decide la regola automatica, che preferisce
 * i nomi composti, il cognome di un «Nome Cognome» e i nomi noti della politica.
 * Il testo non cambia mai: si aggiunge solo il cancelletto, mai dentro un link.
 */
export function aggiungiHashtag(testo: string, massimo = 1, scelte: string[] = []): string {
  if (massimo <= 0) return testo;
  const link = intervalliLink(testo);
  const candidati: Candidato[] = [];

  // Le parole scelte da Claude vengono prima di tutto, nell'ordine in cui le ha date.
  scelte.forEach((frase, posizione) => {
    if (!frase?.trim()) return;
    const dove = trovaFrase(testo, frase, link);
    if (dove) candidati.push({ parola: testo.substr(dove.indice, dove.lunghezza), tag: tagDa(frase), prima: dove.indice, lunghezza: dove.lunghezza, punteggio: 1000 - posizione });
  });

  // Nomi composti noti: istituzioni, partiti, luoghi.
  for (const [composto, tag] of COMPOSTI) {
    const trovato = composto.exec(testo);
    if (!trovato || trovato.index === undefined || dentroLink(link, trovato.index) || testo[trovato.index - 1] === '#') continue;
    candidati.push({ parola: trovato[0], tag, prima: trovato.index, lunghezza: trovato[0].length, punteggio: 6 });
  }

  // Cognomi con la particella: l'hashtag va sul cognome, non sul nome di battesimo.
  const daScartare = new Set<string>();
  COGNOME_CON_PARTICELLA.lastIndex = 0;
  let coppia: RegExpExecArray | null;
  while ((coppia = COGNOME_CON_PARTICELLA.exec(testo))) {
    const cognome = coppia[1];
    const indice = coppia.index + coppia[0].length - cognome.length;
    if (dentroLink(link, indice)) continue;
    const ultima = cognome.split(/\s+/).pop() ?? '';
    if (NON_HASHTAG.has(ultima.toLowerCase())) continue;
    daScartare.add(coppia[0].split(/\s+/)[0]);
    candidati.push({ parola: cognome, tag: tagDa(cognome), prima: indice, lunghezza: cognome.length, punteggio: 24 });
  }

  const parola = /(?<![\p{L}\p{N}#'’@_-])(\p{Lu}[\p{L}\p{N}]{2,})(?![\p{L}\p{N}'’-])/gu;
  const nomi = new Map<string, { conteggio: number; prima: number; inRun: boolean; soloInizio: boolean }>();
  let m: RegExpExecArray | null;
  while ((m = parola.exec(testo))) {
    const nome = m[1];
    if (NON_HASHTAG.has(nome.toLowerCase()) || daScartare.has(nome) || dentroLink(link, m.index)) continue;
    if (/^\p{Lu}+$/u.test(nome) && nome.length < 3) continue;
    if (COMPOSTI.some(([composto]) => new RegExp(composto.source + '$').test(testo.slice(0, m!.index + nome.length)))) continue;
    const precedente = testo.slice(0, m.index).match(/(\p{Lu}[\p{L}\p{N}]*) $/u);
    const inRun = Boolean(precedente && !NON_HASHTAG.has(precedente[1].toLowerCase()));
    // A inizio frase la maiuscola non dice nulla: la parola conta solo se ricorre altrove.
    // Vale anche dopo le virgolette aperte, altrimenti «"Sto portando via…"» diventa «#Sto».
    const inizioFrase = m.index > 0 && /(?:[.!?…]|\n)\s*["«“'‘(\[]*\s*$/u.test(testo.slice(0, m.index));
    const voce = nomi.get(nome) ?? { conteggio: 0, prima: m.index, inRun, soloInizio: true };
    voce.conteggio++;
    if (!inizioFrase) voce.soloInizio = false;
    nomi.set(nome, voce);
  }
  for (const [nome, voce] of nomi) if (voce.soloInizio && voce.conteggio < 2) nomi.delete(nome);
  // In una coppia «Nome Cognome» l'hashtag va sul cognome: la prima parola della coppia esce.
  for (const [nome, voce] of nomi) {
    const seguito = new RegExp(`(?<![\\p{L}\\p{N}#])${nome} \\p{Lu}[\\p{L}\\p{N}]{2,}`, 'u').exec(testo);
    if (seguito && !voce.inRun) nomi.delete(nome);
  }
  for (const [nome, voce] of nomi) {
    candidati.push({ parola: nome, tag: nome, prima: voce.prima, lunghezza: nome.length, punteggio: (voce.conteggio - 1) * 2 + (voce.inRun ? 8 : 0) + (PRIORITA.has(nome.toLowerCase()) ? 8 : 0) });
  }

  // Si tiene il migliore, poi si scartano quelli che si sovrappongono a uno già preso.
  const presi: Candidato[] = [];
  for (const candidato of candidati.sort((a, b) => b.punteggio - a.punteggio || a.prima - b.prima)) {
    if (presi.length >= massimo) break;
    const inizio = candidato.prima;
    const fine = candidato.prima + candidato.lunghezza;
    if (presi.some((preso) => inizio < preso.prima + preso.lunghezza && preso.prima < fine)) continue;
    presi.push(candidato);
  }

  // Si marca dal fondo verso l'inizio, così gli indici di chi viene prima restano validi.
  let finale = testo;
  for (const preso of [...presi].sort((a, b) => b.prima - a.prima)) {
    finale = finale.slice(0, preso.prima) + `#${preso.tag}` + finale.slice(preso.prima + preso.lunghezza);
  }
  return finale;
}

/**
 * Account X verificati uno per uno il 24 settembre 2026 aprendo il profilo:
 * la chiave è il nome com'è nell'hashtag, senza accenti e in minuscolo.
 * Nel dubbio non si aggiunge nulla: taggare la persona sbagliata è peggio che non taggare.
 */
const MENZIONI: Record<string, string> = {
  meloni: 'GiorgiaMeloni',
  schlein: 'ellyesse',
  salvini: 'matteosalvinimi',
  conte: 'GiuseppeConteIT',
  tajani: 'Antonio_Tajani',
  renzi: 'matteorenzi',
  calenda: 'CarloCalenda',
  bonelli: 'AngeloBonelli1',
  fratoianni: 'NFratoianni',
  magi: 'riccardomagi',
  crosetto: 'GuidoCrosetto',
  larussa: 'Ignazio_LaRussa',
  lollobrigida: 'FrancescoLollo1',
  santanche: 'DSantanche',
  valditara: 'G_Valditara',
  zaia: 'zaiapresidente',
  vannacci: 'RoVannacci',
  deluca: 'VincenzoDeLuca',
  benifei: 'brandobenifei',
  salis: 'silvia_salis',
  trump: 'realDonaldTrump',
  zelensky: 'ZelenskyyUa',
  vonderleyen: 'vonderleyen',
  macron: 'EmmanuelMacron',
};

function chiaveMenzione(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Trasforma in menzione gli hashtag che corrispondono a un politico con account noto:
 * «#Bonelli» diventa «@AngeloBonelli1», così la persona citata riceve la notifica.
 * Il numero di segni nel testo non cambia: la menzione prende il posto dell'hashtag.
 * Mai in prima posizione: un post che comincia con «@» X lo mostra solo a chi segue entrambi.
 */
export function aggiungiMenzioni(testo: string, massimo = 2): string {
  if (massimo <= 0) return testo;
  let fatte = 0;
  return testo.replace(/(\p{Lu}[\p{L}]{2,} )?#(\p{Lu}[\p{L}\p{N}]*)/gu, (intero, nome: string | undefined, cognome: string, posizione: number) => {
    const handle = MENZIONI[chiaveMenzione(cognome)];
    const cancelletto = posizione + (nome?.length ?? 0);
    if (!handle || fatte >= massimo || cancelletto === 0) return intero;
    fatte++;
    // Il nome di battesimo che l'handle contiene già sparisce: «Matteo @matteorenzi» si legge male.
    // Resta se è la prima parola del post, altrimenti il post comincerebbe con «@».
    const ripetuto = nome && posizione > 0 && chiaveMenzione(handle).includes(chiaveMenzione(nome.trim()));
    return `${ripetuto ? '' : (nome ?? '')}@${handle}`;
  });
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
  /** Quanti hashtag di politici con account noto diventano menzioni (0 = nessuna). */
  menzioni?: number;
  /** Parole del testo scelte da Claude per diventare hashtag, in ordine di importanza. */
  scelte?: string[];
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
  const { link, politicaLink = 'mai', titolo = 'normale', firma = '', hashtag = 0, menzioni = 0, scelte = [], limite = LIMITE_X } = opzioni;
  const { testa, corpo } = separaTitolo(aggiungiMenzioni(aggiungiHashtag(pulisciPerX(grezzo), hashtag, scelte), menzioni), titolo);
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

/** Soglia oltre la quale due post sono la stessa notizia: 1 = identici. */
export const SOGLIA_DOPPIONE = 0.85;

/**
 * Le parole che contano di un testo, per confrontarlo con un altro: senza accenti,
 * emoji, punteggiatura, cancelletti e paroline brevi. Applicarla due volte non cambia nulla.
 */
export function impronta(testo: string): string[] {
  return testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}]/gu, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((parola) => parola.length >= 3 || /\d/.test(parola));
}

/** Quanto due liste di parole si somigliano, da 0 a 1 (coefficiente di Dice). */
export function similitudine(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const insiemeA = new Set(a);
  const insiemeB = new Set(b);
  let comuni = 0;
  for (const parola of insiemeA) if (insiemeB.has(parola)) comuni++;
  return (2 * comuni) / (insiemeA.size + insiemeB.size);
}

/**
 * Vero se la notizia è già uscita, anche riscritta o con un refuso in più:
 * il 20 settembre gli exit poll di Berlino sono usciti due volte a undici minuti di distanza.
 * Un testo molto corto non si giudica: troppe poche parole per distinguerlo da un altro.
 */
export function eDoppione(testo: string, precedenti: string[], soglia = SOGLIA_DOPPIONE): boolean {
  const parole = impronta(testo);
  if (parole.length < 6) return false;
  return precedenti.some((precedente) => similitudine(parole, impronta(precedente)) >= soglia);
}

/** Sceglie le parole del testo da trasformare in hashtag: le restituisce esatte, in ordine di importanza. */
export type SceltaHashtag = (testo: string, quanti: number) => Promise<string[]>;

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

/** Vero se i due testi coincidono a meno dei cancelletti, degli spazi e delle maiuscole. */
function stessoTesto(a: string, b: string): boolean {
  // Un hashtag può unire parole vicine («bollo auto» → «#BolloAuto»): spazi e maiuscole non contano.
  const norma = (t: string) => t.replace(/#/g, '').replace(/\s+/g, '').toLowerCase();
  return norma(a) === norma(b);
}

/**
 * Il post per X come sequenza: un post solo se entra nel limite, altrimenti un thread
 * (primo post con titolo e foto, il resto come risposte). Con un riscrittore (Claude) si prova
 * prima a far entrare tutto in un post; se non basta o non è disponibile, thread.
 * Nessuna frase viene mai tagliata né chiusa con puntini.
 */
export async function componiPostConRiscrittura(grezzo: string, opzioni: OpzioniTweet, riscrivi?: Riscrittore, scegli?: SceltaHashtag): Promise<string[]> {
  const { titolo = 'normale', firma = '', hashtag = 0, limite = LIMITE_X } = opzioni;
  const pulito = pulisciPerX(grezzo);
  const chiusura = firma ? `\n\n${firma}` : '';
  const spazio = limite - lunghezzaX(chiusura);
  const { testa, corpo } = separaTitolo(pulito, titolo);
  const troppoLungo = lunghezzaX(testa + corpo) > spazio;
  const intero = (scelte: string[] = []) => componiTweet(pulito, { ...opzioni, scelte, politicaLink: 'mai', limite: Number.POSITIVE_INFINITY });

  // Caso normale: la notizia entra nel limite, quindi il testo esce esattamente com'è scritto
  // e a Claude si chiede solo quali parole marcare. Così non può cambiare una virgola.
  if (!troppoLungo) {
    if (!scegli || hashtag <= 0) return [intero()];
    try {
      return [intero(await scegli(pulito, hashtag))];
    } catch (errore) {
      console.error(`[telegram-x] scelta hashtag non riuscita, vale la regola automatica: ${errore instanceof Error ? errore.message : errore}`);
      return [intero()];
    }
  }

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

  const { testa: testaTag, corpo: corpoTag } = separaTitolo(aggiungiMenzioni(aggiungiHashtag(pulito, hashtag), opzioni.menzioni ?? 0), titolo);
  const parti = spezzaInParti(corpoTag, spazio, spazio - lunghezzaX(testaTag));
  parti[0] = testaTag + parti[0];
  parti[parti.length - 1] += chiusura;
  return parti;
}

/**
 * Formato regolabile dalle variabili d'ambiente senza toccare il codice:
 *   X_TITOLO        normale | maiuscolo | nessuno   (prima frase su una riga a sé)
 *   X_FIRMA         riga di chiusura (predefinita: nessuna)
 *   X_HASHTAG       quante parole rilevanti diventano hashtag nel testo (predefinito 3, scelte da Claude; 0 per nessuna)
 *   X_MENZIONI      quanti hashtag di politici noti diventano menzioni (predefinito 2, 0 per nessuna)
 *   X_LINK_NOTIZIE  mai (predefinito) | se-troncato | sempre
 *   X_LIMITE        280 (predefinito); con X Premium si può alzare, fino a 25000
 */
export const FORMATO_PREDEFINITO = { titolo: 'normale', firma: '', hashtag: 3, menzioni: 2, politicaLink: 'mai' } as const;

export function opzioniFormato(ambiente: Record<string, string | undefined>): Required<Pick<OpzioniTweet, 'titolo' | 'firma' | 'hashtag' | 'menzioni' | 'politicaLink' | 'limite'>> {
  const titolo = ambiente.X_TITOLO;
  const politicaLink = ambiente.X_LINK_NOTIZIE;
  return {
    titolo: titolo === 'maiuscolo' || titolo === 'nessuno' ? titolo : FORMATO_PREDEFINITO.titolo,
    firma: ambiente.X_FIRMA ?? FORMATO_PREDEFINITO.firma,
    hashtag: ambiente.X_HASHTAG === undefined || Number.isNaN(Number(ambiente.X_HASHTAG)) ? FORMATO_PREDEFINITO.hashtag : Math.max(0, Number(ambiente.X_HASHTAG)),
    menzioni: ambiente.X_MENZIONI === undefined || Number.isNaN(Number(ambiente.X_MENZIONI)) ? FORMATO_PREDEFINITO.menzioni : Math.max(0, Number(ambiente.X_MENZIONI)),
    politicaLink: politicaLink === 'mai' || politicaLink === 'sempre' ? politicaLink : FORMATO_PREDEFINITO.politicaLink,
    limite: Number(ambiente.X_LIMITE) > 0 ? Number(ambiente.X_LIMITE) : LIMITE_X,
  };
}
