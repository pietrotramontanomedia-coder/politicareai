'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useInstagram } from '@/lib/instagram';
import { formattaDataRelativa } from '@/lib/data-ora';

const PROFILO = 'https://www.instagram.com/politicareit/';
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

  if (gruppi.length === 0) return null;

  const corrente = gruppi[indice % gruppi.length];

  return (
    <section className="mt-10" onMouseEnter={ferma} onMouseLeave={riparti}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg sm:text-xl font-bold">Dal nostro Instagram</h2>
          <a
            href={PROFILO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
            style={{ color: 'var(--fg-muta)' }}
          >
            @politicareit
          </a>
        </div>
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

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={indice}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {corrente.map((p) => (
              <Link
                key={p.id}
                href={`/ultimora/${p.id}`}
                className="group flex gap-4 rounded-2xl border p-3 sm:p-4 transition-all hover:shadow-xl"
                style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
              >
                <div
                  className="shrink-0 w-28 sm:w-36 aspect-[4/5] overflow-hidden rounded-xl"
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
                    className="text-[11px] font-mono font-bold tabular-nums"
                    style={{ color: 'var(--accento)' }}
                  >
                    {formattaDataRelativa(p.data)}
                  </span>
                  <h3 className="mt-1.5 font-bold text-sm sm:text-base leading-snug line-clamp-3 group-hover:underline">
                    {p.titolo}
                  </h3>
                  {p.testo && (
                    <p
                      className="mt-1.5 text-xs sm:text-sm leading-relaxed line-clamp-3"
                      style={{ color: 'var(--fg-muta)' }}
                    >
                      {p.testo}
                    </p>
                  )}
                  <span className="mt-auto pt-2 text-xs font-semibold" style={{ color: 'var(--accento)' }}>
                    Leggi →
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
