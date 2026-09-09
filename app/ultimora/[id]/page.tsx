import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { leggiNotizia, type FonteUltimOra } from '@/lib/ultimora-server';
import { CANALE_TELEGRAM } from '@/lib/telegram-server';
import { formattaDataEstesa } from '@/lib/data-ora';
import flashData from '@/content/agenzia/flash.json';

export const revalidate = 900;

const FONTI: Record<FonteUltimOra, { etichetta: string; url: string }> = {
  instagram: { etichetta: 'profilo ufficiale @politicareit', url: 'https://www.instagram.com/politicareit/' },
  telegram: { etichetta: `canale ufficiale Telegram @${CANALE_TELEGRAM}`, url: `https://t.me/${CANALE_TELEGRAM}` },
};

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

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const notizia = await caricaNotizia(id);
  return { title: notizia ? `${notizia.titolo} — Politicare` : 'Notizia non trovata — Politicare' };
}

export default async function NotiziaPage({ params }: Props) {
  const { id } = await params;
  const notizia = await caricaNotizia(id);
  if (!notizia) notFound();

  const paragrafi = notizia.testo
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const fonte = notizia.fonte ? FONTI[notizia.fonte] : null;

  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6">
      <article className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--fg-muta)' }}
        >
          <span>←</span> Torna alla home
        </Link>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-1 rounded"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
          >
            Ultim&apos;ora
          </span>
          <time
            dateTime={notizia.data}
            className="text-xs sm:text-sm font-mono font-bold tabular-nums"
            style={{ color: 'var(--accento)' }}
          >
            {formattaDataEstesa(notizia.data)}
          </time>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold leading-tight">{notizia.titolo}</h1>
        <p className="mt-3 text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--fg-muta)' }}>
          Politicare · Agenzia
        </p>

        <hr className="my-6 border-0 h-px" style={{ background: 'var(--bordo)' }} />

        {notizia.immagine && (
          <img
            src={notizia.immagine}
            alt=""
            className={`block w-full max-w-md mx-auto rounded-2xl border mb-6 ${
              notizia.fonte === 'instagram' ? 'aspect-[4/5] object-cover' : 'h-auto'
            }`}
            style={{ borderColor: 'var(--bordo)', background: 'var(--bg-card)' }}
          />
        )}

        {paragrafi.length > 0 && (
          <div className="space-y-4 text-base sm:text-lg leading-relaxed">
            {paragrafi.map((p, i) => (
              <p key={i} className={i === 0 ? 'font-medium' : ''} style={i > 0 ? { color: 'var(--fg-muta)' } : undefined}>
                {p}
              </p>
            ))}
          </div>
        )}

        {fonte && (
          <p className="mt-10 text-xs" style={{ color: 'var(--fg-muta)' }}>
            Fonte:{' '}
            <a
              href={fonte.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:no-underline"
              style={{ color: 'var(--fg)' }}
            >
              {fonte.etichetta}
            </a>
          </p>
        )}
      </article>
    </main>
  );
}
