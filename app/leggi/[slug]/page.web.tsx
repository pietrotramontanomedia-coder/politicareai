'use client';

import { useParams } from 'next/navigation';
import LettoreArticolo from '@/components/articolo/LettoreArticolo';

export default function LeggiArticoloPage() {
  const params = useParams();
  return <LettoreArticolo slug={params.slug as string} />;
}
