/* Radar Técnico · Professional terminal UX
   Sole owner of product hierarchy. Engines/data remain untouched. */
(()=>{
'use strict';

const $=id=>document.getElementById(id);
const text=(el,v)=>{if(el)el.textContent=v};

function ensureHomeCommand(){
  const dashboard=$('dashboardView');
  if(!dashboard)return null;
  let bar=$('productHomeHero');
  if(!bar){
    bar=document.createElement('section');
    bar.id='productHomeHero';
    bar.className='desk-homebar';
    bar.innerHTML=`
      <div class="desk-homebar-copy">
        <span class="desk-kicker">RADAR TÉCNICO</span>
        <div class="desk-homebar-title">
          <h1>Panel de inversión</h1>
          <span id="deskHomeStatus" class="desk-status">Datos en vivo</span>
        </div>
        <p>Prioridades, cartera y mercado en una sola mesa de trabajo.</p>
      </div>
      <div class="desk-homebar-actions">
        <button type="button" data-desk-action="scan">Oportunidades</button>
        <button type="button" class="secondary-action" data-desk-action="portfolio">Cartera</button>
        <button type="button" class="secondary-action" data-desk-action="rf">Renta fija</button>
      </div>`;
    dashboard.prepend(bar);
    bar.querySelector('[data-desk-action="scan"]')?.addEventListener('click',()=>window.showScannerView?.());
    bar.querySelector('[data-desk-action="portfolio"]')?.addEventListener('click',()=>window.showPortfolioView?.());
    bar.querySelector('[data-desk-action="rf"]')?.addEventListener('click',()=>window.showFixedIncomeScanner?.());
  }
  return bar;
}

function buildMarketStrip(){
  const dashboard=$('dashboardView'), hero=$('productHomeHero');
  if(!dashboard||!hero)return;
  let box=$('productMarketContext');
  if(!box){
    box=document.createElement('section');
    box.id='productMarketContext';
    box.className='desk-market-strip';
    box.innerHTML=`
      <header class="desk-section-head">
        <div><span class="desk-kicker">MERCADO</span><h2>Contexto inmediato</h2></div>
        <button id="productRefreshMarket" type="button" class="secondary-action compact-action">Actualizar</button>
      </header>
      <div class="desk-market-body"></div>`;
    hero.insertAdjacentElement('afterend',box);
    $('productRefreshMarket')?.addEventListener('click',()=> $('dashRefreshBtn')?.click());
  }
  const body=box.querySelector('.desk-market-body');
  const kpis=dashboard.querySelector('.dash-kpis');
  const official=dashboard.querySelector('.dash-official-strip');
  if(kpis&&kpis.parentElement!==body)body.appendChild(kpis);
  if(official&&official.parentElement!==body)body.appendChild(official);
  dashboard.querySelector('.dash-head')?.classList.add('desk-hide');
  const loading=$('dashLoadingPanel');
  if(loading&&!loading.dataset.deskMoved){
    loading.dataset.deskMoved='1';
    box.insertAdjacentElement('afterend',loading);
  }
}

function simplifyDecisionCenter(){
  const dashboard=$('dashboardView'), dc=$('decisionCenter');
  if(!dashboard||!dc)return;
  let details=$('productDecisionContext');
  if(!details){
    details=document.createElement('details');
    details.id='productDecisionContext';
    details.className='desk-details';
    details.innerHTML=`
      <summary>
        <span><b>Contexto de decisión</b><small>Lectura agregada de scanners, cartera y reglas del motor</small></span>
        <span class="desk-summary-action">Abrir</span>
      </summary>
      <div class="desk-details-body"></div>`;
    const market=$('productMarketContext');
    (market||$('productHomeHero'))?.insertAdjacentElement('afterend',details);
    details.addEventListener('toggle',()=>{
      const a=details.querySelector('.desk-summary-action');if(a)a.textContent=details.open?'Cerrar':'Abrir';
    });
  }
  const body=details.querySelector('.desk-details-body');
  if(dc.parentElement!==body)body.appendChild(dc);
  dc.classList.add('desk-decision');
  text(dc.querySelector('.alloc-rpt-title-line h2'),'Lectura agregada');
  const p=dc.querySelector('.alloc-rpt-head-main p'); if(p)p.innerHTML='Scanners <i></i> cartera <i></i> prioridades <i></i> calidad de datos';
  dc.querySelector('.decision-analytics-card')?.classList.add('desk-hide');
  dc.querySelector('.decision-footnote')?.classList.add('desk-hide');
}

function foldAdvancedMarket(){
  const dashboard=$('dashboardView');
  if(!dashboard)return;
  let details=$('productAdvancedContext');
  if(!details){
    details=document.createElement('details');
    details.id='productAdvancedContext';
    details.className='desk-details';
    details.innerHTML=`
      <summary>
        <span><b>Mercado y macro</b><small>Breadth, tasas, curvas, mercados globales e informe diario</small></span>
        <span class="desk-summary-action">Abrir</span>
      </summary>
      <div class="desk-details-body"></div>`;
    dashboard.appendChild(details);
    details.addEventListener('toggle',()=>{
      const a=details.querySelector('.desk-summary-action');if(a)a.textContent=details.open?'Cerrar':'Abrir';
      if(details.open)setTimeout(()=>window.dispatchEvent(new Event('resize')),80);
    });
  }
  const body=details.querySelector('.desk-details-body');
  [dashboard.querySelector('.daily-brief'),dashboard.querySelector('.intel-wrap'),dashboard.querySelector('.market-board')]
    .filter(Boolean).forEach(el=>{if(el.parentElement!==body)body.appendChild(el)});
}

function shapeScanner(){
  const view=$('scannerView'); if(!view)return;
  view.classList.add('desk-scanner');
  text(view.querySelector('.scan-toolbar h2'),'Oportunidades');
  text(view.querySelector('.scan-toolbar .sub'),'Filtrá, ordená y abrí sólo los activos que merecen análisis.');
  view.querySelector('.scanner-analytics-card')?.classList.add('desk-hide');
  $('scanDiagnostic')?.classList.add('desk-diagnostic');
  const filter=$('scanFilter'); if(filter&&filter.value==='all')filter.value='actionable';
  view.querySelector('.scan-summary')?.classList.add('desk-scan-summary');
  view.querySelector('.scan-table')?.classList.add('desk-data-table');
}

function shapeFixedIncome(){
  const view=$('rfScannerView'); if(!view)return;
  view.classList.add('desk-rf');
  text(view.querySelector('.scan-toolbar h2'),'Renta fija');
  text(view.querySelector('.scan-toolbar .sub'),'Curva, TIR, paridad, duration y liquidez para comparar instrumentos.');
  view.querySelector('.rf-table')?.classList.add('desk-data-table');
}

function syncAnalysisType(){
  const type=String($('assetType')?.value||'').toLowerCase();
  const fund=$('fundamentalsCard');
  if(fund)fund.hidden=['crypto','bond','argbond','on'].includes(type);
}
function shapeAnalysis(){
  const view=$('analysisView'); if(!view)return;
  view.classList.add('desk-analysis');
  const right=view.querySelector('.right-stack'); if(!right)return;
  const cards=[...right.children];
  const decision=cards.find(el=>/DECISIÓN OPERATIVA|DECISIÓN/i.test(el.querySelector?.('h3')?.textContent||''));
  const levels=cards.find(el=>/NIVELES RELEVANTES/i.test(el.querySelector?.('h3')?.textContent||''));
  if(decision)right.prepend(decision);
  if(levels&&decision)decision.insertAdjacentElement('afterend',levels);
  if(decision)text(decision.querySelector('h3'),'DECISIÓN');
  const position=decision?.querySelector('.position-panel');
  if(position&&!position.closest('.desk-risk-sizing')){
    const riskDetails=document.createElement('details');
    riskDetails.className='desk-risk-sizing';
    riskDetails.innerHTML='<summary><span><b>Tamaño de posición</b><small>Calculadora de riesgo y cantidad</small></span><span>Abrir</span></summary><div class="desk-risk-sizing-body"></div>';
    position.parentElement.insertBefore(riskDetails,position);
    riskDetails.querySelector('.desk-risk-sizing-body').appendChild(position);
    riskDetails.addEventListener('toggle',()=>{riskDetails.querySelector('summary>span:last-child').textContent=riskDetails.open?'Cerrar':'Abrir'});
  }
  const secondary=[...right.children].filter(el=>el!==decision&&el!==levels);
  const below=[...view.querySelectorAll('.below-grid')];
  const fundamentals=$('fundamentalsCard');
  const advanced=[...below,...secondary,...(fundamentals?[fundamentals]:[])].filter(Boolean);
  let details=$('productAnalysisAdvanced');
  if(advanced.length&&!details){
    details=document.createElement('details');
    details.id='productAnalysisAdvanced';
    details.className='desk-details desk-analysis-advanced';
    details.innerHTML=`
      <summary>
        <span><b>Análisis avanzado</b><small>Multi-timeframe, escenarios, momentum, validación y fundamentales</small></span>
        <span class="desk-summary-action">Abrir</span>
      </summary>
      <div class="desk-details-body"></div>`;
    view.appendChild(details);
    details.addEventListener('toggle',()=>{
      const a=details.querySelector('.desk-summary-action');if(a)a.textContent=details.open?'Cerrar':'Abrir';
    });
  }
  if(details){
    const body=details.querySelector('.desk-details-body');
    advanced.forEach(el=>{if(el.parentElement!==body)body.appendChild(el)});
  }
  syncAnalysisType();
  $('assetType')?.addEventListener('change',syncAnalysisType);
  $('analyzeBtn')?.addEventListener('click',()=>setTimeout(syncAnalysisType,50));
}

function shapePortfolio(){
  const root=$('portfolio360Section'); if(!root)return;
  root.classList.add('desk-portfolio');
  text(root.querySelector('.p360-master-head h2'),'Cartera');
  text(root.querySelector('.p360-master-head p'),'Valor, P&L, posiciones y concentración. Riesgo y stress quedan disponibles como detalle.');
  const dash=root.querySelector('.p360-master-dashboard');
  if(dash){
    const positions=dash.querySelector('.p360-master-positions');
    [...dash.children].forEach(el=>{if(el!==positions)el.classList.add('desk-hide')});
    positions?.classList.add('desk-portfolio-positions');
  }
  const advanced=[
    root.querySelector('#g2PortfolioCutoverPanel'),
    root.querySelector('.portfolio-diversification'),
    root.querySelector('.portfolio-ledger'),
    root.querySelector('#portfolioRiskSection'),
    root.querySelector('.performance-panel'),
    root.querySelector('.stress-panel')
  ].filter(Boolean);
  let details=$('productPortfolioAdvanced');
  if(advanced.length&&!details){
    details=document.createElement('details');
    details.id='productPortfolioAdvanced';
    details.className='desk-details desk-portfolio-advanced';
    details.innerHTML=`
      <summary>
        <span><b>Riesgo y análisis de cartera</b><small>Exposición, performance, stress, diversificación y movimientos</small></span>
        <span class="desk-summary-action">Abrir</span>
      </summary>
      <div class="desk-details-body"></div>`;
    root.appendChild(details);
    details.addEventListener('toggle',()=>{
      const a=details.querySelector('.desk-summary-action');if(a)a.textContent=details.open?'Cerrar':'Abrir';
    });
  }
  if(details){
    const body=details.querySelector('.desk-details-body');
    advanced.forEach(el=>{if(el.parentElement!==body)body.appendChild(el)});
  }
}

function shapeWatchlist(){
  $('watchlistView')?.classList.add('desk-watchlist');
  $('portfolioMonitorPanel')?.classList.add('desk-secondary');
  $('portfolioEntryPanel')?.classList.add('desk-secondary');
}

function nav(){
  const labels={
    homeViewBtn:['Hoy','Prioridades y mercado'],
    scannerViewBtn:['Oportunidades','Acciones · CEDEAR · cripto'],
    fixedIncomeBtn:['Renta fija','Bonos · Letras · ON'],
    watchlistViewBtn:['Seguimiento','Watchlist · alertas'],
    portfolioViewBtn:['Cartera','Posiciones · P&L · riesgo'],
    signalsViewBtn:['Historial','Señales · decisiones']
  };
  for(const [id,[a,b]] of Object.entries(labels)){
    const el=$(id); if(!el)continue;
    text(el.querySelector('.nav-copy b'),a); text(el.querySelector('.nav-copy small'),b);
  }
  text(document.querySelector('.sidebar-brand-copy small'),'Mesa de inversión');
  const input=$('symbol'); if(input)input.placeholder='Ticker: BTCUSDT, AAPL, GGAL, AE38…';
}

function topbar(){
  const title=$('viewTitle'),sub=$('viewSubtitle');
  if(title&&/Mercados|Resumen|Hoy/.test(title.textContent))text(title,'Hoy');
  if(sub)text(sub,'Prioridades, cartera y contexto');
}

function apply(){
  document.documentElement.classList.add('radar-professional-terminal');
  ensureHomeCommand();
  buildMarketStrip();
  simplifyDecisionCenter();
  foldAdvancedMarket();
  shapeScanner();
  shapeFixedIncome();
  shapeAnalysis();
  shapePortfolio();
  shapeWatchlist();
  nav();
  topbar();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
window.addEventListener('load',()=>setTimeout(apply,0),{once:true});
window.RadarProfessionalUX=Object.freeze({apply});
})();