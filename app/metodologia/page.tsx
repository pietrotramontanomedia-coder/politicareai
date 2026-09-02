import type { Metadata } from 'next';
import Link from 'next/link';
import { caricaPackTestPartito } from '@/lib/contenuti';
import { etichettaArea } from '@/lib/aree';

export const metadata: Metadata = {
  title: 'Metodologia — Politicare',
  description: 'Come scegliamo le affermazioni, come calcoliamo il punteggio, chi c’è dietro ai contenuti.',
};

export default function PaginaMetodologia() {
  const pack = caricaPackTestPartito();
  const aree = Object.entries(pack.quotePerArea);
  const usaFixture = pack.id.startsWith('test-partito-fixture');

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
        Metodologia
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Come funziona il test</h1>

      {usaFixture && (
        <div
          className="mt-6 rounded-2xl border p-4 text-sm"
          style={{ borderColor: 'var(--color-terra)', background: 'var(--accento-chiaro)', color: 'var(--color-inchiostro)' }}
        >
          <strong>Contenuto di sviluppo.</strong> Il pack in uso in questo momento (
          <code>{pack.id}</code>) è un fixture con partiti e posizioni inventati, non un pack
          reale. Serve solo a testare motore e interfaccia prima di raccogliere dati reali dai
          partiti.
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Da dove vengono le posizioni</h2>
        <p className="mt-2 leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          Ogni posizione di partito proviene solo da una di queste tre fonti: risposta diretta del
          partito al nostro questionario (il metodo che preferiamo), un estratto testuale dal
          programma elettorale, oppure un voto parlamentare registrato su un atto specifico.
          Nessuna posizione è dedotta o stimata: se non abbiamo una fonte verificabile, quella
          posizione non entra nel pack. Ogni posizione porta con sé la citazione e il link alla
          fonte.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Criterio di scelta delle affermazioni</h2>
        <p className="mt-2 leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          Ogni affermazione è una proposta concreta e verificabile, non un valore generico. Le
          affermazioni sono bilanciate fra chi propone un cambiamento e chi difende l&apos;assetto
          attuale (squilibrio massimo 10%, per non favorire chi tende ad essere d&apos;accordo a
          prescindere). Un&apos;affermazione su cui più dell&apos;85% dei partiti si trova
          d&apos;accordo non discrimina niente e viene tolta dal pack.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {aree.map(([area, quota]) => {
            const { label, icona } = etichettaArea(area);
            return (
              <li
                key={area}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
                style={{ borderColor: 'var(--bordo)' }}
              >
                <span aria-hidden>{icona}</span>
                {label} · {quota}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">La formula di punteggio</h2>
        <p className="mt-2 leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          Le posizioni e le tue risposte usano la stessa scala, da −2 a +2. Per ogni affermazione
          calcoliamo un grado di accordo fra 0 e 1:
        </p>
        <pre
          className="mt-3 overflow-x-auto rounded-xl border p-4 text-sm"
          style={{ borderColor: 'var(--bordo)', background: 'var(--bg-alta)' }}
        >
{`accordo   = 1 − |risposta − posizione| / 4
punteggio = Σ (peso × accordo) / Σ peso`}
        </pre>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          Il peso è 1, oppure 2 se hai segnato quel tema come importante per te. Le domande
          saltate sono escluse dal calcolo, non contano come disaccordo. Il calcolo avviene
          interamente nel tuo browser: le risposte non vengono mai inviate a un server.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Cosa mostriamo, e cosa non mostriamo</h2>
        <p className="mt-2 leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          Mostriamo sempre la classifica completa, mai un solo vincitore. Se il primo e il secondo
          partito sono a meno di 3 punti percentuali di distanza, lo dichiariamo esplicitamente
          come pari merito. Per ogni partito puoi vedere il dettaglio: su quali affermazioni
          converge di più con te e su quali diverge di più — è quello il risultato utile, non la
          percentuale da sola.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Autori e changelog di questo pack</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
          <dt className="font-medium" style={{ color: 'var(--fg)' }}>Pack</dt>
          <dd>{pack.id} · v{pack.versione} · {pack.data}</dd>
          <dt className="font-medium" style={{ color: 'var(--fg)' }}>Autori</dt>
          <dd>{pack.autori.join(', ')}</dd>
        </dl>
        <ul className="mt-3 space-y-1 text-sm" style={{ color: 'var(--fg-muta)' }}>
          {pack.changelog.map((voce) => (
            <li key={voce}>· {voce}</li>
          ))}
        </ul>
      </section>

      <Link
        href="/test-partito"
        className="mt-10 inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold text-white"
        style={{ background: 'var(--color-terra)' }}
      >
        ← Torna al test
      </Link>
    </main>
  );
}
