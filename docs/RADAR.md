# Radar dei trend su X

Il radar guarda le tendenze di X in Italia, si accorge dei temi che stanno salendo e, quando
Politicare ha qualcosa di utile da dire, manda in privato su Telegram due o tre bozze di post
pronte da pubblicare. **Non pubblica mai da solo**: ogni bozza ha un link «Apri su X» che apre
l'app con il testo già scritto, e il post lo decide e lo pubblica una persona.

## Come funziona

Un job programmato chiama `https://politicare-app.vercel.app/api/radar` da una volta all'ora (per la prova) a ogni 20 minuti. A ogni giro:

1. **Tendenze.** Legge le prime 30 tendenze di X per l'Italia (`lib/radar-x-server.ts`).
2. **Salita.** Le confronta con la classifica di circa un'ora prima (`lib/radar.ts`; dopo una pausa
   di oltre 3 ore, come la notte, il primo giro registra soltanto). È un segnale
   un tema che entra in classifica, sale di almeno 3 posizioni o cresce di volume di almeno una
   volta e mezza. Calcio, spettacolo e saluti del mattino vengono scartati subito.
3. **Filtro.** Un modello piccolo e veloce (Claude Haiku 4.5, frazioni di centesimo) guarda i nomi dei
   segnali e scarta quelli che non c'entrano con la politica: serie tv, marchi, sport, nomi senza legame
   politico. Senza questo passaggio il tema più forte del giorno, anche se è «Bridgerton», si prendeva la
   valutazione e un posto del tetto giornaliero, e i temi politici arrivati dopo restavano fuori.
   Gli scartati compaiono nella risposta sotto `scartati`. Se il filtro non risponde, si va avanti con tutti.
4. **Accelerazione.** Per il segnale più forte (`RADAR_VALUTAZIONI`, predefinito 1) conta i post in italiano
   dell'ultima ora rispetto alla media delle tre ore prima. Sotto ×1,5 (`RADAR_ACCELERAZIONE`) il
   tema si ferma lì: sta già calando, è tardi per entrarci.
5. **Valutazione.** Legge i 10 post più rilevanti sul tema e li passa a Claude
   (`lib/radar-claude-server.ts`), che decide se è politica o attualità su cui Politicare può dire
   qualcosa e scrive le bozze. Regole fisse: solo fatti, nessuna opinione o tifo, nessun numero
   inventato, aggancio a uno strumento del sito quando c'è. I fatti presi solo dai post finiscono
   nella lista «Prima di pubblicare verifica».
6. **Avviso.** In modalità `avvisa`, il bot Telegram del radar manda il messaggio in privato.
   Lo stesso tema non viene riproposto per 12 ore (`RADAR_RIPOSO_ORE`).

La memoria (classifiche delle ultime 48 ore e avvisi delle ultime due settimane) sta in
`radar/stato.json` nello storage Blob.

## Scollegato dal ponte Telegram → X

Il radar non condivide nulla con il ponte che ripubblica il canale su X:

| | Ponte Telegram → X | Radar |
|---|---|---|
| Bot Telegram | `TELEGRAM_BOT_TOKEN` | `RADAR_TELEGRAM_BOT_TOKEN`, un bot diverso |
| Chiavi X | `X_API_KEY`, `X_ACCESS_TOKEN`… (pubblica) | `RADAR_X_BEARER_TOKEN`, di un'app X diversa (solo lettura) |
| Claude | `ANTHROPIC_API_KEY` | `RADAR_ANTHROPIC_API_KEY`, una chiave diversa |
| Codice | `lib/telegram-x*.ts`, `lib/x-server.ts`, `lib/telegram-bot-server.ts` | `lib/radar*.ts`, `app/api/radar` |
| Stato | `telegram-x/pubblicati.json` | `radar/stato.json` |

Un test (`test/radar-separazione.test.ts`) blocca la build se il codice del radar importa un modulo del
ponte o legge una sua variabile. Se il radar si rompe, finisce i crediti o viene spento, il ponte
continua come prima. In comune restano solo il sito su Vercel e lo storage Blob, in file diversi.

Una cosa da sapere: su X i crediti prepagati sono dell'account sviluppatore, non della singola app.
Con l'app separata le chiavi e i limiti sono distinti, ma la spesa del radar (al massimo circa 0,35 $
al giorno su X con i valori predefiniti) esce dallo stesso saldo del ponte: tieni la ricarica
automatica attiva o un margine di credito.

## Modalità

| `RADAR_MODALITA` | Cosa fa |
|---|---|
| (vuota) | spento: il job risponde subito e non spende nulla |
| `registra` | fa tutto, bozze comprese, ma non manda messaggi. Serve la prima settimana per verificare che gli avvisi arrivino **prima** del picco |
| `avvisa` | manda gli avvisi su Telegram |

Il percorso consigliato: una settimana in `registra` con la configurazione **Prova** (vedi Costi), poi si guarda `radar/stato.json`. Per ogni
avviso c'è l'ora, e nelle classifiche salvate si vede se il tema è salito ancora dopo. Se il radar
arrivava in anticipo, si passa ad `avvisa`.

## Costi

Prezzi pay-per-use di X nel 2026: tendenze 0,01 $ a chiamata, conteggi 0,005 $, ricerca 0,005 $ a
post letto. Claude Opus 5.5 circa 0,05 $ a valutazione; il filtro con Haiku 4.5 meno di 0,001 $ a giro.

- un giro: 0,01 $ (la classifica), più 0,005 $ per ogni tema che sale ma non accelera;
- un tema valutato: circa 0,10 $ (conteggio, 10 post, Claude), circa 0,05 $ con `RADAR_CAMPIONE=0`.

Tre freni tengono la spesa sotto controllo:

- `RADAR_MASSIMO_GIORNO` (predefinito 3): oltre questo numero di temi valutati in un giorno il radar
  registra solo le classifiche fino a mezzanotte. È il tetto della spesa;
- `RADAR_ORARIO` (predefinito `10-22`, ultimo giro alle 21): fuori da queste ore italiane il radar non
  legge nemmeno le tendenze. `0-24` per tutto il giorno;
- `RADAR_INTERVALLO_MINUTI` (predefinito 55): se il job chiama più spesso, i giri in più non leggono nulla;
- `RADAR_CAMPIONE=0`: Claude valuta solo dal nome del tema, senza leggere i post. Costa la metà ma
  scarta di più, perché un nome da solo spesso non basta a capire di cosa si parla.

| Configurazione | Giri | Spesa massima |
|---|---|---|
| **Prova** (i valori predefiniti): un giro all'ora dalle 10 alle 22, tetto 3 temi | 12 al giorno | ≈ 0,50 $ al giorno, **≈ 15 $ (≈ 13 €) al mese** |
| Normale: ogni 30 minuti, `10-22`, tetto 10, `RADAR_INTERVALLO_MINUTI=25` | 24 al giorno | ≈ 1,35 $ al giorno, ≈ 40 $ al mese |
| Pieno: ogni 20 minuti, `0-24`, tetto 20, `RADAR_INTERVALLO_MINUTI=15` | 72 al giorno | ≈ 3 $ al giorno, ≈ 90 $ al mese |

## Attivazione

Tutto si fa una volta sola, da computer. Niente di quello che segue tocca il ponte.

### 1. Un bot Telegram solo per il radar

1. Su Telegram scrivi a `@BotFather` → `/newbot`, nome per esempio «Politicare Radar»,
   username per esempio `politicare_radar_bot`. Il token che ti dà è `RADAR_TELEGRAM_BOT_TOKEN`.
2. Apri il nuovo bot e premi **Avvia**: un bot può scrivere solo a chi gli ha scritto almeno una volta.
3. Scrivi a `@userinfobot`: ti risponde con il tuo **Id** numerico. È `RADAR_TELEGRAM_CHAT`.
   Per mandare gli avvisi a un gruppo della redazione, aggiungi il bot al gruppo e usa l'id del
   gruppo (comincia con `-`).

Il bot del radar non va aggiunto al canale `@politicare`.

### 2. Un'app X solo per il radar

1. Su [developer.x.com](https://developer.x.com), nello stesso account e progetto del ponte,
   crea una **nuova app** (es. «Politicare Radar»). Non toccare l'app del ponte né le sue chiavi.
2. Permessi: **Read** basta, il radar non pubblica.
3. *Keys and tokens* → **Bearer Token** → genera e copia: è `RADAR_X_BEARER_TOKEN`.

### 3. Una chiave Claude solo per il radar

Su [console.anthropic.com](https://console.anthropic.com) → API Keys → **Create Key**, nome «radar».
È `RADAR_ANTHROPIC_API_KEY`. Così nella console vedi la spesa del radar separata da quella del ponte,
e puoi revocarla senza toccare il ponte.

### 4. Variabili su Vercel

Nel progetto `politicare-app` → Settings → Environment Variables (ambiente Production) aggiungi
solo variabili nuove, senza modificare quelle esistenti:

| Variabile | Valore |
|---|---|
| `RADAR_MODALITA` | `avvisa` (oppure `registra` per avere le bozze solo nello stato, senza messaggi) |
| `RADAR_TELEGRAM_BOT_TOKEN` | token del bot del radar (passo 1) |
| `RADAR_TELEGRAM_CHAT` | il tuo id Telegram (passo 1) |
| `RADAR_X_BEARER_TOKEN` | Bearer Token dell'app X del radar (passo 2) |
| `RADAR_ANTHROPIC_API_KEY` | chiave Claude del radar (passo 3) |
| `CRON_SECRET` | già presente per Instagram: serve anche al radar |
| `RADAR_MASSIMO_GIORNO` | facoltativa: tetto di temi valutati al giorno, predefinito `3` |
| `RADAR_ORARIO` | facoltativa: ore italiane di lavoro, predefinito `10-22` (ultimo giro alle 21); `0-24` = tutto il giorno |
| `RADAR_INTERVALLO_MINUTI` | facoltativa: minuti minimi fra due giri, predefinito `55` (un giro all'ora) |
| `RADAR_VALUTAZIONI` | facoltativa: temi valutati a ogni giro, predefinito `1` |
| `RADAR_ACCELERAZIONE` | facoltativa: accelerazione minima dell'ultima ora, predefinito `1.5` |
| `RADAR_RIPOSO_ORE` | facoltativa: ore prima di riproporre lo stesso tema, predefinito `12` |
| `RADAR_CLASSIFICA` | facoltativa: fino a che posizione delle tendenze guardare, predefinito `30` |
| `RADAR_CAMPIONE` | facoltativa: post letti per capire il tema, predefinito `10` (minimo di X); `0` per non leggerne |

Dopo aver salvato fai un **Redeploy**. Per spegnere il radar basta togliere `RADAR_MODALITA`.

### 5. Il job programmato (una volta all'ora)

- **Vercel Pro**: aggiungi in `vercel.json`, dentro `crons`,
  `{ "path": "/api/radar", "schedule": "*/20 * * * *" }`. Vercel manda da solo il `CRON_SECRET`.
  Sul piano Hobby i job possono girare solo una volta al giorno e il deploy fallisce: non aggiungerlo lì.
- **Piano Hobby**: un servizio esterno gratuito come [cron-job.org](https://cron-job.org).
  URL `https://politicare-app.vercel.app/api/radar`, ogni ora per la prova (poi ogni 20-30 minuti), con l'intestazione
  `Authorization: Bearer <CRON_SECRET>`.

### 6. Prova

Con `CRON_SECRET` in `.env.local`:

```bash
npm run radar prova
```

Fa un giro completo sul sito pubblicato senza mandare messaggi e senza mettere i temi a riposo,
e stampa segnali, valutazioni e bozze. Al primo giro non ci sono segnali: il radar deve avere una
classifica di un'ora prima con cui confrontarsi.

## Se qualcosa non va

- **`RADAR_X_BEARER_TOKEN mancante`**: manca il Bearer Token dell'app X del radar.
- **`tendenze non lette`**: Bearer Token errato o crediti finiti. Le tendenze per località
  (`/2/trends/by/woeid`) funzionano con il pay-per-use, ma X può cambiare i permessi: i log
  `[radar]` su Vercel riportano la risposta di X.
- **Segnali ma nessuna valutazione**: manca `RADAR_ANTHROPIC_API_KEY`, oppure i temi non accelerano,
  oppure è stato raggiunto il tetto giornaliero.
- **Valutato ma nessun messaggio**: `RADAR_MODALITA` non è `avvisa`, manca `RADAR_TELEGRAM_BOT_TOKEN`
  o `RADAR_TELEGRAM_CHAT`, oppure non hai premuto Avvia nel bot del radar.
