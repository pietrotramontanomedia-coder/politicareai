import type { IdStrumento } from '@/lib/strumenti';

export type IdIcona = IdStrumento | 'home' | 'griglia' | 'chiudi' | 'freccia';

interface Props {
  id: IdIcona;
  className?: string;
  spessore?: number;
}

/** Icone lineari degli strumenti, a tratto uniforme, colorate con currentColor. */
export function IconaStrumento({ id, className = 'h-5 w-5', spessore = 1.8 }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={spessore}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {TRATTI[id]}
    </svg>
  );
}

const TRATTI: Record<IdIcona, React.ReactNode> = {
  home: <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" />,
  test: (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  quiz: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  confronta: (
    <>
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M4 7h16" />
      <path d="M7 7 4 14a3 3 0 0 0 6 0L7 7Z" />
      <path d="m17 7-3 7a3 3 0 0 0 6 0l-3-7Z" />
    </>
  ),
  simulatore: (
    <>
      <path d="M2.5 19a9.5 9.5 0 0 1 19 0" />
      <path d="M6.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M2 19h20" />
    </>
  ),
  gioco: (
    <>
      <rect x="3" y="6" width="11" height="15" rx="2" transform="rotate(-10 8.5 13.5)" />
      <rect x="10" y="3" width="11" height="15" rx="2" transform="rotate(8 15.5 10.5)" />
    </>
  ),
  metodologia: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </>
  ),
  griglia: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  chiudi: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  freccia: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
};
