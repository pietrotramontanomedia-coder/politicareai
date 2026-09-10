import Gioco from '@/components/gioco/Gioco';
import { TESTI_GIOCO } from '@/lib/gioco';

export const metadata = {
  title: `${TESTI_GIOCO.titolo} — ${TESTI_GIOCO.sottotitolo}`,
  description: TESTI_GIOCO.descrizione,
};

export default function GiocoPage() {
  return <Gioco />;
}
