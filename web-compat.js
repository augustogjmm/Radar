(()=>{
'use strict';
const NATIVE_FETCH=window.fetch.bind(window);
const KEYS={config:'radar_web_config_v1',signals:'radar_signal_journal_v73',decisions:'radar_decision_audit_v78',watcher:'radar_web_watcher_v1'};
const json=(data,status=200,headers={})=>Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}}));
const load=(k,fallback)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x&&typeof x==='object'?x:fallback}catch{return fallback}};
const save=(k,v)=>{localStorage.setItem(k,JSON.stringify(v));return v};
function pathOf(input){try{return new URL(typeof input==='string'?input:input.url,location.origin).pathname}catch{return String(input||'')}}
async function bodyOf(init){try{return init?.body?JSON.parse(init.body):{}}catch{return {}}}
window.fetch=async function(input,init={}){
  const p=pathOf(input), method=String(init?.method||'GET').toUpperCase();
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
