import type { CapacitorConfig } from '@capacitor/cli';

/**
 * App iOS e Android di Politicare. Il contenuto è l'esportazione statica di Next
 * (`npm run build:app` -> cartella out/); vedi docs/APP.md.
 */
const config: CapacitorConfig = {
  // Identificativo negli store: una volta pubblicata l'app non si può più cambiare.
  appId: 'it.politicare.app',
  appName: 'Politicare',
  webDir: 'out',
  backgroundColor: '#0a0a0a',
  ios: {
    // Il layout gestisce da sé le aree sicure con env(safe-area-inset-*).
    contentInset: 'never',
  },
  plugins: {
    StatusBar: {
      // Testo chiaro: lo sfondo dell'app è scuro.
      style: 'DARK',
      backgroundColor: '#0a0a0a',
    },
  },
};

export default config;
