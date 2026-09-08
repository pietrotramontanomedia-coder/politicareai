import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const ASPECT_RATIO = 3360 / 1890;

const ALTEZZE: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 52,
  md: 32,
  lg: 56,
  xl: 90,
};

export default function Logo({ size = 'lg', className = '' }: LogoProps) {
  const altezza = ALTEZZE[size];
  const larghezza = Math.round(altezza * ASPECT_RATIO);

  return (
    <Image
      src="/logo-politicare.png"
      alt="Politicare"
      width={larghezza}
      height={altezza}
      priority
      className={className}
      style={{ height: altezza, width: larghezza, objectFit: 'contain' }}
    />
  );
}
