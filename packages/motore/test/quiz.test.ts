import { describe, expect, it } from 'vitest';
import { contaPerDifficolta, contaPerSezione, mescolaIndici, riepilogaQuiz, validaQuiz } from '../src/quiz';
import type { QuizSettimanale } from '../src/tipi';
import quizSettimana01 from '../../../content/quiz/settimana-01.json' with { type: 'json' };
import quizSettimana02 from '../../../content/quiz/settimana-02.json' with { type: 'json' };
import quizSettimana03 from '../../../content/quiz/settimana-03.json' with { type: 'json' };

const fonte = { tipo: 'stampa' as const, citazione: 'ANSA, 1 settembre 2026', url: 'https://example.org/notizia' };

function domanda(id: string, sezione: string, difficolta: 'facile' | 'media' | 'difficile') {
  return {
    id,
    sezione,
    difficolta,
    testo: `Domanda ${id}`,
    opzioni: ['A', 'B', 'C', 'D'],
    rispostaCorretta: 1,
    spiegazione: 'Perché sì.',
    fonte,
  };
}

function quizBase(): QuizSettimanale {
  return {
    id: 'quiz-test',
    versione: '1.0.0',
    numero: 1,
    data: '2026-09-09',
    periodo: { dal: '2026-09-02', al: '2026-09-08' },
    titolo: 'Quiz settimanale',
    sottotitolo: 'Settimana 1',
    descrizione: 'Descrizione',
    autori: ['Redazione'],
    changelog: [{ versione: '1.0.0', data: '2026-09-09', note: 'Prima pubblicazione.' }],
    sezioni: [
      { id: 'italia', titolo: 'Italia', icona: '🇮🇹' },
      { id: 'estero', titolo: 'Estero', icona: '🌍' },
    ],
    domande: [
      domanda('q1', 'italia', 'facile'),
      domanda('q2', 'italia', 'media'),
      domanda('q3', 'italia', 'media'),
      domanda('q4', 'italia', 'difficile'),
      domanda('q5', 'estero', 'facile'),
      domanda('q6', 'estero', 'media'),
      domanda('q7', 'estero', 'difficile'),
    ],
  };
}

describe('validaQuiz', () => {
  it('non produce errori su un quiz ben formato', () => {
    expect(validaQuiz(quizBase())).toEqual([]);
  });

  it('segnala una domanda senza fonte', () => {
    const quiz = quizBase();
    quiz.domande[0].fonte = { tipo: 'stampa', citazione: '', url: '' };
    expect(validaQuiz(quiz).some((e) => e.regola === 'fonte-obbligatoria')).toBe(true);
  });

  it('segnala una fonte con URL non http', () => {
    const quiz = quizBase();
    quiz.domande[0].fonte = { tipo: 'stampa', citazione: 'x', url: 'archivio cartaceo' };
    expect(validaQuiz(quiz).some((e) => e.regola === 'fonte-obbligatoria')).toBe(true);
  });

  it('segnala una distribuzione di difficoltà diversa da 2/3/2', () => {
    const quiz = quizBase();
    quiz.domande[0].difficolta = 'media';
    const errori = validaQuiz(quiz).filter((e) => e.regola === 'distribuzione-difficolta');
    expect(errori).toHaveLength(2);
  });

  it('segnala una sezione non dichiarata e una dichiarata ma vuota', () => {
    const quiz = quizBase();
    quiz.domande[4].sezione = 'europa';
    quiz.domande[5].sezione = 'europa';
    quiz.domande[6].sezione = 'europa';
    const messaggi = validaQuiz(quiz).map((e) => e.messaggio);
    expect(messaggi.some((m) => m.includes('"europa" non dichiarata'))).toBe(true);
    expect(messaggi.some((m) => m.includes('"estero" dichiarata ma senza domande'))).toBe(true);
  });

  it('segnala un indice di risposta corretta fuori intervallo e opzioni duplicate', () => {
    const quiz = quizBase();
    quiz.domande[0].rispostaCorretta = 4;
    quiz.domande[1].opzioni = ['A', 'A', 'B'];
    const errori = validaQuiz(quiz).filter((e) => e.regola === 'domande');
    expect(errori.map((e) => e.affermazioneId)).toEqual(['q1', 'q2']);
  });

  it('segnala metadati mancanti', () => {
    const quiz = quizBase();
    quiz.numero = 0;
    quiz.changelog = [];
    quiz.periodo = { dal: '2026-09-09', al: '2026-09-02' };
    const errori = validaQuiz(quiz).filter((e) => e.regola === 'metadati-obbligatori');
    expect(errori).toHaveLength(3);
  });
});

describe('conteggi e riepilogo', () => {
  it('conta le domande per difficoltà e per sezione', () => {
    const quiz = quizBase();
    expect(contaPerDifficolta(quiz.domande)).toEqual({ facile: 2, media: 3, difficile: 2 });
    expect(contaPerSezione(quiz.domande)).toEqual({ italia: 4, estero: 3 });
  });

  it('riepiloga le risposte per sezione e difficoltà', () => {
    const quiz = quizBase();
    const risposte = quiz.domande.map((d, i) => ({
      domandaId: d.id,
      rispostaSelezionata: i % 2 === 0 ? 1 : 0,
      corretta: i % 2 === 0,
    }));
    const riepilogo = riepilogaQuiz(quiz, risposte);
    expect(riepilogo.corrette).toBe(4);
    expect(riepilogo.totale).toBe(7);
    expect(riepilogo.percentuale).toBe(57);
    expect(riepilogo.perSezione).toEqual([
      { id: 'italia', corrette: 2, totale: 4 },
      { id: 'estero', corrette: 2, totale: 3 },
    ]);
    expect(riepilogo.perDifficolta).toEqual([
      { id: 'facile', corrette: 2, totale: 2 },
      { id: 'media', corrette: 1, totale: 3 },
      { id: 'difficile', corrette: 1, totale: 2 },
    ]);
  });

  it('tratta le domande senza risposta come sbagliate', () => {
    const quiz = quizBase();
    const riepilogo = riepilogaQuiz(quiz, []);
    expect(riepilogo.corrette).toBe(0);
    expect(riepilogo.percentuale).toBe(0);
  });
});

describe('mescolaIndici', () => {
  it('restituisce una permutazione completa', () => {
    const indici = mescolaIndici(4);
    expect([...indici].sort()).toEqual([0, 1, 2, 3]);
  });

  it('è riproducibile con una sorgente casuale iniettata', () => {
    let n = 0;
    const casuale = () => {
      n = (n * 9301 + 49297) % 233280;
      return n / 233280;
    };
    expect(mescolaIndici(4, casuale)).toEqual(mescolaIndici(4, (() => { let m = 0; return () => { m = (m * 9301 + 49297) % 233280; return m / 233280; }; })()));
  });

  it('lascia invariato l\'ordine con una sorgente che restituisce sempre 0.99', () => {
    expect(mescolaIndici(4, () => 0.99)).toEqual([0, 1, 2, 3]);
  });
});

describe('content pack dei quiz pubblicati', () => {
  const pubblicati = [quizSettimana01, quizSettimana02, quizSettimana03] as unknown as QuizSettimanale[];

  it.each(pubblicati.map((q) => [q.id, q] as const))('%s passa tutte le regole di validaQuiz', (_, quiz) => {
    expect(validaQuiz(quiz)).toEqual([]);
  });

  it.each(pubblicati.map((q) => [q.id, q] as const))('%s ha quattro domande Italia e tre Estero', (_, quiz) => {
    expect(contaPerSezione(quiz.domande)).toEqual({ italia: 4, estero: 3 });
  });

  it('i numeri sono progressivi da 1, senza buchi, e i periodi non si sovrappongono', () => {
    const ordinati = [...pubblicati].sort((a, b) => a.numero - b.numero);
    ordinati.forEach((q, i) => {
      expect(q.numero).toBe(i + 1);
      expect(q.id).toBe(`quiz-settimana-${String(i + 1).padStart(2, '0')}`);
      expect(q.sottotitolo).toBe(`Quiz ${i + 1}`);
      if (i > 0) expect(q.periodo.dal > ordinati[i - 1].periodo.al).toBe(true);
    });
  });

  it('ogni periodo copre esattamente sette giorni', () => {
    for (const q of pubblicati) {
      const giorni = (Date.parse(q.periodo.al) - Date.parse(q.periodo.dal)) / 86_400_000 + 1;
      expect(giorni).toBe(7);
    }
  });
});
