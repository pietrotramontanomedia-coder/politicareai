'use client';

import { motion } from 'framer-motion';
import flashData from '@/content/agenzia/flash.json';

interface VoceFlash {
  id: string;
  orario: string;
  titolo: string;
  testo: string;
}

function formattaOrario(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default function AgenziaStampa({ limite }: { limite?: number }) {
  const tutte = flashData.voci as VoceFlash[];
  const voci = limite ? tutte.slice(0, limite) : tutte;

  if (voci.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: '#ef4444' }}
          />
          <span
            className="relative inline-flex rounded-full h-2.5 w-2.5"
            style={{ background: '#ef4444' }}
          />
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold">Ultim&apos;ora</h2>
        <span
          className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
        >
          Live
        </span>
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
      >
        {voci.map((voce, idx) => (
          <motion.div
            key={voce.id}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: (idx % 12) * 0.03 }}
            className="flex gap-4 p-4 sm:p-5"
            style={idx > 0 ? { borderTop: '1px solid var(--bordo)' } : undefined}
          >
            <div className="shrink-0 w-14 sm:w-16 text-right">
              <span
                className="text-xs sm:text-sm font-mono font-bold tabular-nums"
                style={{ color: 'var(--accento)' }}
              >
                {formattaOrario(voce.orario)}
              </span>
            </div>

            <div className="shrink-0 w-px self-stretch" style={{ background: 'var(--bordo)' }} />

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base leading-snug">{voce.titolo}</h3>
              <p
                className="mt-1 text-xs sm:text-sm leading-relaxed line-clamp-2"
                style={{ color: 'var(--fg-muta)' }}
              >
                {voce.testo}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
