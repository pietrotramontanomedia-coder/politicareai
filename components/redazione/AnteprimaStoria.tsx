import Avatar from '@/components/profilo/Avatar';
import { coloreDaNome } from '@/lib/redazione/client';
import { chiaveNome } from '@/lib/redazione/regole';

/** Una storia in formato 9:16: l'immagine fatta col generatore, com'è nell'app. */
export default function AnteprimaStoria({
  immagine,
  autore,
  quando,
  piccola = false,
  sopra,
  className = '',
}: {
  immagine: string | null;
  autore?: string;
  quando?: string;
  /** Miniatura per la griglia: niente intestazione. */
  piccola?: boolean;
  /** Barre di avanzamento del visore. */
  sopra?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-black ${piccola ? '' : 'rounded-2xl'} ${className}`} style={{ aspectRatio: '9 / 16' }}>
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
    </div>
  );
}
