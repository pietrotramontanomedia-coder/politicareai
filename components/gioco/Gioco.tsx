'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  aggiornaLeggi,
  componiCarta,
  generatore,
  pacchiScelti,
  preparaPartita,
  TESTI_GIOCO,
  type CartaInGioco,
  type LeggeInVigore,
  type PartitoGioco,
} from '@/lib/gioco';
import SchermataSetup, { type Impostazioni } from './SchermataSetup';
import SchermataCarta from './SchermataCarta';

type Fase = 'setup' | 'gioco' | 'fine';

const T = TESTI_GIOCO;

export default function Gioco({ partiti }: { partiti: PartitoGioco[] }) {
  const [fase, setFase] = useState<Fase>('setup');
  const [impostazioni, setImpostazioni] = useState<Impostazioni | null>(null);
  const [seme, setSeme] = useState(0);
  const [indice, setIndice] = useState(0);
  const [leggi, setLeggi] = useState<LeggeInVigore[]>([]);

  /** L'intera partita è decisa dal seme: stesso seme, stesso ordine di carte. */
  const partita = useMemo<CartaInGioco[]>(() => {
    if (!impostazioni) return [];
    const rnd = generatore(seme);
    const carte = preparaPartita(pacchiScelti(impostazioni.conAttualita), impostazioni.giocatori, rnd, partiti);
    return carte.map((carta) => componiCarta(carta, impostazioni.giocatori, rnd, partiti));
  }, [impostazioni, seme, partiti]);

  const inizia = useCallback((scelte: Impostazioni) => {
    setImpostazioni(scelte);
    setSeme(Math.floor(Math.random() * 2 ** 31));
    setIndice(0);
    setLeggi([]);
    setFase('gioco');
  }, []);

  const prossima = useCallback(() => {
    const pescata = partita[indice];
    if (!pescata) return;
    setLeggi((precedenti) => aggiornaLeggi(precedenti, pescata));

    if (indice + 1 >= partita.length) {
      setFase('fine');
      return;
    }
    setIndice(indice + 1);
  }, [indice, partita]);

  const ricomincia = useCallback(() => {
    setFase('setup');
    setImpostazioni(null);
    setIndice(0);
    setLeggi([]);
  }, []);

  if (fase === 'setup' || !impostazioni) {
    return <SchermataSetup onInizia={inizia} />;
  }

  if (fase === 'gioco' && partita[indice]) {
    return (
      <SchermataCarta
        pescata={partita[indice]}
        indice={indice}
        totale={partita.length}
        leggi={leggi}
        analcolico={impostazioni.analcolico}
        onProssima={prossima}
        onEsci={ricomincia}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--accento)' }}>
          {T.etichetta}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{T.fine.titolo}</h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          {T.fine.testo}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={ricomincia}
            className="rounded-xl px-8 py-4 text-base font-bold"
            style={{ background: 'var(--accento)', color: '#000' }}
          >
            {T.fine.rigioca}
          </button>
          <Link
            href="/"
            className="rounded-xl border px-8 py-4 text-base font-semibold"
            style={{ borderColor: 'var(--bordo)' }}
          >
            {T.fine.home}
          </Link>
        </div>
        <p className="mt-8 text-xs" style={{ color: 'var(--fg-muta)' }}>
          {T.avvisi.responsabile}
        </p>
      </motion.div>
    </div>
  );
}
