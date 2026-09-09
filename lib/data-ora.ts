const FUSO = 'Europe/Rome';

/** "9 settembre 2026, ore 16:10" */
export function formattaDataEstesa(iso: string): string {
  const d = new Date(iso);
  const giorno = d.toLocaleDateString('it-IT', {
    timeZone: FUSO,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const ora = d.toLocaleTimeString('it-IT', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
  return `${giorno}, ore ${ora}`;
}

function giornoLocale(d: Date): number {
  const [anno, mese, giorno] = d
    .toLocaleDateString('en-CA', { timeZone: FUSO })
    .split('-')
    .map(Number);
  return Date.UTC(anno, mese - 1, giorno) / 86_400_000;
}

/** Oggi → "16:10"; ieri → "Ieri"; due giorni fa → "L'altro ieri"; altrimenti "6 set" (con anno se diverso). */
export function formattaDataRelativa(iso: string): string {
  const d = new Date(iso);
  const oggi = new Date();
  const differenza = giornoLocale(oggi) - giornoLocale(d);

  if (differenza === 0) {
    return d.toLocaleTimeString('it-IT', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
  }
  if (differenza === 1) return 'Ieri';
  if (differenza === 2) return "L'altro ieri";

  const stessoAnno = d.toLocaleDateString('en-CA', { timeZone: FUSO }).slice(0, 4) ===
    oggi.toLocaleDateString('en-CA', { timeZone: FUSO }).slice(0, 4);
  return d.toLocaleDateString('it-IT', {
    timeZone: FUSO,
    day: 'numeric',
    month: 'short',
    ...(stessoAnno ? {} : { year: 'numeric' }),
  });
}
