import type { Metadata } from "next";
import Simulatore from "@/components/simulatore/Simulatore";
import AltezzaIncorporata from "@/components/incorpora/AltezzaIncorporata";
import { caricaPackTestPartito } from "@/lib/contenuti";
import {
  presetPartitiDiOggi,
  presetPolitiche2022,
  presetSondaggi,
  TESTI_SIMULATORE as T,
} from "@/lib/simulatore-elettorale";
import { GEOGRAFIA_SENATO_2022 } from "@/lib/simulatore-geografia-2022";

// Versione senza menu, da mettere dentro politicare.it. La pagina da indicizzare è quella del sito.
export const metadata: Metadata = {
  title: `${T.titolo} — Politicare`,
  robots: { index: false, follow: true },
};

export default function SimulatoreIncorporato() {
  const pack = caricaPackTestPartito();
  const partiti = pack.partiti.map((p) => ({
    id: p.id,
    nome: p.nome,
    colore: p.colore ?? "#6b7280",
  }));
  const colori = Object.fromEntries(partiti.map((p) => [p.id, p.colore]));

  return (
    <>
      <AltezzaIncorporata nome="simulatore" />
      <Simulatore
        preset={[
          presetSondaggi(partiti),
          presetPolitiche2022(colori),
          presetPartitiDiOggi(partiti),
        ]}
        geografia={GEOGRAFIA_SENATO_2022}
        incorporato
      />
    </>
  );
}
