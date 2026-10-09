import Avatar from '@/components/profilo/Avatar';
import { coloreDaNome } from '@/lib/redazione/client';
import { chiaveNome } from '@/lib/redazione/regole';
import type { Storia } from '@/lib/redazione/tipi';

const ALLINEAMENTO = { alto: 'justify-start pt-[18%]', centro: 'justify-center', basso: 'justify-end pb-[18%]' } as const;

/** Una storia in formato 9:16: foto o colore di sfondo, testo nella posizione scelta. */
export default function AnteprimaStoria({
  storia,
  immagine,
  autore,
  quando,
  piccola = false,
  sopra,
  className = '',
}: {
  storia: Storia;
  immagine: string | null;
  autore?: string;
  quando?: string;
  /** Miniatura per la griglia: testo ridotto, niente intestazione. */
  piccola?: boolean;
  /** Barre di avanzamento del visore. */
  sopra?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${piccola ? '' : 'rounded-2xl'} ${className}`} style={{ aspectRatio: '9 / 16', background: storia.sfondo }}>
      {immagine && (
        // eslint-disable-next-line @next/next/no-img-element -- foto private servite dalle API del portale
        <img src={immagine} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {!piccola && (
        <div className="absolute inset-x-0 top-0 z-10 px-3 pt-3" style={{ background: 'linear-gradient(rgba(0,0,0,0.45), transparent)' }}>
          {sopra}
          {autore && (
            <div className="flex items-center gap-2 py-2 text-white">
              <Avatar nome={autore} colore={coloreDaNome(chiaveNome(autore))} className="h-7 w-7 text-[10px]" />
              <span className="text-sm font-semibold">{autore}</span>
              {quando && <span className="text-xs opacity-75">{quando}</span>}
            </div>
          )}
        </div>
      )}
      {storia.testo && (
        <div className={`absolute inset-0 flex flex-col items-center px-[8%] ${ALLINEAMENTO[storia.posizione]}`}>
          <p
            className={`whitespace-pre-line break-words text-center font-bold leading-snug ${piccola ? 'text-[9px]' : 'text-xl sm:text-2xl'}`}
            style={{
              color: storia.coloreTesto,
              ...(storia.riquadro
                ? { background: 'rgba(0,0,0,0.6)', padding: piccola ? '2px 4px' : '0.4em 0.6em', borderRadius: piccola ? 3 : 10, boxDecorationBreak: 'clone' }
                : { textShadow: immagine ? '0 1px 8px rgba(0,0,0,0.6)' : undefined }),
            }}
          >
            {storia.testo}
          </p>
        </div>
      )}
    </div>
  );
}
