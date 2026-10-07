# Newsletter Politicare

Sistema di newsletter interno, al posto di Mailchimp: **Listmonk** (pannello, contatti, campagne,
statistiche) su un piccolo server in UE, con la consegna affidata ad **Amazon SES**.

```
 Excel/CSV ──► convertitore (sul vostro PC) ──► Listmonk ──► Amazon SES ──► caselle degli iscritti
                                                  ▲               │
                                                  └── rimbalzi e segnalazioni di spam (SNS)
```

| Voce | Costo indicativo |
|---|---|
| Amazon SES: 4.000 contatti × ~9 invii/mese ≈ 36.000 mail | ~3,60 $/mese (0,10 $ ogni 1.000) |
| Server Hetzner (2 vCPU, 4 GB) + backup Hetzner | ~5–6 €/mese |
| Listmonk | gratuito (open source) |
| **Totale** | **~8–10 €/mese** |

Il database della newsletter è **separato** dall'app Politicare: niente in comune con Supabase,
con il profilo o con il quiz, e **nessun dato del test partiti** (CLAUDE.md, vincolo 2).
I contatti non vanno mai salvati in questo repository.

---

## Cosa c'è in questa cartella

| File | A cosa serve |
|---|---|
| `server/docker-compose.yml` | Listmonk 6.2.0 + Postgres + Caddy (HTTPS automatico) |
| `server/installa.sh` | installa tutto su un server Ubuntu nuovo, con firewall e aggiornamenti automatici |
| `server/cloud-config.yaml` | da incollare in Hetzner alla creazione del server: installa tutto da solo (si rigenera con `genera-cloud-config.mjs`) |
| `server/backup.sh` | copia notturna del database, tiene 14 giorni |
| `server/esempio.env` | modello delle variabili (il vero `.env` lo crea `installa.sh`) |
| `convertitore/converti.html` | **pagina da aprire con doppio clic**: trasforma il vostro Excel nel file per Listmonk |
| `convertitore/modello-evento.csv` | foglio vuoto da usare agli eventi |
| `modelli/newsletter.html` | modello grafico Politicare per tutte le campagne |
| `modelli/primo-numero.html` | esempio di prima campagna |
| `modelli/logo-email.png` | logo ridimensionato per le mail |
| `aws/richiesta-produzione.md` | testo da incollare nella richiesta ad Amazon |
| `privacy/informativa-newsletter.md` | bozza di informativa, **da far verificare a un legale** |
| `privacy/testi-moduli.md` | caselle di consenso per sito ed eventi |

---

## Cosa serve per partire (circa 1 ora e mezza, più l'attesa di Amazon)

- [ ] una carta per gli account AWS e Hetzner
- [ ] accesso al pannello DNS di **politicare.it** (chi gestisce il dominio?)
- [ ] una casella che riceve le risposte, es. `newsletter@politicare.it` o `redazione@politicare.it`
- [ ] il file Excel dei contatti salvato come CSV
- [ ] ragione sociale e indirizzo del titolare, da mettere nel piede delle mail e nell'informativa

L'ordine conviene: **prima Amazon** (l'uscita dalla sandbox può richiedere 1–2 giorni lavorativi),
poi server e Listmonk, poi importazione e primo invio di prova.

---

## 1. Amazon SES

1. Create un account su <https://aws.amazon.com> e attivate la **verifica in due passaggi** sull'utente root.
2. In alto a destra scegliete la regione **Europe (Frankfurt) — eu-central-1**. Tutto quello che segue va fatto
   in questa regione.
3. Aprite **Amazon SES → Configuration → Identities → Create identity**:
   - tipo **Domain**, dominio `politicare.it`
   - **Use a custom MAIL FROM domain**: `bounce.politicare.it`, comportamento in caso di errore: *Use default MAIL FROM*
     (non `mail`: su Aruba quel nome è riservato alla posta del dominio e non si può usare)
   - **Easy DKIM**, chiave RSA 2048, *Publish DNS records to Route53* disattivato
4. SES mostra i record DNS da creare (sezione 3 qui sotto). Dopo averli inseriti, lo stato diventa *Verified*
   in genere in meno di un'ora.
5. **SMTP settings → Create SMTP credentials**: si crea un utente dedicato. Salvate subito nome utente e
   password SMTP in un gestore di password: la password non viene mostrata di nuovo.
6. **Account dashboard → Request production access**. Tipo di mail: *Marketing*. Sito: `https://www.politicare.it`.
   Il testo da incollare è in `aws/richiesta-produzione.md`. Finché non arriva l'approvazione si può
   mandare solo a indirizzi verificati: va bene per tutte le prove.

## 2. Server

1. Su <https://www.hetzner.com/cloud> create un progetto e un server:
   - immagine **Ubuntu 24.04**, sede in UE (Norimberga, Falkenstein o Helsinki)
   - il tipo condiviso più piccolo con 2 vCPU e 4 GB: **CX23** (Intel/AMD) o **CAX11** (Arm), circa 4–6 €/mese.
     Va bene anche Arm: Listmonk, Postgres e Caddy hanno le immagini arm64. Evitate i CPX, costano 3–4 volte tanto
   - aggiungete la vostra **chiave SSH** (niente password) e attivate **Backups**
   - **Cloud config**: incollate tutto il contenuto di `server/cloud-config.yaml`. All'accensione il server
     installa Listmonk da solo (5–10 minuti); i passi 4 e 5 qui sotto non servono più.
2. Annotate l'indirizzo IPv4 del server.
3. Create il record DNS `newsletter.politicare.it` → IPv4 del server (sezione 3).
   Utente e password dell'amministratore si leggono dalla console del server (Hetzner → server → *Console*):
   `grep ADMIN /opt/newsletter/.env`. Se qualcosa non va: `tail -50 /var/log/cloud-init-output.log`.
4. Solo senza cloud config: copiate questa cartella `server/` sul server. Da un computer con il repository:
   ```bash
   scp -r strumenti/newsletter/server root@IP_DEL_SERVER:/opt/newsletter
   ```
5. Collegatevi e installate:
   ```bash
   ssh root@IP_DEL_SERVER
   cd /opt/newsletter
   chmod +x installa.sh backup.sh
   ./installa.sh newsletter.politicare.it
   ```
   Alla fine lo script stampa utente e password dell'amministratore: **salvateli subito**.

Nota: Hetzner blocca le porte 25 e 465 in uscita. Non ci riguarda, perché SES si usa sulla porta 587.

## 3. Record DNS su politicare.it

Prima di aggiungere qualcosa, **guardate cosa c'è già**: non va toccato il record SPF del dominio
principale (serve alla posta che usate oggi), e se esiste già un `_dmarc` non se ne crea un secondo.

**Su Aruba** (dove è registrato politicare.it): *Area clienti → Pannello di controllo → politicare.it →
Gestione DNS e Name Server → Gestione DNS*. Nel campo del nome si scrive **solo la parte prima del dominio**
(`newsletter`, `bounce`, `xxxx._domainkey`): Aruba aggiunge `.politicare.it` da solo. Se il pannello non
permette di modificare i record, i name server non sono quelli di Aruba e i record vanno messi dove puntano.
La casella per le risposte (`newsletter@politicare.it`) si crea dal pannello Email di Aruba, come casella
o come alias verso una casella esistente.

| Tipo | Nome | Valore | Perché |
|---|---|---|---|
| A | `newsletter` | IPv4 del server Hetzner | pannello, link e pagine di disiscrizione |
| CNAME ×3 | `xxxx._domainkey` | `xxxx.dkim.amazonses.com` (li dà SES) | firma DKIM delle mail |
| MX | `bounce` | `10 feedback-smtp.eu-central-1.amazonses.com` | MAIL FROM personalizzato (rimbalzi) |
| TXT | `bounce` | `"v=spf1 include:amazonses.com ~all"` | SPF allineato al dominio |
| TXT | `_dmarc` | `"v=DMARC1; p=none; rua=mailto:dmarc@politicare.it"` | DMARC, **solo se non esiste già** |

Dopo un mese di invii puliti si può passare il DMARC a `p=quarantine`.

## 4. Impostazioni di Listmonk

Aprite `https://newsletter.politicare.it/admin` ed entrate con le credenziali dell'installazione.
I nomi dei menu sono quelli dell'interfaccia inglese; la lingua si cambia nel primo passo.

**Settings → General**
- Root URL: `https://newsletter.politicare.it`
- Default 'from' email: `Politicare <newsletter@politicare.it>`
- Language: **Italiano**

**Settings → Media**: provider *filesystem*, upload path `/listmonk/uploads`, upload URI `/uploads`.
Poi da **Media** caricate `modelli/logo-email.png` (deve risultare `https://newsletter.politicare.it/uploads/logo-email.png`).

**Settings → SMTP** (togliete il server di esempio e aggiungetene uno):
- Host `email-smtp.eu-central-1.amazonaws.com`, porta `587`
- Auth protocol `LOGIN`, nome utente e password SMTP del punto 1.5
- TLS `STARTTLS`, *Skip TLS verification* disattivato
- Max. connections `10`, Retries `2`
- **Test connection** con la vostra email: deve arrivare

**Settings → Bounces** (impostazioni consigliate da Listmonk per SES):
- Enable bounce processing: attivo
- Soft: count `2`, action `None` · Hard: count `1`, action `Blocklist` · Complaint: count `1`, action `Blocklist`
- Enable bounce webhooks: attivo · Enable SES: attivo
- Poi in AWS: **SNS → Topics → Create topic** (Standard, nome `ses-bounces`) → **Create subscription**
  protocollo HTTPS, endpoint `https://newsletter.politicare.it/webhooks/service/ses`, *raw message delivery* disattivato.
  Dopo pochi secondi la sottoscrizione deve risultare *Confirmed*.
- In **SES → Identities → politicare.it → Notifications → Feedback notifications → Edit**: bounce e complaint
  sul topic `ses-bounces`, con *Include original email headers* attivo.
- Prova: aggiungete come iscritti `bounce@simulator.amazonses.com` e `complaint@simulator.amazonses.com`,
  mandate loro un'anteprima e controllate che finiscano in blocklist.

**Settings → Privacy**
- *Include `List-Unsubscribe` header*: **attivo** (Gmail e Yahoo lo richiedono a chi invia in massa)
- *Allow unsubscribe / preferences / exporting / wiping*: attivi (diritti GDPR in autonomia)
- *Individual subscriber tracking*: **da decidere con il legale**. Spento, le statistiche sono per campagna
  (quante aperture, quanti clic su ogni link) senza sapere *chi*. Acceso, si vede chi ha aperto e cliccato:
  utile per ripulire gli inattivi, ma va dichiarato nell'informativa e conviene chiederne il consenso.

**Settings → Performance**: Concurrency `5`, Message rate `10` (al secondo, sotto il limite iniziale di SES).

**Lists → New**: `Newsletter Politicare`, tipo *Private*, opt-in **Single**.

**Campaigns → Templates → New**: nome `Politicare`, incollate `modelli/newsletter.html`, salvate e
impostatelo come predefinito. Prima: sostituite `[RAGIONE SOCIALE E INDIRIZZO DEL TITOLARE]` e controllate
che il link Privacy punti alla pagina giusta.

## 5. Importare i contatti

1. In Excel: **File → Salva con nome → CSV (delimitato dal separatore di elenco)**.
2. Aprite `convertitore/converti.html` con un doppio clic (Chrome, Edge, Firefox o Safari). Funziona senza
   internet: il file non lascia il computer.
3. Trascinate il CSV. La pagina riconosce da sola colonne come Email, Nome, Cognome, Telefono/Cellulare,
   Città, Provincia, Data iscrizione, Evento/Provenienza, Consenso newsletter, Consenso SMS. Le altre colonne
   vengono conservate così come sono. Sistema anche:
   - email in minuscolo, domini sbagliati comuni (`gmial.com` → `gmail.com`), indirizzi non validi scartati
   - telefoni in formato `+39…`; quelli rovinati da Excel (`3,33E+09`) vengono segnalati
   - date in formato `AAAA-MM-GG`, nomi in maiuscolo corretti (`MARIO ROSSI` → `Mario Rossi`)
   - doppioni uniti in un solo contatto; se c'è la colonna del consenso newsletter, entra solo chi ha «sì»
4. Scaricate **il file per Listmonk** e **il file di controllo** (righe scartate e da verificare, si apre in Excel).
5. In Listmonk: **Subscribers → Import**: modalità *Subscribe*, lista `Newsletter Politicare`,
   stato *Unconfirmed* (nelle liste single opt-in ricevono comunque), delimitatore **virgola**,
   *Overwrite* disattivato. Caricate il file.

Gli attributi di ogni contatto (telefono, città, evento…) si vedono aprendo l'iscritto e si possono usare
nelle mail, ad esempio `{{ .Subscriber.Attribs.citta }}`.

## 6. Avvio graduale (le prime 2–3 settimane)

Un dominio che non ha mai spedito e manda 4.000 mail il primo giorno finisce nello spam. Il convertitore
ha diviso i contatti in 5 gruppi (`gruppo_avvio`), mettendo prima gli iscritti più recenti, che aprono di più.

| Invio | A chi | Circa |
|---|---|---|
| 1 | gruppo 1 | 200 |
| 2 | gruppi 1–2 | 600 |
| 3 | gruppi 1–3 | 1.400 |
| 4 | gruppi 1–4 | 2.600 |
| 5 e seguenti | tutti | 4.000 |

Per creare la lista di un invio: **Subscribers → Advanced**, scrivete la condizione, **Query**, selezionate
tutti, **Manage lists → Add** alla lista `Avvio 2` (e così via):

```sql
(subscribers.attribs->>'gruppo_avvio')::int <= 2
```

**Prima di ogni passo** guardate i numeri dell'invio precedente: rimbalzi sotto il **2%** e segnalazioni
di spam sotto lo **0,1%**. Se si superano, ci si ferma e si controlla la lista prima di salire.
Con due invii a settimana si arriva a tutta la lista in circa due settimane e mezza.

## 7. Contatti dagli eventi

- Agli eventi usate `convertitore/modello-evento.csv` (si apre in Excel). La colonna dei consensi va compilata
  **per davvero**, con i testi di `privacy/testi-moduli.md` sul foglio o sul tablet.
- Dopo l'evento: convertitore, scrivete il nome dell'evento nella casella apposita, togliete la spunta
  dei gruppi di avvio, importate nella lista principale **e** in una lista dell'evento (es. `Evento Napoli 2026`)
  per poter scrivere solo a loro.
- Telefono: si conserva, ma per SMS o WhatsApp serve il consenso specifico (`consenso_sms`), separato da quello
  per la newsletter. Listmonk non manda SMS: se servirà, si aggiunge dopo.

## 8. Ogni campagna, prima di premere «Invia»

- [ ] oggetto breve e concreto, niente MAIUSCOLE né «GRATIS!!!»
- [ ] link con `@TrackLink` se volete contarne i clic
- [ ] **Send test** a voi stessi su Gmail e su un indirizzo Libero/Outlook: controllate spam, grafica e link
- [ ] ogni tanto: test su <https://www.mail-tester.com> (punteggio da 9/10 in su)
- [ ] lista giusta (durante l'avvio: la lista del passo corrente)

## 9. Statistiche

**Campaigns → (campagna) → Analytics** e la **Dashboard** mostrano invii, aperture, clic per link,
rimbalzi e disiscrizioni nel tempo.

- **Le aperture sono gonfiate**: Apple Mail scarica in automatico le immagini per proteggere la privacy, e
  ogni mail letta su iPhone conta come «aperta». Il dato affidabile sono **i clic**.
- Per leggere i numeri con Claude e avere un report dopo ogni invio: **Users → New**, tipo *API*, con un ruolo
  di sola lettura su campagne e statistiche. Il token si inserisce come segreto dell'ambiente, mai in chat.

## 10. Manutenzione

| Quando | Cosa |
|---|---|
| da solo | aggiornamenti di sicurezza di Ubuntu (unattended-upgrades), backup del database alle 3:30 |
| ogni mese | `cd /opt/newsletter && ./backup.sh && ls backup/` per controllare che i backup ci siano |
| a ogni nuova versione di Listmonk | cambiate il numero in `docker-compose.yml`, poi `docker compose pull && docker compose up -d` (le migrazioni partono da sole) |
| ogni 6 mesi | togliere dalla lista chi non apre e non clicca da 12 mesi (migliora la consegna) |

Ripristino di un backup:
```bash
gunzip -c backup/listmonk-AAAA-MM-GG.sql.gz | docker compose exec -T db psql -U listmonk listmonk
```

## Da chiarire

- **Legale**: informativa, tracciamento individuale sì/no, testi dei moduli d'evento, tempi di conservazione.
- **Par condicio** (legge 28/2000): nei periodi elettorali le comunicazioni politiche hanno regole proprie;
  vale anche per la newsletter (vedi CLAUDE.md, «Da chiarire prima del lancio»).
- **Chi può entrare nel pannello**: un utente per persona (Users), niente password condivise.
