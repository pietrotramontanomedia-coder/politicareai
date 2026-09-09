import type { DifficoltaQuiz, QuizSettimanale } from '@politicare/motore';
import quizSettimana01 from '@/content/quiz/settimana-01.json';
import quizSettimana02 from '@/content/quiz/settimana-02.json';
import quizSettimana03 from '@/content/quiz/settimana-03.json';

/**
 * Tutti i quiz pubblicati, in ordine di numero crescente. Quando si aggiunge
 * una settimana, si importa il nuovo file e lo si aggiunge qui.
 */
export const TUTTI_I_QUIZ: QuizSettimanale[] = (
  [quizSettimana01, quizSettimana02, quizSettimana03] as QuizSettimanale[]
).sort((a, b) => a.numero - b.numero);

/** Il quiz più recente: è quello servito su /quiz-settimanale. */
export function caricaQuizCorrente(): QuizSettimanale {
  return TUTTI_I_QUIZ[TUTTI_I_QUIZ.length - 1];
}

export function caricaQuizPerNumero(numero: number): QuizSettimanale | undefined {
  return TUTTI_I_QUIZ.find((q) => q.numero === numero);
}

/** Gli altri quiz oltre a quello indicato, dal più recente al più vecchio. */
export function archivioQuiz(escludiNumero: number): QuizSettimanale[] {
  return TUTTI_I_QUIZ.filter((q) => q.numero !== escludiNumero).sort((a, b) => b.numero - a.numero);
}

export function percorsoQuiz(quiz: QuizSettimanale): string {
  return quiz.numero === caricaQuizCorrente().numero ? '/quiz-settimanale' : `/quiz-settimanale/${quiz.numero}`;
}

/** Testi di interfaccia del quiz, tenuti fuori dai componenti. */
export const TESTI_QUIZ = {
  etichetta: 'Quiz settimanale',
  inizia: 'Inizia il quiz',
  prossima: 'Prossima domanda',
  vediRisultati: 'Vedi i risultati',
  rifai: 'Rifai il quiz',
  domandaDi: (corrente: number, totale: number) => `Domanda ${corrente} di ${totale}`,
  giusta: 'Risposta esatta',
  sbagliata: 'Risposta sbagliata',
  rispostaCorretta: 'La risposta corretta era',
  fonte: 'Fonte',
  spiegazione: 'Perché',
  comeFunziona: {
    titolo: 'Come funziona',
    punti: [
      'Una domanda alla volta, con quattro risposte possibili.',
      'Dopo ogni risposta vedi subito la soluzione, la spiegazione e la fonte.',
      'Nessun dato viene inviato: il punteggio resta sul tuo dispositivo.',
    ],
  },
  archivio: {
    titolo: 'Gli altri quiz',
    piuRecente: 'Ultimo quiz',
    vaiAlPiuRecente: 'Vai al quiz più recente',
    domande: (n: number) => `${n} domande`,
  },
  risultati: {
    etichetta: 'Quiz completato',
    riepilogo: (corrette: number, totale: number) => `${corrette} risposte esatte su ${totale}`,
    perSezione: 'Per sezione',
    perDifficolta: 'Per difficoltà',
    rivedi: 'Rivedi le domande',
    tuaRisposta: 'La tua risposta',
    commento: (percentuale: number): string => {
      if (percentuale === 100) return 'Settimana seguita alla perfezione.';
      if (percentuale >= 70) return 'Ottimo: hai seguito bene i fatti della settimana.';
      if (percentuale >= 40) return 'Buona base. Le spiegazioni qui sotto colmano i buchi.';
      return 'Settimana intensa: le spiegazioni qui sotto la ricostruiscono passo passo.';
    },
  },
  /** "Settimana dal 19 al 25 agosto 2026", "Settimana dal 26 agosto al 1° settembre 2026". */
  settimana: (dal: string, al: string) => `Settimana ${formattaPeriodo(dal, al)}`,
  /** "Quiz 1 · Settimana dal 19 al 25 agosto 2026": l'intestazione completa di un quiz. */
  intestazione: (quiz: QuizSettimanale) => `${quiz.sottotitolo} · Settimana ${formattaPeriodo(quiz.periodo.dal, quiz.periodo.al)}`,
  autori: (autori: string[]) => `A cura di ${autori.join(', ')}`,
  versione: (versione: string, data: string) => `Versione ${versione} · pubblicato il ${formattaData(data)}`,
} as const;

export const ETICHETTE_DIFFICOLTA: Record<DifficoltaQuiz, { label: string; colore: string; sfondo: string }> = {
  facile: { label: 'Facile', colore: '#22c55e', sfondo: 'rgba(34,197,94,0.15)' },
  media: { label: 'Media', colore: '#fbbf24', sfondo: 'rgba(251,191,36,0.15)' },
  difficile: { label: 'Difficile', colore: '#f87171', sfondo: 'rgba(239,68,68,0.15)' },
};

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

function scomponi(iso: string): { anno: number; mese: number; giorno: number } | null {
  const [anno, mese, giorno] = iso.split('-').map(Number);
  if (!anno || !mese || !giorno) return null;
  return { anno, mese, giorno };
}

/** "1" -> "1°", gli altri giorni restano numeri. */
function giornoInLettere(giorno: number): string {
  return giorno === 1 ? '1°' : String(giorno);
}

/** Preposizione "dal"/"dall'" e "al"/"all'" corrette davanti a 1, 8 e 11. */
function conPreposizione(prep: 'dal' | 'al', giorno: number): string {
  const elisione = giorno === 8 || giorno === 11;
  if (elisione) return `${prep === 'dal' ? "dall'" : "all'"}${giorno}`;
  return `${prep} ${giornoInLettere(giorno)}`;
}

/** "2026-09-02" -> "2 settembre 2026". Nessuna dipendenza da locale del browser. */
export function formattaData(iso: string): string {
  const d = scomponi(iso);
  if (!d) return iso;
  return `${giornoInLettere(d.giorno)} ${MESI[d.mese - 1]} ${d.anno}`;
}

/**
 * Intervallo in italiano, compatto quando mese e anno coincidono:
 * ("2026-08-19","2026-08-25") -> "dal 19 al 25 agosto 2026"
 * ("2026-08-26","2026-09-01") -> "dal 26 agosto al 1° settembre 2026"
 * ("2026-09-02","2026-09-08") -> "dal 2 all'8 settembre 2026"
 */
export function formattaPeriodo(dal: string, al: string): string {
  const a = scomponi(dal);
  const b = scomponi(al);
  if (!a || !b) return `dal ${dal} al ${al}`;

  const inizio = conPreposizione('dal', a.giorno);
  const fine = conPreposizione('al', b.giorno);
  if (a.anno === b.anno && a.mese === b.mese) {
    return `${inizio} ${fine} ${MESI[b.mese - 1]} ${b.anno}`;
  }
  if (a.anno === b.anno) {
    return `${inizio} ${MESI[a.mese - 1]} ${fine} ${MESI[b.mese - 1]} ${b.anno}`;
  }
  return `${inizio} ${MESI[a.mese - 1]} ${a.anno} ${fine} ${MESI[b.mese - 1]} ${b.anno}`;
}
