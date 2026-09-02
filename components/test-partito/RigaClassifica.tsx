'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Affermazione, RisultatoPartito } from '@politicare/motore';
import { principaliConvergenze, principaliDivergenze } from '@politicare/motore';
import { coloreAccordo } from '@/lib/scalaColore';
import { LogoPartito } from './LogoPartito';

interface Props {
  risultato: RisultatoPartito;
  posizione: number;
  affermazioniPerId: Map<string, Affermazione>;
}

export default function RigaClassifica({ risultato, posizione, affermazioniPerId }: Props) {
  const [aperto, setAperto] = useState(false);
  const percentuale = Math.round(risultato.punteggio * 100);
  const colore = coloreAccordo(risultato.punteggio);

  const convergenze = principaliConvergenze(risultato, 3).filter((d) => d.accordo >= 0.75);
  const divergenze = principaliDivergenze(risultato, 3).filter((d) => d.accordo <= 0.25);

  return (
    <li className="rounded-lg border overflow-hidden transition-all" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-alta)' }}>
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        className="w-full text-left transition-colors active:opacity-75 min-h-[60px] md:min-h-[70px]"
        aria-expanded={aperto}
      >
        <div className="px-3 py-3 md:p-4 flex items-center gap-3 md:gap-4">
          {/* Logo */}
          <div className="shrink-0">
            <LogoPartito nome={risultato.nome} className="w-12 h-12 md:w-10 md:h-10 rounded" />
          </div>

          {/* Info principale */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-semibold text-sm md:text-base leading-tight line-clamp-1">{risultato.nome}</span>
              <span className="text-base md:text-lg font-bold tabular-nums shrink-0 ml-2" style={{ color: colore }}>
                {percentuale}%
              </span>
            </div>

            {/* Barra accordo */}
            <div className="relative h-2.5 md:h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-bar-bg)' }}>
              <motion.span
                className="absolute top-0 left-0 h-full rounded-full shadow-lg"
                style={{ background: colore }}
                initial={{ width: 0 }}
                animate={{ width: `${percentuale}%` }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: posizione * 0.08 }}
              />
            </div>

            {/* Scala visiva piccola */}
            <div className="mt-1 flex gap-px h-0.5 md:h-1">
              <div className="flex-1 bg-red-500 rounded-l opacity-60" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-1 bg-green-500 rounded-r" />
            </div>
          </div>

          {/* Toggle */}
          <span aria-hidden className="shrink-0 text-xl md:text-2xl leading-none transition-transform flex-shrink-0" style={{ color: 'var(--fg-muta)', transform: aperto ? 'rotate(0)' : 'rotate(-90deg)' }}>
            ⋮
          </span>
        </div>
      </button>

      {aperto && (
        <div className="px-3 py-4 md:px-4 border-t" style={{ borderColor: 'var(--bordo)' }}>
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#22c55e' }} />
                <p className="text-xs font-bold tracking-wide uppercase">Convergenza</p>
              </div>
              {convergenze.length === 0 ? (
                <p className="text-xs md:text-sm" style={{ color: 'var(--fg-muta)' }}>
                  Nessuna forte convergenza.
                </p>
              ) : (
                <ul className="space-y-2">
                  {convergenze.map((d) => (
                    <li key={d.affermazioneId} className="text-xs md:text-sm leading-snug md:leading-relaxed border-l-2 pl-2.5 md:pl-3" style={{ borderColor: '#22c55e' }}>
                      {affermazioniPerId.get(d.affermazioneId)?.testo}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: '#ef4444' }} />
                <p className="text-xs font-bold tracking-wide uppercase">Divergenza</p>
              </div>
              {divergenze.length === 0 ? (
                <p className="text-xs md:text-sm" style={{ color: 'var(--fg-muta)' }}>
                  Nessuna forte divergenza.
                </p>
              ) : (
                <ul className="space-y-2">
                  {divergenze.map((d) => (
                    <li key={d.affermazioneId} className="text-xs md:text-sm leading-snug md:leading-relaxed border-l-2 pl-2.5 md:pl-3" style={{ borderColor: '#ef4444' }}>
                      {affermazioniPerId.get(d.affermazioneId)?.testo}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
