/**
 * Testi e metadati degli strumenti interattivi. È l'unica fonte per la griglia della home
 * e per il pannello del menu in basso: nome, colore e numeri restano coerenti ovunque.
 */

export type IdStrumento = 'profilo' | 'test' | 'quiz' | 'confronta' | 'simulatore' | 'gioco' | 'metodologia';

export interface Strumento {
  id: IdStrumento;
  href: string;
  /** Nome breve, per chip e menu. */
  nome: string;
  /** Una riga per il pannello del menu. */
  breve: string;
  titolo: string;
  descrizione: string;
  azione: string;
  meta: string[];
  /** Colore identitario dello strumento, in esadecimale. */
  colore: string;
}

/** Numeri citati nei testi: un test li confronta con i content pack. */
export const NUMERI = { affermazioni: 20, partiti: 13, temi: 10, domandeQuiz: 7 } as const;

export const STRUMENTI: Record<IdStrumento, Strumento> = {
  profilo: {
    id: 'profilo',
    href: '/profilo',
    nome: 'Il tuo profilo',
    breve: 'Quiz, traguardi e preferenze',
    titolo: 'Il tuo profilo',
    descrizione: 'Storico dei quiz, traguardi, temi che segui e il tuo gruppo per il gioco.',
    azione: 'Apri il profilo',
    meta: [],
    colore: '#FB923C',
  },
  test: {
    id: 'test',
    href: '/test-partito',
    nome: 'Test partiti',
    breve: 'Trova il partito più vicino a te',
    titolo: 'Con quale partito sei allineato?',
    descrizione: `Rispondi a ${NUMERI.affermazioni} affermazioni concrete e scopri quanto sei vicino a ciascun partito, tema per tema.`,
    azione: 'Inizia il test',
    meta: [`${NUMERI.affermazioni} affermazioni`, `${NUMERI.partiti} partiti`],
    colore: '#FEDC01',
  },
  quiz: {
    id: 'quiz',
    href: '/quiz-settimanale',
    nome: 'Quiz',
    breve: `${NUMERI.domandeQuiz} domande sulla settimana`,
    titolo: 'Quiz della settimana',
    descrizione: 'Italia ed estero: ogni risposta ha spiegazione e fonte.',
    azione: 'Gioca',
    meta: [`${NUMERI.domandeQuiz} domande`],
    colore: '#A78BFA',
  },
  confronta: {
    id: 'confronta',
    href: '/confronta',
    nome: 'Confronta',
    breve: 'Le posizioni, tema per tema',
    titolo: 'Dove stanno i partiti',
    descrizione: 'Chi è favorevole e chi è contrario, con la fonte di ogni posizione.',
    azione: 'Confronta',
    meta: [`${NUMERI.temi} temi`],
    colore: '#34D399',
  },
  simulatore: {
    id: 'simulatore',
    href: '/simulatore',
    nome: 'Simulatore',
    breve: 'Dai voti ai seggi',
    titolo: 'Riempi il Parlamento',
    descrizione: 'Scegli le percentuali e guarda come diventano seggi con la nuova legge elettorale.',
    azione: 'Simula',
    meta: ['Camera e Senato', 'Premio al 42%'],
    colore: '#60A5FA',
  },
  gioco: {
    id: 'gioco',
    href: '/gioco',
    nome: 'Gioco',
    breve: 'Crisi di Governo, in compagnia',
    titolo: 'Crisi di Governo',
    descrizione:
      'Il gioco di società della politica italiana: mozioni di sfiducia, ostruzionismo e leggi che restano in vigore. Si passa il telefono e si gioca.',
    azione: 'Apri la seduta',
    meta: ['Da 2 giocatori', 'Solo maggiorenni', 'Modalità analcolica'],
    colore: '#F472B6',
  },
  metodologia: {
    id: 'metodologia',
    href: '/metodologia',
    nome: 'Metodologia',
    breve: 'Fonti, formula e regole',
    titolo: 'Come funzioniamo',
    descrizione: 'Le fonti, la formula di punteggio e le regole dei nostri strumenti.',
    azione: 'Leggi',
    meta: [],
    colore: '#D4D4D8',
  },
};

/** Ordine delle voci nel pannello "Strumenti" del menu in basso. */
export const ORDINE_PANNELLO: IdStrumento[] = ['profilo', 'test', 'quiz', 'confronta', 'simulatore', 'gioco', 'metodologia'];

export const TESTI_STRUMENTI = {
  occhiello: 'Strumenti',
  titolo: 'Mettiti alla prova',
  sottotitolo: 'Non articoli da leggere, ma cose da fare: rispondi, confronta, simula, gioca. Tutto resta sul tuo dispositivo.',
  anteprimaTest: {
    contatore: 'Affermazione 17 di 20',
    affermazione: "L'Italia deve tornare a produrre energia nucleare",
    estremi: ['Molto contrario', 'Molto favorevole'] as const,
  },
  anteprimaQuiz: {
    domanda: 'Quanti deputati siedono alla Camera?',
    opzioni: ['315', '400', '630'],
    giusta: 1,
  },
  anteprimaRisultato: { titolo: 'Il tuo risultato', nota: 'Classifica completa, mai un solo vincitore' },
  anteprimaConfronta: { favorevoli: 'Favorevoli', contrari: 'Contrari' },
  anteprimaSimulatore: { maggioranza: 'Maggioranza' },
};

export const TESTI_NAV = {
  home: 'Home',
  test: 'Test',
  quiz: 'Quiz',
  gioco: 'Gioco',
  apri: 'Apri tutti gli strumenti',
  chiudi: 'Chiudi gli strumenti',
  titoloPannello: 'Tutti gli strumenti',
  notaPannello: 'Trascina giù per chiudere',
};

/** Converte un colore esadecimale (#RRGGBB) in rgba con la trasparenza indicata. */
export function conAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}
