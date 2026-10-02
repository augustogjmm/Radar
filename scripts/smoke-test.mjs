import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.RADAR_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1672,height:941}});
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));

function makeBars(count=420,start=100,step=0.08,seconds=86400){
  const now=Math.floor(Date.now()/1000),bars=[];
  for(let i=0;i<count;i++){
    const time=now-(count-i)*seconds;
    const center=start+i*step+Math.sin(i/9)*2+Math.sin(i/31)*3;
    const open=center+Math.sin(i/3)*0.35;
    const close=center+Math.cos(i/5)*0.45;
    const high=Math.max(open,close)+1.1+(i%5)*0.03;
    const low=Math.min(open,close)-1.0-(i%7)*0.02;
    bars.push({time,open,high,low,close,volume:1000000+i*1700});
  }
  return bars;
}
const daily=makeBars(520,100,0.09,86400);
const hourly=makeBars(520,100,0.025,3600);
const bymaPayload=bars=>({s:'ok',t:bars.map(x=>x.time),o:bars.map(x=>x.open),h:bars.map(x=>x.high),l:bars.map(x=>x.low),c:bars.map(x=>x.close),v:bars.map(x=>x.volume)});
const yahooPayload=bars=>({chart:{result:[{timestamp:bars.map(x=>x.time),meta:{regularMarketPrice:bars.at(-1).close,chartPreviousClose:bars.at(-2).close},indicators:{quote:[{open:bars.map(x=>x.open),high:bars.map(x=>x.high),low:bars.map(x=>x.low),close:bars.map(x=>x.close),volume:bars.map(x=>x.volume)}]}}],error:null}});
const binancePayload=bars=>bars.map(x=>[x.time*1000,String(x.open),String(x.high),String(x.low),String(x.close),String(x.volume),x.time*1000+3599999,'0',100,'0','0','0']);
const listItem=(symbol,price,volume,extra={})=>({symbol,trade:price,closingPrice:price,volume,tradeVolume:volume,volumeAmount:price*volume,settlementType:'2',denominationCcy:'ARS',source:'QA fixture',...extra});
const bymaEquitiesFixture={source:'QA fixture',items:[listItem('GGAL',7200,250000),listItem('YPFD',58200,180000),listItem('PAMP',5100,160000),listItem('VIST',18900,140000),listItem('TGSU2',6400,120000)]};
const bymaCedearsFixture={source:'QA fixture',items:[listItem('AAPL',42000,350000),listItem('NVDA',39800,330000),listItem('MELI',29800,210000),listItem('MSFT',36000,190000),listItem('AMZN',31000,170000)]};
const bymaFixedFixture={source:'QA fixture',items:[listItem('AL30',78.4,900000,{type:'bond',category:'Soberano'}),listItem('AE38',73.2,780000,{type:'bond',category:'Soberano'}),listItem('GD30',79.1,760000,{type:'bond',category:'Soberano'}),listItem('S31O6',101.5,650000,{type:'bond',category:'LECAP/BONCAP'})]};
const yahooBatchPayload=u=>{
  const bars=u.searchParams.get('interval')==='15m'?hourly:daily;
  const symbols=(u.searchParams.get('symbols')||'').split(',').filter(Boolean);
  return {source:'QA fixture',items:symbols.map((symbol,i)=>{
    const shifted=bars.map((b,j)=>({...b,close:b.close+i*3,open:b.open+i*3,high:b.high+i*3,low:b.low+i*3}));
    const last=shifted.at(-1).close,prev=shifted.at(-2).close;
    return {symbol,ok:true,last,changePct:((last/prev)-1)*100,volume:shifted.at(-1).volume,bars:shifted,source:'QA fixture'};
  })};
};

await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==new URL(base).origin)return route.continue();
  if(u.pathname==='/api/binance')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(binancePayload(hourly))});
  if(u.pathname==='/api/yahoo')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(yahooPayload(u.searchParams.get('interval')==='1wk'?daily:hourly))});
  if(u.pathname==='/api/yahoo-batch')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(yahooBatchPayload(u))});
  if(u.pathname==='/api/byma/equities')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bymaEquitiesFixture)});
  if(u.pathname==='/api/byma/cedears')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bymaCedearsFixture)});
  if(u.pathname==='/api/byma/fixed-income')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bymaFixedFixture)});
  if(u.pathname==='/api/byma/scan-history'||u.pathname==='/api/byma/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bymaPayload(daily))});
  return route.continue();
});

async function assert(condition,message){
  if(!condition)throw new Error(message);
}
async function shot(name){
  await page.screenshot({path:`artifacts/${name}.png`,fullPage:true});
}
async function navClick(id){
  const globalShell=await page.evaluate(()=>document.body.classList.contains('rt-global-shell'));
  if(globalShell){
    const ok=await page.evaluate(id=>{const el=document.getElementById(id);if(!el)return false;el.click();return true},id);
    if(!ok)throw new Error('Control de navegación ausente: '+id);
  }else{
    await page.click('#'+id);
  }
}

try{
  const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await assert(response?.ok(),`Home HTTP ${response?.status()}`);
  await page.waitForFunction(()=>typeof window.scanOne==='function'&&typeof window.showScannerView==='function',{timeout:30000});
  await page.waitForSelector('#dashboardView',{state:'attached',timeout:15000});
  await page.waitForTimeout(1200);
  const design=await page.evaluate(()=>{
    const sidebar=document.getElementById('appSidebar');
    const wrap=document.querySelector('.wrap');
    const top=document.querySelector('.top');
    const css=[...document.styleSheets].map(x=>x.href||'').filter(Boolean);
    const sr=sidebar?.getBoundingClientRect(),wr=wrap?.getBoundingClientRect(),tr=top?.getBoundingClientRect();
    return {
      productCss:css.some(x=>x.includes('/styles/06-product-design.css')),
      productResetCss:css.some(x=>x.includes('/styles/07-product-reset.css')),
      historyCss:css.some(x=>x.includes('/styles/08-history-shell.css')),
      deployment:document.querySelector('meta[name="radar-deployment"]')?.content||'',
      productRoot:document.documentElement.classList.contains('radar-product-reset'),
      bodyBg:getComputedStyle(document.body).backgroundColor,
      sidebarWidth:sr?.width||0,
      sidebarRight:sr?.right||0,
      wrapLeft:wr?.left||0,
      topHeight:tr?.height||0,
      bodyOverflow:document.documentElement.scrollWidth-window.innerWidth,
      navCount:document.querySelectorAll('.side-nav-item').length,
      globalShell:document.body.classList.contains('rt-global-shell'),
      globalCommandCenter:!!document.getElementById('rtGlobalRadar'),
      globalAppbarHeight:document.getElementById('rtGlobalAppbar')?.getBoundingClientRect().height||0,
      globalSections:{
        map:!!document.querySelector('.rt-world-card'),
        risk:!!document.querySelector('.rt-risk-card'),
        region:!!document.getElementById('rtRegionDetail'),
        watch:!!document.querySelector('.rt-watch-card'),
        argentina:!!document.getElementById('rtArgentinaSignals'),
        signals:!!document.getElementById('rtMarketSignals'),
        opportunities:!!document.querySelector('.rt-opps-card')
      }
    };
  });
  await assert(design.productCss,'Base product stylesheet no cargó');
  await assert(design.productResetCss,'Product reset stylesheet no cargó');
  await assert(design.historyCss,'Historial stylesheet no cargó');
  await assert(design.productRoot,'Product reset no se inicializó');
  await assert(design.deployment==='radar-professional-ux-20260930','Deployment marker incorrecto: '+design.deployment);
  if(design.globalCommandCenter){
    await assert(design.globalShell,'Global Command Center no activó su shell');
    await assert(design.sidebarWidth===0,'El sidebar legacy debe quedar oculto en Global Command Center: '+design.sidebarWidth);
    await assert(design.globalAppbarHeight>=60&&design.globalAppbarHeight<=70,'Appbar global fuera de diseño: '+design.globalAppbarHeight);
    await assert(Object.values(design.globalSections).every(Boolean),'Global Command Center incompleto: '+JSON.stringify(design.globalSections));
  }else{
    await assert(design.sidebarWidth>=220&&design.sidebarWidth<=260,'Sidebar fuera de diseño: '+design.sidebarWidth);
    await assert(design.wrapLeft>=design.sidebarRight-2,'Contenido superpuesto al sidebar');
    await assert(design.topHeight>=60&&design.topHeight<=90,'Topbar fuera de diseño: '+design.topHeight);
    await assert(design.navCount>=8,'Navegación incompleta');
  }
  await assert(design.bodyOverflow<=4,'Overflow horizontal global: '+design.bodyOverflow);

  if(design.globalCommandCenter){
    await page.click('#rtRegionOpen');
    await page.waitForFunction(()=>{const x=document.getElementById('rtRegionalDecisionCenter');return x&&!x.hidden&&x.getBoundingClientRect().width>900&&x.getBoundingClientRect().height>500});
    const regionalCenter=await page.evaluate(()=>({
      visible:!document.getElementById('rtRegionalDecisionCenter')?.hidden,
      kpis:document.querySelectorAll('#rtRegionalDecisionCenter .rdc-kpis article').length,
      drivers:document.querySelectorAll('#rtRdcDrivers .rdc-driver-row').length,
      indices:document.querySelectorAll('#rtRdcIndexRows .rdc-index-row').length,
      traffic:document.querySelectorAll('#rtRdcTraffic .rdc-impact-card').length,
      map:!!document.querySelector('#rtRdcMapHost svg'),
      topbar:!!document.querySelector('#rtRegionalDecisionCenter .rdc-topbar'),
      clocks:document.querySelectorAll('#rtRegionalDecisionCenter .rdc-city-clock').length,
      sectors:document.querySelectorAll('#rtRegionalDecisionCenter .rdc-market-tiles > div').length,
      timeline:document.querySelectorAll('#rtRegionalDecisionCenter .rdc-event').length,
      kpiSparks:document.querySelectorAll('#rtRegionalDecisionCenter .rdc-kpi-spark .rt-spark').length,
      trafficLenses:document.querySelectorAll('#rtRegionalDecisionCenter .rdc-signal-glass').length,
      mapCallouts:document.querySelectorAll('#rtRegionalDecisionCenter .rdc-map-callout').length,
      kpiCards:document.querySelectorAll('#rtRegionalDecisionCenter .rdc-kpi-card').length,
      bg:getComputedStyle(document.getElementById('rtRegionalDecisionCenter')).backgroundImage
    }));
    await assert(regionalCenter.visible,'Centro regional no abrió');
    await assert(regionalCenter.kpis===5,'Centro regional perdió KPIs: '+regionalCenter.kpis);
    await assert(regionalCenter.drivers>=7,'Centro regional no conserva los 7 drivers acordados: '+regionalCenter.drivers);
    await assert(regionalCenter.indices>=1,'Centro regional sin índices');
    await assert(regionalCenter.traffic===3,'Centro regional perdió semáforos Argentina');
    await assert(regionalCenter.map,'Centro regional no cargó mapa');
    await assert(regionalCenter.topbar,'Centro regional perdió barra superior');
    await assert(regionalCenter.clocks>=3,'Centro regional sin relojes por plaza: '+regionalCenter.clocks);
    await assert(regionalCenter.sectors>=5,'Centro regional no conserva los 5 sectores acordados: '+regionalCenter.sectors);
    await assert(regionalCenter.timeline>=1,'Centro regional sin eventos de jornada');
    await assert(regionalCenter.kpiSparks>=4,'Centro regional sin sparklines KPI: '+regionalCenter.kpiSparks);
    await assert(regionalCenter.kpiCards===5,'Centro regional debe tener 5 KPI: '+regionalCenter.kpiCards);
    await assert(regionalCenter.trafficLenses===3,'Centro regional perdió los 3 semáforos premium: '+regionalCenter.trafficLenses);
    await assert(regionalCenter.mapCallouts>=3,'Centro regional sin callouts de mapa: '+regionalCenter.mapCallouts);
    await assert(!/^none$/.test(regionalCenter.bg),'Centro regional quedó sin fondo visual');
    await page.click('#rtRdcClose');
    await page.waitForFunction(()=>document.getElementById('rtRegionalDecisionCenter')?.hidden===true);
  }

  const finalContract=await page.evaluate(()=>{
    const required=[
      'dashboardView','decisionCenter','scannerView','startScanBtn','scanUniverse','scanTf',
      'rfScannerView','rfStartBtn','rfUniverse','rfObjective','rfHorizon',
      'analysisView','chart','technicalStatusGrid',
      'watchlistView','addWatchBtn','refreshWatchlistBtn','enableAlertsBtn',
      'portfolio360Section','portfolioRiskSection','refreshPortfolioRiskBtn','refreshPerformanceBtn',
      'signalsView','signalBody','signalAuditBtn','decisionAuditBody',
      'technicalDrawer','selfTestBtn','regressionBtn','dataDiagBtn'
    ];
    const missing=required.filter(id=>!document.getElementById(id));
    const label=id=>document.querySelector('#'+id+' .nav-copy b')?.textContent?.trim()||'';
    const dashboard=document.getElementById('dashboardView');
    const hero=document.getElementById('productHomeHero');
    const daily=document.getElementById('dailyRadarPanel');
    const market=document.getElementById('productMarketContext');
    const advanced=document.getElementById('productAdvancedContext');
    return{
      missing,
      nav:{
        home:label('homeViewBtn'),scanner:label('scannerViewBtn'),fixed:label('fixedIncomeBtn'),
        watch:label('watchlistViewBtn'),portfolio:label('portfolioViewBtn'),signals:label('signalsViewBtn')
      },
      home:{
        hero:!!hero,
        daily:!!daily,
        decision:!!document.getElementById('decisionCenter'),
        market:!!market,
        advanced:!!advanced,
        advancedOpen:!!advanced?.open,
        marketHasKpis:!!market?.querySelector('.dash-kpis'),
        heroTitle:hero?.querySelector('h1')?.textContent?.trim()||''
      },
      analysisAdvanced:!!document.getElementById('productAnalysisAdvanced'),
      global:{
        enabled:!!document.getElementById('rtGlobalRadar'),
        map:!!document.querySelector('.rt-world-card'),
        region:!!document.getElementById('rtRegionDetail'),
        watch:!!document.querySelector('.rt-watch-card'),
        argentina:!!document.getElementById('rtArgentinaSignals'),
        signals:!!document.getElementById('rtMarketSignals'),
        opportunities:!!document.querySelector('.rt-opps-card'),
        tabs:document.querySelectorAll('.rt-nav [data-rt-nav]').length
      },
      oldWorkspace:!!document.querySelector('script[src*="/workspace/"],link[href*="/workspace/"]')
    }
  });
  await assert(finalContract.missing.length===0,'Capacidades ausentes: '+finalContract.missing.join(', '));
  await assert(finalContract.nav.home==='Hoy','Navegación Inicio no quedó como Hoy');
  await assert(finalContract.nav.scanner==='Oportunidades','Navegación Scanner no quedó como Oportunidades');
  await assert(finalContract.nav.fixed==='Renta fija'&&finalContract.nav.watch==='Seguimiento'&&finalContract.nav.portfolio==='Cartera'&&finalContract.nav.signals==='Historial','Navegación final inconsistente: '+JSON.stringify(finalContract.nav));
  if(finalContract.global.enabled){
    await assert(finalContract.global.map&&finalContract.global.region&&finalContract.global.watch,'Global Command Center perdió mapa, detalle regional o watchlist');
    await assert(finalContract.global.argentina&&finalContract.global.signals&&finalContract.global.opportunities,'Global Command Center perdió semáforos u oportunidades');
    const opportunityRows=await page.evaluate(()=>document.querySelectorAll('#rtOppsBody tr[data-rt-symbol]').length);
    await assert(opportunityRows===6,'Oportunidades debe renderizar exactamente 6 filas reales: '+opportunityRows);
    await assert(finalContract.global.tabs>=7,'Navegación superior global incompleta: '+finalContract.global.tabs);
  }else{
    await assert(finalContract.home.hero&&finalContract.home.daily&&finalContract.home.decision,'Inicio perdió portada, Radar de hoy o prioridades');
    await assert(finalContract.home.market&&finalContract.home.marketHasKpis,'Inicio perdió Mercado en cuatro números');
    await assert(finalContract.home.advanced&&!finalContract.home.advancedOpen,'Contexto avanzado debe existir y comenzar plegado');
    await assert(/atención ahora/i.test(finalContract.home.heroTitle),'Portada no está orientada a decisiones: '+finalContract.home.heroTitle);
  }
  await assert(finalContract.analysisAdvanced,'Análisis avanzado no quedó plegable');
  await assert(!finalContract.oldWorkspace,'La raíz sigue cargando el prototipo /workspace');
  await fs.writeFile('artifacts/final-product-contract.json',JSON.stringify(finalContract,null,2));
  await fs.writeFile('artifacts/design-check.json',JSON.stringify(design,null,2));
  await shot('01-home');

  const basicHealth=await page.evaluate(async()=>{
    const r=await fetch('/api/health',{cache:'no-store'});
    return {status:r.status,body:await r.json()};
  });
  await assert(basicHealth.status===200&&basicHealth.body?.ok===true,'Health básico no disponible');

  // Live provider health is evidence, not a deterministic CI gate: hosted runners may be
  // geo-blocked by market-data providers (e.g. Binance HTTP 451).
  const liveHealth=await page.evaluate(async()=>{
    try{const r=await fetch('/api/health/deep',{cache:'no-store'});return {status:r.status,body:await r.json()}}
    catch(e){return {status:0,error:String(e?.message||e)}}
  });
  await fs.writeFile('artifacts/live-provider-health.json',JSON.stringify(liveHealth,null,2));

  const probes=[
    ['BTC 1H',{symbol:'BTCUSDT',type:'crypto'},'short'],
    ['SPY 1H',{symbol:'SPY',type:'stock'},'short'],
    ['GGAL 1D',{symbol:'GGAL',type:'argstock'},'short'],
    ['AAPL CEDEAR 1D',{symbol:'AAPL',type:'cedear'},'short']
  ];
  const probeResults=[];
  for(const [name,item,key] of probes){
    const result=await page.evaluate(async({item,key})=>{
      try{
        const x=await window.scanOne(item,key);
        return {ok:!!x?.analysis&&!!x?.plan&&!!x?.status&&Number.isFinite(Number(x?.price)),provider:x?.provider||null,status:x?.status?.label||null,price:x?.price??null,error:null};
      }catch(e){return {ok:false,error:String(e?.message||e)}}
    },{item,key});
    probeResults.push({name,...result});
    await assert(result.ok,`${name}: ${result.error||'pipeline incompleto'}`);
  }
  await fs.writeFile('artifacts/probes.json',JSON.stringify({probes:probeResults},null,2));

  const sidebarHit=await page.evaluate(()=>{
    const ids=['appSidebar','homeViewBtn','scannerViewBtn','fixedIncomeBtn','watchlistViewBtn','portfolioViewBtn','signalsViewBtn','helpBtn','technicalMenuBtn','sidebarCollapseBtn'];
    const out={};
    for(const id of ids){
      const el=document.getElementById(id);
      if(!el){out[id]={missing:true};continue}
      const r=el.getBoundingClientRect();
      const x=Math.max(0,Math.min(innerWidth-1,r.left+r.width/2));
      const y=Math.max(0,Math.min(innerHeight-1,r.top+r.height/2));
      const hit=document.elementFromPoint(x,y);
      out[id]={
        rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},
        display:getComputedStyle(el).display,
        position:getComputedStyle(el).position,
        pointerEvents:getComputedStyle(el).pointerEvents,
        zIndex:getComputedStyle(el).zIndex,
        hit:{id:hit?.id||'',className:typeof hit?.className==='string'?hit.className:'',tag:hit?.tagName||''},
        selfOrChild:!!(hit&&(hit===el||el.contains(hit)))
      };
    }
    return out;
  });
  await fs.writeFile('artifacts/sidebar-hit-test.json',JSON.stringify(sidebarHit,null,2));

  await navClick('scannerViewBtn');
  await page.waitForFunction(()=>document.getElementById('scannerView')?.classList.contains('active'));
  await assert(await page.evaluate(()=>!document.getElementById('dashboardView')?.classList.contains('active')),'Dashboard quedó activo debajo del Escáner');
  await assert(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth<=4),'Escáner genera overflow global');
  await shot('02-scanner');

  await navClick('fixedIncomeBtn');
  await page.waitForFunction(()=>document.getElementById('rfScannerView')?.classList.contains('active'));
  await assert(await page.evaluate(()=>!document.getElementById('dashboardView')?.classList.contains('active')),'Dashboard quedó activo debajo de Renta fija');
  await assert(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth<=4),'Renta fija genera overflow global');
  await shot('03-fixed-income');

  await navClick('watchlistViewBtn');
  await page.waitForFunction(()=>document.getElementById('watchlistView')?.classList.contains('active')&&document.getElementById('watchlistView')?.classList.contains('mode-watchlist'));
  await shot('04-watchlist');

  const globalShellForAnalysis=await page.evaluate(()=>document.body.classList.contains('rt-global-shell'));
  if(globalShellForAnalysis){
    await page.fill('#rtGlobalSearch','BTCUSDT');
    await page.press('#rtGlobalSearch','Enter');
  }else{
    await page.fill('#symbol','BTCUSDT');
    await page.selectOption('#assetType','crypto');
    await page.click('#analyzeBtn');
  }
  await page.waitForFunction(()=>!document.getElementById('analysisView')?.classList.contains('hidden')&&(document.getElementById('lastPrice')?.textContent||'')!=='—',{timeout:30000});
  await assert(await page.evaluate(()=>document.getElementById('technicalStatusGrid')?.style.display!=='none'),'Análisis individual no muestra estados multi-timeframe');
  await assert(await page.evaluate(()=>{const d=document.getElementById('productAnalysisAdvanced');return !!d&&!d.open}),'Análisis avanzado debe comenzar plegado');
  await shot('05-analysis');

  await navClick('portfolioViewBtn');
  await page.waitForFunction(()=>document.getElementById('watchlistView')?.classList.contains('active')&&document.getElementById('watchlistView')?.classList.contains('mode-portfolio'));
  await assert(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth<=4),'Cartera genera overflow global');
  const portfolioVisual=await page.evaluate(()=>{
    const visibleEmpty=[...document.querySelectorAll('#watchlistView .premium-donut-empty')].filter(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().height>0);
    const narrow=visibleEmpty.map(el=>({w:el.getBoundingClientRect().width,text:el.innerText.trim()})).filter(x=>x.w<100);
    const topDonut=document.getElementById('p360TopPositionsDonut');
    const noPositions=(document.getElementById('p360Positions')?.textContent||'').trim()==='0';
    return {narrow,noPositions,topDonutDisplay:topDonut?getComputedStyle(topDonut).display:null};
  });
  await assert(portfolioVisual.narrow.length===0,'Cartera tiene estados vacíos comprimidos: '+JSON.stringify(portfolioVisual.narrow));
  await assert(!portfolioVisual.noPositions||portfolioVisual.topDonutDisplay==='none','Top 5 vacío debe ocultar donut explicativo');
  const emptyPortfolio=await page.evaluate(()=>{
    const section=document.getElementById('portfolio360Section');
    const dashboard=section?.querySelector('.p360-master-dashboard');
    const noPositions=(document.getElementById('p360Positions')?.textContent||'').trim()==='0';
    return {
      noPositions,
      compactClass:!!section?.classList.contains('is-empty-portfolio'),
      sectionHeight:section?.getBoundingClientRect().height||0,
      dashboardDisplay:dashboard?getComputedStyle(dashboard).display:null,
      riskDisplay:document.getElementById('portfolioRiskSection')?getComputedStyle(document.getElementById('portfolioRiskSection')).display:null
    };
  });
  if(emptyPortfolio.noPositions){
    await assert(emptyPortfolio.compactClass,'Cartera vacía no activó estado compacto');
    await assert(emptyPortfolio.dashboardDisplay==='none','Cartera vacía sigue mostrando dashboards sin datos');
    await assert(emptyPortfolio.riskDisplay==='none','Cartera vacía sigue mostrando riesgo sin posiciones');
    await assert(emptyPortfolio.sectionHeight<900,'Cartera vacía demasiado larga: '+emptyPortfolio.sectionHeight+'px');
  }
  await fs.writeFile('artifacts/portfolio-empty-state.json',JSON.stringify(emptyPortfolio,null,2));
  await fs.writeFile('artifacts/portfolio-visual-check.json',JSON.stringify(portfolioVisual,null,2));
  const layout=await page.evaluate(()=>{
    const v=document.getElementById('watchlistView');
    const sections=[...v.querySelectorAll('#portfolio360Section,#portfolioRiskSection,.watch-table-wrap,.performance-panel,.stress-panel')];
    return sections.map(el=>({id:el.id||el.className,display:getComputedStyle(el).display,rect:el.getBoundingClientRect().toJSON()}));
  });
  await fs.writeFile('artifacts/portfolio-layout.json',JSON.stringify(layout,null,2));
  await shot('06-portfolio');

  await navClick('signalsViewBtn');
  await page.waitForFunction(()=>document.getElementById('signalsView')?.classList.contains('active'));
  await assert(await page.evaluate(()=>!document.getElementById('dashboardView')?.classList.contains('active')),'Dashboard quedó activo debajo de Historial');
  await assert(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth<=4),'Historial genera overflow global');
  await shot('07-history');

  await navClick('homeViewBtn');
  await page.waitForFunction(()=>document.getElementById('dashboardView')?.classList.contains('active'));
  await assert(await page.evaluate(()=>!document.getElementById('marketContextDetails')?.open),'Contexto completo no vuelve plegado al Inicio');
  await shot('08-home-final');

  await page.waitForTimeout(500);
  await assert(pageErrors.length===0,'Errores JavaScript: '+pageErrors.join(' | '));
  console.log(JSON.stringify({ok:true,liveHealth:liveHealth.body?.status||'UNAVAILABLE',probes:probeResults,pageErrors},null,2));
}finally{
  await browser.close();
}
