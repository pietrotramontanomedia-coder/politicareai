'use client';

import Link from 'next/link';
import Logo from './Logo';
import NotificationBell from './NotificationBell';

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        borderColor: 'var(--bordo)',
        background: 'rgba(10,10,10,0.8)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-20 flex items-center justify-between">
        <Link href="/">
          <Logo size="sm" />
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <Link href="/test-partito" className="hover:opacity-70 transition-opacity">
              Test Partiti
            </Link>
            <Link href="/quiz-settimanale" className="hover:opacity-70 transition-opacity">
              Quiz
            </Link>
            <Link href="/metodologia" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--fg-muta)' }}>
              Metodologia
            </Link>
          </nav>

          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
