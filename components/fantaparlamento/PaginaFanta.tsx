'use client';

import { useMemo, useState } from 'react';
import {
  costoSquadra,
  puntiSquadra,
  validaSquadra,
  type DeputatoListone,
  type Giornata,
  type RegoleFanta,
  type Squadra,
} from '@politicare/motore';
import { useProfilo } from '@/components/profilo/ProfiloProvider';
import { nomeProprio, TESTI_FANTA as T } from '@/lib/fantaparlamento/testi';
import { impostaRosaFanta } from '@/lib/profilo/regole';
import type { RosaFanta } from '@/lib/profilo/tipi';
import { conAlfa, STRUMENTI } from '@/lib/strumenti';

interface InfoStagione {
  id: string;
  nome: string;
  ramo: string;
  fonti: { citazione: string; url: string }[];
}

interface Props {
  stagione: InfoStagione;
  regole: RegoleFanta;
  listone: DeputatoListone[];
  giornata: Giornata | null;
  etichettaGiornata: string | null;
  giornateValide: number;
}

const COLORE = STRUMENTI.fanta.colore;
const VETRO = { borderColor: 'rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)), var(--bg-card)' };
const PASSO_LISTONE = 40;

type Filtro = 'tutti' | 'maggioranza' | 'opposizione' | 'misto';
type Ordine = 'prezzo' | 'media' | 'cognome';

const nomeCompleto = (d: DeputatoListone) => `${nomeProprio(d.nome)} ${nomeProprio(d.cognome)}`;

export default function PaginaFanta(props: Props) {
  const { pronto, profilo } = useProfilo();

  if (!pronto) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6" aria-busy="true">
        <div className="skeleton-shimmer h-40 rounded-3xl" style={{ background: 'var(--bg-card)' }} />
        <div className="skeleton-shimmer mt-4 h-96 rounded-3xl" style={{ background: 'var(--bg-card)' }} />
      </main>
    );
  }

  const salvata = profilo?.fanta?.stagione === props.stagione.id ? profilo.fanta : null;
  // La chiave riallinea l'editor alla rosa salvata ogni volta che cambia.
  return <Editor key={salvata?.aggiornataIl ?? 'nuova'} {...props} salvata={salvata} />;
}

function Editor({ stagione, regole, listone, giornata, etichettaGiornata, giornateValide, salvata }: Props & { salvata: RosaFanta | null }) {
  const { aggiorna } = useProfilo();
  const [squadra, setSquadra] = useState<Squadra>({ deputati: salvata?.deputati ?? [], capitano: salvata?.capitano ?? null });
  const [ricerca, setRicerca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('tutti');
  const [ordine, setOrdine] = useState<Ordine>('prezzo');
  const [quanti, setQuanti] = useState(PASSO_LISTONE);

  const perId = useMemo(() => new Map(listone.map((d) => [d.id, d])), [listone]);
  const scelti = squadra.deputati.map((id) => perId.get(id)).filter((d): d is DeputatoListone => Boolean(d));
  const costo = costoSquadra(squadra, listone);
  const errori = validaSquadra(squadra, listone, regole).filter((e) => e.regola !== 'numero');
  const mancano = regole.titolari - squadra.deputati.length;
  const completa = mancano === 0 && errori.length === 0 && squadra.capitano !== null;
  const modificata = !salvata || salvata.capitano !== squadra.capitano || salvata.deputati.join('|') !== squadra.deputati.join('|');
  const maggioranza = scelti.filter((d) => d.schieramento === 'maggioranza').length;
  const opposizione = scelti.filter((d) => d.schieramento === 'opposizione').length;

  const visibili = useMemo(() => {
    const testo = ricerca.trim().toLowerCase();
    return listone
      .filter((d) => (filtro === 'tutti' ? true : d.schieramento === filtro))
      .filter((d) => !testo || `${d.nome} ${d.cognome} ${d.sigla}`.toLowerCase().includes(testo))
      .sort((a, b) =>
        ordine === 'prezzo' ? b.prezzo - a.prezzo : ordine === 'media' ? b.mediaPunti - a.mediaPunti : a.cognome.localeCompare(b.cognome),
      );
  }, [listone, ricerca, filtro, ordine]);

  const puntiUltima = salvata && giornata ? puntiSquadra({ deputati: salvata.deputati, capitano: salvata.capitano }, giornata, regole) : null;

  function aggiungi(id: string) {
    setSquadra((s) => (s.deputati.includes(id) || s.deputati.length >= regole.titolari ? s : { ...s, deputati: [...s.deputati, id] }));
  }

  function togli(id: string) {
    setSquadra((s) => ({ deputati: s.deputati.filter((x) => x !== id), capitano: s.capitano === id ? null : s.capitano }));
  }

  function salva() {
    aggiorna((p) => impostaRosaFanta(p, { stagione: stagione.id, deputati: squadra.deputati, capitano: squadra.capitano }));
  }

  return (
    <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{ background: `radial-gradient(60% 60% at 50% 0%, ${conAlfa(COLORE, 0.14)}, transparent 70%)` }}
        aria-hidden
      />

      <header className="relative">
        <span className="occhiello">{T.occhiello}</span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{T.titolo}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          {T.sottotitolo}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          {[stagione.nome, stagione.ramo, T.chip.titolari(regole.titolari), T.chip.crediti(regole.crediti), T.chip.capitano].map((c) => (
            <li key={c} className="rounded-full px-3 py-1" style={{ background: conAlfa(COLORE, 0.12), color: COLORE }}>
              {c}
            </li>
          ))}
        </ul>
      </header>

      <div className="relative mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* La rosa */}
        <section className="min-w-0 rounded-3xl border p-5 sm:p-6 lg:sticky lg:top-24 lg:self-start" style={{ ...VETRO, borderColor: conAlfa(COLORE, 0.25) }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">{T.rosa.titolo}</h2>
            <span className="text-sm font-semibold tabular-nums" style={{ color: costo > regole.crediti ? '#f87171' : 'var(--fg)' }}>
              {T.rosa.crediti(costo, regole.crediti)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${Math.min(100, (costo / regole.crediti) * 100)}%`, background: costo > regole.crediti ? '#ef4444' : COLORE }}
            />
          </div>
          <p className="mt-1.5 flex justify-between text-xs" style={{ color: 'var(--fg-muta)' }}>
            <span>{T.rosa.conteggio(maggioranza, opposizione)}</span>
            <span className="tabular-nums">{T.rosa.rimasti(regole.crediti - costo)}</span>
          </p>

          {scelti.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed p-4 text-sm leading-relaxed" style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'var(--fg-muta)' }}>
              {T.rosa.vuoto}
            </p>
          ) : (
            <ol className="mt-4 space-y-1.5">
              {scelti.map((d) => {
                const capitano = squadra.capitano === d.id;
                return (
                  <li key={d.id} className="flex items-center gap-2 rounded-xl border px-2.5 py-2" style={{ borderColor: capitano ? conAlfa(COLORE, 0.5) : 'rgba(255,255,255,0.07)' }}>
                    <button
                      type="button"
                      onClick={() => setSquadra((s) => ({ ...s, capitano: d.id }))}
                      aria-pressed={capitano}
                      aria-label={T.rosa.rendiCapitano(nomeCompleto(d))}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ color: capitano ? COLORE : 'rgba(255,255,255,0.35)' }}
                    >
                      {capitano ? '★' : '☆'}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{nomeCompleto(d)}</span>
                      <span className="text-xs" style={{ color: 'var(--fg-muta)' }}>
                        {d.sigla} · {T.schieramento[d.schieramento]}
                        {capitano && <span style={{ color: COLORE }}> · {T.rosa.capitano}</span>}
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums">{d.prezzo}</span>
                    <button
                      type="button"
                      onClick={() => togli(d.id)}
                      aria-label={T.rosa.togli(nomeCompleto(d))}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.08)]"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          <ul className="mt-3 space-y-1 text-xs" aria-live="polite">
            {mancano > 0 && <li style={{ color: 'var(--fg-muta)' }}>{T.rosa.mancano(mancano)}</li>}
            {mancano === 0 && !squadra.capitano && <li style={{ color: COLORE }}>{T.rosa.scegliCapitano}</li>}
            {errori.map((e) => (
              <li key={e.regola} style={{ color: '#f87171' }}>
                {e.messaggio}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs" style={{ color: 'var(--fg-muta)' }}>
              {salvata && !modificata ? `✓ ${T.rosa.salvata}` : salvata ? T.rosa.modifiche : ''}
            </span>
            <button
              type="button"
              onClick={salva}
              disabled={!completa || !modificata}
              className="rounded-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: COLORE, color: '#0a0a0a' }}
            >
              {T.rosa.salva}
            </button>
          </div>

          {/* Ultima giornata */}
          <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)' }}>
            <h3 className="text-sm font-bold">{T.giornata.titolo}</h3>
            {giornata && etichettaGiornata ? (
              <>
                <p className="text-xs" style={{ color: 'var(--fg-muta)' }}>
                  {T.giornata.etichetta(etichettaGiornata, giornata.votazioni)}
                </p>
                {puntiUltima ? (
                  <>
                    <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: COLORE }}>
                      {puntiUltima.totale} <span className="text-sm font-semibold" style={{ color: 'var(--fg-muta)' }}>{T.giornata.punti}</span>
                    </p>
                    <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                      {puntiUltima.perDeputato
                        .slice()
                        .sort((a, b) => b.punti - a.punti)
                        .map((p) => {
                          const d = perId.get(p.id);
                          return (
                            <li key={p.id} className="flex justify-between gap-2">
                              <span className="truncate">
                                {p.capitano ? '★ ' : ''}
                                {d ? nomeProprio(d.cognome) : p.id}
                              </span>
                              <span className="tabular-nums font-semibold">{p.punti}</span>
                            </li>
                          );
                        })}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-sm" style={{ color: 'var(--fg-muta)' }}>
                    {T.giornata.senzaRosa}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
                {T.giornata.nessuna}
              </p>
            )}
          </div>
        </section>

        {/* Il listone */}
        <section className="min-w-0 rounded-3xl border p-5 sm:p-6" style={VETRO}>
          <h2 className="text-lg font-bold">{T.listone.titolo}</h2>
          <label htmlFor="cerca-deputato" className="sr-only">
            {T.listone.cerca}
          </label>
          <input
            id="cerca-deputato"
            type="search"
            value={ricerca}
            onChange={(e) => {
              setRicerca(e.target.value);
              setQuanti(PASSO_LISTONE);
            }}
            placeholder={T.listone.cerca}
            className="mt-3 w-full rounded-full border bg-transparent px-4 py-2.5 text-sm outline-none focus:border-[var(--accento)]"
            style={{ borderColor: 'rgba(255,255,255,0.12)' }}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Schieramento">
              {(Object.keys(T.listone.filtri) as Filtro[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={filtro === f}
                  onClick={() => {
                    setFiltro(f);
                    setQuanti(PASSO_LISTONE);
                  }}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={filtro === f ? { background: COLORE, borderColor: COLORE, color: '#0a0a0a' } : { borderColor: 'rgba(255,255,255,0.12)', color: 'var(--fg-muta)' }}
                >
                  {T.listone.filtri[f]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--fg-muta)' }}>
              {T.listone.ordina}
              <select
                value={ordine}
                onChange={(e) => setOrdine(e.target.value as Ordine)}
                className="rounded-lg border bg-transparent px-2 py-1 text-xs outline-none"
                style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'var(--fg)' }}
              >
                {(Object.keys(T.listone.ordini) as Ordine[]).map((o) => (
                  <option key={o} value={o} style={{ background: '#141414' }}>
                    {T.listone.ordini[o]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {visibili.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: 'var(--fg-muta)' }}>
              {T.listone.nessuno}
            </p>
          ) : (
            <ul className="mt-3 divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {visibili.slice(0, quanti).map((d) => {
                const inRosa = squadra.deputati.includes(d.id);
                const piena = squadra.deputati.length >= regole.titolari;
                return (
                  <li key={d.id} className="flex items-center gap-3 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{nomeCompleto(d)}</span>
                      <span className="text-xs" style={{ color: 'var(--fg-muta)' }}>
                        {d.sigla} · {T.schieramento[d.schieramento]} · {T.listone.media} {d.mediaPunti}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-bold tabular-nums">{d.prezzo}</span>
                      <span className="text-[10px]" style={{ color: 'var(--fg-muta)' }}>
                        {T.listone.prezzo}
                      </span>
                    </span>
                    {inRosa ? (
                      <span className="w-16 text-center text-xs font-semibold" style={{ color: COLORE }}>
                        {T.listone.inRosa}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => aggiungi(d.id)}
                        disabled={piena}
                        aria-label={T.listone.aggiungi(nomeCompleto(d))}
                        className="flex h-9 w-16 items-center justify-center rounded-full border text-lg font-bold disabled:opacity-30"
                        style={{ borderColor: conAlfa(COLORE, 0.5), color: COLORE }}
                      >
                        +
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {visibili.length > quanti && (
            <button
              type="button"
              onClick={() => setQuanti((q) => q + PASSO_LISTONE)}
              className="mt-3 w-full rounded-full border py-2.5 text-sm font-semibold"
              style={{ borderColor: 'rgba(255,255,255,0.12)' }}
            >
              {T.listone.mostraAltri(Math.min(PASSO_LISTONE, visibili.length - quanti))}
            </button>
          )}
        </section>
      </div>

      {/* Regole e fonti */}
      <section className="relative mt-4 rounded-3xl border p-5 sm:p-6" style={VETRO}>
        <h2 className="text-lg font-bold">{T.regole.titolo}</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2" style={{ color: 'var(--fg-muta)' }}>
          {T.regole.voci.map((v) => (
            <li key={v} className="flex gap-2">
              <span style={{ color: COLORE }} aria-hidden>
                •
              </span>
              {v}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs" style={{ color: 'var(--fg-muta)' }}>
          {T.regole.aggiornamento(giornateValide)} {T.regole.fonti}:{' '}
          {stagione.fonti.map((f, i) => (
            <span key={f.url}>
              {i > 0 && ' · '}
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {f.citazione}
              </a>
            </span>
          ))}
        </p>
      </section>
    </main>
  );
}
