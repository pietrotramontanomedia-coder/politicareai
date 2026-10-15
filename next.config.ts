import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sul nostro server (servizi/redazione) l'app gira da sola con `node server.js`.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  transpilePackages: ['@politicare/motore'],
  // Il portale della redazione sta sul nostro server: chi apre il vecchio indirizzo su Vercel ci arriva da solo.
  async redirects() {
    if (process.env.VERCEL !== '1') return [];
    return [{ source: '/redazione', destination: 'https://redazione.politicare.it/redazione', permanent: false }];
  },
};

export default nextConfig;
