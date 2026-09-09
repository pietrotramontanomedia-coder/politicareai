import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BadgeAgenzia from '@/components/agenzie/BadgeAgenzia';
import BadgeSimulazione from '@/components/agenzie/BadgeSimulazione';
import { TESTI_AGENZIE } from '@/lib/agenzie/testi';
import { leggiLancio } from '@/lib/agenzie/server';
import { DESCRIZIONI_AGENZIE } from '@/lib/agenzie/tipi';
import { formattaDataEstesa } from '@/lib/data-ora';

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const lancio = await leggiLancio(id);
  return { title: lancio ? `${lancio.titolo} — Politicare` : 'Lancio non trovato — Politicare' };
}

export default async function LancioPage({ params }: Props) {
  const { id } = await params;
  const lancio = await leggiLancio(id);
  if (!lancio) notFound();

  const agenzia = DESCRIZIONI_AGENZIE[lancio.agenzia];

  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6">
      <article className="mx-auto max-w-2xl">
        <Link
          href="/agenzie"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--fg-muta)' }}
        >
          <span>←</span> {TESTI_AGENZIE.tornaAllaLista}
        </Link>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <BadgeAgenzia agenzia={lancio.agenzia} forma="nome" />
          {lancio.simulato && <BadgeSimulazione />}
          <time dateTime={lancio.data} className="text-xs font-mono font-bold tabular-nums sm:text-sm" style={{ color: 'var(--accento)' }}>
            {formattaDataEstesa(lancio.data)}
          </time>
        </div>

        {lancio.simulato && (
          <p
            className="mb-6 rounded-xl border border-dashed px-4 py-3 text-sm"
            style={{ borderColor: 'var(--accento)', color: 'var(--fg-muta)' }}
            role="note"
          >
            {TESTI_AGENZIE.simulazione.avviso}
          </p>
        )}

        <h1 className="text-2xl font-bold leading-tight sm:text-4xl">{lancio.titolo}</h1>
        {lancio.categoria && !/simulazione/i.test(lancio.categoria) && (
          <p className="mt-3 text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
            {agenzia.nome} · {lancio.categoria}
          </p>
        )}

        <hr className="my-6 h-px border-0" style={{ background: 'var(--bordo)' }} />

        {lancio.testo && <p className="text-base leading-relaxed sm:text-lg">{lancio.testo}</p>}

        {lancio.link && (
          <a
            href={lancio.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--accento)]"
            style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
          >
            {TESTI_AGENZIE.leggiSu(agenzia.nome)} ↗
          </a>
        )}

        <p className="mt-10 text-xs" style={{ color: 'var(--fg-muta)' }}>
          Fonte:{' '}
          <a href={agenzia.sito} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:no-underline" style={{ color: 'var(--fg)' }}>
            {agenzia.nome}, sezione politica
          </a>
          . Il testo qui riportato è il sommario del feed RSS; l&apos;articolo completo è sul sito dell&apos;agenzia.
        </p>
      </article>
    </main>
  );
}
