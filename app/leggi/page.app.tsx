'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ArticoloSkeleton from '@/components/ArticoloSkeleton';
import LettoreArticolo from '@/components/articolo/LettoreArticolo';

function Lettore() {
  const slug = useSearchParams().get('slug') ?? '';
  return <LettoreArticolo slug={slug} />;
}

/** Solo app: /leggi/?slug=... Il lettore chiama già da sé l'API dell'articolo. */
export default function LeggiApp() {
  return (
    <Suspense fallback={<main className="min-h-dvh px-4 py-8 sm:px-6"><div className="mx-auto max-w-2xl"><ArticoloSkeleton /></div></main>}>
      <Lettore />
    </Suspense>
  );
}
