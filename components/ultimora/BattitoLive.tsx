/** Pallino "in diretta" che pulsa; con movimento ridotto resta fermo. */
export default function BattitoLive({ colore = '#ef4444' }: { colore?: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: colore }} />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: colore }} />
    </span>
  );
}
