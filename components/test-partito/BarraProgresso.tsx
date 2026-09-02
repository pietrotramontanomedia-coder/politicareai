'use client';

import { motion } from 'framer-motion';

interface Props {
  corrente: number;
  totale: number;
}

export default function BarraProgresso({ corrente, totale }: Props) {
  const percentuale = totale > 0 ? Math.min(100, (corrente / totale) * 100) : 0;

  return (
    <div className="w-full">
      <div
        className="flex items-center justify-between text-sm"
        style={{ color: 'var(--fg-muta)' }}
      >
        <span>
          {Math.min(corrente + 1, totale)} di {totale}
        </span>
        <span>{Math.round(percentuale)}%</span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--bordo)' }}
        role="progressbar"
        aria-valuenow={Math.round(percentuale)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avanzamento del test"
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accento)' }}
          animate={{ width: `${percentuale}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
