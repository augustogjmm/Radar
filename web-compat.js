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
window.__RADAR_WEB_RUNTIME__={version:'5.0.0-web.1',persistence:'localStorage',api:'vercel-serverless'};
})();
