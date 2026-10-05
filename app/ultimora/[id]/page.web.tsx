import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DettaglioUltimora from '@/components/ultimora/DettaglioUltimora';
import { leggiAltre, leggiNotiziaOFlash } from '@/lib/ultimora-server';

export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const notizia = await leggiNotiziaOFlash(id);
  return { title: notizia ? `${notizia.titolo} — Politicare` : 'Notizia non trovata — Politicare' };
}

export default async function NotiziaPage({ params }: Props) {
  const { id } = await params;
  const [notizia, altre] = await Promise.all([leggiNotiziaOFlash(id), leggiAltre(id)]);
  if (!notizia) notFound();
  return <DettaglioUltimora id={id} notizia={notizia} altre={altre} />;
}
