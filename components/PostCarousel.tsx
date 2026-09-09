'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useInstagram } from '@/lib/instagram';
import { formattaDataRelativa } from '@/lib/data-ora';
import { useSwipe } from '@/lib/useSwipe';

const MAX_POST = 10;
const PER_GRUPPO = 2;
const INTERVALLO_MS = 5000;

export default function PostCarousel() {
  const { post: tutti } = useInstagram();
  const post = tutti.slice(0, MAX_POST);

  const gruppi: typeof post[] = [];
  for (let i = 0; i < post.length; i += PER_GRUPPO) {
    gruppi.push(post.slice(i, i + PER_GRUPPO));
  }

  const [indice, setIndice] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const avanti = useCallback(() => {
    setIndice((i) => (i + 1) % gruppi.length);
  }, [gruppi.length]);

  const ferma = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const riparti = useCallback(() => {
    ferma();
    if (gruppi.length > 1) timerRef.current = setInterval(avanti, INTERVALLO_MS);
  }, [avanti, gruppi.length]);

  useEffect(() => {
    riparti();
    return ferma;
  }, [riparti]);

  const swipe = useSwipe({
    avanti: () => {
      avanti();
      riparti();
    },
    indietro: () => {
      setIndice((i) => (i - 1 + gruppi.length) % gruppi.length);
      riparti();
    },
  });

  if (gruppi.length === 0) return null;

  const corrente = gruppi[indice % gruppi.length];

  return (
    <section className="mt-14" onMouseEnter={ferma} onMouseLeave={riparti}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold">I nostri ultimi post</h2>
        <div className="flex gap-1.5">
          {gruppi.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIndice(i);
                riparti();
              }}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === indice ? '20px' : '6px',
                background: i === indice ? 'var(--accento)' : 'var(--bordo)',
              }}
              aria-label={`Post ${i * PER_GRUPPO + 1}-${Math.min((i + 1) * PER_GRUPPO, post.length)}`}
            />
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden" {...swipe}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={indice}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
          >
            {corrente.map((p) => (
              <Link
                key={p.id}
                href={`/ultimora/${p.id}`}
                className="group flex gap-5 rounded-2xl border p-4 sm:p-5 transition-all hover:shadow-xl"
                style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
              >
                <div
                  className="shrink-0 w-36 sm:w-44 lg:w-52 aspect-[4/5] overflow-hidden rounded-xl"
                  style={{ background: 'var(--bordo)' }}
                >
                  <img
                    src={p.immagine}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0 flex-1 flex flex-col">
                  <span
                    className="text-xs font-mono font-bold tabular-nums"
                    style={{ color: 'var(--accento)' }}
                  >
                    {formattaDataRelativa(p.data)}
                  </span>
                  <h3 className="mt-2 font-bold text-lg sm:text-xl leading-snug line-clamp-4">
                    {p.titolo}
                  </h3>
                  <span className="mt-auto pt-4 self-start">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors group-hover:border-[var(--accento)]"
                      style={{ border: '1px solid var(--bordo)', color: 'var(--fg)' }}
                    >
                      Apri
                      <span className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--accento)' }}>
                        →
                      </span>
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
