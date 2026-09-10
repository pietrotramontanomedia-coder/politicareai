'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FONTI_LEGGE,
  formattaPercentuale,
  puntiEmiciclo,
  REGOLE,
  simula,
  TESTI_SIMULATORE as T,
  type Esito,
  type ListaInput,
  type Preset,
} from '@/lib/simulatore-elettorale';

const DA_SOLA = '';
const PUNTI_CAMERA = puntiEmiciclo(REGOLE.camera.totale, 12);

export default function Simulatore({ preset }: { preset: Preset[] }) {
  const [idPreset, setIdPreset] = useState(preset[0].id);
  const [liste, setListe] = useState<ListaInput[]>(preset[0].liste);
  const [coalizioni, setCoalizioni] = useState(preset[0].coalizioni);
  const [maggioranzeDiverse, setMaggioranzeDiverse] = useState(false);

  const esito = useMemo(() => simula(liste, { coalizioni, maggioranzeDiverse }), [liste, coalizioni, maggioranzeDiverse]);
  const presetAttivo = preset.find((p) => p.id === idPreset);

  const carica = (p: Preset) => {
    setIdPreset(p.id);
    setListe(p.liste);
    setCoalizioni(p.coalizioni);
    setMaggioranzeDiverse(false);
  };

  const aggiorna = (id: string, modifica: Partial<ListaInput>) =>
    setListe((prec) => prec.map((l) => (l.id === id ? { ...l, ...modifica } : l)));

  const impostaPercentuale = (id: string, valore: string) => {
    const n = Number.parseFloat(valore.replace(',', '.'));
    aggiorna(id, { percentuale: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="occhiello">{T.etichetta}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{T.titolo}</h1>
      <p className="mt-3 max-w-3xl text-lg" style={{ color: 'var(--fg-muta)' }}>
        {T.descrizione}
      </p>
      <p className="mt-2 text-sm" style={{ color: 'var(--accento)' }}>
        {T.stato}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--fg-muta)' }}>
          {T.partiDa}
        </span>
        {preset.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => carica(p)}
            aria-pressed={p.id === idPreset}
            className="rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors"
            style={
              p.id === idPreset
                ? { background: 'var(--accento)', color: '#000', borderColor: 'var(--accento)' }
                : { borderColor: 'var(--bordo)' }
            }
          >
            {p.nome}
          </button>
        ))}
      </div>
      {presetAttivo && (
        <p className="mt-2 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {presetAttivo.descrizione}
          {presetAttivo.fonte && (
            <>
              {' '}
              {T.fontePreset}:{' '}
              <a href={presetAttivo.fonte.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {presetAttivo.fonte.citazione}
              </a>
              .
            </>
          )}
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Input */}
        <section aria-labelledby="liste" className="rounded-3xl border p-4 sm:p-5" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="liste" className="text-lg font-semibold">
              {T.liste}
            </h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
              style={
                Math.abs(esito.totaleVoti - 100) > 0.05
                  ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }
                  : { background: 'rgba(34,197,94,0.12)', color: '#22c55e' }
              }
            >
              {T.totale(esito.totaleVoti)}
            </span>
          </div>
          {Math.abs(esito.totaleVoti - 100) > 0.05 && esito.totaleVoti > 0 && (
            <p className="mt-2 text-xs" style={{ color: '#fbbf24' }}>
              {T.totaleAvviso}
            </p>
          )}

          <ul className="mt-4 space-y-2">
            {liste.map((l) => (
              <li key={l.id} className="rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: l.colore }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{l.nome}</span>
                  <label className="sr-only" htmlFor={`pct-${l.id}`}>
                    {T.percentuale} {l.nome}
                  </label>
                  <input
                    id={`pct-${l.id}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.1}
                    value={l.percentuale}
                    onChange={(e) => impostaPercentuale(l.id, e.target.value)}
                    className="w-20 rounded-lg border px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-[var(--accento)]"
                    style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)', color: 'var(--fg)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--fg-muta)' }}>
                    %
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={0.1}
                    value={Math.min(60, l.percentuale)}
                    onChange={(e) => impostaPercentuale(l.id, e.target.value)}
                    aria-label={`${T.percentuale} ${l.nome}`}
                    className="min-w-0 flex-1"
                    style={{ accentColor: l.colore }}
                  />
                  {!l.aggregato && (
                    <select
                      value={l.coalizione ?? DA_SOLA}
                      onChange={(e) => aggiorna(l.id, { coalizione: e.target.value || null })}
                      aria-label={`${T.coalizione} ${l.nome}`}
                      className="w-40 rounded-lg border px-2 py-1 text-xs outline-none focus:border-[var(--accento)]"
                      style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)', color: 'var(--fg)' }}
                    >
                      <option value={DA_SOLA}>{T.daSola}</option>
                      {Object.entries(coalizioni).map(([id, nome]) => (
                        <option key={id} value={id}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)' }}>
            <input
              type="checkbox"
              checked={maggioranzeDiverse}
              onChange={(e) => setMaggioranzeDiverse(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accento)]"
            />
            <span>
              <span className="block text-sm font-semibold">{T.maggioranzeDiverse}</span>
              <span className="block text-xs" style={{ color: 'var(--fg-muta)' }}>
                {T.maggioranzeDiverseNota}
              </span>
            </span>
          </label>
        </section>

        {/* Risultato */}
        <section aria-live="polite" className="lg:sticky lg:top-24 lg:self-start">
          <Risultato esito={esito} />
        </section>
      </div>

      <DettaglioListe esito={esito} />

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold">{T.regoleTitolo}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
            {T.regole.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-semibold">{T.fonti}</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {FONTI_LEGGE.map((f) => (
              <li key={f.url}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: 'var(--accento)' }}>
                  {f.citazione}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border p-5" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}>
          <h2 className="text-lg font-semibold">{T.approssimazioniTitolo}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
            {T.approssimazioni.map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs" style={{ color: 'var(--fg-muta)' }}>
            {T.verifica}
          </p>
        </div>
      </section>

      <div className="mt-10 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
        <Link href="/confronta" className="font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--accento)' }}>
          {T.collegamenti.confronta} →
        </Link>
        <Link href="/test-partito" className="underline-offset-4 hover:underline" style={{ color: 'var(--fg-muta)' }}>
          {T.collegamenti.test} →
        </Link>
      </div>
    </main>
  );
}

function Risultato({ esito }: { esito: Esito }) {
  const colori: string[] = [];
  for (const c of esito.competitori) for (let i = 0; i < c.seggiCamera; i++) colori.push(c.colore);
  while (colori.length < REGOLE.camera.totale) colori.push('var(--bordo)');

  const vincitore = esito.competitori.find((c) => c.id === esito.premio.vincitore);
  const messaggio = esito.premio.motivo === 'assegnato' && vincitore ? T.premio.assegnato(vincitore.nome) : T.premio[esito.premio.motivo as Exclude<typeof esito.premio.motivo, 'assegnato'>];

  return (
    <div className="rounded-3xl border p-4 sm:p-5" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)' }}>
      <p
        className="rounded-2xl px-3 py-2 text-sm font-semibold"
        style={
          esito.premio.motivo === 'assegnato'
            ? { background: 'rgba(254,220,1,0.12)', color: 'var(--accento)' }
            : { background: 'var(--bg-card)', color: 'var(--fg-muta)' }
        }
      >
        {messaggio}
      </p>

      <svg viewBox="-1.06 -1.06 2.12 1.14" className="mt-4 w-full" role="img" aria-label={`Emiciclo della Camera: ${esito.competitori.map((c) => `${c.nome} ${c.seggiCamera}`).join(', ')}`}>
        {PUNTI_CAMERA.map((p, i) => (
          <circle key={i} cx={p.x} cy={-p.y} r={0.026} fill={colori[i]} />
        ))}
        <text x={0} y={-0.12} textAnchor="middle" fontSize={0.2} fontWeight={700} fill="var(--fg)">
          {esito.competitori[0]?.seggiCamera ?? 0}
        </text>
        <text x={0} y={0.02} textAnchor="middle" fontSize={0.07} fill="var(--fg-muta)">
          {T.maggioranza(REGOLE.camera.maggioranza, REGOLE.camera.totale)}
        </text>
      </svg>

      {(esito.tettoCamera || esito.tettoSenato) && (
        <ul className="mt-2 space-y-1 text-xs" style={{ color: 'var(--fg-muta)' }}>
          {esito.tettoCamera && <li>{T.tetto(T.camera, REGOLE.camera.tetto)}</li>}
          {esito.tettoSenato && <li>{T.tetto(T.senato, REGOLE.senato.tetto)}</li>}
        </ul>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: 'var(--fg-muta)' }}>
              <th scope="col" className="py-1.5 font-medium" />
              <th scope="col" className="py-1.5 text-right font-medium">
                {T.votiUtili}
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                {T.camera}
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                {T.senato} <span className="text-xs">({T.stima})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {esito.competitori.map((c) => (
              <tr key={c.id} className="border-t align-top" style={{ borderColor: 'var(--bordo)' }}>
                <td className="py-2 pr-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.colore }} aria-hidden />
                    {c.nome}
                  </span>
                  {c.tipo === 'coalizione' && (
                    <span className="mt-0.5 block pl-5 text-xs" style={{ color: 'var(--fg-muta)' }}>
                      {T.coalizioneDi(c.listeConSeggi.map((l) => l.nome).join(', '))}
                    </span>
                  )}
                  {c.seggiCamera >= REGOLE.camera.maggioranza && (
                    <span className="mt-1 ml-5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                      {T.conMaggioranza}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">{formattaPercentuale(c.quota)}%</td>
                <td className="py-2 text-right text-base font-bold tabular-nums">{c.seggiCamera}</td>
                <td className="py-2 text-right tabular-nums">{c.seggiSenato}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 space-y-1 text-xs" style={{ color: 'var(--fg-muta)' }}>
        <li>
          {T.estero}: {REGOLE.camera.estero} deputati, {REGOLE.senato.estero} senatori
        </li>
        {esito.totaleVoti > 0 && <li>{T.dispersi(formattaPercentuale(esito.votiDispersi))}</li>}
        {esito.coalizioniSottoSoglia.length > 0 && <li>{T.coalizioniSottoSoglia(esito.coalizioniSottoSoglia.join(', '))}</li>}
      </ul>
    </div>
  );
}

function DettaglioListe({ esito }: { esito: Esito }) {
  return (
    <details className="group mt-6 rounded-3xl border p-4 sm:p-5" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}>
      <summary className="cursor-pointer list-none text-base font-semibold">
        {T.dettaglioListe} <span className="inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: 'var(--fg-muta)' }}>
              <th scope="col" className="py-1.5 font-medium" />
              <th scope="col" className="py-1.5 text-right font-medium">
                %
              </th>
              <th scope="col" className="py-1.5 pl-3 font-medium" />
              <th scope="col" className="py-1.5 text-right font-medium">
                {T.camera}
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                {T.senato}
              </th>
            </tr>
          </thead>
          <tbody>
            {esito.liste.map(({ lista, stato, seggiCamera, seggiSenato }) => (
              <tr key={lista.id} className="border-t" style={{ borderColor: 'var(--bordo)' }}>
                <td className="py-2 pr-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: lista.colore }} aria-hidden />
                    {lista.nome}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{formattaPercentuale(lista.percentuale)}</td>
                <td className="py-2 pl-3 text-xs" style={{ color: stato === 'in-parlamento' ? '#22c55e' : 'var(--fg-muta)' }}>
                  {T.stati[stato]}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">{seggiCamera}</td>
                <td className="py-2 text-right tabular-nums">{seggiSenato}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
