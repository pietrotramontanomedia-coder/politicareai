'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, MotionConfig } from 'framer-motion';
import { ETICHETTE_AREA } from '@/lib/aree';
import {
  alternaTema,
  ANNO_MINIMO,
  COLORI_AVATAR,
  esportaDati,
  etaDa,
  ETA_MINIMA_AUTONOMA,
  impostaAnagrafica,
  impostaGiocatori,
  MAX_CITTA,
  MAX_NOME,
  serieQuiz,
  statisticheQuiz,
  traguardi,
} from '@/lib/profilo/regole';
import { cancellaRisultatoTest, leggiRisultatoTest } from '@/lib/profilo/risultato-test-locale';
import { TESTI_PROFILO as T } from '@/lib/profilo/testi';
import { conAlfa, STRUMENTI } from '@/lib/strumenti';
import Avatar from './Avatar';
import { useProfilo } from './ProfiloProvider';

const VETRO = { borderColor: 'rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)), var(--bg-card)' };
const COLORE = STRUMENTI.profilo.colore;

function Riquadro({ titolo, children, className = '', extra }: { titolo: string; children: React.ReactNode; className?: string; extra?: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.35 }}
      className={`min-w-0 rounded-3xl border p-5 sm:p-6 ${className}`}
      style={VETRO}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{titolo}</h2>
        {extra}
      </div>
      {children}
    </motion.section>
  );
}

/** Campo che si salva da solo poco dopo l'ultima battuta, e subito quando esce dal focus. */
function CampoSalvato({
  id,
  etichetta,
  valore,
  segnaposto,
  tipo = 'text',
  min,
  max,
  aiuto,
  onSalva,
}: {
  id: string;
  etichetta: string;
  valore: string;
  segnaposto?: string;
  tipo?: 'text' | 'number';
  min?: number;
  max?: number;
  aiuto?: string;
  onSalva: (valore: string) => void;
}) {
  const [bozza, setBozza] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function salva(v: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    onSalva(v);
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-semibold">
        {etichetta}
      </label>
      <input
        id={id}
        type={tipo}
        inputMode={tipo === 'number' ? 'numeric' : undefined}
        min={min}
        max={tipo === 'number' ? max : undefined}
        maxLength={tipo === 'text' ? max : undefined}
        placeholder={segnaposto}
        value={bozza ?? valore}
        onChange={(e) => {
          const v = e.target.value;
          setBozza(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => salva(v), 500);
        }}
        onBlur={(e) => salva(e.target.value)}
        className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2 text-base outline-none focus:border-[var(--accento)]"
        style={{ borderColor: 'rgba(255,255,255,0.12)' }}
      />
      {aiuto && (
        <p className="mt-1 text-xs" style={{ color: 'var(--fg-muta)' }}>
          {aiuto}
        </p>
      )}
    </div>
  );
}

export default function PaginaProfilo({ ultimoQuiz }: { ultimoQuiz: number }) {
  const { pronto, profilo, sessione, dove, inSincronia, aggiorna, cancellaTutto, esci, eliminaAccount } = useProfilo();
  const [versioneTest, setVersioneTest] = useState(0);
  const [confermaCancella, setConfermaCancella] = useState(false);
  const [confermaAccount, setConfermaAccount] = useState(false);
  const [nuovoGiocatore, setNuovoGiocatore] = useState('');
  /** Nome mentre lo si scrive: si salva poco dopo l'ultima battuta e subito all'uscita dal campo. */
  const [bozzaNome, setBozzaNome] = useState<string | null>(null);
  const timerNome = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Il risultato del test si legge solo sul dispositivo e solo dopo il caricamento (mai sul server).
  // versioneTest cambia quando il risultato viene cancellato, e forza una nuova lettura.
  const risultatoTest = useMemo(() => (pronto && versioneTest >= 0 ? leggiRisultatoTest() : null), [pronto, versioneTest]);

  if (!pronto) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6" aria-busy="true">
        <div className="skeleton-shimmer h-28 rounded-3xl" style={{ background: 'var(--bg-card)' }} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-48 rounded-3xl" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      </main>
    );
  }

  const storico = profilo?.storicoQuiz ?? [];
  const statistiche = statisticheQuiz(storico);
  const serie = serieQuiz(storico, ultimoQuiz);
  const elencoTraguardi = traguardi(storico);
  const ultimi = [...storico].sort((a, b) => a.numero - b.numero).slice(-8);
  const annoCorrente = new Date().getFullYear();
  const eta = etaDa(profilo?.annoNascita ?? null);

  function scaricaDati() {
    const blob = new Blob([esportaDati(profilo, leggiRisultatoTest())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = T.dati.file;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function salvaNome(valore: string) {
    if (timerNome.current) clearTimeout(timerNome.current);
    timerNome.current = null;
    const nome = valore.trim().slice(0, MAX_NOME);
    aggiorna((p) => (p.nome === nome ? p : { ...p, nome }));
  }

  function scriviNome(valore: string) {
    setBozzaNome(valore);
    if (timerNome.current) clearTimeout(timerNome.current);
    timerNome.current = setTimeout(() => salvaNome(valore), 500);
  }

  function aggiungiGiocatore() {
    if (!nuovoGiocatore.trim()) return;
    aggiorna((p) => impostaGiocatori(p, [...p.giocatori, nuovoGiocatore]));
    setNuovoGiocatore('');
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80"
          style={{ background: `radial-gradient(60% 60% at 50% 0%, ${conAlfa(COLORE, 0.14)}, transparent 70%)` }}
          aria-hidden
        />

        {/* Testata: avatar, nome, colore, stato dell'account */}
        <section className="relative rounded-3xl border p-5 sm:p-7" style={{ ...VETRO, borderColor: conAlfa(COLORE, 0.25) }}>
          <span className="occhiello">{T.occhiello}</span>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar nome={profilo?.nome} colore={profilo?.colore} className="h-20 w-20 text-2xl" />
            <div className="min-w-0 flex-1">
              <label htmlFor="nome-profilo" className="sr-only">
                {T.nome}
              </label>
              <input
                id="nome-profilo"
                value={bozzaNome ?? profilo?.nome ?? ''}
                placeholder={T.senzaNome}
                maxLength={MAX_NOME}
                autoComplete="nickname"
                onChange={(e) => scriviNome(e.target.value)}
                onBlur={(e) => salvaNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-[rgba(255,255,255,0.35)] sm:text-4xl"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={T.colore}>
                {COLORI_AVATAR.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={(profilo?.colore ?? COLORI_AVATAR[0]) === c}
                    aria-label={T.coloreN(i + 1)}
                    onClick={() => aggiorna((p) => ({ ...p, colore: c }))}
                    className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      background: c,
                      boxShadow: (profilo?.colore ?? COLORI_AVATAR[0]) === c ? `0 0 0 2px #0a0a0a, 0 0 0 4px ${c}` : 'none',
                    }}
                  />
                ))}
                <span className="ml-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: conAlfa(COLORE, 0.14), color: COLORE }}>
                  {dove === 'account' && sessione.stato === 'autenticato' ? T.conAccount(sessione.utente.email) : T.suDispositivo}
                </span>
                {inSincronia && (
                  <span className="text-xs" style={{ color: 'var(--fg-muta)' }} aria-live="polite">
                    {T.sincronia}
                  </span>
                )}
              </div>
            </div>
          </div>

          {sessione.stato === 'ospite' ? (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)' }}>
              <div>
                <p className="font-semibold">{T.account.titolo}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
                  {T.account.testo}
                </p>
              </div>
              <Link href="/accedi" className="inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold" style={{ background: COLORE, color: '#0a0a0a' }}>
                {T.account.accedi} →
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)' }}>
              <p className="text-sm" style={{ color: 'var(--fg-muta)' }}>
                {T.account.sincronizzato}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void esci()} className="rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
                  {T.account.esci}
                </button>
                {confermaAccount ? (
                  <span className="flex flex-wrap items-center gap-2 text-sm" role="alert">
                    <span style={{ color: '#f87171' }}>{T.account.avvisoElimina}</span>
                    <button
                      type="button"
                      onClick={() => void eliminaAccount().then(() => setConfermaAccount(false))}
                      className="rounded-full px-4 py-2 text-sm font-bold text-white"
                      style={{ background: '#dc2626' }}
                    >
                      {T.account.confermaElimina}
                    </button>
                    <button type="button" onClick={() => setConfermaAccount(false)} className="font-semibold underline underline-offset-2">
                      {T.dati.annulla}
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfermaAccount(true)} className="text-sm font-semibold" style={{ color: '#f87171' }}>
                    {T.account.elimina}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="relative mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Quiz */}
          <Riquadro titolo={T.quiz.titolo} className="md:col-span-2">
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { etichetta: T.quiz.completati, valore: String(statistiche.completati) },
                { etichetta: T.quiz.media, valore: `${statistiche.media}%` },
                { etichetta: T.quiz.serie, valore: String(serie) },
                { etichetta: T.quiz.migliore, valore: `${statistiche.migliore}%` },
              ].map((s) => (
                <div key={s.etichetta} className="rounded-2xl border p-3" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.25)' }}>
                  <dt className="text-xs font-medium" style={{ color: 'var(--fg-muta)' }}>
                    {s.etichetta}
                  </dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums">{s.valore}</dd>
                </div>
              ))}
            </dl>

            {ultimi.length > 0 ? (
              <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3" role="list">
                {ultimi.map((q) => (
                  <div key={q.numero} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" role="listitem" aria-label={T.quiz.barra(q.numero, q.percentuale)}>
                    <span className="text-[11px] font-semibold tabular-nums">{q.percentuale}%</span>
                    <motion.span
                      className="w-full max-w-12 rounded-t-lg"
                      style={{ background: `linear-gradient(180deg, ${STRUMENTI.quiz.colore}, ${conAlfa(STRUMENTI.quiz.colore, 0.35)})` }}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${Math.max(4, q.percentuale) * 0.8}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <span className="text-[11px]" style={{ color: 'var(--fg-muta)' }}>
                      {T.quiz.etichetta(q.numero)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-dashed p-4" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
                <p className="text-sm" style={{ color: 'var(--fg-muta)' }}>
                  {T.quiz.vuoto}
                </p>
                <Link href={STRUMENTI.quiz.href} className="text-sm font-bold" style={{ color: STRUMENTI.quiz.colore }}>
                  {T.quiz.fai} →
                </Link>
              </div>
            )}

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muta)' }}>
              {T.traguardi.titolo}
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {elencoTraguardi.map((t) => {
                const voce = T.traguardi.voci[t.id];
                return (
                  <li
                    key={t.id}
                    className="rounded-2xl border p-3"
                    style={{
                      borderColor: t.ottenuto ? conAlfa(COLORE, 0.45) : 'rgba(255,255,255,0.07)',
                      background: t.ottenuto ? conAlfa(COLORE, 0.1) : 'rgba(0,0,0,0.2)',
                      opacity: t.ottenuto ? 1 : 0.6,
                    }}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      <span aria-hidden>{t.ottenuto ? '★' : '☆'}</span>
                      {voce.titolo}
                    </p>
                    <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--fg-muta)' }}>
                      {voce.descrizione}
                    </p>
                    <span className="sr-only">{t.ottenuto ? T.traguardi.ottenuto : T.traguardi.daOttenere}</span>
                  </li>
                );
              })}
            </ul>
          </Riquadro>

          {/* Test partiti: solo sul dispositivo */}
          <Riquadro
            titolo={T.test.titolo}
            extra={
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--fg-muta)' }}>
                🔒 {T.test.lucchetto}
              </span>
            }
          >
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
              {T.test.spiegazione}
            </p>
            {risultatoTest ? (
              <>
                <ol className="mt-4 space-y-2">
                  {risultatoTest.righe.slice(0, 5).map((r, i) => (
                    <li key={r.partitoId} className="flex items-center gap-3 text-sm">
                      <span className="w-4 text-right text-xs font-bold tabular-nums" style={{ color: 'var(--fg-muta)' }}>
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{r.nome}</span>
                      <span className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <span className="block h-full rounded-full" style={{ width: `${r.percentuale}%`, background: STRUMENTI.test.colore }} />
                      </span>
                      <span className="w-9 text-right text-xs font-bold tabular-nums">{r.percentuale}%</span>
                    </li>
                  ))}
                </ol>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold" style={{ color: 'var(--accento)' }}>
                    {T.test.classifica}
                  </summary>
                  <ol className="mt-2 space-y-1" start={6}>
                    {risultatoTest.righe.slice(5).map((r) => (
                      <li key={r.partitoId} className="flex justify-between gap-3" style={{ color: 'var(--fg-muta)' }}>
                        <span className="truncate">{r.nome}</span>
                        <span className="tabular-nums">{r.percentuale}%</span>
                      </li>
                    ))}
                  </ol>
                </details>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--fg-muta)' }}>
                  <span>{T.test.salvatoIl(new Date(risultatoTest.salvatoIl).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }))}</span>
                  <button
                    type="button"
                    onClick={() => {
                      cancellaRisultatoTest();
                      setVersioneTest((v) => v + 1);
                    }}
                    className="font-semibold underline underline-offset-2"
                  >
                    {T.test.cancella}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 flex flex-col items-start gap-3">
                <p className="text-sm" style={{ color: 'var(--fg-muta)' }}>
                  {T.test.vuoto}
                </p>
                <Link href={STRUMENTI.test.href} className="text-sm font-bold" style={{ color: STRUMENTI.test.colore }}>
                  {T.test.fai} →
                </Link>
              </div>
            )}
          </Riquadro>

          {/* Chi sei: anno di nascita e città */}
          <Riquadro titolo={T.anagrafica.titolo}>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
              {T.anagrafica.spiegazione}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <CampoSalvato
                id="anno-nascita"
                etichetta={T.anagrafica.anno}
                valore={profilo?.annoNascita ? String(profilo.annoNascita) : ''}
                segnaposto={T.anagrafica.annoSegnaposto}
                tipo="number"
                min={ANNO_MINIMO}
                max={annoCorrente}
                aiuto={eta !== null ? (eta < ETA_MINIMA_AUTONOMA ? T.anagrafica.minorenne : T.anagrafica.eta(eta)) : undefined}
                onSalva={(v) => aggiorna((p) => impostaAnagrafica(p, { annoNascita: v ? Number(v) : null }))}
              />
              <CampoSalvato
                id="citta"
                etichetta={T.anagrafica.citta}
                valore={profilo?.citta ?? ''}
                segnaposto={T.anagrafica.cittaSegnaposto}
                max={MAX_CITTA}
                onSalva={(v) => aggiorna((p) => impostaAnagrafica(p, { citta: v }))}
              />
            </div>
          </Riquadro>

          {/* Temi seguiti */}
          <Riquadro titolo={T.temi.titolo}>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
              {T.temi.spiegazione}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {Object.entries(ETICHETTE_AREA).map(([area, { label, icona }]) => {
                const attivo = profilo?.temiSeguiti.includes(area) ?? false;
                return (
                  <li key={area}>
                    <button
                      type="button"
                      aria-pressed={attivo}
                      onClick={() => aggiorna((p) => alternaTema(p, area))}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                      style={
                        attivo
                          ? { borderColor: conAlfa(COLORE, 0.6), background: conAlfa(COLORE, 0.14), color: 'var(--fg)' }
                          : { borderColor: 'rgba(255,255,255,0.1)', color: 'var(--fg-muta)' }
                      }
                    >
                      <span aria-hidden>{icona}</span>
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Riquadro>

          {/* Giocatori */}
          <Riquadro titolo={T.giocatori.titolo}>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
              {T.giocatori.spiegazione}
            </p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                aggiungiGiocatore();
              }}
            >
              <label htmlFor="nuovo-giocatore" className="sr-only">
                {T.giocatori.segnaposto}
              </label>
              <input
                id="nuovo-giocatore"
                value={nuovoGiocatore}
                onChange={(e) => setNuovoGiocatore(e.target.value)}
                placeholder={T.giocatori.segnaposto}
                maxLength={MAX_NOME}
                className="min-w-0 flex-1 rounded-full border bg-transparent px-4 py-2 text-sm outline-none focus:border-[var(--accento)]"
                style={{ borderColor: 'rgba(255,255,255,0.12)' }}
              />
              <button type="submit" className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: STRUMENTI.gioco.colore, color: '#0a0a0a' }}>
                {T.giocatori.aggiungi}
              </button>
            </form>
            {profilo && profilo.giocatori.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {profilo.giocatori.map((nome) => (
                  <li key={nome} className="inline-flex items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                    {nome}
                    <button
                      type="button"
                      aria-label={T.giocatori.rimuovi(nome)}
                      onClick={() => aggiorna((p) => impostaGiocatori(p, p.giocatori.filter((g) => g !== nome)))}
                      className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.1)]"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm" style={{ color: 'var(--fg-muta)' }}>
                {T.giocatori.vuoto}
              </p>
            )}
          </Riquadro>

          {/* Dati */}
          <Riquadro titolo={T.dati.titolo}>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
              {T.dati.spiegazione}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={scaricaDati} className="rounded-full border py-2.5 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
                ↓ {T.dati.scarica}
              </button>
              {confermaCancella ? (
                <div className="rounded-2xl border p-3" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }} role="alert">
                  <p className="text-sm">{T.dati.avviso}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void cancellaTutto().then(() => {
                        setConfermaCancella(false);
                        setVersioneTest((v) => v + 1);
                      })}
                      className="flex-1 rounded-full py-2 text-sm font-bold text-white"
                      style={{ background: '#dc2626' }}
                    >
                      {T.dati.conferma}
                    </button>
                    <button type="button" onClick={() => setConfermaCancella(false)} className="flex-1 rounded-full border py-2 text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
                      {T.dati.annulla}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfermaCancella(true)} className="rounded-full py-2.5 text-sm font-semibold" style={{ color: '#f87171' }}>
                  {T.dati.cancella}
                </button>
              )}
            </div>
          </Riquadro>
        </div>
      </main>
    </MotionConfig>
  );
}
