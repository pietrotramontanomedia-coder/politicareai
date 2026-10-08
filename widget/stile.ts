/** Stile del simulatore dentro politicare.it: schede bianche, rosso del sito, tutto sotto .pcs. */
export const CSS = `
.pcs{--pcs-testo:#1f1f1f;--pcs-muto:#6f6f6f;--pcs-bordo:#ececec;--pcs-fondo:#f5f5f5;--pcs-rosso:#d32f2f;--pcs-verde:#1b7a3e;
  font-family:"Google Sans Local",system-ui,sans-serif;color:var(--pcs-testo);font-size:15px;line-height:1.5;margin:24px 0}
.pcs *{box-sizing:border-box}
.pcs h3{font-size:18px;font-weight:700;margin:0;line-height:1.3}
.pcs h4{font-size:14px;font-weight:700;margin:18px 0 6px}
.pcs a{color:var(--pcs-rosso);text-decoration:underline;text-underline-offset:2px}
.pcs ul{margin:0;padding:0;list-style:none}
.pcs-scheda{background:#fff;border:1px solid var(--pcs-bordo);border-radius:22px;padding:20px}
.pcs-griglia{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:16px;align-items:start}
.pcs-griglia>*{min-width:0}
.pcs-dettagli{min-width:0;overflow:hidden}
@media(min-width:960px){.pcs-griglia{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr)}.pcs-risultato{position:sticky;top:90px}}
.pcs-riga{display:flex;align-items:center;gap:8px;min-width:0}
.pcs-nota{font-size:13px;color:var(--pcs-muto);margin:8px 0 0}
.pcs-muto{color:var(--pcs-muto);font-size:13px}
.pcs-etichetta{font-size:13px;font-weight:700;color:var(--pcs-muto);margin-right:4px}
.pcs-preset{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.pcs-pillola{border:1px solid var(--pcs-bordo);background:#fff;color:var(--pcs-testo);border-radius:999px;padding:7px 16px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.pcs-pillola[aria-pressed="true"]{background:var(--pcs-testo);border-color:var(--pcs-testo);color:#fff}
.pcs-totale{margin-left:auto;font-size:12px;font-weight:700;color:var(--pcs-verde);background:#e8f3ec;border-radius:999px;padding:3px 10px;white-space:nowrap}
.pcs-liste{display:flex;flex-direction:column;gap:8px;margin-top:14px!important}
.pcs-liste li{border:1px solid var(--pcs-bordo);border-radius:16px;padding:10px 12px;background:var(--pcs-fondo)}
.pcs-liste li .pcs-riga+.pcs-riga{margin-top:8px}
.pcs-pallino{width:11px;height:11px;border-radius:50%;flex:0 0 auto}
.pcs-nome{flex:1 1 auto;min-width:0;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pcs-numero{width:74px;border:1px solid var(--pcs-bordo);border-radius:10px;padding:5px 8px;text-align:right;font:inherit;font-size:14px;background:#fff;color:var(--pcs-testo)}
.pcs-numero:focus,.pcs-select:focus{outline:2px solid var(--pcs-rosso);outline-offset:1px}
.pcs-lucchetto{width:30px;height:30px;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--pcs-bordo);border-radius:50%;background:#fff;color:var(--pcs-muto);cursor:pointer;padding:0}
.pcs-lucchetto[aria-pressed="true"]{background:var(--pcs-testo);border-color:var(--pcs-testo);color:#fff}
.pcs-cursore{flex:1 1 auto;min-width:0}
.pcs-select{width:150px;flex:0 0 auto;border:1px solid var(--pcs-bordo);border-radius:10px;padding:5px 8px;font:inherit;font-size:13px;background:#fff;color:var(--pcs-testo)}
.pcs-spunta{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--pcs-bordo);border-radius:16px;padding:12px;margin-top:12px;cursor:pointer}
.pcs-spunta input{width:18px;height:18px;margin-top:2px;accent-color:var(--pcs-rosso)}
.pcs-spunta .pcs-nota{display:block;margin:2px 0 0}
.pcs-esito{border-radius:14px;padding:10px 14px;margin:0;font-weight:700;font-size:14px;background:var(--pcs-fondo);color:var(--pcs-muto)}
.pcs-esito--premio{background:#fdecec;color:var(--pcs-rosso)}
.pcs-emicicli{display:grid;grid-template-columns:1.4fr 1fr;gap:12px;align-items:end;margin-top:12px}
.pcs-emiciclo{margin:0}
.pcs-emiciclo svg{width:100%;height:auto;display:block}
.pcs-emiciclo figcaption{text-align:center;font-size:12px;color:var(--pcs-muto);margin-top:4px;line-height:1.35}
.pcs-emiciclo figcaption strong,.pcs-emiciclo figcaption span{display:block}
.pcs-emiciclo figcaption strong{color:var(--pcs-testo)}
.pcs-avvisi{margin-top:10px!important;font-size:12px;color:var(--pcs-muto)}
.pcs-avvisi li+li{margin-top:2px}
.pcs-scorri{overflow-x:auto;margin-top:12px}
.pcs-tabella{width:100%;border-collapse:collapse;font-size:14px}
.pcs-tabella th,.pcs-tabella td{padding:8px 6px;border-top:1px solid var(--pcs-bordo);text-align:right;vertical-align:top;font-variant-numeric:tabular-nums}
.pcs-tabella thead th{border-top:0;font-size:12px;font-weight:600;color:var(--pcs-muto);white-space:nowrap}
.pcs-tabella th[scope="row"],.pcs-tabella thead th:first-child{text-align:left;font-weight:400}
.pcs-forte{font-weight:700;font-size:15px}
.pcs-sotto{display:block;font-size:12px;color:var(--pcs-muto);padding-left:19px;margin-top:2px}
.pcs-badge{display:inline-block;margin:4px 0 0 19px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--pcs-verde);background:#e8f3ec;border-radius:999px;padding:2px 8px}
.pcs-stato{text-align:left!important;font-size:12px;color:var(--pcs-muto)}
.pcs-stato--ok{color:var(--pcs-verde)}
.pcs-dettagli{margin-top:16px}
.pcs-scheda .pcs-dettagli,.pcs-dettagli:not(.pcs-scheda){border:1px solid var(--pcs-bordo);border-radius:16px;padding:12px}
.pcs-dettagli summary{cursor:pointer;font-weight:700;list-style:none}
.pcs-dettagli summary::-webkit-details-marker{display:none}
.pcs-dettagli summary::after{content:" ›";color:var(--pcs-rosso)}
.pcs-dettagli[open] summary::after{content:" ⌄"}
.pcs-passi{display:inline-flex;align-items:center;gap:6px}
.pcs-passi button{width:26px;height:26px;border:1px solid var(--pcs-bordo);border-radius:50%;background:#fff;cursor:pointer;font:inherit;line-height:1;padding:0;color:var(--pcs-testo)}
.pcs-passi span{min-width:14px;text-align:center}
.pcs-regole ul{margin-top:10px!important}
.pcs-regole li{font-size:14px;color:#3a3a3a;padding-left:14px;position:relative;margin-top:8px}
.pcs-regole li::before{content:"";position:absolute;left:0;top:9px;width:6px;height:6px;border-radius:50%;background:var(--pcs-rosso)}
@media(max-width:600px){.pcs-scheda{padding:14px;border-radius:18px}.pcs-select{width:118px}.pcs-numero{width:62px}.pcs-liste li{padding:10px}.pcs-tabella{font-size:13px}}
`;
