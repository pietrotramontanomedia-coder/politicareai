const FUSO = 'Europe/Rome';

/** "9 set 2026, 16:10" */
export function formattaDataPrecisa(iso: string): string {
  return new Date(iso)
    .toLocaleString('it-IT', {
      timeZone: FUSO,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(',', ',');
}

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

export function soloData(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { timeZone: FUSO, day: 'numeric', month: 'short' });
}

export function soloOra(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
}
