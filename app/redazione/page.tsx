import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import PortaleRedazione from '@/components/redazione/PortaleRedazione';
import { COOKIE_SESSIONE, leggiToken, redazioneConfigurata } from '@/lib/redazione/sessione-server';

export const metadata: Metadata = {
  title: 'Redazione — Politicare',
  robots: { index: false, follow: false },
  // Sulla schermata Home è un'app a sé, verde: vedi manifest.webmanifest/route.ts.
  manifest: '/redazione/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Redazione' },
  icons: {
    icon: [
      { url: '/redazione/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/redazione/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/redazione/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = { themeColor: '#14532d' };

export const dynamic = 'force-dynamic';

/** Portale interno della redazione: palestra di post e storie, con le correzioni di chi coordina. */
export default async function RedazionePage() {
  const sessione = leggiToken((await cookies()).get(COOKIE_SESSIONE)?.value, new Date());
  return <PortaleRedazione sessioneIniziale={sessione} configurata={redazioneConfigurata()} />;
}
