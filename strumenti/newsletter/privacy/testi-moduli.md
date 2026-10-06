# Testi per i moduli di iscrizione

> Bozza da far verificare insieme all'informativa. Regole che valgono sempre:
> caselle **non spuntate** in partenza, un consenso per ogni scopo, link all'informativa visibile.

## Sito (modulo newsletter)

> **Email** ____________________  **Nome** (facoltativo) ____________________
>
> ☐ Voglio ricevere la newsletter di Politicare, un paio di email a settimana. Posso disiscrivermi
> quando voglio. Ho letto l'[informativa](https://www.politicare.it/privacy-newsletter/).
>
> [ Iscrivimi ]

## Evento (foglio cartaceo o tablet)

Intestazione del foglio:

> **Resta in contatto con Politicare**
> I dati servono solo per le finalità che spunti qui sotto. Informativa completa:
> politicare.it/privacy-newsletter · Titolare: [RAGIONE SOCIALE]

Colonne (le stesse di `convertitore/modello-evento.csv`):

| Nome | Cognome | Email | Telefono | Città | Consenso newsletter (sì/no) | Consenso SMS/WhatsApp (sì/no) |
|---|---|---|---|---|---|---|

Tenete questi nomi di colonna: il convertitore li riconosce da soli.

Note per chi raccoglie i dati all'evento:
- chi non mette «sì» nel consenso newsletter **non va importato** (il convertitore esclude chi ha «no» o la cella vuota);
- il telefono senza la seconda spunta si può conservare, ma non si usa per mandare messaggi;
- i fogli di carta, una volta trascritti, vanno distrutti.

## Primo messaggio dopo l'evento (facoltativo, consigliato)

Una mail di benvenuto entro pochi giorni, che ricorda dove ci si è iscritti e offre subito la
disiscrizione. Riduce le segnalazioni di spam da parte di chi non si ricorda di essersi iscritto.
