'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import flashData from '@/content/agenzia/flash.json';

interface VoceFlash {
  id: string;
  orario: string;
  titolo: string;
  testo: string;
}

const INTERVALLO_MS = 4000;

function formattaOrario(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export default function UltimOraTicker({ limite = 5 }: { limite?: number }) {
  const voci = (flashData.voci as VoceFlash[]).slice(0, limite);
  const [indice, setIndice] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const avanti = useCallback(() => {
    setIndice((i) => (i + 1) % voci.length);
  }, [voci.length]);

  useEffect(() => {
    if (voci.length <= 1) return;
    timerRef.current = setInterval(avanti, INTERVALLO_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [avanti, voci.length]);

  if (voci.length === 0) return null;

  const corrente = voci[indice];

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 w-full"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--bordo)' }}
      onMouseEnter={() => timerRef.current && clearInterval(timerRef.current)}
      onMouseLeave={() => {
        timerRef.current = setInterval(avanti, INTERVALLO_MS);
      }}
    >
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-widest px-1.5 py-1 rounded"
        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
      >
        Live
      </span>

      <div className="relative flex-1 min-w-0 overflow-hidden" style={{ height: '1.5rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={corrente.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center gap-2"
          >
            <span
              className="shrink-0 text-xs font-mono font-bold tabular-nums"
              style={{ color: 'var(--accento)' }}
            >
              {formattaOrario(corrente.orario)}
            </span>
            <span className="truncate text-sm sm:text-base font-medium">{corrente.titolo}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="hidden sm:flex shrink-0 gap-1">
        {voci.map((_, i) => (
          <span
            key={i}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: i === indice ? '12px' : '4px',
              background: i === indice ? 'var(--accento)' : 'var(--bordo)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
