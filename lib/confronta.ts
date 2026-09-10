import type { Affermazione, Partito, Posizione, TestPartitoPack, Valore } from '@politicare/motore';

/**
 * Confronto delle posizioni dei partiti tema per tema. Riusa il pack del test:
 * stesse posizioni, stesse fonti, nessun dato aggiuntivo e nessun punteggio.
 */

export type Schieramento = 'favorevoli' | 'neutri' | 'contrari' | 'senzaFonte';

export const SCHIERAMENTI: Schieramento[] = ['favorevoli', 'neutri', 'contrari', 'senzaFonte'];

export interface PosizionePartito {
  partito: Partito;
  posizione: Posizione;
}

export interface ConfrontoAffermazione {
  affermazione: Affermazione;
  gruppi: Record<Schieramento, PosizionePartito[]>;
}

export interface Tema {
  area: string;
  affermazioni: Affermazione[];
}

export function schieramento(valore: Valore | null): Schieramento {
  if (valore === null) return 'senzaFonte';
  if (valore > 0) return 'favorevoli';
  if (valore < 0) return 'contrari';
  return 'neutri';
}

/** I temi nell'ordine in cui compaiono nel pack, ognuno con le sue affermazioni. */
export function temi(pack: TestPartitoPack): Tema[] {
  const perArea = new Map<string, Affermazione[]>();
  for (const a of pack.affermazioni) {
    perArea.set(a.area, [...(perArea.get(a.area) ?? []), a]);
  }
  return [...perArea.entries()].map(([area, affermazioni]) => ({ area, affermazioni }));
}

export function temaPerArea(pack: TestPartitoPack, area: string): Tema | undefined {
  return temi(pack).find((t) => t.area === area);
}

/**
 * Raggruppa i partiti per posizione su un'affermazione. Dentro ogni gruppo
 * l'ordine è alfabetico: il confronto mostra dove stanno, non una classifica.
 */
export function confrontaAffermazione(pack: TestPartitoPack, affermazione: Affermazione): ConfrontoAffermazione {
  const gruppi: Record<Schieramento, PosizionePartito[]> = { favorevoli: [], neutri: [], contrari: [], senzaFonte: [] };

  for (const partito of pack.partiti) {
    const posizione = partito.posizioni.find((p) => p.affermazioneId === affermazione.id);
    if (!posizione) continue;
    gruppi[schieramento(posizione.valore)].push({ partito, posizione });
  }

  for (const s of SCHIERAMENTI) {
    gruppi[s].sort((a, b) => a.partito.nome.localeCompare(b.partito.nome, 'it'));
  }
  return { affermazione, gruppi };
}

/** Testi di interfaccia del confronto, tenuti fuori dai componenti. */
export const TESTI_CONFRONTA = {
  etichetta: 'Confronta',
  titolo: 'Confronta i partiti',
  sottotitolo: 'Tema per tema: dove sta ogni partito e da quale fonte lo sappiamo.',
  spiegazione:
    'Le posizioni sono le stesse del test dei partiti, ognuna con citazione, data e link. Qui non c’è nessun punteggio: solo chi è favorevole, chi è contrario e chi non ha una posizione documentata.',
  affermazioni: (n: number) => (n === 1 ? '1 affermazione' : `${n} affermazioni`),
  apriTema: 'Vedi il confronto',
  tuttiITemi: '← Tutti i temi',
  gruppi: {
    favorevoli: 'Favorevoli',
    neutri: 'Neutri o divisi',
    contrari: 'Contrari',
    senzaFonte: 'Senza fonte',
  } satisfies Record<Schieramento, string>,
  nessuno: 'Nessuno',
  valore: {
    [2]: 'molto favorevole',
    [1]: 'favorevole',
    [0]: 'neutro',
    [-1]: 'contrario',
    [-2]: 'molto contrario',
  } as Record<Valore, string>,
  verso: (v: 1 | -1) => (v === 1 ? 'propone un cambiamento' : 'difende l’assetto vigente'),
  fonti: 'Le fonti, partito per partito',
  confidenza: (c: string) => `confidenza ${c}`,
  senzaFonteSpiegazione: 'Non abbiamo trovato una fonte verificabile: la casella resta vuota invece di essere indovinata.',
  invitoTest: 'Vuoi sapere quale partito ti somiglia di più? Fai il test',
  metodologia: 'Come scegliamo e codifichiamo le posizioni',
} as const;
