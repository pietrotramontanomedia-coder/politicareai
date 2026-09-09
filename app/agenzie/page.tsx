import type { Metadata } from 'next';
import LanciAgenzie from '@/components/agenzie/LanciAgenzie';
import { TESTI_AGENZIE } from '@/lib/agenzie/testi';

export const metadata: Metadata = {
  title: `${TESTI_AGENZIE.titolo} — Politicare`,
  description: TESTI_AGENZIE.sottotitolo,
};

export default function AgenziePage() {
  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--fg-muta)' }}>
          {TESTI_AGENZIE.sottotitolo}
        </p>
        <LanciAgenzie />
      </div>
    </main>
  );
}
