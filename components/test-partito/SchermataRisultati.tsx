'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Classifica, TestPartitoPack } from '@politicare/motore';
import { SOGLIA_COPERTURA } from '@politicare/motore';
import RigaClassifica from './RigaClassifica';
import { CondividiTest } from '@/components/condivisione/Condivisioni';
import SalvaRisultatoTest from '@/components/profilo/SalvaRisultatoTest';
import { TESTI_CONDIVISIONE } from '@/lib/condivisione/testi';

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
  const partitiPerId = new Map(pack.partiti.map((p) => [p.id, p]));
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
        un voto: apri ogni partito per vedere, affermazione per affermazione, la sua posizione, la fonte da cui
        l&apos;abbiamo presa e su cosa converge o diverge da te.
      </p>

      {classifica.pariMerito && primo && secondo && (
        <div
          className="mt-6 rounded-2xl border p-4 text-sm"
          style={{ borderColor: 'var(--accento)', background: 'rgba(254,220,1,0.08)', color: 'var(--fg)' }}
        >
          <strong>Pari merito.</strong> {primo.nome} e {secondo.nome} sono a meno di 3 punti
          percentuali di distanza: consideriamoli appaiati, non c&apos;è un primo classificato netto.
        </div>
      )}

      {classifica.risultati.length > 0 && (
        <div
          className="mt-6 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          style={{ borderColor: 'rgba(254,220,1,0.3)', background: 'radial-gradient(120% 120% at 100% 0%, rgba(254,220,1,0.12), transparent 60%), var(--bg-card)' }}
        >
          <div>
            <p className="font-semibold">{TESTI_CONDIVISIONE.test.richiamo}</p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
              {TESTI_CONDIVISIONE.test.spiegazione}
            </p>
          </div>
          <CondividiTest pack={pack} classifica={classifica} numeroRisposte={numeroRisposte} />
        </div>
      )}

      {classifica.risultati.length > 0 && <SalvaRisultatoTest pack={pack} classifica={classifica} numeroRisposte={numeroRisposte} />}

      <ol className="mt-8 space-y-3">
        {classifica.risultati.map((risultato, indice) => (
          <RigaClassifica
            key={risultato.partitoId}
            risultato={risultato}
            partito={partitiPerId.get(risultato.partitoId)!}
            posizione={indice + 1}
            affermazioniPerId={affermazioniPerId}
            risposteDate={numeroRisposte}
          />
        ))}
      </ol>

      {classifica.esclusi.length > 0 && (
        <section className="mt-10" aria-labelledby="esclusi">
          <h2 id="esclusi" className="text-lg font-semibold">Dati insufficienti per il confronto</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--fg-muta)' }}>
            Per questi partiti abbiamo una posizione documentata su meno del {Math.round(SOGLIA_COPERTURA * 100)}% delle
            affermazioni a cui hai risposto. Il punteggio poggia su troppi pochi punti per stare in classifica con gli
            altri: lo mostriamo a parte, con le affermazioni che abbiamo potuto confrontare.
          </p>
          <ol className="mt-4 space-y-3">
            {classifica.esclusi.map((risultato, indice) => (
              <RigaClassifica
                key={risultato.partitoId}
                risultato={risultato}
                partito={partitiPerId.get(risultato.partitoId)!}
                posizione={classifica.risultati.length + indice + 1}
                affermazioniPerId={affermazioniPerId}
                risposteDate={numeroRisposte}
                escluso
              />
            ))}
          </ol>
        </section>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRicomincia}
          className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-gray-900 transition-all hover:shadow-lg active:scale-[0.98]"
          style={{ background: 'var(--accento)' }}
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
