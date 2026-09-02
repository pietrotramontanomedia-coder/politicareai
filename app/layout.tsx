import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Politicare — Educazione politica interattiva',
  description:
    'Scopri con quale partito sei più allineato, esplora i temi del referendum e mettiti alla prova con il quiz settimanale. Calcolo sul tuo dispositivo, nessun dato inviato.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
