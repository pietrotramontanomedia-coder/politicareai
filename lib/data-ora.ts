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

/** "16:10", nel fuso di Roma. */
export function formattaOra(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
}

function giornoLocale(d: Date): number {
  const [anno, mese, giorno] = d
    .toLocaleDateString('en-CA', { timeZone: FUSO })
    .split('-')
    .map(Number);
  return Date.UTC(anno, mese - 1, giorno) / 86_400_000;
}

function annoLocale(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: FUSO }).slice(0, 4);
}

/** Oggi → "16:10"; ieri → "Ieri"; due giorni fa → "L'altro ieri"; altrimenti "6 set" (con anno se diverso). */
export function formattaDataRelativa(iso: string, adesso: Date = new Date()): string {
  const d = new Date(iso);
  const differenza = giornoLocale(adesso) - giornoLocale(d);

  if (differenza === 0) return formattaOra(iso);
  if (differenza === 1) return 'Ieri';
  if (differenza === 2) return "L'altro ieri";

  return d.toLocaleDateString('it-IT', {
    timeZone: FUSO,
    day: 'numeric',
    month: 'short',
    ...(annoLocale(d) === annoLocale(adesso) ? {} : { year: 'numeric' }),
  });
}

/** "Oggi", "Ieri", altrimenti "domenica 6 settembre" (con l'anno se diverso). */
export function etichettaGiorno(iso: string, adesso: Date = new Date()): string {
  const d = new Date(iso);
  const differenza = giornoLocale(adesso) - giornoLocale(d);
  if (differenza === 0) return 'Oggi';
  if (differenza === 1) return 'Ieri';
  return d.toLocaleDateString('it-IT', {
    timeZone: FUSO,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(annoLocale(d) === annoLocale(adesso) ? {} : { year: 'numeric' }),
  });
}

/** Raggruppa per giorno (fuso di Roma) voci già ordinate dalla più recente. */
export function raggruppaPerGiorno<T extends { orario: string }>(
  voci: T[],
  adesso: Date = new Date(),
): { etichetta: string; voci: T[] }[] {
  const gruppi: { chiave: number; etichetta: string; voci: T[] }[] = [];
  for (const voce of voci) {
    const chiave = giornoLocale(new Date(voce.orario));
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.chiave === chiave) ultimo.voci.push(voce);
    else gruppi.push({ chiave, etichetta: etichettaGiorno(voce.orario, adesso), voci: [voce] });
  }
  return gruppi.map(({ etichetta, voci: v }) => ({ etichetta, voci: v }));
}
