# App iOS e Android (Capacitor)

L'app è la stessa base di codice del sito, impacchettata con [Capacitor 8](https://capacitorjs.com/).

## Come funziona

| Parte | Dove gira | Rete |
|---|---|---|
| Test partito, quiz, confronta, simulatore, gioco, fantaparlamento, metodologia | dentro il pacchetto dell'app | non serve: funzionano offline |
| Home, feed, ultim'ora, articoli | dati chiesti alle API del sito in produzione | serve |
| Profilo | sul dispositivo; con Supabase configurato, anche sull'account | solo per l'account |

Il calcolo del test resta sul telefono: nessuna risposta passa dalla rete, come sul web
(vincolo 2 del CLAUDE.md).

Due build dallo stesso codice:

- `npm run build`: sito web su Vercel, invariato.
- `npm run build:app`: esportazione statica in `out/` con `BUILD_TARGET=app`, poi `cap sync`.

Nella build app:

- le route API, il manifest e i job (file `.ts` in `app/`) restano fuori: vivono solo sul server;
- le pagine di dettaglio dinamiche del web (`page.web.tsx`: `/ultimora/[id]`, `/leggi/[slug]`) sono
  sostituite da pagine con l'id in query (`page.app.tsx`: `/ultimora/?id=`, `/leggi/?slug=`) che
  caricano i dati dalle API e li mostrano con gli stessi componenti;
- `lib/piattaforma.ts` decide indirizzi delle API, link ai dettagli, link da condividere e ritorno
  dall'accesso; nel codice non si scrive mai `fetch('/api/...')` né `window.location.origin` diretti;
- il service worker non viene registrato;
- `lib/nativo.ts` usa i plugin nativi dove la webview non basta (vedi sotto).

Il sito apre all'app, con `Access-Control-Allow-Origin: *`, solo le API di lettura che le servono:
`/api/feed`, `/api/articolo`, `/api/instagram`, `/api/ultimora` e `/api/ultimora/[id]`. Sono GET
pubbliche senza credenziali. Radar, ponte Telegram e rinnovo del token Instagram restano chiusi.

## Cosa fa di nativo

- **Condivisione**: nella webview Android non esistono la condivisione web né lo scaricamento di
  un'immagine generata al volo. Nell'app i pulsanti "Condividi" aprono il foglio di condivisione del
  telefono (`@capacitor/share`); le grafiche sono scritte nella cache dell'app (`@capacitor/filesystem`)
  e da lì si possono anche salvare in Foto o Galleria. I link condivisi puntano sempre al sito pubblico
  (`/ultimora/<id>`), non all'indirizzo interno dell'app; sulle grafiche compare il dominio del sito.
- **Accesso**: il link via email e l'accesso con Google tornano all'app con lo schema
  `it.politicare.app://accedi`, registrato in `AndroidManifest.xml` e in `Info.plist`.
  `components/app/IntegrazioneNativa.tsx` riceve il link (`@capacitor/app`) e completa l'accesso PKCE.
  Google viene aperto nel browser di sistema (`@capacitor/browser`), perché rifiuta l'accesso dentro
  una webview.
- **Barra di stato**: testo chiaro su sfondo scuro; aree sicure gestite dal layout con
  `env(safe-area-inset-*)`.

## Prima volta, sul Mac

Requisiti: Node 22+, Xcode 16+ (iOS), Android Studio con JDK 21 (Android). Su iOS i pacchetti
nativi arrivano con Swift Package Manager: non serve CocoaPods.

```bash
npm install
cp .env.app.example .env.app      # indirizzo del sito e, se vuoi l'account, le chiavi Supabase
npm run build:app                 # esporta e copia nei progetti nativi
npm run app:ios                   # apre Xcode
npm run app:android               # apre Android Studio
```

In Xcode: scegli il team di firma in *Signing & Capabilities* e premi Run su simulatore o iPhone.
In Android Studio: attendi la sincronizzazione Gradle e premi Run.

Dopo ogni modifica al sito: `npm run build:app`, poi Run dall'IDE.
Per una sola piattaforma: `npm run build:app -- ios` oppure `-- android`.

## Configurazione

- Identificativo: `it.politicare.app` (`capacitor.config.ts`, e lo stesso valore come schema dei
  link in `lib/piattaforma.ts`). Una volta pubblicata l'app non si può più cambiare: va confermato
  prima del primo invio agli store.
- Versione: `MARKETING_VERSION` e `CURRENT_PROJECT_VERSION` in Xcode; `versionName` e
  `versionCode` in `android/app/build.gradle`. Ogni invio allo store vuole un numero di build nuovo.
- Icone e splash: sorgenti in `assets/`, generati con `npm run app:icone`. L'icona attuale è
  ricavata dalla versione a 512 pixel ingrandita: per gli store serve un file a 1024×1024 dal grafico
  (`assets/icon-only.png`), poi si rilancia `npm run app:icone`.
- Supabase: in *Authentication → URL Configuration → Redirect URLs* aggiungi
  `it.politicare.app://accedi`, oltre all'indirizzo `/accedi` del sito. Senza, il link via email
  e Google rimandano al sito invece che all'app.

## Da fare prima di pubblicare

- **Sito in produzione** con la nuova route `/api/ultimora/[id]` e gli header CORS: l'app ne ha
  bisogno, quindi il merge sul sito va fatto prima dell'invio agli store.
- **Prova su dispositivo** di condivisione, ritorno dall'accesso e Google: dipendono dai plugin
  nativi e non si possono provare nel browser.
- **Account sviluppatore**: Apple Developer Program (99 dollari l'anno) e Google Play Console
  (25 dollari una tantum). Su Play gli account personali nuovi devono fare un test chiuso con almeno
  12 tester per 14 giorni prima della produzione.
- **Privacy**: informativa con URL pubblico. Con l'account Supabase attivo l'app raccoglie email e
  dati del profilo: va dichiarato nella scheda privacy di App Store Connect e nel modulo Data safety
  di Play. Se l'app consente di creare un account deve anche consentire di eliminarlo dall'app
  (c'è già: `eliminaAccount`).
- **Accesso con Apple**: se l'app offre l'accesso con Google, Apple chiede di offrire anche
  "Accedi con Apple" o un'alternativa equivalente (linea guida 4.8). Il link via email può bastare
  come alternativa, ma va verificato in revisione.
- **Revisione Apple 4.2**: le app che sono solo un sito impacchettato vengono respinte. Qui test,
  quiz, simulatore e gioco girano in locale e offline, e la condivisione è nativa: è l'argomento da
  mettere nelle note di revisione. Le notifiche push per il quiz settimanale rafforzerebbero il caso.
- **Contenuti politici**: Apple chiede che le app su temi politici siano pubblicate da un soggetto
  identificabile; metti nella scheda dello store l'editore di Politicare e il link alla metodologia.
  Resta valido il punto del CLAUDE.md su par condicio e regolamenti AGCOM.
