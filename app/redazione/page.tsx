import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import PortaleRedazione from '@/components/redazione/PortaleRedazione';
import { COOKIE_SESSIONE, leggiToken, redazioneConfigurata } from '@/lib/redazione/sessione-server';

export const metadata: Metadata = {
  title: 'Redazione — Politicare',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Portale interno della redazione: palestra di post e storie, con le correzioni di chi coordina. */
export default async function RedazionePage() {
  const sessione = leggiToken((await cookies()).get(COOKIE_SESSIONE)?.value, new Date());
  return <PortaleRedazione sessioneIniziale={sessione} configurata={redazioneConfigurata()} />;
}
