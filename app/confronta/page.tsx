import type { Metadata } from 'next';
import Link from 'next/link';
import { caricaPackTestPartito } from '@/lib/contenuti';
import { etichettaArea } from '@/lib/aree';
import { TESTI_CONFRONTA as T, temi } from '@/lib/confronta';

export const metadata: Metadata = {
  title: `${T.titolo} — Politicare`,
  description: `${T.sottotitolo} Posizioni documentate con fonte, senza punteggi.`,
};

export default function PaginaConfronta() {
  const pack = caricaPackTestPartito();
  const elenco = temi(pack);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="occhiello">{T.etichetta}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{T.titolo}</h1>
      <p className="mt-3 max-w-2xl text-lg" style={{ color: 'var(--fg-muta)' }}>
        {T.sottotitolo}
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
        {T.spiegazione}
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {elenco.map((tema) => {
          const { label, icona } = etichettaArea(tema.area);
          return (
            <li key={tema.area}>
              <Link
                href={`/confronta/${tema.area}`}
                className="group flex h-full flex-col rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accento)]"
                style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-lg font-semibold">
                    <span aria-hidden>{icona}</span>
                    {label}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
                    style={{ background: 'rgba(254,220,1,0.12)', color: 'var(--accento)' }}
                  >
                    {T.affermazioni(tema.affermazioni.length)}
                  </span>
                </span>
                <span className="mt-3 line-clamp-3 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
                  {tema.affermazioni[0].testo}
                </span>
                <span className="mt-auto pt-4 text-sm font-semibold" style={{ color: 'var(--accento)' }}>
                  {T.apriTema} <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-12 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
        <Link href="/test-partito" className="font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--accento)' }}>
          {T.invitoTest} →
        </Link>
        <Link href="/metodologia" className="underline-offset-4 hover:underline" style={{ color: 'var(--fg-muta)' }}>
          {T.metodologia}
        </Link>
      </div>
    </main>
  );
}
