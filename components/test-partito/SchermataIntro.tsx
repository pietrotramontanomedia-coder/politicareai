'use client';

import { motion } from 'framer-motion';
import type { TestPartitoPack } from '@politicare/motore';
import { etichettaArea } from '@/lib/aree';
import Logo from '@/components/Logo';

interface Props {
  pack: TestPartitoPack;
  onInizia: () => void;
}

export default function SchermataIntro({ pack, onInizia }: Props) {
  const aree = Object.keys(pack.quotePerArea);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-16"
    >
      {/* Logo Politicare */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8 flex justify-center"
      >
        <Logo size="md" />
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <h1 className="text-center text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Con quale partito sei più allineato?
        </h1>
      </motion.div>

      {/* Descrizione */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-6 text-center text-base leading-relaxed sm:text-lg"
        style={{ color: 'var(--fg-muta)' }}
      >
        {pack.affermazioni.length} affermazioni concrete, una alla volta. <br className="hidden sm:inline" />
        Rispondi con sincerità, salta quelle che non ti convincono, segna come importanti quelle a cui tieni di più.
      </motion.p>

      {/* Aree tematiche */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mt-8 flex justify-center flex-wrap gap-2"
      >
        {aree.map((area, idx) => {
          const { label, icona } = etichettaArea(area);
          return (
            <motion.span
              key={area}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + idx * 0.05 }}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium hover:bg-opacity-50"
              style={{ borderColor: 'var(--bordo)', background: 'rgba(255,221,0,0.05)' }}
            >
              <span aria-hidden className="text-base">{icona}</span>
              {label}
            </motion.span>
          );
        })}
      </motion.div>

      {/* Privacy notice */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="mt-10 rounded-2xl border p-5 text-sm leading-relaxed sm:p-6"
        style={{
          borderColor: 'rgba(255,221,0,0.2)',
          background: 'rgba(255,221,0,0.03)',
          color: 'var(--fg-muta)',
        }}
      >
        <strong style={{ color: 'var(--accento)' }}>🔒 Le tue risposte restano sul tuo dispositivo.</strong>{' '}
        Il calcolo avviene nel browser: nessuna risposta viene inviata o salvata su un server.
      </motion.div>

      {/* CTA Button */}
      <motion.button
        type="button"
        onClick={onInizia}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mt-10 mx-auto inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-bold text-gray-900 transition-all hover:shadow-lg hover:shadow-yellow-500/20"
        style={{ background: 'var(--accento)' }}
      >
        Inizia il Quiz →
      </motion.button>

      <p className="mt-6 text-center text-xs" style={{ color: 'var(--fg-muta)' }}>
        ⏱️ Circa {Math.max(1, Math.round(pack.affermazioni.length * 0.3))} minuti
        <br />
        Pack v{pack.versione}
      </p>
    </motion.div>
  );
}
