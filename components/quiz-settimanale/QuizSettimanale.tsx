'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { QuizSettimanale } from '@politicare/motore';
import SchermataIntroQuiz from './SchermataIntroQuiz';
import SchermataDomandaQuiz from './SchermataDomandaQuiz';
import SchermataRisultatiQuiz from './SchermataRisultatiQuiz';

type Fase = 'intro' | 'quiz' | 'risultati';

interface RispostaUtente {
  domandaId: string;
  rispostaSelezionata: number;
  corretta: boolean;
}

export default function QuizSettimanale({ quiz }: { quiz: QuizSettimanale }) {
  const [fase, setFase] = useState<Fase>('intro');
  const [indice, setIndice] = useState(0);
  const [risposte, setRisposte] = useState<RispostaUtente[]>([]);

  const domandaCorrente = quiz.domande[indice];
  const ultima = indice === quiz.domande.length - 1;

  const rispondi = useCallback(
    (idxRisposta: number) => {
      const corretta = idxRisposta === domandaCorrente.rispostaCorretta;
      setRisposte((prev) => [
        ...prev,
        {
          domandaId: domandaCorrente.id,
          rispostaSelezionata: idxRisposta,
          corretta,
        },
      ]);

      if (ultima) {
        setFase('risultati');
      } else {
        setIndice((i) => i + 1);
      }
    },
    [domandaCorrente, ultima],
  );

  const ricomincia = useCallback(() => {
    setFase('intro');
    setIndice(0);
    setRisposte([]);
  }, []);

  if (fase === 'intro') {
    return <SchermataIntroQuiz quiz={quiz} onInizia={() => setFase('quiz')} />;
  }

  if (fase === 'quiz') {
    return (
      <SchermataDomandaQuiz
        quiz={quiz}
        indiceCorrente={indice}
        domanda={domandaCorrente}
        onRispondi={rispondi}
      />
    );
  }

  return <SchermataRisultatiQuiz quiz={quiz} risposte={risposte} onRicomincia={ricomincia} />;
}
