import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Test della app (lib/, components/): quelli del motore vivono in packages/motore.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
