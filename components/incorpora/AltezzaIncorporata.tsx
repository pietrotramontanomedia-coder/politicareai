"use client";

import { useEffect } from "react";

/** Dice alla pagina che ci ospita quanto è alta la pagina, così l'iframe non ha barre di scorrimento. */
export default function AltezzaIncorporata({ nome }: { nome: string }) {
  useEffect(() => {
    if (window.parent === window) return;
    let ultima = 0;
    const invia = () => {
      const altezza = Math.ceil(document.documentElement.scrollHeight);
      if (altezza === ultima) return;
      ultima = altezza;
      window.parent.postMessage(
        { tipo: "politicare-altezza", nome, altezza },
        "*",
      );
    };
    const osservatore = new ResizeObserver(invia);
    osservatore.observe(document.body);
    invia();
    return () => osservatore.disconnect();
  }, [nome]);
  return null;
}
