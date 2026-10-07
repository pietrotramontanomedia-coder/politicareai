# Richiesta di uscita dalla sandbox di Amazon SES

Da **SES → Account dashboard → Request production access**, regione eu-central-1.
Amazon legge le richieste in inglese: il testo qui sotto va incollato così com'è, dopo aver
controllato i numeri tra parentesi quadre.

- **Mail type:** Marketing
- **Website URL:** https://www.politicare.it
- **Additional contacts:** l'indirizzo di chi segue la newsletter
- **Preferred contact language:** English

**Use case description:**

```
Politicare (https://www.politicare.it) is an Italian civic-education project: interactive tests
and a weekly quiz about Italian politics and institutions. We are moving our existing newsletter
from Mailchimp to a self-hosted listmonk instance that sends through Amazon SES.

Recipients: about [4,000] subscribers who opted in on our website or at our public events.
Every record keeps the date and source of consent. We do not buy, rent or scrape addresses.

Volume: about 2 campaigns per week, so roughly [36,000] emails per month. During the first
weeks we will ramp up gradually (200, 600, 1,400, 2,600, then the full list), starting with the
most recently subscribed contacts.

Bounces and complaints: SES feedback notifications are delivered through SNS to listmonk's
SES webhook. Hard bounces and complaints are blocklisted automatically after the first event;
soft bounces are tracked. Before the first send the list is cleaned of invalid and duplicate
addresses.

Unsubscribe: every message has a visible unsubscribe link and the List-Unsubscribe /
List-Unsubscribe-Post (one-click) headers; unsubscribes take effect immediately.

Authentication: the domain politicare.it is verified with Easy DKIM, a custom MAIL FROM domain
(bounce.politicare.it) with SPF, and a DMARC policy.

Content: news digests, quiz invitations and explanations of public policy topics, in Italian.
```

Se Amazon risponde chiedendo dettagli, di solito vuole sapere **come avete raccolto gli indirizzi**
e **come gestite rimbalzi e disiscrizioni**: le risposte sono già qui sopra, basta riformularle.
