/* Radar Técnico G2 · Product reset
   Keeps the certified engines intact and turns the home into a decision workspace. */
(()=>{
  'use strict';
  const VERSION='1.2.0';

  function text(el,value){ if(el) el.textContent=value; }

  function makeHero(){
    if(document.getElementById('productHomeHero')) return;
    const dashboard=document.getElementById('dashboardView');
    if(!dashboard) return;
    const hero=document.createElement('section');
    hero.id='productHomeHero';
    hero.className='product-home-hero';
    hero.innerHTML=`
      <div class="product-home-copy">
        <span class="product-kicker">RADAR DE DECISIONES</span>
        <h1>Qué merece tu atención ahora</h1>
        <p>Oportunidades, riesgo de cartera y contexto de mercado, priorizados en una sola vista.</p>
      </div>
      <div class="product-home-actions">
        <button type="button" data-product-action="scan">Buscar oportunidades</button>
        <button type="button" class="secondary-action" data-product-action="portfolio">Revisar cartera</button>
        <button type="button" class="secondary-action" data-product-action="rf">Comparar renta fija</button>
      </div>`;
    dashboard.prepend(hero);

    hero.querySelector('[data-product-action="scan"]')?.addEventListener('click',()=>window.showScannerView?.());
    hero.querySelector('[data-product-action="portfolio"]')?.addEventListener('click',()=>window.showPortfolioView?.());
    hero.querySelector('[data-product-action="rf"]')?.addEventListener('click',()=>window.showFixedIncomeScanner?.());
  }

  function simplifyDecisionCenter(){
    const dc=document.getElementById('decisionCenter');
    const dashboard=document.getElementById('dashboardView');
    if(!dc||!dashboard) return;

    const hero=document.getElementById('productHomeHero');
    if(hero && hero.nextElementSibling!==dc) hero.insertAdjacentElement('afterend',dc);

    const title=dc.querySelector('.decision-head h2');
    text(title,'Prioridades');
    const subtitle=dc.querySelector('.decision-head p');
    text(subtitle,'Primero lo accionable. Después, el detalle.');

    const analytics=dc.querySelector('.decision-analytics-card');
    if(analytics) analytics.hidden=true;
    const footnote=dc.querySelector('.decision-footnote');
    if(footnote) footnote.hidden=true;

    const metrics=[...dc.querySelectorAll('.decision-v74-metric')];
    metrics.forEach((el,i)=>el.classList.toggle('product-secondary-metric',i>=4));

    const attention=dc.querySelector('.decision-premium-attention h3');
    text(attention,'Oportunidades y riesgos prioritarios');
    const attentionSub=dc.querySelector('.decision-premium-attention small');
    text(attentionSub,'Sólo aparecen elementos con una razón concreta para mirarlos.');

    const portfolio=dc.querySelector('.decision-premium-portfolio h3');
    text(portfolio,'Cartera que requiere atención');
    const portfolioSub=dc.querySelector('.decision-premium-portfolio small');
    text(portfolioSub,'Posiciones con cambio técnico, riesgo o concentración relevante.');
  }

  function buildContextBlock(){
    const dashboard=document.getElementById('dashboardView');
    const dc=document.getElementById('decisionCenter');
    const kpis=dashboard?.querySelector('.dash-kpis');
    const official=dashboard?.querySelector('.dash-official-strip');
    if(!dashboard||!dc||!kpis||document.getElementById('productMarketContext')) return;

    const section=document.createElement('section');
    section.id='productMarketContext';
    section.className='product-market-context';
    section.innerHTML=`
      <div class="product-section-head">
        <div>
          <span class="product-kicker">CONTEXTO</span>
          <h2>Mercado en cuatro números</h2>
        </div>
        <button type="button" class="secondary-action compact-action" id="productRefreshMarket">Actualizar</button>
      </div>`;

    dc.insertAdjacentElement('afterend',section);
    section.appendChild(kpis);
    if(official) section.appendChild(official);
    document.getElementById('productRefreshMarket')?.addEventListener('click',()=>document.getElementById('dashRefreshBtn')?.click());

    const oldHead=dashboard.querySelector('.dash-head');
    if(oldHead) oldHead.classList.add('product-hidden-legacy-head');
    const loading=dashboard.querySelector('#dashLoadingPanel');
    if(loading) section.insertAdjacentElement('afterend',loading);
  }

  function foldAdvancedContext(){
    const dashboard=document.getElementById('dashboardView');
    if(!dashboard||document.getElementById('productAdvancedContext')) return;

    const blocks=[
      dashboard.querySelector('.daily-brief'),
      dashboard.querySelector('.intel-wrap'),
      dashboard.querySelector('.market-board')
    ].filter(Boolean);
    if(!blocks.length) return;

    const details=document.createElement('details');
    details.id='productAdvancedContext';
    details.className='product-advanced-context';
    details.innerHTML=`
      <summary>
        <span>
          <b>Contexto avanzado</b>
          <small>Breadth, tasas, curvas, mercados de referencia e informe diario</small>
        </span>
        <span class="product-summary-action">Abrir detalle</span>
      </summary>
      <div class="product-advanced-body"></div>`;
    dashboard.appendChild(details);
    const body=details.querySelector('.product-advanced-body');
    blocks.forEach(b=>body.appendChild(b));
    details.addEventListener('toggle',()=>{
      const a=details.querySelector('.product-summary-action');
      if(a) a.textContent=details.open?'Cerrar detalle':'Abrir detalle';
    });
  }


  function simplifyScanner(){
    const view=document.getElementById('scannerView');
    if(!view) return;
    view.classList.add('product-scanner');

    const title=view.querySelector('.scan-toolbar h2');
    const sub=view.querySelector('.scan-toolbar .sub');
    text(title,'Oportunidades');
    text(sub,'Filtrá un universo y quedate con lo accionable. El detalle técnico aparece sólo cuando lo necesitás.');

    const diagnostic=document.getElementById('scanDiagnostic');
    if(diagnostic) diagnostic.classList.add('product-muted-diagnostic');

    const analytics=view.querySelector('.scanner-analytics-card');
    if(analytics) analytics.hidden=true;

    const filter=document.getElementById('scanFilter');
    if(filter && filter.value==='all') filter.value='actionable';

    const summary=view.querySelector('.scan-summary');
    if(summary) summary.classList.add('product-scan-summary');

    const table=view.querySelector('.scan-table');
    if(table) table.classList.add('product-scan-table');
  }

  function simplifyAnalysis(){
    const view=document.getElementById('analysisView');
    if(!view) return;
    view.classList.add('product-analysis');

    const right=view.querySelector('.right-stack');
    if(!right) return;

    const cards=[...right.children];
    const decision=cards.find(el=>el.querySelector?.('h3')?.textContent?.trim()==='DECISIÓN OPERATIVA');
    const levels=cards.find(el=>el.querySelector?.('h3')?.textContent?.trim()==='NIVELES RELEVANTES');
    if(decision && right.firstElementChild!==decision) right.prepend(decision);
    if(levels && decision && decision.nextElementSibling!==levels) decision.insertAdjacentElement('afterend',levels);

    const secondary=cards.filter(el=>el!==decision&&el!==levels);
    const below=[...view.querySelectorAll('.below-grid')];
    const fundamentals=document.getElementById('fundamentalsCard');
    const advanced=[...below,...secondary,...(fundamentals?[fundamentals]:[])].filter(Boolean);

    if(advanced.length&&!document.getElementById('productAnalysisAdvanced')){
      const details=document.createElement('details');
      details.id='productAnalysisAdvanced';
      details.className='product-advanced-context product-analysis-advanced';
      details.innerHTML=`
        <summary>
          <span>
            <b>Análisis avanzado</b>
            <small>Multi-timeframe, escenarios, confluencia, Fibonacci, momentum, fuerza relativa, backtest y fundamentales</small>
          </span>
          <span class="product-summary-action">Abrir detalle</span>
        </summary>
        <div class="product-advanced-body"></div>`;
      view.appendChild(details);
      const body=details.querySelector('.product-advanced-body');
      advanced.forEach(el=>body.appendChild(el));
      details.addEventListener('toggle',()=>{
        const a=details.querySelector('.product-summary-action');
        if(a) a.textContent=details.open?'Cerrar detalle':'Abrir detalle';
      });
    }

    const h=decision?.querySelector('h3');
    text(h,'DECISIÓN');
    const why=decision?.querySelector('#decisionWhy')?.closest('.reason-box');
    if(why) why.classList.add('product-primary-reason');
  }

  function foldPortfolioAdvanced(){
    const root=document.getElementById('portfolio360Section');
    if(!root||document.getElementById('productPortfolioAdvanced')) return;
    root.classList.add('product-portfolio');

    const headline=root.querySelector('.p360-master-head h2');
    text(headline,'Cartera');
    const subtitle=root.querySelector('.p360-master-head p');
    text(subtitle,'Valor, resultado, concentración y posiciones. Lo avanzado queda disponible sin invadir la vista principal.');

    const dashboard=root.querySelector('.p360-master-dashboard');
    if(dashboard){
      const positionCard=dashboard.querySelector('.p360-master-positions');
      [...dashboard.children].forEach(el=>{
        if(el!==positionCard) el.classList.add('product-portfolio-secondary-card');
      });
    }

    const advanced=[
      root.querySelector('#g2PortfolioCutoverPanel'),
      root.querySelector('.portfolio-diversification'),
      root.querySelector('.portfolio-ledger'),
      root.querySelector('#portfolioRiskSection'),
      root.querySelector('.performance-panel'),
      root.querySelector('.stress-panel')
    ].filter(Boolean);

    if(advanced.length){
      const details=document.createElement('details');
      details.id='productPortfolioAdvanced';
      details.className='product-advanced-context product-portfolio-advanced';
      details.innerHTML=`
        <summary>
          <span>
            <b>Análisis avanzado de cartera</b>
            <small>Riesgo, performance, stress, diversificación, movimientos y conciliación</small>
          </span>
          <span class="product-summary-action">Abrir detalle</span>
        </summary>
        <div class="product-advanced-body"></div>`;
      root.appendChild(details);
      const body=details.querySelector('.product-advanced-body');
      advanced.forEach(el=>body.appendChild(el));
      details.addEventListener('toggle',()=>{
        const a=details.querySelector('.product-summary-action');
        if(a) a.textContent=details.open?'Cerrar detalle':'Abrir detalle';
      });
    }
  }

  function simplifyWatchlist(){
    const view=document.getElementById('watchlistView');
    if(!view) return;
    view.classList.add('product-watchlist');
    const monitor=document.getElementById('portfolioMonitorPanel');
    if(monitor) monitor.classList.add('product-watch-secondary');
    const entry=document.getElementById('portfolioEntryPanel');
    if(entry) entry.classList.add('product-watch-entry');
  }

  function simplifyNavigation(){
    const labels={
      homeViewBtn:['Hoy','Prioridades y contexto'],
      scannerViewBtn:['Oportunidades','Acciones · CEDEAR · cripto'],
      fixedIncomeBtn:['Renta fija','Bonos · Letras · ON'],
      watchlistViewBtn:['Seguimiento','Activos que estás mirando'],
      portfolioViewBtn:['Cartera','Posiciones, P&L y riesgo'],
      signalsViewBtn:['Historial','Señales y decisiones']
    };
    for(const [id,[name,sub]] of Object.entries(labels)){
      const el=document.getElementById(id);
      if(!el) continue;
      text(el.querySelector('.nav-copy b'),name);
      text(el.querySelector('.nav-copy small'),sub);
    }
    const brand=document.querySelector('.sidebar-brand-copy small');
    text(brand,'Decisiones · Mercado · Cartera');
  }

  function tuneTopbar(){
    const title=document.getElementById('viewTitle');
    const subtitle=document.getElementById('viewSubtitle');
    if(title?.textContent==='Mercados') text(title,'Hoy');
    if(subtitle) text(subtitle,'Prioridades, cartera y contexto');
    const input=document.getElementById('symbol');
    if(input) input.placeholder='Analizar activo: BTCUSDT, AAPL, GGAL, AE38…';
  }

  function apply(){
    document.documentElement.classList.add('radar-product-reset');
    makeHero();
    simplifyDecisionCenter();
    buildContextBlock();
    foldAdvancedContext();
    simplifyScanner();
    simplifyAnalysis();
    foldPortfolioAdvanced();
    simplifyWatchlist();
    simplifyNavigation();
    tuneTopbar();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});

  window.RadarProductReset=Object.freeze({version:VERSION,apply});
})();