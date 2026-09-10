import type { Metadata } from 'next';
import PaginaAccesso from '@/components/profilo/PaginaAccesso';

export const metadata: Metadata = {
  title: 'Accedi — Politicare',
  robots: { index: false },
};

export default function AccediPage() {
  return <PaginaAccesso />;
}
