/*
 * Unione dei contatti da più fonti: export di Shopify (clienti, ordini, carrelli abbandonati),
 * Mailchimp (anche lo .zip dell'audience così com'è), Eventbrite (partecipanti) e CSV generici.
 *
 * Produce un database unico per email, con fonti, segmenti, eventi, acquisti e consenso,
 * e decide per ogni contatto se può ricevere la newsletter. Regole, dalla più forte:
 *   1. disiscritto o indirizzo non valido su Mailchimp → mai (va anche nella blocklist di Listmonk)
 *   2. consenso esplicito in almeno una fonte → sì
 *   3. cliente senza consenso → no (il «soft opt-in» va valutato con il legale)
 *   4. tutti gli altri → no
 *
 * Non registra i prodotti acquistati: sono felpe con politici e rivelerebbero opinioni politiche
 * (art. 9 GDPR, CLAUDE.md vincolo 2). Restano solo numero di ordini, spesa e date.
 *
 * Script classico come logica.js (da caricare prima): espone globalThis.UnisciContatti.
 */
(function (radice) {
  'use strict';

  var C = radice.ConvertiNewsletter;
  var QUOTE_AVVIO = [0.05, 0.1, 0.2, 0.3];

  // ---------------------------------------------------------------- zip (export di Mailchimp)

  function u16(b, i) { return b[i] | (b[i + 1] << 8); }
  function u32(b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; }

  /** Estrae i file di uno zip (metodi «stored» e «deflate»). Restituisce una Promise di [{ nome, byte }]. */
  function leggiZip(byte) {
    var fine = -1;
    for (var i = byte.length - 22; i >= Math.max(0, byte.length - 65557); i--) {
      if (u32(byte, i) === 0x06054b50) { fine = i; break; }
    }
    if (fine < 0) return Promise.reject(new Error('zip non valido'));
    var voci = u16(byte, fine + 10);
    var pos = u32(byte, fine + 16);
    var lavori = [];
    for (var n = 0; n < voci; n++) {
      if (u32(byte, pos) !== 0x02014b50) return Promise.reject(new Error('zip non valido'));
      var metodo = u16(byte, pos + 10);
      var compressa = u32(byte, pos + 20);
      var lungNome = u16(byte, pos + 28);
      var lungExtra = u16(byte, pos + 30);
      var lungCommento = u16(byte, pos + 32);
      var locale = u32(byte, pos + 42);
      var nome = new TextDecoder().decode(byte.subarray(pos + 46, pos + 46 + lungNome));
      pos += 46 + lungNome + lungExtra + lungCommento;
      if (/\/$/.test(nome) || /(^|\/)(__MACOSX|\.)/.test(nome)) continue;
      var inizio = locale + 30 + u16(byte, locale + 26) + u16(byte, locale + 28);
      var dati = byte.subarray(inizio, inizio + compressa);
      lavori.push(estrai(nome, metodo, dati));
    }
    return Promise.all(lavori);
  }

  function estrai(nome, metodo, dati) {
    if (metodo === 0) return Promise.resolve({ nome: nome, byte: dati });
    if (metodo !== 8) return Promise.reject(new Error('compressione non supportata in ' + nome));
    var flusso = new Blob([dati]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(flusso).arrayBuffer().then(function (b) {
      return { nome: nome, byte: new Uint8Array(b) };
    });
  }

  // ---------------------------------------------------------------- riconoscimento della fonte

  function tabella(testo) {
    var righe = C.analizzaCsv(testo);
    var intestazioni = (righe[0] || []).map(function (h) { return h.trim(); });
    var indice = {};
    intestazioni.forEach(function (h, i) { indice[h.toLowerCase()] = i; });
    return {
      intestazioni: intestazioni,
      righe: righe.slice(1),
      /** valore della prima colonna esistente fra i nomi dati (senza distinguere maiuscole) */
      leggi: function (riga) {
        for (var a = 1; a < arguments.length; a++) {
          var i = indice[String(arguments[a]).toLowerCase()];
          if (i !== undefined && riga[i] != null && String(riga[i]).trim() !== '') return String(riga[i]).trim();
        }
        return '';
      },
      ha: function (nome) { return indice[nome.toLowerCase()] !== undefined; },
      cerca: function (re) {
        return intestazioni.filter(function (h) { return re.test(h); })[0] || null;
      },
    };
  }

  /** shopify-clienti, shopify-ordini, shopify-carrelli, mailchimp, eventbrite oppure generico */
  function tipoFonte(nomeFile, t) {
    var f = nomeFile.toLowerCase();
    if (t.ha('Email Address') && (t.ha('MEMBER_RATING') || t.ha('OPTIN_TIME') || t.ha('LEID'))) return 'mailchimp';
    if (t.ha('Customer ID') && (t.ha('Accepts Email Marketing') || t.ha('Total Orders'))) return 'shopify-clienti';
    if (t.ha('Lineitem name') || t.ha('Lineitem quantity')) {
      return /checkout|abbandon|abandon/.test(f) || t.cerca(/abandon/i) ? 'shopify-carrelli' : 'shopify-ordini';
    }
    if ((t.ha('Event Name') || t.ha('Nome evento') || t.ha('Event name')) && (t.ha('Email') || t.ha('E-mail'))) return 'eventbrite';
    return 'generico';
  }

  /** Stato Mailchimp dal nome del file dell'export: subscribed / unsubscribed / cleaned / nonsubscribed */
  function statoMailchimp(nomeFile) {
    var f = nomeFile.toLowerCase();
    if (/unsubscribed/.test(f)) return 'disiscritto';
    if (/cleaned/.test(f)) return 'non_valido';
    if (/non[-_ ]?subscribed/.test(f)) return 'mai_iscritto';
    if (/subscribed/.test(f)) return 'iscritto';
    return 'sconosciuto';
  }

  // ---------------------------------------------------------------- record unificato

  function nuovoContatto(email) {
    return {
      email: email, nome: '', cognome: '', nomeCompleto: '',
      telefono: '', citta: '', provincia: '', cap: '', paese: '',
      fonti: {}, tag: {}, eventi: {}, ordini: {}, spesa: 0,
      primoOrdine: '', ultimoOrdine: '', primoContatto: '', carrello: false,
      consensi: [], mailchimp: '',
    };
  }

  function data(grezza) {
    if (!grezza) return '';
    var iso = String(grezza).match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    return C.normalizzaData(grezza).valore || '';
  }

  function prima(a, b) { return !a ? b : !b ? a : a < b ? a : b; }
  function dopo(a, b) { return !a ? b : !b ? a : a > b ? a : b; }

  function riempi(c, campo, valore) { if (!c[campo] && valore) c[campo] = valore; }

  function siNo(v) {
    var s = String(v || '').trim().toLowerCase();
    if (['yes', 'true', 'subscribed'].indexOf(s) !== -1) return true;
    if (['no', 'false', 'not_subscribed', 'unsubscribed'].indexOf(s) !== -1) return false;
    return C.normalizzaSiNo(s);
  }

  function tagDaTesto(testo) {
    // Mailchimp: "Tag A","Tag B" · Shopify: Tag A, Tag B
    return String(testo || '').split(/",\s*"|,/).map(function (t) { return t.replace(/^"|"$/g, '').trim(); }).filter(Boolean);
  }

  // ---------------------------------------------------------------- lettura delle fonti

  /**
   * Unisce le fonti. file: [{ nome, testo }]. opzioni: { oggi }
   * Restituisce { contatti, fonti: [{ nome, tipo, righe, scartate }], scarti }
   */
  function unisci(file, opzioni) {
    opzioni = opzioni || {};
    var oggi = opzioni.oggi || new Date().toISOString().slice(0, 10);
    var mappa = {};
    var scarti = [];
    var resocontoFonti = [];

    function contatto(emailGrezza, fonte, riga) {
      var e = C.normalizzaEmail(emailGrezza);
      if (e.errore) {
        if (emailGrezza) scarti.push({ fonte: fonte, riga: riga, email: emailGrezza, motivo: e.errore });
        return null;
      }
      if (!mappa[e.valore]) mappa[e.valore] = nuovoContatto(e.valore);
      return mappa[e.valore];
    }

    function telefono(c, grezzo) {
      if (c.telefono || !grezzo) return;
      var t = C.normalizzaTelefono(grezzo);
      if (t.valore && !t.avviso) c.telefono = t.valore;
    }

    function luogo(c, citta, prov, cap, paese) {
      riempi(c, 'citta', C.sistemaMaiuscole(citta));
      riempi(c, 'provincia', String(prov || '').toUpperCase());
      riempi(c, 'cap', cap);
      riempi(c, 'paese', String(paese || '').toUpperCase());
    }

    file.forEach(function (f) {
      var t = tabella(f.testo);
      var tipo = tipoFonte(f.nome, t);
      var resoconto = { nome: f.nome, tipo: tipo, righe: t.righe.length, scartate: 0 };
      var scartiPrima = scarti.length;
      var L = t.leggi;

      t.righe.forEach(function (r, i) {
        var numero = i + 2;
        var c;
        if (tipo === 'mailchimp') {
          c = contatto(L(r, 'Email Address'), f.nome, numero);
          if (!c) return;
          c.fonti.mailchimp = true;
          riempi(c, 'nome', C.sistemaMaiuscole(L(r, 'First Name')));
          riempi(c, 'cognome', C.sistemaMaiuscole(L(r, 'Last Name')));
          telefono(c, L(r, 'Phone Number', 'Phone'));
          luogo(c, '', '', '', L(r, 'CC'));
          tagDaTesto(L(r, 'TAGS')).forEach(function (x) { c.tag[x] = true; });
          c.primoContatto = prima(c.primoContatto, data(L(r, 'CONFIRM_TIME', 'OPTIN_TIME')));
          var stato = statoMailchimp(f.nome);
          // Lo stato più restrittivo vince: un contatto disiscritto resta disiscritto.
          var peso = { non_valido: 4, disiscritto: 3, iscritto: 2, mai_iscritto: 1, sconosciuto: 0 };
          if (!c.mailchimp || peso[stato] > peso[c.mailchimp]) c.mailchimp = stato;
          if (stato === 'iscritto') c.consensi.push('Mailchimp');
        } else if (tipo === 'shopify-clienti') {
          c = contatto(L(r, 'Email'), f.nome, numero);
          if (!c) return;
          c.fonti.shopify = true;
          riempi(c, 'nome', C.sistemaMaiuscole(L(r, 'First Name')));
          riempi(c, 'cognome', C.sistemaMaiuscole(L(r, 'Last Name')));
          telefono(c, L(r, 'Phone'));
          telefono(c, L(r, 'Default Address Phone'));
          luogo(c, L(r, 'Default Address City'), L(r, 'Default Address Province Code'), L(r, 'Default Address Zip'), L(r, 'Default Address Country Code'));
          tagDaTesto(L(r, 'Tags')).forEach(function (x) { c.tag[x] = true; });
          if (siNo(L(r, 'Accepts Email Marketing')) === true) c.consensi.push('Shopify');
          var spesi = parseFloat(L(r, 'Total Spent')) || 0;
          var ordini = parseInt(L(r, 'Total Orders'), 10) || 0;
          // L'export clienti ha i totali di sempre; quello ordini può coprire solo un periodo.
          c.ordiniDaClienti = Math.max(c.ordiniDaClienti || 0, ordini);
          c.spesaDaClienti = Math.max(c.spesaDaClienti || 0, spesi);
        } else if (tipo === 'shopify-ordini' || tipo === 'shopify-carrelli') {
          c = contatto(L(r, 'Email'), f.nome, numero);
          if (!c) return;
          c.fonti.shopify = true;
          var nomeIntero = C.sistemaMaiuscole(L(r, 'Billing Name', 'Shipping Name'));
          riempi(c, 'nomeCompleto', nomeIntero);
          telefono(c, L(r, 'Phone'));
          telefono(c, L(r, 'Billing Phone'));
          telefono(c, L(r, 'Shipping Phone'));
          luogo(c, L(r, 'Billing City', 'Shipping City'), L(r, 'Billing Province', 'Shipping Province'),
            L(r, 'Billing Zip', 'Shipping Zip'), L(r, 'Billing Country', 'Shipping Country'));
          var quando = data(L(r, 'Created at'));
          c.primoContatto = prima(c.primoContatto, quando);
          if (siNo(L(r, 'Accepts Marketing', 'Accepts Email Marketing')) === true) c.consensi.push('Shopify');
          var numeroOrdine = L(r, 'Name', 'Id');
          if (tipo === 'shopify-carrelli') {
            c.carrello = true;
          } else if (numeroOrdine && !c.ordini[numeroOrdine]) {
            // Un ordine occupa più righe (una per articolo): il totale sta solo sulla prima.
            var totale = parseFloat(L(r, 'Total'));
            if (!isNaN(totale)) {
              c.ordini[numeroOrdine] = true;
              c.spesa += totale - (parseFloat(L(r, 'Refunded Amount')) || 0);
              c.primoOrdine = prima(c.primoOrdine, quando);
              c.ultimoOrdine = dopo(c.ultimoOrdine, quando);
            }
          }
        } else if (tipo === 'eventbrite') {
          c = contatto(L(r, 'Email', 'E-mail', 'Indirizzo email'), f.nome, numero);
          if (!c) return;
          c.fonti.eventbrite = true;
          riempi(c, 'nome', C.sistemaMaiuscole(L(r, 'First Name', 'Nome')));
          riempi(c, 'cognome', C.sistemaMaiuscole(L(r, 'Last Name', 'Cognome')));
          telefono(c, L(r, 'Cell Phone', 'Mobile Phone', 'Phone', 'Telefono', 'Cellulare'));
          var evento = L(r, 'Event Name', 'Nome evento', 'Event name');
          if (evento) c.eventi[evento] = true;
          c.primoContatto = prima(c.primoContatto, data(L(r, 'Order Date', 'Data ordine', 'Order date')));
          var colConsenso = t.cerca(/opt.?in|consens|aggiornament|informat|marketing|keep me|updates|newsletter/i);
          if (colConsenso && siNo(r[t.intestazioni.indexOf(colConsenso)]) === true) c.consensi.push('Eventbrite');
        } else {
          // CSV generico (fogli degli eventi, vecchi elenchi): stessa logica del convertitore singolo.
          var mappatura = C.riconosciColonne(t.intestazioni);
          var col = function (campo) {
            var m = mappatura.filter(function (x) { return x.campo === campo; })[0];
            return m ? String(r[m.indice] || '').trim() : '';
          };
          c = contatto(col('email'), f.nome, numero);
          if (!c) return;
          c.fonti[f.nome.replace(/\.[^.]+$/, '')] = true;
          riempi(c, 'nome', C.sistemaMaiuscole(col('nome')));
          riempi(c, 'cognome', C.sistemaMaiuscole(col('cognome')));
          riempi(c, 'nomeCompleto', C.sistemaMaiuscole(col('nome_completo')));
          telefono(c, col('telefono'));
          luogo(c, col('citta'), col('provincia'), '', '');
          if (col('evento')) c.eventi[col('evento')] = true;
          c.primoContatto = prima(c.primoContatto, C.normalizzaData(col('data_iscrizione')).valore || '');
          if (C.normalizzaSiNo(col('consenso_newsletter')) === true) c.consensi.push(f.nome);
        }
      });
      resoconto.scartate = scarti.length - scartiPrima;
      resocontoFonti.push(resoconto);
    });

    var contatti = Object.keys(mappa).map(function (e) { return completa(mappa[e], oggi); });
    assegnaGruppiAvvio(contatti.filter(function (c) { return c.invia; }));
    return { contatti: contatti, fonti: resocontoFonti, scarti: scarti };
  }

  // ---------------------------------------------------------------- segmenti e decisione

  function completa(c, oggi) {
    var nOrdini = Math.max(Object.keys(c.ordini).length, c.ordiniDaClienti || 0);
    var spesa = Math.max(c.spesa, c.spesaDaClienti || 0);
    var nomeCompleto = [c.nome, c.cognome].filter(Boolean).join(' ') || c.nomeCompleto;

    var segmenti = Object.keys(c.fonti).map(function (f) { return 'fonte_' + chiaveSegmento(f); });
    if (nOrdini >= 2) segmenti.push('cliente_ricorrente');
    if (nOrdini >= 1) segmenti.push('cliente');
    else if (c.fonti.shopify) segmenti.push('shopify_senza_acquisti');
    if (c.carrello) segmenti.push('carrello_abbandonato');
    if (Object.keys(c.eventi).length) segmenti.push('partecipante_eventi');
    if (c.paese && c.paese !== 'IT') segmenti.push('estero');
    else if (c.provincia) segmenti.push('zona_' + c.provincia);

    var invia;
    var motivo;
    var consensi = c.consensi.filter(function (x, i, a) { return a.indexOf(x) === i; });
    if (c.mailchimp === 'disiscritto') { invia = false; motivo = 'disiscritto da Mailchimp'; }
    else if (c.mailchimp === 'non_valido') { invia = false; motivo = 'indirizzo non valido (Mailchimp cleaned)'; }
    else if (consensi.length) { invia = true; motivo = 'consenso: ' + consensi.join(', '); }
    else if (nOrdini >= 1) { invia = false; motivo = 'cliente senza consenso marketing (soft opt-in da valutare con il legale)'; }
    else { invia = false; motivo = 'nessun consenso registrato'; }

    return {
      email: c.email,
      nome: c.nome,
      cognome: c.cognome,
      nomeCompleto: nomeCompleto,
      telefono: c.telefono,
      citta: c.citta,
      provincia: c.provincia,
      cap: c.cap,
      paese: c.paese,
      fonti: Object.keys(c.fonti),
      segmenti: segmenti,
      tag: Object.keys(c.tag),
      eventi: Object.keys(c.eventi),
      nOrdini: nOrdini,
      spesa: Math.round(spesa * 100) / 100,
      primoOrdine: c.primoOrdine,
      ultimoOrdine: c.ultimoOrdine,
      primoContatto: c.primoContatto,
      statoMailchimp: c.mailchimp,
      invia: invia,
      blocklist: c.mailchimp === 'disiscritto' || c.mailchimp === 'non_valido',
      motivo: motivo,
      importatoIl: oggi,
    };
  }

  function chiaveSegmento(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  /** Gruppi dell'avvio graduale: prima chi ha avuto un contatto più recente. */
  function assegnaGruppiAvvio(contatti) {
    var recente = function (c) { return dopo(c.ultimoOrdine, c.primoContatto) || ''; };
    var ordinati = contatti.slice().sort(function (a, b) {
      var x = recente(a);
      var y = recente(b);
      return x < y ? 1 : x > y ? -1 : 0;
    });
    var soglie = [];
    var cumulata = 0;
    QUOTE_AVVIO.forEach(function (q) { cumulata += q; soglie.push(Math.round(ordinati.length * cumulata)); });
    ordinati.forEach(function (c, i) {
      var g = 1;
      while (g <= soglie.length && i >= soglie[g - 1]) g++;
      c.gruppoAvvio = g;
    });
  }

  // ---------------------------------------------------------------- file in uscita

  function cellaExcel(v) {
    var s = Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v);
    return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  var COLONNE = [
    ['Email', 'email'], ['Nome', 'nome'], ['Cognome', 'cognome'], ['Nome completo', 'nomeCompleto'],
    ['Telefono', 'telefono'], ['Città', 'citta'], ['Provincia', 'provincia'], ['CAP', 'cap'], ['Paese', 'paese'],
    ['Newsletter', function (c) { return c.invia ? 'SÌ' : 'NO'; }], ['Motivo', 'motivo'],
    ['Fonti', 'fonti'], ['Segmenti', 'segmenti'], ['Tag', 'tag'], ['Eventi', 'eventi'],
    ['Ordini', 'nOrdini'], ['Spesa totale €', function (c) { return c.spesa ? String(c.spesa).replace('.', ',') : ''; }],
    ['Primo ordine', 'primoOrdine'], ['Ultimo ordine', 'ultimoOrdine'], ['Primo contatto', 'primoContatto'],
    ['Stato Mailchimp', 'statoMailchimp'], ['Gruppo avvio', 'gruppoAvvio'],
  ];

  /** Database completo, da aprire in Excel (punto e virgola, BOM). */
  function csvDatabase(contatti) {
    var righe = [COLONNE.map(function (c) { return c[0]; }).join(';')];
    contatti.forEach(function (c) {
      righe.push(COLONNE.map(function (col) {
        return cellaExcel(typeof col[1] === 'function' ? col[1](c) : c[col[1]]);
      }).join(';'));
    });
    return '﻿' + righe.join('\r\n') + '\r\n';
  }

  function attributi(c) {
    var a = {};
    ['telefono', 'citta', 'provincia', 'cap', 'paese'].forEach(function (k) { if (c[k]) a[k] = c[k]; });
    a.fonti = c.fonti;
    a.segmenti = c.segmenti;
    if (c.tag.length) a.tag = c.tag;
    if (c.eventi.length) a.eventi = c.eventi;
    if (c.nOrdini) { a.ordini = c.nOrdini; a.spesa = c.spesa; a.ultimo_ordine = c.ultimoOrdine; }
    if (c.primoContatto) a.data_iscrizione = c.primoContatto;
    a.base_invio = c.motivo;
    if (c.gruppoAvvio) a.gruppo_avvio = c.gruppoAvvio;
    a.importato_il = c.importatoIl;
    return a;
  }

  /** Iscritti da importare in Listmonk (solo chi ha la base per ricevere la newsletter). */
  function csvListmonkIscritti(contatti) {
    return C.csvListmonk(contatti.filter(function (c) { return c.invia; }).map(function (c) {
      return { email: c.email, nome: c.nomeCompleto, attributi: attributi(c) };
    }));
  }

  /** Da importare in Listmonk in modalità «Blocklist»: non riceveranno mai nulla. */
  function csvListmonkBlocklist(contatti) {
    return C.csvListmonk(contatti.filter(function (c) { return c.blocklist; }).map(function (c) {
      return { email: c.email, nome: c.nomeCompleto, attributi: { motivo: c.motivo } };
    }));
  }

  function riepilogo(esito) {
    var r = { totale: esito.contatti.length, invia: 0, blocklist: 0, clientiSenzaConsenso: 0, senzaConsenso: 0, segmenti: {} };
    esito.contatti.forEach(function (c) {
      if (c.invia) r.invia++;
      else if (c.blocklist) r.blocklist++;
      else if (c.nOrdini) r.clientiSenzaConsenso++;
      else r.senzaConsenso++;
      c.segmenti.forEach(function (s) { r.segmenti[s] = (r.segmenti[s] || 0) + 1; });
    });
    return r;
  }

  radice.UnisciContatti = {
    leggiZip: leggiZip,
    tipoFonte: function (nome, testo) { return tipoFonte(nome, tabella(testo)); },
    statoMailchimp: statoMailchimp,
    unisci: unisci,
    riepilogo: riepilogo,
    csvDatabase: csvDatabase,
    csvListmonkIscritti: csvListmonkIscritti,
    csvListmonkBlocklist: csvListmonkBlocklist,
  };
})(globalThis);
