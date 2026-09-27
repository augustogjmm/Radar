/* Radar Tecnico G2 - Watchlist, portfolio, signals, risk/performance and QA
   Extracted from certified runtime; order preserved. */

/* ===== RUNTIME BLOCK 21 ===== */
// Radar Técnico G2 — Phase 10G / v4.38.0
// Watchlist, portfolio quick-actions, alerts and portfolio workspace navigation extracted from the legacy inline compatibility bridge.
// Ownership only: no financial, sizing, scoring, portfolio or alert semantics changed in this phase.

function updateAlertUI(){
 const enabled=!!state.config.alertsEnabled && typeof Notification!=='undefined' && Notification.permission==='granted';
 if($('alertsBadge')){
   $('alertsBadge').textContent=enabled?'Alertas activas':'Alertas desactivadas';
   $('alertsBadge').className='alert-badge '+(enabled?'on':'off');
 }
 if($('enableAlertsBtn'))$('enableAlertsBtn').textContent=enabled?'Alertas activas':'Activar alertas';
}
async function enableAlerts(){
 if(typeof Notification==='undefined'){
   window.radarNotify('Este navegador no soporta notificaciones.','warn');
   return;
 }
 try{
   const perm=await Notification.requestPermission();
   state.config.alertsEnabled=perm==='granted';
   await saveConfigStrict();
   updateAlertUI();
   if(perm==='granted')new Notification('Radar Técnico',{body:'Alertas activadas para activos marcados En cartera.'});
 }catch(e){
   if(e?.radarAlreadyReported!==true)state.config.alertsEnabled=false;updateAlertUI();
 }
}
function sellAlertReason(item,res){
 if(['argbond','on'].includes(item?.type))return null;
 if(!item?.inPortfolio || !res?.analysis)return null;
 const a=res.analysis,p=res.plan,price=a.c;
 const reasons=[];
 let severity=0;
 if(p?.status==='OPERABLE' && p.direction==='SHORT'){
   reasons.push(`El motor pasó a VENTA/SHORT con score ${p.score}/100.`);
   severity=Math.max(severity,3);
 }
 if(/CHoCH bajista|BOS bajista/.test(a.breakType||'')){
   reasons.push(`${a.breakType}: cambio/continuidad estructural bajista.`);
   severity=Math.max(severity,2);
 }
 if(p?.direction==='LONG' && Number.isFinite(p.stop) && price<p.stop){
   reasons.push(`El precio ${fmt(price)} quedó por debajo de la invalidación técnica ${fmt(p.stop)}.`);
   severity=Math.max(severity,3);
 }
 if(a.structure==='bajista' && a.score<=-3){
   reasons.push(`Estructura bajista con score técnico ${a.score}.`);
   severity=Math.max(severity,2);
 }
 if(Number.isFinite(item.buyPrice) && item.buyPrice>0){
   const pl=(price/item.buyPrice-1)*100;
   if(pl<0)reasons.push(`Desde tu precio de compra: ${pl.toFixed(2)}%.`);
 }
 if(!reasons.length)return null;
 return{severity,reasons,text:reasons.join(' ')};
}
function maybeNotifySell(item,res,previous){
 const alert=sellAlertReason(item,res);
 if(!alert)return;
 const prevAlert=previous?.sellAlert;
 const isNew=!prevAlert || alert.severity>prevAlert.severity || prevAlert.text!==alert.text;
 res.sellAlert=alert;
 if(!isNew)return;
 if(!state.config.alertsEnabled || typeof Notification==='undefined' || Notification.permission!=='granted')return;
 const title=alert.severity>=3?`⚠️ VENDER / SALIDA: ${item.symbol}`:`⚠️ Revisar posición: ${item.symbol}`;
 try{
   new Notification(title,{
     body:alert.text,
     tag:`radar-sell-${watchKey(item)}`,
     renotify:true
   });
   try{
     const ctx=new (window.AudioContext||window.webkitAudioContext)();
     const osc=ctx.createOscillator(),gain=ctx.createGain();
     osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=660;gain.gain.value=.05;osc.start();
     setTimeout(()=>{osc.stop();ctx.close()},220);
   }catch{}
 }catch{}
}
async function refreshWatchSubset(items){for(const item of (items||[])){await refreshSingleWatchItem(item,false)}renderWatchlist();try{await saveConfigBestEffort('market-refresh-cache')}catch{}}
function startWatchMonitor(){
 if(state.watchTimer)clearInterval(state.watchTimer);if(state.watchCandidateTimer)clearInterval(state.watchCandidateTimer);
 // Posiciones reales: control frecuente. Seguimiento sin posición: refresco menos agresivo para no saturar proveedores.
 state.watchTimer=setInterval(()=>{const items=(state.config.watchlist||[]).filter(x=>x.inPortfolio);if(items.length)refreshWatchSubset(items)},10*60*1000);
 state.watchCandidateTimer=setInterval(()=>{const items=(state.config.watchlist||[]).filter(x=>!x.inPortfolio);if(items.length)refreshWatchSubset(items)},30*60*1000);
}



let quickPortfolioContext=null;

function defaultPortfolioCurrency(type){
 if(type==='crypto')return'USDT';
 if(type==='stock')return'USD';
 return'ARS';
}
function portfolioClassLabel(type){
 return type==='crypto'?'Crypto':type==='stock'?'Acciones / ADR USA':type==='argstock'?'Acciones Argentina':type==='cedear'?'CEDEAR':type==='argbond'?'Bonos / Letras':type==='on'?'ON':'Otros';
}
function portfolioFallbackSector(item){
 if(item?.sector)return item.sector;
 if(item?.type==='crypto')return'Criptoactivos';
 if(item?.type==='argbond')return'Renta fija soberana / Tesoro';
 if(item?.type==='on')return'Renta fija corporativa';
 if(item?.type==='cedear')return'CEDEAR';
 if(item?.type==='stock')return'Acciones USA';
 if(item?.type==='argstock'){
   const p=ARG_COMPANY_PROFILES?.[String(item.symbol||'').replace(/\.BA$/,'').toUpperCase()];
   return p?.sector||'Acciones Argentina';
 }
 return'No clasificado';
}
function portfolioMep(){
 const x=Number(dashboardData?.fx?.mep?.venta);
 return Number.isFinite(x)&&x>0?x:NaN;
}
function currencyUsdLike(c){return c==='USD'||c==='USDT'}
function convertPortfolioAmount(v,from,to){
 const n=Number(v);if(!Number.isFinite(n))return NaN;
 from=from||'ARS';to=to||'ARS';
 if(from===to)return n;
 if(currencyUsdLike(from)&&currencyUsdLike(to))return n;
 const mep=portfolioMep();if(!Number.isFinite(mep))return NaN;
 if(from==='ARS'&&currencyUsdLike(to))return n/mep;
 if(currencyUsdLike(from)&&to==='ARS')return n*mep;
 return NaN;
}
function fmtPortfolioMoney(v,currency){
 if(!Number.isFinite(Number(v)))return'—';
 return `${new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(Number(v))} ${currency}`;
}

function portfolioItemRef(symbol,type,key='medium'){
 const nt=resolveWatchType(symbol,type),ns=displaySymbolForType(symbol,nt),list=state.config.watchlist||[];
 let index=list.findIndex(x=>x.symbol===ns&&x.type===nt&&x.tf===key);
 if(index<0)index=list.findIndex(x=>x.symbol===ns&&x.type===nt&&x.inPortfolio);
 return{item:index>=0?list[index]:null,index,symbol:ns,type:nt,key};
}
function portfolioAssetGroup(item){return ['argbond','on'].includes(item?.type)?'Renta fija':item?.type==='crypto'?'Cripto':'Renta variable'}
function portfolioRegion(item){
 if(item?.region)return item.region;
 if(['argstock','argbond','on'].includes(item?.type))return'Argentina';
 if(item?.type==='cedear')return'Exterior vía CEDEAR';
 if(item?.type==='stock')return'EE.UU. / Global';
 if(item?.type==='crypto')return'Global cripto';
 return'No clasificado';
}
function portfolioParseDate(v){
 if(!v)return NaN;const s=String(v).trim();let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12).getTime();
 const t=Date.parse(s);return Number.isFinite(t)?t:NaN;
}
function portfolioYearsToMaturity(item){
 const d=Number(item?.durationYears);if(Number.isFinite(d)&&d>0)return d;
 const ts=portfolioParseDate(item?.maturityDate);if(Number.isFinite(ts))return Math.max(0,(ts-Date.now())/(365.25*86400000));
 return NaN;
}
function portfolioTermBucket(item){
 if(!['argbond','on'].includes(item?.type))return null;const y=portfolioYearsToMaturity(item);if(!Number.isFinite(y))return'Sin plazo verificable';if(y<=1)return'Corto · ≤1 año';if(y<=3)return'Medio · 1–3 años';return'Largo · >3 años';
}
function portfolioRiskClass(item){
 if(item?.riskClassOverride&&item.riskClassOverride!=='AUTO')return item.riskClassOverride;
 if(item?.type==='crypto'||item?.type==='argstock')return'Alto';
 if(['stock','cedear'].includes(item?.type))return'Medio-alto';
 if(item?.type==='on')return'Crédito no evaluado';
 if(item?.type==='argbond'){const y=portfolioYearsToMaturity(item);return Number.isFinite(y)&&y>4?'Alto':Number.isFinite(y)&&y>1.5?'Medio-alto':'Medio'}
 return'Medio';
}
function portfolioRiskBadgeClass(r){return r==='Alto'?'high':r==='Medio-alto'?'medhigh':r==='Crédito no evaluado'?'credit':'medium'}
function portfolioContextActionsHtml(symbol,type,key='medium',source='Radar'){
 const r=portfolioItemRef(symbol,type,key),s=String(symbol).replaceAll("'","\\'"),t=String(type).replaceAll("'","\\'"),k=String(key||'medium').replaceAll("'","\\'"),src=String(source).replaceAll("'","\\'");
 if(r.item?.inPortfolio)return `<button class="increase-btn" onclick="openQuickPortfolio('${s}','${t}','${k}','${src} · Aumentar')">+ Aumentar</button><button class="reduce-btn" onclick="openPortfolioReduction('${s}','${t}','${k}',false)">Reducir</button><button class="close-position-btn" onclick="openPortfolioReduction('${s}','${t}','${k}',true)">Cerrar</button>`;
 return `<button class="scan-portfolio" onclick="openQuickPortfolio('${s}','${t}','${k}','${src}')">+ Cartera</button>`;
}
function openPortfolioReduction(symbol,type,key='medium',closeAll=false){const r=portfolioItemRef(symbol,type,key);if(!r.item?.inPortfolio){window.radarNotify?.('Este activo no tiene una posición abierta en Cartera.','warn');return}openReducePosition(r.index,closeAll)}
async function ensureAnalysisWatchlist(){
 if(!state.symbol||!state.type)return;const key=state.currentKey||'medium';if(scanResultInWatchlist(state.symbol,state.type,key))return;await addScanResultToWatchlist(state.symbol,state.type,key);updateAnalysisPortfolioButton();
}
function quickPortfolioExists(symbol,type,key){
 const nt=resolveWatchType(symbol,type),ns=displaySymbolForType(symbol,nt);
 return (state.config.watchlist||[]).some(x=>x.symbol===ns&&x.type===nt&&x.tf===key&&x.inPortfolio);
}
function currentPlanSuggestedPosition(plan){
 const capital=Number($('riskAccountCapital')?.value||state.config.portfolioCapital),riskPct=Number($('riskPerTradePct')?.value||state.config.riskPerTradePct),tradeRisk=Math.abs(Number(plan?.riskPct));
 if(!(capital>0)||!(riskPct>0)||!(tradeRisk>0))return NaN;
 return Math.min(capital,(capital*riskPct/100)/(tradeRisk/100));
}
function findQuickPortfolioContext(symbol,type,key='medium',source=''){
 const nt=resolveWatchType(symbol,type),ns=displaySymbolForType(symbol,nt);let price=NaN,plan=null,sector='',name='',region='',riskClass='AUTO',durationYears=NaN,maturityDate='',quoteCurrency='';
 const scan=(state.scan.results||[]).find(r=>r.item?.symbol===symbol&&r.item?.type===type&&(r.key||'medium')===key)||(state.scan.results||[]).find(r=>displaySymbolForType(r.item?.symbol||'',resolveWatchType(r.item?.symbol||'',r.item?.type))===ns&&resolveWatchType(r.item?.symbol||'',r.item?.type)===nt);
 const rf=(rfScanState.results||[]).find(r=>r.item?.symbol===symbol&&r.item?.type===type);
 if(scan){price=Number(scan.price??scan.analysis?.c??scan.rf?.price);plan=scan.plan||null;sector=scan.item?.sector||'';name=scan.item?.name||'';durationYears=Number(scan.rf?.duration);maturityDate=scan.rf?.vencimiento||scan.item?.panel?.maturityDate||'';if(scan.item?.panel){const q=rfQuoteCurrency(scan.item.panel)?.code;if(['ARS','USD'].includes(q))quoteCurrency=q}}
 if(rf){price=Number(rf.rf?.price??rf.rf?.precio??rf.item?.panel?.trade??rf.item?.panel?.closingPrice);sector=rf.item?.type==='on'?'Renta fija corporativa':'Renta fija soberana / Tesoro';name=rf.rf?.nombre||'';durationYears=Number(rf.rf?.duration);maturityDate=rf.rf?.vencimiento||rf.item?.panel?.maturityDate||'';const q=rfQuoteCurrency(rf.item?.panel)?.code;if(['ARS','USD'].includes(q))quoteCurrency=q}
 if(state.symbol&&displaySymbolForType(state.symbol,state.type)===ns&&state.type===nt){const a=state.analyses?.[key]||state.analyses?.[state.currentKey];if(Number.isFinite(Number(a?.c)))price=Number(a.c);if(a)plan=computeTradePlan(a);if(state.assetProfile){sector=state.assetProfile.sector||sector;name=state.assetProfile.name||name;region=state.assetProfile.country||region}}
 if(bondState?.symbol===ns&&bondState?.type===nt){price=Number(bondCurrentPrice(bondState.rf||{},bondState.panel));sector=nt==='on'?'Renta fija corporativa':'Renta fija soberana / Tesoro';name=bondState.rf?.nombre||name;durationYears=Number(bondState.rf?.duration);maturityDate=bondState.rf?.vencimiento||bondState.panel?.maturityDate||'';const q=rfQuoteCurrency(bondState.panel)?.code;if(['ARS','USD'].includes(q))quoteCurrency=q}
 const existing=(state.config.watchlist||[]).find(x=>x.symbol===ns&&x.type===nt&&x.tf===key);region=existing?.region||region||portfolioRegion({type:nt});riskClass=existing?.riskClassOverride||'AUTO';return{symbol:ns,type:nt,key,source,price,plan,sector,name,region,riskClass,durationYears,maturityDate,quoteCurrency,existing};
}
function openQuickPortfolio(symbol,type,key='medium',source=''){
 quickPortfolioContext=findQuickPortfolioContext(symbol,type,key,source);const c=quickPortfolioContext,e=c.existing;$('quickPortfolioSymbol').value=c.symbol;$('quickPortfolioTypeTf').value=`${typeLabel(c.type)} · ${key}`;$('quickPortfolioBuyPrice').value=Number.isFinite(c.price)?c.price:(e?.buyPrice>0?e.buyPrice:'');const suggested=currentPlanSuggestedPosition(c.plan);$('quickPortfolioAmount').value=Number.isFinite(suggested)?suggested:(Number(state.config.lastPositionSize)||'');$('quickPortfolioCurrency').value=e?.portfolioCurrency||c.quoteCurrency||defaultPortfolioCurrency(c.type);$('quickPortfolioSector').value=e?.sector||c.sector||'';$('quickPortfolioRegion').value=e?.region||c.region||portfolioRegion({type:c.type});$('quickPortfolioRiskClass').value=e?.riskClassOverride||'AUTO';$('quickPortfolioSubtitle').textContent=e?.inPortfolio?'Posición existente: el importe ingresado se SUMARÁ como nueva compra.':`Alta desde ${source||'Radar'}`;$('quickPortfolioSave').textContent=e?.inPortfolio?'Aumentar posición':'Guardar en Cartera';updateQuickPortfolioRead();$('quickPortfolioOverlay').classList.add('active');$('quickPortfolioOverlay').setAttribute('aria-hidden','false');
}
function closeQuickPortfolio(){
 $('quickPortfolioOverlay').classList.remove('active');$('quickPortfolioOverlay').setAttribute('aria-hidden','true');quickPortfolioContext=null;
}
function updateQuickPortfolioRead(){
 const c=quickPortfolioContext;if(!c)return;const amount=Number($('quickPortfolioAmount').value),buy=Number($('quickPortfolioBuyPrice').value),cur=$('quickPortfolioCurrency').value,qty=amount>0&&buy>0?amount/buy:NaN,parts=[];if(Number.isFinite(c.price))parts.push(`Precio observado ${fmt(c.price)}`);if(Number.isFinite(qty))parts.push(`Cantidad estimada ${qty.toFixed(qty<1?6:4)}`);parts.push(`Moneda ${cur}`);parts.push(`Región ${$('quickPortfolioRegion').value||portfolioRegion({type:c.type})}`);const risk=$('quickPortfolioRiskClass').value==='AUTO'?portfolioRiskClass({type:c.type,durationYears:c.durationYears}):$('quickPortfolioRiskClass').value;parts.push(`Riesgo ${risk}`);if(Number.isFinite(c.durationYears))parts.push(`Duration ${c.durationYears.toFixed(2)} a`);if(c.plan&&Number.isFinite(Number(c.plan.stop))&&buy>0)parts.push(`Riesgo técnico ${(Math.abs(buy-Number(c.plan.stop))/buy*100).toFixed(2)}%`);$('quickPortfolioRead').textContent=parts.join(' · ')+'. Al guardar entra al monitoreo y a la clasificación de Cartera 360.';
}
async function saveQuickPortfolio(){
 const c=quickPortfolioContext;if(!c)return;const amount=Number($('quickPortfolioAmount').value),buy=Number($('quickPortfolioBuyPrice').value);if(!(amount>0)){window.radarNotify?.('Ingresá el capital a comprar / agregar.','warn');$('quickPortfolioAmount')?.focus();return}if(!(buy>0)){window.radarNotify?.('Ingresá el precio de compra.','warn');$('quickPortfolioBuyPrice')?.focus();return}const currency=$('quickPortfolioCurrency').value,sector=$('quickPortfolioSector').value.trim(),region=$('quickPortfolioRegion').value.trim(),riskClass=$('quickPortfolioRiskClass').value;let item=(state.config.watchlist||[]).find(x=>x.symbol===c.symbol&&x.type===c.type&&x.tf===c.key);if(!item){item={symbol:c.symbol,type:c.type,tf:c.key,transactions:[]};state.config.watchlist.push(item)}item.portfolioCurrency=currency;item.sector=sector||portfolioFallbackSector({type:c.type,symbol:c.symbol});item.region=region||portfolioRegion({type:c.type});item.riskClassOverride=riskClass==='AUTO'?'AUTO':riskClass;if(Number.isFinite(c.durationYears)&&c.durationYears>0)item.durationYears=c.durationYears;if(c.maturityDate)item.maturityDate=c.maturityDate;if(c.name)item.assetName=c.name;item.portfolioAddedAt=item.portfolioAddedAt||Date.now();item.portfolioSource=c.source||'quick';ensureTransactionHistory(item);const quickSrc=c.source||'alta rápida v88',quickDraft={id:txId(),type:'BUY',ts:Date.now(),qty:amount/buy,price:buy,amount,fees:0,currency,source:quickSrc,g2Native:true,g2CashImpactApplied:true};await g2PortfolioCommitMutation(item,quickDraft,()=>addPortfolioBuy(item,amount,buy,0,quickSrc,quickDraft));if(c.plan){if(Number.isFinite(Number(c.plan.stop)))item.technicalStop=Number(c.plan.stop);if(Number.isFinite(Number(c.plan.tp1)))item.technicalTp1=Number(c.plan.tp1);item.technicalDirection=c.plan.direction||'LONG'}state.config.lastPositionSize=amount;renderWatchlist();
 await refreshSingleWatchItem(item,false);try{await saveConfigStrict()}catch(e){renderWatchlist();renderScanner();try{renderRfScanner()}catch{};try{renderDecisionCenter()}catch{};closeQuickPortfolio();throw e}renderWatchlist();renderScanner();try{renderRfScanner()}catch{};try{renderDecisionCenter()}catch{};try{updateAnalysisPortfolioButton()}catch{};try{updateBondPortfolioActions()}catch{};closeQuickPortfolio();window.radarNotify?.(`${item.symbol} ${item.transactions?.filter?.(x=>x.type==='BUY').length>1?'aumentado':'incorporado'} en Cartera.`,'ok');
}
function exposureHtml(map,total){
 const rows=[...map.entries()].sort((a,b)=>b[1]-a[1]);
 if(!rows.length||!(total>0))return'<div class="watch-empty">Sin datos.</div>';
 return rows.map(([name,val])=>{const pct=val/total*100;return `<div class="exposure-row"><span class="exposure-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span><span class="exposure-track"><i style="width:${Math.min(100,pct)}%"></i></span><span class="exposure-pct">${pct.toFixed(1)}%</span></div>`}).join('');
}
function portfolio360Stats(){
 const base=state.config.portfolioBaseCurrency||'ARS',items=(state.config.watchlist||[]).filter(x=>{ensureTransactionHistory(x);return x.inPortfolio});let invested=0,current=0,pnl=0,risk=0,realized=0,income=0,investedKnown=0,currentKnown=0,exposureTotal=0,fallbackWeights=0;const byClass=new Map(),byCurrency=new Map(),bySector=new Map(),byGroup=new Map(),byRegion=new Map(),byTerm=new Map(),byRisk=new Map(),details=[];
 const add=(m,k,v)=>{if(!k||!Number.isFinite(v)||v<=0)return;m.set(k,(m.get(k)||0)+v)};
 for(const item of items){const cur=item.portfolioCurrency||defaultPortfolioCurrency(item.type),amount=Number(item.positionSize),res=state.watchResults[watchKey(item)],pp=portfolioPnl(item,res),inv=convertPortfolioAmount(amount,cur,base),cv=Number.isFinite(pp.currentValue)?convertPortfolioAmount(pp.currentValue,cur,base):NaN;if(Number.isFinite(inv)){invested+=inv;investedKnown++}if(Number.isFinite(cv)){current+=cv;currentKnown++}if(Number.isFinite(pp.pnl)){const pv=convertPortfolioAmount(pp.pnl,cur,base);if(Number.isFinite(pv))pnl+=pv}const rp=Math.abs(Number(res?.plan?.riskPct));if(amount>0&&Number.isFinite(rp)){const rv=convertPortfolioAmount(amount*rp/100,cur,base);if(Number.isFinite(rv))risk+=rv}const rr=convertPortfolioAmount(Number(item.realizedPnl)||0,cur,base),ii=convertPortfolioAmount(Number(item.cashIncome)||0,cur,base);if(Number.isFinite(rr))realized+=rr;if(Number.isFinite(ii))income+=ii;const weightValue=Number.isFinite(cv)&&cv>0?cv:(Number.isFinite(inv)?inv:NaN),basis=Number.isFinite(cv)&&cv>0?'actual':'invertido';if(basis==='invertido')fallbackWeights++;if(Number.isFinite(weightValue)&&weightValue>0){exposureTotal+=weightValue;add(byClass,portfolioClassLabel(item.type),weightValue);add(byCurrency,cur,weightValue);add(bySector,portfolioFallbackSector(item),weightValue);add(byGroup,portfolioAssetGroup(item),weightValue);add(byRegion,portfolioRegion(item),weightValue);const term=portfolioTermBucket(item);if(term)add(byTerm,term,weightValue);add(byRisk,portfolioRiskClass(item),weightValue);details.push({item,res,pp,value:weightValue,basis,sector:portfolioFallbackSector(item),region:portfolioRegion(item),riskClass:portfolioRiskClass(item),group:portfolioAssetGroup(item),term})}}
 details.sort((a,b)=>b.value-a.value);const largest=exposureTotal>0&&details.length?details[0].value/exposureTotal*100:NaN,top5Pct=exposureTotal>0?details.slice(0,5).reduce((s,x)=>s+x.value,0)/exposureTotal*100:NaN,pnlPct=invested>0&&currentKnown===items.length?(current/invested-1)*100:NaN;return{base,items,invested,current,pnl,risk,largest,top5Pct,pnlPct,byClass,byCurrency,bySector,byGroup,byRegion,byTerm,byRisk,investedKnown,currentKnown,realized,income,exposureTotal,fallbackWeights,details};
}
function renderPortfolio360(){
 if(!$('p360Positions'))return;const s=portfolio360Stats(),n=s.items.length;$('p360Positions').textContent=n;$('p360Invested').textContent=n&&s.investedKnown?fmtPortfolioMoney(s.invested,s.base):'—';$('p360Current').textContent=n?(s.currentKnown===n?fmtPortfolioMoney(s.current,s.base):(s.exposureTotal>0?'~ '+fmtPortfolioMoney(s.exposureTotal,s.base)+' est.':'—')):'—';$('p360Pnl').textContent=n&&s.currentKnown?`${s.pnl>=0?'+':''}${fmtPortfolioMoney(s.pnl,s.base)}`:'—';$('p360Pnl').className=s.pnl>0?'green':s.pnl<0?'red':'';$('p360PnlPct').textContent=Number.isFinite(s.pnlPct)?decisionFmtPct(s.pnlPct):'—';$('p360PnlPct').className=s.pnlPct>0?'green':s.pnlPct<0?'red':'';$('p360Risk').textContent=s.risk>0?fmtPortfolioMoney(s.risk,s.base):'—';$('p360Concentration').textContent=Number.isFinite(s.largest)?s.largest.toFixed(1)+'%':'—';$('p360Top5').textContent=Number.isFinite(s.top5Pct)?s.top5Pct.toFixed(1)+'%':'—';$('p360Coverage').textContent=n?`${s.currentKnown}/${n}`:'—';$('p360ClassExposure').innerHTML=premiumAnalyticsDonutHtml(s.byClass,s.exposureTotal,{centerTitle:'Instrumentos',emptyText:'Cargá posiciones para ver la exposición por instrumento.'});$('p360CurrencyExposure').innerHTML=premiumAnalyticsDonutHtml(s.byCurrency,s.exposureTotal,{centerTitle:'Monedas',emptyText:'Cargá posiciones para ver la exposición monetaria.'});$('p360SectorExposure').innerHTML=premiumAnalyticsDonutHtml(s.bySector,s.exposureTotal,{centerTitle:'Sectores',emptyText:'Cargá o clasificá posiciones para ver sectores y temáticas.'});$('p360GroupExposure').innerHTML=premiumAnalyticsDonutHtml(s.byGroup,s.exposureTotal,{centerTitle:'Clases',emptyText:'Cargá posiciones para ver renta variable, fija y cripto.'});$('p360RegionExposure').innerHTML=premiumAnalyticsDonutHtml(s.byRegion,s.exposureTotal,{centerTitle:'Regiones',emptyText:'Cargá posiciones para ver la distribución geográfica.'});$('p360TermExposure').innerHTML=premiumAnalyticsDonutHtml(s.byTerm,[...s.byTerm.values()].reduce((a,b)=>a+b,0),{centerTitle:'Plazos RF',emptyText:'No hay renta fija con plazo clasificable.'});$('p360RiskExposure').innerHTML=premiumAnalyticsDonutHtml(s.byRisk,s.exposureTotal,{centerTitle:'Riesgo',emptyText:'Cargá posiciones para ver la clasificación de riesgo.'});
 const rv=s.byGroup.get('Renta variable')||0,rf=s.byGroup.get('Renta fija')||0,ext=[...s.byRegion.entries()].filter(([k])=>k!=='Argentina').reduce((a,[,v])=>a+v,0),pct=(v,t=s.exposureTotal)=>t>0?v/t*100:NaN;$('p360RvRf').textContent=s.exposureTotal?`${pct(rv).toFixed(0)}% / ${pct(rf).toFixed(0)}%`:'—';$('p360External').textContent=Number.isFinite(pct(ext))?pct(ext).toFixed(1)+'%':'—';$('p360WeightBasis').textContent=s.fallbackWeights?`Mixta · ${s.fallbackWeights} fallback`:'Valor actual';$('p360Top5Detail').textContent=Number.isFinite(s.top5Pct)?s.top5Pct.toFixed(1)+'%':'—';$('p360RvShare').textContent=Number.isFinite(pct(rv))?pct(rv).toFixed(1)+'%':'—';$('p360RfShare').textContent=Number.isFinite(pct(rf))?pct(rf).toFixed(1)+'%':'—';renderPortfolioTop(s);if($('p360TopPositionsDonut')){const topRows=s.details.slice(0,5).map(x=>({name:x.item.symbol,value:x.value})),rest=Math.max(0,s.exposureTotal-topRows.reduce((a,x)=>a+x.value,0));if(rest>0)topRows.push({name:'Resto cartera',value:rest});$('p360TopPositionsDonut').innerHTML=premiumAnalyticsDonutHtml(topRows,s.exposureTotal,{centerTitle:'Concentración',centerLabel:'Top 5',centerValue:Number.isFinite(s.top5Pct)?s.top5Pct.toFixed(0)+'%':'—',emptyText:'Cargá posiciones para analizar concentración.'})}
 const notes=[];if(n&&!Number.isFinite(portfolioMep())&&s.byCurrency.size>1)notes.push('MEP no disponible: no se consolidan correctamente monedas distintas.');if(n&&s.currentKnown<n)notes.push(`Precio actual disponible para ${s.currentKnown}/${n}; ${s.fallbackWeights} peso(s) usan capital remanente como fallback.`);if(Number(state.config.portfolioCapital)>0&&s.invested>0)notes.push(`Capital invertido / patrimonio de referencia: ${(s.invested/Number(state.config.portfolioCapital)*100).toFixed(1)}%.`);if(Number.isFinite(s.largest)&&s.largest>=35)notes.push(`Concentración alta: la mayor posición representa ${s.largest.toFixed(1)}%.`);if(Number.isFinite(s.top5Pct)&&s.top5Pct>=80&&n>5)notes.push(`Top 5 concentra ${s.top5Pct.toFixed(1)}% de la cartera.`);$('p360Note').textContent=notes.length?notes.join(' '):(n?'Cartera clasificada con valor actual cuando existe y fallback explícito cuando falta precio.':'Sin posiciones en cartera.');renderDiversification(s);renderPortfolioLedger();try{renderDailyBrief()}catch{};
}


function renderPortfolioTop(stats){
 if(!$('portfolioTopBody'))return;const rows=(stats.details||[]).slice(0,5);$('portfolioTopBody').innerHTML=rows.length?rows.map(x=>{const idx=(state.config.watchlist||[]).indexOf(x.item),w=stats.exposureTotal>0?x.value/stats.exposureTotal*100:NaN,d=portfolioDecision(x.item,x.res);return `<tr><td><b>${escapeHtml(x.item.symbol)}</b><div class="watch-muted">${escapeHtml(portfolioClassLabel(x.item.type))}</div></td><td class="portfolio-weight">${Number.isFinite(w)?w.toFixed(1)+'%':'—'}</td><td>${fmtPortfolioMoney(x.value,stats.base)}<div class="watch-muted">${x.basis==='actual'?'precio actual':'fallback invertido'}</div></td><td>${escapeHtml(x.sector)}</td><td>${escapeHtml(x.region)}</td><td><span class="portfolio-risk-badge ${portfolioRiskBadgeClass(x.riskClass)}">${escapeHtml(x.riskClass)}</span></td><td><span class="portfolio-state ${d.key}">${escapeHtml(d.label)}</span></td><td><div class="portfolio-action-group"><button class="increase-btn" onclick="openQuickPortfolio('${x.item.symbol}','${x.item.type}','${x.item.tf}','Top 5 · Aumentar')">+ Aumentar</button><button class="reduce-btn" onclick="openReducePosition(${idx},false)">Reducir</button><button class="close-position-btn" onclick="openReducePosition(${idx},true)">Cerrar</button></div></td></tr>`}).join(''):'<tr><td colspan="8" class="watch-empty">Sin posiciones.</td></tr>';
}
function watchKey(item){return `${item.type}:${item.symbol}:${item.tf}`}
function watchSemaphore(plan,res,item){
 if(['argbond','on'].includes(item?.type))return res?.rf?{cls:'amber',label:'RENTA FIJA'}:{cls:'gray',label:'SIN DATOS'};
 if(!plan)return{cls:'gray',label:'SIN DATOS'};
 if(plan.status==='OPERABLE'&&plan.direction==='LONG')return{cls:'green',label:'OPERABLE LONG'};
 if(plan.status==='OPERABLE'&&plan.direction==='SHORT')return{cls:'red',label:'VENTA / SHORT'};
 if(plan.status==='ESPERAR CONFIRMACIÓN')return{cls:'amber',label:'ESPERAR'};
 return{cls:'gray',label:'SIN SETUP'};
}
function moneyForPosition(amount,pct){
 return Number.isFinite(amount)&&Number.isFinite(pct)?amount*(pct/100):NaN;
}
function fmtPositionMoney(v){
 return Number.isFinite(v)?new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(v):'—';
}
function updatePositionSizing(plan){
 const amount=Number($('positionSizeInput')?.value);
 if(plan&&Number.isFinite(amount)&&amount>0&&Number.isFinite(plan.entry)){
   state.config.lastPositionSize=amount;
   const qty=amount/plan.entry,pct2=Number.isFinite(plan.tp2)&&plan.entry>0?Math.abs(plan.tp2-plan.entry)/plan.entry*100:NaN;
   $('positionQty').textContent=Number.isFinite(qty)?qty.toFixed(4):'—';$('positionGain1').textContent=fmtPositionMoney(moneyForPosition(amount,plan.pct1));$('positionGain2').textContent=fmtPositionMoney(moneyForPosition(amount,pct2));$('positionLoss').textContent=fmtPositionMoney(moneyForPosition(amount,Math.abs(Number(plan.riskPct))));
 }else ['positionQty','positionGain1','positionGain2','positionLoss'].forEach(id=>{if($(id))$(id).textContent='—'});
 const capital=Number($('riskAccountCapital')?.value),riskPct=Number($('riskPerTradePct')?.value),cur=$('riskSizingCurrency')?.value||'ARS';
 if(capital>0)state.config.portfolioCapital=capital;if(riskPct>0)state.config.riskPerTradePct=riskPct;if(['ARS','USD'].includes(cur))state.config.portfolioBaseCurrency=cur;saveConfigBestEffort('risk-sizing-draft').catch(()=>{});
 const tradeRisk=Math.abs(Number(plan?.riskPct)),entry=Number(plan?.entry);
 if(!(capital>0)||!(riskPct>0)||!(tradeRisk>0)||!(entry>0)){['riskBudgetMoney','riskSuggestedPosition','riskSuggestedQty'].forEach(id=>{if($(id))$(id).textContent='—'});return}
 const budget=capital*riskPct/100,suggested=Math.min(capital,budget/(tradeRisk/100)),qty=suggested/entry;
 $('riskBudgetMoney').textContent=fmtPortfolioMoney(budget,cur);$('riskSuggestedPosition').textContent=fmtPortfolioMoney(suggested,cur);$('riskSuggestedQty').textContent=Number.isFinite(qty)?qty.toFixed(qty<1?6:4):'—';$('useSuggestedPositionBtn').dataset.amount=String(suggested);
}
function renderWatchlist(){
 const list=state.config.watchlist||[];list.forEach(ensureTransactionHistory);$('watchCount').textContent=list.length;
 if($('portfolioBaseCurrency'))$('portfolioBaseCurrency').value=state.config.portfolioBaseCurrency||'ARS';if($('portfolioReferenceCapital'))$('portfolioReferenceCapital').value=state.config.portfolioCapital||'';
 if(!list.length){$('watchBody').innerHTML='<tr><td colspan="21" class="watch-empty">Todavía no agregaste activos.</td></tr>';$('watchLongCount').textContent='0';$('watchShortCount').textContent='0';$('watchWaitCount').textContent='0';if($('watchCapital'))$('watchCapital').textContent='0';if($('watchPnl'))$('watchPnl').textContent='—';if($('watchExitCount'))$('watchExitCount').textContent='0';renderPortfolio360();renderDecisionCenter();return}
 let longs=0,shorts=0,waits=0,capital=0,totalPnl=0,pnlKnown=0,exitCount=0;
 const rows=list.map((item,idx)=>{
   const res=state.watchResults[watchKey(item)],sem=watchSemaphore(res?.plan,res,item);if(sem.cls==='green')longs++;else if(sem.cls==='red')shorts++;else waits++;
   const p=res?.plan,amount=Number(item.positionSize)||0,gain=moneyForPosition(amount,p?.pct1),loss=moneyForPosition(amount,Math.abs(Number(p?.riskPct))),sell=res?.sellAlert||sellAlertReason(item,res),pp=portfolioPnl(item,res),decision=portfolioDecision(item,res),cur=item.portfolioCurrency||defaultPortfolioCurrency(item.type);
   if(item.inPortfolio&&amount>0)capital+=amount;if(Number.isFinite(pp.pnl)){totalPnl+=pp.pnl;pnlKnown++}if(['exit','reduce'].includes(decision.key))exitCount++;
   const pc=Number.isFinite(pp.pnl)?pp.pnl>0?'pnl-pos':pp.pnl<0?'pnl-neg':'pnl-flat':'pnl-flat',real=Number(item.realizedPnl)||0;
   return `<tr><td><span class="semaforo"><i class="light ${sem.cls}"></i>${sem.label}</span></td><td><div class="watch-symbol">${item.symbol}</div><div class="watch-muted">${typeLabel(item.type)}</div>${item.inPortfolio&&item.buyPrice>0?`<div class="watch-muted">Promedio ${fmt(item.buyPrice)}</div>`:''}</td>
   <td>${item.inPortfolio?'<span class="green">● En cartera</span>':(item.transactions?.length?'<span class="watch-muted">Histórica</span>':'—')}</td><td>${res?.tfLabel||item.tf}</td><td>${res?.macroTrend||'—'}</td><td>${Number.isFinite(p?.score)?p.score+'/100':'—'}</td><td>${Number.isFinite(p?.entryLow)?fmt(p.entryLow)+'–'+fmt(p.entryHigh):'—'}</td><td>${Number.isFinite(p?.stop)?fmt(p.stop):'—'}</td>
   <td>${Number.isFinite(p?.tp1)?fmt(p.tp1):'—'}</td><td>${Number.isFinite(p?.pct1)?p.pct1.toFixed(2)+'%':'—'}</td><td>${amount>0?fmtPositionMoney(amount):'—'}</td><td>${Number(item.quantity)>0?Number(item.quantity).toFixed(Number(item.quantity)<1?6:4):'—'}</td><td><span class="currency-chip">${cur}</span></td><td>${Number.isFinite(pp.price)?fmt(pp.price):'—'}</td>
   <td class="${pc}">${Number.isFinite(pp.pnl)?`${pp.pnl>=0?'+':''}${fmtPositionMoney(pp.pnl)} ${cur} (${pp.pct>=0?'+':''}${pp.pct.toFixed(2)}%)`:'—'}</td><td class="${real>0?'pnl-pos':real<0?'pnl-neg':'pnl-flat'}">${real?`${real>=0?'+':''}${fmtPositionMoney(real)} ${cur}`:'—'}</td><td><span class="portfolio-state ${decision.key}">${decision.label}</span></td>
   <td>${Number.isFinite(gain)?fmtPositionMoney(gain)+' '+cur:'—'}</td><td>${Number.isFinite(loss)?fmtPositionMoney(loss)+' '+cur:'—'}</td><td class="watch-alert-reason">${sell?`<span class="red">⚠ ${sell.text}</span>`:(res?.error?`<span class="watch-error">${res.error}</span>`:escapeHtml(decision.why))}</td>
   <td><div class="portfolio-row-actions"><button class="watch-open" onclick="openWatchItem(${idx})">Abrir</button>${item.inPortfolio?`<button class="increase-btn" onclick="openQuickPortfolio('${item.symbol}','${item.type}','${item.tf}','Aumentar posición')">+ Aumentar</button><button class="reduce-btn" onclick="openReducePosition(${idx},false)">Reducir</button><button class="close-position-btn" onclick="openReducePosition(${idx},true)">Cerrar</button>`:''}<button class="watch-remove" onclick="removeWatchItem(${idx},this)">Quitar</button></div></td></tr>`;
 }).join('');
 $('watchBody').innerHTML=rows;$('watchLongCount').textContent=longs;$('watchShortCount').textContent=shorts;$('watchWaitCount').textContent=waits;if($('watchCapital'))$('watchCapital').textContent=fmtPositionMoney(capital);
 if($('watchPnl')){$('watchPnl').textContent=pnlKnown?`${totalPnl>=0?'+':''}${fmtPositionMoney(totalPnl)} (mixto)`:'—';$('watchPnl').className=totalPnl>0?'green':totalPnl<0?'red':''}if($('watchExitCount'))$('watchExitCount').textContent=exitCount;
 renderPortfolio360();try{runDataValidation()}catch{};try{renderDecisionCenter()}catch{};
}
async function addWatchItem(){
 const raw=normSymbol($('watchSymbol').value),selectedType=$('watchType').value,tf=$('watchTf').value;if(!raw)return;
 const type=resolveWatchType(raw,selectedType),symbol=displaySymbolForType(raw,type),positionSize=Number($('watchPosition').value)||0,buyPrice=Number($('watchBuyPrice').value)||0,inPortfolio=!!$('watchInPortfolio').checked,portfolioCurrency=$('watchCurrency')?.value||defaultPortfolioCurrency(type);
 let item=state.config.watchlist.find(x=>x.symbol===symbol&&x.type===type&&x.tf===tf),existed=!!item;if(!item){item={symbol,type,tf,positionSize:0,buyPrice:0,inPortfolio:false,portfolioCurrency,sector:portfolioFallbackSector({symbol,type}),transactions:[]};state.config.watchlist.push(item)}
 item.portfolioCurrency=portfolioCurrency;item.sector=item.sector||portfolioFallbackSector(item);ensureTransactionHistory(item);const txBefore=item.transactions.length;
 if(inPortfolio&&positionSize>0&&buyPrice>0){let src=null;if(item.transactions.length===0||!item.inPortfolio)src='alta manual';else if(await window.radarConfirm('La posición ya existe. ¿Querés sumar este importe como una compra adicional?',{title:'Aumentar posición',confirmLabel:'Sumar compra',tone:'info'}))src='aumento manual';if(src){const draft={id:txId(),type:'BUY',ts:Date.now(),qty:positionSize/buyPrice,price:buyPrice,amount:positionSize,fees:0,currency:portfolioCurrency,source:src,g2Native:true,g2CashImpactApplied:true};await g2PortfolioCommitMutation(item,draft,()=>addPortfolioBuy(item,positionSize,buyPrice,0,src,draft));window.radarMarkPortfolioAnalyticsStale?.(`Cambio de cartera · ${symbol}`)}}

 state.config.lastPositionSize=positionSize||state.config.lastPositionSize;try{await saveConfigStrict()}catch(e){renderWatchlist();$('watchSymbol').value='';$('watchBuyPrice').value='';$('watchInPortfolio').checked=false;$('watchType').value='auto';throw e}$('watchSymbol').value='';$('watchBuyPrice').value='';$('watchInPortfolio').checked=false;$('watchType').value='auto';renderWatchlist();
 await refreshSingleWatchItem(item,false);await saveConfigBestEffort('watchlist-market-refresh');renderWatchlist();window.radarNotify?.(`${symbol} ${existed?'actualizado':'agregado'} en Seguimiento${item.inPortfolio?' y Cartera':''}.`,'ok');
}
async function removeWatchItem(idx,control=null){
 const item=state.config.watchlist?.[idx];if(!item)return;const identity=[item.symbol,item.type,item.tf].map(x=>String(x||'')).join('|'),symbol=item.symbol;
 const run=async()=>{const currentIdx=state.config.watchlist?.indexOf(item)??-1;if(currentIdx<0){window.radarNotify?.(`${symbol} ya no está en Seguimiento.`,'info');return}ensureTransactionHistory(item);if(item.inPortfolio){window.radarNotify?.('No se puede quitar un activo con una posición abierta. Primero reducí o cerrá la posición.','warn');return}if((item.transactions||[]).length&&!await window.radarConfirm('Este activo tiene historial de cartera. Quitar de Seguimiento también eliminará ese historial del archivo de configuración. ¿Continuar?',{title:'Quitar de Seguimiento',confirmLabel:'Quitar',tone:'warn'}))return;const resolvedIdx=state.config.watchlist?.indexOf(item)??-1;if(resolvedIdx<0){window.radarNotify?.(`${symbol} ya no está en Seguimiento.`,'info');return}state.config.watchlist.splice(resolvedIdx,1);try{await saveConfigStrict()}catch(e){renderWatchlist();return}renderWatchlist();window.radarNotify?.(`${symbol} quitado de Seguimiento.`,'info')};
 if(window.radarRunAction)return window.radarRunAction(run,{key:`watchlist:remove:${identity}`,control,errorMessage:`No se pudo quitar ${symbol} de Seguimiento`});return run();
}
function openWatchItem(idx){
 const item=state.config.watchlist[idx];if(!item)return;
 $('symbol').value=item.symbol;$('assetType').value=resolveWatchType(item.symbol,item.type);
 if(['argbond','on'].includes(item.type)){loadBondAnalysis(item.symbol,item.type);return}
 if(item.positionSize>0)$('positionSizeInput').value=item.positionSize;
 showAnalysisView();loadAll().then(()=>{if(state.tfs?.[item.tf]&&state.analyses?.[item.tf])renderChart(item.tf)});
}
async function fetchSeriesForWatch(item,key){
 const tfs=getTfsForType(item.type),tf=tfs[key];
 if(!tf)throw new Error('Timeframe no disponible');
 if(item.type==='crypto')return await fetchBinance(item.symbol,tf.interval);
 if(item.type==='stock')return await fetchYahoo(item.symbol,tf.interval,tf.range);
 const daily=await fetchBymaHistory(item.symbol);
 if(key==='short')return daily.slice(-700);
 if(key==='medium')return aggregateBars(daily,'week').slice(-700);
 if(key==='macro')return aggregateBars(daily,'month').slice(-700);
 throw new Error('Micro no disponible para BYMA gratuito');
}
async function analyzeWatchItem(item){
 repairWatchItem(item);
 if(['argbond','on'].includes(item.type)){
   const payload=await fetchFixedIncomeAnalytics();
   const b=(payload.bonds||[]).find(x=>rfTickerCandidates(item.symbol).includes(String(x.ticker||'').toUpperCase()));
   return{fixedIncome:true,rf:b||null,countryRisk:payload.countryRisk||null,tfLabel:'Renta fija',macroTrend:'—',plan:null,analysis:null};
 }
 let tfs=getTfsForType(item.type);
 let key=item.tf;
 if(!tfs[key])key='short';
 let data;
 try{
   data=await fetchSeriesForWatch(item,key);
 }catch(e){
   // Safety net: if a ticker was incorrectly typed as crypto, retry it as a US stock.
   if(item.type==='crypto'&&!looksCrypto(item.symbol)){
     item.type='stock';
     item.autoCorrectedFrom='crypto';
     tfs=getTfsForType(item.type);
     key=tfs[key]?key:'short';
     data=await fetchSeriesForWatch(item,key);
     saveConfigBestEffort('watchlist-type-autocorrection').catch(()=>{});
   }else{
     throw e;
   }
 }
 const a=await analyzeSeriesRuntime(data,key,{symbol:item.symbol,timeframe:tfs[key]?.interval,source:'Watchlist',standalone:true});
 const plan=computeTradePlan(a,true);
 let macroTrend='—';
 if(key==='macro')macroTrend=a.trend;
 else if(tfs.macro){
   try{
     const md=await fetchSeriesForWatch(item,'macro');
     macroTrend=(await analyzeSeriesRuntime(md,'macro',{symbol:item.symbol,timeframe:tfs.macro?.interval,source:'Watchlist macro'})).trend;
   }catch{}
 }
 return{plan,analysis:a,macroTrend,tfLabel:tfs[key]?.label||key};
}
async function refreshSingleWatchItem(item,render=true){
 const key=watchKey(item),previous=state.watchResults[key];
 try{
   const current=await analyzeWatchItem(item);
   maybeNotifySell(item,current,previous);advancedWatchAlerts(item,current,previous);state.watchResults[key]=current;
   const px=currentWatchPrice(current,null);if(Number.isFinite(px)&&px>0){item.lastPrice=px;item.lastPriceAt=Date.now();item.lastPriceSource=item.type==='crypto'?'Binance':item.type==='stock'?'Yahoo Finance':['argstock','cedear'].includes(item.type)?'Open BYMADATA':'Renta fija'}
   if(item.inPortfolio&&current?.plan){
     if(Number.isFinite(Number(current.plan.stop)))item.technicalStop=Number(current.plan.stop);if(Number.isFinite(Number(current.plan.tp1)))item.technicalTp1=Number(current.plan.tp1);if(Number.isFinite(Number(current.plan.entryLow)))item.technicalEntryLow=Number(current.plan.entryLow);if(Number.isFinite(Number(current.plan.entryHigh)))item.technicalEntryHigh=Number(current.plan.entryHigh);if(Number.isFinite(Number(current.plan.trigger)))item.technicalTrigger=Number(current.plan.trigger);item.technicalScore=Number(current.plan.score)||null;item.technicalDirection=current.plan.direction||item.technicalDirection||'LONG';item.technicalUpdatedAt=Date.now();
     const pd=portfolioDecision(item,current);if(item.lastPortfolioDecision!==pd.key){recordDecisionAudit({source:'Monitor Cartera',symbol:item.symbol,decision:pd.label,action:pd.key==='exit'?'Salir':pd.key==='reduce'?'Reducir':pd.key==='watch'?'Vigilar':'Mantener',score:current.plan.score,data:{price:current.analysis?.c,stop:current.plan.stop,tp1:current.plan.tp1},reason:pd.why});item.lastPortfolioDecision=pd.key}item.lastPortfolioScore=Number(current.plan.score)||item.lastPortfolioScore;
   }
   try{await captureWatchDecision(item,current)}catch(e){}
 }catch(e){state.watchResults[key]={error:String(e.message||e),plan:null};}
 if(render)renderWatchlist();return state.watchResults[key];
}
let portfolioHydrateRunning=false;
async function hydratePortfolioLiveData(force=false){
 if(portfolioHydrateRunning)return;portfolioHydrateRunning=true;
 try{
   const now=Date.now(),items=(state.config.watchlist||[]).filter(x=>x.inPortfolio);
   for(const item of items){const live=currentWatchPrice(state.watchResults[watchKey(item)],item),stale=!Number(item.lastPriceAt)||now-Number(item.lastPriceAt)>15*60*1000;if(force||!Number.isFinite(live)||stale)await refreshSingleWatchItem(item,false)}
   renderWatchlist();try{await saveConfigBestEffort('portfolio-price-refresh-cache')}catch{}
 }finally{portfolioHydrateRunning=false}
}
async function refreshWatchlist(silent=false){
 const btn=$('refreshWatchlistBtn');if(!silent){btn.disabled=true;btn.textContent='Actualizando…'}
 for(const item of (state.config.watchlist||[])){await refreshSingleWatchItem(item,false);renderWatchlist()}
 v78.lastBrowserMonitor=Date.now();renderMonitorStatus();try{await saveConfigBestEffort('watchlist-refresh-cache')}catch{}
 if(!silent){btn.disabled=false;btn.textContent=portfolioUiMode==='watchlist'?'Actualizar seguimiento':'Actualizar cartera'}
}
function updatePortfolioSubnav(active){
 document.querySelectorAll('.portfolio-subnav-btn').forEach(b=>b.classList.remove('active'));
 const id=active==='portfolio'?'portfolioJumpBtn':active==='risk'?'riskJumpBtn':'watchlistJumpBtn';if($(id))$(id).classList.add('active');
}
function showWatchlistView(){
 setPortfolioUiMode('watchlist');setInstitutionalView('watchlistViewBtn','Seguimiento','Activos · alertas · disparadores · monitoreo');hideAllMainViews();setTechnicalStatusVisible(false);$('watchlistView').classList.add('active');renderWatchlist();updatePortfolioSubnav('watchlist');requestAnimationFrame(()=>$('watchlistSection')?.scrollIntoView({behavior:'smooth',block:'start'}))
}
function showPortfolioView(){
 setPortfolioUiMode('portfolio');setInstitutionalView('portfolioViewBtn','Cartera 360','P&L · riesgo · diversificación · exposición');hideAllMainViews();setTechnicalStatusVisible(false);$('watchlistView').classList.add('active');renderWatchlist();updatePortfolioSubnav('portfolio');requestAnimationFrame(()=>$('portfolio360Section')?.scrollIntoView({behavior:'smooth',block:'start'}));hydratePortfolioLiveData(false).catch(()=>{})
}
function showPortfolioRiskView(){
 setPortfolioUiMode('risk');setInstitutionalView('portfolioViewBtn','Riesgo & Performance','Correlación · contribución al riesgo · benchmark · escenarios de estrés');hideAllMainViews();setTechnicalStatusVisible(false);$('watchlistView').classList.add('active');renderWatchlist();updatePortfolioSubnav('risk');requestAnimationFrame(()=>$('portfolioRiskSection')?.scrollIntoView({behavior:'smooth',block:'start'}));hydratePortfolioLiveData(false).catch(()=>{});window.radarRefreshPortfolioAnalyticsIfStale?.().catch?.(()=>{})
}
function showAnalysisView(){
 window.radarCaptureDrillOrigin?.();
 setInstitutionalView(null,'Análisis técnico','Activo puntual · estructura, tendencia, momentum, entrada, stop y objetivos');hideAllMainViews();setTechnicalStatusVisible(true);$('analysisView').classList.remove('hidden');scheduleAnalysisChartResize();setTimeout(()=>scheduleAnalysisChartResize(),220)}

;

/* ===== RUNTIME BLOCK 22 ===== */
// Radar Técnico G2 — Phase 9W — Signal Audit compatibility runtime
// Ownership extraction only: journal, signal capture, audit, CSV/history runtime.

const SIGNAL_STORE_KEY='radar_signal_journal_v73';
const signalJournal={signals:[],loaded:false,saving:false,evaluating:false,lastSave:0};

function signalDateKey(ts){const d=new Date(Number(ts)||Date.now());return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function signalFingerprint(x){return [x.source,x.symbol,x.type,x.key||'',x.kind,signalDateKey(x.ts)].join('|')}
function signalId(){return 'SIG-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase()}
function signalKindLabel(k){return k==='buy'?'COMPRA':k==='near'?'OPORTUNIDAD CERCA':k==='sell'?'VENTA / SHORT':k==='exit'?'SALIR':k==='reduce'?'REDUCIR':String(k||'SEÑAL').toUpperCase()}
function signalSourceLabel(s){return s==='scanner-rv'?'Escáner RV':s==='scanner-rf'?'Escáner RF':s==='watchlist'?'Seguimiento':s||'—'}
function signalOutcomeInfo(s){const o=s.auditStatus||'OPEN';if(o==='WIN')return{cls:'win',text:'TP1'};if(o==='LOSS')return{cls:'loss',text:'STOP'};if(o==='AMBIGUOUS')return{cls:'amb',text:'AMBIGUO'};if(o==='UNTRIGGERED')return{cls:'trigger',text:'SIN TRIGGER'};if(o==='TRIGGERED')return{cls:'trigger',text:'TRIGGERED'};if(o==='NOT_COMPARABLE')return{cls:'info',text:'INFORMATIVA'};if(o==='NO_LEVELS')return{cls:'info',text:'SIN NIVELES'};if(o==='ERROR')return{cls:'loss',text:'ERROR AUDIT.'};return{cls:'open',text:'ABIERTA'}}
function signalIsAuditable(s){return s?.source==='scanner-rv'&&['buy','near','sell'].includes(s.kind)&&['crypto','stock','argstock','cedear'].includes(s.type)}
function signalEntryText(s){if(Number.isFinite(Number(s.entryLow))&&Number.isFinite(Number(s.entryHigh)))return `${fmt(Number(s.entryLow))}–${fmt(Number(s.entryHigh))}`;return Number.isFinite(Number(s.entryRef))?fmt(Number(s.entryRef)):'—'}
function signalScoreText(s){const a=[];if(Number.isFinite(Number(s.scoreOpportunity)))a.push(`Opp ${Math.round(Number(s.scoreOpportunity))}`);if(Number.isFinite(Number(s.scoreTechnical)))a.push(`Tec ${Math.round(Number(s.scoreTechnical))}`);if(Number.isFinite(Number(s.rfScore)))a.push(`RF ${Math.round(Number(s.rfScore))}`);return a.length?a.join(' / '):'—'}

function loadSignalLocal(){try{const j=JSON.parse(localStorage.getItem(SIGNAL_STORE_KEY)||'{}');if(Array.isArray(j.signals))signalJournal.signals=j.signals}catch{}}
async function loadSignalJournal(){
 loadSignalLocal();
 try{
   const c=new AbortController(),tm=setTimeout(()=>c.abort(),5000);let r;
   try{r=await fetch('/api/signals',{cache:'no-store',signal:c.signal})}finally{clearTimeout(tm)}
   if(r.ok){const j=await r.json();if(Array.isArray(j.signals)){signalJournal.signals=j.signals;localStorage.setItem(SIGNAL_STORE_KEY,JSON.stringify({signals:signalJournal.signals}))}}
 }catch(e){console.warn('Signal journal server fallback',e)}
 signalJournal.loaded=true;renderSignalHistory();return signalJournal.signals;
}
async function saveSignalJournal(){
 const payload={version:1,signals:signalJournal.signals};
 try{localStorage.setItem(SIGNAL_STORE_KEY,JSON.stringify(payload))}catch{}
 if(signalJournal.saving)return;
 signalJournal.saving=true;
 try{const r=await fetch('/api/signals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(await r.text());signalJournal.lastSave=Date.now()}
 catch(e){console.warn('No se pudo guardar historial en archivo',e)}
 finally{signalJournal.saving=false}
}
function upsertSignal(record){
 const fp=signalFingerprint(record),prev=signalJournal.signals.find(x=>x.fingerprint===fp);
 if(prev){prev.lastSeen=Date.now();prev.seenCount=(prev.seenCount||1)+1;prev.latestScoreOpportunity=record.scoreOpportunity;prev.latestReason=record.reason;return prev}
 record.id=record.id||signalId();record.fingerprint=fp;record.createdAt=record.ts||Date.now();record.lastSeen=record.createdAt;record.seenCount=1;
 try{recordSignalAudit(record)}catch{}
 signalJournal.signals.unshift(record);signalJournal.signals=signalJournal.signals.slice(0,5000);return record;
}
function scannerSignalRecord(r,source='scanner-rv'){
 const p=r.plan||{},a=r.analysis||{},kind=r.status?.kind,rf=r.rf||{};
 return{ts:Date.now(),source,symbol:r.item?.symbol||'',type:r.item?.type||'',key:r.key||'medium',tfLabel:r.tfLabel||r.key||'—',kind,label:r.status?.label||signalKindLabel(kind),
 direction:p.direction||(kind==='sell'?'SHORT':'LONG'),price:Number.isFinite(Number(r.price))?Number(r.price):Number.isFinite(Number(a.c))?Number(a.c):Number.isFinite(Number(rf.price))?Number(rf.price):null,
 entryLow:Number.isFinite(Number(p.entryLow))?Number(p.entryLow):null,entryHigh:Number.isFinite(Number(p.entryHigh))?Number(p.entryHigh):null,stop:Number.isFinite(Number(p.stop))?Number(p.stop):null,tp1:Number.isFinite(Number(p.tp1))?Number(p.tp1):null,rr1:Number.isFinite(Number(p.rr1))?Number(p.rr1):null,
 scoreTechnical:Number.isFinite(Number(p.score))?Number(p.score):null,scoreOpportunity:Number.isFinite(Number(r.status?.oppScore))?Number(r.status.oppScore):null,rfScore:Number.isFinite(Number(r.score??r.rfScore))?Number(r.score??r.rfScore):null,
 macroTrend:r.macroTrend||'—',marketAdjustment:Number.isFinite(Number(r.marketContext?.adjustment))?Number(r.marketContext.adjustment):null,reason:String(r.why||'').replace(/<[^>]+>/g,''),
 auditStatus:source==='scanner-rf'?'NOT_COMPARABLE':'OPEN',outcome:null,mfePct:null,maePct:null,rMultiple:null,resolvedAt:null,triggeredAt:null,lastPrice:null};
}
async function captureScannerSignals(){
 const rfMode=typeof isFixedIncomeUniverse==='function'&&isFixedIncomeUniverse($('scanUniverse')?.value),source=rfMode?'scanner-rf':'scanner-rv';let added=0;
 for(const r of (state.scan.results||[])){if(!['buy','near','sell'].includes(r.status?.kind))continue;const before=signalJournal.signals.length;upsertSignal(scannerSignalRecord(r,source));if(signalJournal.signals.length>before)added++}
 if(added||state.scan.results?.length)await saveSignalJournal();renderSignalHistory();return added;
}
async function captureDedicatedRfSignals(){
 let added=0;
 for(const r of (rfScanState.results||[])){
   if(!['buy','near','sell'].includes(r.status?.kind))continue;
   const rec={ts:Date.now(),source:'scanner-rf',symbol:r.item?.symbol||'',type:r.item?.type||'',key:'medium',tfLabel:rfClassLabel(r.rf?.rfClass),kind:r.status.kind,label:r.status.label,direction:'LONG',
   price:Number.isFinite(Number(r.rf?.price))?Number(r.rf.price):null,entryLow:null,entryHigh:null,stop:null,tp1:null,rr1:null,scoreTechnical:null,scoreOpportunity:null,rfScore:Number.isFinite(Number(r.score))?Number(r.score):null,
   macroTrend:'—',marketAdjustment:null,reason:String(r.why||'').replace(/<[^>]+>/g,''),auditStatus:'NOT_COMPARABLE',outcome:null,mfePct:null,maePct:null,rMultiple:null,resolvedAt:null,triggeredAt:null,lastPrice:null};
   const before=signalJournal.signals.length;upsertSignal(rec);if(signalJournal.signals.length>before)added++;
 }
 if(added||rfScanState.results?.length)await saveSignalJournal();renderSignalHistory();return added;
}
async function captureWatchDecision(item,res){
 if(!item?.inPortfolio)return;const d=portfolioDecision(item,res);if(!['exit','reduce'].includes(d.key))return;const pp=portfolioPnl(item,res);
 const rec={ts:Date.now(),source:'watchlist',symbol:item.symbol,type:item.type,key:item.tf||'short',tfLabel:res?.tfLabel||item.tf||'—',kind:d.key,label:d.label,direction:'EXIT',price:Number.isFinite(pp.price)?pp.price:null,
 entryLow:null,entryHigh:null,stop:Number.isFinite(Number(res?.plan?.stop))?Number(res.plan.stop):null,tp1:null,rr1:null,scoreTechnical:Number.isFinite(Number(res?.plan?.score))?Number(res.plan.score):null,scoreOpportunity:null,rfScore:null,macroTrend:res?.macroTrend||'—',marketAdjustment:null,
 reason:d.why,pnlAtSignal:Number.isFinite(pp.pct)?pp.pct:null,auditStatus:'NOT_COMPARABLE',outcome:null,mfePct:null,maePct:null,rMultiple:null,resolvedAt:null,triggeredAt:null,lastPrice:pp.price};
 const before=signalJournal.signals.length;upsertSignal(rec);if(signalJournal.signals.length>before)await saveSignalJournal();renderSignalHistory();
}
async function fetchSignalAuditSeries(s){return (await fetchScannerSeries({symbol:s.symbol,type:s.type},s.key||'medium')).data}
function signalBarAfterTs(bar,ts){return Number(bar?.time)*1000>Number(ts||0)+1000}
function signalZoneTouched(bar,s){const lo=Number(s.entryLow),hi=Number(s.entryHigh);return Number.isFinite(lo)&&Number.isFinite(hi)&&Number(bar.low)<=Math.max(lo,hi)&&Number(bar.high)>=Math.min(lo,hi)}
function auditMfeMae(bars,entry,isShort){
 if(!bars.length||!Number.isFinite(entry)||entry<=0)return{mfe:null,mae:null};
 const hs=bars.map(b=>Number(b.high)).filter(Number.isFinite),ls=bars.map(b=>Number(b.low)).filter(Number.isFinite);if(!hs.length||!ls.length)return{mfe:null,mae:null};
 const maxH=Math.max(...hs),minL=Math.min(...ls);
 return isShort?{mfe:(entry-minL)/entry*100,mae:(entry-maxH)/entry*100}:{mfe:(maxH-entry)/entry*100,mae:(minL-entry)/entry*100};
}
async function auditSignalRecord(s){
 if(!signalIsAuditable(s)){s.auditStatus='NOT_COMPARABLE';s.auditedAt=Date.now();return s}
 if(!Number.isFinite(Number(s.stop))||!Number.isFinite(Number(s.tp1))){s.auditStatus='NO_LEVELS';s.auditedAt=Date.now();return s}
 try{
   const bars=await fetchSignalAuditSeries(s);
   try{
     const features=await g2RuntimeFeatures();
     if(features?.technicalValidation){
       const r=await g2TechnicalValidationPost('signal-audit',{signal:{ts:s.ts,kind:s.kind,direction:s.direction,price:s.price,entryLow:s.entryLow,entryHigh:s.entryHigh,stop:s.stop,tp1:s.tp1},bars});
       const auditTs=v=>{const n=typeof v==='number'?v:Date.parse(String(v||''));return Number.isFinite(n)?n:null};
       s.auditStatus=r.auditStatus||'OPEN';s.entryRef=r.entryRef!=null&&Number.isFinite(Number(r.entryRef))?Number(r.entryRef):null;s.triggeredAt=auditTs(r.triggeredAt);s.resolvedAt=auditTs(r.resolvedAt);s.lastPrice=r.lastPrice!=null&&Number.isFinite(Number(r.lastPrice))?Number(r.lastPrice):null;s.currentPct=r.currentPct!=null&&Number.isFinite(Number(r.currentPct))?Number(r.currentPct):null;s.mfePct=r.mfePct!=null&&Number.isFinite(Number(r.mfePct))?Number(r.mfePct):null;s.maePct=r.maePct!=null&&Number.isFinite(Number(r.maePct))?Number(r.maePct):null;s.rMultiple=r.rMultiple!=null&&Number.isFinite(Number(r.rMultiple))?Number(r.rMultiple):null;s.auditedAt=Date.now();return s;
     }
   }catch(g2e){console.warn('G2 Signal Audit -> legacy fallback',s.symbol||'',g2e)}
   const future=bars.filter(b=>signalBarAfterTs(b,s.ts));
   if(!future.length){s.auditStatus='OPEN';s.auditedAt=Date.now();return s}
   const short=String(s.direction).toUpperCase()==='SHORT'||s.kind==='sell';let entry=Number(s.price),activeBars=future;
   if(s.kind==='near'){
     const ix=future.findIndex(b=>signalZoneTouched(b,s));
     if(ix<0){s.auditStatus='UNTRIGGERED';s.lastPrice=Number(future.at(-1)?.close)||s.lastPrice;s.auditedAt=Date.now();return s}
     s.triggeredAt=Number(future[ix].time)*1000;entry=(Number(s.entryLow)+Number(s.entryHigh))/2;activeBars=future.slice(ix);
   }else if(Number.isFinite(Number(s.entryLow))&&Number.isFinite(Number(s.entryHigh))){
     entry=Number.isFinite(Number(s.price))?Number(s.price):(Number(s.entryLow)+Number(s.entryHigh))/2;
   }
   if(!Number.isFinite(entry)||entry<=0){s.auditStatus='NO_LEVELS';s.auditedAt=Date.now();return s}
   s.entryRef=entry;const stop=Number(s.stop),tp=Number(s.tp1);let status='OPEN',resolvedAt=null,usedBars=activeBars;
   for(let i=0;i<activeBars.length;i++){
     const b=activeBars[i],hitStop=short?Number(b.high)>=stop:Number(b.low)<=stop,hitTp=short?Number(b.low)<=tp:Number(b.high)>=tp;
     if(hitStop&&hitTp){status='AMBIGUOUS';resolvedAt=Number(b.time)*1000;usedBars=activeBars.slice(0,i+1);break}
     if(hitTp){status='WIN';resolvedAt=Number(b.time)*1000;usedBars=activeBars.slice(0,i+1);break}
     if(hitStop){status='LOSS';resolvedAt=Number(b.time)*1000;usedBars=activeBars.slice(0,i+1);break}
   }
   const mm=auditMfeMae(usedBars,entry,short);s.mfePct=Number.isFinite(mm.mfe)?mm.mfe:null;s.maePct=Number.isFinite(mm.mae)?mm.mae:null;s.auditStatus=status;s.resolvedAt=resolvedAt;s.lastPrice=Number(activeBars.at(-1)?.close)||null;
   if(status==='WIN'){const risk=Math.abs(entry-stop),reward=Math.abs(tp-entry);s.rMultiple=risk>0?reward/risk:null}else if(status==='LOSS')s.rMultiple=-1;else s.rMultiple=null;
   if(Number.isFinite(s.lastPrice))s.currentPct=short?(entry-s.lastPrice)/entry*100:(s.lastPrice-entry)/entry*100;s.auditedAt=Date.now();return s;
 }catch(e){s.auditStatus='ERROR';s.auditError=String(e.message||e);s.auditedAt=Date.now();return s}
}
async function auditAllSignals(){
 if(signalJournal.evaluating)return;const targets=signalJournal.signals.filter(signalIsAuditable);if(!targets.length){renderSignalHistory();return}
 signalJournal.evaluating=true;$('signalAuditBtn').disabled=true;$('signalAuditProgress').classList.add('active');let cursor=0,done=0;const workers=Math.min(3,targets.length);
 const worker=async()=>{while(true){const i=cursor++;if(i>=targets.length)return;await auditSignalRecord(targets[i]);done++;$('signalAuditText').textContent=`Auditando ${done}/${targets.length}`;$('signalAuditBar').style.width=(done/targets.length*100).toFixed(1)+'%';if(done%3===0||done===targets.length){renderSignalHistory();await saveSignalJournal()}await new Promise(r=>setTimeout(r,80))}};
 try{await Promise.all(Array.from({length:workers},()=>worker()));await saveSignalJournal()}finally{signalJournal.evaluating=false;$('signalAuditBtn').disabled=false;$('signalAuditProgress').classList.remove('active');$('signalAuditBar').style.width='0%';renderSignalHistory()}
}
function signalFilteredRows(){
 let rows=[...signalJournal.signals],source=$('signalSourceFilter')?.value||'all',out=$('signalOutcomeFilter')?.value||'all',days=Number($('signalPeriodFilter')?.value)||0;
 if(source!=='all')rows=rows.filter(x=>x.source===source);if(days>0){const cut=Date.now()-days*86400000;rows=rows.filter(x=>Number(x.ts)>=cut)}
 if(out!=='all'){if(out==='open')rows=rows.filter(x=>['OPEN','TRIGGERED','ERROR'].includes(x.auditStatus||'OPEN'));else if(out==='resolved')rows=rows.filter(x=>['WIN','LOSS','AMBIGUOUS'].includes(x.auditStatus));else if(out==='win')rows=rows.filter(x=>x.auditStatus==='WIN');else if(out==='loss')rows=rows.filter(x=>x.auditStatus==='LOSS');else if(out==='untriggered')rows=rows.filter(x=>x.auditStatus==='UNTRIGGERED');else if(out==='info')rows=rows.filter(x=>['NOT_COMPARABLE','NO_LEVELS'].includes(x.auditStatus))}
 return rows.sort((a,b)=>Number(b.ts)-Number(a.ts));
}
function renderSignalHistory(){
 if(!$('signalBody'))return;const all=signalJournal.signals||[],aud=all.filter(signalIsAuditable),wins=aud.filter(x=>x.auditStatus==='WIN'),losses=aud.filter(x=>x.auditStatus==='LOSS'),amb=aud.filter(x=>x.auditStatus==='AMBIGUOUS');
 const resolved=wins.length+losses.length,open=aud.filter(x=>['OPEN','TRIGGERED','ERROR'].includes(x.auditStatus||'OPEN')).length,untrig=aud.filter(x=>x.auditStatus==='UNTRIGGERED').length,wr=resolved?wins.length/resolved*100:NaN;
 const rs=[...wins,...losses].map(x=>Number(x.rMultiple)).filter(Number.isFinite),avgR=rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:NaN;
 $('sigTotal').textContent=all.length;$('sigAuditable').textContent=aud.length;$('sigResolved').textContent=resolved;$('sigWinRate').textContent=Number.isFinite(wr)?wr.toFixed(1)+'%':'—';$('sigOpen').textContent=open;$('sigUntriggered').textContent=untrig;$('sigAvgR').textContent=Number.isFinite(avgR)?avgR.toFixed(2)+'R':'—';
 const note=$('signalEvidenceNote');if(note){if(resolved<20)note.innerHTML=`<b>Muestra todavía insuficiente:</b> ${resolved} señales técnicas resueltas. Radar no debe sacar conclusiones estadísticas fuertes hasta acumular al menos unas 20–30 observaciones comparables.`;else if(resolved<50)note.innerHTML=`<b>Muestra inicial:</b> ${resolved} señales resueltas · win rate ${wr.toFixed(1)}% · ${amb.length} ambiguas excluidas. Ya permite observar patrones, pero todavía es una muestra moderada.`;else note.innerHTML=`<b>Muestra útil:</b> ${resolved} señales resueltas · win rate ${wr.toFixed(1)}% · R promedio ${Number.isFinite(avgR)?avgR.toFixed(2):'—'}R · ${amb.length} ambiguas excluidas. Conviene segmentar luego por mercado y timeframe.`}
 const rows=signalFilteredRows();if(!rows.length){$('signalBody').innerHTML='<tr><td colspan="15" class="signal-empty">No hay señales para este filtro.</td></tr>';return}
 $('signalBody').innerHTML=rows.map(s=>{const out=signalOutcomeInfo(s),mfe=Number(s.mfePct),mae=Number(s.maePct),rm=Number(s.rMultiple),date=new Date(Number(s.ts)).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
 return `<tr><td class="signal-num">${date}<span class="signal-sub">${s.seenCount>1?`detectada ${s.seenCount} veces`:''}</span></td><td><b>${escapeHtml(s.symbol)}</b><span class="signal-sub">${escapeHtml(typeLabel(s.type))}</span></td><td>${escapeHtml(signalSourceLabel(s.source))}</td>
 <td><span class="signal-kind ${s.kind}">${escapeHtml(signalKindLabel(s.kind))}</span></td><td>${escapeHtml(s.tfLabel||s.key||'—')}</td><td class="signal-num">${Number.isFinite(Number(s.price))?fmt(Number(s.price)):'—'}</td><td class="signal-num">${signalEntryText(s)}</td>
 <td class="signal-num">${Number.isFinite(Number(s.stop))?fmt(Number(s.stop)):'—'}</td><td class="signal-num">${Number.isFinite(Number(s.tp1))?fmt(Number(s.tp1)):'—'}</td><td>${signalScoreText(s)}</td>
 <td><span class="signal-outcome ${out.cls}">${out.text}</span>${s.auditError?`<span class="signal-sub">${escapeHtml(s.auditError).slice(0,100)}</span>`:''}</td>
 <td class="signal-num ${Number.isFinite(mfe)&&mfe>0?'signal-positive':''}">${Number.isFinite(mfe)?mfe.toFixed(2)+'%':'—'}</td><td class="signal-num ${Number.isFinite(mae)&&mae<0?'signal-negative':''}">${Number.isFinite(mae)?mae.toFixed(2)+'%':'—'}</td>
 <td class="signal-num ${Number.isFinite(rm)&&rm>0?'signal-positive':Number.isFinite(rm)&&rm<0?'signal-negative':''}">${Number.isFinite(rm)?rm.toFixed(2)+'R':'—'}</td>
 <td class="signal-reason">${escapeHtml(s.reason||'—')}<span class="signal-sub">Macro: ${escapeHtml(s.macroTrend||'—')}${Number.isFinite(Number(s.marketAdjustment))?` · contexto ${Number(s.marketAdjustment)>=0?'+':''}${Number(s.marketAdjustment)} pts`:''}</span></td></tr>`}).join('');
}
function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s}
function exportSignalCsv(){
 const cols=['fecha','activo','tipo','fuente','senal','timeframe','precio_senal','entrada_low','entrada_high','stop','tp1','score_tecnico','score_oportunidad','score_rf','resultado','mfe_pct','mae_pct','r_multiple','motivo'];
 const rows=signalFilteredRows().map(s=>[new Date(Number(s.ts)).toISOString(),s.symbol,s.type,signalSourceLabel(s.source),signalKindLabel(s.kind),s.tfLabel||s.key||'',s.price,s.entryLow,s.entryHigh,s.stop,s.tp1,s.scoreTechnical,s.scoreOpportunity,s.rfScore,s.auditStatus,s.mfePct,s.maePct,s.rMultiple,s.reason]);
 const csv=[cols.join(','),...rows.map(r=>r.map(csvEscape).join(','))].join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`radar_senales_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function clearSignalHistory(){if(!await window.radarConfirm('¿Borrar todo el historial de señales? Esta acción no se puede deshacer.',{title:'Borrar historial',confirmLabel:'Borrar historial',tone:'bad'}))return;signalJournal.signals=[];await saveSignalJournal();renderSignalHistory()}
function showSignalsView(){
 setInstitutionalView('signalsViewBtn','Auditoría de Decisiones','Historial de señales, resultados y trazabilidad de decisiones');hideAllMainViews();setTechnicalStatusVisible(false);$('signalsView').classList.add('active');renderSignalHistory()}


const __renderSignalHistoryV76=renderSignalHistory;
renderSignalHistory=function(){const r=__renderSignalHistoryV76.apply(this,arguments);try{renderStrategyAnalytics()}catch(e){console.warn('strategy analytics',e)}try{renderDecisionAudit()}catch{}return r};

;

/* ===== RUNTIME BLOCK 23 ===== */
// Radar Técnico G2 — Phase 10H / v4.39.0
// Risk, performance, monitoring/provenance and decision-audit runtime extracted from the legacy inline compatibility bridge.
// Ownership only: calculations, thresholds, fallbacks, LKG/cache and financial semantics are byte-preserved from Phase 10G.

/* ============================
   v78 Risk / Performance / Validation
   ============================ */
const v78={risk:{loading:false,items:[],corr:null,last:null},perf:{loading:false,series:[],benchmark:[],meta:null},stress:null,modelProposal:null,monitorAlertsSession:0,decisionAudit:{records:[],loaded:false,saving:false},dataQuality:{last:0},dailyText:''};
const DECISION_STORE_KEY='radar_decision_audit_v78';
const portfolioAnalyticsFreshness={revision:1,riskRevision:0,performanceRevision:0,reason:'Pendiente de cálculo con la cartera actual',mutatedAt:Date.now(),refreshing:false};
function portfolioAnalyticsIsStale(kind){return kind==='risk'?portfolioAnalyticsFreshness.riskRevision!==portfolioAnalyticsFreshness.revision:portfolioAnalyticsFreshness.performanceRevision!==portfolioAnalyticsFreshness.revision}
function portfolioAnalyticsStaleMessage(kind){const what=kind==='risk'?'Riesgo':'Performance';return `${what} pendiente de actualización: ${portfolioAnalyticsFreshness.reason||'la cartera cambió'}. Los valores visibles anteriores no se consideran vigentes.`}
function renderPortfolioAnalyticsFreshness(){
 const section=$('portfolioRiskSection');if(section){const riskStale=portfolioAnalyticsIsStale('risk'),perfStale=portfolioAnalyticsIsStale('performance');section.classList.toggle('analytics-stale',riskStale||perfStale);section.dataset.riskFreshness=riskStale?'stale':'fresh';section.dataset.performanceFreshness=perfStale?'stale':'fresh'}
 if(portfolioAnalyticsIsStale('risk')&&!v78.risk.loading&&$('riskIntelligenceNote'))$('riskIntelligenceNote').textContent=portfolioAnalyticsStaleMessage('risk');
 if(portfolioAnalyticsIsStale('performance')&&!v78.perf.loading&&$('performanceNote'))$('performanceNote').textContent=portfolioAnalyticsStaleMessage('performance');
}
function markPortfolioAnalyticsStale(reason='La cartera cambió'){
 portfolioAnalyticsFreshness.revision+=1;portfolioAnalyticsFreshness.reason=String(reason||'La cartera cambió');portfolioAnalyticsFreshness.mutatedAt=Date.now();renderPortfolioAnalyticsFreshness();return portfolioAnalyticsFreshness.revision
}
function markPortfolioAnalyticsFresh(kind,startedRevision){
 if(Number(startedRevision)!==portfolioAnalyticsFreshness.revision){renderPortfolioAnalyticsFreshness();return false}
 if(kind==='risk')portfolioAnalyticsFreshness.riskRevision=startedRevision;else portfolioAnalyticsFreshness.performanceRevision=startedRevision;renderPortfolioAnalyticsFreshness();return true
}
async function refreshPortfolioAnalyticsIfStale(){
 if(portfolioAnalyticsFreshness.refreshing)return;portfolioAnalyticsFreshness.refreshing=true;
 try{
  if(portfolioAnalyticsIsStale('risk')){const run=()=>refreshPortfolioRisk();if(window.radarRunAction)await window.radarRunAction(run,{key:'refreshPortfolioRiskBtn',control:$('refreshPortfolioRiskBtn'),errorMessage:'No se pudo actualizar riesgo'});else await run()}
  if(portfolioAnalyticsIsStale('performance')){const run=()=>refreshPortfolioPerformance();if(window.radarRunAction)await window.radarRunAction(run,{key:'refreshPerformanceBtn',control:$('refreshPerformanceBtn'),errorMessage:'No se pudo actualizar performance'});else await run()}
 }finally{portfolioAnalyticsFreshness.refreshing=false;renderPortfolioAnalyticsFreshness()}
}
window.radarMarkPortfolioAnalyticsStale=markPortfolioAnalyticsStale;window.radarRefreshPortfolioAnalyticsIfStale=refreshPortfolioAnalyticsIfStale;window.radarPortfolioAnalyticsFreshness=portfolioAnalyticsFreshness;
function dkey(ts){const d=new Date(Number(ts));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function mean(a){const x=a.filter(Number.isFinite);return x.length?x.reduce((s,v)=>s+v,0)/x.length:NaN}
function stddev(a){const x=a.filter(Number.isFinite),m=mean(x);return x.length>1?Math.sqrt(x.reduce((s,v)=>s+(v-m)*(v-m),0)/(x.length-1)):NaN}
function pearson(a,b){const n=Math.min(a.length,b.length);if(n<8)return NaN;const x=a.slice(-n),y=b.slice(-n),mx=mean(x),my=mean(y);let num=0,dx=0,dy=0;for(let i=0;i<n;i++){const ax=x[i]-mx,by=y[i]-my;num+=ax*by;dx+=ax*ax;dy+=by*by}return dx>0&&dy>0?num/Math.sqrt(dx*dy):NaN}
function pctReturnSeries(data){const out=[];for(let i=1;i<data.length;i++){const a=Number(data[i-1].close),b=Number(data[i].close);if(a>0&&Number.isFinite(b))out.push({date:dkey(Number(data[i].time)*1000),time:Number(data[i].time),r:b/a-1,close:b})}return out}
function mepHistoryMap(){const m=new Map(),rows=dashboardData?.fx?.mep?.history||[];for(const r of rows){const ts=Number(r.time)*1000||Date.parse(r.date||r.fecha||''),val=Number(r.venta??r.value??r.close??r.price);if(Number.isFinite(ts)&&Number.isFinite(val)&&val>0)m.set(dkey(ts),val)}return m}
function nearestMep(date,map){if(map.has(date))return map.get(date);const keys=[...map.keys()].sort();let last=NaN;for(const k of keys){if(k>date)break;last=map.get(k)}return Number.isFinite(last)?last:portfolioMep()}
async function fetchPortfolioDaily(item){if(item.type==='crypto')return await fetchBinance(item.symbol,'1d');if(item.type==='stock')return await fetchYahoo(item.symbol,'1d','5y',true);return await fetchBymaHistory(item.symbol)}
function basePriceMap(data,item,base,mepMap){const cur=item.portfolioCurrency||defaultPortfolioCurrency(item.type),m=new Map();for(const b of data){let p=Number(b.close);if(!(p>0))continue;const date=dkey(Number(b.time)*1000),fx=nearestMep(date,mepMap);if(base==='ARS'&&currencyUsdLike(cur)){if(Number.isFinite(fx))p*=fx;else continue}else if(base==='USD'&&cur==='ARS'){if(Number.isFinite(fx))p/=fx;else continue}m.set(date,p)}return m}
async function loadPortfolioSeries(){const items=(state.config.watchlist||[]).filter(x=>{ensureTransactionHistory(x);return x.inPortfolio||x.transactions?.length}),base=state.config.portfolioBaseCurrency||'ARS',mep=mepHistoryMap(),rows=[];let cursor=0;async function worker(){while(cursor<items.length){const item=items[cursor++];try{const data=await fetchPortfolioDaily(item);rows.push({item,data,priceMap:basePriceMap(data,item,base,mep),returns:pctReturnSeries(data)})}catch(e){rows.push({item,error:String(e.message||e),data:[],priceMap:new Map(),returns:[]})}}}await Promise.all(Array.from({length:Math.min(4,Math.max(1,items.length))},()=>worker()));return{items:rows,base,mep}}
function commonReturnPairs(a,b,n=60){const ma=new Map(a.map(x=>[x.date,x.r])),mb=new Map(b.map(x=>[x.date,x.r])),keys=[...ma.keys()].filter(k=>mb.has(k)).sort().slice(-n);return[keys.map(k=>ma.get(k)),keys.map(k=>mb.get(k)),keys]}
async function refreshPortfolioRiskLegacy(){
 if(v78.risk.loading)return;const freshnessRevision=portfolioAnalyticsFreshness.revision;v78.risk.loading=true;$('refreshPortfolioRiskBtn').disabled=true;$('riskIntelligenceNote').textContent='Cargando series históricas y calculando covarianzas…';
 try{const pack=await loadPortfolioSeries(),valid=pack.items.filter(x=>x.returns.length>=20&&x.item.inPortfolio),stats=portfolio360Stats(),weights=[];for(const x of valid){const cur=x.item.portfolioCurrency||defaultPortfolioCurrency(x.item.type),pp=portfolioPnl(x.item,state.watchResults[watchKey(x.item)]),val=convertPortfolioAmount(pp.currentValue,cur,pack.base);weights.push(Number.isFinite(val)&&stats.current>0?val/stats.current:0)}
 const n=valid.length,corr=Array.from({length:n},()=>Array(n).fill(NaN)),cov=Array.from({length:n},()=>Array(n).fill(0));for(let i=0;i<n;i++)for(let j=0;j<n;j++){const[a,b]=commonReturnPairs(valid[i].returns,valid[j].returns,60),c=pearson(a,b),sa=stddev(a),sb=stddev(b);corr[i][j]=i===j?1:c;cov[i][j]=Number.isFinite(c)&&Number.isFinite(sa)&&Number.isFinite(sb)?c*sa*sb:0}
 let variance=0;for(let i=0;i<n;i++)for(let j=0;j<n;j++)variance+=weights[i]*weights[j]*cov[i][j];const annVol=Math.sqrt(Math.max(0,variance))*Math.sqrt(252)*100,contrib=[];for(let i=0;i<n;i++){let marginal=0;for(let j=0;j<n;j++)marginal+=cov[i][j]*weights[j];contrib.push(variance>0?weights[i]*marginal/variance:0)}
 const pair=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Number.isFinite(corr[i][j]))pair.push({i,j,c:corr[i][j]});const avgCorr=mean(pair.map(x=>x.c)),maxPair=[...pair].sort((a,b)=>b.c-a.c)[0],topIdx=contrib.length?contrib.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v)[0]:null;
 v78.risk={loading:false,items:valid,corr,weights,contrib,last:Date.now(),annVol,avgCorr,maxPair,topIdx};$('riskPortfolioVol').textContent=Number.isFinite(annVol)?annVol.toFixed(1)+'%':'—';$('riskAvgCorr').textContent=Number.isFinite(avgCorr)?avgCorr.toFixed(2):'—';$('riskMaxCorr').textContent=maxPair?`${valid[maxPair.i].item.symbol}/${valid[maxPair.j].item.symbol} ${maxPair.c.toFixed(2)}`:'—';$('riskTopContributor').textContent=topIdx?`${valid[topIdx.i].item.symbol} ${(topIdx.v*100).toFixed(0)}%`:'—';$('riskSeriesCoverage').textContent=`${valid.length}/${stats.items.length}`;$('riskWindow').textContent='60 ruedas';renderCorrelationMatrix();renderRiskContributions();$('riskIntelligenceNote').textContent=`Volatilidad anualizada a partir de retornos diarios y covarianzas. ${stats.items.length-valid.length?`${stats.items.length-valid.length} posición(es) sin histórico suficiente.`:''}`;renderDiversification(stats);markPortfolioAnalyticsFresh('risk',freshnessRevision)}
 catch(e){v78.risk.loading=false;$('riskIntelligenceNote').textContent='No se pudo calcular Inteligencia de Riesgo: '+String(e.message||e)}finally{$('refreshPortfolioRiskBtn').disabled=false}
}
async function refreshPortfolioRisk(){
 const features=await g2RuntimeFeatures();if(!features?.risk)return refreshPortfolioRiskLegacy();
 if(v78.risk.loading)return;const freshnessRevision=portfolioAnalyticsFreshness.revision;v78.risk.loading=true;$('refreshPortfolioRiskBtn').disabled=true;$('riskIntelligenceNote').textContent='Riesgo · cargando históricos, FX y calculando covarianzas…';
 try{
  await g2PortfolioShadowSync(false);const riskUrl=features?.riskAlerts?'/api/g2/risk/monitor':'/api/g2/risk/portfolio',r=await fetch(riskUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolioId:'portfolio:g1:default',window:60,minimumHistory:20,fresh:false})});if(!r.ok)throw new Error(await r.text());const raw=await r.json(),monitor=features?.riskAlerts?raw:null,x=monitor?.assessment||raw,symbols=x.correlation?.symbols||[],bySymbol=new Map((x.contributions||[]).map(c=>[String(c.symbol),c])),items=symbols.map(symbol=>({item:{symbol}})),weights=symbols.map(symbol=>(Number(bySymbol.get(symbol)?.portfolioWeightPct)||0)/100),contrib=symbols.map(symbol=>{const v=Number(bySymbol.get(symbol)?.riskContributionPct);return Number.isFinite(v)?v/100:NaN}),corr=x.correlation?.values||[];
  const max=x.correlation?.maximumPair,maxPair=max?{i:symbols.indexOf(max.left),j:symbols.indexOf(max.right),c:Number(max.correlation)}:null,top=contrib.map((v,i)=>({v,i})).filter(z=>Number.isFinite(z.v)).sort((a,b)=>b.v-a.v)[0]||null;
  v78.risk={loading:false,items,corr,weights,contrib,last:Date.now(),annVol:Number(x.volatilityPct),avgCorr:x.correlation?.averageCorrelation==null?NaN:Number(x.correlation.averageCorrelation),maxPair,topIdx:top,g2:x};
  $('riskPortfolioVol').textContent=x.volatilityPct==null?'—':Number(x.volatilityPct).toFixed(1)+'%';$('riskDownsideVol').textContent=x.downsideVolatilityPct==null?'—':Number(x.downsideVolatilityPct).toFixed(1)+'%';$('riskMaxDrawdown').textContent=x.maxDrawdownPct==null?'—':Number(x.maxDrawdownPct).toFixed(1)+'%';$('riskAvgCorr').textContent=x.correlation?.averageCorrelation==null?'—':Number(x.correlation.averageCorrelation).toFixed(2);$('riskMaxCorr').textContent=max?`${escapeHtml(max.left)}/${escapeHtml(max.right)} ${Number(max.correlation).toFixed(2)}`:'—';$('riskTopContributor').textContent=top?`${escapeHtml(symbols[top.i])} ${(top.v*100).toFixed(0)}%`:'—';$('riskConcentration').textContent=x.concentrationHhi==null?'—':Number(x.concentrationHhi).toFixed(3);$('riskEffectivePositions').textContent=x.effectiveNumberOfPositions==null?'—':Number(x.effectiveNumberOfPositions).toFixed(1);$('riskLiquidity').textContent=x.liquidity?.weightedDays==null?'N/D':`${Number(x.liquidity.weightedDays).toFixed(1)} d`; $('riskBeta').textContent=x.beta==null?'—':Number(x.beta).toFixed(2);$('riskSeriesCoverage').textContent=`${Number(x.riskSeriesCoverageCount)||0}/${Number(x.openPositionCount)||0}`;$('riskWindow').textContent=`${Number(x.window)||60} ruedas`;
  const topBucket=(arr)=>Array.isArray(arr)&&arr.length?`${arr[0].key} ${Number(arr[0].weightPct).toFixed(0)}%`:'N/D',dur=x.durationRisk?.estimatedImpactPctFor100bp,credit=x.creditRisk,mc=x.metadataCoverage;$('riskExposureSummary').innerHTML=`<b>Exposiciones</b> · Moneda ${escapeHtml(topBucket(x.exposures?.currency))} · País ${escapeHtml(topBucket(x.exposures?.country))} · Sector ${escapeHtml(topBucket(x.exposures?.sector))} · Asset class ${escapeHtml(topBucket(x.exposures?.assetClass))} · Metadata país/sector ${mc?`${Number(mc.countryCoveragePct).toFixed(0)}%/${Number(mc.sectorCoveragePct).toFixed(0)}%`:'N/D'} · 100 pb renta fija ${dur==null?'N/D':decisionFmtPct(Number(dur))} · Crédito ON ${escapeHtml(String(credit?.status||'NOT_ASSESSED'))} (${Number(credit?.coveragePct||0).toFixed(0)}% cobertura).`;renderRiskAlerts6B(monitor,x);
  renderCorrelationMatrix();renderRiskContributions();const warn=(x.warnings||[]).slice(0,3).join(' ');$('riskIntelligenceNote').textContent=`RiskEngine ${x.engine?.version||''} · volatilidad/covarianzas sobre retornos diarios en moneda base · cobertura ${Number(x.riskSeriesCoveragePct||0).toFixed(0)}% · ${Number(x.commonReturnPoints||0)} retornos comunes. Liquidez = proxy 10% ADV, no costo de ejecución.${warn?' '+warn:''}`;const stats=portfolio360Stats();renderDiversification(stats);markPortfolioAnalyticsFresh('risk',freshnessRevision);return x;
 }catch(e){console.warn('G2 Risk -> legacy fallback',e);v78.risk.loading=false;$('refreshPortfolioRiskBtn').disabled=false;$('riskIntelligenceNote').textContent='Análisis avanzado de riesgo no disponible; usando cálculo compatible. '+String(e.message||e);['riskDownsideVol','riskMaxDrawdown','riskConcentration','riskEffectivePositions','riskLiquidity','riskBeta'].forEach(id=>{if($(id))$(id).textContent='—'});if($('riskExposureSummary'))$('riskExposureSummary').textContent='Exposiciones: cálculo compatible.';if($('riskAlertsPanel'))$('riskAlertsPanel').innerHTML='<div class="risk-alert-policy">Alertas de riesgo: no se generaron alertas avanzadas.</div>';return refreshPortfolioRiskLegacy()}
 finally{if(v78.risk.loading)v78.risk.loading=false;$('refreshPortfolioRiskBtn').disabled=false}
}
function renderRiskAlerts6B(monitor,x){const box=$('riskAlertsPanel');if(!box)return;if(!monitor){box.innerHTML='<div class="risk-alert-policy">Las alertas avanzadas de riesgo no están activas en este modo. El cálculo de riesgo continúa disponible.</div>';return}const alerts=Array.isArray(monitor.alerts)?monitor.alerts:[],counts=monitor.alertCounts||{},p=monitor.policy||{},mc=x?.metadataCoverage;const chips=`<div class="risk-alert-summary"><span class="risk-alert-chip">Críticas ${Number(counts.CRITICAL)||0}</span><span class="risk-alert-chip">Altas ${Number(counts.HIGH)||0}</span><span class="risk-alert-chip">Avisos ${Number(counts.WARNING)||0}</span><span class="risk-alert-chip">Metadata master ${mc?Number(mc.instrumentMasterWeightPct||0).toFixed(0):'N/D'}%</span></div>`;const rows=alerts.length?`<div class="risk-alert-list">${alerts.slice(0,12).map(a=>`<div class="risk-alert-row ${String(a.severity||'info').toLowerCase()}"><span class="sev">${escapeHtml(String(a.severity||''))}</span><b>${escapeHtml(String(a.type||''))}${a.scopeKey?' · '+escapeHtml(String(a.scopeKey)):''}</b><span>${escapeHtml(String(a.reason||''))}</span></div>`).join('')}</div>`:'<div class="risk-alert-policy">Sin límites de monitoreo excedidos con la política actual.</div>';box.innerHTML=chips+rows+`<div class="risk-alert-policy"><b>${escapeHtml(String(p.label||'Risk policy'))}</b> · ${escapeHtml(String(p.description||''))} · Eventos: ${(monitor.emittedEvents||[]).map(escapeHtml).join(', ')||'—'}.</div>`}
function renderCorrelationMatrix(){
 const r=v78.risk,items=r.items||[],table=$('correlationTable');if(!table)return;
 if(!items.length){table.innerHTML='<tbody><tr><td class="watch-empty">Sin series comparables.</td></tr></tbody>';table.setAttribute('aria-label','Matriz de correlación sin series comparables');return}
 const cls=(v,i,j)=>{if(i===j)return'corr-self';if(!Number.isFinite(v))return'corr-low';const mag=Math.abs(v)>=.75?'corr-high':Math.abs(v)>=.45?'corr-med':'corr-low';return `${mag} ${v<0?'corr-neg':'corr-pos'}`};
 table.setAttribute('aria-label',`Matriz de correlación de ${items.length} posiciones`);
 table.innerHTML=`<thead><tr><th scope="col">Activo</th>${items.map(x=>`<th scope="col">${escapeHtml(x.item.symbol)}</th>`).join('')}</tr></thead><tbody>${items.map((x,i)=>`<tr><th scope="row">${escapeHtml(x.item.symbol)}</th>${items.map((_,j)=>{const v=Number(r.corr?.[i]?.[j]);const value=Number.isFinite(v)?v.toFixed(2):'—';return`<td class="${cls(v,i,j)}" data-corr="${Number.isFinite(v)?v.toFixed(4):''}" title="${escapeHtml(x.item.symbol)} / ${escapeHtml(items[j].item.symbol)} · ${value}">${value}</td>`}).join('')}</tr>`).join('')}</tbody>`
}
function renderRiskContributions(){
 const r=v78.risk,rows=(r.items||[]).map((x,i)=>({symbol:x.item.symbol,c:Number(r.contrib?.[i]),w:Number(r.weights?.[i])})).sort((a,b)=>Math.abs(b.c)-Math.abs(a.c)),max=Math.max(.01,...rows.map(x=>Number.isFinite(x.c)?Math.abs(x.c):0));
 const list=$('riskContributionList');if(list){list.setAttribute('aria-label','Contribución al riesgo por posición');list.innerHTML=rows.length?rows.map(x=>{const finite=Number.isFinite(x.c),sign=finite&&x.c<0?'is-negative':'is-positive',width=finite?Math.min(100,Math.abs(x.c)/max*100):0;return`<div class="risk-contrib-row ${sign}"><b>${escapeHtml(x.symbol)}</b><span class="risk-contrib-track" aria-hidden="true"><i style="width:${width}%"></i></span><span class="risk-contrib-value">${finite?(x.c*100).toFixed(1)+'%':'—'}</span><span class="risk-contrib-weight">Peso ${Number.isFinite(x.w)?(x.w*100).toFixed(1)+'%':'—'}</span></div>`}).join(''):'<div class="watch-empty">Actualizá riesgo para ver contribuciones.</div>'}
 const donut=$('riskContributionDonut');if(donut&&typeof premiumAnalyticsDonutHtml==='function'){
  const magnitudes=rows.filter(x=>Number.isFinite(x.c)&&Math.abs(x.c)>0).map(x=>({name:x.symbol,value:Math.abs(x.c)})),total=magnitudes.reduce((a,x)=>a+x.value,0);
  donut.innerHTML=premiumAnalyticsDonutHtml(magnitudes,total,{centerTitle:'Riesgo',centerLabel:'Posiciones',centerValue:rows.length?`${rows.length}`:'—',emptyText:'Actualizá riesgo para construir la distribución por posición.'});
 }
}
function correlationDiversificationPenalty(){const r=v78.risk;if(!r?.items?.length||!Number.isFinite(r.avgCorr))return null;const high=(r.maxPair&&r.maxPair.c>=.8)?10:0,avg=r.avgCorr>.55?10:r.avgCorr>.35?5:0;return{penalty:high+avg,text:`Correlación media ${r.avgCorr.toFixed(2)}${r.maxPair?`, máxima ${r.maxPair.c.toFixed(2)}`:''}.`}}

function choosePortfolioBenchmark(stats){let crypto=0,usd=0,ars=0;for(const item of stats.items){const cur=item.portfolioCurrency||defaultPortfolioCurrency(item.type),v=convertPortfolioAmount(Number(item.positionSize),cur,stats.base);if(!Number.isFinite(v))continue;if(item.type==='crypto')crypto+=v;if(currencyUsdLike(cur))usd+=v;else ars+=v}const tot=crypto+usd+ars;if(tot&&crypto/tot>.5)return{symbol:'BTCUSDT',type:'crypto',label:'BTC'};if(tot&&usd/tot>.5)return{symbol:'SPY',type:'stock',label:'S&P 500 · SPY'};return{symbol:'^MERV',type:'stock',label:'S&P Merval'}}
async function fetchBenchmarkDaily(b){return b.type==='crypto'?await fetchBinance(b.symbol,'1d'):await fetchYahoo(b.symbol,'1d','5y',true)}
function priceAtOrBefore(map,date,lastObj){if(map.has(date))lastObj.v=map.get(date);return lastObj.v}
function txBaseAmount(t,item,base,mepMap){const cur=t.currency||item.portfolioCurrency||defaultPortfolioCurrency(item.type),date=dkey(Number(t.ts)||Date.now()),fx=nearestMep(date,mepMap),a=Number(t.amount)||Number(t.qty)*Number(t.price)||0;if(base==='ARS'&&currencyUsdLike(cur))return Number.isFinite(fx)?a*fx:NaN;if(base==='USD'&&cur==='ARS')return Number.isFinite(fx)?a/fx:NaN;return a}
function maxDrawdownIndex(series){let peak=-Infinity,dd=0;for(const x of series){peak=Math.max(peak,x.value);if(peak>0)dd=Math.min(dd,x.value/peak-1)}return dd*100}
function monthlyReturns(series){const m=new Map();for(const x of series){const k=x.date.slice(0,7);if(!m.has(k))m.set(k,{first:x.value,last:x.value});else m.get(k).last=x.value}return[...m.entries()].map(([k,v])=>({month:k,r:v.first>0?(v.last/v.first-1)*100:NaN})).filter(x=>Number.isFinite(x.r))}
function drawPerformanceChart(port,bench,benchLabel){
 const canvas=$('portfolioPerformanceCanvas');if(!canvas)return;
 const wrap=canvas.closest('.perf-chart-wrap'),dpr=Math.min(2,Math.max(1,Number(globalThis.devicePixelRatio)||1)),cssW=Math.max(320,Math.floor(canvas.clientWidth||wrap?.clientWidth||900)),cssH=Math.max(220,Math.floor(canvas.clientHeight||252));
 canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';canvas.setAttribute('aria-label',`Rendimiento de cartera versus ${benchLabel||'benchmark'}`);canvas.setAttribute('role','img');
 if(wrap){let legend=wrap.querySelector('.perf-chart-legend');if(!legend){legend=document.createElement('div');legend.className='perf-chart-legend';wrap.insertBefore(legend,canvas)}legend.innerHTML=`<span class="portfolio"><i></i>Cartera</span><span class="benchmark"><i></i>${escapeHtml(benchLabel||'Benchmark')}</span>`}
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);
 const pRows=(port||[]).filter(x=>Number.isFinite(Number(x.value))),bRows=(bench||[]).filter(x=>Number.isFinite(Number(x.value))),all=[...pRows,...bRows].map(x=>Number(x.value));
 const colors={grid:'#17354a',axis:'#7f9aad',base:'#6e8799',portfolio:'#2f9cff',benchmark:'#f3b74d',fill:'rgba(47,156,255,.12)',empty:'#7892a4'};
 if(all.length<2){ctx.fillStyle=colors.empty;ctx.font='600 12px system-ui, sans-serif';ctx.fillText('Sin serie suficiente para graficar',18,32);return}
 let min=Math.min(...all,100),max=Math.max(...all,100);const span=Math.max(4,max-min),margin=span*.12;min-=margin;max+=margin;
 const pad={l:48,r:18,t:14,b:30},plotW=Math.max(1,cssW-pad.l-pad.r),plotH=Math.max(1,cssH-pad.t-pad.b),xp=(i,n)=>pad.l+(n<=1?0:i/(n-1))*plotW,yp=v=>pad.t+(max-v)/(max-min)*plotH;
 ctx.font='500 10px system-ui, sans-serif';ctx.textBaseline='middle';ctx.lineWidth=1;
 const ticks=5;for(let i=0;i<ticks;i++){const v=max-(max-min)*i/(ticks-1),y=yp(v);ctx.strokeStyle=colors.grid;ctx.setLineDash(i===ticks-1?[]:[3,5]);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(cssW-pad.r,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=colors.axis;ctx.textAlign='right';ctx.fillText(v.toFixed(0),pad.l-8,y)}
 const baseY=yp(100);ctx.strokeStyle=colors.base;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(pad.l,baseY);ctx.lineTo(cssW-pad.r,baseY);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=colors.axis;ctx.textAlign='left';ctx.fillText('Base 100',pad.l+5,Math.max(pad.t+8,baseY-9));
 const draw=(arr,stroke,fill=false)=>{if(!arr.length)return;const pts=arr.map((x,i)=>[xp(i,arr.length),yp(Number(x.value))]);if(fill&&pts.length>1){ctx.beginPath();ctx.moveTo(pts[0][0],baseY);pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.lineTo(x,y));ctx.lineTo(pts.at(-1)[0],baseY);ctx.closePath();ctx.fillStyle=colors.fill;ctx.fill()}ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();const last=pts.at(-1);ctx.beginPath();ctx.arc(last[0],last[1],3.5,0,Math.PI*2);ctx.fillStyle=stroke;ctx.fill()};
 draw(pRows,colors.portfolio,true);draw(bRows,colors.benchmark,false);
 const labelRows=pRows.length>=bRows.length?pRows:bRows;if(labelRows.length){const idx=[0,Math.floor((labelRows.length-1)/2),labelRows.length-1];ctx.fillStyle=colors.axis;ctx.font='500 10px system-ui, sans-serif';ctx.textBaseline='alphabetic';idx.forEach((j,k)=>{const raw=String(labelRows[j]?.date||'');const lab=raw.length>=10?raw.slice(5):raw;ctx.textAlign=k===0?'left':k===2?'right':'center';ctx.fillText(lab,xp(j,labelRows.length),cssH-8)})}
}
async function refreshPortfolioPerformanceLegacy(){
 if(v78.perf.loading)return;const freshnessRevision=portfolioAnalyticsFreshness.revision;v78.perf.loading=true;$('refreshPerformanceBtn').disabled=true;$('performanceNote').textContent='Reconstruyendo movimientos y benchmark…';
 try{
   await hydratePortfolioLiveData(false);const pack=await loadPortfolioSeries(),stats=portfolio360Stats(),benchDef=choosePortfolioBenchmark(stats),benchData=await fetchBenchmarkDaily(benchDef),benchMap=basePriceMap(benchData,{type:benchDef.type,portfolioCurrency:benchDef.type==='crypto'?'USDT':'USD'},pack.base,pack.mep),dates=[...new Set(benchData.map(b=>dkey(Number(b.time)*1000)))].sort(),txs=allPortfolioTransactions().sort((a,b)=>Number(a.ts)-Number(b.ts)),firstTx=txs[0]?.ts||Date.now(),startDate=dkey(firstTx),activeDates=dates.filter(d=>d>=startDate);
   // Cartera creada muy recientemente: no inventar historia. Mostrar P&L real actual y benchmark 1D como referencia separada.
   if(activeDates.length<2){
     const closes=benchData.map(x=>Number(x.close)).filter(Number.isFinite),bench1d=closes.length>=2?(closes.at(-1)/closes.at(-2)-1)*100:NaN,portNow=stats.invested>0&&stats.currentKnown===stats.items.length?(stats.current/stats.invested-1)*100:NaN;
     $('perfPortfolioReturn').textContent=Number.isFinite(portNow)?decisionFmtPct(portNow):'—';$('perfBenchmarkReturn').textContent=Number.isFinite(bench1d)?decisionFmtPct(bench1d):'—';$('perfAlpha').textContent='N/C';$('perfMaxDd').textContent='—';$('perfVol').textContent='—';$('perfSharpe').textContent='—';$('perfBestMonth').textContent='—';$('perfWorstMonth').textContent='—';const ps=Number.isFinite(portNow)?[{date:'Inicio',value:100},{date:'Actual',value:100+portNow}]:[],bs=Number.isFinite(bench1d)?[{date:'Prev.',value:100},{date:'Actual',value:100+bench1d}]:[];drawPerformanceChart(ps,bs,benchDef.label+' · 1D');v78.perf={loading:false,series:ps,benchmark:bs,meta:{...benchDef,initial:true}};$('performanceNote').textContent=`Modo inicial: la cartera todavía no tiene dos ruedas desde su primer movimiento. Cartera = P&L real actual desde costo; ${benchDef.label} = última variación diaria. No se calcula alfa porque los horizontes no son comparables.`;markPortfolioAnalyticsFresh('performance',freshnessRevision);return;
   }
   const priceLast=new Map(pack.items.map(x=>[x.item.symbol,{v:NaN}])),qty=new Map(pack.items.map(x=>[x.item.symbol,0])),baseCapital=Number(state.config.portfolioCapital)||0,hasCapital=baseCapital>0;let cash=hasCapital?baseCapital:0,prevEnd=hasCapital?baseCapital:0,index=100,benchIndex=100,benchShares=0,benchCash=hasCapital?baseCapital:0,txCursor=0,benchLast={v:NaN},series=[],bseries=[],daily=[];
   for(const date of activeDates){const benchPrice=priceAtOrBefore(benchMap,date,benchLast);if(!(benchPrice>0))continue;if(hasCapital&&benchShares===0){benchShares=benchCash/benchPrice;benchCash=0}let external=0;while(txCursor<txs.length&&dkey(Number(txs[txCursor].ts))<=date){const t=txs[txCursor++],item=t.item,typ=String(t.type).toUpperCase(),sym=item.symbol,q=Number(t.qty)||0,a=txBaseAmount(t,item,pack.base,pack.mep);if(typ==='BUY'){qty.set(sym,(qty.get(sym)||0)+q);if(hasCapital)cash-=a;else{external+=a;if(a>0)benchShares+=a/benchPrice}}else if(typ==='SELL'){qty.set(sym,Math.max(0,(qty.get(sym)||0)-q));cash+=a}else if(typ==='DIVIDEND'||typ==='COUPON')cash+=a}let holdings=0;for(const x of pack.items){const q=qty.get(x.item.symbol)||0;if(q<=0)continue;const p=priceAtOrBefore(x.priceMap,date,priceLast.get(x.item.symbol));if(Number.isFinite(p))holdings+=q*p}const end=cash+holdings;if(prevEnd>0){const r=(end-prevEnd-external)/prevEnd;if(Number.isFinite(r)&&r>-1){index*=1+r;daily.push(r)}}prevEnd=end;const benchEnd=benchCash+benchShares*benchPrice;if(bseries.length){const prev=bseries.at(-1).raw;if(prev>0){const r=(benchEnd-prev-external)/prev;if(Number.isFinite(r)&&r>-1)benchIndex*=1+r}}series.push({date,value:index,raw:end});bseries.push({date,value:benchIndex,raw:benchEnd})}
   if(series.length<2)throw new Error('No se pudieron alinear al menos dos ruedas de cartera y benchmark.');const pr=series.at(-1).value-100,br=bseries.at(-1).value-100,vol=daily.length>=5?stddev(daily)*Math.sqrt(252)*100:NaN,sh=daily.length>=20&&stddev(daily)>0?mean(daily)/stddev(daily)*Math.sqrt(252):NaN,months=monthlyReturns(series),best=[...months].sort((a,b)=>b.r-a.r)[0],worst=[...months].sort((a,b)=>a.r-b.r)[0];v78.perf={loading:false,series,benchmark:bseries,meta:{...benchDef,coverage:pack.items.filter(x=>x.data.length).length,total:pack.items.length,hasCapital},pr,br,vol,sh};$('perfPortfolioReturn').textContent=decisionFmtPct(pr);$('perfBenchmarkReturn').textContent=decisionFmtPct(br);$('perfAlpha').textContent=decisionFmtPct(pr-br);$('perfMaxDd').textContent=maxDrawdownIndex(series).toFixed(2)+'%';$('perfVol').textContent=Number.isFinite(vol)?vol.toFixed(1)+'%':'muestra corta';$('perfSharpe').textContent=Number.isFinite(sh)?sh.toFixed(2):'muestra corta';$('perfBestMonth').textContent=best?`${best.month} · ${decisionFmtPct(best.r)}`:'—';$('perfWorstMonth').textContent=worst?`${worst.month} · ${decisionFmtPct(worst.r)}`:'—';drawPerformanceChart(series,bseries,benchDef.label);$('performanceNote').textContent=`Benchmark automático: ${benchDef.label}. ${series.length} ruedas alineadas. Series disponibles ${v78.perf.meta.coverage}/${v78.perf.meta.total}.`;markPortfolioAnalyticsFresh('performance',freshnessRevision);
 }catch(e){v78.perf.loading=false;$('performanceNote').textContent='No se pudo reconstruir performance: '+String(e.message||e)}finally{$('refreshPerformanceBtn').disabled=false}
}
async function refreshPortfolioPerformance(){
 const features=await g2RuntimeFeatures();if(!features?.portfolioBenchmark)return refreshPortfolioPerformanceLegacy();
 if(v78.perf.loading)return;const freshnessRevision=portfolioAnalyticsFreshness.revision;v78.perf.loading=true;$('refreshPerformanceBtn').disabled=true;$('performanceNote').textContent='Benchmark · reconstruyendo rendimiento y referencia de mercado…';
 try{
  await g2PortfolioShadowSync(false);
  const r=await fetch('/api/g2/portfolio/benchmark',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolioId:'portfolio:g1:default',fresh:false,minimumPoints:2})});
  if(!r.ok)throw new Error(await r.text());const x=await r.json(),ps=x.portfolioSeries||[],bs=x.benchmarkSeries||[];if(ps.length<2||bs.length<2)throw new Error('El benchmark devolvió una serie insuficiente.');
  const pr=Number(x.portfolioReturnPct),br=Number(x.benchmarkReturnPct),vol=x.annualizedVolatilityPct==null?NaN:Number(x.annualizedVolatilityPct),sh=x.sharpeRatio==null?NaN:Number(x.sharpeRatio),dd=x.maxDrawdownPct==null?NaN:Number(x.maxDrawdownPct),best=x.bestMonth,worst=x.worstMonth;
  v78.perf={loading:false,series:ps,benchmark:bs,meta:{...(x.benchmark||{}),g2:true,coverage:Number(x.coveragePct),methodology:x.methodology,status:x.dataStatus},pr,br,vol,sh};
  $('perfPortfolioReturn').textContent=Number.isFinite(pr)?decisionFmtPct(pr):'—';$('perfBenchmarkReturn').textContent=Number.isFinite(br)?decisionFmtPct(br):'—';$('perfAlpha').textContent=Number.isFinite(Number(x.alphaPct))?decisionFmtPct(Number(x.alphaPct)):'—';$('perfMaxDd').textContent=Number.isFinite(dd)?dd.toFixed(2)+'%':'—';$('perfVol').textContent=Number.isFinite(vol)?vol.toFixed(1)+'%':'muestra corta';$('perfSharpe').textContent=Number.isFinite(sh)?sh.toFixed(2):'muestra corta';$('perfBestMonth').textContent=best?`${best.month} · ${decisionFmtPct(Number(best.returnPct))}`:'—';$('perfWorstMonth').textContent=worst?`${worst.month} · ${decisionFmtPct(Number(worst.returnPct))}`:'—';drawPerformanceChart(ps,bs,x.benchmark?.label||'Benchmark');
  $('performanceNote').textContent=`Benchmark · ${x.benchmark?.label||'benchmark'} · ${x.alignedPoints} ruedas encadenadas · cobertura temporal ${Number(x.coveragePct).toFixed(0)}% · método TWR diario. Depósitos/retiros se excluyen de rentabilidad; no se inventan precios faltantes.`;markPortfolioAnalyticsFresh('performance',freshnessRevision);
  return x;
 }catch(e){console.warn('G2 Portfolio Benchmark -> legacy fallback',e);v78.perf.loading=false;$('refreshPerformanceBtn').disabled=false;$('performanceNote').textContent='Benchmark avanzado no disponible; usando cálculo compatible. '+String(e.message||e);return refreshPortfolioPerformanceLegacy()}
 finally{if(v78.perf.loading)v78.perf.loading=false;$('refreshPerformanceBtn').disabled=false}
}
function stressPortfolioValue(item,base){
 const pp=portfolioPnl(item,state.watchResults[watchKey(item)]),cur=item.portfolioCurrency||defaultPortfolioCurrency(item.type);if(Number.isFinite(pp.currentValue)){const v=convertPortfolioAmount(pp.currentValue,cur,base);if(Number.isFinite(v))return{value:v,basis:'actual'}}const inv=convertPortfolioAmount(Number(item.positionSize),cur,base);return{value:inv,basis:'costo'};
}
const STRESS_SCENARIOS={nasdaq:{label:'Nasdaq -10%',sens:item=>{const f=portfolioFactor(item);if(f.includes('Tecnología'))return-.10;if(item.type==='crypto')return-.07;if(['stock','cedear'].includes(item.type))return-.05;if(item.type==='argstock')return-.025;return 0}},btc:{label:'BTC -20%',sens:item=>item.type==='crypto'?-0.20:(portfolioFactor(item).includes('Tecnología')?-.025:0)},mep:{label:'MEP +15%',sens:item=>{const cur=item.portfolioCurrency||defaultPortfolioCurrency(item.type);if(currencyUsdLike(cur))return .15;if(item.type==='cedear')return .12;if(item.type==='argstock')return .04;if(item.type==='argbond')return .02;return 0}},country:{label:'Riesgo país +500 pb',sens:item=>item.type==='argbond'?-.20:item.type==='argstock'?-.15:item.type==='on'?-.09:item.type==='cedear'?.02:0},rates:{label:'Tasas USA +100 pb',sens:item=>{const f=portfolioFactor(item);if(f.includes('Tecnología'))return-.08;if(item.type==='crypto')return-.05;if(['stock','cedear'].includes(item.type))return-.04;if(item.type==='argbond'||item.type==='on')return-.025;return 0}}};
function runStressScenarioLegacy(key){
 const sc=STRESS_SCENARIOS[key];if(!sc)return;if($('stressRiskDeltaNote'))$('stressRiskDeltaNote').textContent='Comparación antes / después no disponible en el cálculo compatible.';v78.stress=key;document.querySelectorAll('[data-stress]').forEach(b=>b.classList.toggle('active',b.dataset.stress===key));$('stressScenarioLabel').textContent=sc.label;$('stressScenarioLabel').className='intel-chip bad';const stats=portfolio360Stats(),rows=[];let total=0,valuationTotal=0,fallbacks=0;for(const item of stats.items){const vv=stressPortfolioValue(item,stats.base);if(!Number.isFinite(vv.value)||vv.value<=0)continue;if(vv.basis==='costo')fallbacks++;const s=sc.sens(item),impact=vv.value*s;total+=impact;valuationTotal+=vv.value;rows.push({item,val:vv.value,s,impact,factor:portfolioFactor(item),basis:vv.basis})}const pct=valuationTotal>0?total/valuationTotal*100:NaN,worst=[...rows].sort((a,b)=>a.impact-b.impact)[0],factorMap=new Map();rows.forEach(x=>factorMap.set(x.factor,(factorMap.get(x.factor)||0)+x.impact));const dom=[...factorMap.entries()].sort((a,b)=>a[1]-b[1])[0];$('stressImpactMoney').textContent=`${total>=0?'+':''}${fmtPortfolioMoney(total,stats.base)}`;$('stressImpactPct').textContent=Number.isFinite(pct)?decisionFmtPct(pct):'—';$('stressWorstAsset').textContent=worst?`${worst.item.symbol} ${decisionFmtPct(worst.s*100)}`:'—';$('stressDominantFactor').textContent=dom?dom[0]:'—';$('stressBody').innerHTML=rows.length?rows.sort((a,b)=>a.impact-b.impact).map(x=>`<tr><td><b>${escapeHtml(x.item.symbol)}</b></td><td>${fmtPortfolioMoney(x.val,stats.base)}${x.basis==='costo'?'<div class="watch-muted">fallback costo</div>':''}</td><td>${decisionFmtPct(x.s*100)}</td><td class="${x.impact<0?'red':'green'}">${x.impact>=0?'+':''}${fmtPortfolioMoney(x.impact,stats.base)}</td><td>${escapeHtml(x.factor)}</td></tr>`).join(''):'<tr><td colspan="5">Sin posiciones valorizables.</td></tr>';$('stressScenarioLabel').title=fallbacks?`${fallbacks} posición(es) usan costo por falta de precio actual.`:'Todas las posiciones usan valor actual.';
}
async function g2PortfolioScenario(actions,opts={}){
 const features=await g2RuntimeFeatures();if(!features?.portfolioScenarios)return null;await g2PortfolioShadowSync(false);const r=await fetch('/api/g2/portfolio/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolioId:'portfolio:g1:default',actions,fresh:!!opts.fresh})});if(!r.ok)throw new Error(await r.text());return await r.json();
}
async function runStressScenario(key){
 const features=await g2RuntimeFeatures();if(!features?.portfolioScenarios)return runStressScenarioLegacy(key);
 const sc=STRESS_SCENARIOS[key];if(!sc)return;v78.stress=key;document.querySelectorAll('[data-stress]').forEach(b=>b.classList.toggle('active',b.dataset.stress===key));$('stressScenarioLabel').textContent=sc.label;$('stressScenarioLabel').className='intel-chip neutral';$('stressBody').innerHTML='<tr><td colspan="5">Calculando escenario…</td></tr>';
 try{
  await g2PortfolioShadowSync(false);const r=await fetch('/api/g2/portfolio/stress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolioId:'portfolio:g1:default',preset:key,fresh:false})});if(!r.ok)throw new Error(await r.text());const x=await r.json(),base=x.baseCurrency||state.config.portfolioBaseCurrency||'ARS',impact=Number(x.impactBase?.amount),pct=x.impactPct==null?NaN:Number(x.impactPct),rows=x.rows||[],worst=x.worstAsset;
  $('stressScenarioLabel').textContent=x.label||sc.label;$('stressScenarioLabel').className=`intel-chip ${impact<0?'bad':impact>0?'good':'neutral'}`;$('stressImpactMoney').textContent=Number.isFinite(impact)?`${impact>=0?'+':''}${fmtPortfolioMoney(impact,base)}`:'—';$('stressImpactPct').textContent=Number.isFinite(pct)?decisionFmtPct(pct):'—';$('stressWorstAsset').textContent=worst?`${worst.symbol} ${decisionFmtPct(Number(worst.sensitivityPct))}`:'—';$('stressDominantFactor').textContent=x.dominantFactor||'—';$('stressBody').innerHTML=rows.length?rows.map(z=>`<tr><td><b>${escapeHtml(z.symbol)}</b></td><td>${fmtPortfolioMoney(Number(z.marketValueBase?.amount),base)}</td><td>${decisionFmtPct(Number(z.sensitivityPct))}</td><td class="${Number(z.impactBase?.amount)<0?'red':'green'}">${Number(z.impactBase?.amount)>=0?'+':''}${fmtPortfolioMoney(Number(z.impactBase?.amount),base)}</td><td>${escapeHtml(z.factor||'—')}</td></tr>`).join(''):'<tr><td colspan="5">Sin posiciones con market value actual verificable.</td></tr>';$('stressScenarioLabel').title=`Escenario determinístico · cobertura ${Number(x.coveragePct).toFixed(0)}%. ${(x.warnings||[]).join(' ')}`;
  if(features?.risk&&$('stressRiskDeltaNote')){try{const actions=rows.filter(z=>z.instrumentId&&Number.isFinite(Number(z.sensitivityPct))).map(z=>({kind:'PRICE_SHOCK',instrumentId:z.instrumentId,shockPct:Number(z.sensitivityPct)}));if(actions.length){$('stressRiskDeltaNote').textContent='Calculando riesgo antes / después…';const rr=await fetch('/api/g2/risk/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolioId:'portfolio:g1:default',actions,window:60,minimumHistory:20,fresh:false})});if(rr.ok){const rx=await rr.json(),b=rx.riskBefore||{},a=rx.riskAfter||{},dv=rx.delta?.volatilityPct,dc=rx.delta?.concentrationHhi;$('stressRiskDeltaNote').innerHTML=`<b>RiskBefore → RiskAfter</b> · Vol ${b.volatilityPct==null?'N/D':Number(b.volatilityPct).toFixed(1)+'%'} → ${a.volatilityPct==null?'N/D':Number(a.volatilityPct).toFixed(1)+'%'}${dv==null?'':` (${Number(dv)>=0?'+':''}${Number(dv).toFixed(1)} pp)`} · HHI ${b.concentrationHhi==null?'N/D':Number(b.concentrationHhi).toFixed(3)} → ${a.concentrationHhi==null?'N/D':Number(a.concentrationHhi).toFixed(3)}${dc==null?'':` (${Number(dc)>=0?'+':''}${Number(dc).toFixed(3)})`} · Max DD ${b.maxDrawdownPct==null?'N/D':Number(b.maxDrawdownPct).toFixed(1)+'%'} → ${a.maxDrawdownPct==null?'N/D':Number(a.maxDrawdownPct).toFixed(1)+'%'}. Simulación no persistente.`}else $('stressRiskDeltaNote').textContent='RiskBefore / RiskAfter no disponible para este escenario.'}}catch(err){$('stressRiskDeltaNote').textContent='RiskBefore / RiskAfter no disponible: '+String(err.message||err)}}
  return x;
 }catch(e){console.warn('G2 Portfolio Stress -> legacy fallback',e);return runStressScenarioLegacy(key)}
}

function monitorOptionsFromUi(){return{levels:$('monitorAlertLevels')?.checked!==false,entry:$('monitorAlertEntry')?.checked!==false,state:$('monitorAlertState')?.checked!==false,opportunity:$('monitorAlertOpportunity')?.checked!==false,concentration:$('monitorAlertConcentration')?.checked!==false}}
async function applyMonitorMode(save=true){const mode=$('monitorModeSelect')?.value||state.config.monitorMode||'RADAR';state.config.monitorMode=mode;state.config.monitorAlerts=monitorOptionsFromUi();if(state.watchTimer){clearInterval(state.watchTimer);state.watchTimer=null}if(state.watchCandidateTimer){clearInterval(state.watchCandidateTimer);state.watchCandidateTimer=null}if(mode==='RADAR'||mode==='24X7')startWatchMonitor();try{const r=await fetch('/api/watcher/configure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,alerts:state.config.monitorAlerts})});if(!r.ok)throw new Error(await r.text())}catch(e){if(mode==='24X7')console.warn('watcher configure',e)}if(save){try{await saveConfigStrict()}catch(e){try{await applyMonitorMode(false)}catch(recoverError){console.warn('monitor rollback reconfigure',recoverError)}throw e}}renderMonitorStatus();return mode}
async function refreshMonitorStatus(){if(state.config.monitorMode!=='24X7'){renderMonitorStatus();return}try{const r=await fetch('/api/watcher/status',{cache:'no-store'}),j=await r.json();v78.monitorStatus=j}catch{}renderMonitorStatus()}
function renderMonitorStatus(){const mode=state.config.monitorMode||'RADAR',j=v78.monitorStatus||{},watch=(state.config.watchlist||[]),pos=watch.filter(x=>x.inPortfolio).length,tracked=watch.length;$('monitorPositions').textContent=pos;if($('monitorTracked'))$('monitorTracked').textContent=mode==='24X7'&&Number.isFinite(Number(j.tracked))?Number(j.tracked):tracked;$('monitorAlertsCount').textContent=v78.monitorAlertsSession;if(mode==='OFF'){$('monitorState').textContent='OFF';$('monitorLastCheck').textContent='—';$('monitorNextCheck').textContent='—';return}if(mode==='RADAR'){$('monitorState').textContent='🟢 CON RADAR';$('monitorLastCheck').textContent=v78.lastBrowserMonitor?new Date(v78.lastBrowserMonitor).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'Pendiente';$('monitorNextCheck').textContent=v78.lastBrowserMonitor?new Date(v78.lastBrowserMonitor+10*60000).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'~10 min';return}$('monitorState').textContent=j.running?'🟢 24x7 ACTIVO':'🔴 24x7 DETENIDO';$('monitorLastCheck').textContent=j.lastCheck?new Date(j.lastCheck).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'—';$('monitorNextCheck').textContent=j.lastCheck?new Date(j.lastCheck+5*60000).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'—';$('monitorAlertsCount').textContent=Number(j.alerts)||v78.monitorAlertsSession}
function browserMonitorAlert(title,body,tag){if(!state.config.alertsEnabled||typeof Notification==='undefined'||Notification.permission!=='granted')return;try{new Notification(title,{body,tag,renotify:true});v78.monitorAlertsSession++;renderMonitorStatus()}catch{}}
function advancedWatchAlerts(item,current,previous){if(!item.inPortfolio)return;const opt=state.config.monitorAlerts||{},cp=current?.plan,pp=previous?.plan;if(opt.state&&Number.isFinite(Number(cp?.score))&&Number.isFinite(Number(pp?.score))&&Number(pp.score)-Number(cp.score)>=10)browserMonitorAlert(`Radar · Score deteriorado ${item.symbol}`,`Score ${Math.round(pp.score)} → ${Math.round(cp.score)}. Revisar posición.`,`score-${item.symbol}`);const cd=portfolioDecision(item,current),pd=previous?portfolioDecision(item,previous):null,rank={hold:0,watch:1,reduce:2,exit:3};if(opt.state&&pd&&rank[cd.key]>rank[pd.key])browserMonitorAlert(`Radar · ${cd.label}: ${item.symbol}`,cd.why,`state-${item.symbol}-${cd.key}`)}
function scannerOpportunityAlerts(){if(!state.config.monitorAlerts?.opportunity)return;const top=(state.scan.results||[]).filter(r=>r.status?.kind==='buy'&&Number(r.status?.oppScore)>=85).sort((a,b)=>Number(b.status.oppScore)-Number(a.status.oppScore)).slice(0,3);for(const r of top)browserMonitorAlert(`Radar · Oportunidad ${r.item.symbol}`,`${r.status.label} · Score ${r.status.oppScore}/100. ${decisionCompactText(r.why,140)}`,`opp-${r.item.symbol}-${dkey(Date.now())}`)}

function previousDailySnapshot(){const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('radar_daily_v78_'))keys.push(k)}return keys.sort().reverse().map(k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}}).find(x=>x&&x.date<dkey(Date.now()))||null}
function currentDailySnapshot(){const stats=portfolio360Stats(),candidates=decisionCandidates(),positions=(state.config.watchlist||[]).filter(x=>x.inPortfolio).map(x=>{const r=state.watchResults[watchKey(x)],d=portfolioDecision(x,r);return{symbol:x.symbol,state:d.key,score:Number(r?.plan?.score)||null,pnl:Number(portfolioPnl(x,r).pct)}});return{date:dkey(Date.now()),ts:Date.now(),regime:decisionVision().label,risk:dashboardData?.risk?.value??null,portfolioPnl:stats.pnlPct,positions,candidates:candidates.slice(0,8).map(x=>({symbol:x.symbol,label:x.label,priority:x.priority}))}}
function saveDailySnapshot(){try{const s=currentDailySnapshot(),k='radar_daily_v78_'+s.date;if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify(s))}catch{}}
function renderDailyBrief(){if(!$('briefMarket'))return;const now=currentDailySnapshot(),prev=previousDailySnapshot(),stats=portfolio360Stats(),cand=decisionCandidates(),riskPos=(state.config.watchlist||[]).filter(x=>x.inPortfolio&&['reduce','exit'].includes(portfolioDecision(x,state.watchResults[watchKey(x)]).key)).length;$('briefMarket').textContent=now.regime;$('briefPortfolio').textContent=Number.isFinite(stats.pnlPct)?decisionFmtPct(stats.pnlPct):`${stats.items.length} posiciones`;$('briefRisks').textContent=`${riskPos} requieren atención`;$('briefOpportunities').textContent=`${cand.filter(x=>x.group!=='portfolio').length} actuales`;const changes=[];if(prev){if(prev.regime!==now.regime)changes.push(`Régimen ${prev.regime} → ${now.regime}.`);const pm=new Map((prev.positions||[]).map(x=>[x.symbol,x]));for(const x of now.positions){const p=pm.get(x.symbol);if(p&&p.state!==x.state)changes.push(`${x.symbol}: ${String(p.state).toUpperCase()} → ${String(x.state).toUpperCase()}.`);if(p&&Number.isFinite(x.score)&&Number.isFinite(p.score)&&Math.abs(x.score-p.score)>=5)changes.push(`${x.symbol}: score ${Math.round(p.score)} → ${Math.round(x.score)}.`)}}else changes.push('Sin instantánea de una rueda anterior; empezará a comparar en la próxima fecha.');if(cand.length)changes.push(`Mayor prioridad actual: ${cand[0].symbol} · ${cand[0].label}.`);$('briefChanges').textContent=changes.join(' ');v78.dailyText=`INFORME RADAR ${now.date}\nMercado: ${now.regime}\nCartera: ${$('briefPortfolio').textContent}\nRiesgos: ${riskPos}\nOportunidades: ${$('briefOpportunities').textContent}\nCambios: ${changes.join(' ')}`;saveDailySnapshot()}
async function copyDailyBrief(){try{await navigator.clipboard.writeText(v78.dailyText||$('briefChanges').textContent);$('copyDailyBriefBtn').textContent='Copiado';setTimeout(()=>$('copyDailyBriefBtn').textContent='Copiar informe',1200)}catch{window.radarNotify('No se pudo copiar.','bad')}}


const PROVENANCE_OPEN_KEY='radar_ui_provenance_open';
function updateProvenanceSummary(rows=provenanceRows()){
 const ok=rows.filter(x=>x.state==='ok').length,warn=rows.filter(x=>x.state==='warn').length,bad=rows.filter(x=>x.state==='bad').length,lkg=rows.filter(x=>x.isLkg).length;
 if($('provSummaryOk'))$('provSummaryOk').textContent=ok;if($('provSummaryWarn'))$('provSummaryWarn').textContent=warn;if($('provSummaryBad'))$('provSummaryBad').textContent=bad;if($('provSummaryLkg'))$('provSummaryLkg').textContent=lkg;
 if($('provSummaryWhen'))$('provSummaryWhen').textContent=`Validado ${new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`;
}
function setProvenanceExpanded(open,persist=true){
 const panel=$('provenancePanel'),btn=$('toggleProvenanceBtn');if(!panel)return;
 panel.classList.toggle('collapsed',!open);if(btn){btn.textContent=open?'Ocultar detalle':'Ver detalle';btn.setAttribute('aria-expanded',open?'true':'false')}
 if(persist){try{localStorage.setItem(PROVENANCE_OPEN_KEY,open?'1':'0')}catch{}}
 requestAnimationFrame(()=>{try{scheduleAnalysisChartResize()}catch{}});
}
function initProvenancePanel(){let open=false;try{open=localStorage.getItem(PROVENANCE_OPEN_KEY)==='1'}catch{}setProvenanceExpanded(open,false);try{updateProvenanceSummary()}catch{}}

function provenanceRows(){const rows=[],push=(name,value,source,ts,isLkg,coherence='—')=>{const age=ts?Date.now()-ts:Infinity,state=!ts?'bad':age<6*3600000?'ok':age<48*3600000?'warn':'bad';rows.push({name,value,source:source||'—',ts,state,isLkg,coherence})};const r=dashboardData.risk||{};push('Riesgo país',dashValid(r.value)?Math.round(Number(r.value))+' pb':'—',r.source,r.date?Date.parse(r.date):r.loadedAt||Date.now(),!!r.isLkg);for(const k of ['mep','ccl','official']){const x=dashboardData.fx?.[k]||{};push('Dólar '+k.toUpperCase(),dashValid(x.venta)?fmt(Number(x.venta)):'—',x.source,x.date?Date.parse(x.date):x.loadedAt||Date.now(),!!x.isLkg)}const inf=dashboardData.inflation||{};push('Inflación',dashValid(inf.value)?Number(inf.value).toFixed(1)+'%':'—',inf.source,inf.period?Date.parse(inf.period):inf.loadedAt||Date.now(),!!inf.isLkg,'Mensual');for(const a of marketVisibleAssets().slice(0,10)){const e=marketBoardData.get(a.id);if(!marketEntryValid(e))continue;push(a.name,fmt(Number(e.last)),e.source||a.source||'—',Number(e.lastTime)*1000||Number(e.loadedAt),!!e.isLkg,'Card/serie OK')}return rows}
function renderProvenance(){if(!$('provenanceBody'))return;const rows=provenanceRows();$('provenanceBody').innerHTML=rows.map(x=>`<tr><td><b>${escapeHtml(x.name)}</b></td><td>${escapeHtml(String(x.value))}</td><td>${escapeHtml(x.source)}</td><td>${x.ts&&Number.isFinite(x.ts)?new Date(x.ts).toLocaleString('es-AR'):'—'}</td><td class="prov-${x.state}">${x.state==='ok'?'ACTUAL':x.state==='warn'?'DEMORADO':'REVISAR'}</td><td>${x.isLkg?'<span class="prov-warn">LKG</span>':'No'}</td><td>${escapeHtml(x.coherence)}</td></tr>`).join('')||'<tr><td colspan="7">Sin datos.</td></tr>';v78.dataQuality.last=Date.now();updateProvenanceSummary(rows)}

/* Decision Audit */
async function loadDecisionAudit(){try{const local=JSON.parse(localStorage.getItem(DECISION_STORE_KEY)||'{}');if(Array.isArray(local.records))v78.decisionAudit.records=local.records}catch{}try{const r=await fetch('/api/decisions',{cache:'no-store'});if(r.ok){const j=await r.json();if(Array.isArray(j.records))v78.decisionAudit.records=j.records}}catch{}v78.decisionAudit.loaded=true;renderDecisionAudit()}
async function saveDecisionAudit(){const payload={version:1,records:v78.decisionAudit.records.slice(0,5000)};try{localStorage.setItem(DECISION_STORE_KEY,JSON.stringify(payload))}catch{}if(v78.decisionAudit.saving)return;v78.decisionAudit.saving=true;try{await fetch('/api/decisions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}catch{}finally{v78.decisionAudit.saving=false}}
function auditFingerprint(r){return[r.source,r.symbol,r.decision,r.action,dkey(r.ts),r.modelVersion].join('|')}
function recordDecisionAudit(r){const rec={id:'D-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),ts:Date.now(),radarVersion:'v93',modelVersion:scoreModelLabel(),...r};rec.fingerprint=auditFingerprint(rec);const prev=v78.decisionAudit.records.find(x=>x.fingerprint===rec.fingerprint);if(prev){prev.lastSeen=Date.now();prev.count=(prev.count||1)+1;return prev}rec.count=1;v78.decisionAudit.records.unshift(rec);v78.decisionAudit.records=v78.decisionAudit.records.slice(0,5000);saveDecisionAudit();renderDecisionAudit();return rec}
function recordSignalAudit(rec){recordDecisionAudit({source:signalSourceLabel(rec.source),symbol:rec.symbol,decision:signalKindLabel(rec.kind),action:'Seguir plan original',score:rec.scoreOpportunity??rec.scoreTechnical??rec.rfScore,data:{price:rec.price,entryLow:rec.entryLow,entryHigh:rec.entryHigh,stop:rec.stop,tp1:rec.tp1,tf:rec.tfLabel},reason:rec.reason})}
function renderDecisionAudit(){if(!$('decisionAuditBody'))return;const rows=v78.decisionAudit.records||[];$('decisionAuditBody').innerHTML=rows.length?rows.slice(0,500).map(r=>`<tr><td>${new Date(Number(r.ts)).toLocaleString('es-AR')}</td><td><b>${escapeHtml(r.symbol||'—')}</b></td><td>${escapeHtml(r.source||'—')}</td><td>${escapeHtml(r.decision||'—')}</td><td>${escapeHtml(r.action||'—')}</td><td>${Number.isFinite(Number(r.score))?Math.round(Number(r.score))+'/100':'—'}</td><td>${escapeHtml(r.modelVersion||'—')}</td><td>${escapeHtml(r.radarVersion||'—')}</td><td class="audit-reason">${escapeHtml(r.reason||'—')}<span class="signal-sub">${escapeHtml(JSON.stringify(r.data||{})).slice(0,300)}</span></td></tr>`).join(''):'<tr><td colspan="9" class="signal-empty">Sin decisiones auditadas.</td></tr>'}
function exportDecisionAudit(){const cols=['fecha','activo','origen','decision','accion','score','modelo','radar','motivo','datos'],rows=(v78.decisionAudit.records||[]).map(r=>[new Date(r.ts).toISOString(),r.symbol,r.source,r.decision,r.action,r.score,r.modelVersion,r.radarVersion,r.reason,JSON.stringify(r.data||{})]),csv=[cols.join(','),...rows.map(x=>x.map(csvEscape).join(','))].join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`radar_auditoria_decisiones_${dkey(Date.now())}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}

;

/* ===== RUNTIME BLOCK 24 ===== */
/* Radar Técnico G2 · Phase 9X · QA / Preflight Runtime
   External owner for local preflight, persisted QA evidence and full source regression.
   Loaded before the remaining browser bridge; dependencies are resolved at call time. */

const QA_STAGE4_KEY='radar_qa_stage4_v88';
let qaStage4Last=null;
function qaStateLabel(state){return state==='bad'?'CRÍTICO':state==='warn'?'AVISO':'OK'}
function qaPureTransactionCalc(item){
 const tx=Array.isArray(item?.transactions)?[...item.transactions].sort((a,b)=>Number(a.ts)-Number(b.ts)):[];let qty=0,cost=0,realized=0,income=0,invalid=0;
 for(const t of tx){const typ=String(t.type||'').toUpperCase(),q=Math.max(0,Number(t.qty)||0),p=Math.max(0,Number(t.price)||0),fees=Math.max(0,Number(t.fees)||0);if(!['BUY','SELL','DIVIDEND','COUPON'].includes(typ)){invalid++;continue}if(typ==='BUY'){qty+=q;cost+=q*p+fees}else if(typ==='SELL'){const sq=Math.min(qty,q),avg=qty>0?cost/qty:0;realized+=sq*(p-avg)-fees;qty-=sq;cost-=sq*avg;if(qty<1e-10){qty=0;cost=0}}else{const a=Math.max(0,Number(t.amount)||0);income+=a;realized+=a}}
 return{qty,cost,buyPrice:qty>0?cost/qty:0,realized,income,invalid};
}
function qaLocalChecks(){
 const tests=[],add=(name,state,detail,group='Local')=>tests.push({name,state,detail:String(detail||''),group});
 const required=['dashboardView','analysisView','watchlistView','scannerView','rfScannerView','signalsView','helpOverlay','portfolio360Section','portfolioRiskSection','refreshWatchlistBtn','provenancePanel','toggleProvenanceBtn'];
 const missing=required.filter(id=>!$(id));
 add('Interfaz núcleo',missing.length?'bad':'ok',missing.length?`Faltan: ${missing.join(', ')}`:`${required.length} componentes principales presentes`,'UI');
 const ownedIds=[...document.querySelectorAll('[id]')].filter(el=>!el.closest('.tv-lightweight-charts')&&!['tv-attr-logo','a'].includes(el.id)).map(x=>x.id);
 const dup=[...new Set(ownedIds.filter((x,i)=>ownedIds.indexOf(x)!==i))];
 add('IDs únicos',dup.length?'bad':'ok',dup.length?`Duplicados Radar: ${dup.slice(0,8).join(', ')}`:'Sin IDs duplicados propios','UI');
 add('Escáner RV / Cripto',typeof startScanner==='function'&&typeof scannerUniverseItems==='function'?'ok':'bad','Universo + históricos + análisis técnico','Motor');
 add('Escáner renta fija',typeof startRfScanner==='function'&&typeof rfScannerUniverse==='function'?'ok':'bad','Bonos, Letras y ON','Motor');
 add('Análisis individual',typeof loadAll==='function'&&typeof analyzeSeriesRuntime==='function'?'ok':'bad','Ficha técnica multi-mercado','Motor');
 add('Data Quality',typeof setProvenanceExpanded==='function'&&!!$('toggleProvenanceBtn')&&!!$('provenancePanel')?'ok':'bad','Procedencia y frescura visibles','Datos');
 add('Help Center',window.RadarHelpCenterUI?.VERSION==='9L'?'ok':'warn','Ayuda contextual del producto núcleo','UI');
 const wl=Array.isArray(state.config?.watchlist)?state.config.watchlist:[];
 add('Configuración',Array.isArray(state.config?.watchlist)?'ok':'bad',`${wl.length} activo(s) en seguimiento`,'Persistencia');
 const keys=new Map(),dups=[];for(const x of wl){const k=watchKey(x);if(keys.has(k))dups.push(k);keys.set(k,1)}
 add('Seguimiento sin duplicados',dups.length?'warn':'ok',dups.length?`${[...new Set(dups)].slice(0,6).join(', ')}`:'Sin duplicados exactos','Seguimiento');
 let invalidTx=0,mismatch=0,cryptoIncome=0,negative=0,positions=0,priced=0;
 for(const item of wl){const calc=qaPureTransactionCalc(item);invalidTx+=calc.invalid;if(calc.qty<0||calc.cost<0)negative++;if(item.type==='crypto'&&(item.transactions||[]).some(t=>['DIVIDEND','COUPON'].includes(String(t.type||'').toUpperCase())))cryptoIncome++;if(item.inPortfolio){positions++;if(Number.isFinite(currentWatchPrice(state.watchResults[watchKey(item)],item)))priced++}const dq=Math.abs((Number(item.quantity)||0)-calc.qty),dc=Math.abs((Number(item.positionSize)||0)-calc.cost);if((item.transactions||[]).length&&(dq>1e-7||dc>Math.max(.01,calc.cost*.000001)))mismatch++}
 add('Libro de cartera',invalidTx||negative?'bad':'ok',invalidTx?`${invalidTx} movimiento(s) inválido(s)`:negative?'Saldo negativo detectado':'Movimientos y saldos válidos','Cartera');
 add('Consistencia cartera',mismatch?'warn':'ok',mismatch?`${mismatch} posición(es) no coinciden con movimientos`:'Tenencia y costo consistentes','Cartera');
 add('Reglas por activo',cryptoIncome?'bad':'ok',cryptoIncome?`${cryptoIncome} posición(es) crypto con dividendo/cupón`:'Clases de activo coherentes','Cartera');
 add('Cobertura de precios',positions&&priced<positions?'warn':'ok',positions?`${priced}/${positions} posiciones con precio utilizable`:'Sin posiciones abiertas','Cartera');
 add('Gestión de posiciones',typeof openReducePosition==='function'&&typeof reductionQtyFromInputs==='function'?'ok':'bad','Alta, reducción y cierre disponibles','Cartera');
 add('Riesgo y performance',typeof refreshPortfolioRisk==='function'&&typeof refreshPortfolioPerformance==='function'?'ok':'bad','Riesgo, benchmark y rendimiento','Cartera');
 add('Stress Test',typeof runStressScenario==='function'&&typeof STRESS_SCENARIOS==='object'?'ok':'warn',`${Object.keys(STRESS_SCENARIOS||{}).length} escenarios`,'Cartera');
 add('Backup / restore',typeof exportRadarBackup==='function'&&typeof restoreRadarBackup==='function'?'ok':'warn','Respaldo de configuración y cartera','Persistencia');
 add('Treasury 2Y retirado',MARKET_ASSETS.some(a=>a.id==='ust2y'||/Treasury 2Y/i.test(a.name||''))?'bad':'ok','No debe reaparecer','Mercados');
 return tests;
}
function qaRenderResult(tests,duration=0,full=false){
 const bad=tests.filter(x=>x.state==='bad').length,warn=tests.filter(x=>x.state==='warn').length,ok=tests.filter(x=>x.state==='ok').length,verdict=bad?'NO APTO':warn?'APTO CON AVISOS':'APTO PARA OPERAR',cls=bad?'bad':warn?'warn':'ready';
 qaStage4Last={tests,bad,warn,ok,verdict,duration,full,ts:Date.now(),version:'v93'};try{localStorage.setItem(QA_STAGE4_KEY,JSON.stringify(qaStage4Last))}catch{}
 $('qaVerdict').textContent=verdict;$('qaVerdictBox').className=`qa-stage4-verdict ${cls}`;$('qaCritical').textContent=bad;$('qaWarnings').textContent=warn;$('qaOk').textContent=ok;$('qaDuration').textContent=duration?`${duration} ms`:'LOCAL';$('qaLastRun').textContent=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
 $('regressionSummary').innerHTML=bad?`<span class="qa-critical"><b>${bad} crítico(s).</b></span> No conviene confiar en una función afectada hasta corregirlos.`:warn?`<span class="qa-warning"><b>${warn} aviso(s).</b></span> Radar puede operar, pero revisá los ítems amarillos.`:`<span class="qa-good"><b>Sin fallos críticos ni avisos.</b></span> Preflight consistente.`;
 $('regressionGrid').innerHTML=tests.map(x=>`<div class="qa-item ${x.state}"><b>${x.state==='ok'?'✓':x.state==='warn'?'⚠':'✕'} ${escapeHtml(x.name)}</b><span class="signal-sub">${escapeHtml(x.group||'')}</span>${escapeHtml(x.detail)}</div>`).join('');
 $('regressionWhen').textContent='· '+new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});portfolioV76.regression=qaStage4Last;return qaStage4Last;
}
function runLocalPreflight(show=true){const started=performance.now(),tests=qaLocalChecks();if(show){$('dataDiagnostics').classList.add('active');$('regressionBox').classList.add('active')}return qaRenderResult(tests,Math.round(performance.now()-started),false)}
function loadLastQaStage4(){try{const x=JSON.parse(localStorage.getItem(QA_STAGE4_KEY)||'null');if(!x?.tests)return;qaStage4Last=x;$('qaVerdict').textContent=x.verdict||'—';$('qaVerdictBox').className=`qa-stage4-verdict ${x.bad?'bad':x.warn?'warn':'ready'}`;$('qaCritical').textContent=x.bad??'—';$('qaWarnings').textContent=x.warn??'—';$('qaOk').textContent=x.ok??'—';$('qaDuration').textContent=x.duration?`${x.duration} ms`:'—';$('qaLastRun').textContent=x.ts?new Date(x.ts).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'—'}catch{}}
async function copyQaStage4(){if(!qaStage4Last){runLocalPreflight(false)}const q=qaStage4Last,lines=[`RADAR TÉCNICO v93 · QA ${new Date(q.ts).toLocaleString('es-AR')}`,`VEREDICTO: ${q.verdict} · críticos ${q.bad} · avisos ${q.warn} · OK ${q.ok}`,'',...q.tests.map(t=>`[${qaStateLabel(t.state)}] ${t.group||''} · ${t.name}: ${t.detail}`)];try{await navigator.clipboard.writeText(lines.join('\n'));$('qaCopyBtn').textContent='Copiado';setTimeout(()=>$('qaCopyBtn').textContent='Copiar reporte',1200)}catch{void window.radarAlert(lines.join('\n'),{title:'Reporte QA',tone:'info'})}}

async function runRegressionSuite(){
 const started=performance.now(),box=$('regressionBox');box.classList.add('active');$('dataDiagnostics').classList.add('active');$('regressionSummary').textContent='Ejecutando QA integral secuencial…';$('regressionGrid').innerHTML='';
 const tests=qaLocalChecks(),add=(name,state,detail,group='Fuente')=>{tests.push({name,state,detail:String(detail||''),group});$('regressionGrid').innerHTML=tests.map(x=>`<div class="qa-item ${x.state}"><b>${x.state==='ok'?'✓':x.state==='warn'?'⚠':'✕'} ${escapeHtml(x.name)}</b><span class="signal-sub">${escapeHtml(x.group||'')}</span>${escapeHtml(x.detail)}</div>`).join('')};
 async function get(name,url,timeout=9000,validator=()=>true,optional=false,group='Fuente'){const t=performance.now();try{const c=new AbortController(),tm=setTimeout(()=>c.abort(),timeout);let r;try{r=await fetch(url,{cache:'no-store',signal:c.signal})}finally{clearTimeout(tm)}if(!r.ok)throw new Error(`HTTP ${r.status}`);const ct=r.headers.get('content-type')||'',body=ct.includes('json')?await r.json():await r.text(),ok=validator(body);add(name,ok?'ok':optional?'warn':'bad',`${Math.round(performance.now()-t)} ms${ok?'':' · respuesta incompleta'}`,group)}catch(e){add(name,optional?'warn':'bad',String(e.message||e),group)}}
 await get('Servidor','/api/health',6000,x=>x?.ok&&(x?.radarVersion==='v93'||x?.version==='v93'||x?.release==='5.0.0'||x?.version==='5.0.0'),false,'Backend');
 await get('Configuración persistente','/api/config',6000,x=>Array.isArray(x?.watchlist),false,'Backend');
 await get('Historial señales','/api/signals',6000,x=>Array.isArray(x?.signals),true,'Persistencia');
 await get('Auditoría decisiones','/api/decisions',6000,x=>Array.isArray(x?.records),true,'Persistencia');
 await get('Watcher 24x7','/api/watcher/status',6000,x=>x?.ok===true,true,'Monitor');
 await get('Dólar','/api/dashboard/fx-current',9000,x=>!!x,true,'Mercados');
 await get('Riesgo país','/api/dashboard/risk',9000,x=>!!x,true,'Mercados');
 await get('Yahoo · SPY','/api/yahoo?symbol=SPY&interval=1d&range=1mo&quiet=1',10000,x=>!!x?.chart?.result?.[0],true,'Mercados');
 await get('Binance · BTC','/api/binance?symbol=BTCUSDT&interval=1h',10000,x=>Array.isArray(x)&&x.length>20,true,'Mercados');
 await get('BYMA universo','/api/byma/equities',12000,x=>!!x,true,'Mercados');
 await get('Binance universo','/api/binance/universe?top=5',10000,x=>Array.isArray(x?.items)&&x.items.length>0,true,'Escáner');
 await get('CEDEAR universo','/api/byma/cedears?liquid=1',12000,x=>Array.isArray(x?.items)&&x.items.length>0,true,'Escáner');
 await get('BYMA histórico scanner','/api/byma/scan-history?symbol=GGAL&tf=short',12000,x=>x?.s==='ok'&&Array.isArray(x?.t)&&x.t.length>=30,true,'Escáner');
 await get('Merval USD','/api/byma/merval-usd',12000,x=>Number.isFinite(Number(x?.value)),true,'Mercados');
 await get('Treasury curve','/api/treasury-curve',12000,x=>Array.isArray(x?.points)&&x.points.length>=3,true,'Mercados');
 await get('Tasas locales','/api/local-rates',12000,x=>Number(x?.available)>0,true,'Mercados');
 await get('Renta fija','/api/fixed-income/analytics',12000,x=>Array.isArray(x?.bonds),true,'Mercados');
 const result=qaRenderResult(tests,Math.round(performance.now()-started),true);renderSystemHealth();return result;
}

;
