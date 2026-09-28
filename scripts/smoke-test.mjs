import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.RADAR_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
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

await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==new URL(base).origin)return route.continue();
  if(u.pathname==='/api/binance')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(binancePayload(hourly))});
  if(u.pathname==='/api/yahoo')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(yahooPayload(u.searchParams.get('interval')==='1wk'?daily:hourly))});
  if(u.pathname==='/api/byma/scan-history'||u.pathname==='/api/byma/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bymaPayload(daily))});
  return route.continue();
});

async function assert(condition,message){
  if(!condition)throw new Error(message);
}
async function shot(name){
  await page.screenshot({path:`artifacts/${name}.png`,fullPage:true});
}

try{
  const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await assert(response?.ok(),`Home HTTP ${response?.status()}`);
  await page.waitForFunction(()=>typeof window.scanOne==='function'&&typeof window.showScannerView==='function',{timeout:30000});
  await page.waitForSelector('#dashboardView',{state:'attached',timeout:15000});
  await page.waitForTimeout(1200);
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

  await page.click('#scannerViewBtn');
  await page.waitForFunction(()=>document.getElementById('scannerView')?.classList.contains('active'));
  await shot('02-scanner');

  await page.click('#fixedIncomeBtn');
  await page.waitForFunction(()=>document.getElementById('rfScannerView')?.classList.contains('active'));
  await shot('03-fixed-income');

  await page.click('#watchlistViewBtn');
  await page.waitForFunction(()=>document.getElementById('watchlistView')?.classList.contains('active')&&document.getElementById('watchlistView')?.classList.contains('mode-watchlist'));
  await shot('04-watchlist');

  await page.click('#portfolioViewBtn');
  await page.waitForFunction(()=>document.getElementById('watchlistView')?.classList.contains('active')&&document.getElementById('watchlistView')?.classList.contains('mode-portfolio'));
  const layout=await page.evaluate(()=>{
    const v=document.getElementById('watchlistView');
    const sections=[...v.querySelectorAll('#portfolio360Section,#portfolioRiskSection,.watch-table-wrap,.performance-panel,.stress-panel')];
    return sections.map(el=>({id:el.id||el.className,display:getComputedStyle(el).display,rect:el.getBoundingClientRect().toJSON()}));
  });
  await fs.writeFile('artifacts/portfolio-layout.json',JSON.stringify(layout,null,2));
  await shot('05-portfolio');

  await page.waitForTimeout(500);
  await assert(pageErrors.length===0,'Errores JavaScript: '+pageErrors.join(' | '));
  console.log(JSON.stringify({ok:true,liveHealth:liveHealth.body?.status||'UNAVAILABLE',probes:probeResults,pageErrors},null,2));
}finally{
  await browser.close();
}
