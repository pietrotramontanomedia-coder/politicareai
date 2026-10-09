import { conAlfa } from '@/lib/strumenti';
import { TESTI_REDAZIONE as T } from '@/lib/redazione/testi';
import type { Ruolo, StatoContenuto, TipoCommento } from '@/lib/redazione/tipi';

function Pillola({ colore, children, piccola = false }: { colore: string; children: React.ReactNode; piccola?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ${piccola ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ background: conAlfa(colore, 0.16), color: colore, boxShadow: `inset 0 0 0 1px ${conAlfa(colore, 0.35)}` }}
    >
      {children}
    </span>
  );
}

export function BadgeStato({ stato, piccola }: { stato: StatoContenuto; piccola?: boolean }) {
  return (
    <Pillola colore={T.coloreStato[stato]} piccola={piccola}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.coloreStato[stato] }} aria-hidden />
      {T.stato[stato]}
    </Pillola>
  );
}

export function BadgeCommento({ tipo }: { tipo: TipoCommento }) {
  return (
    <Pillola colore={T.coloreCommento[tipo]} piccola>
      {T.tipoCommento[tipo]}
    </Pillola>
  );
}

export function BadgeRuolo({ ruolo }: { ruolo: Ruolo }) {
  return (
    <Pillola colore={ruolo === 'revisore' ? '#FEDC01' : '#A3A3A3'} piccola>
      {T.ruolo[ruolo]}
    </Pillola>
  );
}
