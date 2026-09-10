'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ETICHETTE_TIPO, TESTI_GIOCO, type CartaInGioco, type LeggeInVigore } from '@/lib/gioco';
import { useSwipe } from '@/lib/useSwipe';

interface Props {
  pescata: CartaInGioco;
  indice: number;
  totale: number;
  leggi: LeggeInVigore[];
  analcolico: boolean;
  onProssima: () => void;
  onEsci: () => void;
}

const T = TESTI_GIOCO;

export default function SchermataCarta({ pescata, indice, totale, leggi, analcolico, onProssima, onEsci }: Props) {
  const riduciMovimento = useReducedMotion();
  const { carta, testo } = pescata;
  const stile = ETICHETTE_TIPO[carta.tipo];
  const swipe = useSwipe({ avanti: onProssima, indietro: onProssima });

  return (
    <div
      /* Su mobile il layout aggiunge 4rem di barra in basso: la carta resta in una videata. */
      className="flex min-h-[calc(100dvh-4rem)] flex-col px-4 py-6 sm:min-h-dvh sm:px-6"
      style={swipe.style}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
    >
      {/* Testata: avanzamento e uscita */}
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
        <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--fg-muta)' }}>
          {T.gioco.carta(indice + 1, totale)}
        </span>
        <button
          type="button"
          onClick={onEsci}
          className="rounded-lg px-3 py-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--fg-muta)' }}
        >
          {T.gioco.esci}
        </button>
      </div>

      <div className="mx-auto mt-2 h-1 w-full max-w-2xl overflow-hidden rounded-full" style={{ background: 'var(--bordo)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${((indice + 1) / totale) * 100}%`, background: 'var(--accento)' }}
        />
      </div>

      {/* Carta */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center py-6">
        {/* La carta si rimonta a ogni indice: niente animazione di uscita, così
            tocchi rapidi non accodano transizioni e la carta è sempre quella giusta. */}
        <motion.article
          key={indice}
          initial={riduciMovimento ? false : { opacity: 0, y: 16, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full rounded-3xl border p-6 sm:p-10"
          style={{ borderColor: stile.colore, background: 'var(--bg-card)' }}
        >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                style={{ background: stile.sfondo, color: stile.colore }}
              >
                <span aria-hidden>{stile.icona}</span>
                {stile.label}
              </span>
              {carta.penalita > 0 && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: 'rgba(254,220,1,0.12)', color: 'var(--accento)' }}
                >
                  {T.penalita.etichetta(carta.penalita, analcolico)}
                </span>
              )}
              {carta.secondi && (
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--bordo)' }}>
                  ⏱ {T.gioco.tempo(carta.secondi)}
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{carta.titolo}</h1>
            <p className="mt-4 text-lg leading-relaxed sm:text-xl">{testo}</p>

            {carta.secondi && <Cronometro key={indice} secondi={carta.secondi} />}

            {carta.fonte && (
              <p className="mt-6 border-t pt-4 text-xs leading-relaxed" style={{ borderColor: 'var(--bordo)', color: 'var(--fg-muta)' }}>
                <span className="font-semibold">{T.gioco.fonte}:</span>{' '}
                <a href={carta.fonte.url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                  {carta.fonte.citazione}
                </a>
              </p>
            )}
        </motion.article>
      </div>

      {/* Leggi ancora in vigore */}
      {leggi.length > 0 && (
        <div className="mx-auto w-full max-w-2xl">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muta)' }}>
            {T.gioco.leggiInVigore}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {leggi.map((legge) => (
              <li
                key={legge.id}
                className="flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
              >
                <span className="min-w-0">
                  <span className="font-semibold">{legge.titolo}</span>{' '}
                  <span style={{ color: 'var(--fg-muta)' }}>{legge.testo}</span>
                </span>
                <span className="shrink-0 tabular-nums text-xs" style={{ color: 'var(--accento)' }}>
                  {T.gioco.restano(legge.carteRimaste)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mx-auto w-full max-w-2xl pt-5">
        <button
          type="button"
          onClick={onProssima}
          className="w-full rounded-xl px-8 py-4 text-base font-bold"
          style={{ background: 'var(--accento)', color: '#000' }}
        >
          {T.gioco.prossima} →
        </button>
        <p className="mt-3 text-center text-xs" style={{ color: 'var(--fg-muta)' }}>
          {T.gioco.astensione} · {T.penalita.spiegazione(analcolico)}
        </p>
      </div>
    </div>
  );
}

/** Cronometro manuale per le carte a tempo: parte solo se qualcuno lo avvia.
 *  Il padre lo rimonta con `key` a ogni carta, così riparte da fermo. */
function Cronometro({ secondi }: { secondi: number }) {
  const [rimasti, setRimasti] = useState<number | null>(null);

  useEffect(() => {
    if (rimasti === null || rimasti <= 0) return;
    const timer = setTimeout(() => setRimasti(rimasti - 1), 1000);
    return () => clearTimeout(timer);
  }, [rimasti]);

  if (rimasti === null) {
    return (
      <button
        type="button"
        onClick={() => setRimasti(secondi)}
        className="mt-5 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accento)]"
        style={{ borderColor: 'var(--bordo)' }}
      >
        ⏱ Avvia {secondi} secondi
      </button>
    );
  }

  return (
    <p
      className="mt-5 text-4xl font-bold tabular-nums"
      style={{ color: rimasti === 0 ? '#ef4444' : 'var(--accento)' }}
      role="timer"
      aria-live="polite"
    >
      {rimasti === 0 ? 'Tempo scaduto' : `${rimasti}″`}
    </p>
  );
}
