import Gioco from '@/components/gioco/Gioco';
import { TESTI_GIOCO, type PartitoGioco } from '@/lib/gioco';
import packPartiti from '@/content/test-partito/politiche-2027.v1.json';

export const metadata = {
  title: `${TESTI_GIOCO.titolo} — ${TESTI_GIOCO.sottotitolo}`,
  description: TESTI_GIOCO.descrizione,
};

/** Solo nome, sigla e leader: il pacchetto completo del test resta fuori dal bundle del gioco. */
const PARTITI: PartitoGioco[] = packPartiti.partiti.map(({ nome, sigla, leader }) => ({ nome, sigla, leader }));

export default function GiocoPage() {
  return <Gioco partiti={PARTITI} />;
}
