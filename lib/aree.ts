/** Etichette e icone per le aree tematiche, usate solo per la presentazione. */
export const ETICHETTE_AREA: Record<string, { label: string; icona: string }> = {
  fisco: { label: 'Fisco', icona: '💰' },
  ambiente: { label: 'Ambiente', icona: '🌍' },
  lavoro: { label: 'Lavoro', icona: '💼' },
  immigrazione: { label: 'Immigrazione', icona: '✈️' },
  sanita: { label: 'Sanità', icona: '💊' },
  europa: { label: 'Europa', icona: '🇪🇺' },
};

export function etichettaArea(area: string): { label: string; icona: string } {
  return ETICHETTE_AREA[area] ?? { label: area, icona: '•' };
}
