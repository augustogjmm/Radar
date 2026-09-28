/* Radar Técnico G2 · Product reset
   Keeps the certified engines intact and turns the home into a decision workspace. */
(()=>{
  'use strict';
  const VERSION='1.0.0';

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

  function simplifyNavigation(){
    const labels={
      homeViewBtn:['Resumen','Prioridades y contexto'],
      scannerViewBtn:['Oportunidades','Acciones · CEDEAR · cripto'],
      fixedIncomeBtn:['Renta fija','Bonos · Letras · ON'],
      watchlistViewBtn:['Seguimiento','Activos que estás mirando'],
      portfolioViewBtn:['Cartera','Posiciones, P&L y riesgo'],
      signalsViewBtn:['Actividad','Señales y decisiones']
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
    if(title?.textContent==='Mercados') text(title,'Resumen');
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
    simplifyNavigation();
    tuneTopbar();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('load',()=>setTimeout(apply,0),{once:true});

  window.RadarProductReset=Object.freeze({version:VERSION,apply});
})();