import { iniziali } from '@/lib/profilo/regole';
import { IconaStrumento } from '@/components/strumenti/IconaStrumento';

/** Cerchio con le iniziali nel colore scelto; senza nome mostra l'icona della persona. */
export default function Avatar({ nome, colore, className = 'h-9 w-9 text-sm' }: { nome?: string; colore?: string; className?: string }) {
  const lettere = nome ? iniziali(nome) : '';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${className}`}
      style={
        lettere && colore
          ? { background: colore, color: '#0a0a0a' }
          : { background: 'rgba(255,255,255,0.08)', color: 'var(--fg-muta)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)' }
      }
      aria-hidden
    >
      {lettere || <IconaStrumento id="profilo" className="h-[55%] w-[55%]" />}
    </span>
  );
}
