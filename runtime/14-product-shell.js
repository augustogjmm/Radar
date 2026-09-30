/* Radar Técnico — final product shell
   Presentation/IA only. Existing market, scanner, analysis and portfolio engines remain authoritative. */
(()=>{
'use strict';

const $=id=>document.getElementById(id);

function setNavCopy(){
  const copy={
    homeViewBtn:['Hoy','Decisiones · cartera · mercado'],
    scannerViewBtn:['Oportunidades','Acciones · CEDEAR · cripto'],
    fixedIncomeBtn:['Renta fija','Bonos · Letras · ON'],
    watchlistViewBtn:['Seguimiento','Alertas · zonas · triggers'],
    portfolioViewBtn:['Cartera','Posiciones · riesgo · performance'],
    signalsViewBtn:['Historial','Señales · resultados · auditoría']
  };
  for(const [id,[title,sub]] of Object.entries(copy)){
    const b=$(id)?.querySelector('.nav-copy b'),s=$(id)?.querySelector('.nav-copy small');
    if(b)b.textContent=title;if(s)s.textContent=sub;
  }
  const brand=document.querySelector('.sidebar-brand-copy small');
  if(brand)brand.textContent='Decisión · Análisis · Cartera';
}

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

function foldMarketContext(){
  const dash=$('dashboardView');
  if(!dash||$('marketContextDetails'))return;
  const decision=$('decisionCenter'),brief=dash.querySelector('.daily-brief');
  if(decision)decision.classList.add('product-home-primary');
  if(brief)brief.classList.add('product-home-brief');

  const details=document.createElement('details');
  details.id='marketContextDetails';
  details.className='market-context-details';
  details.innerHTML=`
    <summary>
      <span><b>Contexto de mercado</b><small>Macro Argentina · breadth · tasas · curvas · mercados globales</small></span>
      <span class="market-context-action">Abrir contexto completo</span>
    </summary>
    <div class="market-context-body"></div>`;
  dash.appendChild(details);
  const body=details.querySelector('.market-context-body');

  const keep=new Set([decision,brief,details]);
  [...dash.children].forEach(el=>{if(!keep.has(el))body.appendChild(el)});

  details.addEventListener('toggle',()=>{
    const action=details.querySelector('.market-context-action');
    if(action)action.textContent=details.open?'Cerrar contexto completo':'Abrir contexto completo';
    if(details.open)setTimeout(()=>window.dispatchEvent(new Event('resize')),80);
  });
}

function normalizeHome(){
  const dash=$('dashboardView');
  if(!dash)return;
  dash.classList.add('product-home');
  const decision=$('decisionCenter');
  if(decision){
    const title=decision.querySelector('.alloc-rpt-title-line h2');
    if(title)title.textContent='Radar de hoy';
    const p=decision.querySelector('.alloc-rpt-head-main p');
    if(p)p.innerHTML='Prioridades <i></i> cartera <i></i> oportunidades <i></i> calidad de datos';
  }
  const brief=dash.querySelector('.daily-brief h3');
  if(brief)brief.textContent='Qué cambió desde la última revisión';
}

function removeRedundantBackButtons(){
  ['backFromScannerBtn','rfBackBtn','backToAnalysisBtn'].forEach(id=>{
    const el=$(id);if(el){el.classList.add('product-redundant-back');el.setAttribute('aria-hidden','true');el.tabIndex=-1}
  });
}

function setWorkspaceLabels(){
  const scan=$('scannerView')?.querySelector('.scan-toolbar h2');
  if(scan)scan.textContent='Oportunidades · Renta variable y cripto';
  const rf=$('rfScannerView')?.querySelector('.scan-toolbar h2');
  if(rf)rf.textContent='Oportunidades · Renta fija';
}

function apply(){
  document.documentElement.classList.add('radar-product-final');
  setNavCopy();
  mountSignalsWorkspace();
  const signalsNav=$('signalsViewBtn');
  if(signalsNav&&!signalsNav.dataset.productBound){
    signalsNav.dataset.productBound='1';
    signalsNav.addEventListener('click',()=>{
      if(typeof window.showSignalsView==='function')window.showSignalsView();
      else if(typeof showSignalsView==='function')showSignalsView();
    });
  }
  foldMarketContext();
  normalizeHome();
  removeRedundantBackButtons();
  setWorkspaceLabels();
  try{window.renderSignalHistory?.()}catch{}
  try{window.renderDecisionAudit?.()}catch{}
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
window.RadarProductShell=Object.freeze({apply});
})();
