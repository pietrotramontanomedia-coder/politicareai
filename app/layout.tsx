import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import './globals.css';

const googleSans = localFont({
  src: [
    { path: '../public/fonts/Google-Sans-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/Google-Sans-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/Google-Sans-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/Google-Sans-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-google-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Politicare — Educazione politica interattiva',
  description:
    'Scopri con quale partito sei più allineato, esplora i temi del referendum e mettiti alla prova con il quiz settimanale. Calcolo sul tuo dispositivo, nessun dato inviato.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Politicare',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={googleSans.variable}>
      <body className="min-h-dvh antialiased">
        <ServiceWorkerRegistration />
        <Header />
        <div style={{ paddingBottom: 'var(--spazio-barra)' }}>{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
