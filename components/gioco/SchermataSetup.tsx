'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Logo from '@/components/Logo';
import { GIOCATORI_MASSIMO, nomiValidi, partitaAvviabile, TESTI_GIOCO } from '@/lib/gioco';
import { useProfilo } from '@/components/profilo/ProfiloProvider';
import { impostaGiocatori } from '@/lib/profilo/regole';
import { TESTI_PROFILO } from '@/lib/profilo/testi';

export interface Impostazioni {
  giocatori: string[];
  conAttualita: boolean;
  analcolico: boolean;
}

interface Props {
  onInizia: (impostazioni: Impostazioni) => void;
}

const T = TESTI_GIOCO;

export default function SchermataSetup({ onInizia }: Props) {
  const riduciMovimento = useReducedMotion();
  const [nomi, setNomi] = useState(['', '', '']);
  const [maggiorenne, setMaggiorenne] = useState(false);
  const [conAttualita, setConAttualita] = useState(true);
  const [analcolico, setAnalcolico] = useState(false);
  const { profilo, aggiorna } = useProfilo();
  const [ricorda, setRicorda] = useState(false);
  const gruppoSalvato = profilo?.giocatori ?? [];

  const validi = nomiValidi(nomi);
  const puoIniziare = partitaAvviabile(nomi) && maggiorenne;

  const entra = (ritardo: number) => ({
    initial: riduciMovimento ? undefined : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay: ritardo },
  });

  const cambiaNome = (indice: number, valore: string) =>
    setNomi((precedenti) => precedenti.map((n, i) => (i === indice ? valore : n)));

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-14">
      <motion.div {...entra(0)} className="mb-8 flex justify-center">
        <Logo size="md" />
      </motion.div>

      <motion.header {...entra(0.05)} className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--accento)' }}>
          {T.etichetta}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{T.titolo}</h1>
        <p className="mt-3 text-base font-medium sm:text-lg" style={{ color: 'var(--fg-muta)' }}>
          {T.sottotitolo}
        </p>
        <p className="mt-4 text-base leading-relaxed text-balance" style={{ color: 'var(--fg-muta)' }}>
          {T.descrizione}
        </p>
      </motion.header>

      {/* Giocatori */}
      <motion.section {...entra(0.1)} className="mt-8" aria-labelledby="giocatori">
        <h2 id="giocatori" className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--accento)' }}>
          {T.setup.giocatori}
        </h2>
        {gruppoSalvato.length >= 2 && (
          <button
            type="button"
            onClick={() => setNomi(gruppoSalvato.slice(0, GIOCATORI_MASSIMO))}
            className="mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-[var(--accento)]"
            style={{ borderColor: 'var(--bordo)' }}
          >
            ↺ {TESTI_PROFILO.giocatori.usaSalvati} ({gruppoSalvato.length})
          </button>
        )}
        <ul className="mt-3 space-y-2">
          {nomi.map((nome, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={nome}
                onChange={(e) => cambiaNome(i, e.target.value)}
                placeholder={T.setup.nomeGiocatore(i + 1)}
                maxLength={20}
                aria-label={T.setup.nomeGiocatore(i + 1)}
                className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-base outline-none focus:border-[var(--accento)]"
                style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)', color: 'var(--fg)' }}
              />
              {nomi.length > 2 && (
                <button
                  type="button"
                  onClick={() => setNomi((p) => p.filter((_, j) => j !== i))}
                  aria-label={`${T.setup.rimuovi} ${nome || T.setup.nomeGiocatore(i + 1)}`}
                  className="shrink-0 rounded-xl border px-3 py-3 text-sm transition-colors hover:border-[var(--accento)]"
                  style={{ borderColor: 'var(--bordo)', color: 'var(--fg-muta)' }}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>

        {nomi.length < GIOCATORI_MASSIMO && (
          <button
            type="button"
            onClick={() => setNomi((p) => [...p, ''])}
            className="mt-3 w-full rounded-xl border border-dashed px-4 py-3 text-sm font-semibold transition-colors hover:border-[var(--accento)]"
            style={{ borderColor: 'var(--bordo)', color: 'var(--fg-muta)' }}
          >
            + {T.setup.aggiungiGiocatore}
          </button>
        )}

        {validi.length < 2 && (
          <p className="mt-2 text-sm" style={{ color: 'var(--fg-muta)' }}>
            {T.setup.minimo}
          </p>
        )}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--fg-muta)' }}>
          <input type="checkbox" checked={ricorda} onChange={(e) => setRicorda(e.target.checked)} className="h-4 w-4 accent-[var(--accento)]" />
          {TESTI_PROFILO.giocatori.ricorda}
        </label>
      </motion.section>

      {/* Opzioni */}
      <motion.section {...entra(0.15)} className="mt-8" aria-labelledby="opzioni">
        <h2 id="opzioni" className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--accento)' }}>
          {T.setup.opzioni}
        </h2>
        <div className="mt-3 space-y-2">
          <Interruttore
            attivo={conAttualita}
            onCambia={setConAttualita}
            titolo={T.setup.mazzoAttualita}
            nota={T.setup.mazzoAttualitaNota}
          />
          <Interruttore
            attivo={analcolico}
            onCambia={setAnalcolico}
            titolo={T.setup.analcolico}
            nota={T.setup.analcolicoNota}
          />
        </div>
      </motion.section>

      {/* Età e avvisi */}
      <motion.section
        {...entra(0.2)}
        className="mt-8 rounded-2xl border p-5"
        style={{ borderColor: 'var(--bordo)', background: 'rgba(239,68,68,0.05)' }}
        aria-labelledby="eta"
      >
        <h2 id="eta" className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#ef4444' }}>
          {T.eta.titolo}
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          {T.eta.testo}
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={maggiorenne}
            onChange={(e) => setMaggiorenne(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[var(--accento)]"
          />
          {T.eta.conferma}
        </label>
        <ul className="mt-4 space-y-1.5 text-xs leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          <li>• {T.avvisi.responsabile}</li>
          <li>• {T.avvisi.astensione}</li>
          <li>• {T.avvisi.fatti}</li>
        </ul>
      </motion.section>

      <motion.div {...entra(0.25)} className="mt-8">
        <button
          type="button"
          disabled={!puoIniziare}
          onClick={() => {
            if (ricorda) aggiorna((p) => impostaGiocatori(p, validi));
            onInizia({ giocatori: validi, conAttualita, analcolico });
          }}
          className="w-full rounded-xl px-8 py-4 text-base font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--accento)', color: '#000' }}
        >
          {T.setup.inizia} →
        </button>
      </motion.div>
    </div>
  );
}

function Interruttore({
  attivo,
  onCambia,
  titolo,
  nota,
}: {
  attivo: boolean;
  onCambia: (v: boolean) => void;
  titolo: string;
  nota: string;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4"
      style={{ borderColor: attivo ? 'var(--accento)' : 'var(--bordo)', background: 'var(--bg-card)' }}
    >
      <input
        type="checkbox"
        checked={attivo}
        onChange={(e) => onCambia(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accento)]"
      />
      <span className="min-w-0">
        <span className="block font-semibold">{titolo}</span>
        <span className="block text-sm" style={{ color: 'var(--fg-muta)' }}>
          {nota}
        </span>
      </span>
    </label>
  );
}
