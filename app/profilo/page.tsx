import type { Metadata } from 'next';
import PaginaProfilo from '@/components/profilo/PaginaProfilo';
import { caricaQuizCorrente } from '@/lib/quiz';

export const metadata: Metadata = {
  title: 'Il tuo profilo — Politicare',
  robots: { index: false },
};

export default function ProfiloPage() {
  return <PaginaProfilo ultimoQuiz={caricaQuizCorrente().numero} />;
}
