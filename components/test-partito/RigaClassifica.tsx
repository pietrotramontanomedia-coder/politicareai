'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Affermazione, Partito, RisultatoPartito, TipoFonte, Valore } from '@politicare/motore';
import { coloreAccordo } from '@/lib/scalaColore';
import { etichettaArea } from '@/lib/aree';
import { LogoPartito } from './LogoPartito';

interface Props {
  risultato: RisultatoPartito;
  partito: Partito;
  posizione: number;
  affermazioniPerId: Map<string, Affermazione>;
  /** Numero di risposte date dall'utente, per il testo della copertura. */
  risposteDate: number;
  /** true per i partiti mostrati a parte perché sotto la soglia di copertura. */
  escluso?: boolean;
}

const ETICHETTA_VALORE: Record<Valore, string> = {
  [-2]: 'Molto contrario',
  [-1]: 'Contrario',
  0: 'Neutro',
  1: 'Favorevole',
  2: 'Molto favorevole',
};

const ETICHETTA_FONTE: Record<TipoFonte, string> = {
  voto: 'voto parlamentare',
  programma: 'programma',
  dichiarazione: 'dichiarazione',
  questionario: 'questionario',
  stampa: 'stampa',
};

function formattaDataBreve(iso?: string): string {
  if (!iso) return '';
  const [anno, mese, giorno] = iso.split('-');
  return giorno && mese && anno ? `${Number(giorno)}/${Number(mese)}/${anno}` : iso;
}

export default function RigaClassifica({ risultato, partito, posizione, affermazioniPerId, risposteDate, escluso = false }: Props) {
  const [aperto, setAperto] = useState(false);
  const percentuale = Math.round(risultato.punteggio * 100);
  const colore = coloreAccordo(risultato.punteggio);
  const posizioniPerId = new Map(partito.posizioni.map((p) => [p.affermazioneId, p]));

  // Tutte le affermazioni confrontate, dalla più concorde alla più discorde.
  const confronto = [...risultato.dettaglio].sort((a, b) => b.accordo - a.accordo);
  const aree = Object.entries(risultato.perArea).sort((a, b) => b[1] - a[1]);
  const nonDocumentate = risposteDate - risultato.confrontate;

  return (
    <li
      className="overflow-hidden rounded-lg border transition-all"
      style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)', opacity: escluso ? 0.85 : 1 }}
    >
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        className="min-h-[60px] w-full text-left transition-colors active:opacity-75 md:min-h-[70px]"
        aria-expanded={aperto}
      >
        <div className="flex items-center gap-3 px-3 py-3 md:gap-4 md:p-4">
          <div className="shrink-0">
            <LogoPartito nome={risultato.nome} sigla={partito.sigla} colore={partito.colore} className="h-12 w-12 rounded md:h-10 md:w-10" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="line-clamp-1 text-sm font-semibold leading-tight md:text-base">{risultato.nome}</span>
              <span className="ml-2 shrink-0 text-base font-bold tabular-nums md:text-lg" style={{ color: colore }}>
                {percentuale}%
              </span>
            </div>

            <div className="relative h-2.5 overflow-hidden rounded-full md:h-3" style={{ background: 'var(--color-bar-bg)' }}>
              <motion.span
                className="absolute left-0 top-0 h-full rounded-full shadow-lg"
                style={{ background: colore }}
                initial={{ width: 0 }}
                animate={{ width: `${percentuale}%` }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: posizione * 0.08 }}
              />
            </div>

            <p className="mt-1.5 text-[11px] tabular-nums md:text-xs" style={{ color: 'var(--fg-muta)' }}>
              Confrontate {risultato.confrontate} affermazioni su {risposteDate}
              {nonDocumentate > 0 ? ` · ${nonDocumentate} senza posizione documentata` : ''}
            </p>
          </div>

          <span
            aria-hidden
            className="shrink-0 text-xl leading-none transition-transform md:text-2xl"
            style={{ color: 'var(--fg-muta)', transform: aperto ? 'rotate(0)' : 'rotate(-90deg)' }}
          >
            ⋮
          </span>
        </div>
      </button>

      {aperto && (
        <div className="border-t px-3 py-4 md:px-4" style={{ borderColor: 'var(--bordo)' }}>
          {/* Per area */}
          {aree.length > 0 && (
            <section className="mb-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide">Accordo per area</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {aree.map(([area, valore]) => {
                  const { label, icona } = etichettaArea(area);
                  return (
                    <li key={area} className="text-xs md:text-sm">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden>{icona}</span>
                          {label}
                        </span>
                        <span className="tabular-nums" style={{ color: coloreAccordo(valore) }}>
                          {Math.round(valore * 100)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--color-bar-bg)' }}>
                        <div className="h-full rounded-full" style={{ width: `${valore * 100}%`, background: coloreAccordo(valore) }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Affermazione per affermazione, con la fonte */}
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide">Affermazione per affermazione</p>
            <ol className="space-y-3">
              {confronto.map((d) => {
                const affermazione = affermazioniPerId.get(d.affermazioneId);
                const pos = posizioniPerId.get(d.affermazioneId);
                const coloreRiga = coloreAccordo(d.accordo);
                return (
                  <li
                    key={d.affermazioneId}
                    className="border-l-2 pl-2.5 text-xs leading-snug md:pl-3 md:text-sm md:leading-relaxed"
                    style={{ borderColor: coloreRiga }}
                  >
                    <p>{affermazione?.testo}</p>
                    <p className="mt-1 tabular-nums" style={{ color: 'var(--fg-muta)' }}>
                      Tu: <strong style={{ color: 'var(--fg)' }}>{ETICHETTA_VALORE[d.rispostaUtente]}</strong> · {partito.sigla ?? partito.nome}:{' '}
                      <strong style={{ color: 'var(--fg)' }}>{ETICHETTA_VALORE[d.posizionePartito]}</strong> · accordo {Math.round(d.accordo * 100)}%
                    </p>
                    {pos && (
                      <p className="mt-0.5" style={{ color: 'var(--fg-muta)' }}>
                        Fonte ({ETICHETTA_FONTE[pos.fonte.tipo]}
                        {pos.fonte.data ? `, ${formattaDataBreve(pos.fonte.data)}` : ''}):{' '}
                        {pos.fonte.url ? (
                          <a
                            href={pos.fonte.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:opacity-80"
                            style={{ color: 'var(--accento)' }}
                          >
                            {pos.fonte.citazione}
                          </a>
                        ) : (
                          pos.fonte.citazione
                        )}
                        {pos.nota ? ` — ${pos.nota}` : ''}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      )}
    </li>
  );
}
