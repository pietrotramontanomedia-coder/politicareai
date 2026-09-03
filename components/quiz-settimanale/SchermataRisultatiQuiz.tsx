'use client';

import { motion } from 'framer-motion';
import type { QuizSettimanale } from '@politicare/motore';

interface RispostaUtente {
  domandaId: string;
  rispostaSelezionata: number;
  corretta: boolean;
}

interface Props {
  quiz: QuizSettimanale;
  risposte: RispostaUtente[];
  onRicomincia: () => void;
}

export default function SchermataRisultatiQuiz({ quiz, risposte, onRicomincia }: Props) {
  const corrette = risposte.filter((r) => r.corretta).length;
  const percentuale = Math.round((corrette / quiz.domande.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16"
    >
      <p className="text-center text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
        Quiz Completato!
      </p>
      <h1 className="mt-4 text-center text-4xl font-bold">
        {percentuale}%
      </h1>
      <p className="mt-2 text-center text-lg" style={{ color: 'var(--fg-muta)' }}>
        Hai risposto correttamente a {corrette} su {quiz.domande.length} domande
      </p>

      <div className="mt-10 space-y-4">
        {quiz.domande.map((domanda, idx) => {
          const risposta = risposte[idx];
          return (
            <motion.div
              key={domanda.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-lg border p-4"
              style={{
                borderColor: risposta.corretta ? '#22c55e' : '#ef4444',
                background: risposta.corretta ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
              }}
            >
              <p className="font-medium">{domanda.testo}</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--fg-muta)' }}>
                <strong>Spiegazione:</strong> {domanda.spiegazione}
              </p>
            </motion.div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onRicomincia}
        className="mt-10 mx-auto inline-flex items-center justify-center rounded-xl px-8 py-4 text-base font-bold text-gray-900"
        style={{ background: 'var(--accento)' }}
      >
        Rifai Quiz →
      </button>
    </motion.div>
  );
}
