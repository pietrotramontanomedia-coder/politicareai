import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Politicare — Educazione politica interattiva',
  description:
    'Scopri con quale partito sei più allineato, esplora i temi del referendum e mettiti alla prova con il quiz settimanale. Calcolo sul tuo dispositivo, nessun dato inviato.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={poppins.variable}>
      <body className="min-h-dvh antialiased">
        <Header />
        <div className="pb-16 sm:pb-0">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
