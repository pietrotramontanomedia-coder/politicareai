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
chi coordina. Il portale si aggiorna da solo ogni minuto, chiedendo solo quello che è cambiato.

Feed, storie, coda e attività mostrano le **ultime tre settimane** (più tutto quello che aspetta
ancora una revisione o una correzione, a qualsiasi età): così il portale resta veloce anche dopo
anni di lavoro. I contenuti più vecchi non spariscono: sono nel profilo di ognuno e nella sua
scheda, con *Mostra i contenuti precedenti*. Percentuali e numeri della squadra si calcolano
sempre su tutto l'archivio.

## Ragazzi, password e schede (per chi coordina)

- *Squadra → Ragazzi della redazione*: si aggiunge ognuno con nome e password personale (salvata
  solo come impronta scrypt). Con l'elenco, il codice comune non vale più per nomi non registrati;
  chi ha una password entra solo con quella. Chi esce si disattiva, il suo lavoro resta.
- Disattivare qualcuno o cambiargli la password lo fa uscire **subito** da tutti i dispositivi
  (non dopo 30 giorni). Lo stesso per un revisore tolto da `REDAZIONE_REVISORI`.
- I revisori non vanno nell'elenco: entrano col codice dei revisori, e il portale rifiuta di
  aggiungere un loro nome fra i ragazzi.
- *Attività*: la cronologia di tutto (pubblicazioni, versioni, commenti, cambi di stato,
  eliminazioni, ripristini), per giorno, filtrabile per persona. Ogni contenuto tiene un registro
  `eventi` che si allunga e non si riscrive; i contenuti di prima lo ricostruiscono da versioni e
  commenti.
- Cliccando un nome nella Squadra si apre la **scheda** della persona: obiettivi di oggi,
  percentuali, ultimi 14 giorni, giorni in pari, approvati al primo colpo, versioni medie, tutti
  i contenuti con i loro commenti e tutte le sue attività.

## Obiettivi e resoconto

- Chi corregge fissa in *Squadra → Obiettivi giornalieri* quante storie e quanti post deve
  pubblicare ognuno al giorno (all'inizio 5 storie e 2 post nei giorni feriali, 2 storie e 1 post sabato e domenica). La giornata è quella italiana.
- Ognuno vede in cima al feed le barre di oggi e, nel profilo, anche le percentuali dei suoi
  contenuti approvati, da correggere ed eliminati (sul totale pubblicato, eliminati compresi).
  Nella tabella della Squadra ci sono la colonna *Oggi* e le percentuali per persona.
- Ogni sera il cron di Vercel chiama `/api/redazione/resoconto` (19:00 UTC: le 21 d'estate, le 20
  d'inverno) e nel gruppo Telegram arriva chi è in pari ✅, chi è indietro ⚠️ e chi non ha
  pubblicato niente ⛔️, più quanti contenuti aspettano una revisione. Con `?anteprima=1` e il
  Bearer `CRON_SECRET` si legge il testo senza mandarlo.

Ogni mattina (cron 07:00 UTC, le 9 d'estate) `/api/redazione/promemoria` manda nel gruppo i
contenuti che aspettano una revisione da più di 24 ore, dal più vecchio; se non ce ne sono non
manda niente. Il resoconto della sera ne riporta il numero.

## Non si perde niente

- **Eliminare non cancella.** Il contenuto sparisce da feed e profili ma resta nell'archivio con
  foto, versioni e correzioni. Chi corregge lo trova in *Squadra → Cestino* e lo ripristina.
  Nessuna funzione del portale cancella file dallo storage. Nel cestino non si commenta: prima si
  ripristina.
- **Storico.** Ogni salvataggio (pubblicazione, nuova versione, commento, cambio di stato,
  eliminazione, ripristino) lascia una copia datata in `redazione/storico/<id>/`: si può
  ricostruire qualsiasi momento passato. Lo stesso per elenco dei ragazzi e obiettivi.
- **Scritture insieme.** Se due revisori commentano o modificano l'elenco nello stesso istante,
  il secondo rilegge e riprova: nessuna modifica si perde.
- **Letture robuste.** Se lo storage non risponde, il server riprova; se non ci riesce, il
  portale tiene quello che mostrava invece di farlo sparire.
- **Bozze.** Il copy si salva nel browser mentre si scrive e torna se la finestra si chiude.
  Chiudere il compositore con card o copy non pubblicati chiede conferma; ogni card caricata
  riprova da sola se cade la rete e non si ricarica al secondo tentativo.

## Avvisi su Telegram

A ogni post, storia o nuova versione arriva nel canale della redazione un messaggio con le card
(o la storia), il copy e il link che apre il contenuto nel portale. Il bot è tutto suo,
@redazionepoliticare_bot: niente in comune con il radar né con il ponte verso X.

1. Creare il bot con @BotFather (`/newbot`, username `redazionepoliticare_bot`) e mettere il
   token su Vercel in `REDAZIONE_TELEGRAM_BOT_TOKEN`.
2. Aggiungere il bot a un gruppo (oggi «POLITICARE TRAINING») o, se si preferisce un canale,
   come amministratore con il permesso di pubblicare.
3. Trovare l'id del canale: `GET /api/redazione/telegram` con `Authorization: Bearer <CRON_SECRET>`
   elenca le chat in cui il bot è stato aggiunto (l'id di un gruppo o di un canale è negativo).
4. Su Vercel: `REDAZIONE_TELEGRAM_CHAT` = quell'id, poi rifare il deploy. `POST` sullo stesso
   indirizzo manda un messaggio di prova.

Se Telegram non risponde la pubblicazione va comunque a buon fine; se le foto non partono
arriva almeno il testo.

## Se qualcosa non va

Chi coordina vede sotto l'avviso rosso del portale il dettaglio tecnico dell'errore, e in
`/api/redazione/diagnostica` (da loggato) ogni passo con lo storage: tipo di store, lista dei
contenuti, lettura per l'indirizzo privato e pubblico, scrittura condizionata, stato dell'indice.

Il revisore può anche dire **Non va bene**, solo scrivendo il perché: il contenuto si chiude, non si corregge e conta a parte nelle percentuali.

Stati: **da rivedere** (appena inviato o nuova versione) → **da correggere** (il revisore ha
chiesto modifiche) → **approvato**.

## Accenderlo (su Vercel)

1. Lo storage privato è quello già usato da radar e Instagram (`BLOB_READ_WRITE_TOKEN`): non
   serve altro.
2. In *Settings → Environment Variables* aggiungere:
   - `REDAZIONE_CODICE`: il codice da dare ai ragazzi;
   - `REDAZIONE_CODICE_REVISORI`: il codice di chi corregge, diverso dal primo;
   - `REDAZIONE_REVISORI`: i nomi di chi corregge, separati da virgola (oggi Pietro Tramontano,
     Jacopo Esposito, Federico Brignacca). La password dei revisori vale solo con questi nomi, e
     questi nomi non possono entrare con il codice dei ragazzi;
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
├── blob-server.ts       Vercel Blob: si adatta allo store (pubblico/privato), ETag, letture fresche
├── archivio-server.ts   archivio (o memoria): indice dei contenuti, copie, foto, storico
├── api-server.ts        sessione obbligatoria ed errori in JSON per le API
├── client.ts            chiamate dal browser e riduzione delle foto
└── testi.ts             testi dell'interfaccia
app/api/redazione/       accesso, contenuti, commenti, media
components/redazione/    portale, compositore, anteprime, dettaglio, visore delle storie
test/redazione.test.ts            regole, sessioni e API
test/redazione-archivio.test.ts   indice su Blob: migrazione, scritture insieme, costo di un aggiornamento
```

- **Storage**: tutto passa da `blob-server.ts`, che si adatta allo store senza configurazione:
  capisce se è pubblico o privato dall'indirizzo dei file che contiene (`REDAZIONE_BLOB_ACCESSO`
  per forzarlo), pulisce il token da spazi e virgolette, legge i metadati con `head` (sempre
  freschi: l'ETag che ne esce è quello buono per le scritture condizionate) e scarica il file per
  l'indirizzo che l'API dice suo, con un parametro legato all'ETag così la CDN non serve mai una
  versione vecchia. Se lo store rifiuta la lettura per l'indirizzo privato (403) prova per quello
  pubblico e se lo ricorda. Con uno store **pubblico** le foto sono raggiungibili da chi conosce
  l'indirizzo esatto (non indovinabile, ma non protetto dal login): per avere foto davvero
  private serve uno store privato, con il suo token in `BLOB_READ_WRITE_TOKEN`.
- **Archivio**: tutti i contenuti stanno in un solo indice, `redazione/indice.json`, che è la
  fonte di verità; ogni contenuto ha anche la sua copia in `redazione/contenuti/<id>.json`. Il
  server tiene l'indice in memoria e a ogni richiesta chiede allo storage solo se è cambiato
  (If-None-Match → 304): un aggiornamento del portale costa una domanda leggera, non una lettura
  per contenuto. Prima di questo indice ogni aggiornamento rileggeva tutti i file uno per uno,
  e con centinaia di contenuti il portale diventava lento, consumava le operazioni di Blob e
  rischiava di superare i 4,5 MB di risposta delle funzioni Vercel. Al primo avvio l'indice si
  costruisce da solo dalle copie dei contenuti: non serve fare niente. Una funzione Vercel ha
  pochi secondi, quindi si costruisce **a tappe**: ogni richiesta legge quel che fa in tempo (7 s,
  `REDAZIONE_COSTRUZIONE_MS`), salva i progressi e risponde «in costruzione»; il portale mostra un
  avviso e riprova da solo ogni 4 secondi finché è pronto. Nel frattempo non si pubblica (la
  pubblicazione riprova). Una copia che non si legge si salta e la riprende il riallineamento.
- **Riallineamento**: due volte al giorno, con il promemoria e il resoconto, il server confronta
  le copie dei contenuti con l'indice e recupera quelle più recenti (per esempio scritte dalla
  versione precedente del sito nei secondi del cambio). Costa una lista e legge solo i file sospetti.
- **Revisioni**: ogni scrittura porta avanti la revisione dell'archivio e la segna sul
  contenuto. Il browser chiede `?dal=<revisione>` e riceve solo quello che è cambiato (più gli id
  di ciò che non deve più vedere); fra due copie dello stesso contenuto tiene quella con la
  revisione più alta, così una risposta in ritardo non cancella una modifica appena fatta.
- **Foto**: il browser le riduce (lato lungo 1920 px, JPEG di qualità alta perché sono card con
  testo) prima di caricarle, una per richiesta, così si resta sotto il limite di 4,5 MB delle
  funzioni Vercel e i dati EXIF (posizione compresa) non arrivano al server. Le parti trasparenti
  dei PNG diventano bianche (nel JPEG sarebbero nere). Il server accetta solo JPEG, PNG e WebP
  veri, riconosciuti dai primi byte. Nel feed le immagini si caricano solo quando servono.
- **Modifiche concorrenti**: ogni scrittura è condizionata all'ETag letto; se due persone
  scrivono insieme, la seconda rilegge e riprova invece di sovrascrivere.
- **Permessi** (in `regole.ts`, verificati dai test): solo l'autore pubblica nuove versioni;
  autore e revisori eliminano e vedono le correzioni; solo i revisori cambiano lo stato.
- **Sessioni**: il cookie firmato porta il nome, il ruolo e, per chi entra con la password
  personale, un segno di quella password. A ogni richiesta il server controlla che la persona
  sia ancora attiva e che la password non sia cambiata (le foto saltano il controllo: senza
  l'elenco dei contenuti non si sa quali chiedere).
