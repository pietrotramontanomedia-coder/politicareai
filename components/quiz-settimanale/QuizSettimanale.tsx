'use client';

import { useCallback, useState } from 'react';
import type { QuizSettimanale, RispostaQuiz } from '@politicare/motore';
import { mescolaIndici } from '@politicare/motore';
import SchermataIntroQuiz from './SchermataIntroQuiz';
import SchermataDomandaQuiz from './SchermataDomandaQuiz';
import SchermataRisultatiQuiz from './SchermataRisultatiQuiz';

type Fase = 'intro' | 'quiz' | 'risultati';

/**
 * Contenitore del quiz: tiene lo stato in memoria e basta. Niente storage,
 * niente rete: il punteggio nasce e muore nel dispositivo dell'utente.
 */
export default function QuizSettimanale({ quiz }: { quiz: QuizSettimanale }) {
  const [fase, setFase] = useState<Fase>('intro');
  const [indice, setIndice] = useState(0);
  const [risposte, setRisposte] = useState<RispostaQuiz[]>([]);
  /** Per ogni domanda, la permutazione con cui mostrare le opzioni. Calcolata all'avvio, sul client. */
  const [ordineOpzioni, setOrdineOpzioni] = useState<number[][]>([]);
  /** Indice (editoriale) dell'opzione scelta per la domanda corrente, finché non si passa alla successiva. */
  const [scelta, setScelta] = useState<number | null>(null);

  const domandaCorrente = quiz.domande[indice];
  const ultima = indice === quiz.domande.length - 1;

  const inizia = useCallback(() => {
    setOrdineOpzioni(quiz.domande.map((d) => mescolaIndici(d.opzioni.length)));
    setIndice(0);
    setRisposte([]);
    setScelta(null);
    setFase('quiz');
  }, [quiz.domande]);

  const rispondi = useCallback(
    (indiceEditoriale: number) => {
      if (scelta !== null) return;
      setScelta(indiceEditoriale);
      setRisposte((prev) => [
        ...prev,
        {
          domandaId: domandaCorrente.id,
          rispostaSelezionata: indiceEditoriale,
          corretta: indiceEditoriale === domandaCorrente.rispostaCorretta,
        },
      ]);
    },
    [domandaCorrente, scelta],
  );

  const avanti = useCallback(() => {
    if (ultima) {
      setFase('risultati');
    } else {
      setIndice((i) => i + 1);
    }
    setScelta(null);
  }, [ultima]);

  const ricomincia = useCallback(() => {
    setFase('intro');
    setIndice(0);
    setRisposte([]);
    setScelta(null);
  }, []);

  if (fase === 'intro') {
    return <SchermataIntroQuiz quiz={quiz} onInizia={inizia} />;
  }

  if (fase === 'quiz') {
    return (
      <SchermataDomandaQuiz
        quiz={quiz}
        indiceCorrente={indice}
        domanda={domandaCorrente}
        ordineOpzioni={ordineOpzioni[indice] ?? domandaCorrente.opzioni.map((_, i) => i)}
        scelta={scelta}
        ultima={ultima}
        onRispondi={rispondi}
        onAvanti={avanti}
      />
    );
  }

  return <SchermataRisultatiQuiz quiz={quiz} risposte={risposte} onRicomincia={ricomincia} />;
}
