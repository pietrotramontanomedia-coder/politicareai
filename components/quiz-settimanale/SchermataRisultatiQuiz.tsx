'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { DifficoltaQuiz, QuizSettimanale, RiepilogoGruppo, RispostaQuiz } from '@politicare/motore';
import { riepilogaQuiz } from '@politicare/motore';
import { ETICHETTE_DIFFICOLTA, TESTI_QUIZ } from '@/lib/quiz';
import { CondividiQuiz } from '@/components/condivisione/Condivisioni';

interface Props {
  quiz: QuizSettimanale;
  risposte: RispostaQuiz[];
  onRicomincia: () => void;
}

const VERDE = '#22c55e';
const ROSSO = '#f87171';

function BarraGruppo({ gruppo, etichetta, icona }: { gruppo: RiepilogoGruppo; etichetta: string; icona?: string }) {
  const quota = gruppo.totale > 0 ? gruppo.corrette / gruppo.totale : 0;
  return (
    <li>
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          {icona && <span aria-hidden>{icona}</span>}
          {etichetta}
        </span>
        <span className="tabular-nums" style={{ color: 'var(--fg-muta)' }}>
          {gruppo.corrette}/{gruppo.totale}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full"
        style={{ background: 'var(--color-bar-bg)' }}
        role="meter"
        aria-valuenow={gruppo.corrette}
        aria-valuemin={0}
        aria-valuemax={gruppo.totale}
        aria-label={etichetta}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accento)' }}
          initial={{ width: 0 }}
          animate={{ width: `${quota * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </li>
  );
}

export default function SchermataRisultatiQuiz({ quiz, risposte, onRicomincia }: Props) {
  const riduciMovimento = useReducedMotion();
  const riepilogo = riepilogaQuiz(quiz, risposte);
  const rispostaDi = new Map(risposte.map((r) => [r.domandaId, r]));
  const sezioneDi = new Map(quiz.sezioni.map((s) => [s.id, s]));

  return (
    <motion.div
      initial={riduciMovimento ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-16"
    >
      {/* Punteggio */}
      <header className="text-center">
        <p className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
          {TESTI_QUIZ.risultati.etichetta}
        </p>
        <p className="mt-1 text-base font-medium">{TESTI_QUIZ.intestazione(quiz)}</p>
        <p className="mt-4 text-6xl font-bold tabular-nums tracking-tight sm:text-7xl">{riepilogo.percentuale}%</p>
        <p className="mt-2 text-lg font-medium">{TESTI_QUIZ.risultati.riepilogo(riepilogo.corrette, riepilogo.totale)}</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {TESTI_QUIZ.risultati.commento(riepilogo.percentuale)}
        </p>
        <div className="mt-6 flex justify-center">
          <CondividiQuiz quiz={quiz} risposte={risposte} percorso={`/quiz-settimanale/${quiz.numero}`} />
        </div>
      </header>

      {/* Dettaglio per sezione e per difficoltà */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <section
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
          aria-labelledby="per-sezione"
        >
          <h2 id="per-sezione" className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--fg-muta)' }}>
            {TESTI_QUIZ.risultati.perSezione}
          </h2>
          <ul className="mt-4 space-y-4">
            {riepilogo.perSezione.map((g) => {
              const sezione = sezioneDi.get(g.id);
              return <BarraGruppo key={g.id} gruppo={g} etichetta={sezione?.titolo ?? g.id} icona={sezione?.icona} />;
            })}
          </ul>
        </section>

        <section
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
          aria-labelledby="per-difficolta"
        >
          <h2 id="per-difficolta" className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--fg-muta)' }}>
            {TESTI_QUIZ.risultati.perDifficolta}
          </h2>
          <ul className="mt-4 space-y-4">
            {riepilogo.perDifficolta.map((g) => (
              <BarraGruppo key={g.id} gruppo={g} etichetta={ETICHETTE_DIFFICOLTA[g.id as DifficoltaQuiz].label} />
            ))}
          </ul>
        </section>
      </div>

      {/* Revisione domanda per domanda, raggruppata per sezione */}
      <h2 className="mt-12 text-2xl font-semibold tracking-tight">{TESTI_QUIZ.risultati.rivedi}</h2>

      {quiz.sezioni.map((sezione) => {
        const domande = quiz.domande.filter((d) => d.sezione === sezione.id);
        if (domande.length === 0) return null;
        return (
          <section key={sezione.id} className="mt-8" aria-labelledby={`rivedi-${sezione.id}`}>
            <h3 id={`rivedi-${sezione.id}`} className="inline-flex items-center gap-2 text-lg font-semibold">
              <span aria-hidden>{sezione.icona}</span>
              {sezione.titolo}
            </h3>
            <ol className="mt-4 space-y-4">
              {domande.map((domanda, idx) => {
                const risposta = rispostaDi.get(domanda.id);
                const corretta = risposta?.corretta ?? false;
                const colore = corretta ? VERDE : ROSSO;
                const difficolta = ETICHETTE_DIFFICOLTA[domanda.difficolta];
                return (
                  <motion.li
                    key={domanda.id}
                    initial={riduciMovimento ? undefined : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-2xl border p-5"
                    style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)', borderLeftWidth: 4, borderLeftColor: colore }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: colore }}>
                        {corretta ? TESTI_QUIZ.giusta : TESTI_QUIZ.sbagliata}
                      </span>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: difficolta.sfondo, color: difficolta.colore }}
                      >
                        {difficolta.label}
                      </span>
                    </div>
                    <p className="mt-2 font-medium leading-snug">{domanda.testo}</p>

                    <dl className="mt-3 space-y-1 text-sm">
                      {!corretta && risposta && (
                        <div className="flex gap-2">
                          <dt className="shrink-0" style={{ color: 'var(--fg-muta)' }}>
                            {TESTI_QUIZ.risultati.tuaRisposta}:
                          </dt>
                          <dd className="line-through" style={{ color: ROSSO }}>
                            {domanda.opzioni[risposta.rispostaSelezionata]}
                          </dd>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <dt className="shrink-0" style={{ color: 'var(--fg-muta)' }}>
                          {TESTI_QUIZ.rispostaCorretta}:
                        </dt>
                        <dd className="font-semibold" style={{ color: VERDE }}>
                          {domanda.opzioni[domanda.rispostaCorretta]}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
                      {domanda.spiegazione}
                    </p>
                    <p className="mt-2 text-xs" style={{ color: 'var(--fg-muta)' }}>
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
                  </motion.li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <div className="mt-12 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onRicomincia}
          className="inline-flex w-full items-center justify-center rounded-xl px-8 py-4 text-base font-bold text-gray-900 sm:w-auto"
          style={{ background: 'var(--accento)' }}
        >
          {TESTI_QUIZ.rifai} →
        </button>
        <p className="text-center text-xs" style={{ color: 'var(--fg-muta)' }}>
          {TESTI_QUIZ.autori(quiz.autori)} · {TESTI_QUIZ.versione(quiz.versione, quiz.data)} ·{' '}
          <Link href="/metodologia" className="underline underline-offset-2" style={{ color: 'var(--accento)' }}>
            Metodologia
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
