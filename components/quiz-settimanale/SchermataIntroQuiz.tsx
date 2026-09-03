'use client';

import { motion } from 'framer-motion';
import type { QuizSettimanale } from '@politicare/motore';

interface Props {
  quiz: QuizSettimanale;
  onInizia: () => void;
}

export default function SchermataIntroQuiz({ quiz, onInizia }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16"
    >
      <p className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
        Quiz Settimanale
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{quiz.titolo}</h1>
      <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
        {quiz.descrizione}
      </p>

      <div className="mt-8 rounded-xl border p-4" style={{ borderColor: 'var(--bordo)', background: 'rgba(255,221,0,0.03)' }}>
        <p className="text-sm">
          <strong style={{ color: 'var(--accento)' }}>{quiz.domande.length} domande</strong> su fatti politici della settimana.
          Testa le tue conoscenze!
        </p>
      </div>

      <button
        type="button"
        onClick={onInizia}
        className="mt-10 inline-flex items-center justify-center rounded-xl px-8 py-4 text-base font-bold text-gray-900"
        style={{ background: 'var(--accento)' }}
      >
        Inizia Quiz →
      </button>
    </motion.div>
  );
}
