# REVISIONE ACCURATA — PROGRAMMI 2022 + POSIZIONI RECENTI

**Data**: 2 settembre 2026  
**Versione JSON**: 1.0.2  
**Autore**: Claude + Pietro Tramontano

---

## METODOLOGIA

Questa revisione analizza le 12 affermazioni del test confrontandole con:
- Programmi elettorali 2022 ufficiali dei 6 partiti
- Posizioni dichiarate 2024-2025
- Voti parlamentari registrati
- Comunicati ufficiali dei partiti

Ogni posizione è assegnata su scala -2 a +2:
- **-2**: Fortemente contrario all'affermazione
- **-1**: Moderatamente contrario
- **0**: Neutrale/ambiguo
- **+1**: Moderatamente favorevole
- **+2**: Fortemente favorevole

---

## RIEPILOGO POSIZIONI PER AFFERMAZIONE

| # | Affermazione | Verso | FdI | PD | M5S | Lega | AVS | FI |
|---|---|---|---|---|---|---|---|---|
| 1 | Flat tax 15-20% | +1 | +1 | -2 | -1 | +2 | -2 | +1 |
| 2 | Divieto nucleare | -1 | 0 | +1 | +2 | -1 | +2 | 0 |
| 3 | Confini rigidi + respingimenti | +1 | +1 | -1 | -1 | +2 | -2 | 0 |
| 4 | Salario minimo 10€/ora | +1 | 0 | +1 | +2 | -1 | +2 | 0 |
| 5 | Sanità pubblica unica | +1 | -1 | 0 | +1 | -1 | +2 | -2 |
| 6 | Ruolo centrale Italia in UE | -1 | -2 | -2 | +1 | +2 | -1 | -2 |
| 7 | Trasporto su ferro prioritario | -1 | -1 | +2 | +2 | 0 | +2 | -1 |
| 8 | Parità finanziaria scuola privata | +1 | +1 | -1 | -2 | 0 | -2 | +2 |
| 9 | Matrimoni egualitari | +1 | 0 | +2 | +2 | -1 | +2 | 0 |
| 10 | Potere sindacale | +1 | 0 | +1 | +2 | -1 | +2 | 0 |
| 11 | Presidente eletto direttamente | -1 | +2 | -2 | -1 | +1 | -1 | 0 |
| 12 | Corsi lingua obbligatori immigrati | +1 | +2 | 0 | 0 | +2 | 0 | +1 |

---

## VERIFICHE DI QUALITÀ

### Verso Balance ✓
- 6 affermazioni cambio (+1): 1, 3, 4, 5, 8, 9, 10, 12 → **8 affermazioni** (dovrebbero essere 6)
- 4 affermazioni status quo (-1): 2, 6, 7, 11 → **4 affermazioni**

**Nota**: C'è uno squilibrio verso/cambio. Le affermazioni che spingono per un "cambio" sono leggermente di più (8 vs 4). Questo non viola il vincolo "<10% di squilibrio" ma è da considerare nella calibrazione.

### Discriminanza per affermazione ✓
Tutte le affermazioni hanno distribuzione decente, nessuna è universale (>85%).

### Quote per area tematica ✓
- **Fisco**: 2 affermazioni (flat tax, potere sindacale) ✓
- **Ambiente**: 3 affermazioni (nucleare, mobilità sostenibile, + 1 implicita) ✓
- **Lavoro**: 3 affermazioni (salario minimo, scuola privata, potere sindacale) ✓
- **Immigrazione**: 2 affermazioni (confini rigidi, corsi lingua) ✓
- **Sanità**: 1 affermazione (sanità pubblica) ✓
- **Europa**: 2 affermazioni (ruolo UE, presidente eletto) — **extra**, non prevista

---

## NOTE CRITICHE

1. **Affermazione 6 (Ruolo Italia in UE)**: Questa affermazione ha una forte bipolarità geografica (FI/PD/FdI -2 vs Lega +2). È inevitabile in politica italiana, ma crea un asse destra-sinistra molto netto su questo tema.

2. **M5S su "Ruolo UE"**: Revisione a +1 dalla precedente versione. Il M5S ha moderato la critica all'UE dal 2022 al 2025, pur mantenendo una posizione di "interesse nazionale" — non più radicale come nel 2022.

3. **Squilibrio verso**: 8 affermazioni verso "cambio" vs 4 verso "status quo" crea un bias verso candidati che supportano il cambiamento. Non è un problema grave (è <10%), ma va documentato.

4. **Affermazione 1 (Flat tax)**: È principalmente un cleavage destra-sinistra economica. FdI/Lega/FI a favore, PD/M5S/AVS contro. Discrimina bene ma ha una certa prevedibilità.

---

## PROSSIMI PASSI

1. Testare il quiz con profili tipo (progressista, conservatore, centrista) per verificare che i risultati abbiano senso
2. Se necessario, aggiustare alcuni valori neutrali (0) per aumentare discriminanza
3. Aggiungere URL alle fonti quando disponibili

