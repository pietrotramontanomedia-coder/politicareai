interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: { fontSize: '1.25rem', dot: '0.16em', gap: '0.02em' },
  md: { fontSize: '1.75rem', dot: '0.16em', gap: '0.02em' },
  lg: { fontSize: '2.75rem', dot: '0.15em', gap: '0.02em' },
  xl: { fontSize: '4rem', dot: '0.15em', gap: '0.02em' },
};

export default function Logo({ size = 'lg', className = '' }: LogoProps) {
  const { fontSize, dot } = SIZES[size];

  return (
    <div
      className={`inline-flex items-baseline select-none ${className}`}
      style={{
        fontFamily: 'var(--font-google-sans), "Google Sans", sans-serif',
        fontWeight: 700,
        fontSize,
        color: '#ffffff',
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}
    >
      {/* P con quadratino giallo alla base */}
      <span style={{ position: 'relative', display: 'inline-block' }}>
        P
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '0.08em',
            bottom: '-0.02em',
            width: dot,
            height: dot,
            background: '#FEDC01',
            borderRadius: '15%',
          }}
        />
      </span>
      <span>o</span>
      <span>l</span>
      {/* i senza puntino + quadratino giallo */}
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span style={{ visibility: 'hidden' }}>i</span>
        <span style={{ position: 'absolute', left: 0, bottom: 0 }}>ı</span>
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '-0.02em',
            transform: 'translateX(-50%)',
            width: dot,
            height: dot,
            background: '#FEDC01',
            borderRadius: '15%',
          }}
        />
      </span>
      <span>t</span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span style={{ visibility: 'hidden' }}>i</span>
        <span style={{ position: 'absolute', left: 0, bottom: 0 }}>ı</span>
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '-0.02em',
            transform: 'translateX(-50%)',
            width: dot,
            height: dot,
            background: '#FEDC01',
            borderRadius: '15%',
          }}
        />
      </span>
      <span>care</span>
    </div>
  );
}
