import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.RADAR_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],consoleErrors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())});

function bars(count=280,start=100,step=.18,seconds=86400){
 const now=Math.floor(Date.now()/1000),out=[];
 for(let i=0;i<count;i++){
  const time=now-(count-i)*seconds,center=start+i*step+Math.sin(i/13)*1.5;
  const open=center-.35,close=center+.35,high=close+.8,low=open-.8,volume=1000000+i*2000;
  out.push({time,open,high,low,close,volume});
 }
 return out;
}
const daily=bars(300,80,.22,86400),hourly=bars(300,100,.05,3600);
const byma=b=>({s:'ok',t:b.map(x=>x.time),o:b.map(x=>x.open),h:b.map(x=>x.high),l:b.map(x=>x.low),c:b.map(x=>x.close),v:b.map(x=>x.volume)});
const yahoo=b=>({chart:{result:[{timestamp:b.map(x=>x.time),meta:{regularMarketPrice:b.at(-1).close},indicators:{quote:[{open:b.map(x=>x.open),high:b.map(x=>x.high),low:b.map(x=>x.low),close:b.map(x=>x.close),volume:b.map(x=>x.volume)}]}}],error:null}});
const binance=b=>b.map(x=>[x.time*1000,String(x.open),String(x.high),String(x.low),String(x.close),String(x.volume),0,0,0,0,0,0]);

await page.addInitScript(()=>{
 localStorage.removeItem('radar_v6_portfolio');
 localStorage.removeItem('radar_v6_watchlist');
 localStorage.setItem('radar_web_config_v1',JSON.stringify({
   revision:7,
   config:{watchlist:[
     {symbol:'AAPL',type:'cedear',tf:'medium',quantity:10,buyPrice:100,positionSize:1000,portfolioCurrency:'ARS',inPortfolio:true,portfolioAddedAt:Date.now()-86400000},
     {symbol:'BTCUSDT',type:'crypto',tf:'short',positionSize:0,buyPrice:0,inPortfolio:false}
   ]}
 }));
});

await page.route('**/api/**',async route=>{
 const u=new URL(route.request().url());
 const ok=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 if(u.pathname==='/api/binance/universe')return ok({count:8,items:[
  {symbol:'BTCUSDT',quoteVolume:900},{symbol:'ETHUSDT',quoteVolume:800},{symbol:'SOLUSDT',quoteVolume:700},{symbol:'BNBUSDT',quoteVolume:600},
  {symbol:'XRPUSDT',quoteVolume:500},{symbol:'DOGEUSDT',quoteVolume:400},{symbol:'ADAUSDT',quoteVolume:300},{symbol:'LINKUSDT',quoteVolume:200}
 ]});
 if(u.pathname==='/api/byma/equities')return ok({count:8,items:[
  {symbol:'GGAL',volumeAmount:900},{symbol:'YPFD',volumeAmount:800},{symbol:'PAMP',volumeAmount:700},{symbol:'BMA',volumeAmount:600},
  {symbol:'BBAR',volumeAmount:500},{symbol:'TXAR',volumeAmount:400},{symbol:'CEPU',volumeAmount:300},{symbol:'COME',volumeAmount:200}
 ]});
 if(u.pathname==='/api/byma/cedears')return ok({count:8,items:[
  {symbol:'AAPL',volumeAmount:900},{symbol:'NVDA',volumeAmount:800},{symbol:'MELI',volumeAmount:700},{symbol:'AMZN',volumeAmount:600},
  {symbol:'MSFT',volumeAmount:500},{symbol:'KO',volumeAmount:400},{symbol:'JPM',volumeAmount:300},{symbol:'TSLA',volumeAmount:200}
 ]});
 if(u.pathname==='/api/health/deep')return ok({ok:true,status:'OK',criticalFailures:0,checks:[
  {name:'Yahoo SPY',ok:true,critical:true},{name:'Binance BTC',ok:true,critical:true},{name:'BYMA acciones',ok:true,critical:true},{name:'BYMA CEDEAR',ok:true,critical:true},{name:'Dólar',ok:true,critical:true},{name:'Renta fija',ok:true,critical:true}
 ]});
 if(u.pathname==='/api/dashboard/risk')return ok({value:845,previous:830,change:15,date:'2026-09-28',source:'QA'});
 if(u.pathname==='/api/dashboard/core')return ok({fx:{mep:{venta:1475,changePct:.8,source:'QA'},ccl:{venta:1502,changePct:1.1,source:'QA'}},inflation:{value:2.3,period:'2026-08',source:'QA'}});
 if(u.pathname==='/api/binance')return ok(binance(hourly));
 if(u.pathname==='/api/yahoo')return ok(yahoo(u.searchParams.get('interval')==='1d'?daily:hourly));
 if(u.pathname==='/api/byma/history')return ok(byma(daily));
 if(u.pathname==='/api/fixed-income/analytics')return ok({
  countryRisk:{value:845,change:15,date:'2026-09-28'},
  bonds:[
   {ticker:'AE38',tir:12.4,paridad:54.2,duration:5.9,precio:58.7,vencimiento:'2038-01-09'},
   {ticker:'AL30',tir:11.9,paridad:61.5,duration:3.2,precio:63.1,vencimiento:'2030-07-09'},
   {ticker:'GD30',tir:11.5,paridad:64.4,duration:3.0,precio:65.2,vencimiento:'2030-07-09'}
  ]
 });
 if(u.pathname==='/api/byma/fixed-income')return ok({items:[
  {symbol:'AE38',trade:58.7,closingPrice:58.2,volumeAmount:1000000,maturityDate:'2038-01-09'},
  {symbol:'AL30',trade:63.1,closingPrice:62.8,volumeAmount:2000000,maturityDate:'2030-07-09'},
  {symbol:'GD30',trade:65.2,closingPrice:64.9,volumeAmount:1500000,maturityDate:'2030-07-09'}
 ]});
 return route.continue();
});

function assert(v,msg){if(!v)throw new Error(msg)}

try{
 const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 assert(response?.ok(),`Home HTTP ${response?.status()}`);
 await page.waitForSelector('#todayView.active',{timeout:15000});
 await page.waitForFunction(()=>{
  const p=document.querySelectorAll('#todayPriorities .priority-item').length;
  const t=document.getElementById('todayPriorities')?.textContent||'';
  const coverage=document.getElementById('radarCoverage')?.textContent||'';
  return /con datos/.test(coverage) && (p>0 || /No hay setups o deterioros suficientemente claros/.test(t));
 },{timeout:30000});

 const home=await page.evaluate(()=>({
  views:document.querySelectorAll('.view').length,
  nav:document.querySelectorAll('.nav-item').length,
  priorities:document.querySelectorAll('#todayPriorities .priority-item').length,
  noAction:/No hay setups o deterioros suficientemente claros/.test(document.getElementById('todayPriorities')?.textContent||''),
  bonds:document.querySelectorAll('#bondRadar .bond-row').length,
  risk:document.getElementById('ctxRisk')?.textContent,
  coverageText:document.getElementById('radarCoverage')?.textContent||'',
  health:document.getElementById('systemStatusBtn')?.className,
  overflow:document.documentElement.scrollWidth-window.innerWidth
 }));
 assert(home.views===3,'v6 debe tener exactamente tres vistas');
 const coverageTotal=Number((home.coverageText.match(/\/(\d+)\s+con datos/)||[])[1]);
 assert(coverageTotal>=20,'Radar de Hoy no está usando universo dinámico suficiente: '+home.coverageText);
 assert(home.nav===3,'v6 debe tener exactamente tres opciones principales');
 assert(home.priorities>0||home.noAction,'Radar de Hoy no produjo ni prioridades ni estado explícito de no acción');
 assert(home.bonds===3,'Renta fija no mostró los tres soberanos');
 assert(/845/.test(home.risk),'Riesgo país no cargó');
 assert(/ok/.test(home.health),'Health no quedó OK');
 assert(home.overflow<=4,'Overflow horizontal en home: '+home.overflow);
 await page.screenshot({path:'artifacts/v6-01-today.png',fullPage:true});

 if(home.priorities>0){
   await page.click('#todayPriorities .priority-item');
 }else{
   await page.fill('#quickSymbol','SPY');
   await page.click('#quickSearch button');
 }
 await page.waitForSelector('#analysisView.active',{timeout:10000});
 await page.waitForFunction(()=>document.getElementById('decisionState')?.textContent!=='SIN ANÁLISIS',{timeout:20000});
 const analysis=await page.evaluate(()=>({
  symbol:document.getElementById('assetSymbol')?.textContent,
  decision:document.getElementById('decisionState')?.textContent,
  score:document.getElementById('decisionScore')?.textContent,
  reasons:document.querySelectorAll('#decisionReasons li').length,
  advanced:!!document.getElementById('analysisAdvanced'),
  overflow:document.documentElement.scrollWidth-window.innerWidth
 }));
 assert(analysis.symbol&&analysis.symbol!=='—','Análisis sin símbolo');
 assert(analysis.decision&&analysis.decision!=='SIN ANÁLISIS','Análisis sin decisión');
 assert(Number(analysis.score)>=0,'Análisis sin score');
 assert(analysis.reasons>0,'Análisis sin motivos');
 assert(analysis.advanced,'Falta detalle técnico plegable');
 assert(analysis.overflow<=4,'Overflow horizontal en análisis');
 await page.screenshot({path:'artifacts/v6-02-analysis.png',fullPage:true});

 await page.fill('#quickSymbol','AE38');
 await page.click('#quickSearch button');
 await page.waitForFunction(()=>!document.getElementById('bondAnalysisLayout')?.hidden,{timeout:20000});
 const bondVisual=await page.evaluate(()=>({
   tir:document.getElementById('bondYield')?.textContent||'',
   bondVisible:getComputedStyle(document.getElementById('bondAnalysisLayout')).display!=='none',
   marketVisible:getComputedStyle(document.getElementById('marketAnalysisLayout')).display!=='none',
   tfDisabled:!!document.getElementById('analysisTf')?.disabled
 }));
 assert(/12/.test(bondVisual.tir),'AE38 no mostró TIR');
 assert(bondVisual.bondVisible,'Ficha de bono no visible');
 assert(!bondVisual.marketVisible,'El gráfico técnico anterior sigue visible en modo bono');
 assert(bondVisual.tfDisabled,'Temporalidad debe quedar deshabilitada para bono');
 await page.screenshot({path:'artifacts/v6-03-ae38.png',fullPage:true});

 await page.click('[data-view="portfolio"]');
 await page.waitForSelector('#portfolioView.active',{timeout:10000});
 await page.click('#refreshPortfolio');
 await page.waitForFunction(()=>document.querySelectorAll('#portfolioBody tr').length===1&&document.getElementById('portfolioBody')?.textContent.includes('AAPL'),{timeout:20000});
 const portfolio=await page.evaluate(()=>({
  count:document.getElementById('pCount')?.textContent,
  row:document.getElementById('portfolioBody')?.innerText,
  topWeight:document.getElementById('pTopWeight')?.textContent,
  pnl:document.getElementById('pPnl')?.textContent,
  overflow:document.documentElement.scrollWidth-window.innerWidth
 }));
 assert(portfolio.count==='1','Migración v5→v6 no conservó la posición');
 assert(/AAPL/.test(portfolio.row),'Cartera no muestra AAPL');
 assert(portfolio.topWeight==='100.0%','Peso de cartera debe mostrarse como porcentaje sin signo: '+portfolio.topWeight);
 assert(!/^USD 0(?:$|[^,.0-9])/.test(portfolio.pnl),'P&L equivalente no debe redondearse engañosamente a cero: '+portfolio.pnl);
 assert(portfolio.overflow<=4,'Overflow horizontal en cartera');
 await page.screenshot({path:'artifacts/v6-04-portfolio.png',fullPage:true});

 assert(errors.length===0,'Errores JavaScript: '+errors.join(' | '));
 assert(consoleErrors.length===0,'Errores de consola: '+consoleErrors.join(' | '));
 console.log(JSON.stringify({ok:true,home,analysis,portfolio,errors},null,2));
}finally{
 await browser.close();
}
