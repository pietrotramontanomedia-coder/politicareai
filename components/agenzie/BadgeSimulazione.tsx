import { TESTI_AGENZIE } from '@/lib/agenzie/testi';

/** Marca un lancio che viene da un feed finto di sviluppo. Va mostrato sempre, senza eccezioni. */
export default function BadgeSimulazione({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border border-dashed px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${className}`}
      style={{ borderColor: 'var(--accento)', color: 'var(--accento)' }}
    >
      {TESTI_AGENZIE.simulazione.badge}
    </span>
  );
}
