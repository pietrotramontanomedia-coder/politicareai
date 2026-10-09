'use client';

import { useEffect, useId, useState } from 'react';
import { entra } from '@/lib/redazione/client';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { SessioneRedazione } from '@/lib/redazione/tipi';

const T = TESTI_REDAZIONE.accesso;

/** Entrata in redazione: nome e codice. Il nome si ricorda su questo dispositivo. */
export default function AccessoRedazione({ configurata, onEntrato }: { configurata: boolean; onEntrato: (s: SessioneRedazione) => void }) {
  const [nome, setNome] = useState('');
  const [codice, setCodice] = useState('');
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const id = useId();

  // Il nome usato l'ultima volta, letto dopo il montaggio: il server non conosce l'archivio del browser.
  useEffect(() => {
    try {
      const salvato = localStorage.getItem('redazione_nome');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (salvato) setNome((attuale) => attuale || salvato);
    } catch {
      /* archivio del browser non disponibile */
    }
  }, []);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    setInvio(true);
    setErrore(null);
    try {
      const sessione = await entra(nome, codice);
      try {
        localStorage.setItem('redazione_nome', sessione.nome);
      } catch {
        /* archivio del browser non disponibile: pazienza */
      }
      onEntrato(sessione);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : String(err));
      setInvio(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-20">
      <span className="occhiello">
        {TESTI_REDAZIONE.marchio} · {TESTI_REDAZIONE.sottomarchio}
      </span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{T.titolo}</h1>
      <p className="mt-2 text-base" style={{ color: 'var(--fg-muta)' }}>
        {T.sottotitolo}
      </p>

      {!configurata ? (
        <p className="mt-8 rounded-2xl border p-4 text-sm" role="status" style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)' }}>
          {T.nonConfigurato}
        </p>
      ) : (
        <form onSubmit={invia} className="mt-8 space-y-5">
          <div>
            <label htmlFor={`${id}-nome`} className="block text-sm font-semibold">
              {T.nome}
            </label>
            <input
              id={`${id}-nome`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
              minLength={2}
              maxLength={40}
              placeholder={T.nomeSegnaposto}
              aria-describedby={`${id}-nome-aiuto`}
              className="mt-1.5 w-full rounded-xl border px-3 py-3 text-base outline-none"
              style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
            />
            <p id={`${id}-nome-aiuto`} className="mt-1 text-xs" style={{ color: 'var(--fg-muta)' }}>
              {T.nomeAiuto}
            </p>
          </div>
          <div>
            <label htmlFor={`${id}-codice`} className="block text-sm font-semibold">
              {T.codice}
            </label>
            <input
              id={`${id}-codice`}
              type="password"
              value={codice}
              onChange={(e) => setCodice(e.target.value)}
              autoComplete="current-password"
              required
              aria-describedby={`${id}-codice-aiuto`}
              className="mt-1.5 w-full rounded-xl border px-3 py-3 text-base outline-none"
              style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
            />
            <p id={`${id}-codice-aiuto`} className="mt-1 text-xs" style={{ color: 'var(--fg-muta)' }}>
              {T.codiceAiuto}
            </p>
          </div>
          {errore && (
            <p role="alert" className="text-sm" style={{ color: '#F87171' }}>
              {errore}
            </p>
          )}
          <button type="submit" disabled={invio} className="w-full rounded-full py-3 text-base font-bold disabled:opacity-50" style={{ background: 'var(--accento)', color: '#0a0a0a' }}>
            {invio ? T.entrando : T.entra}
          </button>
        </form>
      )}
      <p className="mt-8 text-xs" style={{ color: 'var(--fg-muta)' }}>
        {T.riservato}
      </p>
    </main>
  );
}
