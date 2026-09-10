import type { Classifica, TestPartitoPack } from '@politicare/motore';

/*
 * Risultato del test partiti salvato SOLO su questo dispositivo.
 *
 * Le opinioni politiche sono dati particolari (GDPR art. 9) e il test non ha account né
 * backend: questo archivio è volutamente separato dal Profilo, usa una chiave diversa e non
 * passa mai dall'archivio dell'account. Non contiene le singole risposte, solo la classifica.
 */

const CHIAVE = 'politicare:dispositivo:risultato-test';

export interface RisultatoTestLocale {
  packId: string;
  versionePack: string;
  salvatoIl: string;
  risposte: number;
  affermazioni: number;
  pariMerito: boolean;
  righe: { partitoId: string; nome: string; sigla: string; colore: string; percentuale: number }[];
  esclusi: string[];
}

export function creaRisultatoTest(
  pack: TestPartitoPack,
  classifica: Classifica,
  numeroRisposte: number,
  adesso: Date = new Date(),
): RisultatoTestLocale {
  const partitoDi = new Map(pack.partiti.map((p) => [p.id, p]));
  return {
    packId: pack.id,
    versionePack: pack.versione,
    salvatoIl: adesso.toISOString(),
    risposte: numeroRisposte,
    affermazioni: pack.affermazioni.length,
    pariMerito: classifica.pariMerito,
    righe: classifica.risultati.map((r) => {
      const p = partitoDi.get(r.partitoId);
      return {
        partitoId: r.partitoId,
        nome: r.nome,
        sigla: p?.sigla ?? r.nome,
        colore: p?.colore ?? '#9ca3af',
        percentuale: Math.round(r.punteggio * 100),
      };
    }),
    esclusi: classifica.esclusi.map((r) => partitoDi.get(r.partitoId)?.sigla ?? r.nome),
  };
}

export function leggiRisultatoTest(): RisultatoTestLocale | null {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    return grezzo ? (JSON.parse(grezzo) as RisultatoTestLocale) : null;
  } catch {
    return null;
  }
}

export function salvaRisultatoTest(risultato: RisultatoTestLocale): boolean {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(risultato));
    return true;
  } catch {
    return false;
  }
}

export function cancellaRisultatoTest(): void {
  try {
    localStorage.removeItem(CHIAVE);
  } catch {
    // Storage non disponibile: non c'è niente da cancellare.
  }
}
