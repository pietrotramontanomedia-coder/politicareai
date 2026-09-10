import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Valore } from '@politicare/motore';
import { caricaPackTestPartito } from '@/lib/contenuti';
import { etichettaArea } from '@/lib/aree';
import { LogoPartito } from '@/components/test-partito/LogoPartito';
import {
  confrontaAffermazione,
  SCHIERAMENTI,
  TESTI_CONFRONTA as T,
  temaPerArea,
  temi,
  type PosizionePartito,
  type Schieramento,
} from '@/lib/confronta';
import { datiConfronto } from '@/lib/condivisione/dati';
import { CondividiConfronto } from '@/components/condivisione/Condivisioni';

type Props = { params: Promise<{ tema: string }> };

export function generateStaticParams() {
  return temi(caricaPackTestPartito()).map((t) => ({ tema: t.area }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tema } = await params;
  const { label } = etichettaArea(tema);
  return {
    title: `${label}: dove stanno i partiti — Politicare`,
    description: `Le posizioni dei partiti italiani sul tema ${label.toLowerCase()}, affermazione per affermazione, con citazione, data e link alla fonte.`,
  };
}

/** Tono della scala a 5 punti del test: da molto contrario (1) a molto favorevole (5). */
function coloreValore(valore: Valore | null): string {
  return valore === null ? 'var(--fg-muta)' : `var(--color-scala-${valore + 3})`;
}

const STILE_GRUPPO: Record<Schieramento, { colore: string; sfondo: string }> = {
  favorevoli: { colore: 'var(--color-scala-5)', sfondo: 'rgba(34,197,94,0.08)' },
  neutri: { colore: 'var(--color-scala-3)', sfondo: 'rgba(156,163,175,0.08)' },
  contrari: { colore: 'var(--color-scala-1)', sfondo: 'rgba(239,68,68,0.08)' },
  senzaFonte: { colore: 'var(--fg-muta)', sfondo: 'transparent' },
};

function ChipPartito({ voce }: { voce: PosizionePartito }) {
  const { partito, posizione } = voce;
  return (
    <li
      className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5"
      style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
      title={`${partito.nome}: ${posizione.valore === null ? T.gruppi.senzaFonte : T.valore[posizione.valore]}`}
    >
      <LogoPartito nome={partito.nome} sigla={partito.sigla} colore={partito.colore} className="h-6 w-6" />
      <span className="text-sm font-medium">{partito.sigla ?? partito.nome}</span>
      {posizione.valore !== null && Math.abs(posizione.valore) === 2 && (
        <span className="text-xs font-bold" style={{ color: coloreValore(posizione.valore) }} aria-hidden>
          ●●
        </span>
      )}
    </li>
  );
}

export default async function PaginaTema({ params }: Props) {
  const { tema: area } = await params;
  const pack = caricaPackTestPartito();
  const tema = temaPerArea(pack, area);
  if (!tema) notFound();

  const { label, icona } = etichettaArea(area);
  const altri = temi(pack).filter((t) => t.area !== area);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/confronta" className="text-sm font-medium underline-offset-4 hover:underline" style={{ color: 'var(--fg-muta)' }}>
        {T.tuttiITemi}
      </Link>

      <div className="mt-6">
        <span className="occhiello">{T.titolo}</span>
      </div>
      <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-5xl">
        <span aria-hidden>{icona}</span>
        {label}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
        {T.spiegazione}
      </p>

      {tema.affermazioni.map((affermazione, i) => {
        const { gruppi } = confrontaAffermazione(pack, affermazione);
        const conFonte = SCHIERAMENTI.filter((s) => s !== 'senzaFonte').flatMap((s) => gruppi[s]);

        return (
          <section
            key={affermazione.id}
            id={affermazione.id}
            className="mt-10 scroll-mt-24 rounded-3xl border p-5 sm:p-7"
            style={{ borderColor: 'var(--bordo)', background: 'var(--bg-elevated)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muta)' }}>
                {i + 1} di {tema.affermazioni.length} · {T.verso(affermazione.verso)}
              </p>
              <CondividiConfronto dati={datiConfronto(pack, affermazione)} />
            </div>
            <h2 className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">{affermazione.testo}</h2>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {(['favorevoli', 'neutri', 'contrari'] as const).map((s) => (
                <div key={s} className="rounded-2xl border p-3" style={{ borderColor: 'var(--bordo)', background: STILE_GRUPPO[s].sfondo }}>
                  <h3 className="flex items-center justify-between text-sm font-semibold" style={{ color: STILE_GRUPPO[s].colore }}>
                    {T.gruppi[s]}
                    <span className="tabular-nums">{gruppi[s].length}</span>
                  </h3>
                  {gruppi[s].length > 0 ? (
                    <ul className="mt-2.5 flex flex-wrap gap-2">
                      {gruppi[s].map((voce) => (
                        <ChipPartito key={voce.partito.id} voce={voce} />
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2.5 text-sm" style={{ color: 'var(--fg-muta)' }}>
                      {T.nessuno}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {gruppi.senzaFonte.length > 0 && (
              <p className="mt-3 text-sm" style={{ color: 'var(--fg-muta)' }}>
                <span className="font-semibold">{T.gruppi.senzaFonte}:</span>{' '}
                {gruppi.senzaFonte.map((v) => v.partito.sigla ?? v.partito.nome).join(', ')}. {T.senzaFonteSpiegazione}
              </p>
            )}

            <details className="group mt-5">
              <summary
                className="cursor-pointer list-none text-sm font-semibold underline-offset-4 hover:underline"
                style={{ color: 'var(--accento)' }}
              >
                {T.fonti} <span className="inline-block transition-transform group-open:rotate-90">›</span>
              </summary>
              <ul className="mt-3 space-y-3">
                {conFonte.map(({ partito, posizione }) => (
                  <li key={partito.id} className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold">{partito.nome}</span>
                      <span className="font-semibold" style={{ color: coloreValore(posizione.valore) }}>
                        {posizione.valore !== null && T.valore[posizione.valore]}
                      </span>
                      {posizione.confidenza && (
                        <span className="text-xs" style={{ color: 'var(--fg-muta)' }}>
                          · {T.confidenza(posizione.confidenza)}
                        </span>
                      )}
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: 'var(--bordo)' }}>
                        {posizione.fonte.tipo}
                        {posizione.fonte.data ? ` · ${posizione.fonte.data}` : ''}
                      </span>
                    </p>
                    <a
                      href={posizione.fonte.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 block leading-relaxed underline-offset-2 hover:underline"
                      style={{ color: 'var(--fg-muta)' }}
                    >
                      {posizione.fonte.citazione} ↗
                    </a>
                    {posizione.nota && (
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
                        {posizione.nota}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </section>
        );
      })}

      <nav className="mt-12" aria-label="Altri temi">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muta)' }}>
          Altri temi
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {altri.map((t) => {
            const e = etichettaArea(t.area);
            return (
              <li key={t.area}>
                <Link
                  href={`/confronta/${t.area}`}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-[var(--accento)]"
                  style={{ borderColor: 'var(--bordo)' }}
                >
                  <span aria-hidden>{e.icona}</span>
                  {e.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Link href="/test-partito" className="mt-10 inline-block text-sm font-semibold underline-offset-4 hover:underline" style={{ color: 'var(--accento)' }}>
        {T.invitoTest} →
      </Link>
    </main>
  );
}
