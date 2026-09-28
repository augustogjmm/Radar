/* Radar Tecnico G2 - Technical data, indicators, analysis, trade plan and backtest core
   Extracted from certified runtime; order preserved. */

/* ===== RUNTIME BLOCK 25 ===== */
// Phase 10A: shared browser foundation moved to /g2/runtime/browser-foundation-runtime.js
// Phase 10B: market dashboard runtime moved to /g2/runtime/market-dashboard-runtime.js
// Phase 10C: market intelligence runtime moved to /g2/runtime/market-intelligence-runtime.js

const TF_CRYPTO={
 micro:{label:'15m',interval:'15m',horizon:'Micro'},
 short:{label:'1H',interval:'1h',horizon:'Corto'},
 medium:{label:'4H',interval:'4h',horizon:'Medio'},
 macro:{label:'1D',interval:'1d',horizon:'Macro'}
};
const TF_BYMA={
 short:{label:'1D',horizon:'Corto'},
 medium:{label:'1W',horizon:'Medio'},
 macro:{label:'1M',horizon:'Macro'}
};
const TF_STOCK={
 micro:{label:'30m',interval:'30m',range:'1mo',horizon:'Micro'},
 short:{label:'1H',interval:'60m',range:'3mo',horizon:'Corto'},
 medium:{label:'1D',interval:'1d',range:'1y',horizon:'Medio'},
 macro:{label:'1W',interval:'1wk',range:'5y',horizon:'Macro'}
};


async function loadConfig(){
 try{
   const c=new AbortController(),tm=setTimeout(()=>c.abort(),5000);let r;
   try{r=await fetch('/api/config',{cache:'no-store',signal:c.signal})}finally{clearTimeout(tm)}
   if(!r.ok)throw new Error(await r.text());const j=await r.json();
   const loadedServerRevision=Math.max(0,Math.trunc(Number(j?.__radarConfigRevision)||0)),loadedPersistencePolicy=String(j?.__radarPersistencePolicy||'');delete j.__radarConfigRevision;delete j.__radarExpectedRevision;delete j.__radarMutationId;delete j.__radarConfigLastMutationId;delete j.__radarPersistencePolicy;delete j.__radarClientId;
   state.config={...j,watchlist:Array.isArray(j.watchlist)?j.watchlist:[],cedearBlacklist:Array.isArray(j.cedearBlacklist)?j.cedearBlacklist:[],lastPositionSize:Number(j.lastPositionSize)||0,alertsEnabled:!!j.alertsEnabled,portfolioBaseCurrency:['ARS','USD'].includes(j.portfolioBaseCurrency)?j.portfolioBaseCurrency:'ARS',portfolioCapital:Number(j.portfolioCapital)||0,portfolioCashTransactions:Array.isArray(j.portfolioCashTransactions)?j.portfolioCashTransactions:[],portfolioCashReconciliation:j.portfolioCashReconciliation&&typeof j.portfolioCashReconciliation==='object'?j.portfolioCashReconciliation:null,riskPerTradePct:Number(j.riskPerTradePct)>0?Number(j.riskPerTradePct):0.75,monitorMode:['OFF','RADAR','24X7'].includes(j.monitorMode)?j.monitorMode:'RADAR',monitorAlerts:{levels:j.monitorAlerts?.levels!==false,entry:j.monitorAlerts?.entry!==false,state:j.monitorAlerts?.state!==false,opportunity:j.monitorAlerts?.opportunity!==false,concentration:j.monitorAlerts?.concentration!==false},scoreWeights:j.scoreWeights&&typeof j.scoreWeights==='object'?j.scoreWeights:null,scoreModelVersion:Number(j.scoreModelVersion)||1,scoreModelHistory:Array.isArray(j.scoreModelHistory)?j.scoreModelHistory:[]};
   radarConfigPersistence.serverRevision=loadedServerRevision;
   if($('positionSizeInput')&&state.config.lastPositionSize>0)$('positionSizeInput').value=state.config.lastPositionSize;if($('riskAccountCapital'))$('riskAccountCapital').value=state.config.portfolioCapital||'';if($('riskPerTradePct'))$('riskPerTradePct').value=state.config.riskPerTradePct;if($('riskSizingCurrency'))$('riskSizingCurrency').value=state.config.portfolioBaseCurrency==='USD'?'USD':'ARS';if($('portfolioBaseCurrency'))$('portfolioBaseCurrency').value=state.config.portfolioBaseCurrency;if($('portfolioReferenceCapital'))$('portfolioReferenceCapital').value=state.config.portfolioCapital||'';
   if($('monitorModeSelect'))$('monitorModeSelect').value=state.config.monitorMode;if($('monitorAlertLevels'))$('monitorAlertLevels').checked=state.config.monitorAlerts.levels;if($('monitorAlertEntry'))$('monitorAlertEntry').checked=state.config.monitorAlerts.entry;if($('monitorAlertState'))$('monitorAlertState').checked=state.config.monitorAlerts.state;if($('monitorAlertOpportunity'))$('monitorAlertOpportunity').checked=state.config.monitorAlerts.opportunity;if($('monitorAlertConcentration'))$('monitorAlertConcentration').checked=state.config.monitorAlerts.concentration;
   radarRememberCommittedConfig();setConfigPersistenceUi(true,loadedPersistencePolicy==='BROWSER_LOCALSTORAGE'?'Configuración guardada en este navegador':'Configuración cargada');try{await repairWatchlistConfig()}catch(e){console.warn('repair config',e)}
 }catch(e){if(!state.config||!Array.isArray(state.config.watchlist))state.config={watchlist:[],cedearBlacklist:[],lastPositionSize:0,alertsEnabled:false,portfolioBaseCurrency:'ARS',portfolioCapital:0,portfolioCashTransactions:[],portfolioCashReconciliation:null,riskPerTradePct:0.75,monitorMode:'RADAR',monitorAlerts:{levels:true,entry:true,state:true,opportunity:true,concentration:true},scoreWeights:null,scoreModelVersion:1,scoreModelHistory:[]};setConfigPersistenceUi(null,'Configuración local pendiente. Radar continúa con datos de mercado.')}
 try{renderWatchlist()}catch(e){console.warn('render watchlist',e)}try{updateAlertUI()}catch(e){console.warn('alert ui',e)}try{await applyMonitorMode(false)}catch(e){console.warn('monitor mode',e)}try{g2PortfolioScheduleSync()}catch{}return state.config;
}
const RADAR_CONFIG_BEST_EFFORT_BACKPRESSURE_LIMIT=6;
const RADAR_CONFIG_BEST_EFFORT_TIMEOUT_MS=6500;
const RADAR_CONFIG_BEST_EFFORT_RETRY_DELAYS_MS=[150,450];
const RADAR_CONFIG_RETRY_JITTER_MAX_MS=175;
const RADAR_CONFIG_RETRY_DELAY_CAP_MS=5000;
const RADAR_CONFIG_RETRYABLE_HTTP_STATUS=[408,425,429,500,502,503,504];
const RADAR_CONFIG_REVISION_FIELD='__radarConfigRevision';
const RADAR_CONFIG_EXPECTED_REVISION_FIELD='__radarExpectedRevision';
const RADAR_CONFIG_MUTATION_ID_FIELD='__radarMutationId';
const RADAR_CONFIG_LAST_MUTATION_ID_FIELD='__radarConfigLastMutationId';
const RADAR_CONFIG_PERSISTENCE_POLICY_FIELD='__radarPersistencePolicy';
const RADAR_CONFIG_CLIENT_ID_FIELD='__radarClientId';
let radarConfigMutationSequence=0;
function radarConfigClientId(){try{return `c-${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`}`}catch{return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`}}
const radarConfigSessionClientId=radarConfigClientId();
const radarConfigPersistence={ok:null,lastAttemptAt:0,lastSuccessAt:0,lastError:'',queuedRevision:0,persistedRevision:0,serverRevision:0,lastReadbackRevision:0,revisionConflicts:0,revisionConflictReloads:0,lastConflictServerRevision:0,pending:0,generation:0,committedPayload:'',rollbackCount:0,lastRollbackAt:0,rollbackAligned:false,bestEffortCount:0,bestEffortPhysicalWrites:0,coalescedBestEffort:0,lastBestEffortReason:'',lastCoalescedBestEffortReasons:'',lastPolicy:'',maxPendingObserved:0,backpressureEvents:0,deferredBestEffort:0,backpressureFlushes:0,backpressureFlushFailures:0,backpressureDroppedOnRollback:0,backpressureDirty:false,backpressureGeneration:0,lastDeferredBestEffortReasons:'',bestEffortRetryAttempts:0,bestEffortRetrySuccesses:0,bestEffortRetryExhausted:0,bestEffortTimeouts:0,lastRetryDelayMs:0,lastRetryReason:'',strictAmbiguousReadbacks:0,strictReadbackRecovered:0,bestEffortReadbackRecovered:0,idempotentRetryAcks:0,lastMutationId:'',serverRetryHints:0,coordinatedRetries:0,lastServerRetryAfterMs:0,lastRetryJitterMs:0,retryJitterMsTotal:0,lastServerCommitHealth:'',degradedRetryHints:0,saturatedRetryHints:0,admissionDeferrals:0,admissionCooldownDeferrals:0,admissionFlushes:0,admissionDeferUntil:0,lastAdmissionReason:''};
let radarConfigPersistenceTail=Promise.resolve();
let radarConfigCoalescibleTail=null;
let radarConfigDeferredReasons=new Set();
let radarConfigBackpressureFlushScheduled=false;
let radarConfigAdmissionFlushTimer=null;
function setConfigPersistenceUi(ok,message=''){const el=$('configState'),retry=$('retryConfigSaveBtn');if(el){if(message)el.textContent=message;el.dataset.persistence=ok===true?'ok':ok===false?'error':'unknown'}if(retry)retry.hidden=ok!==false}
function radarConfigPersistenceMessage(error){const detail=String(error?.message||error||'Error desconocido');return `No se pudo guardar la configuración: ${detail}. El estado visible puede seguir activo en esta sesión; verificá el estado antes de repetir una operación de cartera.`}
function radarRememberCommittedConfig(payload=null){try{const body=typeof payload==='string'?payload:JSON.stringify(state.config);JSON.parse(body);radarConfigPersistence.committedPayload=body;return true}catch{return false}}
function radarRenderConfigRollback(){
 try{if($('portfolioBaseCurrency'))$('portfolioBaseCurrency').value=state.config?.portfolioBaseCurrency||'ARS';if($('riskSizingCurrency'))$('riskSizingCurrency').value=state.config?.portfolioBaseCurrency==='USD'?'USD':'ARS';if($('portfolioReferenceCapital'))$('portfolioReferenceCapital').value=Number(state.config?.portfolioCapital)||'';if($('riskAccountCapital'))$('riskAccountCapital').value=Number(state.config?.portfolioCapital)||'';if($('monitorModeSelect'))$('monitorModeSelect').value=state.config?.monitorMode||'RADAR';if($('monitorAlertLevels'))$('monitorAlertLevels').checked=state.config?.monitorAlerts?.levels!==false;if($('monitorAlertEntry'))$('monitorAlertEntry').checked=state.config?.monitorAlerts?.entry!==false;if($('monitorAlertState'))$('monitorAlertState').checked=state.config?.monitorAlerts?.state!==false;if($('monitorAlertOpportunity'))$('monitorAlertOpportunity').checked=state.config?.monitorAlerts?.opportunity!==false;if($('monitorAlertConcentration'))$('monitorAlertConcentration').checked=state.config?.monitorAlerts?.concentration!==false}catch{}
 for(const name of ['renderWatchlist','renderScanner','renderRfScanner','renderDecisionCenter','renderPortfolio360','updateAlertUI'])try{globalThis[name]?.()}catch{}
 try{window.dispatchEvent?.(new CustomEvent('radar:config-rollback',{detail:{generation:radarConfigPersistence.generation,rollbackCount:radarConfigPersistence.rollbackCount}}))}catch{}
}
function radarClearDeferredBestEffort({rolledBack=false}={}){
 if(rolledBack&&radarConfigPersistence.backpressureDirty)radarConfigPersistence.backpressureDroppedOnRollback+=1;
 radarConfigPersistence.backpressureDirty=false;radarConfigPersistence.backpressureGeneration=radarConfigPersistence.generation;radarConfigDeferredReasons.clear();radarConfigPersistence.lastDeferredBestEffortReasons='';if(rolledBack){radarConfigPersistence.admissionDeferUntil=0;if(radarConfigAdmissionFlushTimer){clearTimeout(radarConfigAdmissionFlushTimer);radarConfigAdmissionFlushTimer=null}}
}
async function radarRollbackConfigToCommitted(error){
 const payload=radarConfigPersistence.committedPayload;if(!payload)return false;
 try{
   state.config=JSON.parse(payload);radarConfigPersistence.generation+=1;radarConfigPersistence.rollbackCount+=1;radarConfigPersistence.lastRollbackAt=Date.now();radarConfigPersistence.rollbackAligned=true;radarClearDeferredBestEffort({rolledBack:true});
   // Si G2 es la autoridad de cartera, el ledger confirmado manda: rehidrata posiciones sobre la config restaurada.
   try{if(typeof g2PortfolioAuthorityMode==='function'&&g2PortfolioAuthorityMode()==='G2_FIRST'&&typeof g2PortfolioLoadReadModel==='function')await g2PortfolioLoadReadModel()}catch(rehydrateError){console.warn('config rollback: G2 read-model rehydrate failed',rehydrateError)}
   try{g2PortfolioScheduleSync()}catch{}
   radarRenderConfigRollback();return true;
 }catch(rollbackError){console.warn('config rollback failed',rollbackError,error);return false}
}
function radarConfigAbortError(){const err=new Error('La operación fue descartada porque una persistencia anterior falló y Radar restauró el último estado confirmado.');err.code='RADAR_CONFIG_TRANSACTION_ABORTED';err.radarAlreadyReported=true;return err}
function radarStableJson(value){if(Array.isArray(value))return '['+value.map(radarStableJson).join(',')+']';if(value&&typeof value==='object'){return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+radarStableJson(value[k])).join(',')+'}'}return JSON.stringify(value)}
function radarConfigRetryableError(error){const status=Number(error?.radarHttpStatus)||0;if(RADAR_CONFIG_RETRYABLE_HTTP_STATUS.includes(status))return true;const name=String(error?.name||'');const msg=String(error?.message||error||'');return name==='AbortError'||name==='TypeError'||/failed to fetch|network|timed?\s*out|connection|ECONNRESET|ECONNREFUSED/i.test(msg)}
function radarConfigHttpError(response,detail=''){const status=Number(response?.status)||0;const err=new Error(detail||`HTTP ${status||'sin estado'}`);err.radarHttpStatus=status;try{const body=typeof detail==='string'&&detail.trim().startsWith('{')?JSON.parse(detail):null,hint=Number(body?.retryAfterMs),health=String(body?.commitHealth||'').toUpperCase();if(Number.isFinite(hint)&&hint>=0)err.radarRetryAfterMs=Math.min(RADAR_CONFIG_RETRY_DELAY_CAP_MS,Math.max(0,Math.trunc(hint)));if(['HEALTHY','DEGRADED','SATURATED'].includes(health))err.radarCommitHealth=health;err.radarServerError=String(body?.error||'');err.radarAdmissionDeferred=body?.admissionDeferred===true||body?.error==='CONFIG_ADMISSION_DEFERRED';err.radarAdmissionReason=String(body?.admissionReason||'')}catch{}if(status===409)err.code='RADAR_CONFIG_REVISION_CONFLICT';return err}
function radarConfigCoordinatedRetryDelay(baseDelay,error){const hint=Math.min(RADAR_CONFIG_RETRY_DELAY_CAP_MS,Math.max(0,Math.trunc(Number(error?.radarRetryAfterMs)||0))),health=['HEALTHY','DEGRADED','SATURATED'].includes(String(error?.radarCommitHealth||'').toUpperCase())?String(error.radarCommitHealth).toUpperCase():'',jitter=Math.floor(Math.random()*(RADAR_CONFIG_RETRY_JITTER_MAX_MS+1)),delay=Math.min(RADAR_CONFIG_RETRY_DELAY_CAP_MS,Math.max(baseDelay,hint)+jitter);radarConfigPersistence.lastServerRetryAfterMs=hint;radarConfigPersistence.lastServerCommitHealth=health;radarConfigPersistence.lastRetryJitterMs=jitter;radarConfigPersistence.retryJitterMsTotal+=jitter;if(hint>0)radarConfigPersistence.serverRetryHints+=1;if(health==='DEGRADED')radarConfigPersistence.degradedRetryHints+=1;if(health==='SATURATED')radarConfigPersistence.saturatedRetryHints+=1;radarConfigPersistence.coordinatedRetries+=1;return delay}
function radarConfigStripServerMetadata(value){const copy=value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):{};delete copy[RADAR_CONFIG_REVISION_FIELD];delete copy[RADAR_CONFIG_EXPECTED_REVISION_FIELD];delete copy[RADAR_CONFIG_MUTATION_ID_FIELD];delete copy[RADAR_CONFIG_LAST_MUTATION_ID_FIELD];delete copy[RADAR_CONFIG_PERSISTENCE_POLICY_FIELD];delete copy[RADAR_CONFIG_CLIENT_ID_FIELD];return copy}
function radarConfigNewMutationId(){try{const id=globalThis.crypto?.randomUUID?.();if(id)return String(id)}catch{}radarConfigMutationSequence+=1;return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}-${radarConfigMutationSequence.toString(36)}`}
async function radarConfigFetchRemoteSnapshot(){const r=await fetch('/api/config',{cache:'no-store'});if(!r.ok)throw radarConfigHttpError(r,await r.text());const remote=await r.json();const revision=Math.max(0,Math.trunc(Number(remote?.[RADAR_CONFIG_REVISION_FIELD])||0));return{revision,config:radarConfigStripServerMetadata(remote)}}
async function radarConfigReadbackMatches(payload){
 try{const remote=await radarConfigFetchRemoteSnapshot(),local=radarConfigStripServerMetadata(JSON.parse(payload));radarConfigPersistence.lastReadbackRevision=remote.revision;return radarStableJson(remote.config)===radarStableJson(local)}catch{return false}
}
async function radarConfigAdoptRemoteAfterConflict(){
 try{const remote=await radarConfigFetchRemoteSnapshot();state.config=remote.config;radarConfigPersistence.serverRevision=remote.revision;radarConfigPersistence.lastConflictServerRevision=remote.revision;radarConfigPersistence.revisionConflictReloads+=1;radarConfigPersistence.generation+=1;radarConfigPersistence.rollbackAligned=true;radarRememberCommittedConfig(JSON.stringify(remote.config));radarClearDeferredBestEffort({rolledBack:true});try{g2PortfolioScheduleSync()}catch{};radarRenderConfigRollback();window.radarNotify?.(`La configuración cambió en otra ventana (rev ${remote.revision}). Radar recargó la versión confirmada y descartó el cambio local obsoleto.`,'warn',{duration:9000});return true}catch(error){console.warn('config revision conflict reload failed',error);return false}
}
function radarConfigRequestPayload(entry){
 if(entry.requestPayload)return entry.requestPayload;
 entry.expectedServerRevision=Math.max(0,Math.trunc(Number(radarConfigPersistence.serverRevision)||0));if(!entry.mutationId)entry.mutationId=radarConfigNewMutationId();const body=radarConfigStripServerMetadata(JSON.parse(entry.payload));body[RADAR_CONFIG_EXPECTED_REVISION_FIELD]=entry.expectedServerRevision;body[RADAR_CONFIG_MUTATION_ID_FIELD]=entry.mutationId;body[RADAR_CONFIG_PERSISTENCE_POLICY_FIELD]=entry.strict?'STRICT':'BEST_EFFORT';body[RADAR_CONFIG_CLIENT_ID_FIELD]=radarConfigSessionClientId;entry.requestPayload=JSON.stringify(body);radarConfigPersistence.lastMutationId=entry.mutationId;return entry.requestPayload
}
async function radarConfigFetchOnce(entry){
 const options={method:'POST',headers:{'Content-Type':'application/json'},body:radarConfigRequestPayload(entry)};
 if(entry.strict||typeof AbortController!=='function'||typeof setTimeout!=='function'||typeof clearTimeout!=='function')return fetch('/api/config',options);
 const controller=new AbortController(),tm=setTimeout(()=>controller.abort(),RADAR_CONFIG_BEST_EFFORT_TIMEOUT_MS);options.signal=controller.signal;
 try{return await fetch('/api/config',options)}catch(e){if(String(e?.name||'')==='AbortError')radarConfigPersistence.bestEffortTimeouts+=1;throw e}finally{clearTimeout(tm)}
}
async function radarConfigPostWithDiscipline(entry){
 let retryIndex=0;
 while(true){
   try{
     if(!entry.strict)radarConfigPersistence.bestEffortPhysicalWrites+=1;
     const r=await radarConfigFetchOnce(entry);if(!r.ok)throw radarConfigHttpError(r,await r.text());
     let committedRevision=entry.expectedServerRevision+1;let idempotent=false;try{if(typeof r.json==='function'){const ack=await r.json();if(Number.isFinite(Number(ack?.revision)))committedRevision=Math.max(0,Math.trunc(Number(ack.revision)));idempotent=ack?.idempotent===true}}catch{}if(idempotent)radarConfigPersistence.idempotentRetryAcks+=1
     if(retryIndex>0)radarConfigPersistence.bestEffortRetrySuccesses+=1;
     return{revision:committedRevision};
   }catch(e){
     const retryable=radarConfigRetryableError(e);
     if(entry.strict){
       if(retryable){radarConfigPersistence.strictAmbiguousReadbacks+=1;if(await radarConfigReadbackMatches(entry.payload)){radarConfigPersistence.strictReadbackRecovered+=1;return{revision:radarConfigPersistence.lastReadbackRevision}}}
       throw e;
     }
     if(!retryable||retryIndex>=RADAR_CONFIG_BEST_EFFORT_RETRY_DELAYS_MS.length){
       if(retryable&&retryIndex>=RADAR_CONFIG_BEST_EFFORT_RETRY_DELAYS_MS.length)radarConfigPersistence.bestEffortRetryExhausted+=1;
       if(retryable&&await radarConfigReadbackMatches(entry.payload)){radarConfigPersistence.bestEffortReadbackRecovered+=1;return{revision:radarConfigPersistence.lastReadbackRevision}}
       throw e;
     }
     const baseDelay=RADAR_CONFIG_BEST_EFFORT_RETRY_DELAYS_MS[retryIndex++],delay=radarConfigCoordinatedRetryDelay(baseDelay,e),health=String(e?.radarCommitHealth||'');radarConfigPersistence.bestEffortRetryAttempts+=1;radarConfigPersistence.lastRetryDelayMs=delay;radarConfigPersistence.lastRetryReason=entry.reason||'best-effort';
     setConfigPersistenceUi(null,`Persistencia best-effort intermitente${health&&health!=='HEALTHY'?` · commit ${health}`:''} · reintento ${retryIndex}/${RADAR_CONFIG_BEST_EFFORT_RETRY_DELAYS_MS.length} en ${delay} ms…`);
     await new Promise(resolve=>setTimeout(resolve,delay));
   }
 }
}
function radarDeferBestEffort(reason,generation){
 radarConfigPersistence.backpressureEvents+=1;radarConfigPersistence.deferredBestEffort+=1;radarConfigPersistence.backpressureDirty=true;radarConfigPersistence.backpressureGeneration=generation;if(reason)radarConfigDeferredReasons.add(reason);radarConfigPersistence.lastDeferredBestEffortReasons=[...radarConfigDeferredReasons].join(',');
 setConfigPersistenceUi(null,`Cola de configuración ocupada · cambio best-effort diferido (${radarConfigPersistence.pending} pendientes)…`);
 return false;
}
function radarScheduleAdmissionFlush(delayMs=0){
 const delay=Math.max(1,Math.min(RADAR_CONFIG_RETRY_DELAY_CAP_MS,Math.trunc(Number(delayMs)||0))),target=Date.now()+delay;
 radarConfigPersistence.admissionDeferUntil=Math.max(Number(radarConfigPersistence.admissionDeferUntil)||0,target);
 if(radarConfigAdmissionFlushTimer){clearTimeout(radarConfigAdmissionFlushTimer);radarConfigAdmissionFlushTimer=null}
 const remaining=Math.max(1,radarConfigPersistence.admissionDeferUntil-Date.now());
 radarConfigAdmissionFlushTimer=setTimeout(()=>{radarConfigAdmissionFlushTimer=null;if(Date.now()<radarConfigPersistence.admissionDeferUntil){radarScheduleAdmissionFlush(radarConfigPersistence.admissionDeferUntil-Date.now());return}radarConfigPersistence.admissionDeferUntil=0;radarConfigPersistence.admissionFlushes+=1;radarScheduleBackpressureFlush()},remaining);
}
function radarAdmissionDeferBestEffort(reason,generation,error){
 radarConfigPersistence.admissionDeferrals+=1;radarConfigPersistence.lastAdmissionReason=String(error?.radarAdmissionReason||'SATURATED');radarDeferBestEffort(reason,generation);
 const delay=Math.max(250,Math.min(RADAR_CONFIG_RETRY_DELAY_CAP_MS,Math.trunc(Number(error?.radarRetryAfterMs)||1000)));radarScheduleAdmissionFlush(delay);
 setConfigPersistenceUi(null,`Commit SATURATED · cambio best-effort diferido ${delay} ms sin competir por el lock…`);return false;
}
function radarScheduleBackpressureFlush(){
 if(radarConfigBackpressureFlushScheduled||!radarConfigPersistence.backpressureDirty||radarConfigPersistence.pending!==0)return;
 const admissionRemaining=(Number(radarConfigPersistence.admissionDeferUntil)||0)-Date.now();if(admissionRemaining>0){radarScheduleAdmissionFlush(admissionRemaining);return}
 if(radarConfigPersistence.backpressureGeneration!==radarConfigPersistence.generation){radarClearDeferredBestEffort({rolledBack:true});return}
 radarConfigBackpressureFlushScheduled=true;
 Promise.resolve().then(async()=>{
   radarConfigBackpressureFlushScheduled=false;if(!radarConfigPersistence.backpressureDirty||radarConfigPersistence.pending!==0)return;
   const remaining=(Number(radarConfigPersistence.admissionDeferUntil)||0)-Date.now();if(remaining>0){radarScheduleAdmissionFlush(remaining);return}
   if(radarConfigPersistence.backpressureGeneration!==radarConfigPersistence.generation){radarClearDeferredBestEffort({rolledBack:true});return}
   const reasons=[...radarConfigDeferredReasons].join(',');radarClearDeferredBestEffort();
   try{const ok=await saveConfigBestEffort('backpressure-drain');if(ok)radarConfigPersistence.backpressureFlushes+=1;else radarConfigPersistence.backpressureFlushFailures+=1}catch{radarConfigPersistence.backpressureFlushFailures+=1}
   if(reasons)radarConfigPersistence.lastDeferredBestEffortReasons=reasons;
 });
}
function enqueueConfigPersistence({strict=false,reason=''}={}){
 const normalizedReason=String(reason||'').trim();
 const generation=radarConfigPersistence.generation;
 radarConfigPersistence.lastPolicy=strict?'STRICT':`BEST_EFFORT:${normalizedReason||'UNSPECIFIED'}`;
 const payload=JSON.stringify(state.config);
 if(!strict){
   const tail=radarConfigCoalescibleTail;
   if(tail&&!tail.started&&tail.generation===generation){
     const revision=++radarConfigPersistence.queuedRevision;tail.payload=payload;tail.revision=revision;tail.reasons.add(normalizedReason);tail.coalescedCalls+=1;
     radarConfigPersistence.coalescedBestEffort+=1;radarConfigPersistence.lastCoalescedBestEffortReasons=[...tail.reasons].join(',');
     setConfigPersistenceUi(null,`Agrupando configuración best-effort · ${tail.coalescedCalls+1} cambios → 1 escritura…`);
     return tail.promise;
   }
   const admissionRemaining=(Number(radarConfigPersistence.admissionDeferUntil)||0)-Date.now();if(admissionRemaining>0){radarConfigPersistence.admissionCooldownDeferrals+=1;radarDeferBestEffort(normalizedReason,generation);radarScheduleAdmissionFlush(admissionRemaining);return Promise.resolve(false)}
   if(radarConfigPersistence.pending>=RADAR_CONFIG_BEST_EFFORT_BACKPRESSURE_LIMIT)return Promise.resolve(radarDeferBestEffort(normalizedReason,generation));
 }else radarConfigCoalescibleTail=null;
 const revision=++radarConfigPersistence.queuedRevision;
 const entry={strict,reason:normalizedReason,revision,generation,payload,started:false,expectedServerRevision:null,mutationId:'',requestPayload:'',coalescedCalls:0,reasons:new Set(normalizedReason?[normalizedReason]:[]),promise:null};
 radarConfigPersistence.pending++;radarConfigPersistence.maxPendingObserved=Math.max(radarConfigPersistence.maxPendingObserved,radarConfigPersistence.pending);radarConfigPersistence.rollbackAligned=false;
 setConfigPersistenceUi(null,radarConfigPersistence.pending>1?`Guardando configuración · ${radarConfigPersistence.pending} cambios en cola…`:'Guardando configuración…');
 const execute=async()=>{
   entry.started=true;if(radarConfigCoalescibleTail===entry)radarConfigCoalescibleTail=null;
   radarConfigPersistence.lastAttemptAt=Date.now();
   try{
     if(entry.generation!==radarConfigPersistence.generation){if(entry.strict)throw radarConfigAbortError();return false}
     const commit=await radarConfigPostWithDiscipline(entry);radarConfigPersistence.serverRevision=Math.max(0,Math.trunc(Number(commit?.revision)||0));
     radarConfigPersistence.ok=true;radarConfigPersistence.lastSuccessAt=Date.now();radarConfigPersistence.lastError='';radarConfigPersistence.persistedRevision=entry.revision;radarConfigPersistence.rollbackAligned=false;radarRememberCommittedConfig(entry.payload);
     try{g2PortfolioScheduleSync()}catch{}
     return true;
   }catch(e){
     if(e?.code==='RADAR_CONFIG_TRANSACTION_ABORTED')throw e;
     if(!entry.strict&&e?.radarAdmissionDeferred===true){radarConfigPersistence.ok=null;radarConfigPersistence.lastError='';return radarAdmissionDeferBestEffort(entry.reason||'admission-control',entry.generation,e)}
     radarConfigPersistence.ok=false;radarConfigPersistence.lastError=String(e?.message||e||'Error desconocido');
     const isRevisionConflict=Number(e?.radarHttpStatus)===409||e?.code==='RADAR_CONFIG_REVISION_CONFLICT';if(isRevisionConflict)radarConfigPersistence.revisionConflicts+=1;
     const message=isRevisionConflict?'La configuración local quedó obsoleta porque otra ventana confirmó una revisión más nueva.':radarConfigPersistenceMessage(e);let rolledBack=false;
     if(isRevisionConflict)rolledBack=await radarConfigAdoptRemoteAfterConflict();
     if(entry.strict&&!rolledBack)rolledBack=await radarRollbackConfigToCommitted(e);
     if(entry.strict){
       const err=new Error(message,{cause:e});err.code=isRevisionConflict?'RADAR_CONFIG_REVISION_CONFLICT':'RADAR_CONFIG_PERSISTENCE_FAILED';err.radarAlreadyReported=true;err.rollbackApplied=rolledBack;
       if(isRevisionConflict&&rolledBack){}else if(rolledBack){window.radarNotify?.('Persistencia no confirmada. El cambio fue revertido al último estado guardado; no quedó aplicado en memoria ni se ejecutarán snapshots posteriores construidos sobre ese cambio.','bad',{duration:9000})}
       else window.radarNotify?.('Persistencia no confirmada. El cambio puede seguir activo en esta sesión. Usá «Reintentar guardado» y no repitas la operación.','bad',{duration:8500});
       throw err
     }
     if(isRevisionConflict&&!rolledBack)window.radarNotify?.('No se pudo reconciliar un conflicto de configuración. Recargá Radar antes de continuar.','bad',{duration:9000});
     return false;
   }finally{
     radarConfigPersistence.pending=Math.max(0,radarConfigPersistence.pending-1);
     if(radarConfigPersistence.pending===0){
       if(radarConfigPersistence.backpressureDirty){setConfigPersistenceUi(null,'Cola liberada · consolidando el último cambio best-effort diferido…');radarScheduleBackpressureFlush()}
       else if(radarConfigPersistence.rollbackAligned)setConfigPersistenceUi(true,'Último cambio no guardado: Radar restauró el último estado confirmado.');
       else if(radarConfigPersistence.ok===true&&radarConfigPersistence.persistedRevision===radarConfigPersistence.queuedRevision)setConfigPersistenceUi(true,'Configuración guardada');
       else if(radarConfigPersistence.ok===false)setConfigPersistenceUi(false,radarConfigPersistenceMessage(radarConfigPersistence.lastError));
     }else setConfigPersistenceUi(null,`Guardando configuración · ${radarConfigPersistence.pending} cambio${radarConfigPersistence.pending===1?'':'s'} en cola…`);
   }
 };
 const own=radarConfigPersistenceTail.then(execute,execute);entry.promise=own;
 if(!entry.strict)radarConfigCoalescibleTail=entry;
 radarConfigPersistenceTail=own.catch(()=>{});
 return own;
}
async function persistConfig(options={}){return enqueueConfigPersistence(options)}
async function saveConfigBestEffort(reason){const normalized=String(reason||'').trim();if(!normalized)throw new Error('saveConfigBestEffort requiere un motivo explícito');radarConfigPersistence.bestEffortCount+=1;radarConfigPersistence.lastBestEffortReason=normalized;return persistConfig({strict:false,reason:normalized})}
async function saveConfig(){console.warn('saveConfig() legacy: usar saveConfigStrict() o saveConfigBestEffort(reason)');return saveConfigBestEffort('legacy-unspecified')}
async function saveConfigStrict(){return persistConfig({strict:true,reason:'transactional'})}
async function retryConfigPersistence(){const ok=await saveConfigStrict();if(ok)window.radarNotify?.('Configuración persistida correctamente.','ok');return ok}
window.radarSaveConfigStrict=saveConfigStrict;window.radarSaveConfigBestEffort=saveConfigBestEffort;window.radarRetryConfigPersistence=retryConfigPersistence;
window.radarConfigPersistenceState=()=>({...radarConfigPersistence,committedPayload:radarConfigPersistence.committedPayload?'[confirmed snapshot]':''});

function resolveWatchType(symbol,selectedType){
 const s=normSymbol(symbol),base=s.replace(/\.BA$/,'');
 if(selectedType && selectedType!=='auto')return selectedType;
 if(looksCrypto(s))return 'crypto';
 if(s.endsWith('.BA'))return 'argstock';
 if(typeof ARG_COMPANY_PROFILES!=='undefined'&&ARG_COMPANY_PROFILES[base])return 'argstock';
 return 'stock';
}
function typeLabel(type){
 return type==='crypto'?'Crypto':
        type==='stock'?'Acción / ADR USA':
        type==='argstock'?'Acción Argentina':
        type==='cedear'?'CEDEAR / BYMA':
        type==='argbond'?'Bono / Letra Argentina':
        type==='on'?'Obligación Negociable':'Auto';
}
function repairWatchItem(item){
 if(!item)return false;
 let changed=false,old=item.type,s=normSymbol(item.symbol||''),base=s.replace(/\.BA$/,'');
 if(old==='auto'||!old){item.type=resolveWatchType(item.symbol,'auto');changed=true}
 if(item.type==='crypto'&&!looksCrypto(item.symbol)){item.type=resolveWatchType(item.symbol,'auto');item.autoCorrectedFrom='crypto';changed=true}
 // Corrige altas antiguas de tickers locales ingresados sin .BA (ej. YPFD) cuando la moneda confirma mercado local.
 if(item.type==='stock'&&typeof ARG_COMPANY_PROFILES!=='undefined'&&ARG_COMPANY_PROFILES[base]&&item.portfolioCurrency==='ARS'){
   item.type='argstock';item.autoCorrectedFrom='stock-local';item.sector=item.sector&&item.sector!=='Acciones USA'?item.sector:(ARG_COMPANY_PROFILES[base]?.sector||'Acciones Argentina');if(!item.region||/EE\.UU|Global/i.test(item.region))item.region='Argentina';changed=true;
 }
 if(!item.tf){item.tf='short';changed=true}
 if(!item.portfolioCurrency){item.portfolioCurrency=defaultPortfolioCurrency(item.type);changed=true}
 if(item.inPortfolio&&!item.sector){item.sector=portfolioFallbackSector(item);changed=true}
 const before=Array.isArray(item.transactions)?item.transactions.length:-1;ensureTransactionHistory(item);if(before!==item.transactions.length)changed=true;
 return changed||item.type!==old;
}
async function repairWatchlistConfig(){
 let changed=false;
 for(const item of (state.config.watchlist||[])){
   if(repairWatchItem(item))changed=true;
 }
 if(changed)await saveConfigBestEffort('startup-watchlist-repair');
 return changed;
}

function getTfsForType(type){
 return type==='crypto'?TF_CRYPTO:
        (['argstock','cedear','argbond','on'].includes(type)?TF_BYMA:TF_STOCK);
}
function displaySymbolForType(raw,type){
 const s=normSymbol(raw);
 if(type==='crypto')return cryptoSymbol(s);
 if(['argstock','cedear','argbond','on'].includes(type))return bymaSymbol(s);
 return s;
}





// Phase 10D: scanner and market-universe runtime moved to /g2/runtime/scanner-market-runtime.js





const UI_MOJIBAKE_FIXES=[
  ['Ã¡','á'],['Ã©','é'],['Ã­','í'],['Ã³','ó'],['Ãº','ú'],['Ã±','ñ'],
  ['Ã','Á'],['Ã‰','É'],['Ã','Í'],['Ã“','Ó'],['Ãš','Ú'],['Ã‘','Ñ'],
  ['Â°','°'],['Âº','º'],['Âª','ª'],['Â·','·'],['Â',''],
  ['â€“','–'],['â€”','—'],['â€œ','“'],['â€','”'],['â€˜','‘'],['â€™','’'],
  ['ÔÇô','–'],['ÔÇö','—'],['ÔÇ£','“'],['ÔÇØ','”'],['ÔÇÿ','‘'],['ÔÇÖ','’'],
  ['ΓÇô','–'],['ΓÇö','—'],['ΓÇ£','“'],['ΓÇ¥','”'],['ΓÇÿ','‘'],['ΓÇÖ','’'],
  ['├í','á'],['├®','é'],['├⌐','é'],['├¡','í'],['├│','ó'],['├║','ú'],['├▒','ñ'],
  ['├ü','Á'],['├ë','É'],['├ì','Í'],['├ô','Ó'],['├Ü','Ú'],['├æ','Ñ'],
  ['┬┐','¿'],['┬í','¡'],['┬°','°'],['┬º','º']
];
function normalizeMojibakeText(v){
 let s=String(v??'');for(const [bad,good] of UI_MOJIBAKE_FIXES)s=s.split(bad).join(good);return s.replace(/\uFFFD/g,'');
}
function installUiEncodingGuard(){
 const fixNode=n=>{if(n?.nodeType===Node.TEXT_NODE){const x=normalizeMojibakeText(n.nodeValue);if(x!==n.nodeValue)n.nodeValue=x}else if(n?.nodeType===Node.ELEMENT_NODE){for(const a of ['title','placeholder','aria-label'])if(n.hasAttribute?.(a)){const v=n.getAttribute(a),x=normalizeMojibakeText(v);if(x!==v)n.setAttribute(a,x)}for(const c of n.childNodes||[])fixNode(c)}};
 fixNode(document.body);const observer=new MutationObserver(list=>{for(const m of list){for(const n of m.addedNodes)fixNode(n);if(m.type==='characterData')fixNode(m.target)}});observer.observe(document.body,{subtree:true,childList:true,characterData:true});window.__radarEncodingObserver=observer;
}

function cleanSourceText(v){
 if(v===null||v===undefined)return'';
 return normalizeMojibakeText(v)
         .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ')
         .replace(/\s+/g,' ')
         .trim();
}

// Phase 10E: fixed-income deep-analysis runtime moved to /g2/runtime/fixed-income-analysis-runtime.js


// Phase 10F: scanner controller runtime moved to /g2/runtime/scanner-controller-runtime.js

// Phase 10G: watchlist and portfolio workspace runtime moved to /g2/runtime/watchlist-portfolio-runtime.js

// Phase 10P: symbol normalization, market-data access and bar aggregation moved to /g2/runtime/market-data-access-runtime.js
// Phase 10T: shared technical utility/presentation helpers moved mechanically to /g2/runtime/technical-utility-runtime.js
// Phase 10N: Asset Intelligence profile/fundamentals runtime moved to /g2/runtime/asset-intelligence-runtime.js




// Phase 10N: Asset Intelligence fundamentals owner continued in /g2/runtime/asset-intelligence-runtime.js

/* Confirmed swing detector:
   candidates use local fractals; then noise is filtered with ATR distance and alternation. */





// Phase 10Q: pure technical indicators/primitives moved to /g2/runtime/technical-indicators-runtime.js
// Phase 10R: analyzeSeries + G2 technical adapters/hydration moved to /g2/runtime/technical-analysis-runtime.js
// Phase 10J: portfolio authority/persistence orchestration moved to /g2/runtime/portfolio-authority-runtime.js

// Phase 10I: technical-validation client runtime moved to /g2/runtime/technical-validation-runtime.js
// Phase 10O: analysis UI reset orchestration moved to /g2/runtime/analysis-ui-runtime.js
// Phase 10O: analysis chart presentation runtime moved to /g2/runtime/analysis-ui-runtime.js
// Phase 10S: trade-plan support helpers moved mechanically to /g2/runtime/technical-trade-plan-support-runtime.js
// Phase 10U: computeTradePlan moved mechanically to /g2/runtime/technical-trade-plan-runtime.js

// Phase 10V: quickBacktest moved mechanically to /g2/runtime/technical-quick-backtest-runtime.js

// Phase 10O: analysis side/summary/timeframe presentation moved to /g2/runtime/analysis-ui-runtime.js
// Phase 10H: risk, performance, provenance and decision-audit runtime moved to /g2/runtime/risk-performance-audit-runtime.js

// Phase 10I: advanced/model validation runtime moved to /g2/runtime/technical-validation-runtime.js

/* ============================
   v76 Portfolio Pro / Lab
   ============================ */
// Phase 10L: Portfolio Pro local ledger/diversification/movement runtime moved to /g2/runtime/portfolio-pro-runtime.js

// Phase 10K: Research Lab / backtest / replay orchestration moved to /g2/runtime/research-lab-runtime.js

// Phase 9X: QA / preflight runtime moved to /g2/runtime/qa-preflight-runtime.js
// Phase 10M: portfolio benchmark/relative-strength, backup/restore and contextual refresh runtime moved to /g2/runtime/portfolio-context-runtime.js


// Phase 10O: analysis execution and strategy-analytics orchestration moved to /g2/runtime/analysis-ui-runtime.js
// Phase 9Z: browser bootstrap / UI binding orchestration moved to /g2/runtime/browser-bootstrap-runtime.js

;

/* ===== RUNTIME BLOCK 26 ===== */
// Radar Técnico G2 — Phase 10P / v4.47.0
// Symbol normalization + market-data access + bar aggregation runtime extraction.
// Mechanical ownership move only: provider endpoints remain same-origin and technical/financial semantics are unchanged.

function normSymbol(s){return s.trim().toUpperCase().replace(/\s+/g,'')}

function looksCrypto(s){return /(?:USDT|USDC|FDUSD|BTC|ETH)$/.test(s.replace(/[\/-]/g,''))}

function detectType(s,sel){
 if(sel!=='auto') return sel;
 const n=normSymbol(s),base=n.replace(/\.BA$/,'');
 if(looksCrypto(n)) return 'crypto';
 if(n.endsWith('.BA')) return 'argstock';
 if(typeof ARG_COMPANY_PROFILES!=='undefined'&&ARG_COMPANY_PROFILES[base])return 'argstock';
 return 'stock';
}

function cryptoSymbol(s){return s.replace(/[\/-]/g,'')}

function bymaSymbol(s){return s.replace(/\.BA$/,'')}

function yahooSymbol(s,type){return s}

function intervalSeconds(x){return {'15m':900,'30m':1800,'1h':3600,'60m':3600,'4h':14400,'1d':86400,'1wk':604800}[x]||3600}

async function fetchBinance(symbol,interval){
 const u=`/api/binance?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`;
 const r=await fetch(u); if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||('Binance '+r.status))}
 const a=await r.json();
 if(!Array.isArray(a)||!a.length)throw new Error('Sin datos Binance');
 return a.map(x=>({time:Math.floor(x[0]/1000),open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));
}

async function fetchYahoo(symbol,interval,range,quiet=false){
 const u=`/api/yahoo?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}${quiet?'&quiet=1':''}`;
 const r=await fetch(u);
 if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||('Yahoo '+r.status))}
 const j=await r.json(); const res=j?.chart?.result?.[0]; const q=res?.indicators?.quote?.[0];
 if(!res?.timestamp?.length||!q)throw new Error(j?.chart?.error?.description||'Sin datos Yahoo');
 const out=[]; res.timestamp.forEach((t,i)=>{const o=q.open?.[i],h=q.high?.[i],l=q.low?.[i],c=q.close?.[i],v=q.volume?.[i];
   if([o,h,l,c].every(Number.isFinite))out.push({time:t,open:o,high:h,low:l,close:c,volume:Number.isFinite(v)?v:0})});
 if(out.length<30)throw new Error('Historial insuficiente para '+symbol);
 return out;
}

async function fetchBymaHistory(symbol){
 const r=await fetch(`/api/byma/history?symbol=${encodeURIComponent(symbol)}&days=7300`);
 if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||('BYMA '+r.status))}
 const j=await r.json();
 if(j?.s!=='ok'||!Array.isArray(j?.t)||!j.t.length)throw new Error('Open BYMADATA no devolvió histórico para '+symbol);
 const out=[];
 for(let i=0;i<j.t.length;i++){
   const o=+j.o[i],h=+j.h[i],l=+j.l[i],c=+j.c[i],v=+(j.v?.[i]||0);
   if([o,h,l,c].every(Number.isFinite))out.push({time:+j.t[i],open:o,high:h,low:l,close:c,volume:v});
 }
 if(out.length<30)throw new Error('Histórico BYMA insuficiente para '+symbol);
 return out;
}

async function fetchBymaQuote(symbol){
 const r=await fetch(`/api/byma/quote?symbol=${encodeURIComponent(symbol)}`);
 if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||('BYMA quote '+r.status))}
 return await r.json();
}

function aggregateBars(data,mode){
 const m=new Map();
 for(const d of data){
   const dt=new Date(d.time*1000);
   let key;
   if(mode==='week'){
     const x=new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth(),dt.getUTCDate()));
     const dow=(x.getUTCDay()+6)%7; x.setUTCDate(x.getUTCDate()-dow);
     key=x.toISOString().slice(0,10);
   }else{
     key=`${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}`;
   }
   if(!m.has(key))m.set(key,{time:d.time,open:d.open,high:d.high,low:d.low,close:d.close,volume:d.volume||0});
   else{
     const b=m.get(key); b.high=Math.max(b.high,d.high);b.low=Math.min(b.low,d.low);b.close=d.close;b.volume+=(d.volume||0);b.time=d.time;
   }
 }
 return [...m.values()].sort((a,b)=>a.time-b.time);
}

function quoteValue(q){
 const x=q?.quote||{};
 const price=+[x.trade,x.closingPrice,x.settlementPrice].find(v=>Number.isFinite(+v)&&+v>0);
 const prev=+[x.previousClosingPrice,x.previousSettlementPrice].find(v=>Number.isFinite(+v)&&+v>0);
 const change=Number.isFinite(+x.imbalance)?(+x.imbalance*100):(price&&prev?((price/prev)-1)*100:NaN);
 return {price,prev,change,tradeHour:x.tradeHour||'',serverTime:+q.serverTime||Math.floor(Date.now()/1000)};
}

;

/* ===== RUNTIME BLOCK 27 ===== */
// Radar Técnico G2 — Phase 10Q / v4.48.0
// Pure technical indicator + market-structure primitive extraction.
// Mechanical ownership move only: formulas and technical/financial semantics are unchanged.

function ema(v,p){const k=2/(p+1),o=[];let prev=v[0];for(let i=0;i<v.length;i++){prev=i? v[i]*k+prev*(1-k):v[i];o.push(prev)}return o}

function macd(cl){const e12=ema(cl,12),e26=ema(cl,26),m=cl.map((_,i)=>e12[i]-e26[i]),s=ema(m,9);return{macd:m,signal:s,hist:m.map((v,i)=>v-s[i])}}

function atr(data,p=14){
 const tr=data.map((d,i)=>i===0?d.high-d.low:Math.max(d.high-d.low,Math.abs(d.high-data[i-1].close),Math.abs(d.low-data[i-1].close)));
 return ema(tr,p);
}

function confirmedSwings(data,strength=4){
 const A=atr(data),cand=[];
 for(let i=strength;i<data.length-strength;i++){
   let hi=true,lo=true;
   for(let j=i-strength;j<=i+strength;j++){
     if(j!==i&&data[j].high>=data[i].high)hi=false;
     if(j!==i&&data[j].low<=data[i].low)lo=false;
   }
   if(hi)cand.push({i,time:data[i].time,price:data[i].high,type:'H'});
   if(lo)cand.push({i,time:data[i].time,price:data[i].low,type:'L'});
 }
 cand.sort((a,b)=>a.i-b.i);
 const filtered=[];
 for(const c of cand){
   if(!filtered.length){filtered.push(c);continue}
   const last=filtered.at(-1);
   if(c.type===last.type){
     if((c.type==='H'&&c.price>last.price)||(c.type==='L'&&c.price<last.price))filtered[filtered.length-1]=c;
     continue;
   }
   const minMove=(A[c.i]||0)*1.15;
   if(Math.abs(c.price-last.price)>=minMove)filtered.push(c);
 }
 let prevH=null,prevL=null;
 for(const s of filtered){
   if(s.type==='H'){s.label=prevH?(s.price>prevH.price?'HH':'LH'):'H';prevH=s}
   else{s.label=prevL?(s.price>prevL.price?'HL':'LL'):'L';prevL=s}
 }
 return filtered;
}

function structureState(sw){
 const hs=sw.filter(x=>x.type==='H'),ls=sw.filter(x=>x.type==='L');
 if(hs.length<2||ls.length<2)return'indefinida';
 const h1=hs.at(-2).price,h2=hs.at(-1).price,l1=ls.at(-2).price,l2=ls.at(-1).price;
 if(h2>h1&&l2>l1)return'alcista'; if(h2<h1&&l2<l1)return'bajista'; return'transición';
}

function latestBreak(data,sw,structure,A){
 const bar=data.at(-1),last=bar.close,hs=sw.filter(x=>x.type==='H'),ls=sw.filter(x=>x.type==='L');
 const h=hs.at(-1),l=ls.at(-1),tol=(A?.at(-1)||0)*.12;
 if(h&&last>h.price+tol)return structure==='bajista'?'CHoCH alcista':'BOS alcista';
 if(l&&last<l.price-tol)return structure==='alcista'?'CHoCH bajista':'BOS bajista';
 if(h&&bar.high>h.price&&last<=h.price+tol)return'Test de resistencia por mecha';
 if(l&&bar.low<l.price&&last>=l.price-tol)return'Test de soporte por mecha';
 return'Sin ruptura reciente';
}

function fibFromSwings(sw){
 if(sw.length<2)return null;
 const recent=sw.slice(-8),pairs=[];
 for(let i=1;i<recent.length;i++){
   const a=recent[i-1],b=recent[i];
   if(a.type===b.type)continue;
   const range=Math.abs(b.price-a.price);
   const recency=.72+(i/(recent.length-1))*.28;
   pairs.push({a,b,rank:range*recency});
 }
 if(!pairs.length)return null;
 const best=pairs.sort((x,y)=>y.rank-x.rank)[0],a=best.a,b=best.b;
 const low=a.price<b.price?a:b,high=a.price>b.price?a:b,up=a.type==='L'&&b.type==='H';
 const range=high.price-low.price,levels={};
 [0,.236,.382,.5,.618,.786,1].forEach(r=>{levels[r]=up?high.price-range*r:low.price+range*r});
 return{a,b,up,low:low.price,high:high.price,levels};
}

;

/* ===== RUNTIME BLOCK 28 ===== */
// Radar Técnico G2 — Phase 10R / v4.49.0
// Technical analysis + G2 hydration/adapters extraction.
// Mechanical ownership move only: analyzeSeries formulas and G2 adapter semantics are unchanged.
// computeTradePlan and quickBacktest remain protected in the single inline bridge.

function analyzeSeries(data,key){
 const cl=data.map(x=>x.close),e20=ema(cl,20),e50=ema(cl,50),e200=ema(cl,200),m=macd(cl),A=atr(data,14);
 const strength=key==='micro'?3:key==='short'?4:key==='medium'?5:6;
 const sw=confirmedSwings(data,strength),structure=structureState(sw),i=data.length-1,c=cl[i];
 let score=0;if(structure==='alcista')score+=2;if(structure==='bajista')score-=2;
 if(c>e200[i])score++;else score--;
 if(e20[i]>e50[i]&&e50[i]>e200[i])score++;else if(e20[i]<e50[i]&&e50[i]<e200[i])score--;
 if(m.macd[i]>m.signal[i]&&m.macd[i]>0)score++;else if(m.macd[i]<m.signal[i]&&m.macd[i]<0)score--;
 const slope=e20[i]-e20[Math.max(0,i-8)];if(slope>0)score++;else if(slope<0)score--;
 const trend=score>=3?'alcista':score<=-3?'bajista':structure==='alcista'?'corrección alcista':structure==='bajista'?'rebote bajista':'neutral / transición';
 const br=latestBreak(data,sw,structure,A),fib=fibFromSwings(sw),hs=sw.filter(x=>x.type==='H'),ls=sw.filter(x=>x.type==='L');
 const emaState=e20[i]>e50[i]&&e50[i]>e200[i]?'Alineación alcista':e20[i]<e50[i]&&e50[i]<e200[i]?'Alineación bajista':'Mixtas';
 const macdState=m.macd[i]>m.signal[i]?(m.macd[i]>0?'Alcista sobre cero':'Cruce alcista bajo cero'):(m.macd[i]<0?'Bajista bajo cero':'Cruce bajista sobre cero');
 const vols=data.map(x=>+x.volume||0),n=Math.min(20,vols.length),v20=n?vols.slice(-n).reduce((s,v)=>s+v,0)/n:0;
 const volumeRatio=v20>0?vols.at(-1)/v20:NaN;
 return{key,data,cl,e20,e50,e200,m,A,sw,structure,score,trend,breakType:br,fib,lastH:hs.at(-1),lastL:ls.at(-1),emaState,macdState,c,volumeRatio};
}

async function analyzeSeriesRuntime(data,key,context={}){
 const features=await g2RuntimeFeatures();
 if(!features?.technical)return analyzeSeries(data,key);
 try{
  const tf=context.timeframe||state.tfs?.[key]?.interval||key;
  const instrumentId=`legacy:g1:${String(context.symbol||state.symbol||'unknown').toUpperCase()}`;
  const r=await fetch('/api/g2/technical/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instrumentId,timeframe:tf,profile:key,sourceId:context.source||state.source||'G1 UI',bars:data,legacy:true,scoreWeights:state.config?.scoreWeights||null,scoreModelVersion:Number(state.config?.scoreModelVersion)||1,includeStandalonePlan:true})});
  if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`G2 Technical ${r.status}`)}
  const a=await r.json();
  if(!a||!Array.isArray(a.e20)||a.e20.length!==data.length||!Array.isArray(a.sw)||!Number.isFinite(Number(a.c)))throw new Error('Respuesta G2 Technical incompatible');
  if(a?.g2?.tradePlanStandalone)a.g2.tradePlanStandaloneSignature=g2TradePlanSignature(a,true);
  return a;
 }catch(e){
  console.warn('G2 Technical -> legacy fallback',context.symbol||state.symbol||'',key,e);
  return analyzeSeries(data,key);
 }
}
function g2HigherTimeframeSignals(key){
 const order=['micro','short','medium','macro'],i=order.indexOf(key);if(i<0)return[];
 return order.slice(i+1).filter(k=>state.analyses?.[k]&&Number.isFinite(Number(state.analyses[k].score))).map(k=>({profile:k,directionalScore:Number(state.analyses[k].score)}));
}
function g2TradePlanSignature(a,standalone=false){
 const w=currentScoreWeights(),weights=Object.keys(SCORE_BASE_MAX).map(k=>[k,Number(w[k]||0)]),higher=standalone?[]:g2HigherTimeframeSignals(a?.key);
 return JSON.stringify({standalone:!!standalone,weights,higher,model:Number(state.config?.scoreModelVersion)||1});
}
async function hydrateG2TradePlan(a,standalone=false,context={}){
 if(!a||!Array.isArray(a.data)||a.data.length<30)return null;
 const features=await g2RuntimeFeatures();if(!features?.technicalPlan)return null;
 const signature=g2TradePlanSignature(a,standalone);
 try{
  const tf=context.timeframe||state.tfs?.[a.key]?.interval||a.key;
  const instrumentId=`legacy:g1:${String(context.symbol||state.symbol||'unknown').toUpperCase()}`;
  const body={instrumentId,timeframe:tf,profile:a.key,sourceId:context.source||state.source||'G1 UI',bars:a.data,legacy:true,standalone:!!standalone,higherTimeframes:standalone?[]:g2HigherTimeframeSignals(a.key),scoreWeights:state.config?.scoreWeights||null,scoreModelVersion:Number(state.config?.scoreModelVersion)||1};
  const r=await fetch('/api/g2/technical/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`G2 Technical Plan ${r.status}`)}
  const plan=await r.json();if(!plan||!plan.direction||!plan.status||!Number.isFinite(Number(plan.score)))throw new Error('Respuesta G2 Trade Plan incompatible');
  a.g2=a.g2||{};
  if(standalone){a.g2.tradePlanStandalone=plan;a.g2.tradePlanStandaloneSignature=signature}else{a.g2.tradePlan=plan;a.g2.tradePlanSignature=signature}
  return plan;
 }catch(e){console.warn('G2 Technical Plan -> legacy fallback',context.symbol||state.symbol||'',a.key,e);return null}
}
async function hydrateG2TradePlans(context={}){
 const features=await g2RuntimeFeatures();if(!features?.technicalPlan)return;
 await Promise.all(Object.values(state.analyses||{}).filter(a=>a?.data?.length>=30).map(a=>hydrateG2TradePlan(a,false,context)));
}
function g2CachedTradePlan(a,standalone=false){
 const plan=standalone?a?.g2?.tradePlanStandalone:a?.g2?.tradePlan;
 const sig=standalone?a?.g2?.tradePlanStandaloneSignature:a?.g2?.tradePlanSignature;
 return plan&&sig===g2TradePlanSignature(a,standalone)?plan:null;
}

;

/* ===== RUNTIME BLOCK 29 ===== */
/* Radar Técnico G2 — Phase 10S / v4.50.0
   Mechanical extraction of trade-plan support helpers.
   No financial formulas or scoring semantics changed. */

function directionSign(a){return !a?0:(a.score>=2?1:a.score<=-2?-1:0)}
function srZones(a){
 const g2=g2CachedTradePlan(a,false)?.zones;if(g2&&(g2.support||g2.resistance))return g2;
 const av=a.A?.at(-1)||a.c*.01,half=Math.max(av*.28,a.c*.0015);
 const lows=a.sw.filter(x=>x.type==='L'),highs=a.sw.filter(x=>x.type==='H');
 const s=[...lows].reverse().find(x=>x.price<=a.c)||lows.at(-1)||a.lastL;
 const r=[...highs].reverse().find(x=>x.price>=a.c)||highs.at(-1)||a.lastH;
 return{
  support:s?{mid:s.price,low:s.price-half,high:s.price+half}:null,
  resistance:r?{mid:r.price,low:r.price-half,high:r.price+half}:null
 };
}
function mtfPoints(dir,key){
 const order=['micro','short','medium','macro'],i=order.indexOf(key);
 const higher=order.slice(i+1).filter(k=>state.analyses[k]);
 if(!higher.length)return 10;
 let hit=0,total=0;const w={short:4,medium:7,macro:9};
 for(const k of higher){const ww=w[k]||3,s=directionSign(state.analyses[k]);total+=ww;if(s===dir)hit+=ww;else if(s===0)hit+=ww*.35}
 return total?20*hit/total:10;
}
function componentScores(a,dir,rr1,standalone=false){
 const i=a.data.length-1;let structure=0,emas=0,macd=0,fib=0,volume=0;
 if((dir===1&&a.structure==='alcista')||(dir===-1&&a.structure==='bajista'))structure=25;
 else if(a.structure==='transición')structure=10;else structure=4;
 if(dir===1){
  if(a.e20[i]>a.e50[i]&&a.e50[i]>a.e200[i])emas=15;
  else if(a.c>a.e200[i]&&a.e20[i]>a.e50[i])emas=11;
  else if(a.c>a.e200[i])emas=6;
  if(a.m.macd[i]>a.m.signal[i]&&a.m.macd[i]>0)macd=10;else if(a.m.macd[i]>a.m.signal[i])macd=6;
 }else{
  if(a.e20[i]<a.e50[i]&&a.e50[i]<a.e200[i])emas=15;
  else if(a.c<a.e200[i]&&a.e20[i]<a.e50[i])emas=11;
  else if(a.c<a.e200[i])emas=6;
  if(a.m.macd[i]<a.m.signal[i]&&a.m.macd[i]<0)macd=10;else if(a.m.macd[i]<a.m.signal[i])macd=6;
 }
 if(a.fib){
  const lo=Math.min(a.fib.levels[.382],a.fib.levels[.618]),hi=Math.max(a.fib.levels[.382],a.fib.levels[.618]),av=a.A.at(-1)||0;
  if(a.c>=lo&&a.c<=hi)fib=15;
  else{const d=a.c<lo?lo-a.c:a.c-hi;fib=d<=av?10:5}
 }
 if(Number.isFinite(a.volumeRatio))volume=a.volumeRatio>=1.35?10:a.volumeRatio>=1.05?7:a.volumeRatio>=.75?4:2;else volume=4;
 const mtf=standalone?10:mtfPoints(dir,a.key),rr=Number.isFinite(rr1)?(rr1>=2?5:rr1>=1.5?3:rr1>=1.2?1:0):0;
 return{structure,mtf,fib,emas,macd,volume,rr};
}

const SCORE_BASE_MAX={structure:25,mtf:20,fib:15,emas:15,macd:10,volume:10,rr:5};
function currentScoreWeights(){const w=state.config?.scoreWeights;if(!w)return{...SCORE_BASE_MAX};const out={};let total=0;for(const k of Object.keys(SCORE_BASE_MAX)){out[k]=Number(w[k])>0?Number(w[k]):SCORE_BASE_MAX[k];total+=out[k]}if(!(total>0))return{...SCORE_BASE_MAX};const scale=100/total;for(const k of Object.keys(out))out[k]*=scale;return out}
function weightedComponentScore(comp,weights=currentScoreWeights()){let total=0;for(const k of Object.keys(SCORE_BASE_MAX)){const max=SCORE_BASE_MAX[k],ratio=max>0?decisionClamp(Number(comp?.[k]||0)/max,0,1):0;total+=ratio*Number(weights[k]||0)}return total}
function scoreModelLabel(){return `M${Number(state.config?.scoreModelVersion)||1}`}

;

/* ===== RUNTIME BLOCK 30 ===== */
/* Radar Técnico G2 — Phase 10T / v4.51.0
   Mechanical extraction of shared technical utility/presentation helpers.
   No trade-plan, backtest, financial formulas, thresholds or scoring semantics changed. */

function fmt(n){if(!Number.isFinite(n))return'—';const a=Math.abs(n),d=a>=1000?2:a>=10?3:a>=1?4:6;return new Intl.NumberFormat('es-AR',{maximumFractionDigits:d}).format(n)}

function pct(n){return(n>=0?'+':'')+n.toFixed(2)+'%'}

function fmtDateTimeUnix(sec){
 const d=new Date(sec*1000);
 return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'}).format(d);
}

function fmtDateTimeNow(){
 const d=new Date();
 return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'}).format(d);
}

function freshnessFor(lastCandleSec, tf){
 const ageSec=Math.max(0, Date.now()/1000-lastCandleSec);
 const expected=intervalSeconds(tf.interval);
 const ratio=ageSec/expected;
 if(ratio<=1.5) return {label:'ACTUAL',cls:'ok'};
 if(ratio<=4) return {label:'DEMORADO',cls:'warn'};
 return {label:'DESACTUALIZADO',cls:'bad'};
}

function seededRand(seed){let x=seed>>>0;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}}

function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

function demoData(seedText,step,count=700){
 const r=seededRand(hash(seedText));let p=50+r()*200,out=[],t=Math.floor(Date.now()/1000)-count*step,dr=(r()-.45)*.001;
 for(let i=0;i<count;i++,t+=step){if(i%100===0)dr=(r()-.48)*.0016;const vol=.005+r()*.012,ch=dr+(r()-.5)*vol,o=p,c=Math.max(.01,p*(1+ch)),w=Math.abs((r()-.5)*vol*.8);
 out.push({time:t,open:o,high:Math.max(o,c)*(1+w),low:Math.min(o,c)*(1-w),close:c,volume:1000+r()*8000});p=c}return out;
}

function cls(t){const x=String(t||'').toLowerCase();return x.includes('alcista')?'green':x.includes('bajista')?'red':(x.includes('lateral')||x.includes('neutral')||x.includes('transición')||x.includes('transicion'))?'amber':'amber'}

function describe(a,tf){return`${tf}: estructura ${a.structure}; precio ${a.c>a.e200.at(-1)?'sobre':'debajo de'} EMA200; ${a.emaState.toLowerCase()}; MACD ${a.macdState.toLowerCase()}. Resultado: ${a.trend}. ${a.breakType}.`}

function bias(){
 const a=state.analyses;
 const parts=[['macro',.40],['medium',.35],['short',.25],['micro',.10]].filter(([k])=>a[k]);
 if(!parts.length)return['Sin análisis','amber','No hay suficientes datos reales para calcular un sesgo.'];
 const sw=parts.reduce((s,[k,w])=>s+a[k].score*w,0), ww=parts.reduce((s,[k,w])=>s+w,0),w=sw/ww;
 if(w>=2.6)return['Sesgo alcista','green','La confluencia favorece continuidad alcista. Mejor contexto: retroceso ordenado o ruptura confirmada.'];
 if(w<=-2.6)return['Sesgo bajista','red','La confluencia favorece presión bajista. Conviene exigir confirmación estructural antes de anticipar un piso.'];
 return['Esperar confirmación','amber','Las temporalidades disponibles no están suficientemente alineadas.'];
}

;

/* ===== RUNTIME BLOCK 31 ===== */
/* Radar Técnico G2 — Phase 10U / v4.52.0
   Mechanical extraction of computeTradePlan from the final inline technical bridge.
   Financial semantics intentionally unchanged. */

function computeTradePlan(a,standalone=false){
 const cached=g2CachedTradePlan(a,standalone);if(cached)return cached;
 if(!a||!Number.isFinite(a.c))return null;
 const dir=directionSign(a),why=[],wait=[];
 if(dir===0){
  if(a.structure==='transición'||a.structure==='indefinida')why.push('La estructura no tiene una secuencia HH/HL o LH/LL suficientemente definida.');
  if(a.emaState==='Mixtas')why.push('Las EMA 20/50/200 están mezcladas y no confirman una tendencia limpia.');
  if(a.macdState.includes('Cruce'))why.push('El MACD muestra un cruce, pero todavía no confirma momentum en el lado correcto de cero.');
  return{direction:'SIN SETUP',status:'SIN SETUP',score:Math.max(0,Math.min(55,50+a.score*6)),components:{},
   why:why.length?why:['No existe confluencia direccional suficiente.'],
   action:'Esperar una estructura definida y que EMAs + MACD comiencen a confirmar la misma dirección.',
   invalidation:'No hay una idea operativa activa para invalidar.'};
 }
 const bull=dir===1,z=srZones(a),av=a.A?.at(-1)||a.c*.01,f=a.fib;
 const structural=bull?z.support:z.resistance;
 const structureAligned=(bull&&a.structure==='alcista')||(!bull&&a.structure==='bajista');
 const fibDirectional=!!(f&&(bull?f.up:!f.up));
 let e1,e2,zoneEvidence=false;
 if(f&&fibDirectional){e1=Math.min(f.levels[.5],f.levels[.618]);e2=Math.max(f.levels[.5],f.levels[.618]);zoneEvidence=true;
  if(structural){const x1=Math.max(e1,structural.low),x2=Math.min(e2,structural.high);if(x1<=x2){e1=x1;e2=x2;why.push('La zona Fibonacci 0,50–0,618 coincide con una zona estructural relevante.')}else why.push('Fibonacci y soporte/resistencia no coinciden; requiere confirmación adicional.')}}
 else if(structural){e1=structural.low;e2=structural.high;zoneEvidence=true;if(f&&!fibDirectional)why.push('El impulso Fibonacci apunta contra la dirección propuesta; no se usa para fabricar entrada.');else why.push('Sin Fibonacci direccional utilizable; se usa sólo estructura confirmada.');}
 else{e1=a.c-av*.25;e2=a.c+av*.25;why.push('Sin zona estructural/Fibonacci defendible: el rango es diagnóstico y no habilita entrada.');}

 const entry=(e1+e2)/2,prev=a.data.at(-2),trigger=bull?Math.max(e2,a.e20.at(-1),prev?.high||e2):Math.min(e1,a.e20.at(-1),prev?.low||e1);
 let stop=bull?(structural?.low??a.lastL?.price??(entry-av))-av*.35:(structural?.high??a.lastH?.price??(entry+av))+av*.35;
 const risk=Math.abs(entry-stop);
 let tp1,tp2;
 if(bull){
  const swing=a.lastH?.price;
  tp1=Number.isFinite(swing)&&swing>entry?swing:entry+risk*2;
  const ext=f?f.high+(f.high-f.low)*.272:entry+risk*3;
  tp2=Math.max(tp1+risk*.5,ext);
 }else{
  const swing=a.lastL?.price;
  tp1=Number.isFinite(swing)&&swing<entry?swing:entry-risk*2;
  const ext=f?f.low-(f.high-f.low)*.272:entry-risk*3;
  tp2=Math.min(tp1-risk*.5,ext);
 }
 const rr1=risk>0?Math.abs(tp1-entry)/risk:NaN,rr2=risk>0?Math.abs(tp2-entry)/risk:NaN;
 const riskPct=entry>0?risk/entry*100:NaN,pct1=entry>0?Math.abs(tp1-entry)/entry*100:NaN;
 const comp=componentScores(a,dir,rr1,standalone);
 let score=Math.round(weightedComponentScore(comp));
 if(rr1<1.5)score=Math.min(score,59);
 if(!structureAligned||!zoneEvidence||(f&&!fibDirectional))score=Math.min(score,64);

 if((bull&&a.structure==='alcista')||(!bull&&a.structure==='bajista'))why.push(`La estructura ${a.structure} acompaña la dirección ${bull?'LONG':'SHORT'}.`);
 else why.push(`La estructura está ${a.structure}; la dirección existe pero todavía no es ideal.`);
 if(comp.mtf>=14)why.push('Las temporalidades superiores acompañan el sesgo.');
 else if(!standalone)why.push('Las temporalidades superiores no están completamente alineadas.');
 if(comp.emas>=11)why.push('Las medias móviles confirman el sentido de la operación.');
 else why.push('Las medias todavía no tienen alineación suficiente.');
 if(comp.macd>=6)why.push('El MACD acompaña el momentum.');
 else why.push('El MACD todavía no confirma con fuerza.');
 if(comp.volume>=7)why.push('El volumen actual está por encima de su referencia reciente.');
 else why.push('El volumen no aporta una confirmación fuerte.');
 why.push(`La relación riesgo/beneficio estimada a TP1 es ${Number.isFinite(rr1)?'1:'+rr1.toFixed(2):'no calculable'}.`);

 const inZone=a.c>=e1-av*.10&&a.c<=e2+av*.10;
 const triggerMet=bull?a.c>=trigger:a.c<=trigger;
 const tooExtended=bull?a.c>e2+av*.75:a.c<e1-av*.75;
 let status;
 if(rr1<1.5){status='SIN SETUP';wait.push(`El R:R a TP1 es insuficiente (${rr1.toFixed(2)}). Se exige al menos 1:1,50 para habilitar entrada.`)}
 else if(!structureAligned){status='ESPERAR CONFIRMACIÓN';wait.push(`La estructura ${a.structure} todavía no confirma ${bull?'LONG':'SHORT'}. No entrar.`)}
 else if(!zoneEvidence){status='ESPERAR CONFIRMACIÓN';wait.push('No hay zona defendible por estructura/Fibonacci. Esperar nueva formación técnica.')}
 else if(f&&!fibDirectional){status='ESPERAR CONFIRMACIÓN';wait.push('El impulso Fibonacci contradice la dirección. Esperar nuevo swing confirmado; no entrar.')}
 else if(tooExtended){status='ESPERAR CONFIRMACIÓN';score=Math.min(score,59);wait.push(`Precio extendido respecto de ${fmt(e1)}–${fmt(e2)}. No perseguir precio; esperar retroceso/rebote y nuevo trigger.`)}
 else if(score>=75&&inZone&&triggerMet){status='OPERABLE';wait.push(`Entrada confirmada: precio en zona y trigger ${bull?'alcista':'bajista'} validado, con estructura y R:R correctos.`)}
 else{status='ESPERAR CONFIRMACIÓN';if(!inZone)wait.push(`Esperar que el precio entre en la zona ${fmt(e1)}–${fmt(e2)}.`);if(!triggerMet)wait.push(`Luego exigir cierre ${bull?'por encima':'por debajo'} de ${fmt(trigger)} como trigger.`);if(score<75)wait.push(`La confluencia es ${score}/100; se exige 75/100 junto con los gates absolutos.`)}
 const invalidation=bull?`La idea LONG queda invalidada con cierre por debajo de ${fmt(stop)}.`:`La idea SHORT queda invalidada con cierre por encima de ${fmt(stop)}.`;
 return{direction:bull?'LONG':'SHORT',status,score,components:comp,entryLow:e1,entryHigh:e2,entry,trigger,stop,tp1,tp2,rr1,rr2,riskPct,pct1,
  why,action:wait.join(' '),invalidation};
}

;

/* ===== RUNTIME BLOCK 32 ===== */
/* Radar Técnico G2 — Phase 10V / v4.53.0
   Mechanical extraction of quickBacktest from the final inline technical bridge.
   Financial/backtest semantics intentionally unchanged. */

function quickBacktest(a){
 const data=a.data;if(!data||data.length<260)return{count:0,wins:0,losses:0,rate:NaN};
 let count=0,wins=0,losses=0;
 const start=Math.max(220,data.length-260);
 for(let i=start;i<data.length-12;i+=5){
  const snap=analyzeSeries(data.slice(0,i+1),a.key);
  const p=computeTradePlan(snap,true);
  if(!p||p.direction==='SIN SETUP'||p.score<68||!Number.isFinite(p.entry)||!Number.isFinite(p.stop)||!Number.isFinite(p.tp1))continue;
  const bull=p.direction==='LONG';let entered=false,outcome=0;
  for(let j=i+1;j<Math.min(data.length,i+13);j++){
   const b=data[j];
   if(!entered && b.low<=p.entryHigh && b.high>=p.entryLow)entered=true;
   if(!entered)continue;
   const hitSL=b.low<=p.stop,hitTP=b.high>=p.tp1;
   const hitSLs=b.high>=p.stop,hitTPs=b.low<=p.tp1;
   if(bull){
    if(hitSL&&hitTP){outcome=-1;break}
    if(hitSL){outcome=-1;break}
    if(hitTP){outcome=1;break}
   }else{
    if(hitSLs&&hitTPs){outcome=-1;break}
    if(hitSLs){outcome=-1;break}
    if(hitTPs){outcome=1;break}
   }
  }
  if(entered&&outcome){count++;if(outcome===1)wins++;else losses++}
 }
 return{count,wins,losses,rate:count?wins/count*100:NaN};
}

;
