'use client';

import type { Classifica, QuizSettimanale, RispostaQuiz, TestPartitoPack } from '@politicare/motore';
import { datiQuiz, datiSimulazione, datiTest, type DatiConfronto } from '@/lib/condivisione/dati';
import { disegnaConfronto, disegnaQuiz, disegnaSimulazione, disegnaTest } from '@/lib/condivisione/grafiche';
import { TESTI_CONDIVISIONE as T } from '@/lib/condivisione/testi';
import type { Esito } from '@/lib/simulatore-elettorale';
import { STRUMENTI } from '@/lib/strumenti';
import PannelloCondivisione from './PannelloCondivisione';

/* Pulsanti di condivisione pronti per ciascuno strumento. */

export function CondividiTest({ pack, classifica, numeroRisposte }: { pack: TestPartitoPack; classifica: Classifica; numeroRisposte: number }) {
  return (
    <PannelloCondivisione
      genera={(f) => disegnaTest(datiTest(pack, classifica, numeroRisposte), f)}
      nomeFile={T.test.file}
      titolo={T.test.richiamo}
      testo={T.test.testo}
      percorso={STRUMENTI.test.href}
      colore={STRUMENTI.test.colore}
      nota={T.test.spiegazione}
    />
  );
}

export function CondividiQuiz({ quiz, risposte, percorso }: { quiz: QuizSettimanale; risposte: RispostaQuiz[]; percorso: string }) {
  return (
    <PannelloCondivisione
      genera={(f) => disegnaQuiz(datiQuiz(quiz, risposte), f)}
      nomeFile={`${T.quiz.file}-${quiz.numero}`}
      titolo={T.quiz.etichetta}
      testo={T.quiz.testo(datiQuiz(quiz, risposte).percentuale)}
      percorso={percorso}
      colore={STRUMENTI.quiz.colore}
      etichetta={T.quiz.pulsante}
    />
  );
}

export function CondividiSimulazione({ esito }: { esito: Esito }) {
  return (
    <PannelloCondivisione
      genera={(f) => disegnaSimulazione(datiSimulazione(esito), f)}
      nomeFile={T.simulatore.file}
      titolo={T.simulatore.titolo}
      testo={T.simulatore.testo}
      percorso={STRUMENTI.simulatore.href}
      colore={STRUMENTI.simulatore.colore}
      etichetta={T.simulatore.pulsante}
      compatto
    />
  );
}

export function CondividiConfronto({ dati }: { dati: DatiConfronto }) {
  return (
    <PannelloCondivisione
      genera={(f) => disegnaConfronto(dati, f)}
      nomeFile={`${T.confronto.file}-${dati.id}`}
      titolo={T.confronto.etichetta}
      testo={T.confronto.testo}
      percorso={`${STRUMENTI.confronta.href}/${dati.area}#${dati.id}`}
      colore={STRUMENTI.confronta.colore}
      compatto
    />
  );
}
