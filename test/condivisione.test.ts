import { describe, expect, it } from 'vitest';
import { calcolaClassifica } from '@politicare/motore';
import type { QuizSettimanale, Risposta, RispostaQuiz, TestPartitoPack } from '@politicare/motore';
import packJson from '@/content/test-partito/politiche-2027.v1.json';
import quizJson from '@/content/quiz/settimana-03.json';
import { COLORE_SEGGIO_VUOTO, datiConfronto, datiQuiz, datiSimulazione, datiTest } from '@/lib/condivisione/dati';
import { REGOLE, simula } from '@/lib/simulatore-elettorale';

const pack = packJson as unknown as TestPartitoPack;
const quiz = quizJson as unknown as QuizSettimanale;

describe('grafica del test', () => {
  const risposte: Risposta[] = pack.affermazioni.map((a, i) => ({ affermazioneId: a.id, valore: i % 2 === 0 ? 2 : -1, importante: false }));
  const classifica = calcolaClassifica(risposte, pack.partiti, { affermazioni: pack.affermazioni });
  const dati = datiTest(pack, classifica, risposte.length);

  it('riporta la classifica completa, nello stesso ordine e con le stesse percentuali della pagina', () => {
    expect(dati.righe.map((r) => r.nome)).toEqual(classifica.risultati.map((r) => r.nome));
    expect(dati.righe.map((r) => r.percentuale)).toEqual(classifica.risultati.map((r) => Math.round(r.punteggio * 100)));
    expect(dati.righe.length + dati.esclusi.length).toBe(pack.partiti.length);
    expect(dati.pariMerito).toBe(classifica.pariMerito);
  });

  it('ogni partito ha logo e colore, e le singole risposte non entrano nella grafica', () => {
    for (const r of dati.righe) {
      expect(r.logo, r.nome).toMatch(/^\/loghi-partiti\/.+\.png$/);
      expect(r.colore).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(JSON.stringify(dati)).not.toContain('affermazioneId');
  });
});

describe('grafica del quiz', () => {
  it('conta le risposte esatte e segna ogni domanda nell’ordine del quiz', () => {
    const risposte: RispostaQuiz[] = quiz.domande.map((d, i) => ({
      domandaId: d.id,
      rispostaSelezionata: i < 5 ? d.rispostaCorretta : (d.rispostaCorretta + 1) % d.opzioni.length,
      corretta: i < 5,
    }));
    const dati = datiQuiz(quiz, risposte);
    expect(dati.corrette).toBe(5);
    expect(dati.totale).toBe(quiz.domande.length);
    expect(dati.esiti).toEqual(quiz.domande.map((_, i) => i < 5));
    expect(dati.sezioni.reduce((a, s) => a + s.totale, 0)).toBe(quiz.domande.length);
    expect(dati.commento).not.toMatch(/qui sotto/);
  });
});

describe('grafica della simulazione', () => {
  it('colora un seggio per ogni seggio assegnato e lascia vuoti gli altri', () => {
    const esito = simula(
      [
        { id: 'a', nome: 'Lista A', percentuale: 45, coalizione: null, colore: '#2E5CB3' },
        { id: 'b', nome: 'Lista B', percentuale: 35, coalizione: null, colore: '#E4002B' },
        { id: 'c', nome: 'Lista C', percentuale: 20, coalizione: null, colore: '#F5C400' },
      ],
      { coalizioni: {}, maggioranzeDiverse: false },
    );
    const dati = datiSimulazione(esito);
    expect(dati.coloriEmiciclo).toHaveLength(REGOLE.camera.totale);
    const assegnati = esito.competitori.reduce((a, c) => a + c.seggiCamera, 0);
    expect(dati.coloriEmiciclo.filter((c) => c !== COLORE_SEGGIO_VUOTO)).toHaveLength(assegnati);
    expect(dati.premio.length).toBeGreaterThan(0);
  });
});

describe('grafica del confronto', () => {
  it('divide i partiti come la pagina del tema, senza perderne nessuno', () => {
    for (const affermazione of pack.affermazioni) {
      const dati = datiConfronto(pack, affermazione);
      const conFonte = dati.gruppi.reduce((a, g) => a + g.partiti.length, 0);
      expect(conFonte + dati.senzaFonte.length, affermazione.id).toBe(pack.partiti.length);
      expect(dati.gruppi.map((g) => g.chiave)).toEqual(['favorevoli', 'neutri', 'contrari']);
    }
  });
});
