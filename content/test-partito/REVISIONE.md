# Revisione del pack test-partito-2027 — versione 2.0.0

**Data**: 9 settembre 2026
**Autori**: Pietro Tramontano, Redazione Politicare (ricerca assistita)

Sostituisce la revisione del 2 settembre 2026 (v1.0.2), che aveva 18 affermazioni,
10 partiti e nessun URL nelle fonti.

## Metodo

1. Le 20 affermazioni sono state riformulate sullo stato delle cose a settembre 2026
   (fact-check con fonti datate: esito del referendum sulla separazione delle carriere,
   soglia del premio nella legge elettorale al Senato, richiesta SAFE di agosto 2026,
   revisione dello stop auto 2035, leggi regionali sul fine vita, ecc.).
2. Per ogni coppia partito/affermazione si è cercata una fonte secondo la gerarchia
   voto > programma > dichiarazione del leader con data. Nessuna posizione è dedotta:
   senza fonte il valore è `null`.
3. Rubrica meccanica: ±2 solo con voto o programma esplicito; ±1 con condizioni o solo
   per dichiarazione; 0 solo per neutralità o spaccatura documentate. Ogni posizione ha
   una `confidenza`; con confidenza bassa mai ±2.
4. Ogni URL è stato verificato contro i risultati di ricerca registrati: 199 su 199.
   L'accesso diretto ai siti non era possibile dall'ambiente di lavoro, quindi le
   citazioni derivano dai riassunti dei risultati di ricerca: **prima della pubblicazione
   vanno aperti i link** (elenco completo su `/metodologia/fonti`).
5. Voci scartate dal comitato perché indirette o datate: IV su premio di maggioranza,
   FN su premierato (il programma propone un'altra forma di presidenzialismo), M5S su
   auto 2035 (fonte del 2020), Lega su sanità privata (fonte del 2018).

## Copertura

Posizioni documentate: 199 su 220. Per tipo: {'dichiarazione': 105, 'voto': 61, 'programma': 33}. Per confidenza: {'media': 110, 'alta': 80, 'bassa': 9}.

| Partito | Documentate | Caselle vuote |
|---|---|---|
| FdI | 20/20 | — |
| PD | 19/20 | lavoro-pensioni |
| M5S | 17/20 | lavoro-pensioni, ambiente-auto-2035, sanita-privata |
| Lega | 19/20 | sanita-privata |
| FI | 20/20 | — |
| AVS | 19/20 | ambiente-auto-2035 |
| FN | 15/20 | fisco-patrimoniale, fisco-banche, lavoro-jobs-act, istituzionale-premierato, sanita-privata |
| Azione | 19/20 | europa-euro-patto |
| IV | 18/20 | istituzionale-premio, europa-euro-patto |
| +EU | 15/20 | fisco-banche, lavoro-jobs-act, europa-euro-patto, ambiente-auto-2035, sanita-privata |
| NM | 18/20 | fisco-flat-tax, ambiente-auto-2035 |

## Le 20 affermazioni

| # | id | verso | testo |
|---|---|---|---|
| 1 | fisco-flat-tax | cambiamento | La flat tax va estesa a dipendenti e pensionati, oggi soggetti all'IRPEF progressiva a tre aliquote, come già avviene per gli autonomi in regime forfettario |
| 2 | fisco-patrimoniale | cambiamento | Va introdotta un'imposta patrimoniale sulla parte di patrimonio netto superiore a 5 milioni di euro |
| 3 | fisco-banche | cambiamento | Le banche devono pagare un contributo straordinario obbligatorio sugli extraprofitti, non un accordo volontario come nella manovra 2026 |
| 4 | lavoro-salario-minimo | cambiamento | Va introdotto per legge un salario minimo di 9 euro lordi l'ora |
| 5 | lavoro-jobs-act | assetto vigente | Le regole del Jobs Act sui licenziamenti illegittimi nelle imprese con più di 15 dipendenti, che prevedono di norma un indennizzo e non il reintegro, vanno mantenute |
| 6 | lavoro-pensioni | cambiamento | Bisogna consentire la pensione con 41 anni di contributi a qualsiasi età (Quota 41 per tutti), superando i requisiti attuali della legge Fornero |
| 7 | immigrazione-albania | assetto vigente | I centri per migranti in Albania (Shengjin e Gjader) vanno mantenuti e presi a modello per la gestione dei flussi |
| 8 | immigrazione-cittadinanza | cambiamento | La cittadinanza va concessa ai minori stranieri che completano un ciclo di studi in Italia (ius scholae), senza aspettare i 18 anni come oggi |
| 9 | istituzionale-premierato | cambiamento | Il Presidente del Consiglio deve essere eletto direttamente dai cittadini (premierato) |
| 10 | istituzionale-premio | cambiamento | La legge elettorale deve dare un premio di maggioranza alla coalizione che supera una soglia di voti (il 42% nel testo in discussione al Senato) |
| 11 | istituzionale-autonomia | assetto vigente | L'autonomia differenziata delle Regioni (legge Calderoli del 2024) va mantenuta e attuata |
| 12 | giustizia-carriere | assetto vigente | Dopo il No al referendum del marzo 2026, la carriera unica di giudici e pubblici ministeri con un solo Consiglio superiore della magistratura va mantenuta |
| 13 | europa-safe | assetto vigente | L'Italia deve usare i prestiti europei SAFE, richiesti dal governo nell'agosto 2026, per aumentare la spesa militare |
| 14 | europa-euro-patto | assetto vigente | L'Italia deve restare nell'euro e rispettare le regole del Patto di stabilità europeo |
| 15 | esteri-ucraina | assetto vigente | L'Italia deve continuare a inviare armi all'Ucraina |
| 16 | esteri-palestina | cambiamento | L'Italia deve riconoscere lo Stato di Palestina |
| 17 | ambiente-nucleare | cambiamento | L'Italia deve tornare a produrre energia nucleare, anche con reattori di nuova generazione |
| 18 | ambiente-auto-2035 | assetto vigente | Lo stop europeo alle nuove auto a benzina e diesel dal 2035 va confermato al 100%, respingendo la revisione al 90% proposta dalla Commissione europea |
| 19 | diritti-fine-vita | cambiamento | Serve una legge nazionale che garantisca l'accesso al suicidio medicalmente assistito nei casi indicati dalla Corte costituzionale |
| 20 | sanita-privata | assetto vigente | Il ruolo della sanità privata convenzionata nel Servizio sanitario nazionale va mantenuto e non ridotto |

Bilanciamento: 11 affermazioni propongono un cambiamento, 9 difendono l'assetto vigente
(squilibrio 5%, entro il 10%). Nessuna affermazione supera l'85% di partiti concordi.

## Da fare prima del lancio

- aprire ogni link e confermare la citazione; correggere le date approssimate al mese
- inviare il questionario ai partiti: la risposta diretta sostituisce le dichiarazioni
- rivalutare le caselle vuote di Futuro Nazionale e +Europa quando pubblicano documenti
