import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:960}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));

function bars(count=320,start=100,step=.22,seconds=86400){
 const now=Math.floor(Date.now()/1000),out=[];
 for(let i=0;i<count;i++){
  const time=now-(count-i)*seconds,center=start+i*step+Math.sin(i/12)*1.2;
  out.push({time,open:center-.3,high:center+1.1,low:center-.9,close:center+.35,volume:900000+i*2500});
 }return out;
}
const daily=bars(),hourly=bars(320,70,.08,3600);
const byma=b=>({s:'ok',t:b.map(x=>x.time),o:b.map(x=>x.open),h:b.map(x=>x.high),l:b.map(x=>x.low),c:b.map(x=>x.close),v:b.map(x=>x.volume)});
const yahoo=b=>({chart:{result:[{timestamp:b.map(x=>x.time),indicators:{quote:[{open:b.map(x=>x.open),high:b.map(x=>x.high),low:b.map(x=>x.low),close:b.map(x=>x.close),volume:b.map(x=>x.volume)}]}}],error:null}});
const binance=b=>b.map(x=>[x.time*1000,String(x.open),String(x.high),String(x.low),String(x.close),String(x.volume),0,0,0,0,0,0]);
const ok=(route,body)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});

await page.route('**/api/**',route=>{
 const u=new URL(route.request().url());
 if(u.pathname==='/api/dashboard/risk')return ok(route,{value:845,previous:830,change:15,date:'2026-09-29',source:'QA'});
 if(u.pathname==='/api/dashboard/core')return ok(route,{fx:{mep:{venta:1475},ccl:{venta:1502}},inflation:{value:2.3}});
 if(u.pathname==='/api/health/deep')return ok(route,{criticalFailures:0,checks:[{ok:true},{ok:true},{ok:true}]});
 if(u.pathname==='/api/byma/cedears')return ok(route,{items:[
  {symbol:'AAPL',volumeAmount:900},{symbol:'NVDA',volumeAmount:800},{symbol:'MELI',volumeAmount:700},{symbol:'AMZN',volumeAmount:600}
 ]});
 if(u.pathname==='/api/byma/equities')return ok(route,{items:[
  {symbol:'GGAL',volumeAmount:900},{symbol:'YPFD',volumeAmount:800},{symbol:'PAMP',volumeAmount:700}
 ]});
 if(u.pathname==='/api/binance/universe')return ok(route,{items:[
  {symbol:'BTCUSDT',quoteVolume:900},{symbol:'ETHUSDT',quoteVolume:800},{symbol:'SOLUSDT',quoteVolume:700}
 ]});
 if(u.pathname==='/api/byma/history')return ok(route,byma(daily));
 if(u.pathname==='/api/yahoo')return ok(route,yahoo(daily));
 if(u.pathname==='/api/binance')return ok(route,binance(hourly));
 if(u.pathname==='/api/fixed-income/analytics')return ok(route,{countryRisk:{value:845},bonds:[
  {ticker:'AE38',tir:12.4,paridad:54.2,duration:5.9,precio:58.7,vencimiento:'2038-01-09'},
  {ticker:'AL30',tir:11.9,paridad:61.5,duration:3.2,precio:63.1,vencimiento:'2030-07-09'},
  {ticker:'GD30',tir:11.5,paridad:64.4,duration:3.0,precio:65.2,vencimiento:'2030-07-09'}
 ]});
 return route.continue();
});

function assert(v,msg){if(!v)throw new Error(msg)}
try{
 const r=await page.goto('http://127.0.0.1:4173/workspace/',{waitUntil:'domcontentloaded',timeout:30000});
 assert(r?.ok(),'workspace no carga');
 await page.waitForFunction(()=>document.querySelectorAll('#opportunityList .op-row').length>=4,{timeout:30000});
 const initial=await page.evaluate(()=>({
  rows:document.querySelectorAll('#opportunityList .op-row').length,
  title:document.getElementById('marketTitle')?.textContent,
  health:document.getElementById('healthPill')?.textContent,
  research:document.getElementById('rSymbol')?.textContent,
  rr:document.getElementById('rRr')?.textContent
 }));
 assert(initial.title.includes('CEDEAR'),'no inicia en CEDEAR');
 assert(initial.rows>=4,'no rankea CEDEARs');
 assert(/Fuentes verificadas/.test(initial.health),'health no quedó verificado');
 assert(initial.research&&initial.research!=='—','no abre research');
 assert(initial.rr&&initial.rr!=='—','research no muestra R:R');

 await page.click('#watchBtn');
 assert(await page.evaluate(()=>document.getElementById('watchBtn')?.textContent.includes('seguimiento')),'seguir activo no cambia estado');
 await page.click('[data-market="watch"]');
 await page.waitForFunction(()=>document.querySelectorAll('#opportunityList .op-row').length===1,{timeout:20000});

 await page.click('[data-market="crypto"]');
 await page.waitForFunction(()=>document.getElementById('marketKicker')?.textContent==='CRYPTO'&&document.querySelectorAll('#opportunityList .op-row').length>=3,{timeout:30000});
 const crypto=await page.evaluate(()=>document.getElementById('opportunityList')?.innerText||'');
 assert(/BTCUSDT/.test(crypto),'crypto no muestra BTC');

 await page.click('[data-market="bonds"]');
 await page.waitForFunction(()=>document.getElementById('marketKicker')?.textContent==='BONOS'&&document.querySelectorAll('#opportunityList .op-row').length>=3,{timeout:30000});
 await page.click('[data-symbol="AE38"]');
 await page.waitForFunction(()=>!document.getElementById('researchBond')?.hidden,{timeout:10000});
 const ae38=await page.evaluate(()=>({
  symbol:document.getElementById('bSymbol')?.textContent,
  tir:document.getElementById('bTir')?.textContent,
  parity:document.getElementById('bParity')?.textContent,
  duration:document.getElementById('bDuration')?.textContent,
  techHidden:document.getElementById('researchTechnical')?.hidden
 }));
 assert(ae38.symbol==='AE38','AE38 no abre');
 assert(/12/.test(ae38.tir),'AE38 sin TIR');
 assert(/54/.test(ae38.parity),'AE38 sin paridad');
 assert(/5/.test(ae38.duration),'AE38 sin duration');
 assert(ae38.techHidden===true,'bono muestra análisis técnico genérico');

 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert(overflow<=4,'overflow global '+overflow);
 assert(errors.length===0,'errores JS: '+errors.join(' | '));
 console.log(JSON.stringify({ok:true,initial,ae38},null,2));
}finally{await browser.close()}

// CI trigger: product-flow contract active.
