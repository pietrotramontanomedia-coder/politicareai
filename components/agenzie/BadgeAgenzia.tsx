import { DESCRIZIONI_AGENZIE, type Agenzia } from '@/lib/agenzie/tipi';

interface Props {
  agenzia: Agenzia;
  /** 'sigla' per liste compatte, 'nome' per intestazioni. */
  forma?: 'sigla' | 'nome';
  className?: string;
}

/** Etichetta colorata con la sigla dell'agenzia: la stessa in ticker, lista e dettaglio. */
export default function BadgeAgenzia({ agenzia, forma = 'sigla', className = '' }: Props) {
  const d = DESCRIZIONI_AGENZIE[agenzia];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${className}`}
      style={{ background: `${d.colore}26`, color: d.colore }}
      title={d.nome}
    >
      {forma === 'sigla' ? d.sigla : d.nome}
    </span>
  );
}
