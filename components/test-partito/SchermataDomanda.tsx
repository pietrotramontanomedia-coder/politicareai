'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Affermazione, Valore } from '@politicare/motore';
import { etichettaArea } from '@/lib/aree';
import ScalaAccordo from './ScalaAccordo';

interface Props {
  affermazione: Affermazione;
  valore: Valore | null;
  importante: boolean;
  puoTornareIndietro: boolean;
  onRispondi: (valore: Valore) => void;
  onSalta: () => void;
  onToggleImportante: () => void;
  onIndietro: () => void;
}

export default function SchermataDomanda({
  affermazione,
  valore,
  importante,
  puoTornareIndietro,
  onRispondi,
  onSalta,
  onToggleImportante,
  onIndietro,
}: Props) {
  const riduciMovimento = useReducedMotion();
  const { label, icona } = etichettaArea(affermazione.area);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={affermazione.id}
        initial={riduciMovimento ? undefined : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={riduciMovimento ? undefined : { opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="rounded-3xl border p-6 sm:p-8"
        style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
      >
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: 'var(--bordo)' }}
        >
          <span aria-hidden>{icona}</span>
          {label}
        </span>

        <p className="mt-4 text-xl leading-snug font-medium text-balance sm:text-2xl">
          {affermazione.testo}
        </p>

        <div className="mt-6">
          <ScalaAccordo valoreSelezionato={valore} onSeleziona={onRispondi} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--fg-muta)' }}>
            <input
              type="checkbox"
              checked={importante}
              onChange={onToggleImportante}
              className="h-4 w-4 rounded"
            />
            È un tema a cui tieni particolarmente
          </label>

          <div className="flex items-center gap-4">
            {puoTornareIndietro && (
              <button
                type="button"
                onClick={onIndietro}
                className="text-sm font-medium underline-offset-4 hover:underline"
                style={{ color: 'var(--fg-muta)' }}
              >
                ← Indietro
              </button>
            )}
            <button
              type="button"
              onClick={onSalta}
              className="text-sm font-medium underline-offset-4 hover:underline"
              style={{ color: 'var(--fg-muta)' }}
            >
              Salta →
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
