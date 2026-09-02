'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Classifica, TestPartitoPack } from '@politicare/motore';
import RigaClassifica from './RigaClassifica';

interface Props {
  pack: TestPartitoPack;
  classifica: Classifica;
  numeroRisposte: number;
  numeroSaltate: number;
  onRicomincia: () => void;
}

export default function SchermataRisultati({
  pack,
  classifica,
  numeroRisposte,
  numeroSaltate,
  onRicomincia,
}: Props) {
  const affermazioniPerId = new Map(pack.affermazioni.map((a) => [a.id, a]));
  const [primo, secondo] = classifica.risultati;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto max-w-2xl px-6 py-16"
    >
      <p className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
        Il tuo risultato
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">La classifica completa</h1>
      <p className="mt-3 text-base" style={{ color: 'var(--fg-muta)' }}>
        Hai risposto a {numeroRisposte} affermazioni su {pack.affermazioni.length}
        {numeroSaltate > 0 ? ` (${numeroSaltate} saltate)` : ''}. Il numero è il grado di accordo, non
        un voto: apri ogni partito per vedere su cosa converge e su cosa diverge davvero da te.
      </p>

      {classifica.pariMerito && primo && secondo && (
        <div
          className="mt-6 rounded-2xl border p-4 text-sm"
          style={{ borderColor: 'var(--accento)', background: 'var(--accento-chiaro)', color: 'var(--color-inchiostro)' }}
        >
          <strong>Pari merito.</strong> {primo.nome} e {secondo.nome} sono a meno di 3 punti
          percentuali di distanza: consideriamoli appaiati, non c&apos;è un primo classificato netto.
        </div>
      )}

      <ol className="mt-8 space-y-3">
        {classifica.risultati.map((risultato, indice) => (
          <RigaClassifica
            key={risultato.partitoId}
            risultato={risultato}
            posizione={indice + 1}
            affermazioniPerId={affermazioniPerId}
          />
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRicomincia}
          className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-gray-900 transition-all hover:shadow-lg active:scale-[0.98]"
          style={{ background: 'var(--accento-bright)' }}
        >
          Rifai il test
        </button>
        <Link
          href="/metodologia"
          className="inline-flex items-center justify-center rounded-lg border px-6 py-3 text-base font-medium transition-colors hover:bg-opacity-10"
          style={{ borderColor: 'var(--bordo)', color: 'var(--fg)' }}
        >
          Come è calcolato
        </Link>
      </div>
    </motion.div>
  );
}
