import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import './globals.css';

const googleSans = localFont({
  src: [
    { path: '../public/fonts/Google-Sans-400.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/Google-Sans-400-Italic.ttf', weight: '400', style: 'italic' },
    { path: '../public/fonts/Google-Sans-500.ttf', weight: '500', style: 'normal' },
    { path: '../public/fonts/Google-Sans-500-Italic.ttf', weight: '500', style: 'italic' },
    { path: '../public/fonts/Google-Sans-600.ttf', weight: '600', style: 'normal' },
    { path: '../public/fonts/Google-Sans-600-Italic.ttf', weight: '600', style: 'italic' },
    { path: '../public/fonts/Google-Sans-700.ttf', weight: '700', style: 'normal' },
    { path: '../public/fonts/Google-Sans-700-Italic.ttf', weight: '700', style: 'italic' },
  ],
  variable: '--font-google-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Politicare — Educazione politica interattiva',
  description:
    'Scopri con quale partito sei più allineato, esplora i temi del referendum e mettiti alla prova con il quiz settimanale. Calcolo sul tuo dispositivo, nessun dato inviato.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={googleSans.variable}>
      <body className="min-h-dvh antialiased">
        <Header />
        <div className="pb-16 sm:pb-0">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
