import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {installMarketFixtures} from './qa-fixtures.mjs';
const base=process.env.RADAR_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const results=[];
await fs.mkdir('artifacts',{recursive:true});
try {
 for(const width of [1672,768,390]) {
  const page=await browser.newPage({viewport:{width,height:941},acceptDownloads:true});
  const errors=[], external=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/unpkg.com|fonts.googleapis.com|fonts.gstatic.com/.test(r.url()))external.push(r.url());});
  await installMarketFixtures(page,base);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.RadarWorkspace&&document.querySelector('.rt-nav [data-radar-view]'));
  for(const view of ['home','opportunities','scanner','fixed','watch','portfolio','history']) {
   await page.evaluate(v=>window.RadarWorkspace.navigate(v),view);
   await page.waitForFunction(v=>document.body.dataset.radarCurrentView===v,view);
   await page.waitForTimeout(250);
   const overflow=await page.evaluate(()=>{
    const overlay=document.getElementById('rtTopOpportunities');
    const root=overlay&&!overlay.hidden?overlay:document.documentElement;
    return {width:root.clientWidth,scroll:root.scrollWidth};
   });
   assert.ok(overflow.scroll-overflow.width<=4,`${width}px ${view}: overflow ${JSON.stringify(overflow)}`);
   results.push({width,view,overflow:overflow.scroll-overflow.width});
  }
  await page.evaluate(()=>window.RadarWorkspace.navigate('home'));
  await page.fill('#rtGlobalSearch','BTCUSDT');await page.press('#rtGlobalSearch','Enter');
  await page.waitForFunction(()=>document.getElementById('lastPrice')?.textContent!=='—'&&state.analyses.short);
  await page.waitForTimeout(300);
  const analysisOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(analysisOverflow<=4,`${width}px analysis overflow ${analysisOverflow}`);
  assert.equal(external.length,0,'Core assets must not require a CDN or remote fonts');
  await page.screenshot({path:`artifacts/workspace-${width}.png`,fullPage:true});
  if(width===1672) {
   const downloadPromise=page.waitForEvent('download');
   await page.locator('#rtGlobalAppbar + .radar-utilitybar [data-radar-tool="export"]').click();
   const download=await downloadPromise;
   const report=await fs.readFile(await download.path(),'utf8');
   assert.match(report,/BTCUSDT/);assert.match(report,/Última consulta válida/);assert.match(report,/Stop:/);assert.match(report,/no es probabilidad/);
   const backupPromise=page.waitForEvent('download');
   await page.locator('#rtGlobalAppbar + .radar-utilitybar [data-radar-tool="backup"]').click();
   const backup=JSON.parse(await fs.readFile(await (await backupPromise).path(),'utf8'));
   assert.equal(backup.format,'RadarTecnicoBackup');assert.ok(Array.isArray(backup.config.watchlist));
   // A failed refresh with an existing history must suspend the actual trade plan.
   const history='/api/yahoo-batch?symbols=OUTAGE_TEST&range=1y&interval=1d';
   await page.evaluate(async url=>{await fetch(url);},history);
   await page.route('**/api/yahoo-batch?**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"offline"}'}));
   const failure=await page.evaluate(async url=>{
    const r=await fetch(url+'&fresh=1'),q=window.RadarMarketData.quality(r);
    window.RadarMarketData.tag(state.analyses.short.data,{...q,interval:'1h',crypto:true});
    renderChart('short');window.RadarWorkspace.sync();
    return {state:q.state,status:document.getElementById('setupStatus').textContent,entry:document.getElementById('tradeEntry').textContent};
   },history);
   assert.equal(failure.state,'stale');assert.equal(failure.status,'DATOS SIN VALIDAR');assert.equal(failure.entry,'—');
   const failedReportPromise=page.waitForEvent('download');
   await page.locator('#rtGlobalAppbar + .radar-utilitybar [data-radar-tool="export"]').click();
   const failedReport=await fs.readFile(await (await failedReportPromise).path(),'utf8');
   assert.match(failedReport,/SIN VALIDAR · señal suspendida/);
   results.push({case:'outage',...failure});
  }
  await page.locator('#rtGlobalAppbar + .radar-utilitybar [data-radar-tool="help"]').click();
  await page.waitForSelector('#radarGuide[open]');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#radarGuide').getAttribute('open'),null);
  assert.deepEqual(errors,[],`${width}px JavaScript errors`);
  await page.close();
 }
 console.log(JSON.stringify({ok:true,checks:results.length,results},null,2));
 await fs.writeFile('artifacts/workspace-test.json',JSON.stringify({ok:true,results},null,2));
} finally {await browser.close();}
