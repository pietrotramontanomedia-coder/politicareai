# Radar dei trend su X

Il radar guarda le tendenze di X in Italia, si accorge dei temi che stanno salendo e, quando
Politicare ha qualcosa di utile da dire, manda in privato su Telegram due o tre bozze di post
pronte da pubblicare. **Non pubblica mai da solo**: ogni bozza ha un link «Apri su X» che apre
l'app con il testo già scritto, e il post lo decide e lo pubblica una persona.

## Come funziona

Un job programmato chiama `https://politicare-app.vercel.app/api/radar` ogni 20-30 minuti. A ogni giro:

1. **Tendenze.** Legge le prime 30 tendenze di X per l'Italia (`lib/radar-x-server.ts`).
2. **Salita.** Le confronta con la classifica di circa un'ora prima (`lib/radar.ts`). È un segnale
   un tema che entra in classifica, sale di almeno 3 posizioni o cresce di volume di almeno una
   volta e mezza. Calcio, spettacolo e saluti del mattino vengono scartati subito.
3. **Accelerazione.** Per i 2 segnali più forti (`RADAR_VALUTAZIONI`) conta i post in italiano
   dell'ultima ora rispetto alla media delle tre ore prima. Sotto ×1,5 (`RADAR_ACCELERAZIONE`) il
   tema si ferma lì: sta già calando, è tardi per entrarci.
4. **Valutazione.** Legge i 10 post più rilevanti sul tema e li passa a Claude
   (`lib/radar-claude-server.ts`), che decide se è politica o attualità su cui Politicare può dire
   qualcosa e scrive le bozze. Regole fisse: solo fatti, nessuna opinione o tifo, nessun numero
   inventato, aggancio a uno strumento del sito quando c'è. I fatti presi solo dai post finiscono
   nella lista «Prima di pubblicare verifica».
5. **Avviso.** In modalità `avvisa`, il bot Telegram del ponte manda il messaggio in privato.
   Lo stesso tema non viene riproposto per 12 ore (`RADAR_RIPOSO_ORE`).

La memoria (classifiche delle ultime 48 ore e avvisi delle ultime due settimane) sta in
`radar/stato.json` nello storage Blob, accanto al registro del ponte.

## Modalità

| `RADAR_MODALITA` | Cosa fa |
|---|---|
| (vuota) | spento: il job risponde subito e non spende nulla |
| `registra` | fa tutto, bozze comprese, ma non manda messaggi. Serve la prima settimana per verificare che gli avvisi arrivino **prima** del picco |
| `avvisa` | manda gli avvisi su Telegram |

Il percorso consigliato: una settimana in `registra`, poi si guarda `radar/stato.json`. Per ogni
avviso c'è l'ora, e nelle classifiche salvate si vede se il tema è salito ancora dopo. Se il radar
arrivava in anticipo, si passa ad `avvisa`.

## Costi

Prezzi pay-per-use di X nel 2026: tendenze 0,01 $ a chiamata, conteggi 0,005 $, ricerca 0,005 $ a
post letto. Claude Opus 5.5 circa 0,05 $ a valutazione.

- un giro senza temi nuovi: 0,01 $;
- un tema valutato: circa 0,10 $ (conteggio, 10 post, Claude);
- ogni 20 minuti, con 10-20 temi valutati al giorno: **circa 2-3 $ al giorno**.

Per spendere meno: un giro ogni 30 minuti e `RADAR_VALUTAZIONI=1`.

## Attivazione

### 1. Dove arrivano gli avvisi

1. Su Telegram apri il bot del ponte (quello creato con BotFather) e premi **Avvia**: un bot può
   scrivere solo a chi gli ha scritto almeno una volta.
2. Scrivi a `@userinfobot`: ti risponde con il tuo **Id** numerico. È `RADAR_TELEGRAM_CHAT`.
   Per mandare gli avvisi a un gruppo della redazione, aggiungi il bot al gruppo e usa l'id del
   gruppo (comincia con `-`).

### 2. Variabili su Vercel

Le chiavi di X e di Claude sono già quelle del ponte (`X_API_KEY`, `X_API_SECRET`,
`ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `BLOB_READ_WRITE_TOKEN`). In più:

| Variabile | Valore |
|---|---|
| `RADAR_MODALITA` | `registra` per cominciare, poi `avvisa` |
| `RADAR_TELEGRAM_CHAT` | il tuo id Telegram (passo 1) |
| `CRON_SECRET` | già presente per Instagram: serve anche al radar |
| `X_BEARER_TOKEN` | facoltativa: il Bearer Token dell'app X; senza, il radar lo ricava da API Key e Secret |
| `RADAR_VALUTAZIONI` | facoltativa: temi valutati a ogni giro, predefinito `2` |
| `RADAR_ACCELERAZIONE` | facoltativa: accelerazione minima dell'ultima ora, predefinito `1.5` |
| `RADAR_RIPOSO_ORE` | facoltativa: ore prima di riproporre lo stesso tema, predefinito `12` |
| `RADAR_CLASSIFICA` | facoltativa: fino a che posizione delle tendenze guardare, predefinito `30` |
| `RADAR_CAMPIONE` | facoltativa: post letti per capire il tema, predefinito `10` (minimo di X) |

Dopo aver salvato fai un **Redeploy**.

### 3. Il job ogni 20-30 minuti

- **Vercel Pro**: aggiungi in `vercel.json`, dentro `crons`,
  `{ "path": "/api/radar", "schedule": "*/20 * * * *" }`. Vercel manda da solo il `CRON_SECRET`.
  Sul piano Hobby i job possono girare solo una volta al giorno e il deploy fallisce: non aggiungerlo lì.
- **Piano Hobby**: un servizio esterno gratuito come [cron-job.org](https://cron-job.org).
  URL `https://politicare-app.vercel.app/api/radar`, ogni 20 minuti, con l'intestazione
  `Authorization: Bearer <CRON_SECRET>`.

### 4. Prova

Con `CRON_SECRET` in `.env.local`:

```bash
npm run radar prova
```

Fa un giro completo sul sito pubblicato senza mandare messaggi e senza mettere i temi a riposo,
e stampa segnali, valutazioni e bozze. Al primo giro non ci sono segnali: il radar deve avere una
classifica di un'ora prima con cui confrontarsi.

## Se qualcosa non va

- **`tendenze non lette`**: chiavi X errate o crediti finiti. Le tendenze per località
  (`/2/trends/by/woeid`) funzionano con il pay-per-use, ma X può cambiare i permessi: i log
  `[radar]` su Vercel riportano la risposta di X.
- **Segnali ma nessuna valutazione**: manca `ANTHROPIC_API_KEY`, oppure i temi non accelerano.
- **Valutato ma nessun messaggio**: `RADAR_MODALITA` non è `avvisa`, manca `RADAR_TELEGRAM_CHAT`
  oppure non hai premuto Avvia nel bot.
