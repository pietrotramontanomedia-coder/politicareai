import type { Metadata } from 'next';
import Simulatore from '@/components/simulatore/Simulatore';
import { caricaPackTestPartito } from '@/lib/contenuti';
import { presetPartitiDiOggi, presetPolitiche2022, TESTI_SIMULATORE as T } from '@/lib/simulatore-elettorale';

export const metadata: Metadata = {
  title: `${T.titolo} — Politicare`,
  description: T.descrizione,
};

/** I colori dei partiti arrivano dal pack del test; il pack resta fuori dal bundle del client. */
export default function PaginaSimulatore() {
  const pack = caricaPackTestPartito();
  const partiti = pack.partiti.map((p) => ({ id: p.id, nome: p.nome, colore: p.colore ?? '#6b7280' }));
  const colori = Object.fromEntries(partiti.map((p) => [p.id, p.colore]));

  return <Simulatore preset={[presetPolitiche2022(colori), presetPartitiDiOggi(partiti)]} />;
}
