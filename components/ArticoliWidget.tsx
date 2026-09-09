'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useSwipe } from '@/lib/useSwipe';

interface FeedArticle {
  id: string;
  slug: string;
  titolo: string;
  descrizione: string;
  immagine?: string;
  link: string;
  data?: string;
}

const INTERVALLO_MS = 4000;
const PER_GRUPPO = 3;

export default function ArticoliWidget({ articoli }: { articoli: FeedArticle[] }) {
  const gruppi: FeedArticle[][] = [];
  for (let i = 0; i < articoli.length; i += PER_GRUPPO) {
    gruppi.push(articoli.slice(i, i + PER_GRUPPO));
  }

  const [indice, setIndice] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const avanti = useCallback(() => {
    setIndice((i) => (i + 1) % gruppi.length);
  }, [gruppi.length]);

  useEffect(() => {
    if (gruppi.length <= 1) return;
    timerRef.current = setInterval(avanti, INTERVALLO_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [avanti, gruppi.length]);

  const swipe = useSwipe({
    avanti,
    indietro: () => setIndice((i) => (i - 1 + gruppi.length) % gruppi.length),
  });

  if (gruppi.length === 0) return null;

  const gruppoCorrente = gruppi[indice];

  return (
    <div
      onMouseEnter={() => timerRef.current && clearInterval(timerRef.current)}
      onMouseLeave={() => {
        timerRef.current = setInterval(avanti, INTERVALLO_MS);
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--fg-muta)' }}>
          Altre notizie
        </h3>
        <div className="flex gap-1.5">
          {gruppi.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndice(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === indice ? '20px' : '6px',
                background: i === indice ? 'var(--accento)' : 'var(--bordo)',
              }}
              aria-label={`Gruppo ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)', ...swipe.style }}
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={indice}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="divide-y"
            style={{ borderColor: 'var(--bordo)' }}
          >
            {gruppoCorrente.map((articolo) => (
              <Link
                key={articolo.id}
                href={`/leggi/${articolo.slug}`}
                className="group flex items-center gap-4 p-4 sm:p-5 transition-colors hover:bg-white/[0.03]"
              >
                <div
                  className="shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900"
                >
                  {articolo.immagine ? (
                    <img
                      src={articolo.immagine}
                      alt={articolo.titolo}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl">📰</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {articolo.data && (
                    <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--accento)' }}>
                      {articolo.data}
                    </p>
                  )}
                  <h4 className="mt-0.5 text-sm sm:text-base font-bold leading-snug line-clamp-2 group-hover:underline">
                    {articolo.titolo}
                  </h4>
                </div>

                <span
                  className="shrink-0 text-lg transition-transform duration-300 group-hover:translate-x-1"
                  style={{ color: 'var(--accento)' }}
                >
                  →
                </span>
              </Link>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
