/** Mappa un punteggio in [0, 1] su uno dei 5 toni della scala di accordo. */
export function coloreAccordo(punteggio: number): string {
  if (punteggio >= 0.8) return 'var(--color-accordo-5)';
  if (punteggio >= 0.6) return 'var(--color-accordo-4)';
  if (punteggio >= 0.4) return 'var(--color-accordo-3)';
  if (punteggio >= 0.2) return 'var(--color-accordo-2)';
  return 'var(--color-accordo-1)';
}
