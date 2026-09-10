'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { DomandaQuiz, QuizSettimanale } from '@politicare/motore';
import { ETICHETTE_DIFFICOLTA, TESTI_QUIZ } from '@/lib/quiz';

interface Props {
  quiz: QuizSettimanale;
  indiceCorrente: number;
  domanda: DomandaQuiz;
  /** Permutazione degli indici editoriali con cui mostrare le opzioni. */
  ordineOpzioni: number[];
  /** Indice editoriale scelto, oppure null finché l'utente non ha risposto. */
  scelta: number | null;
  ultima: boolean;
  onRispondi: (indiceEditoriale: number) => void;
  onAvanti: () => void;
}

const VERDE = '#22c55e';
const ROSSO = '#f87171';

export default function SchermataDomandaQuiz({
  quiz,
  indiceCorrente,
  domanda,
  ordineOpzioni,
  scelta,
  ultima,
  onRispondi,
  onAvanti,
}: Props) {
  const riduciMovimento = useReducedMotion();
  const sezione = quiz.sezioni.find((s) => s.id === domanda.sezione);
  const difficolta = ETICHETTE_DIFFICOLTA[domanda.difficolta];
  const totale = quiz.domande.length;
  const haRisposto = scelta !== null;
  const corretta = haRisposto && scelta === domanda.rispostaCorretta;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-16">
      {/* Avanzamento a segmenti: uno per domanda, colorato in base all'esito */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm" style={{ color: 'var(--fg-muta)' }}>
          <span>{TESTI_QUIZ.domandaDi(indiceCorrente + 1, totale)}</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>{sezione?.icona}</span>
            {sezione?.titolo}
          </span>
        </div>
        <ol
          className="mt-2 flex gap-1.5"
          role="progressbar"
          aria-valuenow={indiceCorrente + 1}
          aria-valuemin={1}
          aria-valuemax={totale}
          aria-label="Avanzamento del quiz"
        >
          {quiz.domande.map((d, i) => {
            const attiva = i === indiceCorrente;
            const passata = i < indiceCorrente || (attiva && haRisposto);
            return (
              <li
                key={d.id}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background: passata ? 'var(--accento)' : attiva ? 'rgba(254,220,1,0.35)' : 'var(--color-bar-bg)',
                }}
              />
            );
          })}
        </ol>
      </div>

      <AnimatePresence mode="wait">
        <motion.article
          key={domanda.id}
          initial={riduciMovimento ? undefined : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={riduciMovimento ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="rounded-3xl border p-6 sm:p-8"
          style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: 'var(--bordo)' }}
            >
              <span aria-hidden>{sezione?.icona}</span>
              {sezione?.titolo ?? domanda.sezione}
            </span>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: difficolta.sfondo, color: difficolta.colore }}
            >
              {difficolta.label}
            </span>
          </div>

          <h2 className="mt-4 text-xl leading-snug font-semibold text-balance sm:text-2xl">{domanda.testo}</h2>

          <ul className="mt-6 space-y-3" aria-label="Risposte possibili">
            {ordineOpzioni.map((indiceEditoriale, posizione) => {
              const testo = domanda.opzioni[indiceEditoriale];
              const eCorretta = indiceEditoriale === domanda.rispostaCorretta;
              const eScelta = scelta === indiceEditoriale;
              const evidenzia = haRisposto && (eCorretta || eScelta);
              const colore = eCorretta ? VERDE : ROSSO;

              return (
                <li key={indiceEditoriale}>
                  <button
                    type="button"
                    disabled={haRisposto}
                    onClick={() => onRispondi(indiceEditoriale)}
                    aria-pressed={eScelta}
                    className="flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-default"
                    style={{
                      borderColor: evidenzia ? colore : 'var(--bordo)',
                      background: evidenzia ? `${colore}14` : 'var(--bg-elevated)',
                      opacity: haRisposto && !evidenzia ? 0.55 : 1,
                    }}
                  >
                    <span
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: evidenzia ? colore : 'rgba(254,220,1,0.12)',
                        color: evidenzia ? '#0a0a0a' : 'var(--accento)',
                      }}
                    >
                      {String.fromCharCode(65 + posizione)}
                    </span>
                    <span className="flex-1">{testo}</span>
                    {evidenzia && (
                      <span className="sr-only">{eCorretta ? TESTI_QUIZ.giusta : TESTI_QUIZ.sbagliata}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Riscontro immediato: esito, spiegazione, fonte */}
          <AnimatePresence>
            {haRisposto && (
              <motion.section
                initial={riduciMovimento ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-6 rounded-2xl border p-5"
                style={{
                  borderColor: corretta ? VERDE : ROSSO,
                  background: corretta ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                }}
                aria-live="polite"
              >
                <p className="text-sm font-bold" style={{ color: corretta ? VERDE : ROSSO }}>
                  {corretta ? TESTI_QUIZ.giusta : TESTI_QUIZ.sbagliata}
                </p>
                {!corretta && (
                  <p className="mt-1 text-sm">
                    {TESTI_QUIZ.rispostaCorretta}: <strong>{domanda.opzioni[domanda.rispostaCorretta]}</strong>
                  </p>
                )}
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
                  {domanda.spiegazione}
                </p>
                <p className="mt-3 text-xs" style={{ color: 'var(--fg-muta)' }}>
                  {TESTI_QUIZ.fonte}:{' '}
                  <a
                    href={domanda.fonte.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:opacity-80"
                    style={{ color: 'var(--accento)' }}
                  >
                    {domanda.fonte.citazione}
                  </a>
                </p>
              </motion.section>
            )}
          </AnimatePresence>
        </motion.article>
      </AnimatePresence>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onAvanti}
          disabled={!haRisposto}
          className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-bold text-gray-900 transition-opacity disabled:opacity-30"
          style={{ background: 'var(--accento)' }}
        >
          {ultima ? TESTI_QUIZ.vediRisultati : TESTI_QUIZ.prossima} →
        </button>
      </div>
    </div>
  );
}
