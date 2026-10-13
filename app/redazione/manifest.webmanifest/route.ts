import type { MetadataRoute } from 'next';

/*
 * Il portale della redazione aggiunto alla schermata Home è un'app a sé: icona verde, per non
 * confonderla con Politicare, e si apre sul portale, non sulla home del sito.
 */

export const dynamic = 'force-static';

const manifest: MetadataRoute.Manifest = {
  id: '/redazione',
  name: 'Redazione Politicare',
  short_name: 'Redazione',
  description: 'Il portale interno della redazione di Politicare.',
  start_url: '/redazione',
  scope: '/redazione',
  display: 'standalone',
  background_color: '#0a0a0a',
  theme_color: '#14532d',
  orientation: 'portrait',
  icons: [
    { src: '/redazione/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/redazione/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/redazione/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export function GET() {
  return Response.json(manifest, { headers: { 'content-type': 'application/manifest+json' } });
}
