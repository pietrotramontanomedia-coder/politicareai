import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { leggiNotizia, leggiUltimOra, type FonteUltimOra, type NotiziaUltimOra } from '@/lib/ultimora-server';
import { formattaDataEstesa, formattaDataRelativa } from '@/lib/data-ora';
import { conAlfa } from '@/lib/strumenti';
import { FONTI_ULTIMORA, TESTI_ULTIMORA as T } from '@/lib/ultimora-testi';
import BattitoLive from '@/components/ultimora/BattitoLive';
import CondividiNotizia from '@/components/ultimora/CondividiNotizia';
import { IconaFonte } from '@/components/ultimora/IconaFonte';
import flashData from '@/content/agenzia/flash.json';

export const revalidate = 900;

interface Notizia {
  titolo: string;
  testo: string;
  data: string;
  immagine?: string;
  fonte?: FonteUltimOra;
}

async function caricaNotizia(id: string): Promise<Notizia | null> {
  const notizia = await leggiNotizia(id);
  if (notizia) return notizia;
  const flash = flashData.voci.find((v) => v.id === id);
  if (flash) return { titolo: flash.titolo, testo: flash.testo, data: flash.orario };
  return null;
}

async function caricaAltre(id: string): Promise<NotiziaUltimOra[]> {
  try {
    return (await leggiUltimOra()).filter((n) => n.id !== id).slice(0, 4);
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const notizia = await caricaNotizia(id);
  return { title: notizia ? `${notizia.titolo} — Politicare` : 'Notizia non trovata — Politicare' };
}

const VETRO = { borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(20,20,20,0.6)' };

export default async function NotiziaPage({ params }: Props) {
  const { id } = await params;
  const [notizia, altre] = await Promise.all([caricaNotizia(id), caricaAltre(id)]);
  if (!notizia) notFound();

  const paragrafi = notizia.testo
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
  const fonte = notizia.fonte ? FONTI_ULTIMORA[notizia.fonte] : null;

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: 'radial-gradient(60% 60% at 50% 0%, rgba(239,68,68,0.15), transparent 70%)' }}
        aria-hidden
      />

      <article className="relative mx-auto max-w-2xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/#ultimora"
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors hover:border-[rgba(239,68,68,0.5)]"
            style={VETRO}
          >
            <span aria-hidden>←</span> {T.torna}
          </Link>
          <CondividiNotizia titolo={notizia.titolo} />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(239,68,68,0.16)', color: '#f87171' }}
          >
            <BattitoLive />
            {T.titolo}
          </span>
          <time
            dateTime={notizia.data}
            className="rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums"
            style={{ background: 'rgba(254,220,1,0.1)', color: 'var(--accento)' }}
          >
            {formattaDataEstesa(notizia.data)}
          </time>
          {fonte && notizia.fonte && (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium" style={{ borderColor: 'rgba(255,255,255,0.1)', color: fonte.colore }}>
              <IconaFonte fonte={notizia.fonte} className="h-3.5 w-3.5" />
              <span style={{ color: 'var(--fg-muta)' }}>{fonte.nome}</span>
            </span>
          )}
        </div>

        <h1 className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight sm:text-5xl">{notizia.titolo}</h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
          {T.agenzia}
        </p>

        {notizia.immagine && (
          <figure className="mt-8">
            <div
              className="mx-auto max-w-md overflow-hidden rounded-3xl border"
              style={{ borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(239,68,68,0.12), 0 20px 50px rgba(0,0,0,0.5)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- immagini da CDN esterni di Telegram e Instagram */}
              <img
                src={notizia.immagine}
                alt=""
                className={`block w-full ${notizia.fonte === 'instagram' ? 'aspect-[4/5] object-cover' : 'h-auto'}`}
                style={{ background: 'var(--bg-card)' }}
              />
            </div>
          </figure>
        )}

        {paragrafi.length > 0 && (
          <div className="mt-8 space-y-4">
            {paragrafi.map((p, i) =>
              i === 0 ? (
                <p key={i} className="border-l-2 pl-4 text-lg font-medium leading-relaxed sm:text-xl" style={{ borderColor: '#ef4444' }}>
                  {p}
                </p>
              ) : (
                <p key={i} className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--fg-muta)' }}>
                  {p}
                </p>
              ),
            )}
          </div>
        )}

        {fonte && notizia.fonte && (
          <aside
            className="mt-12 flex flex-col gap-4 rounded-3xl border p-5 sm:flex-row sm:items-center sm:justify-between"
            style={{
              borderColor: conAlfa(fonte.colore, 0.3),
              background: `radial-gradient(120% 120% at 100% 0%, ${conAlfa(fonte.colore, 0.14)}, transparent 60%), var(--bg-card)`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: conAlfa(fonte.colore, 0.18), color: fonte.colore }}
              >
                <IconaFonte fonte={notizia.fonte} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
                  {T.fonte}
                </p>
                <p className="font-semibold">{fonte.etichetta}</p>
              </div>
            </div>
            <a
              href={fonte.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: fonte.colore, color: '#0a0a0a' }}
            >
              {T.apriFonte(fonte.nome)} <span aria-hidden>↗</span>
            </a>
          </aside>
        )}
      </article>

      {altre.length > 0 && (
        <section className="relative mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <BattitoLive />
            {T.altre}
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {altre.map((n) => {
              const f = FONTI_ULTIMORA[n.fonte];
              return (
                <li key={n.id}>
                  <Link
                    href={`/ultimora/${n.id}`}
                    className="group flex h-full gap-3 rounded-2xl border p-3.5 transition-colors hover:border-[rgba(239,68,68,0.45)]"
                    style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01))' }}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-xs">
                        <span className="rounded-md px-1.5 py-0.5 font-mono font-bold tabular-nums" style={{ background: 'rgba(254,220,1,0.1)', color: 'var(--accento)' }}>
                          {formattaDataRelativa(n.data)}
                        </span>
                        <span style={{ color: f.colore }}>
                          <IconaFonte fonte={n.fonte} className="h-3.5 w-3.5" />
                        </span>
                      </span>
                      <span className="mt-1.5 line-clamp-2 block text-sm font-semibold leading-snug group-hover:underline sm:text-base">{n.titolo}</span>
                    </div>
                    {n.immagine && (
                      // eslint-disable-next-line @next/next/no-img-element -- immagini da CDN esterni di Telegram e Instagram
                      <img src={n.immagine} alt="" loading="lazy" className="h-20 w-16 shrink-0 rounded-xl border object-cover" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
