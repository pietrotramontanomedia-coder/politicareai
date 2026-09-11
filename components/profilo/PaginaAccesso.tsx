'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FORNITORE_ACCESSO } from '@/lib/profilo/accesso';
import { TESTI_PROFILO } from '@/lib/profilo/testi';
import { conAlfa, STRUMENTI } from '@/lib/strumenti';
import { useProfilo } from './ProfiloProvider';

const T = TESTI_PROFILO.accesso;
const COLORE = STRUMENTI.profilo.colore;

/** Pagina di accesso: pronta per il servizio di login, disattivata finché non è collegato. */
export default function PaginaAccesso() {
  const { sessione, pronto } = useProfilo();
  const attivo = FORNITORE_ACCESSO.attivo;
  const dentro = pronto && sessione.stato === 'autenticato';
  const [email, setEmail] = useState('');
  const [stato, setStato] = useState<'pronto' | 'invio' | 'inviato' | 'errore'>('pronto');
  /** Errore rimandato indietro da Google o dal link via email (per esempio accesso annullato). */
  const [erroreRitorno, setErroreRitorno] = useState<string | null>(null);

  // Al ritorno dal fornitore: si legge l'eventuale errore e si ripulisce l'indirizzo dai parametri tecnici.
  useEffect(() => {
    const url = new URL(window.location.href);
    const daHash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const errore = url.searchParams.get('error_description') ?? url.searchParams.get('error') ?? daHash.get('error_description') ?? daHash.get('error');
    if (errore) {
      // Lettura dell'indirizzo possibile solo dopo il mount: il server non conosce la query.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErroreRitorno(errore);
    }
    if (url.search || url.hash) window.history.replaceState(null, '', url.pathname);
  }, []);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (!attivo || !email) return;
    setStato('invio');
    try {
      await FORNITORE_ACCESSO.inviaLinkEmail(email);
      setStato('inviato');
    } catch {
      setStato('errore');
    }
  }

  return (
    <main className="relative mx-auto max-w-lg px-4 py-10 sm:py-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{ background: `radial-gradient(60% 60% at 50% 0%, ${conAlfa(COLORE, 0.16)}, transparent 70%)` }}
        aria-hidden
      />
      <div className="relative">
        <span className="occhiello">{T.occhiello}</span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{T.titolo}</h1>
        <p className="mt-2 text-base" style={{ color: 'var(--fg-muta)' }}>
          {T.sottotitolo}
        </p>

        {erroreRitorno && !dentro && (
          <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }} role="alert">
            <p className="text-sm">{T.erroreRitorno}</p>
          </div>
        )}

        {dentro && (
          <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.08)' }} role="status">
            <p className="text-sm">{T.entrato(sessione.stato === 'autenticato' ? sessione.utente.email : undefined)}</p>
            <Link href="/profilo" className="mt-2 inline-block text-sm font-bold" style={{ color: '#22c55e' }}>
              {T.vaiAlProfilo} →
            </Link>
          </div>
        )}

        {!attivo && (
          <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: conAlfa(COLORE, 0.35), background: conAlfa(COLORE, 0.08) }} role="status">
            <p className="text-sm">{T.inArrivo}</p>
            <Link href="/profilo" className="mt-2 inline-block text-sm font-bold" style={{ color: COLORE }}>
              {T.vaiAlProfilo} →
            </Link>
          </div>
        )}

        <form onSubmit={invia} className="mt-6 rounded-3xl border p-5" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'var(--bg-card)' }}>
          <label htmlFor="email-accesso" className="text-sm font-semibold">
            {T.email}
          </label>
          <input
            id="email-accesso"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={T.emailSegnaposto}
            disabled={!attivo || stato === 'invio'}
            className="mt-2 w-full rounded-xl border bg-transparent px-4 py-3 text-base outline-none focus:border-[var(--accento)] disabled:opacity-50"
            style={{ borderColor: 'rgba(255,255,255,0.12)' }}
          />
          <button
            type="submit"
            disabled={!attivo || stato === 'invio'}
            className="mt-3 w-full rounded-full py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: COLORE, color: '#0a0a0a' }}
          >
            {T.inviaLink}
          </button>
          <p className="mt-2 text-xs" style={{ color: 'var(--fg-muta)' }} aria-live="polite">
            {stato === 'inviato' ? T.linkInviato(email) : stato === 'errore' ? T.errore : T.senzaPassword}
          </p>

          <div className="my-4 flex items-center gap-3 text-xs" style={{ color: 'var(--fg-muta)' }}>
            <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
            {T.oppure}
            <span className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <button
            type="button"
            disabled={!attivo}
            onClick={() => void FORNITORE_ACCESSO.accediConGoogle().catch(() => setStato('errore'))}
            className="flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: 'rgba(255,255,255,0.14)' }}
          >
            <span className="font-bold" aria-hidden>
              G
            </span>
            {T.google}
          </button>
        </form>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <section className="rounded-2xl border p-4" style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)' }}>
            <h2 className="text-sm font-bold" style={{ color: '#22c55e' }}>
              {T.salviamo}
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--fg-muta)' }}>
              {T.salviamoVoci.map((v) => (
                <li key={v}>✓ {v}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border p-4" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}>
            <h2 className="text-sm font-bold" style={{ color: '#f87171' }}>
              {T.maiSalviamo}
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--fg-muta)' }}>
              {T.maiSalviamoVoci.map((v) => (
                <li key={v}>✕ {v}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
