'use client';

import { motion } from 'framer-motion';
import type { DomandaQuiz, QuizSettimanale } from '@politicare/motore';

interface Props {
  quiz: QuizSettimanale;
  indiceCorrente: number;
  domanda: DomandaQuiz;
  onRispondi: (idxRisposta: number) => void;
}

export default function SchermataDomandaQuiz({ quiz, indiceCorrente, domanda, onRispondi }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16"
    >
      <div className="mb-8 flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--fg-muta)' }}>
          Domanda {indiceCorrente + 1} di {quiz.domande.length}
        </p>
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background:
              domanda.difficolta === 'facile'
                ? 'rgba(34,197,94,0.2)'
                : domanda.difficolta === 'media'
                  ? 'rgba(251,191,36,0.2)'
                  : 'rgba(239,68,68,0.2)',
            color:
              domanda.difficolta === 'facile'
                ? '#22c55e'
                : domanda.difficolta === 'media'
                  ? '#fbbf24'
                  : '#ef4444',
          }}
        >
          {domanda.difficolta}
        </span>
      </div>

      <div className="mb-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-bar-bg)' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ background: 'var(--accento)', width: `${((indiceCorrente + 1) / quiz.domande.length) * 100}%` }}
        />
      </div>

      <h2 className="mt-8 text-2xl font-bold">{domanda.testo}</h2>

      <div className="mt-8 space-y-3">
        {domanda.opzioni.map((opzione, idx) => (
          <motion.button
            key={idx}
            onClick={() => onRispondi(idx)}
            whileHover={{ scale: 1.02 }}
            className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-opacity-50"
            style={{
              borderColor: 'var(--bordo)',
              background: 'var(--bg-card)',
            }}
          >
            <span className="font-semibold" style={{ color: 'var(--accento)' }}>
              {String.fromCharCode(65 + idx)}.
            </span>{' '}
            {opzione}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
