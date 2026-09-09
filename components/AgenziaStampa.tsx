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
  const compatta = Boolean(limite);

  if (voci.length === 0) return null;

  return (
    <div>
      <div className={`flex items-center gap-2 ${compatta ? 'mb-2.5' : 'mb-6'}`}>
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ background: '#ef4444' }}
          />
        </span>
        <h2 className={compatta ? 'text-sm font-semibold' : 'text-2xl sm:text-3xl font-bold'} style={compatta ? { color: 'var(--fg-muta)' } : undefined}>
          Ultim&apos;ora
        </h2>
        {!compatta && (
          <span
            className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
          >
            Live
          </span>
        )}
      </div>

      <div
        className={compatta ? 'rounded-xl overflow-hidden' : 'rounded-2xl border overflow-hidden'}
        style={compatta ? { background: 'var(--bg-elevata, rgba(255,255,255,0.02))' } : { borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
      >
        {voci.map((voce, idx) => (
          <motion.div
            key={voce.id}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: (idx % 12) * 0.03 }}
            className={`flex gap-3 ${compatta ? 'py-2' : 'p-4 sm:p-5'}`}
            style={idx > 0 ? { borderTop: '1px solid var(--bordo)' } : undefined}
          >
            <div className="shrink-0 w-11 sm:w-16 text-right">
              <span
                className={`font-mono font-bold tabular-nums ${compatta ? 'text-[11px]' : 'text-xs sm:text-sm'}`}
                style={{ color: compatta ? 'var(--fg-muta)' : 'var(--accento)' }}
              >
                {formattaOrario(voce.orario)}
              </span>
            </div>

            {!compatta && (
              <div className="shrink-0 w-px self-stretch" style={{ background: 'var(--bordo)' }} />
            )}

            <div className="min-w-0 flex-1">
              <h3 className={compatta ? 'text-xs sm:text-sm font-medium leading-snug line-clamp-1' : 'font-bold text-sm sm:text-base leading-snug'}>
                {voce.titolo}
              </h3>
              {!compatta && (
                <p
                  className="mt-1 text-xs sm:text-sm leading-relaxed line-clamp-2"
                  style={{ color: 'var(--fg-muta)' }}
                >
                  {voce.testo}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
