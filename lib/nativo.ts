/**
 * Funzioni native dell'app (Capacitor). Si chiamano solo quando IN_APP è true:
 * i plugin sono importati al momento, così il sito web non li carica.
 *
 * Perché servono: nella webview Android non esistono né la condivisione web
 * (navigator.share) né lo scaricamento di un'immagine generata al volo, e Google
 * non permette l'accesso dentro una webview.
 */

function base64Da(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lettore = new FileReader();
    lettore.onerror = () => reject(lettore.error);
    lettore.onload = () => resolve(String(lettore.result).split(',')[1] ?? '');
    lettore.readAsDataURL(blob);
  });
}

/** Foglio di condivisione del telefono per un link. Annullare non è un errore. */
export async function condividiLink(titolo: string, url: string, testo?: string): Promise<void> {
  const { Share } = await import('@capacitor/share');
  try {
    await Share.share({ title: titolo, text: testo, url, dialogTitle: titolo });
  } catch {
    // Condivisione annullata dall'utente.
  }
}

/**
 * Condivide un'immagine generata sul dispositivo: la scrive nella cache dell'app e
 * passa il file al foglio di condivisione (da lì si può anche salvare in Foto/Galleria).
 */
export async function condividiImmagine(file: Blob, nomeFile: string, titolo: string, testo: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
  const { uri } = await Filesystem.writeFile({ path: nomeFile, data: await base64Da(file), directory: Directory.Cache });
  try {
    await Share.share({ title: titolo, text: testo, files: [uri], dialogTitle: titolo });
  } catch {
    // Condivisione annullata dall'utente.
  }
}

/** Apre un indirizzo nel browser di sistema dentro l'app (SFSafariViewController, Custom Tabs). */
export async function apriNelBrowser(url: string): Promise<void> {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover' });
}

export async function chiudiBrowser(): Promise<void> {
  const { Browser } = await import('@capacitor/browser');
  try {
    await Browser.close();
  } catch {
    // Su Android il browser può essere già chiuso: niente da fare.
  }
}

/** Avvisa quando il sistema apre l'app con un link it.politicare.app://... Restituisce la funzione per smettere. */
export async function suLinkApertura(callback: (url: string) => void): Promise<() => void> {
  const { App } = await import('@capacitor/app');
  const ascolto = await App.addListener('appUrlOpen', ({ url }) => callback(url));
  return () => void ascolto.remove();
}
