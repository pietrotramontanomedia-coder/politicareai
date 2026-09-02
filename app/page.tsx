import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--accento)' }}>
        Politicare
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Capisci la politica, un&apos;affermazione alla volta.
      </h1>
      <p className="mt-4 text-lg" style={{ color: 'var(--fg-muta)' }}>
        Test di allineamento con i partiti, approfondimenti sui referendum, quiz settimanale.
        Le tue risposte restano sul tuo dispositivo: non le vediamo, non le salviamo.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/test-partito"
          className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--color-terra)' }}
        >
          Inizia il test dei partiti →
        </Link>
        <Link
          href="/metodologia"
          className="inline-flex items-center justify-center rounded-full border px-6 py-3.5 text-base font-medium"
          style={{ borderColor: 'var(--bordo)' }}
        >
          Come funziona
        </Link>
      </div>

      <p className="mt-12 text-sm" style={{ color: 'var(--fg-muta)' }}>
        Richiede circa 6 minuti. Nessuna registrazione.
      </p>
    </main>
  );
}
