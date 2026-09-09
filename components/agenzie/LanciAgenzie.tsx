'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AGENZIE, DESCRIZIONI_AGENZIE, TESTI_AGENZIE, useLanciAgenzie, type Agenzia } from '@/lib/agenzie';
import { formattaDataRelativa } from '@/lib/data-ora';
import BadgeAgenzia from './BadgeAgenzia';
import BadgeSimulazione from './BadgeSimulazione';

interface Props {
  /** Se indicato, mostra solo i primi N lanci senza filtri: versione compatta per la home. */
  limite?: number;
}

export default function LanciAgenzie({ limite }: Props) {
  const [filtro, setFiltro] = useState<Agenzia | 'tutte'>('tutte');
  const { lanci, fonti, simulazione, caricamento } = useLanciAgenzie();
  const compatta = Boolean(limite);

  const visibili = (filtro === 'tutte' ? lanci : lanci.filter((l) => l.agenzia === filtro)).slice(0, limite ?? lanci.length);
  const fontiInErrore = fonti.filter((f) => f.stato === 'errore' || f.stato === 'vuoto');

  return (
    <section aria-labelledby="titolo-agenzie">
      <div className={`flex flex-wrap items-center gap-3 ${compatta ? 'mb-3' : 'mb-5'}`}>
        <h2 id="titolo-agenzie" className={compatta ? 'text-sm font-semibold' : 'text-2xl font-bold sm:text-3xl'}>
          {TESTI_AGENZIE.titolo}
        </h2>
        {!compatta && (
          <span
            className="rounded px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
          >
            Live
          </span>
        )}
        {simulazione && <BadgeSimulazione />}
        {compatta && (
          <Link href="/agenzie" className="ml-auto text-xs font-medium underline-offset-4 hover:underline" style={{ color: 'var(--fg-muta)' }}>
            {TESTI_AGENZIE.tornaAllaLista} →
          </Link>
        )}
      </div>

      {simulazione && !compatta && (
        <p
          className="mb-5 rounded-xl border border-dashed px-4 py-3 text-sm"
          style={{ borderColor: 'var(--accento)', color: 'var(--fg-muta)' }}
          role="note"
        >
          {TESTI_AGENZIE.simulazione.avviso}
        </p>
      )}

      {/* Filtro per agenzia */}
      {!compatta && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtra per agenzia">
          {(['tutte', ...AGENZIE] as const).map((voce) => {
            const attivo = filtro === voce;
            const etichetta = voce === 'tutte' ? TESTI_AGENZIE.tutte : DESCRIZIONI_AGENZIE[voce].nome;
            const conteggio = voce === 'tutte' ? lanci.length : lanci.filter((l) => l.agenzia === voce).length;
            return (
              <button
                key={voce}
                type="button"
                role="tab"
                aria-selected={attivo}
                onClick={() => setFiltro(voce)}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: attivo ? 'var(--accento)' : 'var(--bordo)',
                  background: attivo ? 'rgba(254,220,1,0.12)' : 'var(--bg-card)',
                  color: attivo ? 'var(--accento)' : 'var(--fg)',
                }}
              >
                {etichetta}
                <span className="tabular-nums text-xs" style={{ color: 'var(--fg-muta)' }}>
                  {conteggio}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!compatta &&
        fontiInErrore.map((f) => (
          <p key={f.agenzia} className="mb-3 text-xs" style={{ color: 'var(--fg-muta)' }}>
            {TESTI_AGENZIE.fonteNonDisponibile(DESCRIZIONI_AGENZIE[f.agenzia].nome)}
          </p>
        ))}

      <div
        className={compatta ? 'overflow-hidden rounded-xl' : 'overflow-hidden rounded-2xl border'}
        style={compatta ? undefined : { borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
      >
        {caricamento && (
          <p className={`text-sm ${compatta ? 'py-2' : 'p-5'}`} style={{ color: 'var(--fg-muta)' }}>
            {TESTI_AGENZIE.caricamento}
          </p>
        )}
        {!caricamento && visibili.length === 0 && (
          <p className={`text-sm ${compatta ? 'py-2' : 'p-5'}`} style={{ color: 'var(--fg-muta)' }}>
            {TESTI_AGENZIE.vuoto}
          </p>
        )}

        <ol>
          {visibili.map((lancio, idx) => (
            <motion.li
              key={lancio.id}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: (idx % 12) * 0.03 }}
              className={`flex gap-3 ${compatta ? 'py-2' : 'p-4 sm:p-5'}`}
              style={idx > 0 ? { borderTop: '1px solid var(--bordo)' } : undefined}
            >
              <time
                dateTime={lancio.data}
                className={`shrink-0 text-right font-mono font-bold tabular-nums leading-tight ${
                  compatta ? 'w-14 text-[11px]' : 'w-16 text-xs sm:w-20 sm:text-sm'
                }`}
                style={{ color: compatta ? 'var(--fg-muta)' : 'var(--accento)' }}
              >
                {formattaDataRelativa(lancio.data)}
              </time>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <BadgeAgenzia agenzia={lancio.agenzia} />
                  {lancio.simulato && <BadgeSimulazione />}
                  {!compatta && lancio.categoria && !/simulazione/i.test(lancio.categoria) && (
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
                      {lancio.categoria}
                    </span>
                  )}
                </div>
                <Link href={`/agenzie/${lancio.id}`} className="group block">
                  <h3
                    className={`${
                      compatta ? 'line-clamp-1 text-xs font-medium sm:text-sm' : 'text-sm font-bold sm:text-base'
                    } leading-snug group-hover:underline`}
                  >
                    {lancio.titolo}
                  </h3>
                  {!compatta && lancio.testo && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--fg-muta)' }}>
                      {lancio.testo}
                    </p>
                  )}
                </Link>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
