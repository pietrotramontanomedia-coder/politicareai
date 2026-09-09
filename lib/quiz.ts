import type { DifficoltaQuiz, QuizSettimanale } from '@politicare/motore';
import quizSettimana01 from '@/content/quiz/settimana-01.json';

/** Il quiz corrente pubblicato. Quando si aggiunge una settimana, si cambia qui l'import. */
export function caricaQuizCorrente(): QuizSettimanale {
  return quizSettimana01 as QuizSettimanale;
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
  periodo: (dal: string, al: string) => `Fatti dal ${formattaData(dal)} al ${formattaData(al)}`,
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

/** "2026-09-02" -> "2 settembre 2026". Nessuna dipendenza da locale del browser. */
export function formattaData(iso: string): string {
  const [anno, mese, giorno] = iso.split('-').map(Number);
  if (!anno || !mese || !giorno) return iso;
  return `${giorno} ${MESI[mese - 1]} ${anno}`;
}
