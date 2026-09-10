'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'framer-motion';
import Logo from '@/components/Logo';
import { ETICHETTE_TIPO, TESTI_GIOCO, type CartaInGioco, type LeggeInVigore } from '@/lib/gioco';

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
/** Oltre questa distanza il trascinamento scarta la carta. */
const SOGLIA_SCARTO = 110;

export default function SchermataCarta({ pescata, indice, totale, leggi, analcolico, onProssima, onEsci }: Props) {
  return (
    /* Altezza utile: tolti l'header (5,25rem) e, su mobile, lo spazio della barra flottante in basso. */
    <div className="tavolo flex min-h-[calc(100dvh-5.25rem-var(--spazio-barra))] flex-col px-4 py-5 sm:px-6">
      {/* Testata: avanzamento e uscita */}
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4">
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

      <div className="mx-auto mt-2 h-1 w-full max-w-md overflow-hidden rounded-full" style={{ background: 'var(--bordo)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${((indice + 1) / totale) * 100}%`, background: 'var(--accento)' }}
        />
      </div>

      {/* Mazzo */}
      <div className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 items-center justify-center py-4">
        <PilaDiCarte />
        <CartaGiocata key={indice} pescata={pescata} analcolico={analcolico} onScarta={onProssima} />
      </div>

      {/* Leggi ancora in vigore */}
      {leggi.length > 0 && (
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muta)' }}>
            {T.gioco.leggiInVigore}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {leggi.map((legge) => (
              <li
                key={legge.id}
                className="flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--bordo)', background: 'rgba(0,0,0,0.35)' }}
              >
                <span className="min-w-0">
                  <span className="font-semibold">{legge.titolo}</span>{' '}
                  <span style={{ color: 'var(--fg-muta)' }}>{legge.testo}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--accento)' }}>
                  {T.gioco.restano(legge.carteRimaste)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mx-auto w-full max-w-md pt-4">
        <button
          type="button"
          onClick={onProssima}
          className="w-full rounded-xl px-8 py-4 text-base font-bold"
          style={{ background: 'var(--accento)', color: '#000' }}
        >
          {T.gioco.prossima} →
        </button>
        <p className="mt-2.5 text-center text-xs" style={{ color: 'var(--fg-muta)' }}>
          {T.gioco.trascina} · {T.penalita.spiegazione(analcolico)}
        </p>
      </div>
    </div>
  );
}

/** Le carte ancora da pescare, appena visibili sotto quella in gioco. */
function PilaDiCarte() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {[
        { rotate: -4, scale: 0.94, opacity: 0.25 },
        { rotate: 3, scale: 0.97, opacity: 0.4 },
      ].map((stile, i) => (
        <div
          key={i}
          className="absolute h-full max-h-[30rem] min-h-[20rem] w-full rounded-3xl border"
          style={{
            borderColor: 'var(--bordo)',
            background: 'linear-gradient(160deg, #16161a, #0b0b0d)',
            transform: `rotate(${stile.rotate}deg) scale(${stile.scale})`,
            opacity: stile.opacity,
          }}
        />
      ))}
    </div>
  );
}

function CartaGiocata({
  pescata,
  analcolico,
  onScarta,
}: {
  pescata: CartaInGioco;
  analcolico: boolean;
  onScarta: () => void;
}) {
  const riduciMovimento = useReducedMotion();
  const { carta, testo } = pescata;
  const stile = ETICHETTE_TIPO[carta.tipo];

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-16, 0, 16]);
  const opacity = useTransform(x, [-260, -120, 0, 120, 260], [0.2, 1, 1, 1, 0.2]);
  const trascinato = useRef(false);

  const fineTrascinamento = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SOGLIA_SCARTO) onScarta();
    else x.set(0);
    setTimeout(() => (trascinato.current = false), 0);
  };

  return (
    <motion.article
      drag="x"
      dragSnapToOrigin
      dragElastic={0.5}
      onDragStart={() => (trascinato.current = true)}
      onDragEnd={fineTrascinamento}
      onClick={() => {
        if (!trascinato.current) onScarta();
      }}
      style={{ x, rotate, opacity, borderColor: stile.colore, boxShadow: `0 24px 60px -20px ${stile.colore}55` }}
      initial={riduciMovimento ? false : { y: 40, scale: 0.9, opacity: 0, rotate: -6 }}
      animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      whileTap={{ scale: 0.99 }}
      className="carta-gioco relative flex h-full max-h-[30rem] min-h-[20rem] w-full cursor-pointer touch-pan-y select-none flex-col rounded-3xl border-2 p-5 sm:p-7"
    >
      {/* Intestazione: seme del tipo e logo */}
      <header className="flex items-start justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ background: stile.sfondo, color: stile.colore }}
        >
          <span aria-hidden className="text-sm">
            {stile.icona}
          </span>
          {stile.label}
        </span>
        <span className="opacity-45">
          <Logo size="md" />
        </span>
      </header>

      {/* Corpo */}
      <div className="flex flex-1 flex-col justify-center overflow-y-auto py-5">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{carta.titolo}</h1>
        <p className="mt-3 text-lg leading-relaxed sm:text-xl">{testo}</p>

        {carta.secondi && <Cronometro secondi={carta.secondi} />}

        {carta.fonte && (
          <p className="mt-5 border-t pt-3 text-xs leading-relaxed" style={{ borderColor: 'var(--bordo)', color: 'var(--fg-muta)' }}>
            <span className="font-semibold">{T.gioco.fonte}:</span>{' '}
            <a
              href={carta.fonte.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="underline hover:no-underline"
            >
              {carta.fonte.citazione}
            </a>
          </p>
        )}
      </div>

      {/* Piede: penalità e seme rovesciato, come nelle carte da gioco */}
      <footer className="flex items-end justify-between gap-3">
        <span
          className="rounded-full px-3 py-1 text-sm font-bold"
          style={
            carta.penalita > 0
              ? { background: 'rgba(254,220,1,0.14)', color: 'var(--accento)' }
              : { background: 'rgba(255,255,255,0.06)', color: 'var(--fg-muta)' }
          }
        >
          {T.penalita.etichetta(carta.penalita, analcolico)}
        </span>
        <span aria-hidden className="text-lg opacity-30" style={{ transform: 'rotate(180deg)' }}>
          {stile.icona}
        </span>
      </footer>
    </motion.article>
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
        onClick={(e) => {
          e.stopPropagation();
          setRimasti(secondi);
        }}
        className="mt-5 self-start rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accento)]"
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
