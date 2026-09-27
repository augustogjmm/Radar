/* Radar Tecnico G2 - Data quality, stability and application bootstrap
   Extracted from certified runtime; order preserved. */

/* ===== RUNTIME BLOCK 43 ===== */
/* Radar Técnico G2 · Phase 9V · Data Quality / Stability / Decision runtime owner */
const STABILITY_VERSION='v93';
const stabilityState={
 startedAt:Date.now(),lastSelfTest:0,selfTest:null,runtimeErrors:[],
 marketStarted:new Map(),dashboardStarted:0,marketBoardStarted:0,watchdogRecoveries:0
};

function recordRuntimeError(kind,error){
 const msg=String(error?.message||error||'Error desconocido');
 stabilityState.runtimeErrors.push({time:Date.now(),kind,msg});
 stabilityState.runtimeErrors=stabilityState.runtimeErrors.slice(-20);
 renderSystemHealth();
}
window.addEventListener('error',e=>recordRuntimeError('JS',e?.error||e?.message));
window.addEventListener('unhandledrejection',e=>recordRuntimeError('PROMISE',e?.reason||e));

function setSystemChip(state,label){
 const e=$('healthSystem');if(!e)return;
 e.className=`health-chip system-chip ${state}`;
 const s=e.querySelector('span');if(s)s.textContent=label;
}
function renderSystemHealth(){
 const r=stabilityState.selfTest;
 if(!r){setSystemChip('testing','iniciando');return}
 if(r.bad>0)setSystemChip('bad',`${r.bad} error${r.bad===1?'':'es'}`);
 else if(r.warn>0)setSystemChip('warn',`${r.warn} aviso${r.warn===1?'':'s'}`);
 else setSystemChip('ok','estable');
}
function markMarketLoading(id){
 marketCardLoads.set(id,true);
 stabilityState.marketStarted.set(id,Date.now());
}
function finishMarketLoading(id){
 marketCardLoads.delete(id);
 stabilityState.marketStarted.delete(id);
}
function finaliseStuckMarket(id){
 const asset=MARKET_ASSETS.find(a=>a.id===id);
 finishMarketLoading(id);
 if(asset&&!marketEntryValid(marketBoardData.get(id))){
   const lkg=dataLkg?.market?.[id];
   if(lkg&&Number.isFinite(Number(lkg.last))){
     marketBoardData.set(id,{...lkg,isLkg:true,error:null});
   }else{
     marketBoardData.set(id,{error:'La fuente no respondió dentro del tiempo máximo. Reintentá.',failedAt:Date.now(),timeout:true});
   }
 }
 stabilityState.watchdogRecoveries++;
}
function dashboardHardStop(reason='Tiempo máximo de carga alcanzado'){
 try{
   reconcileAllDashboardSeries();
   ['risk','mep','ccl','inflation'].forEach(k=>dashCardLoading(k,false));
   ['Core','Hist','Risk'].forEach(k=>{
     const el=$('dashStep'+k);
     if(el&&el.classList.contains('loading'))setDashStep(k,'warn','Pendiente');
   });
   if($('dashLoadingTitle'))$('dashLoadingTitle').textContent='Panel operativo con fuentes pendientes';
   if($('dashLoadingSub'))$('dashLoadingSub').textContent=reason+'. Los datos disponibles siguen siendo utilizables.';
   setTimeout(()=>$('dashLoadingPanel')?.classList.remove('active'),2500);
   if($('dashRefreshBtn')){$('dashRefreshBtn').disabled=false;$('dashRefreshBtn').textContent='Actualizar'}
   renderDashboard();
   stabilityState.watchdogRecoveries++;
 }catch(e){recordRuntimeError('WATCHDOG DASH',e)}
}
function stabilityWatchdog(){
 const now=Date.now();
 for(const [id,t] of [...stabilityState.marketStarted.entries()]){
   if(now-t>75000)finaliseStuckMarket(id);
 }
 if(stabilityState.marketStarted.size===0&&marketBoardLoading&&stabilityState.marketBoardStarted&&now-stabilityState.marketBoardStarted>90000){
   marketBoardLoading=false;
   marketCardLoads.clear();
   stabilityState.marketStarted.clear();
   renderMarketBoard();
   updateMarketBoardStatus('Carga parcial finalizada');
   stabilityState.watchdogRecoveries++;
 }
 if(stabilityState.dashboardStarted&&$('dashLoadingPanel')?.classList.contains('active')&&now-stabilityState.dashboardStarted>50000){
   dashboardHardStop();
   stabilityState.dashboardStarted=0;
 }
 try{
   reconcileAllDashboardSeries();
   renderDashboard();
 }catch(e){recordRuntimeError('WATCHDOG',e)}
}

function selfTestResult(name,state,detail){return{name,state,detail:String(detail||'')}}
async function runStartupSelfTest(show=true){
 const started=Date.now(),tests=[];
 setSystemChip('testing','probando…');

 const essential=['dashboardView','marketCardGrid','watchBody','scanBody','rfBody','dataHealthPanel'];
 const missing=essential.filter(id=>!$(id));
 tests.push(selfTestResult('Interfaz',missing.length?'bad':'ok',missing.length?`Faltan: ${missing.join(', ')}`:'Componentes principales presentes'));

 try{
   const h=await fetchJsonTimeout('/api/health',6000);
   tests.push(selfTestResult('Servidor',h?.ok?'ok':'bad',h?.ok?`${h.version||'web'} · ${h.runtime||'runtime web'} · ${h.time||'activo'}`:'Respuesta incompleta'));
 }catch(e){
   tests.push(selfTestResult('Servidor','bad',e.message||e));
 }

 const ids=MARKET_ASSETS.map(a=>a.id),dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
 tests.push(selfTestResult('Mercados',MARKET_ASSETS.length&&dup.length===0?'ok':'bad',
   dup.length?`IDs duplicados: ${[...new Set(dup)].join(', ')}`:`${MARKET_ASSETS.length} activos configurados`));

 const has2y=MARKET_ASSETS.some(a=>a.id==='ust2y'||/Treasury 2Y/i.test(a.name||''));
 tests.push(selfTestResult('Treasury 2Y',has2y?'bad':'ok',has2y?'Sigue configurado':'Retirado correctamente'));

 tests.push(selfTestResult('Data Manager',
   typeof commitMarketEntry==='function'&&typeof reconcileAllDashboardSeries==='function'?'ok':'bad',
   'Fuente única + reconciliación disponibles'));

 tests.push(selfTestResult('Configuración',Array.isArray(state.config?.watchlist)?'ok':'warn',
   Array.isArray(state.config?.watchlist)?`${state.config.watchlist.length} activos en watchlist`:'Configuración todavía no disponible'));

 try{
   const sj=await fetchJsonTimeout('/api/signals',5000);
   tests.push(selfTestResult('Historial',Array.isArray(sj?.signals)?'ok':'warn',Array.isArray(sj?.signals)?`${sj.signals.length} eventos persistidos`:'Respuesta incompleta'));
   tests.push(selfTestResult('Centro de Decisión',
     typeof renderDecisionCenter==='function'&&!!$('decisionCenter')&&!!$('decisionPortfolioList')?'ok':'bad',
     'Ranking único + cartera + visión de mercado'));
   tests.push(selfTestResult('Cartera 360',
     typeof renderPortfolio360==='function'&&typeof openQuickPortfolio==='function'&&!!$('portfolioBaseCurrency')?'ok':'bad',
     'Consolidación + position sizing + alta rápida'));
   tests.push(selfTestResult('Portfolio Pro',
     typeof openReducePosition==='function'&&typeof diversificationAnalysis==='function'&&typeof ensureTransactionHistory==='function'?'ok':'bad',
     'Movimientos + reducción + diversificación'));
 }catch(e){
   tests.push(selfTestResult('Historial','warn','Archivo no disponible; queda fallback local.'));
 }

 let inconsistent=0,known=0;
 for(const a of MARKET_ASSETS){
   const e=marketBoardData.get(a.id);
   if(marketEntryValid(e)){known++;if(!Number.isFinite(Number(e.last)))inconsistent++}
 }
 tests.push(selfTestResult('Consistencia',inconsistent?'bad':'ok',
   known?`${known} mercados conocidos · ${inconsistent} inconsistencias`:'Sin mercados cargados todavía'));

 const stuck=[...stabilityState.marketStarted.entries()].filter(([,t])=>Date.now()-t>75000);
 tests.push(selfTestResult('Bloqueos',stuck.length?'bad':'ok',
   stuck.length?`${stuck.length} cargas excedieron 75s`:`Sin cargas eternas · recuperaciones ${stabilityState.watchdogRecoveries}`));

 const recent=stabilityState.runtimeErrors.filter(x=>Date.now()-x.time<10*60*1000);
 tests.push(selfTestResult('JavaScript',recent.length?'warn':'ok',
   recent.length?`${recent.length} error(es) recientes`:'Sin errores runtime registrados'));

 const q=runDataValidation();
 tests.push(selfTestResult('Calidad de datos',q.score>=90?'ok':q.score>=70?'warn':'bad',`${q.score}/100`));

 const ok=tests.filter(x=>x.state==='ok').length,warn=tests.filter(x=>x.state==='warn').length,bad=tests.filter(x=>x.state==='bad').length;
 const result={tests,ok,warn,bad,duration:Date.now()-started,time:Date.now()};
 stabilityState.selfTest=result;stabilityState.lastSelfTest=Date.now();

 if($('selfTestSummary'))$('selfTestSummary').textContent=`${ok} OK · ${warn} avisos · ${bad} errores · ${result.duration} ms`;
 if($('selfTestWhen'))$('selfTestWhen').textContent='· '+new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
 if($('selfTestGrid'))$('selfTestGrid').innerHTML=tests.map(t=>`<div class="selftest-item ${t.state}"><b>${t.state==='ok'?'✓':t.state==='warn'?'⚠':'✕'} ${escapeHtml(t.name)}</b>${escapeHtml(t.detail)}</div>`).join('');
 if($('runtimeErrorList')){
   $('runtimeErrorList').innerHTML=recent.length?`<div class="runtime-error">${recent.slice(-6).map(x=>`${new Date(x.time).toLocaleTimeString('es-AR')} ${x.kind}: ${x.msg}`).join('\n')}</div>`:'';
 }
 if(show){$('dataDiagnostics')?.classList.add('active');$('selfTestBox')?.classList.add('active')}
 renderSystemHealth();
 return result;
}

const DATA_LKG_KEY='radar_lkg_v78';
const DATA_LKG_FALLBACK='radar_lkg_v69';
const sourceHealth={dollar:{},risk:{},yahoo:{},byma:{},rf:{},indices:{},crypto:{},config:{}};
let dataLkg={market:{},macro:{},savedAt:0};
let dataValidation={score:100,issues:[],checkedAt:0};

function healthMark(name,state,label='',error='',dataAt=0){
 const h=sourceHealth[name]||(sourceHealth[name]={});h.state=state;h.label=label;h.error=String(error||'');h.lastTry=Date.now();if(state==='ok')h.lastOk=Date.now();if(Number.isFinite(Number(dataAt))&&Number(dataAt)>0)h.lastDataAt=Number(dataAt);renderDataHealth();
}
function healthBusy(n,l='consultando…'){healthMark(n,'busy',l)}
function healthOk(n,l='OK',dataAt=0){healthMark(n,'ok',l,'',dataAt)}
function healthStale(n,l='LKG',e='',dataAt=0){healthMark(n,'stale',l,e,dataAt)}
function healthError(n,e,l='error',dataAt=0){healthMark(n,'error',l,e,dataAt)}
function healthAge(ts){if(!ts)return'—';const m=Math.max(0,Math.round((Date.now()-ts)/60000));return m<1?'ahora':m<60?`${m}m`:m<1440?`${Math.round(m/60)}h`:`${Math.round(m/1440)}d`}
function healthDataTimestamp(x){if(!x)return 0;const direct=Number(x.lastTime)*1000||Number(x.loadedAt)||Number(x.receivedAt)||Number(x.fetchedAt);if(Number.isFinite(direct)&&direct>0)return direct;for(const k of ['asOf','verifiedAt','sourceTimestamp','date','period']){const t=Date.parse(String(x[k]||''));if(Number.isFinite(t))return t}return 0}
function renderDataHealth(){
 const map={dollar:'healthDollar',risk:'healthRisk',yahoo:'healthYahoo',byma:'healthByma',rf:'healthRf',indices:'healthIndices',crypto:'healthCrypto',config:'healthConfig'};
 for(const [k,id] of Object.entries(map)){const h=sourceHealth[k]||{},el=$(id);if(!el)continue;let cls=h.state||'unknown';if(h.lastOk&&Date.now()-h.lastOk>1800000&&cls==='ok')cls='stale';el.className=`health-chip ${cls}`;const shownTs=h.lastDataAt||h.lastOk||0;const sp=el.querySelector('span');if(sp)sp.textContent=shownTs?`${h.label||'OK'} · ${healthAge(shownTs)}`:(h.label||'—');el.title=[h.error,h.lastDataAt?`Dato: ${new Date(h.lastDataAt).toLocaleString('es-AR')}`:''].filter(Boolean).join(' · ')}
 const q=$('healthQuality');if(q){const sc=dataValidation.score,cls=sc>=90?'ok':sc>=70?'busy':'error';q.className=`health-chip ${cls}`;const sp=q.querySelector('span');if(sp)sp.textContent=`${sc}/100`}
}
function loadDataLkg(){
 try{const raw=localStorage.getItem(DATA_LKG_KEY)||localStorage.getItem(DATA_LKG_FALLBACK)||'{}';const x=JSON.parse(raw);dataLkg={market:x.market||{},macro:x.macro||{},savedAt:x.savedAt||0}}catch{}
 for(const a of MARKET_ASSETS){if(!marketEntryValid(marketBoardData.get(a.id))){const x=dataLkg.market[a.id];if(x&&Number.isFinite(Number(x.last)))marketBoardData.set(a.id,{...x,isLkg:true})}}
 const m=dataLkg.macro||{};
 if(!dashValid(dashboardData.risk?.value)&&dashValid(m.risk?.value))dashboardData.risk={...dashboardData.risk,...m.risk,isLkg:true};
 for(const k of ['mep','ccl','official'])if(!dashValid(dashboardData.fx?.[k]?.venta)&&dashValid(m[k]?.venta))dashboardData.fx[k]={...dashboardData.fx[k],...m[k],isLkg:true};
 if(!dashValid(dashboardData.inflation?.value)&&dashValid(m.inflation?.value))dashboardData.inflation={...dashboardData.inflation,...m.inflation,isLkg:true};
}
function saveDataLkg(){try{dataLkg.savedAt=Date.now();localStorage.setItem(DATA_LKG_KEY,JSON.stringify(dataLkg))}catch{}}
function lkgMarket(asset,entry){if(asset&&entry&&Number.isFinite(Number(entry.last))){dataLkg.market[asset.id]={...entry,isLkg:false,lkgSavedAt:Date.now()};saveDataLkg()}}
function lkgMacro(){
 if(dashValid(dashboardData.risk?.value))dataLkg.macro.risk={...dashboardData.risk,isLkg:false,lkgSavedAt:Date.now()};
 for(const k of ['mep','ccl','official'])if(dashValid(dashboardData.fx?.[k]?.venta))dataLkg.macro[k]={...dashboardData.fx[k],isLkg:false,lkgSavedAt:Date.now()};
 if(dashValid(dashboardData.inflation?.value))dataLkg.macro.inflation={...dashboardData.inflation,isLkg:false,lkgSavedAt:Date.now()};
 saveDataLkg();
}
function marketBadge(entry){
 if(!entry)return'';
 if(entry.isLkg)return'<span class="data-badge lkg">LKG</span>';
 const ts=Number(entry.lastTime)*1000||Number(entry.loadedAt)||0;if(!ts)return'<span class="data-badge stale">SIN HORA</span>';
 const h=(Date.now()-ts)/3600000;
 return h<=96?'<span class="data-badge current">ACTUAL</span>':'<span class="data-badge stale">ATRASADO</span>';
}
function currentWatchPrice(res,item=null){
 const candidates=[res?.analysis?.c,res?.rf?.price,res?.rf?.precio,res?.rf?.trade,res?.rf?.last,res?.rf?.closingPrice,item?.lastPrice];
 for(const x of candidates){const n=Number(x);if(Number.isFinite(n)&&n>0)return n}
 return NaN;
}
function portfolioPnl(item,res){
 ensureTransactionHistory(item);
 const price=currentWatchPrice(res,item),qty=Number(item?.quantity)||0,avg=Number(item?.buyPrice)||0,cost=Number(item?.positionSize)||0;
 if(!(qty>0)||!(avg>0)||!Number.isFinite(price))return{price,pnl:NaN,pct:NaN,currentValue:NaN,qty,invested:cost,realized:Number(item?.realizedPnl)||0,priceFallback:Number.isFinite(Number(item?.lastPrice))};
 const currentValue=qty*price,pnl=currentValue-cost,pct=cost>0?pnl/cost*100:NaN;
 return{price,pnl,pct,currentValue,qty,invested:cost,realized:Number(item?.realizedPnl)||0,priceFallback:!Number.isFinite(Number(res?.analysis?.c))&&!Number.isFinite(Number(res?.rf?.price??res?.rf?.precio))};
}
function portfolioDecision(item,res){
 if(!item?.inPortfolio)return{key:'watch',label:'SEGUIMIENTO',why:'No está en cartera.'};
 const sell=res?.sellAlert||sellAlertReason(item,res);
 if(sell?.severity>=3)return{key:'exit',label:'SALIR',why:sell.text};
 if(sell?.severity>=2)return{key:'reduce',label:'REDUCIR',why:sell.text};
 const a=res?.analysis,p=res?.plan;
 if(a&&Number.isFinite(a.c)&&Number.isFinite(a.ema50)&&a.c<a.ema50)return{key:'watch',label:'VIGILAR',why:'Precio debajo de EMA50.'};
 if(p?.status==='OPERABLE'&&p?.direction==='LONG')return{key:'hold',label:'MANTENER',why:'Setup LONG operativo.'};
 if(a?.trend==='alcista'||a?.structure==='alcista')return{key:'hold',label:'MANTENER',why:'Estructura favorable.'};
 return{key:'watch',label:'VIGILAR',why:'Sin salida confirmada, pero con confluencia débil.'};
}
function runDataValidation(){
 const issues=[],add=(sev,msg,scope)=>issues.push({sev,msg,scope});
 if(!dashValid(dashboardData.risk?.value))add('warn','Riesgo país sin valor actual.','Macro');
 for(const k of ['mep','ccl','official'])if(!dashValid(dashboardData.fx?.[k]?.venta))add('warn',`${k.toUpperCase()} sin valor actual.`,'Macro');
 if(!dashValid(dashboardData.inflation?.value))add('warn','IPC sin valor actual.','Macro');
 for(const a of marketVisibleAssets()){const e=marketBoardData.get(a.id);if(!marketEntryValid(e)){add('warn',`${a.name}: sin cotización válida.`,'Mercados');continue}if(!Number.isFinite(Number(e.lastTime)))add('warn',`${a.name}: precio sin timestamp.`,'Mercados')}
 for(const item of (state.config.watchlist||[])){if(item.inPortfolio&&(!(Number(item.positionSize)>0)||!(Number(item.buyPrice)>0)))add('warn',`${item.symbol}: en cartera sin tamaño y/o precio de compra.`,'Cartera')}
 let score=100;issues.forEach(x=>score-=x.sev==='bad'?18:6);score=Math.max(0,score);dataValidation={score,issues,checkedAt:Date.now()};renderDataHealth();
 if($('dataDiagSummary'))$('dataDiagSummary').textContent=issues.length?`${issues.length} observación(es) · calidad ${score}/100`:`Sin inconsistencias · calidad ${score}/100`;
 if($('dataDiagList'))$('dataDiagList').innerHTML=issues.length?issues.slice(0,30).map(x=>`<div class="diag-item"><span class="diag-sev warn">REVISAR</span><div><b>${escapeHtml(x.scope)}</b><br>${escapeHtml(x.msg)}</div></div>`).join(''):`<div class="diag-item"><span class="diag-sev ok">OK</span><div>No se detectaron inconsistencias en los datos disponibles.</div></div>`;
 renderDecisionCenter();return dataValidation;
}
function decisionClamp(v,a=0,b=100){return Math.max(a,Math.min(b,Number(v)||0))}
function decisionCompactText(v,max=210){
 const s=String(v||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
 return s.length>max?s.slice(0,max-1)+'…':s;
}
function decisionFmtPct(v,d=2){
 const n=Number(v);return Number.isFinite(n)?`${n>=0?'+':''}${n.toFixed(d)}%`:'—';
}
function decisionFmtPrice(v){
 const n=Number(v);return Number.isFinite(n)?fmt(n):'—';
}
function decisionVision(){
 const r=marketIntel?.regime;
 let score=Number.isFinite(Number(r?.score))?Number(r.score):50;
 let label=r?.label||'NEUTRAL',kind=r?.kind||'neutral';
 const reasons=[];
 if(r?.components?.length)reasons.push(...r.components.slice(0,3).map(x=>`${x.name}: ${x.reason}`));
 const risk=dashboardData?.risk;
 if(dashValid(risk?.value))reasons.push(`Riesgo país ${Math.round(Number(risk.value))} pb${dashValid(risk.change)?` (${Number(risk.change)>=0?'+':''}${Math.round(Number(risk.change))} pb)`:''}`);
 const ar=marketIntel?.breadthAr,us=marketIntel?.breadthUs;
 if(ar?.above50!==undefined&&Number.isFinite(Number(ar.above50)))reasons.push(`Breadth AR ${Number(ar.above50).toFixed(0)}% > EMA50`);
 if(us?.above50!==undefined&&Number.isFinite(Number(us.above50)))reasons.push(`Breadth USA ${Number(us.above50).toFixed(0)}% > EMA50`);
 const human=label==='RISK ON'?'FAVORABLE':label==='RISK OFF'?'DEFENSIVO':'NEUTRAL / SELECTIVO';
 return{score:Math.round(score),label:human,kind,reasons:reasons.slice(0,5)};
}
function decisionFreshnessText(){
 const t=Math.max(Number(state.scan?.completedAt)||0,Number(rfScanState?.completedAt)||0);
 if(!t)return{label:'Sin scanners recientes',kind:'neutral'};
 const min=Math.round((Date.now()-t)/60000);
 if(min<=10)return{label:`Actualizado hace ${Math.max(0,min)} min`,kind:'good'};
 if(min<=60)return{label:`Último scanner hace ${min} min`,kind:'neutral'};
 return{label:`Scanner desactualizado · ${Math.round(min/60)} h`,kind:'bad'};
}
function decisionRvAction(r){
 const p=r.plan||{},kind=r.status?.kind;
 if(kind==='buy'){
   if(Number.isFinite(Number(p.entryLow))&&Number.isFinite(Number(p.entryHigh)))return `Evaluar entrada sólo en ${fmt(Number(p.entryLow))}–${fmt(Number(p.entryHigh))}; respetar invalidación ${Number.isFinite(Number(p.stop))?fmt(Number(p.stop)):'definida por el setup'}.`;
   return 'Evaluar entrada sólo mientras se mantenga la confirmación del setup; no perseguir precio.';
 }
 if(kind==='near')return `Esperar confirmación${Number.isFinite(Number(p.entryLow))&&Number.isFinite(Number(p.entryHigh))?` / llegada a ${fmt(Number(p.entryLow))}–${fmt(Number(p.entryHigh))}`:''}. No anticipar la entrada.`;
 if(kind==='sell')return 'Evitar nuevos largos. Si el activo está en cartera, revisar reducción/salida; SHORT sólo si forma parte de tu operativa.';
 return 'Sin acción inmediata.';
}
function decisionRvData(r){
 const p=r.plan||{},a=r.analysis||{};
 const x=[`Precio ${decisionFmtPrice(r.price??a.c)}`,`TF ${r.tfLabel||r.key||'—'}`];
 if(Number.isFinite(Number(p.entryLow))&&Number.isFinite(Number(p.entryHigh)))x.push(`Entrada ${fmt(Number(p.entryLow))}–${fmt(Number(p.entryHigh))}`);
 if(Number.isFinite(Number(p.stop)))x.push(`Stop ${fmt(Number(p.stop))}`);
 if(Number.isFinite(Number(p.tp1)))x.push(`TP1 ${fmt(Number(p.tp1))}`);
 return x.join(' · ');
}
function decisionRfData(r){
 const rf=r.rf||{},price=Number(rf.price??rf.precio??r.item?.panel?.trade??r.item?.panel?.closingPrice);
 const y=typeof rfYieldMetric==='function'?rfYieldMetric(rf):Number(rf.tir);
 const x=[];
 if(Number.isFinite(price))x.push(`Precio ${fmt(price)}`);
 if(Number.isFinite(y))x.push(`${typeof rfYieldLabel==='function'?rfYieldLabel(rf):'TIR'} ${y.toFixed(2)}%`);
 if(Number.isFinite(Number(rf.paridad))&&Number(rf.paridad)>0)x.push(`Paridad ${Number(rf.paridad).toFixed(1)}%`);
 if(Number.isFinite(Number(rf.duration))&&Number(rf.duration)>0)x.push(`Duration ${Number(rf.duration).toFixed(2)} a`);
 return x.length?x.join(' · '):'Abrir ficha para completar métricas de renta fija.';
}
function decisionRfAction(r){
 const cls=r.rf?.rfClass;
 if(cls==='ON')return 'Abrir ficha y validar emisor, cashflows, moneda contractual, liquidez y condiciones antes de ejecutar.';
 return 'Abrir ficha y confirmar precio, moneda, cashflows restantes, TIR/paridad, duration y escenario de riesgo país antes de ejecutar.';
}
function decisionPriorityForRv(r){
 const native=Number(r.status?.oppScore ?? r.plan?.score ?? 0);
 const k=r.status?.kind;
 const adj=k==='buy'?4:k==='sell'?2:k==='near'?-4:-20;
 return decisionClamp(native+adj-(dataValidation.score<70?8:0));
}
function decisionPriorityForRf(r){
 const native=Number(r.score ?? r.rfScore ?? 0);
 const k=r.status?.kind;
 return decisionClamp(native+(k==='buy'?2:k==='near'?-4:-15)-(dataValidation.score<70?6:0));
}
function decisionCandidates(){
 const out=[],seen=new Set();

 // 1. Cartera: SALIR/REDUCIR/VIGILAR tienen prioridad operacional.
 (state.config.watchlist||[]).forEach((item,idx)=>{
   if(!item.inPortfolio)return;
   const res=state.watchResults[watchKey(item)],d=portfolioDecision(item,res),pp=portfolioPnl(item,res);
   const riskScore=d.key==='exit'?100:d.key==='reduce'?96:d.key==='watch'?72:42;
   const row={
     id:`portfolio|${item.symbol}|${idx}`,group:'portfolio',cls:d.key,symbol:item.symbol,type:item.type,key:item.tf||'short',portfolioIndex:idx,
     label:d.label,priority:riskScore,nativeScore:Number(res?.plan?.score)||null,source:'Cartera',
     data:`Compra ${Number(item.buyPrice)>0?fmt(Number(item.buyPrice)):'—'} · Actual ${Number.isFinite(pp.price)?fmt(pp.price):'—'} · P&L ${Number.isFinite(pp.pct)?decisionFmtPct(pp.pct):'—'}`,
     analysis:d.why,decision:d.label,
     action:d.key==='exit'?'Revisar y ejecutar salida según tu regla de ejecución.':d.key==='reduce'?'Reducir exposición y revalidar el remanente.':d.key==='watch'?'No aumentar; vigilar invalidación y próximo cierre.':'Mantener mientras no aparezca una señal de deterioro.',
     why:d.why,open:`openWatchItem(${idx})`
   };
   out.push(row);
 });

 // 2. Scanner RV / Crypto actual.
 for(const r of (state.scan.results||[])){
   if(['argbond','on'].includes(r.item?.type))continue;
   if(!['buy','near','sell'].includes(r.status?.kind))continue;
   const key=`rv|${r.item?.symbol}|${r.item?.type}`;
   if(seen.has(key))continue;seen.add(key);
   const native=Number(r.status?.oppScore ?? r.plan?.score);
   out.push({
     id:key,group:'rv',cls:r.status.kind,symbol:r.item?.symbol||'',type:r.item?.type||'',key:r.key||'medium',
     label:r.status?.label||signalKindLabel(r.status?.kind),priority:decisionPriorityForRv(r),nativeScore:Number.isFinite(native)?native:null,source:'Scanner RV / Crypto',
     data:decisionRvData(r),analysis:decisionCompactText(r.why,220),decision:r.status?.label||signalKindLabel(r.status?.kind),
     action:decisionRvAction(r),why:decisionCompactText(r.why,220),
     open:`openScanResult('${String(r.item?.symbol||'').replaceAll("'","\\'")}','${String(r.item?.type||'').replaceAll("'","\\'")}','${String(r.key||'medium').replaceAll("'","\\'")}')`
   });
 }

 // 3. Renta fija dedicada, sin mezclar su score interno con TA.
 const rfBest=new Map();
 for(const r of (rfScanState.results||[])){
   if(!['buy','near'].includes(r.status?.kind))continue;
   const k=`${r.item?.symbol}|${r.item?.type}`;
   const prev=rfBest.get(k);
   if(!prev||Number(r.score||0)>Number(prev.score||0))rfBest.set(k,r);
 }
 // Si el scanner genérico se usó en modo RF, también se acepta como fuente.
 for(const r of (state.scan.results||[])){
   if(!['argbond','on'].includes(r.item?.type)||!['buy','near'].includes(r.status?.kind))continue;
   const k=`${r.item?.symbol}|${r.item?.type}`;
   const prev=rfBest.get(k);
   const score=Number(r.rfScore||r.score||0),prevScore=Number(prev?.score||prev?.rfScore||0);
   if(!prev||score>prevScore)rfBest.set(k,{...r,score});
 }
 for(const r of rfBest.values()){
   const key=`rf|${r.item?.symbol}|${r.item?.type}`;
   const native=Number(r.score ?? r.rfScore);
   out.push({
     id:key,group:'rf',cls:'rf',symbol:r.item?.symbol||'',type:r.item?.type||'',key:'medium',
     label:r.status?.label||'RF',priority:decisionPriorityForRf(r),nativeScore:Number.isFinite(native)?native:null,source:'Scanner Renta Fija',
     data:decisionRfData(r),analysis:decisionCompactText(r.why,220),decision:r.status?.label||'CANDIDATO RF',
     action:decisionRfAction(r),why:decisionCompactText(r.why,220),
     open:`loadBondAnalysis('${String(r.item?.symbol||'').replaceAll("'","\\'")}','${String(r.item?.type||'argbond').replaceAll("'","\\'")}')`
   });
 }
 return out.sort((a,b)=>b.priority-a.priority);
}
function decisionPortfolioRows(){
 const rows=[];
 (state.config.watchlist||[]).forEach((item,idx)=>{
   if(!item.inPortfolio)return;
   const res=state.watchResults[watchKey(item)],d=portfolioDecision(item,res),pp=portfolioPnl(item,res);
   rows.push({item,idx,res,d,pp});
 });
 const order={exit:0,reduce:1,watch:2,hold:3};
 return rows.sort((a,b)=>(order[a.d.key]??9)-(order[b.d.key]??9));
}
function decisionCardHtml(x,rank){
 const pct=decisionClamp(x.priority),scoreLabel=x.nativeScore!==null&&x.nativeScore!==undefined&&Number.isFinite(Number(x.nativeScore))?`${x.group==='rf'?'Score RF':x.group==='portfolio'?'Score técnico':'Score oportunidad'}`:'Prioridad',scoreValue=x.nativeScore!==null&&x.nativeScore!==undefined&&Number.isFinite(Number(x.nativeScore))?Math.round(Number(x.nativeScore)):Math.round(pct);
 let portfolioButton='';
 if(x.group==='portfolio'){
   portfolioButton=`<button class="secondary-action increase-btn" onclick="openQuickPortfolio('${String(x.symbol).replaceAll("'","\\'")}','${String(x.type).replaceAll("'","\\'")}','${String(x.key||'short').replaceAll("'","\\'")}','Centro de Decisión')">+ Aumentar</button><button class="secondary-action reduce-btn" onclick="openReducePosition(${Number(x.portfolioIndex)},false)">Reducir</button><button class="secondary-action close-position-btn" onclick="openReducePosition(${Number(x.portfolioIndex)},true)">Cerrar</button>`;
 }else portfolioButton=portfolioContextActionsHtml(x.symbol,x.type,x.key||'medium','Centro de Decisión');
 return `<div class="decision-card-v74 ${x.cls} ${x.group}"><div class="decision-card-head"><div class="decision-rank">${rank}</div><div class="decision-asset"><b>${escapeHtml(x.symbol)}</b><span>${escapeHtml(typeLabel(x.type))}</span><span class="decision-source-chip">${escapeHtml(x.source)}</span></div><div class="decision-native-score">${escapeHtml(scoreLabel)}<b>${scoreValue}/100</b></div><div class="decision-summary"><strong>${escapeHtml(x.label)}</strong> · ${escapeHtml(decisionCompactText(x.why,150))}</div><div class="decision-card-actions"><button class="secondary-action" onclick="${x.open}">Abrir</button>${portfolioButton}</div></div>
 <div class="decision-card-grid"><div class="decision-step"><small>DATO</small><div>${escapeHtml(x.data)}</div></div><div class="decision-step"><small>ANÁLISIS</small><div>${escapeHtml(x.analysis)}</div></div><div class="decision-step decision"><small>DECISIÓN</small><div>${escapeHtml(x.decision)}</div></div><div class="decision-step action"><small>ACCIÓN</small><div>${escapeHtml(x.action)}</div></div></div><div class="decision-scorebar"><i style="width:${pct}%"></i></div></div>`;
}
function renderDecisionCenter(){
 if(!$('decisionList'))return;

 const vision=decisionVision(),v=$('decisionVision');
 if(v)v.className=`decision-vision ${vision.kind}`;
 $('decisionVisionScore').textContent=vision.score;
 $('decisionVisionLabel').textContent=vision.label;
 $('decisionVisionWhy').innerHTML=vision.reasons.length?vision.reasons.map(x=>`<span>• ${escapeHtml(x)}</span>`).join(''):'Contexto todavía incompleto.';
 const fresh=decisionFreshnessText(),fc=$('decisionFreshness');
 if(fc){fc.textContent=fresh.label;fc.className=`intel-chip ${fresh.kind}`}

 const candidates=decisionCandidates(),portfolio=decisionPortfolioRows();
 const actionablePortfolio=portfolio.filter(x=>['exit','reduce'].includes(x.d.key));
 const rvCount=candidates.filter(x=>x.group==='rv').length;
 const rfCount=candidates.filter(x=>x.group==='rf').length;
 const noAction=portfolio.filter(x=>['hold'].includes(x.d.key)).length;
 const ranked=candidates.filter(x=>!(x.group==='portfolio'&&x.cls==='hold')).slice(0,6);

 $('decisionAttention').textContent=ranked.length;
 $('decisionRv').textContent=rvCount;
 $('decisionRf').textContent=rfCount;
 $('decisionPortfolioRisk').textContent=actionablePortfolio.length;
 $('decisionNoAction').textContent=noAction;
 $('decisionQuality').textContent=`${dataValidation.score}/100`;
 if($('decisionMixVisual'))$('decisionMixVisual').innerHTML=premiumAnalyticsCountDonut([
   {name:'Oportunidades RV / Crypto',value:rvCount},{name:'Renta fija',value:rfCount},{name:'Cartera en riesgo',value:actionablePortfolio.length},{name:'Sin acción requerida',value:noAction}
 ],{centerTitle:'Radar hoy',centerLabel:ranked.length?'Atención':'Sin hallazgos',centerValue:String(ranked.length||'—'),emptyText:'Ejecutá scanners o cargá cartera para poblar el Centro de Decisión.'});
 $('decisionRankingNote').textContent=ranked.length?`Top ${ranked.length} por prioridad normalizada · cada activo conserva su score nativo`:'Sin hallazgos accionables actuales';

 $('decisionList').innerHTML=ranked.length
   ? ranked.map((x,i)=>decisionCardHtml(x,i+1)).join('')
   : `<div class="decision-empty-v74">No hay decisiones prioritarias actuales. Ejecutá los scanners o actualizá la cartera. Radar no inventa oportunidades para llenar el panel.</div>`;

 if(!portfolio.length){
   $('decisionPortfolioList').innerHTML='<div class="decision-empty-v74">No hay posiciones marcadas “En cartera”.</div>';
 }else{
   $('decisionPortfolioList').innerHTML=portfolio.slice(0,9).map(x=>{
     const pp=x.pp,d=x.d,pnl=Number(pp.pnl),pct=Number(pp.pct),cls=Number.isFinite(pnl)?pnl>0?'pnl-pos':pnl<0?'pnl-neg':'pnl-flat':'pnl-flat';
     return `<div class="decision-portfolio-card">
       <div class="top"><div><b>${escapeHtml(x.item.symbol)}</b><div class="signal-sub">${escapeHtml(typeLabel(x.item.type))}</div></div><span class="portfolio-state ${d.key}">${d.label}</span></div>
       <div class="pnl ${cls}">${Number.isFinite(pnl)?`${pnl>=0?'+':''}${fmtPositionMoney(pnl)} · ${decisionFmtPct(pct)}`:'P&L pendiente'}</div>
       <div class="why">${escapeHtml(d.why)}</div>
       <button class="secondary-action decision-open-position" onclick="openWatchItem(${x.idx})">Abrir posición</button>
     </div>`;
   }).join('');
 }
}

/* Wrappers v67: agregan salud/LKG sin cambiar el motor de datos v66 */
const __commitMarketEntryV67=commitMarketEntry;
commitMarketEntry=function(asset,entry,reason=''){const x=__commitMarketEntryV67(asset,entry,reason);if(marketEntryValid(x)){const src=asset.sourceType==='byma-merval-usd'?'byma':'yahoo',ts=healthDataTimestamp(x);lkgMarket(asset,x);healthOk(src,src==='byma'?'BYMA OK':'Yahoo OK',ts);if(asset?.group==='Índices')healthOk('indices','Índices OK',ts)}return x};
const __commitMarketErrorV67=commitMarketError;
commitMarketError=function(asset,error){const x=__commitMarketErrorV67(asset,error),src=asset?.sourceType==='byma-merval-usd'?'byma':'yahoo';if(marketEntryValid(x)){const ts=healthDataTimestamp(x);healthStale(src,'LKG',error?.message||error,ts);if(asset?.group==='Índices')healthStale('indices','LKG',error?.message||error,ts)}else{healthError(src,error?.message||error);if(asset?.group==='Índices')healthError('indices',error?.message||error,'Índices error')}return x};
const __renderDashboardV67=renderDashboard;
renderDashboard=function(){const r=__renderDashboardV67.apply(this,arguments);try{lkgMacro()}catch{};try{renderPortfolio360()}catch{};try{renderDailyBrief()}catch{};try{renderProvenance()}catch{};return r};
const __renderMarketBoardV67=renderMarketBoard;
renderMarketBoard=function(){const r=__renderMarketBoardV67.apply(this,arguments);try{runDataValidation()}catch{};return r};

const __renderRfScannerV74=renderRfScanner;
renderRfScanner=function(){const r=__renderRfScannerV74.apply(this,arguments);try{renderDecisionCenter()}catch{};return r};

const __renderRegimeV74=renderRegime;
renderRegime=function(){const r=__renderRegimeV74.apply(this,arguments);try{renderDecisionCenter()}catch{};return r};

const __renderScannerV67=renderScanner;
renderScanner=function(){const r=__renderScannerV67.apply(this,arguments);try{renderDecisionCenter()}catch{};return r};

const __fetchMarketBarsV67=fetchMarketBars;
fetchMarketBars=async function(){healthBusy('yahoo','consultando');try{const r=await __fetchMarketBarsV67.apply(this,arguments);healthOk('yahoo','Yahoo OK');return r}catch(e){healthError('yahoo',e.message||e,'Yahoo error');throw e}};
const __fetchBinanceV9I=fetchBinance;fetchBinance=async function(){healthBusy('crypto','consultando');try{const r=await __fetchBinanceV9I.apply(this,arguments),ts=Number(r?.at?.(-1)?.time)*1000;healthOk('crypto','Cripto OK',ts);return r}catch(e){healthError('crypto',e.message||e,'Cripto error');throw e}};
const __fetchBymaHistoryV67=fetchBymaHistory;
fetchBymaHistory=async function(){healthBusy('byma','consultando');try{const r=await __fetchBymaHistoryV67.apply(this,arguments),ts=Number(r?.at?.(-1)?.time)*1000;healthOk('byma','BYMA OK',ts);return r}catch(e){healthError('byma',e.message||e,'BYMA error');throw e}};
const __fetchFixedIncomeAnalyticsV67=fetchFixedIncomeAnalytics;
fetchFixedIncomeAnalytics=async function(){healthBusy('rf','consultando');try{const r=await __fetchFixedIncomeAnalyticsV67.apply(this,arguments);healthOk('rf',`RF ${Array.isArray(r?.bonds)?r.bonds.length:'OK'}`);return r}catch(e){healthError('rf',e.message||e,'RF error');throw e}};
const __loadConfigV67=loadConfig;
loadConfig=async function(){healthBusy('config','cargando');try{const r=await __loadConfigV67.apply(this,arguments);healthOk('config','Config OK');return r}catch(e){healthError('config',e.message||e,'Config error');throw e}};
const __loadDashboardV67=loadDashboard;
loadDashboard=async function(){healthBusy('dollar','consultando');healthBusy('risk','consultando');try{const r=await __loadDashboardV67.apply(this,arguments),fx=dashboardData.fx?.mep||dashboardData.fx?.ccl||{},risk=dashboardData.risk||{},fxTs=healthDataTimestamp(fx),riskTs=healthDataTimestamp(risk);if(dashValid(dashboardData.fx?.mep?.venta)||dashValid(dashboardData.fx?.ccl?.venta)){fx.isLkg?healthStale('dollar','Dólar LKG','',fxTs):healthOk('dollar','Dólar OK',fxTs)}else healthError('dollar','Sin cotización','Dólar error');if(dashValid(risk.value)){risk.isLkg||risk.status==='STALE'?healthStale('risk','Riesgo LKG','',riskTs):healthOk('risk','Riesgo OK',riskTs)}else healthError('risk','Sin valor','Riesgo error');lkgMacro();runDataValidation();return r}catch(e){healthError('dollar',e.message||e);healthError('risk',e.message||e);throw e}};

(window.radarBindAction?window.radarBindAction($('selfTestBtn'),'click',()=>runStartupSelfTest(true),{key:'selfTestBtn',errorMessage:'No se pudo completar el autotest'}):$('selfTestBtn').addEventListener('click',()=>runStartupSelfTest(true)));
$('dataDiagBtn').addEventListener('click',()=>{$('dataDiagnostics').classList.add('active');$('selfTestBox').classList.add('active');runDataValidation();if(!stabilityState.selfTest&&!window.radarActionBusy?.('selfTestBtn')){const run=()=>runStartupSelfTest(false);if(window.radarRunAction)void window.radarRunAction(run,{key:'selfTestBtn',control:$('dataDiagBtn'),errorMessage:'No se pudo completar el autotest'});else void run()}});
$('dataDiagClose').addEventListener('click',()=>$('dataDiagnostics').classList.remove('active'));

;

/* ===== RUNTIME BLOCK 44 ===== */
/* Phase 9Z · Browser bootstrap / UI binding orchestration extraction.
   Ownership only: preserves existing G2 UI binds, startup sequencing, watchdogs, refresh cadence and responsive hooks.
   Financial calculations, provider/LKG semantics and Decision Engine logic remain in their existing owners. */

window.radarBindAction?.($('regressionBtn'),'click',runRegressionSuite,{key:'regressionBtn'})||$('regressionBtn').addEventListener('click',runRegressionSuite);window.radarBindAction?.($('qaLocalBtn'),'click',()=>runLocalPreflight(true),{key:'qaLocalBtn'})||$('qaLocalBtn').addEventListener('click',()=>runLocalPreflight(true));$('qaCopyBtn').addEventListener('click',copyQaStage4);

$('refreshProvenanceBtn').addEventListener('click',renderProvenance);
$('toggleProvenanceBtn').addEventListener('click',()=>setProvenanceExpanded($('provenancePanel').classList.contains('collapsed')));
$('closeProvenanceBtn').addEventListener('click',()=>setProvenanceExpanded(false));
$('homeViewBtn').addEventListener('click',showDashboardView);
$('cedearRotationViewBtn')?.addEventListener('click',()=>window.RadarCedearRotationRuntime?.show());


// Phase 9W: Signal journal / audit runtime moved to /g2/runtime/signal-audit-runtime.js


// Phase 9V: Data Quality / Stability / Decision runtime moved to /g2/runtime/data-quality-decision-runtime.js

window.RadarAssetIntelligenceUI?.bind({
 analyze:runPrimaryAnalysis,
 back:()=>radarReturnToOrigin('home'),
 addPortfolio:()=>{if(state.symbol&&state.type)openQuickPortfolio(state.symbol,state.type,state.currentKey||'medium','Análisis')},
 addWatch:ensureAnalysisWatchlist,
 reducePortfolio:()=>{if(state.symbol&&state.type)openPortfolioReduction(state.symbol,state.type,state.currentKey||'medium',false)},
 closePortfolio:()=>{if(state.symbol&&state.type)openPortfolioReduction(state.symbol,state.type,state.currentKey||'medium',true)},
 useSuggestedPosition:()=>{const n=Number($('useSuggestedPositionBtn')?.dataset.amount);if(n>0){$('positionSizeInput').value=n;const a=state.analyses?.[state.currentKey];if(a)updatePositionSizing(computeTradePlan(a))}},
 riskSizingChanged:()=>{const a=state.analyses?.[state.currentKey];if(a)updatePositionSizing(computeTradePlan(a))},
 positionSizeChanged:()=>{const a=state.analyses?.[state.currentKey];if(a)updatePositionSizing(computeTradePlan(a))},
 chartLayerChanged:()=>renderChart(state.currentKey)
});

window.RadarMarketCommandUI?.bind({
 copyDailyBrief,
 refreshDashboard:()=>loadDashboard(true),
 refreshMarkets:()=>loadMarketBoard(true).catch(e=>console.warn('Actualizar mercados',e)),
 refreshIntelligence:async()=>{if(radarRefreshLock)return;radarRefreshLock=true;try{await loadMarketIntelligence(true)}finally{radarRefreshLock=false}},
 selectMarketFilter:filter=>{marketBoardFilter=filter||'Resumen';renderMarketBoard();updateMarketBoardStatus();loadMarketBoard(false).catch(e=>console.warn('Carga categoría',e))},
 selectMarketTimeframe:tf=>{if(selectedMarketAsset)openMarketAsset(selectedMarketAsset.id,tf)},
 closeMarketDetail:()=>{$('marketDetail').classList.remove('active');if(marketChart){marketChart.remove();marketChart=null}},
 openDashboardSeries:series=>openDashboardChart(series),
 closeDashboardDetail:()=>{$('dashDetail').classList.remove('active');document.querySelectorAll('.dash-kpi').forEach(x=>x.classList.remove('active'))}
});

function refreshRfSelectionSummary(){
 if($('rfsObjective')&&$('rfObjective')){
   $('rfsObjective').textContent=$('rfObjective').selectedOptions?.[0]?.textContent||'—';
 }
 if($('rfsHorizon')&&$('rfHorizon')){
   $('rfsHorizon').textContent=$('rfHorizon').selectedOptions?.[0]?.textContent||'—';
 }
}

window.RadarScannerWorkspaceUI?.bind({
 showScanner:showScannerView,
 showFixedIncome:showFixedIncomeScanner,
 showDashboard:showDashboardView,
 startScanner,
 stopScanner,
 renderScanner,
 toggleScanMode,
 scanUniverseChanged:()=>{},
 scanRfObjectiveChanged:()=>{renderRfContext();if(state.scan.results?.length&&isFixedIncomeUniverse($('scanUniverse').value)){state.scan.results=[];$('scanDiagnostic').textContent='Cambiaste el objetivo: volvé a escanear para recalcular el ranking.';renderScanner();}},
 scanRfHorizonChanged:()=>{renderRfContext();if(state.scan.results?.length&&isFixedIncomeUniverse($('scanUniverse').value)){state.scan.results=[];$('scanDiagnostic').textContent='Cambiaste el horizonte: volvé a escanear para recalcular el ranking.';renderScanner();}},
 startFixedIncome:startRfScanner,
 stopFixedIncome:stopRfScanner,
 renderFixedIncome:renderRfScanner,
 rfObjectiveChanged:()=>{
   normalizeRfOnSelection();
   rearmRfScanner('Objetivo modificado. Presioná Escanear para recalcular.');
   $('rfUniverseInfo').textContent=isRfCreditMode()
     ?'Modo ON activo: Radar consultará sólo Obligaciones Negociables de BYMA y usará preselección corporativa.'
     :'Objetivo modificado. Presioná Escanear para actualizar.';
   if(rfScanState.results.length){
     rfScanState.results=[];
     renderRfScanner();
     $('rfDiagnostic').textContent='Objetivo modificado. Presioná Escanear: el ranking anterior quedó invalidado.';
   }
 },
 rfHorizonChanged:()=>{
   refreshRfSelectionSummary();
   rearmRfScanner('Horizonte modificado. Presioná Escanear para recalcular.');
   if(rfScanState.results.length){
     rfScanState.results=[];
     renderRfScanner();
     $('rfDiagnostic').textContent='Horizonte modificado. Presioná Escanear: el ranking anterior quedó invalidado.';
   }
 },
 rfUniverseChanged:()=>{
   normalizeRfOnSelection();
   rearmRfScanner('Universo modificado. Presioná Escanear para actualizar.');
   $('rfUniverseInfo').textContent=isRfCreditMode()
     ?'ON seleccionadas: el objetivo cambió automáticamente a Crédito corporativo / ON. Presioná Escanear.'
     :'Universo modificado. Presioná Escanear para actualizar.';
   if(rfScanState.results.length){rfScanState.results=[];renderRfScanner();}
 },
 rfCurrencyChanged:()=>{rearmRfScanner('Moneda modificada. Presioná Escanear para actualizar.');$('rfUniverseInfo').textContent='Moneda modificada. Presioná Escanear para actualizar.'}
});
window.RadarLabHistoryUI?.bind({
 showLab:showLabView,
 showSignals:showSignalsView,
 showDashboard:showDashboardView,
 runReplay:runLabReplay,
 runBacktest:runLabBacktest,
 exportLab:exportLabCsv,
 generateModelProposal,
 applyModelProposal,
 resetModelWeights,
 auditSignals:auditAllSignals,
 exportSignals:exportSignalCsv,
 clearSignals:clearSignalHistory,
 renderSignals:renderSignalHistory,
 exportDecisionAudit
});
window.RadarFixedIncomeAllocatorUI?.bindBond({back:()=>radarReturnToOrigin('rf'),scenario:calculateBondScenario,addWatch:addCurrentBondToWatchlist,addPortfolio:()=>{if(bondState.symbol&&bondState.type)openQuickPortfolio(bondState.symbol,bondState.type,'medium','Ficha de renta fija')},reducePortfolio:()=>{if(bondState.symbol&&bondState.type)openPortfolioReduction(bondState.symbol,bondState.type,'medium',false)},closePortfolio:()=>{if(bondState.symbol&&bondState.type)openPortfolioReduction(bondState.symbol,bondState.type,'medium',true)}});
window.RadarPortfolioWorkspaceUI?.bind({
 showWatchlist:showWatchlistView,
 showPortfolio:showPortfolioView,
 showRisk:showPortfolioRiskView,
 showDashboard:showDashboardView,
 addWatchItem,
 refreshCurrent:()=>refreshCurrentPortfolioContext(false),
 enableAlerts,
 watchTypeChanged:()=>{const t=$('watchType').value;$('watchCurrency').value=defaultPortfolioCurrency(t==='auto'?resolveWatchType($('watchSymbol').value,'auto'):t)},
 baseCurrencyChanged:async()=>{const previous=state.config.portfolioBaseCurrency;state.config.portfolioBaseCurrency=$('portfolioBaseCurrency').value;if($('riskSizingCurrency'))$('riskSizingCurrency').value=state.config.portfolioBaseCurrency;try{await saveConfigStrict();window.radarMarkPortfolioAnalyticsStale?.('Cambio de moneda base de cartera');renderPortfolio360();renderDecisionCenter()}catch(e){if(e?.rollbackApplied!==true){state.config.portfolioBaseCurrency=previous;if($('portfolioBaseCurrency'))$('portfolioBaseCurrency').value=previous;if($('riskSizingCurrency'))$('riskSizingCurrency').value=previous}throw e}},
 referenceCapitalChanged:async()=>{const previous=Number(state.config.portfolioCapital)||0;state.config.portfolioCapital=Number($('portfolioReferenceCapital').value)||0;if($('riskAccountCapital'))$('riskAccountCapital').value=state.config.portfolioCapital||'';try{await saveConfigStrict();window.radarMarkPortfolioAnalyticsStale?.('Cambio de capital patrimonial de referencia');renderPortfolio360()}catch(e){if(e?.rollbackApplied!==true){state.config.portfolioCapital=previous;if($('portfolioReferenceCapital'))$('portfolioReferenceCapital').value=previous||'';if($('riskAccountCapital'))$('riskAccountCapital').value=previous||''}throw e}},
 closeQuickPortfolio,saveQuickPortfolio,quickPortfolioChanged:updateQuickPortfolioRead,quickPortfolioBackdrop:e=>{if(e.target===$('quickPortfolioOverlay'))closeQuickPortfolio()},
 closeReducePosition,confirmReducePosition,reduceChanged:updateReducePreview,reduceBackdrop:e=>{if(e.target===$('reducePositionOverlay'))closeReducePosition()},
 openCashFlow,cashFlowAssetChanged:syncCashFlowType,closeCashFlow,saveCashFlow,cashFlowBackdrop:e=>{if(e.target===$('cashFlowOverlay'))closeCashFlow()},
 g2CashOpen,g2CashClose,g2CashSave,g2CashBackdrop:e=>{if(e.target===$('g2CashOverlay'))g2CashClose()},
 g2ReconcileOpen,g2ReconcileClose,g2ReconcileSave,g2ReconcileBackdrop:e=>{if(e.target===$('g2ReconcileOverlay'))g2ReconcileClose()},
 assessCutover:()=>g2PortfolioAssessCutover(true),promoteG2First:()=>g2PortfolioTransitionAuthority('ACTIVATE_G2_FIRST'),rollbackG1First:()=>g2PortfolioTransitionAuthority('ROLLBACK_G1_FIRST'),
 exportBackup:exportRadarBackup,importBackupClick:()=>$('importRadarFile').click(),importBackupChanged:e=>restoreRadarBackup(e.target.files?.[0]).finally(()=>{e.target.value=''}),
 refreshRisk:refreshPortfolioRisk,refreshPerformance:refreshPortfolioPerformance,runStress:runStressScenario,retryConfigSave:()=>window.radarRetryConfigPersistence?.(),
 applyMonitorMode:()=>applyMonitorMode(true),monitorAlertChanged:()=>applyMonitorMode(true)
});
window.addEventListener('resize',()=>{
 scheduleAnalysisChartResize();
 if(dashboardChart&&$('dashMacroChart'))dashboardChart.applyOptions({width:Math.max(320,$('dashMacroChart').clientWidth)});
 if(marketChart&&$('marketCandleChart'))marketChart.applyOptions({width:Math.max(320,$('marketCandleChart').clientWidth)});
});
window.addEventListener('orientationchange',()=>scheduleAnalysisChartResize(180));


// Phase 9R: application chrome + technical console presentation/event ownership moved to /g2/ui/app-shell-ui.js
// Phase 9S: legacy inline CSS ownership moved to /g2/ui/workspace-factory.css; financial/browser engines remain behind tested bridges


// Phase 9L: Help Center presentation and event ownership moved to /g2/ui/help-center-ui.js
const RADAR_ROUTE_LABELS=Object.freeze({home:'Inicio',scanner:'Escáner',rf:'Renta fija',watchlist:'Seguimiento',portfolio:'Cartera',risk:'Riesgo',signals:'Historial'});
const radarNavigationState={current:'home',origin:null};
function radarRouteFromView(activeId,title){
 const byId={homeViewBtn:'home',scannerViewBtn:'scanner',fixedIncomeBtn:'rf',watchlistViewBtn:'watchlist',portfolioViewBtn:'portfolio',cedearRotationViewBtn:'cedear',allocatorViewBtn:'allocator',advisorViewBtn:'advisor',labViewBtn:'lab',signalsViewBtn:'signals'};
 if(activeId&&byId[activeId]){
  if(activeId==='portfolioViewBtn'&&title==='Riesgo & Performance')return'risk';
  if(activeId==='fixedIncomeBtn'&&title==='Renta fija · detalle')return'bond';
  return byId[activeId];
 }
 if(title==='Análisis técnico')return'analysis';
 if(title==='Renta fija · detalle')return'bond';
 return radarNavigationState.current||'home';
}
function radarSyncDrillNavigation(){
 const origin=radarNavigationState.origin,label=origin?RADAR_ROUTE_LABELS[origin]||'Volver':'';
 const analysisBack=$('analysisBackBtn');if(analysisBack){analysisBack.hidden=!origin;analysisBack.textContent=origin?`← ${label}`:'← Volver'}
 const bondBack=$('bondBackBtn');if(bondBack){bondBack.textContent=origin?`← ${label}`:'← Escáner renta fija';bondBack.title=origin?`Volver a ${label}`:'Volver al escáner de renta fija'}
}
function radarCaptureDrillOrigin(){
 const current=radarNavigationState.current;
 if(!current||current==='analysis'||current==='bond')return radarNavigationState.origin;
 radarNavigationState.origin=current;radarSyncDrillNavigation();return current;
}
function radarClearDrillOrigin(){radarNavigationState.origin=null;radarSyncDrillNavigation()}
function radarReturnToOrigin(fallback='home'){
 const route=radarNavigationState.origin||fallback||'home';radarNavigationState.origin=null;radarSyncDrillNavigation();
 const go={home:()=>showDashboardView(),scanner:()=>showScannerView(),rf:()=>showFixedIncomeScanner(),watchlist:()=>showWatchlistView(),portfolio:()=>showPortfolioView(),risk:()=>showPortfolioRiskView(),cedear:()=>window.RadarCedearRotationRuntime?.show?.(),allocator:()=>showAllocatorView(),advisor:()=>window.showAdvisorView?.(),lab:()=>showLabView(),signals:()=>showSignalsView()};
 (go[route]||go.home)();
}
window.radarCaptureDrillOrigin=radarCaptureDrillOrigin;window.radarClearDrillOrigin=radarClearDrillOrigin;window.radarReturnToOrigin=radarReturnToOrigin;window.radarNavigationState=radarNavigationState;
function setInstitutionalView(activeId,title,subtitle){
 document.querySelectorAll('.side-nav-item').forEach(b=>b.classList.toggle('active',!!activeId&&b.id===activeId));
 if($('viewTitle'))$('viewTitle').textContent=title||'Radar Técnico';
 if($('viewSubtitle'))$('viewSubtitle').textContent=subtitle||'';
 const command=document.querySelector('.command-search');
 if(command){
  command.dataset.label='ACTIVO / SÍMBOLO';
  command.setAttribute('aria-label','Análisis técnico individual de activo');
 }
 const route=radarRouteFromView(activeId,title);radarNavigationState.current=route;
 if(route!=='analysis'&&route!=='bond')radarNavigationState.origin=null;
 radarSyncDrillNavigation();
}

// Phase 9U: Advisor / Security / Operations runtime moved to /g2/runtime/advisor-operations-runtime.js

window.addEventListener('load',()=>{
 try{window.RadarAppShellUI?.initChrome()}catch(e){console.warn('application chrome',e)}
 try{window.RadarHelpCenterUI?.bind()}catch(e){console.warn('help center 9L',e)}
 try{updateScannerCurrencyVisibility()}catch(e){console.warn('scanner init',e)}
 if($('watchType'))$('watchType').value='auto';
 if(!state.config||!Array.isArray(state.config.watchlist))state.config={watchlist:[],cedearBlacklist:[],lastPositionSize:0,alertsEnabled:false};

 try{loadDashboardCache()}catch(e){console.warn('dashboard cache',e)}
 try{reconcileAllDashboardSeries()}catch(e){console.warn('dashboard reconcile',e)}
 try{loadMarketCache()}catch(e){console.warn('market cache',e)}
 try{loadIntelCache()}catch(e){console.warn('intel cache',e)}
 try{loadDataLkg()}catch(e){console.warn('LKG',e)}
 try{showDashboardView()}catch(e){console.warn('dashboard view',e)}
 try{installUiEncodingGuard()}catch(e){console.warn('encoding guard',e)}
 try{initProvenancePanel()}catch(e){console.warn('provenance ui',e)}
 try{renderDashboard()}catch(e){console.warn('dashboard render',e)}
 try{renderMarketBoard()}catch(e){console.warn('market initial render',e)}
 try{renderWatchlist()}catch(e){console.warn('watch render',e)}
 try{runDataValidation()}catch(e){console.warn('validation',e)}
 try{renderDecisionCenter()}catch(e){console.warn('decision center',e)}

 try{setInterval(stabilityWatchdog,5000)}catch(e){console.warn('stability watchdog',e)}
 setInterval(()=>refreshMonitorStatus().catch(()=>{}),30000);
 setTimeout(()=>runStartupSelfTest(false).catch(e=>recordRuntimeError('SELFTEST',e)),3000);
 setTimeout(()=>runStartupSelfTest(false).catch(e=>recordRuntimeError('SELFTEST',e)),15000);

 loadSignalJournal().catch(e=>console.warn('Signal journal',e));
 loadDecisionAudit().catch(e=>console.warn('Decision audit',e));
 loadConfig().then(async()=>{
   try{if((state.config.watchlist||[]).length)await refreshWatchlist(true)}catch(e){console.warn('watchlist startup',e)}
   try{await refreshMonitorStatus()}catch{}
   try{renderDailyBrief();renderProvenance()}catch{}
   try{loadLastQaStage4();setTimeout(()=>runLocalPreflight(false),350)}catch{}
 }).catch(e=>console.warn('Config',e));

 const dashPromise=loadDashboard(true).catch(e=>console.warn('Dashboard',e));
 const marketPromise=loadMarketBoard(false).catch(e=>console.warn('Mercados',e));

 Promise.race([marketPromise,new Promise(r=>setTimeout(r,20000))])
   .then(()=>loadMarketIntelligence(false))
   .catch(e=>console.warn('Inteligencia',e));

 setTimeout(()=>{
   try{
     const g=$('marketCardGrid');
     if(g&&g.children.length===0){
       console.warn('Watchdog: market grid vacía; reconstruyendo');
       renderMarketBoard();
       if(g.children.length===0)g.innerHTML=marketVisibleAssets().map(a=>marketCardHtml(a,marketBoardData.get(a.id))).join('');
     }
     reconcileAllDashboardSeries();
     renderDashboard();
   }catch(e){console.warn('startup watchdog',e)}
 },1500);

 setTimeout(()=>{
   try{reconcileAllDashboardSeries();renderDashboard();renderMarketBoard()}catch(e){console.warn('reconcile watchdog',e)}
 },8000);

 if(dashboardTimer)clearInterval(dashboardTimer);
 dashboardTimer=setInterval(()=>{
   if(radarRefreshLock)return;
   radarRefreshLock=true;
   loadDashboard(true).catch(()=>{});
   const age=marketIntel.updated?Date.now()-marketIntel.updated:Infinity;
   if(age>30*60*1000){
     loadMarketBoard(true).catch(()=>{});
     setTimeout(()=>loadMarketIntelligence(true).catch(()=>{}),15000);
   }
   setTimeout(()=>{radarRefreshLock=false},2000);
 },5*60*1000);
});

;
