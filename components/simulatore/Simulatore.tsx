'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FONTI_LEGGE,
  formattaPercentuale,
  LOCALI,
  puntiEmiciclo,
  REGOLE,
  ribilancia,
  simula,
  TESTI_SIMULATORE as T,
  type Esito,
  type GeografiaSenato,
  type ListaInput,
  type Preset,
  type SeggiSpeciali,
} from '@/lib/simulatore-elettorale';
import { CondividiSimulazione } from '@/components/condivisione/Condivisioni';

const DA_SOLA = '';
const PUNTI_CAMERA = puntiEmiciclo(REGOLE.camera.totale, 12);

type Speciali = { camera: SeggiSpeciali; senato: SeggiSpeciali };

const specialiDi = (p: Preset): Speciali => ({ camera: { ...(p.speciali?.camera ?? {}) }, senato: { ...(p.speciali?.senato ?? {}) } });

export default function Simulatore({ preset, geografia, incorporato = false }: { preset: Preset[]; geografia?: GeografiaSenato; incorporato?: boolean }) {
  const [idPreset, setIdPreset] = useState(preset[0].id);
  const [liste, setListe] = useState<ListaInput[]>(preset[0].liste);
  const [coalizioni, setCoalizioni] = useState(preset[0].coalizioni);
  const [maggioranzeDiverse, setMaggioranzeDiverse] = useState(false);
  const [speciali, setSpeciali] = useState<Speciali>(specialiDi(preset[0]));
  const [bloccate, setBloccate] = useState<Set<string>>(new Set());

  const esito = useMemo(
    () => simula(liste, { coalizioni, maggioranzeDiverse, speciali, geografia }),
    [liste, coalizioni, maggioranzeDiverse, speciali, geografia],
  );
  const presetAttivo = preset.find((p) => p.id === idPreset);

  const carica = (p: Preset) => {
    setIdPreset(p.id);
    setListe(p.liste);
    setCoalizioni(p.coalizioni);
    setMaggioranzeDiverse(false);
    setSpeciali(specialiDi(p));
    setBloccate(new Set());
  };

  const blocca = (id: string) =>
    setBloccate((prec) => {
      const nuove = new Set(prec);
      if (nuove.has(id)) nuove.delete(id);
      else nuove.add(id);
      return nuove;
    });

  const aggiorna = (id: string, modifica: Partial<ListaInput>) =>
    setListe((prec) => prec.map((l) => (l.id === id ? { ...l, ...modifica } : l)));

  const impostaPercentuale = (id: string, valore: string) => {
    const n = Number.parseFloat(valore.replace(',', '.'));
    setListe((prec) => ribilancia(prec, id, Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0, bloccate));
  };

  return (
    <main className={incorporato ? 'mx-auto max-w-6xl px-3 py-4 sm:px-4' : 'mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16'}>
      {!incorporato && (
        <>
          <p className="occhiello">{T.etichetta}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{T.titolo}</h1>
          <p className="mt-3 max-w-3xl text-lg" style={{ color: 'var(--fg-muta)' }}>
            {T.descrizione}
          </p>
        </>
      )}
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
          <p className="mt-2 text-xs" style={{ color: 'var(--fg-muta)' }}>
            {T.ribilancia}
          </p>

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
                  <button
                    type="button"
                    onClick={() => blocca(l.id)}
                    aria-pressed={bloccate.has(l.id)}
                    aria-label={bloccate.has(l.id) ? T.sblocca(l.nome) : T.blocca(l.nome)}
                    title={bloccate.has(l.id) ? T.sblocca(l.nome) : T.blocca(l.nome)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors"
                    style={
                      bloccate.has(l.id)
                        ? { background: 'var(--accento)', borderColor: 'var(--accento)', color: '#000' }
                        : { borderColor: 'var(--bordo)', color: 'var(--fg-muta)' }
                    }
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      {bloccate.has(l.id) ? <path d="M8 11V7a4 4 0 0 1 8 0v4" /> : <path d="M8 11V7a4 4 0 0 1 7.5-2" />}
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={l.aggregato ? 100 : 60}
                    step={0.1}
                    value={Math.min(l.aggregato ? 100 : 60, l.percentuale)}
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

          <Speciali esito={esito} speciali={speciali} onChange={setSpeciali} />
        </section>

        {/* Risultato */}
        <section aria-live="polite" className="lg:sticky lg:top-24 lg:self-start">
          <Risultato esito={esito} />
        </section>
      </div>

      <DettaglioListe esito={esito} />
      <Regioni esito={esito} />

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

      {!incorporato && (
        <div className="mt-10 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
          <Link href="/confronta" className="font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--accento)' }}>
            {T.collegamenti.confronta} →
          </Link>
          <Link href="/test-partito" className="underline-offset-4 hover:underline" style={{ color: 'var(--fg-muta)' }}>
            {T.collegamenti.test} →
          </Link>
        </div>
      )}
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
      <div className="mb-3 flex justify-end">
        <CondividiSimulazione esito={esito} />
      </div>
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
          {esito.correzioniTettoSenato.length > 0 && <li>{T.correzioniSenato(esito.correzioniTettoSenato.length)}</li>}
        </ul>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: 'var(--fg-muta)' }}>
              <th scope="col" className="py-1.5 font-medium" />
              <th scope="col" className="py-1.5 pl-3 text-right font-medium">
                {T.votiUtili}
              </th>
              <th scope="col" className="py-1.5 pl-3 text-right font-medium">
                {T.camera}
              </th>
              <th scope="col" className="py-1.5 pl-3 text-right font-medium">
                {T.senato} <span className="block text-xs font-normal">({T.stima})</span>
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
                  {c.tipo !== 'locali' && (c.camera.premio > 0 || c.camera.speciali > 0) && (
                    <span className="mt-0.5 block pl-5 text-xs" style={{ color: 'var(--fg-muta)' }}>
                      {T.camera}: {T.composizione(c.camera.proporzionali, c.camera.premio, c.camera.speciali)}
                    </span>
                  )}
                  {c.seggiCamera >= REGOLE.camera.maggioranza && (
                    <span className="mt-1 ml-5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                      {T.conMaggioranza}
                      {c.seggiSenato >= REGOLE.senato.maggioranza ? ` · ${T.maggioranzaSenato}` : ''}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">{c.tipo === 'locali' ? '' : `${formattaPercentuale(c.quota)}%`}</td>
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
            {esito.liste.map(({ lista, stato, statoSenato, seggiCamera, seggiSenato }) => (
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
                  {statoSenato !== stato && statoSenato === 'in-parlamento' && <span className="block">{T.statoSenatoDiverso}</span>}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">{seggiCamera}</td>
                <td className="py-2 text-right tabular-nums">{seggiSenato}</td>
              </tr>
            ))}
            {esito.competitori
              .filter((c) => c.camera.premio > 0 || c.senato.premio > 0)
              .map((c) => (
                <tr key={`premio-${c.id}`} className="border-t" style={{ borderColor: 'var(--bordo)' }}>
                  <td className="py-2 pr-2" colSpan={3}>
                    {T.premioListino}: {c.nome}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums">{c.camera.premio}</td>
                  <td className="py-2 text-right tabular-nums">{c.senato.premio}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: 'var(--fg-muta)' }}>
          {T.dettaglioListeNota}
        </p>
      </div>
    </details>
  );
}

function Speciali({ esito, speciali, onChange }: { esito: Esito; speciali: { camera: SeggiSpeciali; senato: SeggiSpeciali }; onChange: (s: { camera: SeggiSpeciali; senato: SeggiSpeciali }) => void }) {
  const scelte = [
    ...esito.competitori.filter((c) => c.tipo !== 'locali').map((c) => ({ id: c.id, nome: c.nome, colore: c.colore })),
    { id: LOCALI, nome: T.specialiLocali, colore: '#9ca3af' },
  ];
  const valore = (ramo: 'camera' | 'senato', id: string) => {
    const c = esito.competitori.find((x) => x.id === id);
    return c ? c[ramo].speciali : 0;
  };
  const cambia = (ramo: 'camera' | 'senato', id: string, delta: number) => {
    const max = REGOLE[ramo].speciali;
    const attuale: SeggiSpeciali = Object.fromEntries(scelte.map((x) => [x.id, valore(ramo, x.id)]));
    const nuovo = Math.min(max, Math.max(0, (attuale[id] ?? 0) + delta));
    if (nuovo === attuale[id]) return;
    attuale[id] = nuovo;
    // Il totale resta fisso: si toglie o si aggiunge alle liste locali, poi agli altri.
    let scarto = Object.values(attuale).reduce((a, b) => a + b, 0) - max;
    for (const x of [LOCALI, ...scelte.map((y) => y.id)]) {
      if (scarto === 0 || x === id) continue;
      const v = attuale[x] ?? 0;
      const passo = scarto > 0 ? Math.min(v, scarto) : scarto;
      attuale[x] = v - passo;
      scarto -= passo;
    }
    onChange({ ...speciali, [ramo]: attuale });
  };

  return (
    <details className="group mt-4 rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)' }}>
      <summary className="cursor-pointer list-none text-sm font-semibold">
        {T.specialiTitolo} <span className="inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <p className="mt-2 text-xs" style={{ color: 'var(--fg-muta)' }}>
        {T.specialiNota}
      </p>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr style={{ color: 'var(--fg-muta)' }}>
            <th scope="col" className="py-1 font-medium" />
            <th scope="col" className="py-1 text-center font-medium">
              {T.camera} ({REGOLE.camera.speciali})
            </th>
            <th scope="col" className="py-1 text-center font-medium">
              {T.senato} ({REGOLE.senato.speciali})
            </th>
          </tr>
        </thead>
        <tbody>
          {scelte.map((x) => (
            <tr key={x.id} className="border-t" style={{ borderColor: 'var(--bordo)' }}>
              <td className="py-1.5 pr-2 text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.colore }} aria-hidden />
                  {x.nome}
                </span>
              </td>
              {(['camera', 'senato'] as const).map((ramo) => (
                <td key={ramo} className="py-1.5 text-center">
                  <span className="inline-flex items-center gap-1.5">
                    <button type="button" onClick={() => cambia(ramo, x.id, -1)} aria-label={`Un seggio in meno a ${x.nome}, ${ramo}`} className="h-6 w-6 rounded-full border text-xs" style={{ borderColor: 'var(--bordo)' }}>
                      −
                    </button>
                    <span className="w-4 tabular-nums">{valore(ramo, x.id)}</span>
                    <button type="button" onClick={() => cambia(ramo, x.id, 1)} aria-label={`Un seggio in più a ${x.nome}, ${ramo}`} className="h-6 w-6 rounded-full border text-xs" style={{ borderColor: 'var(--bordo)' }}>
                      +
                    </button>
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function Regioni({ esito }: { esito: Esito }) {
  const competitori = esito.competitori.filter((c) => c.tipo !== 'locali' && c.senato.proporzionali > 0);
  const vincitore = esito.competitori.find((c) => c.id === esito.premio.vincitore);
  return (
    <details className="group mt-4 rounded-3xl border p-4 sm:p-5" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}>
      <summary className="cursor-pointer list-none text-base font-semibold">
        {T.regioniTitolo} <span className="inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <p className="mt-2 text-xs" style={{ color: 'var(--fg-muta)' }}>
        {T.regioniNota}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: 'var(--fg-muta)' }}>
              <th scope="col" className="py-1.5 font-medium">
                {T.regione}
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                {T.seggiRegione}
              </th>
              {competitori.map((c) => (
                <th key={c.id} scope="col" className="py-1.5 pl-3 text-right font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.colore }} aria-hidden />
                    {c.nome}
                  </span>
                </th>
              ))}
              {vincitore && (
                <th scope="col" className="py-1.5 pl-3 text-right font-medium">
                  {T.premioRegione(vincitore.nome)}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {esito.regioniSenato.map((r) => (
              <tr key={r.regione.id} className="border-t" style={{ borderColor: 'var(--bordo)' }}>
                <td className="py-1.5 pr-2">{r.regione.nome}</td>
                <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--fg-muta)' }}>
                  {Object.values(r.seggi).reduce((a, b) => a + b, 0)}
                </td>
                {competitori.map((c) => (
                  <td key={c.id} className="py-1.5 pl-3 text-right tabular-nums">
                    {r.seggi[c.id] ?? 0}
                  </td>
                ))}
                {vincitore && <td className="py-1.5 pl-3 text-right tabular-nums">+{r.regione.premio}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
