# Politicare

Piattaforma di educazione politica interattiva per il pubblico italiano.
Tre moduli: test di allineamento con i partiti, test tematici su referendum e
singole riforme, quiz settimanale di cultura politica.

Orizzonte: politiche 2027 ed eventuale referendum sul premierato.

---

## Vincoli non negoziabili

Prima di scrivere qualsiasi codice o contenuto, questi valgono sempre.

### 1. Nessuna posizione di partito inventata

Le posizioni dei partiti nel test di allineamento provengono **solo** da:

- risposta diretta del partito al questionario (metodo preferito), oppure
- estratto testuale dal programma elettorale, oppure
- voto parlamentare registrato su un atto specifico

Ogni posizione nel JSON ha un campo `fonte` obbligatorio con citazione e URL.
Una posizione senza fonte è un bug che blocca il build.

Non si chiede mai a un LLM di dedurre dove sta un partito. L'LLM può aiutare a
estrarre e a riassumere, mai a decidere.

### 2. Il calcolo avviene sul client

Le opinioni politiche sono dati particolari ex art. 9 GDPR. Le risposte al test
partito e ai test tematici non lasciano il dispositivo, non toccano il server,
non finiscono in un database.

Conseguenze architetturali:

- il modulo test partito non ha backend e non ha account
- il quiz settimanale, che ha bisogno di persistenza, usa storage e identità
  **separati** — nessuna chiave in comune, nessun join possibile
- analytics privacy-first e self-hosted (Plausible o Umami). Mai GA.

### 3. Il risultato non è un verdetto

- si mostra sempre la classifica completa, mai un solo vincitore
- se il primo e il secondo sono entro 3 punti percentuali, l'interfaccia lo
  dichiara esplicitamente come pari merito
- il risultato principale non è la percentuale ma il dettaglio: su quali
  affermazioni c'è convergenza e su quali divergenza
- nei test tematici l'output non è mai "vota sì" o "vota no", ma la mappa fra le
  proprie risposte e gli argomenti dei due fronti, incluse le contraddizioni interne

### 4. La metodologia è pubblica

`/metodologia` è una pagina di prodotto, non una nota legale. Contiene il criterio
di scelta delle affermazioni, le quote per area tematica, la formula di punteggio,
gli autori dei contenuti e il changelog. I content pack vivono in un repo pubblico.

---

## Architettura

```
politicare/
├── CLAUDE.md
├── content/                    contenuti versionati, ispezionabili
│   ├── test-partito/
│   │   └── politiche-2027.v1.json
│   ├── test-tema/
│   │   └── premierato.v1.json
│   ├── quiz/
│   │   └── 2027-w12.json
│   └── schema/                 JSON Schema per la validazione in CI
├── packages/
│   └── motore/                 TypeScript puro, zero dipendenze UI
│       ├── src/punteggio.ts
│       ├── src/validazione.ts
│       ├── src/tipi.ts
│       └── test/
├── app/                        Next.js App Router
│   ├── test-partito/
│   ├── tema/[slug]/
│   ├── quiz/[settimana]/
│   └── metodologia/
├── components/
└── services/
    └── quiz-api/               l'unico backend, isolato
```

**Stack:** Next.js con App Router, TypeScript, statico dove possibile.
Il rendering statico serve alla SEO, che per questo prodotto è il canale
principale: la gente cerca "test elettorale" nelle settimane prima del voto.

**`packages/motore` non importa mai React, Next o nulla di ambiente browser.**
È logica pura con copertura di test alta. È il pezzo che deve poter essere letto
e verificato da un giornalista o da un ricercatore.

---

## Il motore di punteggio

Scala delle posizioni e delle risposte: interi da -2 a +2.
Risposta saltata: `null`, esclusa dal calcolo.
Peso: 1, oppure 2 se l'utente ha segnato il tema come importante.

```ts
accordo(i)   = 1 - Math.abs(risposta[i] - posizione[i]) / 4   // in [0, 1]
punteggio(p) = Σ peso[i] * accordo(i) / Σ peso[i]             // in [0, 1]
```

Deterministico e verificabile a mano. Se in futuro si aggiunge una
visualizzazione a due assi, resta secondaria e dichiarata come lettura
interpretativa: il risultato primario è e resta il matching diretto.

---

## Regole di qualità sui contenuti, applicate in CI

I test seguenti girano sui file in `content/` e bloccano la merge.

**Test partito**

- ogni affermazione è una proposta concreta e verificabile, non un valore generico
- ogni affermazione ha un campo `verso`: `+1` se propone un cambiamento, `-1` se
  difende l'assetto vigente. Lo squilibrio fra i due gruppi non supera il 10%
  (contrasta l'acquiescence bias)
- se più dell'85% dei partiti ha la stessa posizione su un'affermazione, questa
  non discrimina e va rimossa
- le quote per area tematica sono dichiarate nel manifest del pack e verificate
- ogni posizione ha `fonte` non vuota

**Quiz**

- ogni domanda è un fatto verificabile con `fonte` e URL. Zero opinioni.
- distribuzione di difficoltà 2 facili / 3 medie / 2 difficili
- l'ordine delle risposte è randomizzato a runtime e la soluzione non è
  esposta dall'API prima che l'utente abbia risposto

**Ogni pack** ha `id`, `versione`, `data`, `autori`, `changelog`.

---

## Convenzioni

- interfaccia e contenuti in italiano; codice, commenti e commit in italiano
- naming di dominio in italiano (`affermazione`, `posizione`, `punteggio`,
  `accordo`) per non creare attrito fra codice e contenuti
- il testo di interfaccia sta in file di contenuto, non hardcoded nei componenti
- accessibilità: navigazione da tastiera completa, focus visibile,
  `prefers-reduced-motion` rispettato, contrasto AA

---

## Da chiarire prima del lancio

- consulenza legale sulla legge 28/2000 e sui regolamenti AGCOM in materia di
  par condicio: uno strumento che orienta il voto nel periodo elettorale è
  terreno regolamentato
- procedura di contatto con i partiti per la compilazione diretta del questionario,
  con tempi lunghi: va avviata mesi prima
- comitato metodologico esterno, con nomi pubblici, per la scelta delle affermazioni
