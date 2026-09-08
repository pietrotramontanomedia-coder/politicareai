'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotifiche, type Notifica } from '@/lib/notifiche';

const ICONE_TIPO: Record<Notifica['tipo'], string> = {
  quiz: '🧠',
  aggiornamento: '🔄',
  generale: '📣',
};

function formattaData(iso: string): string {
  const data = new Date(iso);
  const oggi = new Date();
  const giorni = Math.floor((oggi.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));

  if (giorni === 0) return 'Oggi';
  if (giorni === 1) return 'Ieri';
  if (giorni < 7) return `${giorni} giorni fa`;
  return data.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const { notifiche, lette, nonLette, segnaComeLetta, segnaTutteLette } = useNotifiche();
  const [aperto, setAperto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFuori(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAperto(false);
      }
    }
    document.addEventListener('mousedown', onClickFuori);
    return () => document.removeEventListener('mousedown', onClickFuori);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAperto((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/5"
        aria-label="Notifiche"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {nonLette > 0 && (
          <span
            className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
            style={{ background: '#ef4444', color: '#fff' }}
          >
            {nonLette}
          </span>
        )}
      </button>

      <AnimatePresence>
        {aperto && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border shadow-2xl overflow-hidden"
            style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--bordo)' }}>
              <h3 className="font-bold">Notifiche</h3>
              {nonLette > 0 && (
                <button
                  onClick={segnaTutteLette}
                  className="text-xs font-medium hover:underline"
                  style={{ color: 'var(--accento)' }}
                >
                  Segna tutte come lette
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifiche.length === 0 && (
                <p className="p-6 text-center text-sm" style={{ color: 'var(--fg-muta)' }}>
                  Nessuna notifica
                </p>
              )}

              {notifiche.map((notifica) => {
                const nonLetta = !lette.includes(notifica.id);
                return (
                  <Link
                    key={notifica.id}
                    href={notifica.link}
                    onClick={() => {
                      segnaComeLetta(notifica.id);
                      setAperto(false);
                    }}
                    className="flex gap-3 p-4 border-b transition-colors hover:bg-white/[0.03] last:border-b-0"
                    style={{ borderColor: 'var(--bordo)' }}
                  >
                    <div
                      className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-base"
                      style={{ background: 'rgba(255,221,0,0.1)' }}
                    >
                      {ICONE_TIPO[notifica.tipo]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold truncate">{notifica.titolo}</h4>
                        {nonLetta && (
                          <span
                            className="shrink-0 h-1.5 w-1.5 rounded-full"
                            style={{ background: 'var(--accento)' }}
                          />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--fg-muta)' }}>
                        {notifica.testo}
                      </p>
                      <p className="mt-1 text-[11px]" style={{ color: 'var(--fg-muta)' }}>
                        {formattaData(notifica.data)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
