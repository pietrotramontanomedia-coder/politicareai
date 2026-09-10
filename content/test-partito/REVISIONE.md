# Revisione del pack test-partito-2027 — versione 3.0.0

**Data**: 10 settembre 2026
**Autori**: Pietro Tramontano, Redazione Politicare (ricerca assistita)

Aggiorna la revisione del 9 settembre 2026 (v2.0.0, 11 partiti). Le 20 affermazioni
restano invariate; cambiano i partiti e alcune fonti.

## Cosa cambia nella 3.0.0

1. **Entrano due partiti**: Partito Liberaldemocratico (Luigi Marattin) e Ora!
   (Michele Boldrin). Il test passa da 11 a 13 partiti.
2. **Sud chiama Nord è stato valutato ma resta fuori**: si arriva a 6 posizioni
   documentate su 20, sotto la copertura minima del 50%. Le sei trovate, pronte per
   quando il partito pubblicherà un programma aggiornato:
   - premierato favorevole (programma politiche 2022, depositato al Viminale)
   - premio di maggioranza favorevole con riserva (stesso programma: maggioranza
     «rafforzata da un premio elettorale»)
   - separazione delle carriere: voto favorevole di Francesco Gallo alla Camera
     (18/9/2025)
   - SAFE e riarmo contrario: Laura Castelli, «Follia spendere 800 mld in armi» (marzo 2025)
   - salario minimo a 9 euro contrario: Castelli, «proposte irrealistiche come il
     salario minimo presentato dalla Schlein» (3/9/2025)
   - nucleare neutro: astensione di Gallo sulla legge delega (4/6/2026)
3. **Fonti più recenti** per i partiti già presenti:
   - salario minimo: FdI, Lega, FI, NM, PD, M5S e AVS ora citano il voto
     definitivo del Senato sulla delega (23/9/2025) al posto dei voti del 2022-2023
   - autonomia differenziata: PD, AVS e IV citano il voto del Senato sulle
     pre-intese (16/7/2026), NM quello della Camera (21/7/2026)
   - la fonte precedente resta riportata nella `nota` di ogni posizione
4. **Voti nominali dai dati aperti della Camera** (dati.camera.it) per i deputati
   dei partiti senza gruppo proprio: così sono documentati il sì di Marattin alla
   separazione delle carriere e alla legge delega sul nucleare. Dove il voto è segreto
   (legge elettorale del 16/7/2026) o il deputato non ha votato, non si deduce nulla.

## Metodo (invariato)

- Gerarchia delle fonti: voto > programma o documento ufficiale > dichiarazione datata
  del leader. Senza fonte il valore è `null`, mai `0`.
- Rubrica: ±2 solo con voto o programma esplicito; ±1 con condizioni o solo per
  dichiarazione; 0 solo per neutralità documentata. Con confidenza bassa mai ±2.
- Priorità alle fonti degli ultimi dodici mesi. Si tiene una fonte più vecchia solo se
  sul tema non c'è un fatto più recente: per esempio il referendum dell'8-9 giugno 2025
  resta l'ultimo pronunciamento su Jobs Act e cittadinanza, e il premierato è fermo in
  commissione alla Camera da luglio 2024.
- Dichiarazioni ambigue scartate invece che interpretate. Per esempio sul SAFE, Marattin
  dice che l'Europa «deve sapere badare alla propria sicurezza», ma critica anche un
  governo che «si indebita per comprare armi»: la casella resta vuota.

## Copertura

Posizioni documentate: 224 su 260. Per tipo: dichiarazione 112, voto 69, programma 43.
Per confidenza: media 121, alta 91, bassa 12. Fonti datate più vecchie di dodici mesi: 83
(erano 91 su 199 nella 2.0.0).

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
| PLD | 13/20 | fisco-patrimoniale, fisco-banche, immigrazione-albania, istituzionale-premierato, europa-safe, ambiente-auto-2035, diritti-fine-vita |
| Ora! | 12/20 | fisco-flat-tax, fisco-banche, lavoro-jobs-act, istituzionale-premierato, istituzionale-autonomia, giustizia-carriere, europa-euro-patto, ambiente-auto-2035 |

Concordanza: nessuna affermazione supera l'85% di partiti con lo stesso valore; la più
alta è sanita-privata (78% dei partiti con posizione sono dallo stesso lato).

### Le fonti dei nuovi partiti

- **PLD**: documenti programmatici su fisco, riforme istituzionali, sanità e immigrazione
  (partitoliberaldemocratico.com), voti nominali di Marattin alla Camera e sue
  dichiarazioni datate 2025-2026.
- **Ora!**: pagina ufficiale «Le nostre posizioni politiche», che riassume le tesi
  programmatiche votate dal partito, e il comunicato sullo Stabilicum del 23 luglio 2026.
  Ora! non ha parlamentari, quindi non ci sono voti.

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
(squilibrio 5%, entro il 10%).

## Da fare prima del lancio

- aprire ogni link e confermare la citazione; correggere le date approssimate al mese
- inviare il questionario ai partiti, compresi PLD, Ora! e Sud chiama Nord: la risposta
  diretta sostituisce le dichiarazioni e può far entrare Sud chiama Nord
- rinnovare le fonti di Azione, IV e +Europa, che hanno ancora 10-12 posizioni con fonti
  anteriori a settembre 2025
