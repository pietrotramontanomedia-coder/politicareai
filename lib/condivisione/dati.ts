import { riepilogaQuiz } from '@politicare/motore';
import type { Affermazione, Classifica, QuizSettimanale, RispostaQuiz, TestPartitoPack } from '@politicare/motore';
import { etichettaArea } from '@/lib/aree';
import { confrontaAffermazione, TESTI_CONFRONTA } from '@/lib/confronta';
import { LOGHI_PARTITI } from '@/lib/loghi-partiti';
import { TESTI_QUIZ } from '@/lib/quiz';
import { REGOLE, TESTI_SIMULATORE, type Esito } from '@/lib/simulatore-elettorale';
import { TESTI_CONDIVISIONE } from './testi';

/*
 * Dati delle grafiche da condividere, preparati senza toccare il DOM (e quindi testabili).
 * Le grafiche contengono solo ciò che l'utente vede già a schermo: mai le singole risposte del test.
 */

export type Formato = 'post' | 'storia';

export const FORMATI: Record<Formato, { larghezza: number; altezza: number }> = {
  post: { larghezza: 1080, altezza: 1350 },
  storia: { larghezza: 1080, altezza: 1920 },
};

export interface VocePartitoGrafica {
  nome: string;
  sigla: string;
  colore: string;
  logo?: string;
}

function vocePartito(partito: { nome: string; sigla?: string; colore?: string }): VocePartitoGrafica {
  return {
    nome: partito.nome,
    sigla: partito.sigla ?? partito.nome,
    colore: partito.colore ?? '#9ca3af',
    logo: LOGHI_PARTITI[partito.nome],
  };
}

export interface DatiTest {
  righe: (VocePartitoGrafica & { percentuale: number })[];
  esclusi: string[];
  pariMerito: boolean;
  risposte: number;
  affermazioni: number;
}

export function datiTest(pack: TestPartitoPack, classifica: Classifica, numeroRisposte: number): DatiTest {
  const partitoDi = new Map(pack.partiti.map((p) => [p.id, p]));
  const voce = (id: string, nome: string) => vocePartito(partitoDi.get(id) ?? { nome });
  return {
    righe: classifica.risultati.map((r) => ({ ...voce(r.partitoId, r.nome), percentuale: Math.round(r.punteggio * 100) })),
    esclusi: classifica.esclusi.map((r) => voce(r.partitoId, r.nome).sigla),
    pariMerito: classifica.pariMerito,
    risposte: numeroRisposte,
    affermazioni: pack.affermazioni.length,
  };
}

export interface DatiQuiz {
  intestazione: string;
  percentuale: number;
  corrette: number;
  totale: number;
  /** Esito di ogni domanda, nell'ordine del quiz. */
  esiti: boolean[];
  sezioni: { titolo: string; icona: string; corrette: number; totale: number }[];
  commento: string;
}

export function datiQuiz(quiz: QuizSettimanale, risposte: RispostaQuiz[]): DatiQuiz {
  const riepilogo = riepilogaQuiz(quiz, risposte);
  const corretta = new Map(risposte.map((r) => [r.domandaId, r.corretta]));
  return {
    intestazione: TESTI_QUIZ.intestazione(quiz),
    percentuale: riepilogo.percentuale,
    corrette: riepilogo.corrette,
    totale: riepilogo.totale,
    esiti: quiz.domande.map((d) => corretta.get(d.id) ?? false),
    sezioni: riepilogo.perSezione.map((g) => {
      const sezione = quiz.sezioni.find((s) => s.id === g.id);
      return { titolo: sezione?.titolo ?? g.id, icona: sezione?.icona ?? '', corrette: g.corrette, totale: g.totale };
    }),
    commento: TESTI_CONDIVISIONE.quiz.commento(riepilogo.percentuale),
  };
}

export interface DatiSimulazione {
  premio: string;
  assegnato: boolean;
  competitori: { nome: string; colore: string; seggiCamera: number; seggiSenato: number }[];
  /** Un colore per ciascuno dei seggi della Camera, nell'ordine dell'emiciclo. */
  coloriEmiciclo: string[];
  seggiPrimo: number;
  maggioranza: string;
}

export const COLORE_SEGGIO_VUOTO = '#2a2a2a';

export function messaggioPremio(esito: Esito): string {
  const vincitore = esito.competitori.find((c) => c.id === esito.premio.vincitore);
  if (esito.premio.motivo === 'assegnato' && vincitore) return TESTI_SIMULATORE.premio.assegnato(vincitore.nome);
  return TESTI_SIMULATORE.premio[esito.premio.motivo as Exclude<typeof esito.premio.motivo, 'assegnato'>];
}

export function datiSimulazione(esito: Esito): DatiSimulazione {
  const coloriEmiciclo: string[] = [];
  for (const c of esito.competitori) for (let i = 0; i < c.seggiCamera; i++) coloriEmiciclo.push(c.colore);
  while (coloriEmiciclo.length < REGOLE.camera.totale) coloriEmiciclo.push(COLORE_SEGGIO_VUOTO);

  return {
    premio: messaggioPremio(esito),
    assegnato: esito.premio.motivo === 'assegnato',
    competitori: esito.competitori
      .filter((c) => c.seggiCamera > 0 || c.seggiSenato > 0)
      .map((c) => ({ nome: c.nome, colore: c.colore, seggiCamera: c.seggiCamera, seggiSenato: c.seggiSenato })),
    coloriEmiciclo,
    seggiPrimo: esito.competitori[0]?.seggiCamera ?? 0,
    maggioranza: TESTI_SIMULATORE.maggioranza(REGOLE.camera.maggioranza, REGOLE.camera.totale),
  };
}

export interface DatiConfronto {
  id: string;
  area: string;
  tema: string;
  icona: string;
  affermazione: string;
  gruppi: { chiave: 'favorevoli' | 'neutri' | 'contrari'; titolo: string; partiti: VocePartitoGrafica[] }[];
  senzaFonte: string[];
}

export function datiConfronto(pack: TestPartitoPack, affermazione: Affermazione): DatiConfronto {
  const { gruppi } = confrontaAffermazione(pack, affermazione);
  const { label, icona } = etichettaArea(affermazione.area);
  return {
    id: affermazione.id,
    area: affermazione.area,
    tema: label,
    icona,
    affermazione: affermazione.testo,
    gruppi: (['favorevoli', 'neutri', 'contrari'] as const).map((chiave) => ({
      chiave,
      titolo: TESTI_CONFRONTA.gruppi[chiave],
      partiti: gruppi[chiave].map((v) => vocePartito(v.partito)),
    })),
    senzaFonte: gruppi.senzaFonte.map((v) => v.partito.sigla ?? v.partito.nome),
  };
}
