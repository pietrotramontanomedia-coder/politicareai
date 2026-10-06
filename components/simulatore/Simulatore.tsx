'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  centesimi,
  FONTI_LEGGE,
  formattaPercentuale,
  leggiPercentuale,
  portaACento,
  puntiEmiciclo,
  REGOLE,
  restoAdAltre,
  scenarioDaFrammento,
  scenarioInFrammento,
  simula,
  TESTI_SIMULATORE as T,
  type Esito,
  type IdRamo,
  type ListaInput,
  type Preset,
} from '@/lib/simulatore-elettorale';
import { STRUMENTI } from '@/lib/strumenti';
import { urlPubblico } from '@/lib/piattaforma';
import { CondividiSimulazione } from '@/components/condivisione/Condivisioni';

const DA_SOLA = '';
const PASSO = 0.5;
const PUNTI: Record<IdRamo, { x: number; y: number }[]> = {
  camera: puntiEmiciclo(REGOLE.camera.totale, 12),
  senato: puntiEmiciclo(REGOLE.senato.totale, 8),
};
const RAGGIO: Record<IdRamo, number> = { camera: 0.026, senato: 0.036 };

const CAMPO = { borderColor: 'var(--bordo)', background: 'var(--bg-elevated)', color: 'var(--fg)' };
const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-[var(--accento)]';

const seggiDi = (c: Esito['competitori'][number], ramo: IdRamo) => (ramo === 'camera' ? c.seggiCamera : c.seggiSenato);

export default function Simulatore({ preset }: { preset: Preset[] }) {
  const [idPreset, setIdPreset] = useState(preset[0].id);
  const [liste, setListe] = useState<ListaInput[]>(preset[0].liste);
  const [coalizioni, setCoalizioni] = useState(preset[0].coalizioni);
  const [maggioranzeDiverse, setMaggioranzeDiverse] = useState(false);
  // Lo scenario si scrive nell'indirizzo solo dopo aver letto quello arrivato con il link.
  const [lettoDalLink, setLettoDalLink] = useState(false);

  const esito = useMemo(() => simula(liste, { coalizioni, maggioranzeDiverse }), [liste, coalizioni, maggioranzeDiverse]);
  const presetAttivo = preset.find((p) => p.id === idPreset) ?? preset[0];
  const frammento = useMemo(
    () => scenarioInFrammento({ preset: idPreset, liste, coalizioni, maggioranzeDiverse }),
    [idPreset, liste, coalizioni, maggioranzeDiverse],
  );
  const percorso = `${STRUMENTI.simulatore.href}#${frammento}`;

  useEffect(() => {
    const scenario = scenarioDaFrammento(window.location.hash, preset);
    if (scenario) {
      // Il frammento esiste solo nel browser: il server mostra sempre il preset di partenza.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIdPreset(scenario.preset);
      setListe(scenario.liste);
      setCoalizioni(scenario.coalizioni);
      setMaggioranzeDiverse(scenario.maggioranzeDiverse);
    }
    setLettoDalLink(true);
  }, [preset]);

  // Indirizzo aggiornato con calma: i browser limitano le chiamate a replaceState mentre si trascina un cursore.
  useEffect(() => {
    if (!lettoDalLink) return;
    const attesa = window.setTimeout(() => {
      try {
        window.history.replaceState(window.history.state, '', `#${frammento}`);
      } catch {
        // Limite del browser raggiunto: l'indirizzo si aggiorna alla modifica successiva.
      }
    }, 400);
    return () => window.clearTimeout(attesa);
  }, [frammento, lettoDalLink]);

  const carica = (p: Preset) => {
    setIdPreset(p.id);
    setListe(p.liste);
    setCoalizioni(p.coalizioni);
    setMaggioranzeDiverse(false);
  };

  const aggiorna = (id: string, modifica: Partial<ListaInput>) =>
    setListe((prec) => prec.map((l) => (l.id === id ? { ...l, ...modifica } : l)));

  const imposta = (id: string, n: number) => aggiorna(id, { percentuale: centesimi(Math.min(100, Math.max(0, n))) });

  const fuoriCento = Math.abs(esito.totaleVoti - 100) > 0.005;
  const altre = liste.find((l) => l.aggregato);
  const mancante = centesimi(100 - esito.totaleVoti);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="occhiello">{T.etichetta}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{T.titolo}</h1>
      <p className="mt-3 max-w-3xl text-lg" style={{ color: 'var(--fg-muta)' }}>
        {T.descrizione}
      </p>
      <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--accento)' }}>
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
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${FOCUS}`}
            style={
              p.id === idPreset
                ? { background: 'var(--accento)', color: '#000', borderColor: 'var(--accento)' }
                : { borderColor: 'var(--bordo)' }
            }
          >
            {p.nome}
          </button>
        ))}
        <button
          type="button"
          onClick={() => carica(presetAttivo)}
          aria-label={T.ricominciaAria(presetAttivo.nome)}
          className={`rounded-full px-3 py-1.5 text-sm underline-offset-4 hover:underline ${FOCUS}`}
          style={{ color: 'var(--fg-muta)' }}
        >
          ↺ {T.ricomincia}
        </button>
      </div>
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Input */}
        <section aria-labelledby="liste" className="rounded-3xl border p-4 sm:p-5" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)' }}>
          <RiepilogoMobile esito={esito} />

          <div className="flex items-center justify-between gap-3">
            <h2 id="liste" className="text-lg font-semibold">
              {T.liste}
            </h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
              style={fuoriCento ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' } : { background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
            >
              {T.totale(esito.totaleVoti)}
            </span>
          </div>
          {fuoriCento && esito.totaleVoti > 0 && (
            <div className="mt-2">
              <p className="text-xs" style={{ color: '#fbbf24' }}>
                {T.totaleAvviso}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => setListe(portaACento)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${FOCUS}`} style={{ borderColor: 'var(--bordo)' }}>
                  {T.portaACento}
                </button>
                {altre && mancante > 0 && (
                  <button type="button" onClick={() => setListe(restoAdAltre)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${FOCUS}`} style={{ borderColor: 'var(--bordo)' }}>
                    {T.restoAdAltre(formattaPercentuale(mancante))}
                  </button>
                )}
              </div>
            </div>
          )}

          <ul className="mt-4 space-y-2">
            {liste.map((l) => (
              <li key={l.id} className="rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: l.colore }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={l.nome}>
                    {l.nome}
                  </span>
                  {!l.aggregato && (
                    <select
                      value={l.coalizione ?? DA_SOLA}
                      onChange={(e) => aggiorna(l.id, { coalizione: e.target.value || null })}
                      aria-label={`${T.coalizione} ${l.nome}`}
                      className={`w-32 shrink-0 rounded-lg border px-2 py-1 text-xs sm:w-40 ${FOCUS}`}
                      style={CAMPO}
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
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imposta(l.id, l.percentuale - PASSO)}
                    disabled={l.percentuale <= 0}
                    aria-label={T.meno(l.nome)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg leading-none disabled:opacity-40 ${FOCUS}`}
                    style={{ borderColor: 'var(--bordo)' }}
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={l.percentuale}
                    onChange={(e) => imposta(l.id, Number(e.target.value))}
                    aria-label={`${T.percentuale} ${l.nome}`}
                    aria-valuetext={`${formattaPercentuale(l.percentuale)}%`}
                    className="min-w-0 flex-1"
                    style={{ accentColor: l.colore }}
                  />
                  <button
                    type="button"
                    onClick={() => imposta(l.id, l.percentuale + PASSO)}
                    disabled={l.percentuale >= 100}
                    aria-label={T.piu(l.nome)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg leading-none disabled:opacity-40 ${FOCUS}`}
                    style={{ borderColor: 'var(--bordo)' }}
                  >
                    +
                  </button>
                  <CampoPercentuale id={`pct-${l.id}`} etichetta={`${T.percentuale} ${l.nome}`} valore={l.percentuale} onCambia={(n) => imposta(l.id, n)} />
                  <span className="text-sm" style={{ color: 'var(--fg-muta)' }} aria-hidden>
                    %
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <details className="group mt-4 rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)' }}>
            <summary className={`cursor-pointer list-none rounded text-sm font-semibold ${FOCUS}`}>
              {T.nomiCoalizioni} <span className="inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {Object.entries(coalizioni).map(([id, nome], i) => (
                <input
                  key={id}
                  type="text"
                  value={nome}
                  maxLength={40}
                  onChange={(e) => setCoalizioni((prec) => ({ ...prec, [id]: e.target.value }))}
                  onBlur={(e) => !e.target.value.trim() && setCoalizioni((prec) => ({ ...prec, [id]: presetAttivo.coalizioni[id] ?? id }))}
                  aria-label={T.nomeCoalizione(i + 1)}
                  className={`rounded-lg border px-2 py-1.5 text-sm ${FOCUS}`}
                  style={CAMPO}
                />
              ))}
            </div>
          </details>

          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)' }}>
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
        <section id="risultato" aria-label={T.titolo} className="scroll-mt-28 lg:sticky lg:top-24 lg:self-start">
          <Risultato esito={esito} percorso={percorso} />
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

const testoCampo = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 2, useGrouping: false });

/**
 * Campo numerico che lascia scrivere: si può svuotare, usare la virgola e passare da "12," a "12,5".
 * Il valore arriva al simulatore appena è un numero valido; all'uscita il campo mostra quello in uso.
 */
function CampoPercentuale({ id, etichetta, valore, onCambia }: { id: string; etichetta: string; valore: number; onCambia: (n: number) => void }) {
  const [bozza, setBozza] = useState<string | null>(null);

  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {etichetta}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        maxLength={6}
        value={bozza ?? testoCampo(valore)}
        onFocus={(e) => {
          setBozza(testoCampo(valore));
          e.currentTarget.select();
        }}
        onChange={(e) => {
          const testo = e.target.value;
          if (!/^[\d.,]*$/.test(testo)) return;
          setBozza(testo);
          const n = testo.trim() === '' ? 0 : leggiPercentuale(testo);
          if (n !== null) onCambia(n);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          const passo = (e.shiftKey ? 1 : 0.1) * (e.key === 'ArrowUp' ? 1 : -1);
          const n = centesimi(Math.min(100, Math.max(0, valore + passo)));
          setBozza(testoCampo(n));
          onCambia(n);
        }}
        onBlur={() => setBozza(null)}
        className={`w-16 shrink-0 rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums ${FOCUS}`}
        style={CAMPO}
      />
    </>
  );
}

/** Su telefono il risultato sta sotto le liste: questa striscia resta in vista mentre si modificano i voti. */
function RiepilogoMobile({ esito }: { esito: Esito }) {
  const totale = REGOLE.camera.totale;
  const conSeggi = esito.competitori.filter((c) => c.seggiCamera > 0);

  return (
    <div
      className="sticky z-20 -mx-4 -mt-4 mb-4 rounded-t-3xl border-b px-4 py-2.5 backdrop-blur-md sm:-mx-5 sm:-mt-5 sm:px-5 lg:hidden"
      style={{ top: 'calc(5rem + env(safe-area-inset-top))', borderColor: 'var(--bordo)', background: 'rgba(18,18,18,0.92)' }}
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold" style={{ color: 'var(--fg-muta)' }}>
          {T.riepilogo}
        </span>
        <a href="#risultato" className={`rounded font-semibold underline-offset-2 hover:underline ${FOCUS}`} style={{ color: 'var(--accento)' }}>
          {T.vaiAlRisultato} ↓
        </a>
      </div>
      <div className="relative mt-1.5 flex h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--bordo)' }} aria-hidden>
        {conSeggi.map((c) => (
          <span key={c.id} style={{ width: `${(c.seggiCamera / totale) * 100}%`, background: c.colore }} />
        ))}
        <span className="absolute inset-y-0 w-0.5" style={{ left: `${(REGOLE.camera.maggioranza / totale) * 100}%`, background: 'var(--fg)' }} />
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums">
        {conSeggi.slice(0, 4).map((c) => (
          <li key={c.id} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: c.colore }} aria-hidden />
            <span className="max-w-[7rem] truncate">{c.nome}</span>
            <strong>{c.seggiCamera}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Risultato({ esito, percorso }: { esito: Esito; percorso: string }) {
  const [ramo, setRamo] = useState<IdRamo>('camera');
  const regole = REGOLE[ramo];
  const nomeRamo = ramo === 'camera' ? T.camera : T.senato;

  const ordinati = [...esito.competitori].sort((a, b) => seggiDi(b, ramo) - seggiDi(a, ramo));
  const colori: string[] = [];
  for (const c of ordinati) for (let i = 0; i < seggiDi(c, ramo); i++) colori.push(c.colore);
  while (colori.length < regole.totale) colori.push('var(--bordo)');
  const primo = ordinati[0];

  const vincitore = esito.competitori.find((c) => c.id === esito.premio.vincitore);
  const messaggio = esito.premio.motivo === 'assegnato' && vincitore ? T.premio.assegnato(vincitore.nome) : T.premio[esito.premio.motivo as Exclude<typeof esito.premio.motivo, 'assegnato'>];
  const qualcunoHaMaggioranza = esito.competitori.some((c) => c.seggiCamera >= REGOLE.camera.maggioranza);

  return (
    <div className="rounded-3xl border p-4 sm:p-5" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)' }}>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <CopiaLink percorso={percorso} />
        <CondividiSimulazione esito={esito} percorso={percorso} />
      </div>
      <p
        aria-live="polite"
        className="rounded-2xl px-3 py-2 text-sm font-semibold"
        style={
          esito.premio.motivo === 'assegnato'
            ? { background: 'rgba(254,220,1,0.12)', color: 'var(--accento)' }
            : { background: 'var(--bg-card)', color: 'var(--fg-muta)' }
        }
      >
        {messaggio}
      </p>

      <div role="group" aria-label={T.vista} className="mt-4 inline-flex rounded-full border p-0.5" style={{ borderColor: 'var(--bordo)' }}>
        {(['camera', 'senato'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRamo(r)}
            aria-pressed={ramo === r}
            className={`rounded-full px-4 py-1 text-sm font-semibold ${FOCUS}`}
            style={ramo === r ? { background: 'var(--fg)', color: 'var(--bg)' } : { color: 'var(--fg-muta)' }}
          >
            {r === 'camera' ? T.camera : `${T.senato} (${T.stima})`}
          </button>
        ))}
      </div>

      <svg
        viewBox="-1.06 -1.06 2.12 1.16"
        className="mt-3 w-full"
        role="img"
        aria-label={T.emiciclo(nomeRamo, ordinati.map((c) => `${c.nome} ${seggiDi(c, ramo)}`).join(', '))}
      >
        {PUNTI[ramo].map((p, i) => (
          <circle key={i} cx={p.x} cy={-p.y} r={RAGGIO[ramo]} fill={colori[i]} />
        ))}
        <text x={0} y={-0.16} textAnchor="middle" fontSize={0.2} fontWeight={700} fill="var(--fg)">
          {primo ? seggiDi(primo, ramo) : 0}
        </text>
        {primo && (
          <text x={0} y={-0.06} textAnchor="middle" fontSize={0.06} fill="var(--fg-muta)">
            {T.seggiDi(primo.nome.length > 26 ? `${primo.nome.slice(0, 25)}…` : primo.nome)}
          </text>
        )}
        <text x={0} y={0.05} textAnchor="middle" fontSize={0.06} fill="var(--fg-muta)">
          {T.maggioranza(regole.maggioranza, regole.totale)}
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
                {T.voti}
              </th>
              <th scope="col" className="py-1.5 pl-2 text-right font-medium">
                {T.camera}
              </th>
              <th scope="col" className="py-1.5 pl-2 text-right font-medium">
                {T.senato} <span className="text-xs">({T.stima})</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {esito.competitori.map((c) => (
              <tr key={c.id} className="border-t align-top" style={{ borderColor: 'var(--bordo)' }}>
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.colore }} aria-hidden />
                    {c.nome}
                  </span>
                  {c.tipo === 'coalizione' && (
                    <span className="mt-0.5 block pl-5 text-xs" style={{ color: 'var(--fg-muta)' }}>
                      {T.coalizioneDi(c.listeConSeggi.map((l) => l.nome).join(', '))}
                    </span>
                  )}
                  {(['camera', 'senato'] as const)
                    .filter((r) => seggiDi(c, r) >= REGOLE[r].maggioranza)
                    .map((r) => (
                      <span
                        key={r}
                        className="mt-1 ml-5 mr-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                      >
                        {T.conMaggioranza[r]}
                      </span>
                    ))}
                </th>
                <td className="py-2 text-right tabular-nums">{formattaPercentuale(c.quota)}%</td>
                <td className="py-2 pl-2 text-right text-base font-bold tabular-nums">{c.seggiCamera}</td>
                <td className="py-2 pl-2 text-right tabular-nums">{c.seggiSenato}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 space-y-1 text-xs" style={{ color: 'var(--fg-muta)' }}>
        {esito.totaleVoti > 0 && !qualcunoHaMaggioranza && <li>{T.senzaMaggioranza}</li>}
        <li>
          {T.estero}: {REGOLE.camera.estero} deputati, {REGOLE.senato.estero} senatori
        </li>
        {esito.totaleVoti > 0 && <li>{T.dispersi(formattaPercentuale(esito.votiDispersi))}</li>}
        {esito.coalizioniSottoSoglia.length > 0 && <li>{T.coalizioniSottoSoglia(esito.coalizioniSottoSoglia.join(', '))}</li>}
      </ul>
    </div>
  );
}

/** Copia l'indirizzo pubblico con lo scenario nel frammento: nessun dato passa da un server. */
function CopiaLink({ percorso }: { percorso: string }) {
  const [stato, setStato] = useState<'fermo' | 'copiato' | 'errore'>('fermo');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copia() {
    try {
      await navigator.clipboard.writeText(urlPubblico(percorso));
      setStato('copiato');
    } catch {
      setStato('errore');
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStato('fermo'), 2500);
  }

  return (
    <>
      <button
        type="button"
        onClick={copia}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${FOCUS}`}
        style={{ borderColor: 'var(--bordo)' }}
      >
        {stato === 'copiato' ? `✓ ${T.linkCopiato}` : T.copiaLink}
      </button>
      <span className="sr-only" aria-live="polite">
        {stato === 'copiato' ? T.linkCopiato : stato === 'errore' ? T.linkNonCopiato : ''}
      </span>
      {stato === 'errore' && (
        <span className="w-full text-right text-xs" style={{ color: '#fbbf24' }}>
          {T.linkNonCopiato}
        </span>
      )}
    </>
  );
}

function DettaglioListe({ esito }: { esito: Esito }) {
  return (
    <details className="group mt-6 rounded-3xl border p-4 sm:p-5" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}>
      <summary className={`cursor-pointer list-none rounded text-base font-semibold ${FOCUS}`}>
        {T.dettaglioListe} <span className="inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none">›</span>
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
              <th scope="col" className="py-1.5 pl-2 text-right font-medium">
                {T.camera}
              </th>
              <th scope="col" className="py-1.5 pl-2 text-right font-medium">
                {T.senato}
              </th>
            </tr>
          </thead>
          <tbody>
            {esito.liste.map(({ lista, stato, seggiCamera, seggiSenato }) => (
              <tr key={lista.id} className="border-t" style={{ borderColor: 'var(--bordo)' }}>
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: lista.colore }} aria-hidden />
                    {lista.nome}
                  </span>
                </th>
                <td className="py-2 text-right tabular-nums">{formattaPercentuale(lista.percentuale)}</td>
                <td
                  className="py-2 pl-3 text-xs"
                  style={{ color: stato === 'in-parlamento' || stato === 'miglior-perdente' ? '#22c55e' : 'var(--fg-muta)' }}
                >
                  {T.stati[stato]}
                </td>
                <td className="py-2 pl-2 text-right font-semibold tabular-nums">{seggiCamera}</td>
                <td className="py-2 pl-2 text-right tabular-nums">{seggiSenato}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
