/* Radar Técnico · Historial shell only. Keeps product UX independent from audit mounting. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
function mountSignalsWorkspace(){
  if($('signalsView'))return;
  const wrap=document.querySelector('.wrap');
  if(!wrap)return;
  const view=document.createElement('div');
  view.id='signalsView';
  view.className='signals-view';
  view.innerHTML=`
    <section class="product-workspace-head">
      <div>
        <span class="product-eyebrow">TRAZABILIDAD</span>
        <h2>Historial y auditoría</h2>
        <p>Señales originales, resultados observados y decisiones registradas sin reescribir el pasado.</p>
      </div>
      <div class="product-head-actions">
        <button id="signalAuditBtn">Auditar señales</button>
        <button id="signalExportBtn" class="secondary-action">Exportar CSV</button>
        <button id="signalClearBtn" class="secondary-action">Limpiar historial</button>
      </div>
    </section>
    <section class="signal-kpi-grid">
      <article><small>TOTAL</small><b id="sigTotal">0</b></article>
      <article><small>AUDITABLES</small><b id="sigAuditable">0</b></article>
      <article><small>RESUELTAS</small><b id="sigResolved">0</b></article>
      <article><small>WIN RATE</small><b id="sigWinRate">—</b></article>
      <article><small>ABIERTAS</small><b id="sigOpen">0</b></article>
      <article><small>SIN TRIGGER</small><b id="sigUntriggered">0</b></article>
      <article><small>R PROMEDIO</small><b id="sigAvgR">—</b></article>
    </section>
    <div id="signalEvidenceNote" class="product-note">Sin evidencia suficiente todavía.</div>
    <section class="signal-controls">
      <label>Origen<select id="signalSourceFilter"><option value="all">Todos</option><option value="scanner-rv">Escáner RV</option><option value="scanner-rf">Escáner RF</option><option value="watchlist">Seguimiento</option></select></label>
      <label>Resultado<select id="signalOutcomeFilter"><option value="all">Todos</option><option value="open">Abiertas</option><option value="resolved">Resueltas</option><option value="win">TP1</option><option value="loss">STOP</option><option value="untriggered">Sin trigger</option><option value="info">Informativas</option></select></label>
      <label>Período<select id="signalPeriodFilter"><option value="0">Todo</option><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select></label>
      <div id="signalAuditProgress" class="signal-progress"><span id="signalAuditBar"></span><b id="signalAuditText">Listo</b></div>
    </section>
    <section class="product-table-card">
      <div class="product-table-scroll">
        <table class="signal-table">
          <thead><tr><th>Fecha</th><th>Activo</th><th>Origen</th><th>Señal</th><th>TF</th><th>Precio</th><th>Entrada</th><th>Stop</th><th>TP1</th><th>Score</th><th>Resultado</th><th>MFE</th><th>MAE</th><th>R</th><th>Motivo</th></tr></thead>
          <tbody id="signalBody"><tr><td colspan="15" class="signal-empty">Sin señales registradas.</td></tr></tbody>
        </table>
      </div>
    </section>
    <section class="product-table-card decision-audit-card">
      <header class="product-section-head">
        <div><span class="product-eyebrow">AUDITORÍA DE DECISIONES</span><h3>Qué decidió Radar y con qué evidencia</h3></div>
        <button id="decisionAuditExportBtn" class="secondary-action">Exportar auditoría</button>
      </header>
      <div class="product-table-scroll">
        <table class="signal-table">
          <thead><tr><th>Fecha</th><th>Activo</th><th>Origen</th><th>Decisión</th><th>Acción</th><th>Score</th><th>Modelo</th><th>Radar</th><th>Motivo / datos</th></tr></thead>
          <tbody id="decisionAuditBody"><tr><td colspan="9" class="signal-empty">Sin decisiones auditadas.</td></tr></tbody>
        </table>
      </div>
    </section>`;

  const footer=document.querySelector('.footer');
  if(footer)footer.before(view);else wrap.appendChild(view);

  for(const id of ['signalSourceFilter','signalOutcomeFilter','signalPeriodFilter']){
    $(id)?.addEventListener('change',()=>window.renderSignalHistory?.());
  }
  $('signalAuditBtn')?.addEventListener('click',()=>window.auditAllSignals?.());
  $('signalExportBtn')?.addEventListener('click',()=>window.exportSignalCsv?.());
  $('signalClearBtn')?.addEventListener('click',()=>window.clearSignalHistory?.());
  $('decisionAuditExportBtn')?.addEventListener('click',()=>window.exportDecisionAudit?.());
}

function apply(){
  mountSignalsWorkspace();
  const nav=$('signalsViewBtn');
  if(nav&&!nav.dataset.historyBound){
    nav.dataset.historyBound='1';
    nav.addEventListener('click',()=>{
      if(typeof window.showSignalsView==='function')window.showSignalsView();
      else if(typeof showSignalsView==='function')showSignalsView();
    });
  }
  try{window.renderSignalHistory?.()}catch{}
  try{window.renderDecisionAudit?.()}catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
window.RadarHistoryShell=Object.freeze({apply});
})();