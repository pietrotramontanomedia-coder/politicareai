'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { QuizSettimanale } from '@politicare/motore';
import { contaPerDifficolta, contaPerSezione, DIFFICOLTA_ORDINATE } from '@politicare/motore';
import Logo from '@/components/Logo';
import { ETICHETTE_DIFFICOLTA, TESTI_QUIZ } from '@/lib/quiz';

interface Props {
  quiz: QuizSettimanale;
  onInizia: () => void;
}

export default function SchermataIntroQuiz({ quiz, onInizia }: Props) {
  const riduciMovimento = useReducedMotion();
  const perSezione = contaPerSezione(quiz.domande);
  const perDifficolta = contaPerDifficolta(quiz.domande);
  const entra = (ritardo: number) => ({
    initial: riduciMovimento ? undefined : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: ritardo },
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-16">
      <motion.div {...entra(0)} className="mb-8 flex justify-center">
        <Logo size="md" />
      </motion.div>

      {/* Testata: etichetta, numero della settimana, periodo coperto */}
      <motion.header {...entra(0.05)} className="text-center">
        <p className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
          {quiz.titolo}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{quiz.sottotitolo}</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {TESTI_QUIZ.periodo(quiz.periodo.dal, quiz.periodo.al)}
        </p>
      </motion.header>

      <motion.p
        {...entra(0.1)}
        className="mt-6 text-center text-base leading-relaxed text-balance sm:text-lg"
        style={{ color: 'var(--fg-muta)' }}
      >
        {quiz.descrizione}
      </motion.p>

      {/* Sezioni: quante domande per ciascuna */}
      <motion.ul {...entra(0.15)} className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Sezioni del quiz">
        {quiz.sezioni.map((sezione) => (
          <li
            key={sezione.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-lg font-semibold">
                <span aria-hidden>{sezione.icona}</span>
                {sezione.titolo}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums"
                style={{ background: 'rgba(254,220,1,0.12)', color: 'var(--accento)' }}
              >
                {perSezione[sezione.id] ?? 0} domande
              </span>
            </div>
            {sezione.descrizione && (
              <p className="mt-2 text-sm" style={{ color: 'var(--fg-muta)' }}>
                {sezione.descrizione}
              </p>
            )}
          </li>
        ))}
      </motion.ul>

      {/* Difficoltà: distribuzione dichiarata */}
      <motion.ul {...entra(0.2)} className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Difficoltà delle domande">
        {DIFFICOLTA_ORDINATE.map((difficolta) => {
          const { label, colore, sfondo } = ETICHETTE_DIFFICOLTA[difficolta];
          return (
            <li
              key={difficolta}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium tabular-nums"
              style={{ background: sfondo, color: colore }}
            >
              {perDifficolta[difficolta]} {label.toLowerCase()}
            </li>
          );
        })}
      </motion.ul>

      {/* Regole del gioco */}
      <motion.section
        {...entra(0.25)}
        className="mt-8 rounded-2xl border p-5"
        style={{ borderColor: 'var(--bordo)', background: 'rgba(254,220,1,0.03)' }}
        aria-labelledby="come-funziona"
      >
        <h2 id="come-funziona" className="text-sm font-semibold tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
          {TESTI_QUIZ.comeFunziona.titolo}
        </h2>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          {TESTI_QUIZ.comeFunziona.punti.map((punto, i) => (
            <li key={punto} className="flex gap-3">
              <span className="font-semibold tabular-nums" style={{ color: 'var(--fg)' }}>
                {i + 1}.
              </span>
              <span>{punto}</span>
            </li>
          ))}
        </ol>
      </motion.section>

      <motion.div {...entra(0.3)} className="mt-8 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onInizia}
          className="inline-flex w-full items-center justify-center rounded-xl px-8 py-4 text-base font-bold text-gray-900 sm:w-auto"
          style={{ background: 'var(--accento)' }}
        >
          {TESTI_QUIZ.inizia} →
        </button>
        <p className="text-center text-xs" style={{ color: 'var(--fg-muta)' }}>
          {TESTI_QUIZ.autori(quiz.autori)} · {TESTI_QUIZ.versione(quiz.versione, quiz.data)}
        </p>
      </motion.div>
    </div>
  );
}
