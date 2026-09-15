# Ponte Telegram → X

Ogni post nuovo del canale Telegram `@politicare` viene ripubblicato in automatico
sul profilo X, con la foto se c'è. Nessun server da tenere acceso: Telegram
chiama il sito su Vercel (`/api/telegram/x`) e il sito pubblica su X.

## Come funziona

1. Un bot Telegram è amministratore del canale: Telegram gli invia ogni post nuovo.
2. Il bot ha un webhook che punta a `https://politicare-app.vercel.app/api/telegram/x`.
3. Il sito controlla la firma segreta, scarta modifiche e post senza testo, toglie la
   firma `@politicare`, porta il testo entro 280 caratteri (contati come li conta X) e pubblica.
4. I post pubblicati finiscono in un registro (`telegram-x/pubblicati.json` nello
   storage privato), così un aggiornamento rispedito da Telegram non esce due volte.

Formato del post su X (`lib/telegram-x.ts`), regolabile dalle variabili d'ambiente:

```
🇸🇪 Elezioni in #Svezia, scarto minimo         ← prima frase del post = titolo (X_TITOLO: normale | maiuscolo | nessuno)

Si dovrà aspettare mercoledì per il conteggio   ← il resto del testo; le parole più rilevanti
dei voti: Magdalena #Andersson è in testa…         diventano hashtag (X_HASHTAG, predefinito 3)
```

Gli hashtag stanno dentro il testo, mai in coda. Con `ANTHROPIC_API_KEY` li sceglie Claude
(cognomi, partiti, luoghi, tema); senza, una regola automatica prende i nomi propri più
frequenti e riconosce i nomi composti (Regno Unito → #RegnoUnito, Partito Democratico → #PD).
Nessuna firma di default (`X_FIRMA` per aggiungerne una).

Regole di testo:

- la firma `@Politicare` di Telegram viene tolta; le bandiere iniziali vengono staccate dal testo;
- la prima frase (fino al primo punto o ai due punti, se è lunga meno di 120 caratteri) diventa il titolo;
- il post entra in 280 caratteri → esce intero, senza link;
- è più lungo → viene tagliato a una parola intera con `…` e riceve il link alla notizia
  sul sito (`/ultimora/tg-<numero>`), dove si legge tutta;
- `X_LINK_NOTIZIE=sempre` aggiunge il link a tutti i post, `mai` non lo aggiunge mai;
- con **X Premium** sull'account il limite sale (`X_LIMITE=25000`) e i post escono interi.

Attenzione ai link: dal 2026 l'API di X fattura per singolo post, e un post **con link costa
molto di più** di uno senza (nel 2026: 0,20 $ contro 0,015 $). `mai`, il valore predefinito,
tiene i costi al minimo.

Album di foto: X riceve solo la foto che porta la didascalia, le altre vengono ignorate.
Le modifiche a un post già pubblicato non si propagano.

## Attivazione (una volta sola)

### 1. Bot Telegram

1. Su Telegram scrivi a `@BotFather` → `/newbot`, scegli nome e username (es. `politicare_x_bot`).
2. Copia il token che ti dà: è `TELEGRAM_BOT_TOKEN`.
3. Nel canale `@politicare` → Amministratori → Aggiungi amministratore → cerca il bot.
   Non serve alcun permesso: basta che sia amministratore per ricevere i post.

### 2. App su X

1. Entra su [developer.x.com](https://developer.x.com) con l'account `@politicare`
   e crea un progetto e un'app. Dal 2026 non esiste più un piano gratuito: servono
   crediti prepagati (pay-per-use), da caricare dalla console sviluppatori.
2. Nell'app → *User authentication settings* → **Read and Write** (tipo: Web App/Bot,
   callback e website URL qualsiasi, es. `https://politicare-app.vercel.app`).
3. *Keys and tokens*: copia **API Key** e **API Key Secret** (`X_API_KEY`, `X_API_SECRET`),
   poi genera **Access Token and Secret** dell'account (`X_ACCESS_TOKEN`, `X_ACCESS_SECRET`).
   Se i token erano già stati generati prima di impostare Read and Write, rigenerali.

### 3. Variabili su Vercel

Nel progetto `politicare-app` → Settings → Environment Variables (ambiente Production):

| Variabile | Valore |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token di BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | stringa casuale lunga (es. `openssl rand -hex 32`) |
| `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | dal portale X |
| `ANTHROPIC_API_KEY` | chiave Claude da [console.anthropic.com](https://console.anthropic.com): riscrive i post troppo lunghi (pochi millesimi di dollaro a post) |
| `X_LINK_NOTIZIE` | facoltativa: `mai` (predefinito), `se-troncato` o `sempre` |

`BLOB_READ_WRITE_TOKEN` è già presente (serve al registro anti-duplicati). Senza `ANTHROPIC_API_KEY`
il ponte funziona lo stesso, ma i post lunghi vengono accorciati per frasi intere invece che riscritti.
Dopo aver salvato le variabili fai un **Redeploy** dell'ultimo deployment.

### 4. Collegare il webhook

In locale, con `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` in `.env.local`
(stessi valori di Vercel):

```bash
npm run telegram-x registra
```

Poi pubblica un post di prova sul canale e controlla:

```bash
npm run telegram-x stato
```

`In attesa: 0` e nessun errore = tutto ok. Il post compare su X entro pochi secondi.
Anche `https://politicare-app.vercel.app/api/telegram/x` (GET) dice se le chiavi sono
configurate, senza mostrarle.

Per vedere come uscirebbe un post, riscrittura compresa, con `ANTHROPIC_API_KEY` in `.env.local`:

```bash
npm run telegram-x prova "testo del post"
```

## Comandi

```bash
npm run telegram-x registra          # collega il webhook al sito
npm run telegram-x stato             # bot, webhook, post in attesa, ultimo errore
npm run telegram-x rimuovi           # spegne il ponte (il canale continua a funzionare)
npm run telegram-x prova "testo"     # mostra come uscirebbe il post su X, senza pubblicare
```

## Se qualcosa non va

- **`stato` mostra un errore 401**: `TELEGRAM_WEBHOOK_SECRET` diverso fra `.env.local` e Vercel.
  Correggi e rilancia `registra`.
- **Errore 503 e post in attesa**: X non ha risposto (rete, crediti finiti, limite di
  frequenza) oppure la foto non si è scaricata. Telegram riprova da solo; i log del
  deployment su Vercel (`[telegram-x]`) dicono il motivo.
- **Il post non esce ma non ci sono errori**: X ha rifiutato il post (chiavi senza permesso
  di scrittura, testo identico a uno già pubblicato). Vedi i log su Vercel.
- **Per pubblicare di nuovo un post**: cancella la sua voce da `telegram-x/pubblicati.json`
  nello storage Blob, poi rispedisci il post (o inoltralo) nel canale.
