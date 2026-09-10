'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { puntiEmiciclo } from '@/lib/simulatore-elettorale';
import { TESTI_STRUMENTI as T } from '@/lib/strumenti';

/* Anteprime animate degli strumenti: mostrano cosa si fa, non cosa si legge. Sono decorative. */

const RIQUADRO = {
  borderColor: 'rgba(255,255,255,0.08)',
  background: 'rgba(0,0,0,0.32)',
};

/** Avanza un contatore a intervalli, fermo se l'utente preferisce meno movimento. */
function useCiclo(lunghezza: number, ms: number): number {
  const ridotto = useReducedMotion();
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    if (ridotto) return;
    const timer = setInterval(() => setPasso((p) => (p + 1) % lunghezza), ms);
    return () => clearInterval(timer);
  }, [ridotto, lunghezza, ms]);
  return passo;
}

const SCELTE_TEST = [4, 1, 3, 0, 2];

export function AnteprimaTest() {
  const scelta = SCELTE_TEST[useCiclo(SCELTE_TEST.length, 1600)];
  const a = T.anteprimaTest;

  return (
    <div className="rounded-2xl border p-4 sm:p-5" style={RIQUADRO} aria-hidden>
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muta)' }}>
        {a.contatore}
      </p>
      <p className="mt-1.5 text-base font-semibold leading-snug sm:text-lg">{a.affermazione}</p>
      <div className="mt-4 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n, i) => (
          <span key={n} className="relative flex h-10 flex-1 items-center justify-center">
            {i === scelta && (
              <motion.span
                layoutId="anteprima-test-scelta"
                className="absolute inset-0 rounded-xl"
                style={{
                  boxShadow: `inset 0 0 0 2px var(--color-scala-${n})`,
                  background: `color-mix(in srgb, var(--color-scala-${n}) 16%, transparent)`,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative h-3.5 w-3.5 rounded-full" style={{ background: `var(--color-scala-${n})` }} />
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: 'var(--fg-muta)' }}>
        <span>{a.estremi[0]}</span>
        <span>{a.estremi[1]}</span>
      </div>
    </div>
  );
}

export function AnteprimaQuiz() {
  const rivelata = useCiclo(2, 1700) === 1;
  const q = T.anteprimaQuiz;

  return (
    <div className="rounded-2xl border p-3" style={RIQUADRO} aria-hidden>
      <div className="flex gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i < 3 ? '#A78BFA' : 'rgba(255,255,255,0.12)' }} />
        ))}
      </div>
      <p className="mt-2.5 text-xs font-semibold leading-snug">{q.domanda}</p>
      <ul className="mt-2 space-y-1.5">
        {q.opzioni.map((opzione, i) => {
          const giusta = rivelata && i === q.giusta;
          return (
            <li
              key={opzione}
              className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-medium tabular-nums"
              style={{
                borderColor: giusta ? 'rgba(52,211,153,0.6)' : 'rgba(255,255,255,0.08)',
                background: giusta ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.03)',
              }}
            >
              {opzione}
              {giusta && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sm font-bold" style={{ color: '#34D399' }}>
                  ✓
                </motion.span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const BARRE_RISULTATO = [
  { valore: 78, colore: 'var(--color-scala-5)' },
  { valore: 71, colore: 'var(--color-scala-4)' },
  { valore: 52, colore: 'var(--color-scala-2)' },
  { valore: 34, colore: 'var(--color-scala-1)' },
];

/** Classifica anonima del risultato: nessun nome di partito, solo la forma del risultato. */
export function AnteprimaRisultato() {
  const riquadro = useRef<HTMLDivElement>(null);
  const inVista = useInView(riquadro, { once: true, margin: '-40px' });
  const r = T.anteprimaRisultato;

  return (
    <div ref={riquadro} className="rounded-2xl border p-4" style={RIQUADRO} aria-hidden>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muta)' }}>
          {r.titolo}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--fg-muta)' }}>
          {r.nota}
        </p>
      </div>
      <ul className="mt-3 space-y-2.5">
        {BARRE_RISULTATO.map((barra, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="w-4 text-right text-xs font-bold tabular-nums" style={{ color: 'var(--fg-muta)' }}>
              {i + 1}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.span
                className="block h-full rounded-full"
                style={{ background: barra.colore }}
                initial={{ width: 0 }}
                animate={{ width: inVista ? `${barra.valore}%` : 0 }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className="w-9 text-right text-xs font-semibold tabular-nums">{barra.valore}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const RIGHE_CONFRONTO = [
  { etichetta: T.anteprimaConfronta.favorevoli, colore: 'var(--color-scala-5)', punti: ['#60A5FA', '#34D399', '#FEDC01', '#F472B6', '#A78BFA'] },
  { etichetta: T.anteprimaConfronta.contrari, colore: 'var(--color-scala-1)', punti: ['#F87171', '#FB923C', '#E4E4E7'] },
];

export function AnteprimaConfronta() {
  const riquadro = useRef<HTMLDivElement>(null);
  // Stato esplicito invece di whileInView: la card che la contiene governa già le proprie varianti.
  const inVista = useInView(riquadro, { once: true, margin: '-40px' });

  return (
    <div ref={riquadro} className="space-y-2.5 rounded-2xl border p-3" style={RIQUADRO} aria-hidden>
      {RIGHE_CONFRONTO.map((riga, r) => (
        <div key={riga.etichetta}>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: riga.colore }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: riga.colore }} />
            {riga.etichetta}
          </p>
          <motion.div
            className="mt-1.5 flex -space-x-1.5"
            initial="nascosto"
            animate={inVista ? 'visibile' : 'nascosto'}
            variants={{ visibile: { transition: { staggerChildren: 0.08, delayChildren: 0.2 + r * 0.3 } } }}
          >
            {riga.punti.map((colore, i) => (
              <motion.span
                key={i}
                className="h-6 w-6 rounded-full border-2"
                style={{ background: colore, borderColor: '#141414' }}
                variants={{ nascosto: { scale: 0, opacity: 0 }, visibile: { scale: 1, opacity: 1 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              />
            ))}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

const PUNTI_ANTEPRIMA = puntiEmiciclo(84, 6);
const SCENARI: [string, number][][] = [
  [
    ['#60A5FA', 46],
    ['#FEDC01', 12],
    ['#F87171', 26],
  ],
  [
    ['#60A5FA', 28],
    ['#FEDC01', 18],
    ['#F87171', 38],
  ],
];
const COLORI_SCENARI = SCENARI.map((s) => s.flatMap(([colore, n]) => Array<string>(n).fill(colore)));

export function AnteprimaSimulatore() {
  const colori = COLORI_SCENARI[useCiclo(COLORI_SCENARI.length, 2600)];

  return (
    <div className="rounded-2xl border px-4 pb-2 pt-4" style={RIQUADRO} aria-hidden>
      <svg viewBox="-1.08 -1.08 2.16 1.14" className="w-full">
        <line x1={0} y1={-1.06} x2={0} y2={0.02} stroke="rgba(255,255,255,0.28)" strokeWidth={0.012} strokeDasharray="0.04 0.03" />
        {PUNTI_ANTEPRIMA.map((p, i) => (
          <circle key={i} cx={p.x} cy={-p.y} r={0.045} fill={colori[i]} style={{ transition: 'fill 0.5s ease' }} />
        ))}
      </svg>
      <p className="-mt-1 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muta)' }}>
        {T.anteprimaSimulatore.maggioranza}
      </p>
    </div>
  );
}

const CARTE = [
  { riposo: { rotate: -14, x: -30, y: 6 }, hover: { rotate: -24, x: -52, y: 4 }, colore: '#A78BFA' },
  { riposo: { rotate: 12, x: 30, y: 6 }, hover: { rotate: 22, x: 52, y: 4 }, colore: '#F472B6' },
  { riposo: { rotate: 0, x: 0, y: 0 }, hover: { rotate: 0, x: 0, y: -10 }, colore: '#FEDC01' },
];

/** Ventaglio di carte: si apre al passaggio del mouse sulla card che lo contiene. */
export function AnteprimaGioco() {
  return (
    <div className="relative mx-auto h-32 w-48" aria-hidden>
      {CARTE.map((carta, i) => (
        <motion.div
          key={i}
          className="carta-gioco absolute flex h-28 w-20 flex-col justify-between rounded-xl border p-2"
          style={{ left: 'calc(50% - 2.5rem)', top: 'calc(50% - 3.5rem)', borderColor: 'rgba(255,255,255,0.12)' }}
          variants={{ riposo: carta.riposo, hover: carta.hover }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <span className="h-3 w-3 rounded-full" style={{ background: carta.colore }} />
          <span className="space-y-1">
            <span className="block h-1 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
            <span className="block h-1 w-7 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </span>
          <span className="self-end text-[10px] font-bold" style={{ color: carta.colore }}>
            {i + 1}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
