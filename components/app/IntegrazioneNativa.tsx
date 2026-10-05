'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IN_APP, SCHEMA_APP } from '@/lib/piattaforma';

/**
 * Solo app: ascolta i link con cui il sistema riapre Politicare
 * (it.politicare.app://accedi?code=... al ritorno dal link via email o da Google),
 * completa l'accesso e porta alla pagina di accesso. Sul web non fa nulla.
 */
export default function IntegrazioneNativa() {
  const router = useRouter();

  useEffect(() => {
    if (!IN_APP) return;
    let smetti: (() => void) | undefined;
    let attivo = true;

    void (async () => {
      const [{ suLinkApertura, chiudiBrowser }, { FORNITORE_ACCESSO }] = await Promise.all([
        import('@/lib/nativo'),
        import('@/lib/profilo/accesso'),
      ]);
      const stop = await suLinkApertura(async (url) => {
        if (!url.startsWith(`${SCHEMA_APP}://accedi`)) return;
        await chiudiBrowser();
        const errore = await FORNITORE_ACCESSO.completaDaLink(url);
        router.push(errore ? `/accedi/?error=${encodeURIComponent(errore)}` : '/accedi/');
      });
      if (attivo) smetti = stop;
      else stop();
    })();

    return () => {
      attivo = false;
      smetti?.();
    };
  }, [router]);

  return null;
}
