'use client';

import Link from 'next/link';
import Avatar from './Avatar';
import { useProfilo } from './ProfiloProvider';
import { TESTI_PROFILO as T } from '@/lib/profilo/testi';

/** Avatar nell'header: porta al profilo. */
export default function PulsanteProfilo() {
  const { profilo } = useProfilo();
  return (
    <Link href="/profilo" aria-label={T.apri} className="rounded-full transition-transform hover:scale-105">
      <Avatar nome={profilo?.nome} colore={profilo?.colore} />
    </Link>
  );
}
