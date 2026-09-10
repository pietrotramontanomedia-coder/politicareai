import { datiSincronizzabili, normalizzaProfilo } from './regole';
import type { Profilo } from './tipi';

/** Dove vive il profilo: sul dispositivo (ospite) o sull'account (dopo il login). */
export interface ArchivioProfilo {
  readonly dove: 'dispositivo' | 'account';
  leggi(): Promise<Profilo | null>;
  salva(profilo: Profilo): Promise<void>;
  cancella(): Promise<void>;
}

const CHIAVE = 'politicare:profilo:v1';

/** Profilo dell'ospite, in localStorage. Salva solo i campi ammessi dal profilo. */
export const archivioDispositivo: ArchivioProfilo = {
  dove: 'dispositivo',
  async leggi() {
    try {
      return normalizzaProfilo(JSON.parse(localStorage.getItem(CHIAVE) ?? 'null'));
    } catch {
      return null;
    }
  },
  async salva(profilo) {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(datiSincronizzabili(profilo)));
    } catch {
      // Storage pieno o bloccato: il profilo resta valido per questa sessione.
    }
  },
  async cancella() {
    try {
      localStorage.removeItem(CHIAVE);
    } catch {
      // Niente da cancellare.
    }
  },
};
