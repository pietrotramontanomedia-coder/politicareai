'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'framer-motion';
import { useUltimOra } from '@/lib/instagram';
import { formattaDataRelativa } from '@/lib/data-ora';
import { useSwipe } from '@/lib/useSwipe';
import { FONTI_ULTIMORA, TESTI_ULTIMORA as T } from '@/lib/ultimora-testi';
import BattitoLive from './ultimora/BattitoLive';
import { IconaFonte } from './ultimora/IconaFonte';

const DURATA_MS = 5000;

/** Ticker delle ultim'ora in cima alla home: segmenti come le storie, pausa al tocco, swipe per cambiare. */
export default function UltimOraTicker({ limite = 5 }: { limite?: number }) {
  const { voci: tutte, caricamento } = useUltimOra();
  const voci = tutte.slice(0, limite);
  const ridotto = useReducedMotion();
  const [indice, setIndice] = useState(0);
  const [direzione, setDirezione] = useState(1);
  const [inPausa, setInPausa] = useState(false);

  const vai = useCallback(
    (destinazione: number, verso: number) => {
      if (voci.length === 0) return;
      setDirezione(verso);
      setIndice((destinazione + voci.length) % voci.length);
    },
    [voci.length],
  );
  const swipe = useSwipe({ avanti: () => vai(indice + 1, 1), indietro: () => vai(indice - 1, -1) });

  if (caricamento) {
    return <div className="skeleton-shimmer h-[5.25rem] w-full rounded-2xl sm:h-[3.75rem]" style={{ background: 'var(--bg-card)' }} />;
  }
  if (voci.length === 0) return null;

  const corrente = voci[indice % voci.length];
  const automatico = !ridotto && voci.length > 1;
  const fonte = corrente.fonte ? FONTI_ULTIMORA[corrente.fonte] : null;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="w-full rounded-2xl border px-3.5 pb-1.5 pt-3 sm:px-4"
        style={{
          borderColor: 'rgba(239,68,68,0.28)',
          background: 'radial-gradient(120% 160% at 0% 0%, rgba(239,68,68,0.15), transparent 55%), rgba(20,20,20,0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          ...swipe.style,
        }}
        onPointerEnter={() => setInPausa(true)}
        onPointerLeave={() => setInPausa(false)}
        onTouchStart={(e) => {
          setInPausa(true);
          swipe.onTouchStart(e);
        }}
        onTouchEnd={(e) => {
          setInPausa(false);
          swipe.onTouchEnd(e);
        }}
      >
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[auto_auto_1fr_auto]">
          <a
            href="#ultimora"
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(239,68,68,0.16)', color: '#f87171' }}
          >
            <BattitoLive />
            {T.live}
          </a>

          <span className="flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums" style={{ color: 'var(--accento)' }}>
            {formattaDataRelativa(corrente.orario)}
            {fonte && corrente.fonte && (
              <span style={{ color: fonte.colore }} title={fonte.nome}>
                <IconaFonte fonte={corrente.fonte} className="h-3.5 w-3.5" />
              </span>
            )}
          </span>

          <div className="relative col-span-2 h-[2.6rem] overflow-hidden sm:col-span-1 sm:h-6">
            <AnimatePresence initial={false} custom={direzione} mode="popLayout">
              <motion.div
                key={corrente.id}
                custom={direzione}
                variants={{
                  entra: (verso: number) => ({ y: verso * 18, opacity: 0 }),
                  centro: { y: 0, opacity: 1 },
                  esce: (verso: number) => ({ y: -verso * 18, opacity: 0 }),
                }}
                initial="entra"
                animate="centro"
                exit="esce"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <Link
                  href={corrente.href}
                  className="line-clamp-2 text-sm font-semibold leading-snug hover:underline sm:line-clamp-1 sm:text-base"
                >
                  {corrente.titolo}
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          {voci.length > 1 && (
            <div className="hidden gap-1 sm:flex">
              {[
                { passo: -1, etichetta: T.precedente, freccia: '‹' },
                { passo: 1, etichetta: T.successiva, freccia: '›' },
              ].map((b) => (
                <button
                  key={b.passo}
                  type="button"
                  onClick={() => vai(indice + b.passo, b.passo)}
                  aria-label={b.etichetta}
                  className="flex h-7 w-7 items-center justify-center rounded-full border text-base leading-none transition-colors hover:border-[rgba(239,68,68,0.5)]"
                  style={{ borderColor: 'rgba(255,255,255,0.12)' }}
                >
                  {b.freccia}
                </button>
              ))}
            </div>
          )}
        </div>

        {voci.length > 1 && (
          <div className="mt-1.5 flex gap-1">
            {voci.map((voce, i) => (
              <button
                key={voce.id}
                type="button"
                onClick={() => vai(i, i >= indice ? 1 : -1)}
                aria-label={T.notizia(i + 1, voci.length)}
                aria-current={i === indice}
                className="flex h-3 flex-1 items-center"
              >
                <span className="relative block h-[3px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  {i < indice && <span className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />}
                  {i === indice && (
                    <span
                      key={`${voce.id}-${indice}`}
                      className="absolute inset-0 origin-left rounded-full"
                      style={{
                        background: '#ef4444',
                        animation: automatico ? `riempi ${DURATA_MS}ms linear forwards` : undefined,
                        animationPlayState: inPausa ? 'paused' : 'running',
                      }}
                      onAnimationEnd={() => automatico && vai(indice + 1, 1)}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
