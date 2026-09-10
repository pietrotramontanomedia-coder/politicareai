import type { FonteUltimOra } from '@/lib/ultimora-server';

/** Icona lineare della fonte di una notizia, colorata con currentColor. */
export function IconaFonte({ fonte, className = 'h-4 w-4' }: { fonte: FonteUltimOra; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {fonte === 'telegram' ? (
        <>
          <path d="M21.5 3.5 2.5 11l7 2.5 2.5 7 9.5-17Z" />
          <path d="m21.5 3.5-12 10" />
        </>
      ) : (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <path d="M17.5 6.5h.01" />
        </>
      )}
    </svg>
  );
}

export function IconaCondividi({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
