# Profilo utente e login

Stato all'11 settembre 2026: **login con Supabase implementato, in attesa delle chiavi del
progetto.** Senza le variabili `NEXT_PUBLIC_SUPABASE_*` l'app resta in modalità ospite, con
il profilo sul dispositivo; appena ci sono, l'accesso si attiva da solo.

## Il confine dei dati (non negoziabile)

| Dato | Dove vive | Può andare sull'account? |
|---|---|---|
| Nome e colore del profilo | `Profilo` | sì |
| Anno di nascita e città (facoltativi) | `Profilo.annoNascita`, `Profilo.citta` | sì |
| Storico dei quiz, serie, traguardi | `Profilo.storicoQuiz` | sì |
| Temi seguiti | `Profilo.temiSeguiti` | sì |
| Gruppo per il gioco | `Profilo.giocatori` | sì |
| Risposte del test partiti | `sessionStorage`, durante il test | **mai** |
| Classifica del test partiti | `lib/profilo/risultato-test-locale.ts`, `localStorage` con chiave propria, solo su richiesta dell'utente | **mai** |
| Simulazioni elettorali | nessuno (solo in memoria) | **mai** |

Le opinioni politiche sono dati particolari (GDPR art. 9) e CLAUDE.md esclude account e
backend per il test partiti. Per questo:

- il tipo `Profilo` non ha campi per il test; `normalizzaProfilo` scarta qualsiasi campo non
  previsto, e `datiSincronizzabili` è l'unica porta verso l'account;
- i traguardi si calcolano solo sui quiz;
- il risultato del test ha un archivio separato che non passa mai da `ArchivioProfilo`;
- `test/profilo.test.ts` verifica questi confini.

## Architettura

```
lib/profilo/
├── tipi.ts                    Profilo, RisultatoQuizSalvato, EsitoQuiz
├── regole.ts                  funzioni pure: storico, serie, traguardi, unione al primo accesso, esportazione
├── archivio.ts                ArchivioProfilo + archivioDispositivo (localStorage)
├── accesso.ts                 FornitoreAccesso + FORNITORE_ACCESSO (Supabase se configurato, altrimenti ospite)
├── accesso-supabase.ts        link via email, Google, lettura/scrittura tabelle, eliminazione account
├── risultato-test-locale.ts   classifica del test, solo dispositivo
└── testi.ts                   testi di profilo e accesso
components/profilo/
├── ProfiloProvider.tsx        contesto React: carica dall'archivio giusto e salva a ogni modifica
├── PaginaProfilo.tsx          /profilo
├── PaginaAccesso.tsx          /accedi (disattivata finché il login non c'è)
├── PulsanteProfilo.tsx        avatar nell'header
├── SalvaRisultatoTest.tsx     salvataggio esplicito del test, solo sul dispositivo
└── Avatar.tsx
```

Agganci nell'app: avatar nell'header, voce nel pannello Strumenti, registrazione automatica
di ogni quiz completato, pulsante "Salva il risultato" nei risultati del test.

## Accendere il login (3 passi, servono le tue credenziali)

1. **Creare il progetto Supabase**, regione *EU Central (Frankfurt)*. In *Authentication →
   Providers* abilitare **Email** (magic link) e **Google**; in *URL Configuration* mettere
   l'indirizzo del sito e `https://politicare-app.vercel.app/accedi` fra i redirect (in locale
   anche `http://localhost:3000/accedi`).
2. **Creare le tabelle**: incollare `supabase/schema.sql` nel SQL editor ed eseguirlo. Crea
   `profili` e `storico_quiz` con row level security (ognuno vede solo i propri dati) e la
   funzione `elimina_account()` per il diritto all'oblio. Nessuna tabella per il test partiti.
3. **Mettere le due chiavi** (Project URL e anon key, da *Project Settings → API*) in Vercel e
   in `.env.local`, come in `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Fatto questo: `/accedi` smette di essere disattivata, al primo accesso il profilo del
dispositivo viene unito a quello dell'account (`unisciProfili`) e la copia locale cancellata.

Restano da fare prima di aprirlo al pubblico: aggiornare l'informativa privacy (titolare,
finalità, base giuridica, conservazione, Supabase come responsabile con DPA) e decidere la
gestione dei minori di 14 anni, che l'interfaccia già segnala.

## Note sull'implementazione

Il fornitore sta dietro l'interfaccia `FornitoreAccesso`: per cambiare servizio basta
implementarla e assegnarla a `FORNITORE_ACCESSO`. Quello attuale (`accesso-supabase.ts`):

- **Sessione**: `sessioneIniziale()` legge la sessione salvata, `osserva()` avvisa il
  `ProfiloProvider` quando si entra o si esce, anche al ritorno dal link ricevuto via email.
- **Profilo sull'account**: `archivioAccount()` legge e scrive `profili` e `storico_quiz`
  passando sempre da `datiSincronizzabili`, l'unica porta verso il server.
- **Primo accesso**: il provider unisce il profilo del dispositivo con quello dell'account
  (`unisciProfili`), salva il risultato e cancella la copia locale. Il risultato del test
  resta dov'è, sul dispositivo.
- **Eliminazione account**: `eliminaAccount()` chiama la funzione SQL `elimina_account()`,
  che cancella la riga in `auth.users`; profilo e storico cadono in cascata.
- **Conversione fra righe e profilo**: `daRighe`, `aRigaProfilo` e `aRigheQuiz` sono funzioni
  pure, verificate in `test/profilo.test.ts` con un giro completo andata e ritorno.

Da fare quando il login sarà acceso: un fornitore finto nei test per coprire anche unione
al primo accesso ed eliminazione dal lato interfaccia.
