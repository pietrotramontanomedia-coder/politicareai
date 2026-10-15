import type { Metadata } from 'next';
import PaginaFanta from '@/components/fantaparlamento/PaginaFanta';
import { etichettaGiornata, GIORNATE, listone, REGOLE, STAGIONE, ultimaGiornata } from '@/lib/fantaparlamento/dati';

export const metadata: Metadata = {
  title: 'Fantaparlamento — Politicare',
  description:
    'Il fantacalcio della Camera: scegli 11 deputati con un budget di crediti e fai punti con le loro votazioni vere, dai dati aperti della Camera dei deputati.',
  manifest: '/icone/fantaparlamento/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Fanta' },
  icons: {
    icon: [
      { url: '/icone/fantaparlamento/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icone/fantaparlamento/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icone/fantaparlamento/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function FantaparlamentoPage() {
  const giornata = ultimaGiornata();
  return (
    <PaginaFanta
      stagione={{ id: STAGIONE.id, nome: STAGIONE.nome, ramo: STAGIONE.ramo, fonti: STAGIONE.fonti }}
      regole={REGOLE}
      listone={listone()}
      giornata={giornata}
      etichettaGiornata={giornata ? etichettaGiornata(giornata.id) : null}
      giornateValide={GIORNATE.filter((g) => g.votazioni > 0).length}
    />
  );
}
