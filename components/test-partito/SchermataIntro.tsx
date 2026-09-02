'use client';

import { motion } from 'framer-motion';
import type { TestPartitoPack } from '@politicare/motore';
import { etichettaArea } from '@/lib/aree';

interface Props {
  pack: TestPartitoPack;
  onInizia: () => void;
}

export default function SchermataIntro({ pack, onInizia }: Props) {
  const aree = Object.keys(pack.quotePerArea);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16"
    >
      <p className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
        Test dei partiti
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Con quale partito sei più allineato?
      </h1>
      <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
        {pack.affermazioni.length} affermazioni concrete, una alla volta. Rispondi quanto sei
        d&apos;accordo, salta quelle che non ti convincono, segna come importanti quelle a cui
        tieni di più. Alla fine vedi la classifica completa, non un solo verdetto.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {aree.map((area) => {
          const { label, icona } = etichettaArea(area);
          return (
            <span
              key={area}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
              style={{ borderColor: 'var(--bordo)' }}
            >
              <span aria-hidden>{icona}</span>
              {label}
            </span>
          );
        })}
      </div>

      <div
        className="mt-8 rounded-2xl border p-4 text-sm leading-relaxed"
        style={{ borderColor: 'var(--bordo)', background: 'var(--bg-alta)', color: 'var(--fg-muta)' }}
      >
        <strong style={{ color: 'var(--fg)' }}>Le tue risposte restano sul tuo dispositivo.</strong>{' '}
        Il calcolo avviene nel browser: nessuna risposta viene inviata o salvata su un server.
      </div>

      <button
        type="button"
        onClick={onInizia}
        className="mt-10 inline-flex items-center justify-center self-start rounded-full px-7 py-3.5 text-base font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: 'var(--color-terra)' }}
      >
        Comincia →
      </button>

      <p className="mt-4 text-sm" style={{ color: 'var(--fg-muta)' }}>
        Circa {Math.max(1, Math.round(pack.affermazioni.length * 0.3))} minuti. Pack di contenuto
        v{pack.versione}.
      </p>
    </motion.div>
  );
}
