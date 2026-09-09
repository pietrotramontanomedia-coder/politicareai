'use client';

import Image from 'next/image';

interface LogoPartito {
  nome: string;
  className?: string;
}

const mappaLoghi: Record<string, string> = {
  'Fratelli d\'Italia': '/loghi-partiti/fdi.png',
  'Partito Democratico': '/loghi-partiti/pd.png',
  'Movimento 5 Stelle': '/loghi-partiti/m5s.png',
  'Lega': '/loghi-partiti/lega.png',
  'Alleanza Verdi e Sinistra': '/loghi-partiti/avs.png',
  'Forza Italia': '/loghi-partiti/fi.png',
  'Azione': '/loghi-partiti/azione.png',
  'Italia Viva': '/loghi-partiti/iv.png',
  '+Europa': '/loghi-partiti/piueuropa.png',
  'Noi Moderati': '/loghi-partiti/noimoderati.png',
};

export function LogoPartito({ nome, className = 'w-10 h-10' }: LogoPartito) {
  const src = mappaLoghi[nome];

  if (!src) {
    return <div className={`${className} bg-gray-600 rounded-lg flex items-center justify-center text-xs font-bold`} />;
  }

  return (
    <Image
      src={src}
      alt={`Logo ${nome}`}
      width={40}
      height={40}
      className={`${className} object-contain rounded`}
      priority
    />
  );
}
