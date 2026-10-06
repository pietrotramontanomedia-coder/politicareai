/*
 * Convertitore dei contatti per Listmonk: logica pura, senza rete e senza DOM.
 *
 * Legge un CSV salvato da Excel (separatore ; o , o tabulazione, UTF-8 o Windows-1252),
 * riconosce le colonne dai nomi, sistema email, telefoni, date e maiuscole, unisce i doppioni
 * e produce il CSV che Listmonk importa: email,name,attributes (attributi in JSON).
 *
 * È uno script classico (non un modulo) perché converti.html deve funzionare aperto dal disco
 * con un doppio clic: espone tutto su globalThis.ConvertiNewsletter.
 */
(function (radice) {
  'use strict';

  // Quote dell'avvio graduale: 5% al primo invio, poi +10%, +20%, +30%, il resto all'ultimo.
  var QUOTE_AVVIO = [0.05, 0.1, 0.2, 0.3];

  // Errori di battitura frequenti nei domini, corretti in automatico (con avviso).
  var DOMINI_CORRETTI = {
    'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.it': 'gmail.com', 'gmai.com': 'gmail.com',
    'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com',
    'hotmail.con': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.ti': 'hotmail.it',
    'libero.ti': 'libero.it', 'libreo.it': 'libero.it', 'libero.com': 'libero.it',
    'yaho.it': 'yahoo.it', 'yahho.it': 'yahoo.it', 'yahoo.con': 'yahoo.com',
    'outlok.it': 'outlook.it', 'outlook.con': 'outlook.com', 'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com',
    'tiscali.ti': 'tiscali.it', 'alice.ti': 'alice.it', 'virgilio.ti': 'virgilio.it',
  };

  var SI = ['si', 'sì', 's', 'x', '1', 'true', 'vero', 'yes', 'y', 'ok', 'acconsento', 'accetto'];
  var NO = ['no', 'n', '0', 'false', 'falso', 'non acconsento', 'rifiuto'];

  // ---------------------------------------------------------------- lettura del file

  /** Decodifica i byte del file: UTF-8 se valido, altrimenti Windows-1252 (Excel italiano). */
  function leggiTesto(byte) {
    var testo;
    try {
      testo = new TextDecoder('utf-8', { fatal: true }).decode(byte);
    } catch {
      testo = new TextDecoder('windows-1252').decode(byte);
    }
    return testo.replace(/^﻿/, '');
  }

  /** Sceglie il separatore guardando la riga di intestazione. */
  function trovaSeparatore(testo) {
    var prima = testo.split(/\r?\n/, 1)[0] || '';
    var candidati = [';', ',', '\t'];
    var migliore = ';';
    var massimo = -1;
    candidati.forEach(function (c) {
      var n = contaFuoriVirgolette(prima, c);
      if (n > massimo) { massimo = n; migliore = c; }
    });
    return migliore;
  }

  function contaFuoriVirgolette(riga, carattere) {
    var dentro = false;
    var n = 0;
    for (var i = 0; i < riga.length; i++) {
      if (riga[i] === '"') dentro = !dentro;
      else if (!dentro && riga[i] === carattere) n++;
    }
    return n;
  }

  /** CSV → righe di celle, con virgolette e a capo dentro le celle (RFC 4180). */
  function analizzaCsv(testo, separatore) {
    var sep = separatore || trovaSeparatore(testo);
    var righe = [];
    var riga = [];
    var cella = '';
    var dentro = false;
    for (var i = 0; i < testo.length; i++) {
      var c = testo[i];
      if (dentro) {
        if (c === '"') {
          if (testo[i + 1] === '"') { cella += '"'; i++; } else dentro = false;
        } else cella += c;
      } else if (c === '"') {
        dentro = true;
      } else if (c === sep) {
        riga.push(cella); cella = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && testo[i + 1] === '\n') i++;
        riga.push(cella); cella = '';
        righe.push(riga); riga = [];
      } else cella += c;
    }
    if (cella !== '' || riga.length) { riga.push(cella); righe.push(riga); }
    return righe.filter(function (r) {
      return r.some(function (v) { return v.trim() !== ''; });
    });
  }

  // ---------------------------------------------------------------- riconoscimento colonne

  function semplifica(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function chiave(s) {
    return semplifica(s).replace(/ /g, '_') || 'colonna';
  }

  /**
   * Dal nome di una colonna al campo: email, nome, cognome, nome_completo, telefono, citta,
   * provincia, data_iscrizione, evento, consenso_newsletter, consenso_* oppure altro.
   */
  function riconosciColonna(intestazione) {
    var s = semplifica(intestazione);
    var parole = s.split(' ');
    var ha = function (p) { return parole.indexOf(p) !== -1; };

    if (s.indexOf('consens') !== -1 || ha('privacy') || ha('marketing') || ha('autorizzazione')) {
      if (ha('newsletter') || ha('email') || ha('mail') || s === 'consenso') return { campo: 'consenso_newsletter' };
      if (ha('sms')) return { campo: 'consenso_sms' };
      if (ha('whatsapp') || ha('wa')) return { campo: 'consenso_whatsapp' };
      if (ha('telefono') || ha('telefonico') || ha('chiamate')) return { campo: 'consenso_telefono' };
      return { campo: 'consenso_' + chiave(s.replace(/consens[oi]/, '')) };
    }
    // L'ordine conta: «Data evento» è una data, «Luogo evento» una città, «Nome evento» un evento.
    if (ha('email') || ha('mail') || ha('posta')) return { campo: 'email' };
    if (ha('telefono') || ha('cellulare') || ha('cell') || ha('tel') || ha('phone') || ha('mobile') || ha('whatsapp') || s === 'numero') return { campo: 'telefono' };
    if (ha('data') || ha('date') || ha('iscrizione') || ha('quando')) return { campo: 'data_iscrizione' };
    if (ha('citta') || ha('comune') || ha('luogo') || ha('localita') || ha('city') || ha('paese')) return { campo: 'citta' };
    if (ha('provincia') || ha('prov') || s === 'pr') return { campo: 'provincia' };
    if (ha('evento') || ha('fonte') || ha('provenienza') || ha('origine') || ha('source') || ha('canale')) return { campo: 'evento' };
    if ((ha('nome') && ha('cognome')) || s === 'nominativo' || s === 'full name') return { campo: 'nome_completo' };
    if (ha('cognome') || ha('surname') || s === 'last name') return { campo: 'cognome' };
    if (ha('nome') || ha('name')) return { campo: 'nome' };
    return { campo: 'altro', chiave: chiave(intestazione) };
  }

  /** Mappatura di tutte le colonne; un campo già preso finisce negli attributi con la sua chiave. */
  function riconosciColonne(intestazioni) {
    var presi = {};
    return intestazioni.map(function (nome, indice) {
      var r = riconosciColonna(nome);
      if (r.campo !== 'altro' && presi[r.campo]) r = { campo: 'altro', chiave: chiave(nome) };
      if (r.campo !== 'altro') presi[r.campo] = true;
      return { indice: indice, intestazione: nome, campo: r.campo, chiave: r.chiave || r.campo };
    });
  }

  // ---------------------------------------------------------------- normalizzazioni

  var RE_EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;

  /** { valore, avviso } oppure { errore } */
  function normalizzaEmail(grezza) {
    var e = String(grezza || '').trim().toLowerCase().replace(/^mailto:/, '').replace(/\s+/g, '');
    e = e.replace(/^[<"'(]+|[>"').,;]+$/g, '');
    if (!e) return { errore: 'email mancante' };
    var avviso = null;
    var at = e.lastIndexOf('@');
    if (at > 0) {
      var dominio = e.slice(at + 1);
      if (DOMINI_CORRETTI[dominio]) {
        avviso = 'dominio corretto: ' + dominio + ' → ' + DOMINI_CORRETTI[dominio];
        e = e.slice(0, at + 1) + DOMINI_CORRETTI[dominio];
      }
    }
    if (!RE_EMAIL.test(e) || e.indexOf('..') !== -1) return { errore: 'email non valida' };
    return { valore: e, avviso: avviso };
  }

  /** Telefono in formato internazionale (+39…). { valore, avviso } */
  function normalizzaTelefono(grezzo) {
    var t = String(grezzo || '').trim();
    if (!t) return { valore: null };
    if (/^\d+([.,]\d+)?e\+?\d+$/i.test(t)) {
      return { valore: null, avviso: 'telefono rovinato da Excel (' + t + '): va reinserito' };
    }
    var piu = t[0] === '+';
    var cifre = t.replace(/\D/g, '');
    if (!cifre) return { valore: null, avviso: 'telefono non riconosciuto: ' + t };
    if (!piu && cifre.indexOf('00') === 0) { piu = true; cifre = cifre.slice(2); }
    if (piu) {
      if (cifre.length < 8 || cifre.length > 15) return { valore: '+' + cifre, avviso: 'telefono sospetto: ' + t };
      return { valore: '+' + cifre };
    }
    if (cifre.length === 12 && cifre.indexOf('393') === 0) return { valore: '+' + cifre };
    if (cifre[0] === '3' && (cifre.length === 9 || cifre.length === 10)) return { valore: '+39' + cifre };
    if (cifre[0] === '0' && cifre.length >= 6 && cifre.length <= 11) return { valore: '+39' + cifre };
    return { valore: cifre, avviso: 'telefono non riconosciuto: ' + t };
  }

  function dueCifre(n) { return (n < 10 ? '0' : '') + n; }

  function dataValida(a, m, g) {
    var d = new Date(Date.UTC(a, m - 1, g));
    return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === g;
  }

  /** Data in formato AAAA-MM-GG. Accetta gg/mm/aaaa, gg-mm-aa, aaaa-mm-gg e i numeri seriali di Excel. */
  function normalizzaData(grezza) {
    var s = String(grezza || '').trim();
    if (!s) return { valore: null };
    var a, m, g, r;
    if ((r = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) {
      a = +r[1]; m = +r[2]; g = +r[3];
    } else if ((r = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?!\d)/))) {
      g = +r[1]; m = +r[2]; a = +r[3];
      if (r[3].length === 2) a += a < 50 ? 2000 : 1900;
    } else if (/^\d{5}([.,]\d+)?$/.test(s) && +s.replace(',', '.') > 20000 && +s.replace(',', '.') < 80000) {
      // Seriale di Excel: giorni dal 30/12/1899.
      var d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s.replace(',', '.')) * 86400000);
      a = d.getUTCFullYear(); m = d.getUTCMonth() + 1; g = d.getUTCDate();
    } else {
      return { valore: null, avviso: 'data non riconosciuta: ' + s };
    }
    if (!dataValida(a, m, g)) return { valore: null, avviso: 'data impossibile: ' + s };
    return { valore: a + '-' + dueCifre(m) + '-' + dueCifre(g) };
  }

  /** true / false / null (vuoto o non chiaro) */
  function normalizzaSiNo(grezzo) {
    var s = String(grezzo || '').trim().toLowerCase();
    if (!s) return null;
    if (SI.indexOf(s) !== -1) return true;
    if (NO.indexOf(s) !== -1) return false;
    return null;
  }

  /** «MARIO ROSSI» e «mario rossi» → «Mario Rossi»; le maiuscole miste restano come sono. */
  function sistemaMaiuscole(grezzo) {
    var s = String(grezzo || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    if (s !== s.toUpperCase() && s !== s.toLowerCase()) return s;
    return s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, function (_, prima, lettera) {
      return prima + lettera.toUpperCase();
    });
  }

  // ---------------------------------------------------------------- conversione

  /**
   * Converte il testo del CSV.
   * opzioni: { oggi: 'AAAA-MM-GG', gruppiAvvio: true, evento: 'nome evento da applicare a tutti' }
   */
  function converti(testo, opzioni) {
    opzioni = opzioni || {};
    var oggi = opzioni.oggi || new Date().toISOString().slice(0, 10);
    var righe = analizzaCsv(testo);
    if (righe.length < 2) {
      return { errore: 'Il file non ha righe di contatti (serve una riga di intestazione e almeno un contatto).' };
    }
    var mappatura = riconosciColonne(righe[0]);
    var campo = function (nome) {
      return mappatura.filter(function (c) { return c.campo === nome; })[0];
    };
    if (!campo('email')) {
      return { errore: 'Non trovo la colonna delle email: chiamatela «Email» nella prima riga.', mappatura: mappatura };
    }

    var contatti = {};
    var ordine = [];
    var scarti = [];
    var avvisi = [];
    var doppioni = 0;

    for (var n = 1; n < righe.length; n++) {
      var riga = righe[n];
      var numeroRiga = n + 1;
      var valore = function (c) { return c ? String(riga[c.indice] || '').trim() : ''; };

      var email = normalizzaEmail(valore(campo('email')));
      if (email.errore) {
        scarti.push({ riga: numeroRiga, email: valore(campo('email')), motivo: email.errore });
        continue;
      }
      if (email.avviso) avvisi.push({ riga: numeroRiga, email: email.valore, avviso: email.avviso });

      // Se il file ha la colonna del consenso, entra solo chi ha «sì»: vuoto o «no» non bastano.
      var consenso = campo('consenso_newsletter') ? normalizzaSiNo(valore(campo('consenso_newsletter'))) : null;
      if (campo('consenso_newsletter') && consenso !== true) {
        scarti.push({
          riga: numeroRiga,
          email: email.valore,
          motivo: consenso === false ? 'senza consenso alla newsletter' : 'consenso alla newsletter non indicato',
        });
        continue;
      }

      var nome = campo('nome_completo')
        ? sistemaMaiuscole(valore(campo('nome_completo')))
        : [sistemaMaiuscole(valore(campo('nome'))), sistemaMaiuscole(valore(campo('cognome')))].filter(Boolean).join(' ');

      var attributi = {};
      var tel = normalizzaTelefono(valore(campo('telefono')));
      if (tel.valore) attributi.telefono = tel.valore;
      if (tel.avviso) avvisi.push({ riga: numeroRiga, email: email.valore, avviso: tel.avviso });

      var citta = sistemaMaiuscole(valore(campo('citta')));
      if (citta) attributi.citta = citta;
      var prov = valore(campo('provincia')).toUpperCase();
      if (prov) attributi.provincia = prov;

      var data = normalizzaData(valore(campo('data_iscrizione')));
      if (data.valore) attributi.data_iscrizione = data.valore;
      if (data.avviso) avvisi.push({ riga: numeroRiga, email: email.valore, avviso: data.avviso });

      var evento = opzioni.evento || valore(campo('evento'));
      if (evento) attributi.evento = evento;

      mappatura.forEach(function (c) {
        if (c.campo.indexOf('consenso_') === 0 && c.campo !== 'consenso_newsletter') {
          var v = normalizzaSiNo(valore(c));
          if (v !== null) attributi[c.campo] = v;
        } else if (c.campo === 'altro') {
          var testoAltro = valore(c);
          if (testoAltro) attributi[c.chiave] = testoAltro;
        }
      });
      if (consenso === true) attributi.consenso_newsletter = true;

      var esistente = contatti[email.valore];
      if (esistente) {
        doppioni++;
        if (!esistente.nome && nome) esistente.nome = nome;
        Object.keys(attributi).forEach(function (k) {
          if (k === 'data_iscrizione' && esistente.attributi.data_iscrizione) {
            if (attributi[k] < esistente.attributi[k]) esistente.attributi[k] = attributi[k];
          } else if (esistente.attributi[k] === undefined) {
            esistente.attributi[k] = attributi[k];
          }
        });
        continue;
      }
      contatti[email.valore] = { email: email.valore, nome: nome, attributi: attributi };
      ordine.push(email.valore);
    }

    var risultato = ordine.map(function (e) {
      var c = contatti[e];
      c.attributi.importato_il = oggi;
      return c;
    });
    if (opzioni.gruppiAvvio !== false) assegnaGruppiAvvio(risultato);

    return {
      contatti: risultato,
      scarti: scarti,
      avvisi: avvisi,
      mappatura: mappatura,
      riepilogo: {
        righeLette: righe.length - 1,
        contatti: risultato.length,
        doppioniUniti: doppioni,
        scartati: scarti.length,
        avvisi: avvisi.length,
        conTelefono: risultato.filter(function (c) { return c.attributi.telefono; }).length,
      },
    };
  }

  /**
   * Gruppi dell'avvio graduale (1–5): prima gli iscritti più recenti, che aprono di più
   * e danno al dominio una buona reputazione. Chi non ha data va in coda.
   */
  function assegnaGruppiAvvio(contatti) {
    var ordinati = contatti.slice().sort(function (a, b) {
      var da = a.attributi.data_iscrizione || '';
      var db = b.attributi.data_iscrizione || '';
      return da < db ? 1 : da > db ? -1 : 0;
    });
    var totale = ordinati.length;
    var soglie = [];
    var cumulata = 0;
    QUOTE_AVVIO.forEach(function (q) { cumulata += q; soglie.push(Math.round(totale * cumulata)); });
    ordinati.forEach(function (c, i) {
      var gruppo = 1;
      while (gruppo <= soglie.length && i >= soglie[gruppo - 1]) gruppo++;
      c.attributi.gruppo_avvio = gruppo;
    });
  }

  // ---------------------------------------------------------------- uscita

  function cellaCsv(v) {
    var s = String(v == null ? '' : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /** CSV per l'importazione di Listmonk (separatore virgola). */
  function csvListmonk(contatti) {
    var righe = ['email,name,attributes'];
    contatti.forEach(function (c) {
      righe.push([c.email, c.nome, JSON.stringify(c.attributi)].map(cellaCsv).join(','));
    });
    return righe.join('\r\n') + '\r\n';
  }

  /** CSV delle righe scartate e degli avvisi, da aprire in Excel (separatore punto e virgola). */
  function csvControllo(scarti, avvisi) {
    var cella = function (v) {
      var s = String(v == null ? '' : v);
      return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var righe = ['Riga;Email;Esito;Dettaglio'];
    scarti.forEach(function (s) { righe.push([s.riga, s.email, 'SCARTATA', s.motivo].map(cella).join(';')); });
    avvisi.forEach(function (a) { righe.push([a.riga, a.email, 'importata, da controllare', a.avviso].map(cella).join(';')); });
    return '﻿' + righe.join('\r\n') + '\r\n';
  }

  radice.ConvertiNewsletter = {
    leggiTesto: leggiTesto,
    trovaSeparatore: trovaSeparatore,
    analizzaCsv: analizzaCsv,
    riconosciColonna: riconosciColonna,
    riconosciColonne: riconosciColonne,
    normalizzaEmail: normalizzaEmail,
    normalizzaTelefono: normalizzaTelefono,
    normalizzaData: normalizzaData,
    normalizzaSiNo: normalizzaSiNo,
    sistemaMaiuscole: sistemaMaiuscole,
    converti: converti,
    csvListmonk: csvListmonk,
    csvControllo: csvControllo,
  };
})(globalThis);
