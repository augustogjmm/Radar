(()=>{
'use strict';
const NATIVE_FETCH=window.fetch.bind(window);
const KEYS={config:'radar_web_config_v1',signals:'radar_signal_journal_v73',decisions:'radar_decision_audit_v78',watcher:'radar_web_watcher_v1'};
const json=(data,status=200,headers={})=>Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}}));
const load=(k,fallback)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x&&typeof x==='object'?x:fallback}catch{return fallback}};
const save=(k,v)=>{localStorage.setItem(k,JSON.stringify(v));return v};
function urlOf(input){try{return new URL(typeof input==='string'?input:input.url,location.origin)}catch{return new URL(location.origin)}}
function pathOf(input){return urlOf(input).pathname}
async function bodyOf(init){try{return init?.body?JSON.parse(init.body):{}}catch{return {}}}
async function directJson(url,timeout=12000){
  const c=new AbortController(),tm=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await NATIVE_FETCH(url,{cache:'no-store',signal:c.signal,headers:{accept:'application/json'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(tm)}
}
function finite(v){const n=Number(v);return Number.isFinite(n)?n:null}
function goodFx(j){return finite(j?.fx?.mep?.venta)!==null&&finite(j?.fx?.ccl?.venta)!==null&&finite(j?.fx?.official?.venta)!==null}
async function nativeJson(input,init){
  const r=await NATIVE_FETCH(input,{...init,cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status+' '+(await r.text()).slice(0,180));
  return await r.json();
}
async function fxFallback(){
  const rows=await directJson('https://dolarapi.com/v1/dolares',10000);
  const pick=(casa)=>{
    const x=(Array.isArray(rows)?rows:[]).find(r=>String(r?.casa||'').toLowerCase()===casa);
    return x?{compra:finite(x.compra),venta:finite(x.venta),changePct:finite(x.variacion),fecha:x.fechaActualizacion||'',source:'DolarApi · directo'}:{compra:null,venta:null,changePct:null,fecha:'',source:'No disponible'};
  };
  return {updated:new Date().toISOString(),fx:{mep:pick('bolsa'),ccl:pick('contadoconliqui'),official:pick('oficial')}};
}
const HISTORY_URLS={
  risk:'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais',
  inflation:'https://api.argentinadatos.com/v1/finanzas/indices/inflacion',
  mep:'https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa',
  ccl:'https://api.argentinadatos.com/v1/cotizaciones/dolares/contadoconliqui',
  official:'https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial'
};
async function historyFallback(series){
  const u=HISTORY_URLS[series];if(!u)throw new Error('Serie no soportada');
  const raw=await directJson(u,12000),arr=Array.isArray(raw)?raw:[];
  const rows=arr.map(x=>{
    const date=String(x?.fecha||x?.date||'').slice(0,10);
    const value=finite(['mep','ccl','official'].includes(series)?(x?.venta??x?.value):(x?.valor??x?.value));
    return {date,value,fecha:date,valor:value};
  }).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&x.value!==null).sort((a,b)=>a.date.localeCompare(b.date));
  return {series,rows,source:'ArgentinaDatos · directo'};
}
async function riskFallback(){
  let current=null;
  try{current=await directJson('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo',10000)}catch{}
  const h=await historyFallback('risk'),rows=h.rows||[],last=rows.at(-1),prev=rows.length>1?rows.at(-2):null;
  const value=finite(current?.valor??current?.value??last?.value),date=String(current?.fecha||current?.date||last?.date||'').slice(0,10);
  const previous=prev?.value??null;
  return {value,previous,change:value!==null&&previous!==null?value-previous:null,date,source:'ArgentinaDatos · directo',fallback:true,status:'ACTUAL',verifiedAt:new Date().toISOString()};
}
async function bondCurveFallback(){
  const x=await directJson('https://compararfondos.com.ar/api/bonos',15000);
  const raw=Array.isArray(x?.bonds)?x.bonds:(Array.isArray(x)?x:[]),bonds=[];
  const n=v=>{if(typeof v==='number')return Number.isFinite(v)?v:null;const z=Number(String(v??'').trim().replace(/\./g,'').replace(',','.'));return Number.isFinite(z)?z:null};
  for(const b of raw){
    const ticker=String(b?.ticker||'').trim().toUpperCase(),tir=n(b?.tir),duration=n(b?.duration),paridad=n(b?.paridad);
    if(!/^(AL|GD|AE)/.test(ticker)||tir===null||duration===null||tir<=0||duration<=0)continue;
    bonds.push({ticker,tir,duration,paridad});
  }
  bonds.sort((a,b)=>a.duration-b.duration);
  return {source:'CompararFondos · directo',updated:new Date().toISOString(),bonds};
}
async function binanceDirect(path,timeout=15000){
  const hosts=['https://api.binance.com','https://api1.binance.com','https://api2.binance.com','https://api3.binance.com'];
  let last='';
  for(const host of hosts){
    const c=new AbortController(),tm=setTimeout(()=>c.abort(),timeout);
    try{
      const r=await NATIVE_FETCH(host+path,{cache:'no-store',signal:c.signal,headers:{accept:'application/json'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      return await r.json();
    }catch(e){last=String(e?.message||e)}
    finally{clearTimeout(tm)}
  }
  throw new Error('Binance no disponible: '+last);
}
async function binanceUniverseFallback(top=100){
  const [ex,tickers]=await Promise.all([binanceDirect('/api/v3/exchangeInfo'),binanceDirect('/api/v3/ticker/24hr')]);
  const vol=new Map((Array.isArray(tickers)?tickers:[]).map(x=>[x.symbol,Number(x.quoteVolume)||0]));
  const items=(ex?.symbols||[])
    .filter(x=>x?.status==='TRADING'&&x?.quoteAsset==='USDT'&&x?.isSpotTradingAllowed!==false)
    .map(x=>({symbol:String(x.symbol||''),baseAsset:String(x.baseAsset||''),quoteAsset:'USDT',quoteVolume:vol.get(x.symbol)||0}))
    .sort((a,b)=>b.quoteVolume-a.quoteVolume||a.symbol.localeCompare(b.symbol))
    .slice(0,Math.max(1,Math.min(500,Number(top)||100)));
  return {source:'Binance Spot · directo',updated:new Date().toISOString(),count:items.length,totalAvailable:(ex?.symbols||[]).length,top:Number(top)||100,items};
}
async function binanceKlinesFallback(symbol,interval){
  const clean=String(symbol||'BTCUSDT').replace(/[\/-]/g,'').toUpperCase();
  return await binanceDirect('/api/v3/klines?symbol='+encodeURIComponent(clean)+'&interval='+encodeURIComponent(interval||'1h')+'&limit=1000');
}
async function localRatesFallback(){
  const j=await directJson('https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias?Limit=3000',12000);
  const rows=Array.isArray(j?.results)?j.results:[];
  const find=(re)=>{
    const x=rows.find(r=>re.test(String(r?.descripcion||'')));
    const value=finite(x?.ultValorInformado);
    return value===null?null:{value,date:String(x?.ultFechaInformada||''),source:'BCRA API v4.0 · directo',idVariable:x?.idVariable??null};
  };
  const tamar=find(/TAMAR/i),badlar=find(/BADLAR/i),tm20=find(/TM20|30.{0,12}d[ií]as/i),cer=find(/CER|Estabilizaci[oó]n de Referencia/i),uva=find(/UVA|Valor Adquisitivo/i);
  const refs=[tamar,badlar,tm20,cer,uva].filter(Boolean).length;
  return {source:'BCRA API v4.0 · directo',updated:new Date().toISOString(),available:refs,caucion:null,tamar,badlar,tm20,deposit30:null,cer,uva};
}
window.fetch=async function(input,init={}){
  const u=urlOf(input), p=u.pathname, method=String(init?.method||'GET').toUpperCase();

  // Critical market dashboard: serverless first, browser provider fallback second.
  if(method==='GET'&&p==='/api/dashboard/fx-current'){
    try{const j=await nativeJson(input,init);if(goodFx(j))return json(j)}catch{}
    try{return json(await fxFallback())}catch(e){return json({error:'FX_UNAVAILABLE',message:String(e?.message||e)},502)}
  }
  if(method==='GET'&&p==='/api/dashboard/history'){
    const series=u.searchParams.get('series')||'risk';
    try{const j=await nativeJson(input,init);if(Array.isArray(j?.rows)&&j.rows.length)return json(j)}catch{}
    try{return json(await historyFallback(series))}catch(e){return json({series,rows:[],error:'HISTORY_UNAVAILABLE',message:String(e?.message||e)},502)}
  }
  if(method==='GET'&&p==='/api/dashboard/inflation-current'){
    try{const j=await nativeJson(input,init);if(Array.isArray(j?.rows)&&j.rows.length)return json(j)}catch{}
    try{const h=await historyFallback('inflation');return json({rows:h.rows.map(x=>({fecha:x.date,valor:x.value})),source:'ArgentinaDatos · directo'})}catch(e){return json({rows:[],error:'INFLATION_UNAVAILABLE',message:String(e?.message||e)},502)}
  }
  if(method==='GET'&&p==='/api/dashboard/risk'){
    try{const j=await nativeJson(input,init);if(finite(j?.value)!==null)return json(j)}catch{}
    try{return json(await riskFallback())}catch(e){return json({value:null,error:'RISK_UNAVAILABLE',message:String(e?.message||e)},502)}
  }
  if(method==='GET'&&p==='/api/local-rates'){
    try{const j=await nativeJson(input,init);if(Number(j?.available)>0)return json(j)}catch{}
    try{return json(await localRatesFallback())}catch(e){return json({available:0,source:'BCRA no disponible',message:String(e?.message||e)})}
  }
  if(method==='GET'&&p==='/api/binance/universe'){
    try{
      const j=await nativeJson(input,init);
      if(Array.isArray(j?.items)&&j.items.length)return json(j);
    }catch{}
    try{return json(await binanceUniverseFallback(u.searchParams.get('top')||100))}
    catch(e){return json({error:'BINANCE_UNIVERSE_UNAVAILABLE',message:String(e?.message||e)},502)}
  }
  if(method==='GET'&&p==='/api/binance'){
    try{
      const j=await nativeJson(input,init);
      if(Array.isArray(j)&&j.length)return json(j);
    }catch{}
    try{return json(await binanceKlinesFallback(u.searchParams.get('symbol'),u.searchParams.get('interval')))}
    catch(e){return json({error:'BINANCE_KLINES_UNAVAILABLE',message:String(e?.message||e)},502)}
  }
  if(method==='GET'&&p==='/api/fixed-income/curve'){
    try{const j=await nativeJson(input,init);if(Array.isArray(j?.bonds)&&j.bonds.length>=2)return json(j)}catch{}
    try{return json(await bondCurveFallback())}catch(e){return json({bonds:[],source:'CompararFondos no disponible',message:String(e?.message||e)},502)}
  }
  if(p==='/api/config'){
    if(method==='GET'){
      const state=load(KEYS.config,{revision:0,config:{watchlist:[],cedearBlacklist:[],lastPositionSize:0,alertsEnabled:false,portfolioBaseCurrency:'ARS',portfolioCapital:0,portfolioCashTransactions:[],portfolioCashReconciliation:null,riskPerTradePct:0.75,monitorMode:'RADAR',monitorAlerts:{levels:true,entry:true,state:true,opportunity:true,concentration:true},scoreWeights:null,scoreModelVersion:1,scoreModelHistory:[]}});
      return json({...state.config,__radarConfigRevision:Number(state.revision)||0,__radarPersistencePolicy:'BROWSER_LOCALSTORAGE'});
    }
    if(method==='POST'){
      const incoming=await bodyOf(init), state=load(KEYS.config,{revision:0,config:{}});
      const expected=Math.max(0,Math.trunc(Number(incoming.__radarExpectedRevision)||0));
      if(expected!==(Number(state.revision)||0))return json({error:'CONFIG_REVISION_CONFLICT',revision:Number(state.revision)||0},409);
      const clean={...incoming}; for(const k of Object.keys(clean))if(k.startsWith('__radar'))delete clean[k];
      const revision=(Number(state.revision)||0)+1; save(KEYS.config,{revision,config:clean});
      return json({ok:true,revision,idempotent:false,persistence:'browser-localStorage'});
    }
  }
  if(p==='/api/signals'){
    if(method==='GET')return json(load(KEYS.signals,{version:1,signals:[]}));
    if(method==='POST'){const x=await bodyOf(init);save(KEYS.signals,x);return json({ok:true,count:Array.isArray(x.signals)?x.signals.length:0})}
  }
  if(p==='/api/decisions'){
    if(method==='GET')return json(load(KEYS.decisions,{version:1,records:[]}));
    if(method==='POST'){const x=await bodyOf(init);save(KEYS.decisions,x);return json({ok:true,count:Array.isArray(x.records)?x.records.length:0})}
  }
  if(p==='/api/watcher/status')return json({ok:true,running:false,mode:'WEB',message:'Monitoreo 24x7 local no aplica en Vercel; Radar web analiza bajo demanda.'});
  if(p==='/api/watcher/configure'||p==='/api/watcher/start'||p==='/api/watcher/stop'){
    const x=await bodyOf(init);save(KEYS.watcher,{...x,updatedAt:new Date().toISOString()});return json({ok:true,running:false,mode:'WEB'});
  }
  if(p==='/api/g2/features')return json({
    technical:false,technicalPlan:false,technicalValidation:false,fixedIncome:false,fixedIncomeScanner:false,fixedIncomeScenarios:false,fixedIncomeAuthority:false,fixedIncomeAllocator:false,
    portfolio:false,portfolioLive:false,portfolioDualWrite:false,portfolioRead:false,portfolioReconciliation:false,portfolioCutover:false,portfolioAuthority:false,portfolioG2First:false,portfolioBenchmark:false,portfolioScenarios:false,
    risk:false,riskAlerts:false,opportunity:false,opportunityDiscovery:false,opportunityJobs:false,advisor:false,advisorMonitoring:false,advisorActionQueue:false,advisorPortfolioCandidates:false,advisorReviewPlans:false,advisorMeetingOutcomes:false,advisorRecommendations:false,advisorReview:false,advisorWorkflow:false,
    security:false,identityDirectory:false,oidcFederation:false,federationOperations:false,productionOperations:false,postgresPersistence:false,postgresLiveValidation:false,postgresOperationsSignoff:false,releaseCertification:false,releasePromotion:false,deploymentAutomation:false,
    operationalTelemetry:false,domainPostgresMigration:false,durableTelemetry:false,marketData:true,webRuntime:true,version:'5.0.0',phase:'12A'
  });
  return NATIVE_FETCH(input,init);
};
window.__RADAR_WEB_RUNTIME__={version:'5.0.0-web.4',persistence:'localStorage',api:'vercel-serverless'};
})();


/* Scanner guardrails: do not offer unsupported BYMA intraday combinations. */
(()=>{
'use strict';
function syncScannerTimeframe(){
  const universe=document.getElementById('scanUniverse');
  const tf=document.getElementById('scanTf');
  if(!universe||!tf)return;
  const byma=new Set(['cedear','cedear_liquid','arg_leading','arg_general','arg_all']);
  const micro=tf.querySelector('option[value="micro"]');
  const unsupported=byma.has(universe.value);
  if(micro){
    micro.disabled=unsupported;
    micro.textContent=unsupported?'Micro · no disponible en BYMA':'Micro';
  }
  if(unsupported&&tf.value==='micro'){
    tf.value='short';
    tf.dispatchEvent(new Event('change',{bubbles:true}));
  }
  const info=document.getElementById('scanUniverseInfo');
  if(info&&unsupported&&!info.dataset.radarTfHint){
    info.dataset.radarTfHint='1';
  }
}
function installScannerGuardrails(){
  syncScannerTimeframe();
  const u=document.getElementById('scanUniverse');
  if(u&&!u.dataset.radarGuardBound){
    u.dataset.radarGuardBound='1';
    u.addEventListener('change',syncScannerTimeframe);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installScannerGuardrails,{once:true});
else installScannerGuardrails();
})();
