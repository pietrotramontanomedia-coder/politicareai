import type { NextConfig } from 'next';

/**
 * BUILD_TARGET=app produce l'esportazione statica per Capacitor (cartella `out/`).
 * Vedi lib/piattaforma.ts e docs/APP.md.
 *
 * Le pagine solo web si chiamano `page.web.tsx` (dettagli dinamici di notizie e
 * articoli), quelle solo app `page.app.tsx` (gli stessi dettagli letti da query).
 * Nella build app i file `.ts` non sono pagine: restano fuori le route API e il
 * manifest, che vivono solo sul server.
 */
const perApp = process.env.BUILD_TARGET === 'app';

if (perApp && !process.env.NEXT_PUBLIC_SITO_URL) {
  throw new Error(
    "BUILD_TARGET=app richiede NEXT_PUBLIC_SITO_URL, l'indirizzo del sito in produzione che serve le API (es. https://politicare-app.vercel.app).",
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@politicare/motore'],
  pageExtensions: perApp ? ['app.tsx', 'tsx'] : ['web.tsx', 'tsx', 'ts'],
  env: { NEXT_PUBLIC_PIATTAFORMA: perApp ? 'app' : 'web' },
  ...(perApp
    ? {
        output: 'export' as const,
        // Capacitor serve file: /test-partito/ -> test-partito/index.html
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        // L'app chiama le API pubbliche di lettura da un'altra origine
        // (capacitor://localhost su iOS, https://localhost su Android).
        // Solo GET senza credenziali e solo le API di contenuto: radar, telegram e
        // rinnovo del token restano senza CORS.
        async headers() {
          const cors = [
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          ];
          return ['/api/feed', '/api/articolo', '/api/instagram', '/api/ultimora', '/api/ultimora/:id'].map((source) => ({
            source,
            headers: cors,
          }));
        },
      }),
};

export default nextConfig;
