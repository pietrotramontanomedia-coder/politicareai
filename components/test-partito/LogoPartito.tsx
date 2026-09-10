'use client';

import Image from 'next/image';
import { LOGHI_PARTITI } from '@/lib/loghi-partiti';

interface Props {
  nome: string;
  /** Usata nel segnaposto quando manca il file del logo. */
  sigla?: string;
  colore?: string;
  className?: string;
}

export function LogoPartito({ nome, sigla, colore, className = 'w-10 h-10' }: Props) {
  const src = LOGHI_PARTITI[nome];

  if (!src) {
    // Nessun file: segnaposto con la sigla nel colore del partito, così il partito resta riconoscibile.
    return (
      <div
        className={`${className} flex items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wide`}
        style={{ background: colore ? `${colore}33` : 'var(--bordo)', color: colore ?? 'var(--fg)' }}
        aria-label={`Logo ${nome}`}
        role="img"
      >
        {sigla ?? nome.slice(0, 3)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`Logo ${nome}`}
      width={40}
      height={40}
      className={`${className} object-contain rounded`}
      priority
    />
  );
}
