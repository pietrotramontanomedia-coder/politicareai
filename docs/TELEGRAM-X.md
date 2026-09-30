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
dei voti: Magdalena #Andersson è in testa.          diventano hashtag (X_HASHTAG, predefinito 3)
```

Gli hashtag stanno dentro il testo, mai in coda, e sono **tre, scelti da Claude**. Claude non riceve
il testo da riscrivere: gli si chiede solo **quali parole marcare** e restituisce un elenco, così il testo
non può cambiare di una virgola. Se non risponde o sbaglia formato vale la regola automatica.
La scelta segue quest'ordine (decisione di Pietro
del 17 settembre 2026): cognomi dei protagonisti, partiti, istituzioni e luoghi, e il tema solo se è
riconoscibile su X (bollo auto → #BolloAuto). Il testo resta parola per parola: da Claude si accetta
solo il cancelletto. Senza `ANTHROPIC_API_KEY`, una regola automatica preferisce il cognome di un
«Nome Cognome», poi i nomi noti della politica, poi le istituzioni composte (Regno Unito → #RegnoUnito,
Partito Democratico → #PD), e non tocca mai cariche («Ministro»), testate («Fatto Quotidiano») o parole generiche.
Nessuna firma di default (`X_FIRMA` per aggiungerne una).

I politici citati vengono **taggati**: un hashtag che corrisponde a un politico con account noto
diventa una menzione (`#Bonelli` → `@AngeloBonelli1`), così la persona riceve la notifica e spesso
ricondivide. I segni nel testo non aumentano: la menzione prende il posto dell'hashtag, al massimo
due per post (`X_MENZIONI`). Mai in prima posizione, perché un post che comincia con `@` X lo mostra
solo a chi segue entrambi. Se il nome di battesimo è già dentro l'handle sparisce, per non leggere
«Matteo @matteorenzi»; resta solo quando apre il post. La tabella dei nomi sta in `lib/telegram-x.ts` (`MENZIONI`): gli account
sono stati verificati uno per uno aprendo il profilo il 24 settembre 2026, e nel dubbio non si tagga.

Regole di testo:

- la firma `@Politicare` di Telegram viene tolta; le bandiere iniziali vengono staccate dal testo;
  il refuso «Fdl» diventa «FdI»;
- la prima frase (fino al primo punto o ai due punti, se è lunga meno di 120 caratteri) diventa il titolo;
- il post entra in 280 caratteri → esce intero, senza link;
- è più lungo → con `ANTHROPIC_API_KEY` Claude lo riscrive più corto (stessi fatti); se non basta
  o la chiave manca, esce come **thread**: primo post con titolo e foto, il resto in risposta,
  sempre per frasi intere (una frase troppo lunga si spezza a una pausa). Nessuna frase viene mai
  tagliata né chiusa con puntini;
- `X_LINK_NOTIZIE=sempre` aggiunge il link alla notizia sul sito a tutti i post, `mai` (predefinito) non lo aggiunge mai;
- con **X Premium** sull'account il limite sale (`X_LIMITE=25000`) e i post escono interi in un post solo.

Post scartati: un post che è **solo un link** (o un link e poche parole) non esce su X, perché non dice
nulla ed è il formato più penalizzato dall'algoritmo. I cancelletti non entrano mai dentro un indirizzo.

Pulizia del testo, oltre alla firma e alle bandiere: gli **a capo messi a mano dentro la frase** tornano a
essere spazi (il canale va a capo a mano e su X il post usciva a scalini), e i **refusi con la «l» minuscola**
al posto della «I» maiuscola vengono corretti (`ltalia`, `lsraele`, `lran`, `lstat`, `Fdl`).

Doppioni: se la stessa notizia è già uscita nelle ultime `X_DOPPIONI_ORE` ore (predefinito 24) il post
viene scartato e Telegram riceve 200, così non riprova. Il confronto è sulle parole che contano, senza
emoji, accenti e cancelletti: riconosce anche una notizia ripubblicata con un refuso corretto, come gli
exit poll di Berlino usciti due volte il 20 settembre 2026. `X_DOPPIONI_ORE=0` disattiva il controllo.

Distanza fra i post: il sito pubblica al massimo un post ogni `X_DISTANZA_MINUTI` (predefinito 10).
Se un post arriva prima, risponde 503 a Telegram, che lo ripresenta più tardi e tiene in coda quelli
successivi, in ordine. Due post nello stesso minuto sono la firma dello spam per X: meglio distanziarli.
`X_DISTANZA_MINUTI=0` disattiva l'attesa. Il registro si legge sempre dall'origine, mai dalla cache:
con la cache due post consegnati a pochi secondi l'uno dall'altro uscivano insieme (16 settembre 2026).

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
| `X_LINK_NOTIZIE` | facoltativa: `mai` (predefinito) o `sempre` |
| `X_HASHTAG` | facoltativa: quanti hashtag nel testo, predefinito `3` (`0` per nessuno) |
| `X_DISTANZA_MINUTI` | facoltativa: minuti minimi fra un post e l'altro, predefinito `10` |
| `X_MENZIONI` | facoltativa: quanti politici citati vengono taggati, predefinito `2` (`0` per nessuno) |
| `X_DOPPIONI_ORE` | facoltativa: ore entro cui una notizia ripetuta viene scartata, predefinito `24` (`0` per nessun controllo) |

`BLOB_READ_WRITE_TOKEN` è già presente (serve al registro anti-duplicati e alla distanza fra i post).
Senza `ANTHROPIC_API_KEY` il ponte funziona lo stesso, ma i post lunghi escono come thread invece che riscritti.
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
