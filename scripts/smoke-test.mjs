import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.RADAR_URL||'http://127.0.0.1:4173';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));

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
  await page.waitForTimeout(1800);
  await shot('01-home');

  const health=await page.evaluate(async()=>{
    const r=await fetch('/api/health/deep',{cache:'no-store'});
    return {status:r.status,body:await r.json()};
  });
  await assert(health.status===200,'Deep health HTTP '+health.status);
  await assert(health.body?.ok===true,'Deep health crítico: '+JSON.stringify(health.body?.checks?.filter(x=>x.critical&&!x.ok)||[]));

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
  await fs.writeFile('artifacts/probes.json',JSON.stringify({health:health.body,probes:probeResults},null,2));

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
  console.log(JSON.stringify({ok:true,health:health.body.status,probes:probeResults,pageErrors},null,2));
}finally{
  await browser.close();
}
