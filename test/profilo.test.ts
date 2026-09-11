import { describe, expect, it } from 'vitest';
import { calcolaClassifica } from '@politicare/motore';
import type { Risposta, TestPartitoPack } from '@politicare/motore';
import packJson from '@/content/test-partito/politiche-2027.v1.json';
import { AccessoNonAttivo, FORNITORE_ACCESSO, fornitoreNonConfigurato } from '@/lib/profilo/accesso';
import { aRigaProfilo, aRigheQuiz, daRighe } from '@/lib/profilo/accesso-supabase';
import {
  alternaTema,
  annoNascitaValido,
  etaDa,
  impostaAnagrafica,
  datiSincronizzabili,
  esportaDati,
  impostaGiocatori,
  iniziali,
  normalizzaProfilo,
  profiloVuoto,
  registraQuiz,
  serieMassima,
  serieQuiz,
  statisticheQuiz,
  traguardi,
  unisciProfili,
} from '@/lib/profilo/regole';
import { creaRisultatoTest } from '@/lib/profilo/risultato-test-locale';

const ADESSO = new Date('2026-09-10T20:00:00Z');
const esito = (numero: number, percentuale: number) => ({ numero, percentuale, corrette: Math.round((percentuale / 100) * 7), totale: 7 });

function conQuiz(...voci: [number, number][]) {
  return voci.reduce((p, [n, pct]) => registraQuiz(p, esito(n, pct), ADESSO), profiloVuoto(ADESSO));
}

describe('storico dei quiz', () => {
  it('tiene il primo tentativo e aggiorna tentativi e miglior punteggio', () => {
    let p = registraQuiz(profiloVuoto(ADESSO), esito(3, 43), ADESSO);
    p = registraQuiz(p, esito(3, 86), ADESSO);
    p = registraQuiz(p, esito(3, 57), ADESSO);
    expect(p.storicoQuiz).toHaveLength(1);
    expect(p.storicoQuiz[0]).toMatchObject({ numero: 3, percentuale: 43, migliorePercentuale: 86, tentativi: 3 });
  });

  it('ordina dal quiz più recente', () => {
    expect(conQuiz([1, 50], [3, 70], [2, 60]).storicoQuiz.map((q) => q.numero)).toEqual([3, 2, 1]);
  });

  it('conta le settimane di fila senza spezzare la serie nella settimana ancora aperta', () => {
    expect(serieQuiz(conQuiz([1, 50], [2, 50], [3, 50]).storicoQuiz, 3)).toBe(3);
    expect(serieQuiz(conQuiz([1, 50], [2, 50]).storicoQuiz, 3)).toBe(2);
    expect(serieQuiz(conQuiz([1, 50], [3, 50]).storicoQuiz, 3)).toBe(1);
    expect(serieQuiz(conQuiz([1, 50]).storicoQuiz, 3)).toBe(0);
    expect(serieMassima(conQuiz([1, 50], [2, 50], [3, 50], [5, 50]).storicoQuiz)).toBe(3);
  });

  it('calcola statistiche e traguardi solo dai quiz', () => {
    const storico = conQuiz([1, 100], [2, 71], [3, 71]).storicoQuiz;
    expect(statisticheQuiz(storico)).toEqual({ completati: 3, media: 81, migliore: 100 });
    const ottenuti = traguardi(storico).filter((t) => t.ottenuto).map((t) => t.id);
    expect(ottenuti).toEqual(['primo-quiz', 'tre-di-fila', 'en-plein', 'esperto']);
  });
});

describe('preferenze del profilo', () => {
  it('iniziali, temi e giocatori senza doppioni', () => {
    expect(iniziali('Pietro Tramontano')).toBe('PT');
    let p = alternaTema(profiloVuoto(ADESSO), 'fisco', ADESSO);
    expect(p.temiSeguiti).toEqual(['fisco']);
    p = alternaTema(p, 'fisco', ADESSO);
    expect(p.temiSeguiti).toEqual([]);
    expect(impostaGiocatori(p, [' Anna ', 'anna', '', 'Bruno'], ADESSO).giocatori).toEqual(['Anna', 'Bruno']);
  });
});

describe('anno di nascita e città', () => {
  it("calcola l'età dall'anno e rifiuta anni impossibili", () => {
    expect(etaDa(1990, ADESSO)).toBe(36);
    expect(etaDa(null, ADESSO)).toBeNull();
    expect(annoNascitaValido(1899, ADESSO)).toBe(false);
    expect(annoNascitaValido(2027, ADESSO)).toBe(false);
    expect(annoNascitaValido(2026, ADESSO)).toBe(true);
  });

  it('sono facoltativi: un valore non valido svuota il campo, la città viene ripulita', () => {
    const p = impostaAnagrafica(profiloVuoto(ADESSO), { annoNascita: 1990, citta: '  Reggio   Calabria ' }, ADESSO);
    expect(p).toMatchObject({ annoNascita: 1990, citta: 'Reggio Calabria' });
    expect(impostaAnagrafica(p, { annoNascita: 3000 }, ADESSO).annoNascita).toBeNull();
    expect(impostaAnagrafica(p, { citta: '' }, ADESSO).citta).toBe('');
  });

  it('al primo accesso i dati del dispositivo riempiono i campi vuoti dell’account', () => {
    const dispositivo = impostaAnagrafica(profiloVuoto(ADESSO), { annoNascita: 1990, citta: 'Messina' }, ADESSO);
    const unito = unisciProfili(dispositivo, profiloVuoto(ADESSO), ADESSO);
    expect(unito).toMatchObject({ annoNascita: 1990, citta: 'Messina' });
  });
});

describe('profilo sulle tabelle Supabase', () => {
  it('va e torna dal database senza perdere nulla', () => {
    const partenza = impostaAnagrafica(
      registraQuiz(alternaTema({ ...profiloVuoto(ADESSO), nome: 'Pietro' }, 'esteri', ADESSO), esito(3, 86), ADESSO),
      { annoNascita: 1990, citta: 'Messina' },
      ADESSO,
    );
    const tornato = daRighe(aRigaProfilo('utente-1', partenza), aRigheQuiz('utente-1', partenza));
    expect(tornato).toEqual(partenza);
  });

  it('nelle righe finiscono solo le colonne previste: niente test partiti', () => {
    const riga = aRigaProfilo('utente-1', { ...profiloVuoto(ADESSO), nome: 'Pietro' });
    expect(Object.keys(riga).sort()).toEqual([
      'aggiornato_il',
      'anno_nascita',
      'citta',
      'colore',
      'creato_il',
      'giocatori',
      'id',
      'nome',
      'temi_seguiti',
    ]);
  });
});

describe('confine dei dati', () => {
  it('un profilo letto da uno storage tiene solo i campi ammessi', () => {
    const manomesso = { ...conQuiz([2, 57]), risultatoTest: { righe: [] }, risposte: { 'fisco-flat-tax': 2 } };
    const pulito = normalizzaProfilo(manomesso)!;
    expect(Object.keys(pulito).sort()).toEqual([
      'aggiornatoIl',
      'annoNascita',
      'citta',
      'colore',
      'creatoIl',
      'giocatori',
      'nome',
      'storicoQuiz',
      'temiSeguiti',
      'versione',
    ]);
    expect(JSON.stringify(datiSincronizzabili(manomesso as never))).not.toMatch(/risultatoTest|risposte|flat-tax/);
    expect(normalizzaProfilo('spazzatura')).toBeNull();
  });

  it('il risultato del test salvato sul dispositivo contiene la classifica, non le risposte', () => {
    const pack = packJson as unknown as TestPartitoPack;
    const risposte: Risposta[] = pack.affermazioni.map((a) => ({ affermazioneId: a.id, valore: 1, importante: false }));
    const classifica = calcolaClassifica(risposte, pack.partiti, { affermazioni: pack.affermazioni });
    const risultato = creaRisultatoTest(pack, classifica, risposte.length, ADESSO);
    expect(risultato.righe.length + risultato.esclusi.length).toBe(pack.partiti.length);
    expect(JSON.stringify(risultato)).not.toContain('affermazioneId');
  });

  it("l'esportazione separa il profilo da ciò che resta solo sul dispositivo", () => {
    const dati = JSON.parse(esportaDati(conQuiz([3, 86]), null, ADESSO));
    expect(Object.keys(dati)).toEqual(['esportatoIl', 'profilo', 'soloSuQuestoDispositivo']);
    expect(dati.profilo.storicoQuiz[0].numero).toBe(3);
  });
});

describe('primo accesso', () => {
  it('unisce dispositivo e account senza perdere quiz né contare due volte il primo tentativo', () => {
    const dispositivo = { ...conQuiz([2, 57], [3, 86]), nome: 'Pietro' };
    const account = registraQuiz(profiloVuoto(new Date('2026-09-01T00:00:00Z')), esito(2, 43), new Date('2026-09-01T00:00:00Z'));
    const unito = unisciProfili(dispositivo, account, ADESSO);
    expect(unito.nome).toBe('Pietro');
    expect(unito.storicoQuiz.map((q) => q.numero)).toEqual([3, 2]);
    expect(unito.storicoQuiz[1]).toMatchObject({ percentuale: 43, migliorePercentuale: 57, tentativi: 2 });
  });
});

describe('accesso', () => {
  it('finché il servizio di login non è collegato resta disattivo e non finge di funzionare', async () => {
    expect(FORNITORE_ACCESSO.attivo).toBe(false);
    expect(await fornitoreNonConfigurato.sessioneIniziale()).toEqual({ stato: 'ospite' });
    await expect(fornitoreNonConfigurato.inviaLinkEmail('a@b.it')).rejects.toBeInstanceOf(AccessoNonAttivo);
  });
});
