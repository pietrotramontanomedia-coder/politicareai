import type { Metadata } from 'next';
import PaginaFanta from '@/components/fantaparlamento/PaginaFanta';
import { etichettaGiornata, GIORNATE, listone, REGOLE, STAGIONE, ultimaGiornata } from '@/lib/fantaparlamento/dati';

export const metadata: Metadata = {
  title: 'Fantaparlamento — Politicare',
  description:
    'Il fantacalcio della Camera: scegli 11 deputati con un budget di crediti e fai punti con le loro votazioni vere, dai dati aperti della Camera dei deputati.',
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
