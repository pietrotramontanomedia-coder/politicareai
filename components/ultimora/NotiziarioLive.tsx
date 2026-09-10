'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, MotionConfig } from 'framer-motion';
import { useUltimOra, type VoceUltimOra } from '@/lib/instagram';
import { formattaDataRelativa, formattaOra, raggruppaPerGiorno } from '@/lib/data-ora';
import { conAlfa } from '@/lib/strumenti';
import { FONTI_ULTIMORA, TESTI_ULTIMORA as T } from '@/lib/ultimora-testi';
import BattitoLive from './BattitoLive';
import { IconaFonte } from './IconaFonte';

/** Voci della timeline visibili prima di "Mostra altre" (l'apertura è a parte). */
const VISIBILI = 6;
const ROSSO = '#ef4444';
const ROSSO_SCURO = '#dc2626';
const VETRO = {
  borderColor: 'rgba(255,255,255,0.08)',
  background: 'rgba(18,18,18,0.8)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
};

/** Sezione Ultim'ora della home: notizia d'apertura e timeline per giorno. */
export default function NotiziarioLive() {
  const { voci, caricamento } = useUltimOra();
  const [tutte, setTutte] = useState(false);

  if (caricamento) return <Scheletro />;
  if (voci.length === 0) return null;

  const [apertura, ...resto] = voci;
  const gruppi = raggruppaPerGiorno(tutte ? resto : resto.slice(0, VISIBILI));

  return (
    <MotionConfig reducedMotion="user">
      <Intestazione />

      <div className="mt-8 grid gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-2">
          <div className="mx-auto max-w-md lg:sticky lg:top-24 lg:max-w-none">
            <CardApertura voce={apertura} />
          </div>
        </div>

        <div className="lg:col-span-3">
          <ol className="space-y-6">
            {gruppi.map((gruppo) => (
              <li key={gruppo.etichetta}>
                <p
                  className="sticky top-[5.75rem] z-10 mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider"
                  style={VETRO}
                >
                  {gruppo.etichetta}
                </p>
                <div className="relative pl-6">
                  <span
                    className="absolute bottom-3 left-[6px] top-3 w-px"
                    style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.55), rgba(255,255,255,0.06))' }}
                    aria-hidden
                  />
                  <ul className="space-y-2.5">
                    {gruppo.voci.map((voce, i) => (
                      <VoceTimeline key={voce.id} voce={voce} indice={i} />
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>

          {resto.length > VISIBILI && (
            <button
              type="button"
              onClick={() => setTutte((t) => !t)}
              aria-expanded={tutte}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-semibold transition-colors hover:border-[rgba(239,68,68,0.5)] sm:w-auto sm:px-5"
              style={{ borderColor: 'rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.06)' }}
            >
              {tutte ? T.mostraMeno : T.mostraAltre(resto.length - VISIBILI)}
              <motion.span animate={{ rotate: tutte ? 180 : 0 }} aria-hidden>
                ↓
              </motion.span>
            </button>
          )}

          <SeguiFonti className="mt-6 flex sm:hidden" />
        </div>
      </div>
    </MotionConfig>
  );
}

function Intestazione() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.18em]" style={{ color: '#f87171' }}>
          <BattitoLive />
          {T.inDiretta}
        </span>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{T.titolo}</h2>
        <p className="mt-2 max-w-xl text-base" style={{ color: 'var(--fg-muta)' }}>
          {T.sottotitolo}
        </p>
      </div>
      <SeguiFonti className="hidden sm:flex" />
    </div>
  );
}

function SeguiFonti({ className }: { className: string }) {
  return (
    <div className={`${className} flex-wrap gap-2`}>
      {(['telegram', 'instagram'] as const).map((id) => {
        const f = FONTI_ULTIMORA[id];
        return (
          <a
            key={id}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-transform hover:-translate-y-0.5"
            style={{ borderColor: conAlfa(f.colore, 0.35), background: conAlfa(f.colore, 0.1), color: f.colore }}
          >
            <IconaFonte fonte={id} />
            <span style={{ color: 'var(--fg)' }}>{f.segui}</span>
          </a>
        );
      })}
    </div>
  );
}

function CardApertura({ voce }: { voce: VoceUltimOra }) {
  const testata = (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest" style={{ ...VETRO, color: '#f87171' }}>
        <BattitoLive />
        {T.apertura}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums" style={{ ...VETRO, color: 'var(--accento)' }}>
        {formattaDataRelativa(voce.orario)}
        {voce.fonte && (
          <span style={{ color: FONTI_ULTIMORA[voce.fonte].colore }}>
            <IconaFonte fonte={voce.fonte} className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
    </div>
  );

  const azione = (
    <span
      className="mt-4 inline-flex items-center gap-2 rounded-full py-2 pl-4 pr-3 text-sm font-bold text-white"
      style={{ background: ROSSO_SCURO, boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}
    >
      {T.leggi}
      <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
        →
      </span>
    </span>
  );

  return (
    <Link href={voce.href} className="group block rounded-3xl">
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative overflow-hidden rounded-3xl border"
        style={{
          borderColor: 'rgba(239,68,68,0.3)',
          background: 'radial-gradient(120% 80% at 0% 0%, rgba(239,68,68,0.18), transparent 60%), var(--bg-card)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}
      >
        {voce.immagine ? (
          <>
            {/* L'immagine resta pulita: le grafiche dei post hanno già il loro titolo stampato sopra. */}
            <div className="relative aspect-[4/5] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- immagini da CDN esterni di Telegram e Instagram */}
              <img
                src={voce.immagine}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div
                className="absolute inset-x-0 top-0 h-24"
                style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45), transparent)' }}
                aria-hidden
              />
              <div className="absolute inset-x-4 top-4">{testata}</div>
            </div>
            <div className="p-5 sm:p-6">
              <h3 className="line-clamp-3 text-xl font-bold leading-snug sm:text-2xl">{voce.titolo}</h3>
              {azione}
            </div>
          </>
        ) : (
          <div className="p-5 sm:p-6">
            {testata}
            <h3 className="mt-6 text-2xl font-bold leading-tight sm:text-3xl">{voce.titolo}</h3>
            {voce.testo && (
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
                {voce.testo}
              </p>
            )}
            {azione}
          </div>
        )}
      </motion.article>
    </Link>
  );
}

function VoceTimeline({ voce, indice }: { voce: VoceUltimOra; indice: number }) {
  const fonte = voce.fonte ? FONTI_ULTIMORA[voce.fonte] : null;

  return (
    <motion.li
      initial={{ opacity: 0, x: 14 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.35, delay: Math.min(indice, 6) * 0.04 }}
      className="relative"
    >
      <span
        className="absolute -left-6 top-4 flex h-3.5 w-3.5 items-center justify-center rounded-full"
        style={{ background: '#0f0f0f', boxShadow: '0 0 0 1.5px rgba(239,68,68,0.55)' }}
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: ROSSO }} />
      </span>

      <Link
        href={voce.href}
        className="group flex gap-3 rounded-2xl border p-3 transition-colors hover:border-[rgba(239,68,68,0.45)] sm:p-3.5"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01))' }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs">
            <time
              dateTime={voce.orario}
              className="rounded-md px-1.5 py-0.5 font-mono font-bold tabular-nums"
              style={{ background: 'rgba(254,220,1,0.1)', color: 'var(--accento)' }}
            >
              {formattaOra(voce.orario)}
            </time>
            {fonte && voce.fonte && (
              <span className="inline-flex items-center gap-1" style={{ color: fonte.colore }}>
                <IconaFonte fonte={voce.fonte} className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium" style={{ color: 'var(--fg-muta)' }}>
                  {fonte.nome}
                </span>
              </span>
            )}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug group-hover:underline sm:text-base">{voce.titolo}</h3>
          {voce.testo && (
            <p className="mt-1 hidden text-sm leading-relaxed sm:line-clamp-1" style={{ color: 'var(--fg-muta)' }}>
              {voce.testo}
            </p>
          )}
        </div>
        {voce.immagine && (
          // eslint-disable-next-line @next/next/no-img-element -- immagini da CDN esterni di Telegram e Instagram
          <img
            src={voce.immagine}
            alt=""
            loading="lazy"
            className="h-[70px] w-14 shrink-0 rounded-xl border object-cover sm:h-20 sm:w-16"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          />
        )}
      </Link>
    </motion.li>
  );
}

function Scheletro() {
  return (
    <div aria-busy="true">
      <div className="skeleton-shimmer h-4 w-28" style={{ background: 'var(--bg-card)' }} />
      <div className="skeleton-shimmer mt-4 h-9 w-48" style={{ background: 'var(--bg-card)' }} />
      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="skeleton-shimmer mx-auto aspect-[4/5] w-full max-w-md rounded-3xl lg:col-span-2 lg:max-w-none" style={{ background: 'var(--bg-card)' }} />
        <div className="space-y-2.5 lg:col-span-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton-shimmer h-[86px] rounded-2xl" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
