'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
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

const INTERVALLO_MS = 5000;

export default function NewsCarousel({ articoli }: { articoli: FeedArticle[] }) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [direzione, setDirezione] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slide = articoli.slice(0, 5);

  const vaiA = useCallback(
    (nuovoIndice: number) => {
      setDirezione(nuovoIndice > indice ? 1 : -1);
      setIndice((nuovoIndice + slide.length) % slide.length);
    },
    [indice, slide.length],
  );

  const avanti = useCallback(() => {
    setDirezione(1);
    setIndice((i) => (i + 1) % slide.length);
  }, [slide.length]);

  useEffect(() => {
    if (slide.length <= 1) return;
    timerRef.current = setInterval(avanti, INTERVALLO_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [avanti, slide.length]);

  const swipe = useSwipe({
    avanti: () => vaiA(indice + 1),
    indietro: () => vaiA(indice - 1),
  });

  if (slide.length === 0) return null;

  const corrente = slide[indice];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl aspect-square mx-auto"
      style={{ maxWidth: 'min(100%, 560px)', background: 'var(--bg-card)', ...swipe.style }}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
      onMouseEnter={() => timerRef.current && clearInterval(timerRef.current)}
      onMouseLeave={() => {
        timerRef.current = setInterval(avanti, INTERVALLO_MS);
      }}
    >
      <AnimatePresence initial={false} custom={direzione} mode="wait">
        <motion.div
          key={corrente.id}
          custom={direzione}
          initial={{ opacity: 0, x: direzione > 0 ? 60 : -60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direzione > 0 ? -60 : 60 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="absolute inset-0 cursor-pointer"
          onClick={() => router.push(`/leggi/${corrente.slug}`)}
        >
          {corrente.immagine ? (
            <img
              src={corrente.immagine}
              alt={corrente.titolo}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900" />
          )}

          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Contenuto */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide mb-3"
              style={{ background: 'var(--accento)', color: '#000' }}
            >
              In evidenza
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight line-clamp-3">
              {corrente.titolo}
            </h2>
            <p className="mt-2 text-sm text-white/80 line-clamp-2">
              {corrente.descrizione}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Frecce */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          vaiA(indice - 1);
        }}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        aria-label="Precedente"
      >
        ←
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          vaiA(indice + 1);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-110"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        aria-label="Successivo"
      >
        →
      </button>

      {/* Dots */}
      <div className="absolute top-4 right-4 z-10 flex gap-1.5">
        {slide.map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              vaiA(i);
            }}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === indice ? '24px' : '8px',
              background: i === indice ? 'var(--accento)' : 'rgba(255,255,255,0.4)',
            }}
            aria-label={`Vai alla slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
