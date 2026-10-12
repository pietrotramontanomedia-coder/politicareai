'use client';

import { useState } from 'react';
import Avatar from '@/components/profilo/Avatar';
import { aggiungiPersona, coloreDaNome, modificaPersona } from '@/lib/redazione/client';
import { TESTI_REDAZIONE } from '@/lib/redazione/testi';
import type { PersonaPubblica } from '@/lib/redazione/tipi';

const T = TESTI_REDAZIONE.persone;

/** Chi coordina registra i ragazzi con la loro password, la cambia, li disattiva. Niente si cancella. */
export default function Persone({ persone, onCambiate, onApri }: { persone: PersonaPubblica[]; onCambiate: (p: PersonaPubblica[]) => void; onApri: (chiave: string) => void }) {
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [esito, setEsito] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  async function esegui(azione: () => Promise<PersonaPubblica[]>, messaggio?: string) {
    setInvio(true);
    setEsito(null);
    try {
      onCambiate(await azione());
      if (messaggio) setEsito(messaggio);
      return true;
    } catch (e) {
      setEsito(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setInvio(false);
    }
  }

  async function aggiungi(e: React.FormEvent) {
    e.preventDefault();
    if (await esegui(() => aggiungiPersona(nome, password))) {
      setNome('');
      setPassword('');
    }
  }

  const campo = 'rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2';
  const stile = { borderColor: 'var(--bordo)', background: 'var(--bg)', color: 'var(--fg)' };

  return (
    <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--bordo)' }}>
      <h2 className="text-lg font-bold">{T.titolo}</h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
        {T.spiegazione}
      </p>
      <form onSubmit={aggiungi} className="mt-3 flex flex-wrap gap-2">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={T.nome} aria-label={T.nome} className={`${campo} w-44`} style={stile} autoComplete="off" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={T.password} aria-label={T.password} className={`${campo} w-44`} style={stile} autoComplete="new-password" />
        <button type="submit" disabled={invio || nome.trim().length < 2} className="rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40" style={{ background: 'var(--accento)', color: '#0a0a0a' }}>
          {T.aggiungi}
        </button>
      </form>
      {esito && (
        <p role="status" className="mt-2 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {esito}
        </p>
      )}
      {persone.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {T.vuoto}
        </p>
      ) : (
        <ul className="mt-3 divide-y" style={{ borderColor: 'var(--bordo)' }}>
          {persone.map((p) => (
            <li key={p.chiave} className="flex flex-wrap items-center gap-3 py-2" style={{ borderColor: 'var(--bordo)', opacity: p.attiva ? 1 : 0.5 }}>
              <button type="button" onClick={() => onApri(p.chiave)} className="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold hover:underline">
                <Avatar nome={p.nome} colore={coloreDaNome(p.chiave)} className="h-7 w-7 text-[10px]" />
                {p.nome}
                <span className="text-xs font-normal" style={{ color: 'var(--fg-muta)' }}>
                  {p.attiva ? (p.conPassword ? T.conPassword : T.senzaPassword) : T.disattivata}
                </span>
              </button>
              <button
                type="button"
                disabled={invio}
                onClick={() => {
                  const nuova = window.prompt(T.chiediPassword(p.nome));
                  if (nuova) void esegui(() => modificaPersona(p.chiave, { password: nuova }), T.passwordCambiata);
                }}
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                {T.cambiaPassword}
              </button>
              <button type="button" disabled={invio} onClick={() => void esegui(() => modificaPersona(p.chiave, { attiva: !p.attiva }))} className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.08)' }}>
                {p.attiva ? T.disattiva : T.riattiva}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
