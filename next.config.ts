import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sul nostro server (servizi/redazione) l'app gira da sola con `node server.js`.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  transpilePackages: ['@politicare/motore'],
};

export default nextConfig;
