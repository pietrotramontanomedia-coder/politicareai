# Profilo utente e login

Stato al 10 settembre 2026: **struttura completa, login non ancora collegato.**
Il profilo funziona già in modalità ospite, salvato sul dispositivo. Quando si sceglie il
servizio di login si implementa un solo modulo e il profilo passa sull'account.

## Il confine dei dati (non negoziabile)

| Dato | Dove vive | Può andare sull'account? |
|---|---|---|
| Nome e colore del profilo | `Profilo` | sì |
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
├── accesso.ts                 FornitoreAccesso + FORNITORE_ACCESSO (oggi: non configurato)
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

## Collegare il login

Scelta consigliata: **Supabase, regione UE (Francoforte)**, link magico via email e Google.
Qualsiasi altro servizio va bene purché implementi `FornitoreAccesso`.

1. Il titolare crea il progetto Supabase (regione EU Central) e abilita Email (magic link) e
   Google. Nelle impostazioni di autenticazione: URL del sito e redirect verso `/accedi`.
2. Variabili d'ambiente su Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Database (SQL editor di Supabase):

   ```sql
   create table profili (
     id uuid primary key references auth.users on delete cascade,
     nome text not null default '',
     colore text not null default '#FEDC01',
     temi_seguiti text[] not null default '{}',
     giocatori text[] not null default '{}',
     creato_il timestamptz not null default now(),
     aggiornato_il timestamptz not null default now()
   );

   create table storico_quiz (
     utente uuid not null references auth.users on delete cascade,
     numero int not null,
     percentuale int not null check (percentuale between 0 and 100),
     corrette int not null,
     totale int not null,
     migliore_percentuale int not null,
     tentativi int not null default 1,
     completato_il timestamptz not null,
     primary key (utente, numero)
   );

   alter table profili enable row level security;
   alter table storico_quiz enable row level security;
   create policy "profilo del proprietario" on profili
     for all using (auth.uid() = id) with check (auth.uid() = id);
   create policy "quiz del proprietario" on storico_quiz
     for all using (auth.uid() = utente) with check (auth.uid() = utente);
   -- Nessuna tabella per il test partiti: è voluto.
   ```

4. Nuovo file `lib/profilo/accesso-supabase.ts` che implementa `FornitoreAccesso`:
   `sessioneIniziale`, `inviaLinkEmail`, `accediConGoogle`, `esci`, `eliminaAccount` (route
   server con service key che cancella l'utente: le tabelle cadono in cascata) e
   `archivioAccount`, che legge e scrive le due tabelle passando da `datiSincronizzabili`.
5. In `lib/profilo/accesso.ts` assegnare il nuovo fornitore a `FORNITORE_ACCESSO`.
6. Al primo accesso, in `ProfiloProvider`: se esiste un profilo sul dispositivo, unirlo a
   quello dell'account con `unisciProfili`, salvarlo sull'account e cancellare la copia locale.
   Il risultato del test resta dov'è.
7. Aggiornare l'informativa privacy (titolare, finalità, base giuridica, conservazione,
   responsabile del trattamento Supabase con DPA) e aggiungere in `/profilo` "Elimina account".
8. Test: un fornitore finto in `test/` per verificare unione al primo accesso ed eliminazione.
