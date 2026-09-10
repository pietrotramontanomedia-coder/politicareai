import { describe, expect, it } from 'vitest';
import { formattaData, formattaPeriodo } from '../lib/quiz';

describe('formattaPeriodo', () => {
  it('compatta mese e anno quando coincidono', () => {
    expect(formattaPeriodo('2026-08-19', '2026-08-25')).toBe('dal 19 al 25 agosto 2026');
  });

  it('ripete il mese quando l\'intervallo lo attraversa e usa 1° per il primo del mese', () => {
    expect(formattaPeriodo('2026-08-26', '2026-09-01')).toBe('dal 26 agosto al 1° settembre 2026');
  });

  it('elide la preposizione davanti a 8 e 11', () => {
    expect(formattaPeriodo('2026-09-02', '2026-09-08')).toBe("dal 2 all'8 settembre 2026");
    expect(formattaPeriodo('2026-09-11', '2026-09-17')).toBe("dall'11 al 17 settembre 2026");
  });

  it('esplicita entrambi gli anni a cavallo di Capodanno', () => {
    expect(formattaPeriodo('2026-12-30', '2027-01-05')).toBe('dal 30 dicembre 2026 al 5 gennaio 2027');
  });
});

describe('formattaData', () => {
  it('scrive la data in italiano', () => {
    expect(formattaData('2026-09-01')).toBe('1° settembre 2026');
    expect(formattaData('2026-09-09')).toBe('9 settembre 2026');
  });
});
