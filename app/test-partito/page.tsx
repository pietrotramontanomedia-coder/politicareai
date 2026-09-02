import type { Metadata } from 'next';
import { caricaPackTestPartito } from '@/lib/contenuti';
import TestPartito from '@/components/test-partito/TestPartito';

export const metadata: Metadata = {
  title: 'Test dei partiti — Politicare',
  description: 'Scopri con quale partito sei più allineato. Calcolo sul tuo dispositivo, nessun dato inviato.',
};

export default function PaginaTestPartito() {
  const pack = caricaPackTestPartito();
  return <TestPartito pack={pack} />;
}
