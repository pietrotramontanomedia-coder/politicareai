# Portale della redazione

`/redazione` è la palestra interna dei ragazzi della redazione: pubblicano post e storie come
su Instagram, e chi coordina vede tutto, lascia correzioni e consigli e segue come lavora
ognuno. Le grafiche si fanno nel generatore (https://politicare-storie.vercel.app): qui si
pubblicano soltanto. Nulla esce dal portale: niente viene pubblicato sui social, le foto sono private e la
pagina non è indicizzata. Non ha legami con il profilo pubblico dell'app né con il test partiti.

## Come funziona

**Chi scrive (redattore)** entra con il proprio nome e il codice della redazione.

- *+ Post*: le card fatte col generatore (fino a 10, carosello 4:5) più il copy, obbligatorio,
  con i limiti di Instagram (2200 caratteri, 30 hashtag). Anteprima dal vivo com'è nell'app.
- *+ Storia*: una sola immagine 9:16 fatta col generatore, nient'altro.
- *Feed*: i post di tutti e, in cima, i cerchi con le storie delle ultime 24 ore.
- *Il mio profilo*: il pulsante *Apri il generatore* e la griglia dei propri contenuti con lo
  stato di ciascuno. Se qualcosa è *da correggere* compare un avviso; si apre, si leggono le correzioni e si pubblica una
  nuova versione. Le versioni precedenti restano consultabili.

**Chi corregge (revisore)** entra con il codice dei revisori e ha in più:

- *Da rivedere*: la coda, prima chi aspetta da più tempo. Ogni nuova versione torna qui.
- Nel dettaglio di un contenuto: commento di tipo *Correzione*, *Consiglio* o *Bravo!*, e i
  pulsanti *Invia e chiedi correzione* o *Approva*.
- *Squadra*: per ogni persona i contenuti degli ultimi 7 giorni, post, storie, quanti sono da
  rivedere, da correggere, approvati e l'ultimo invio. Dal nome si apre il suo profilo.

I colleghi vedono il lavoro degli altri ma non le correzioni: quelle restano fra l'autore e
chi coordina. Il portale si aggiorna da solo ogni minuto.

## Non si perde niente

- **Eliminare non cancella.** Il contenuto sparisce da feed e profili ma resta nell'archivio con
  foto, versioni e correzioni. Chi corregge lo trova in *Squadra → Cestino* e lo ripristina.
  Nessuna funzione del portale cancella file dallo storage.
- **Storico.** Ogni salvataggio (pubblicazione, nuova versione, commento, cambio di stato,
  eliminazione, ripristino) lascia una copia datata in `redazione/storico/<id>/`: si può
  ricostruire qualsiasi momento passato.
- **Letture robuste.** Se un contenuto non si legge, il server riprova; se non ci riesce, il
  portale tiene quello che mostrava invece di farlo sparire.
- **Bozze.** Il copy si salva nel browser mentre si scrive e torna se la finestra si chiude.
  Chiudere il compositore con card o copy non pubblicati chiede conferma; ogni card caricata
  riprova da sola se cade la rete e non si ricarica al secondo tentativo.

## Avvisi su Telegram

A ogni post, storia o nuova versione arriva nel canale della redazione un messaggio con le card
(o la storia), il copy e il link che apre il contenuto nel portale. Usa il bot del radar
(@politicareradar_bot), mai quello del ponte verso X.

1. Creare un canale Telegram (privato va benissimo) e aggiungere @politicareradar_bot come
   amministratore con il permesso di pubblicare.
2. Trovare l'id del canale: `GET /api/avviso` con `Authorization: Bearer <CRON_SECRET>` elenca
   anche i canali in cui il bot è stato aggiunto (id che inizia con -100).
3. Su Vercel: `REDAZIONE_TELEGRAM_CHAT` = quell'id (facoltativo `REDAZIONE_TELEGRAM_BOT_TOKEN`
   per un bot dedicato), poi rifare il deploy.

Se Telegram non risponde la pubblicazione va comunque a buon fine; se le foto non partono
arriva almeno il testo.

Stati: **da rivedere** (appena inviato o nuova versione) → **da correggere** (il revisore ha
chiesto modifiche) → **approvato**.

## Accenderlo (su Vercel)

1. Lo storage privato è quello già usato da radar e Instagram (`BLOB_READ_WRITE_TOKEN`): non
   serve altro.
2. In *Settings → Environment Variables* aggiungere:
   - `REDAZIONE_CODICE`: il codice da dare ai ragazzi;
   - `REDAZIONE_CODICE_REVISORI`: il codice di chi corregge, diverso dal primo;
   - `REDAZIONE_SEGRETO` (facoltativo): stringa casuale lunga che rafforza la firma delle sessioni.
3. Rifare il deploy e mandare ai ragazzi il link `…/redazione` con il loro codice.

Usare codici lunghi (per esempio tre parole a caso). Cambiare un codice fa uscire tutti: utile
se qualcuno lascia la redazione. La sessione dura 30 giorni.

In locale, senza `BLOB_READ_WRITE_TOKEN`, contenuti e foto restano in memoria e si perdono al
riavvio del server.

## Note tecniche

```
lib/redazione/
├── tipi.ts              Contenuto, Versione, Commento, Storia
├── regole.ts            funzioni pure: validazione, permessi, versioni, coda, statistiche
├── sessione-server.ts   codici, cookie firmato (HMAC), ruolo
├── archivio-server.ts   Vercel Blob privato (o memoria): un JSON per contenuto, un file per foto
├── api-server.ts        sessione obbligatoria ed errori in JSON per le API
├── client.ts            chiamate dal browser e riduzione delle foto
└── testi.ts             testi dell'interfaccia
app/api/redazione/       accesso, contenuti, commenti, media
components/redazione/    portale, compositore, anteprime, dettaglio, visore delle storie
test/redazione.test.ts
```

- **Foto**: il browser le riduce (lato lungo 1920 px, JPEG di qualità alta perché sono card con testo) prima di caricarle, una per
  richiesta, così si resta sotto il limite di 4,5 MB delle funzioni Vercel e i dati EXIF
  (posizione compresa) non arrivano al server. Il server accetta solo JPEG, PNG e WebP veri,
  riconosciuti dai primi byte.
- **Modifiche concorrenti**: ogni scrittura su un contenuto è condizionata all'ETag letto; se
  due persone commentano insieme, la seconda rilegge e riprova invece di sovrascrivere.
- **Permessi** (in `regole.ts`, verificati dai test): solo l'autore pubblica nuove versioni;
  autore e revisori eliminano e vedono le correzioni; solo i revisori cambiano lo stato.
- L'identità è il nome: chi ha il codice può scrivere con qualsiasi nome. Per una palestra
  interna basta; se servisse di più, il passo successivo è un PIN personale per nome.
