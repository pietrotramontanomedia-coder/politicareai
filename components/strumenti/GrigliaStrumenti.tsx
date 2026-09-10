'use client';

import Link from 'next/link';
import { motion, MotionConfig } from 'framer-motion';
import { IconaStrumento } from './IconaStrumento';
import { AnteprimaConfronta, AnteprimaGioco, AnteprimaQuiz, AnteprimaRisultato, AnteprimaSimulatore, AnteprimaTest } from './Anteprime';
import { conAlfa, STRUMENTI, type Strumento } from '@/lib/strumenti';

type Variante = 'grande' | 'compatta' | 'media' | 'larga';

const ENTRATA = {
  nascosto: { opacity: 0, y: 18 },
  visibile: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

/** Griglia a mosaico: ogni strumento ha colore, forma e anteprima propri. */
export default function GrigliaStrumenti() {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        initial="nascosto"
        whileInView="visibile"
        viewport={{ once: true, margin: '-60px' }}
        variants={{ visibile: { transition: { staggerChildren: 0.08 } } }}
      >
        <Cella className="col-span-2 lg:row-span-2">
          <CardStrumento
            strumento={STRUMENTI.test}
            variante="grande"
            anteprima={<AnteprimaTest />}
            extraSchermoLargo={<AnteprimaRisultato />}
          />
        </Cella>
        <Cella className="col-span-1">
          <CardStrumento strumento={STRUMENTI.quiz} variante="compatta" anteprima={<AnteprimaQuiz />} />
        </Cella>
        <Cella className="col-span-1">
          <CardStrumento strumento={STRUMENTI.confronta} variante="compatta" anteprima={<AnteprimaConfronta />} />
        </Cella>
        <Cella className="col-span-2">
          <CardStrumento strumento={STRUMENTI.simulatore} variante="media" anteprima={<AnteprimaSimulatore />} />
        </Cella>
        <Cella className="col-span-2 lg:col-span-4">
          <CardStrumento strumento={STRUMENTI.gioco} variante="larga" anteprima={<AnteprimaGioco />} />
        </Cella>
      </motion.div>
    </MotionConfig>
  );
}

function Cella({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <motion.div className={className} variants={ENTRATA}>
      {children}
    </motion.div>
  );
}

interface PropsCard {
  strumento: Strumento;
  variante: Variante;
  anteprima: React.ReactNode;
  /** Seconda anteprima, solo dove la card è alta due righe (schermi larghi). */
  extraSchermoLargo?: React.ReactNode;
}

function CardStrumento({ strumento: s, variante, anteprima, extraSchermoLargo }: PropsCard) {
  const compatta = variante === 'compatta';
  const orizzontale = variante === 'media' || variante === 'larga';

  return (
    <Link href={s.href} className="group block h-full rounded-3xl">
      <motion.article
        initial="riposo"
        animate="riposo"
        whileHover="hover"
        whileTap={{ scale: 0.98 }}
        variants={{ riposo: { y: 0 }, hover: { y: -4 } }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className={`relative flex h-full overflow-hidden rounded-3xl border ${compatta ? 'p-3.5 sm:p-5' : 'p-5 sm:p-6'} ${
          orizzontale ? 'flex-col gap-5 sm:flex-row sm:items-center' : 'flex-col'
        }`}
        style={{
          borderColor: conAlfa(s.colore, 0.22),
          background: `radial-gradient(120% 90% at 100% 0%, ${conAlfa(s.colore, 0.16)}, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.025), transparent 40%), var(--bg-card)`,
        }}
      >
        {/* Alone che si accende al passaggio */}
        <span
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: `inset 0 0 0 1px ${conAlfa(s.colore, 0.5)}, 0 0 40px ${conAlfa(s.colore, 0.12)}` }}
          aria-hidden
        />

        <div className={`relative flex flex-col ${orizzontale ? 'sm:flex-1' : 'flex-1'}`}>
          <span
            className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: conAlfa(s.colore, 0.14), color: s.colore }}
          >
            <IconaStrumento id={s.id} className="h-3.5 w-3.5" spessore={2} />
            {s.nome}
          </span>

          {!orizzontale && <div className={compatta ? 'mt-3' : 'mt-5'}>{anteprima}</div>}

          <h3 className={`font-bold leading-tight ${compatta ? 'mt-3 text-base sm:text-lg' : 'mt-4 text-2xl sm:text-3xl'}`}>{s.titolo}</h3>
          <p className={`mt-2 text-sm leading-relaxed ${compatta ? 'hidden sm:block' : ''}`} style={{ color: 'var(--fg-muta)' }}>
            {s.descrizione}
          </p>

          {extraSchermoLargo && <div className="mt-5 hidden lg:block">{extraSchermoLargo}</div>}

          <div
            className={`mt-auto flex gap-3 ${
              compatta ? 'items-center justify-between pt-3' : 'flex-col pt-5 sm:flex-row sm:items-center sm:justify-between'
            }`}
          >
            <ul className="flex min-w-0 flex-wrap gap-1.5">
              {s.meta.map((m, i) => (
                <li
                  key={m}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${compatta && i > 0 ? 'hidden' : ''}`}
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--fg-muta)' }}
                >
                  {m}
                </li>
              ))}
            </ul>
            <Azione strumento={s} compatta={compatta} />
          </div>
        </div>

        {orizzontale && (
          <div className={`relative order-first sm:order-none ${variante === 'larga' ? 'sm:w-64' : 'sm:w-72 lg:w-56'}`}>{anteprima}</div>
        )}
      </motion.article>
    </Link>
  );
}

/** Il bottone d'azione, nel colore dello strumento: è quello che distingue uno strumento da un articolo. */
function Azione({ strumento: s, compatta }: { strumento: Strumento; compatta: boolean }) {
  if (compatta) {
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5"
        style={{ background: s.colore, color: '#0a0a0a' }}
        aria-hidden
      >
        <IconaStrumento id="freccia" className="h-4 w-4" spessore={2.4} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full py-2.5 pl-4 pr-3 text-sm font-bold sm:w-auto sm:py-2"
      style={{ background: s.colore, color: '#0a0a0a', boxShadow: `0 6px 20px ${conAlfa(s.colore, 0.25)}` }}
    >
      {s.azione}
      <IconaStrumento id="freccia" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" spessore={2.4} />
    </span>
  );
}
