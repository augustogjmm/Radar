/* Radar Tecnico G2 - Deterministic CEDEAR rotation engine
   Extracted from certified runtime; order preserved. */

/* ===== RUNTIME BLOCK 40 ===== */
/* Radar Técnico G2 — FUNCTIONAL RC20.13 LIQUIDITY GATE / BLACKLIST
   Cartera USD / Rotación CEDEARs — deterministic domain engine.
   Pure calculations only. No DOM, no network, no order execution. */
(()=>{
'use strict';
const VERSION='2.0.0';
const DEFAULTS=Object.freeze({
  hurdlePct:3,
  safetyMarginPct:0.35,
  entryFeePct:0.35,
  exitFeePct:0.35,
  fxFrictionPct:0.25,
  fallbackMarketSpreadPct:0.45,
  minPotentialDownside:1.8,
  rotationDeltaMin:12,
  rotationNetEdgeMinPct:3.5,
  rotationPersistenceRuns:2,
  rotationCandidateCoverageMin:75,
  rotationRiskPenaltyFactor:0.35,
  rotationUtilityDeltaMin:10,
  rotationMinAssetScore:68,
  rotationMaxScoreDowngrade:5,
  rotationConcentrationPenaltyFactor:0.12,
  rotationCorrelationPenaltyFactor:8,
  corePct:65,
  tacticalPct:35,
  entryTranches:[40,35,25],
  profitTranches:[25,25,25,25],
  tierAThreshold:78,
  tierBThreshold:58,
  minTierAPersistence:0.75,
  minTierBPersistence:0.50,
  minOperationalAdtvPercentile:45,
  minOperationalPersistence:0.60,
  maxOperationalSpreadPct:2.0,
  maxUniverseCandidates:2000
});
const ROTATION_WEIGHTS=Object.freeze({fundamentalQuality:15,valuation:15,weeklyStructure:15,dailyStructure:20,momentum:10,upsideDownside:15,catalysts:5,liquidity:5});
function finite(v){const n=Number(v);return Number.isFinite(n)?n:NaN}
function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v))}
function pct(v){return Number.isFinite(v)?v:NaN}
function sum(a){return a.filter(Number.isFinite).reduce((s,v)=>s+v,0)}
function avg(a){const x=a.filter(Number.isFinite);return x.length?sum(x)/x.length:NaN}
function median(a){const x=a.filter(Number.isFinite).sort((a,b)=>a-b);if(!x.length)return NaN;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2}
function normalizeSettings(raw={}){
  const migrated={...raw};
  if(!Number.isFinite(finite(migrated.minPotentialDownside))&&Number.isFinite(finite(migrated.minRewardRisk)))migrated.minPotentialDownside=finite(migrated.minRewardRisk);
  if(finite(migrated.maxUniverseCandidates)===42)migrated.maxUniverseCandidates=DEFAULTS.maxUniverseCandidates;
  const s={...DEFAULTS,...migrated};
  for(const k of ['hurdlePct','safetyMarginPct','entryFeePct','exitFeePct','fxFrictionPct','fallbackMarketSpreadPct','minPotentialDownside','rotationDeltaMin','rotationNetEdgeMinPct','rotationPersistenceRuns','rotationCandidateCoverageMin','rotationRiskPenaltyFactor','rotationUtilityDeltaMin','rotationMinAssetScore','rotationMaxScoreDowngrade','rotationConcentrationPenaltyFactor','rotationCorrelationPenaltyFactor','corePct','tacticalPct','tierAThreshold','tierBThreshold','minTierAPersistence','minTierBPersistence','minOperationalAdtvPercentile','minOperationalPersistence','maxOperationalSpreadPct','maxUniverseCandidates']){
    const n=finite(s[k]);s[k]=Number.isFinite(n)?n:DEFAULTS[k];
  }
  s.entryTranches=Array.isArray(raw.entryTranches)&&raw.entryTranches.length===3?raw.entryTranches.map(finite):[...DEFAULTS.entryTranches];
  s.profitTranches=Array.isArray(raw.profitTranches)&&raw.profitTranches.length===4?raw.profitTranches.map(finite):[...DEFAULTS.profitTranches];
  const en=sum(s.entryTranches),tp=sum(s.profitTranches);if(Math.abs(en-100)>0.01)s.entryTranches=[...DEFAULTS.entryTranches];if(Math.abs(tp-100)>0.01)s.profitTranches=[...DEFAULTS.profitTranches];
  const ct=s.corePct+s.tacticalPct;if(Math.abs(ct-100)>0.01){s.corePct=DEFAULTS.corePct;s.tacticalPct=DEFAULTS.tacticalPct}
  s.minOperationalAdtvPercentile=clamp(s.minOperationalAdtvPercentile,0,100);
  s.minOperationalPersistence=clamp(s.minOperationalPersistence,0,1);
  s.maxOperationalSpreadPct=Math.max(0,s.maxOperationalSpreadPct);
  return s;
}
function lastBars(bars,n){return Array.isArray(bars)?bars.filter(x=>Number.isFinite(finite(x?.close))&&Number.isFinite(finite(x?.volume))).slice(-n):[]}
function adtv(bars,n){const xs=lastBars(bars,n);return xs.length?avg(xs.map(x=>finite(x.close)*finite(x.volume))):NaN}
function persistence(bars,n=40){const xs=lastBars(bars,n);return xs.length?xs.filter(x=>finite(x.volume)>0).length/xs.length:NaN}
function extractFirst(obj,paths){for(const p of paths){let x=obj;for(const k of p.split('.'))x=x?.[k];const n=finite(x);if(Number.isFinite(n))return n}return NaN}
function quoteMicrostructure(quote,panel={}){
  const bid=extractFirst(quote,['quote.bid','quote.bidPrice','quote.bestBid','quote.buyPrice','bid','bidPrice']);
  const ask=extractFirst(quote,['quote.offer','quote.offerPrice','quote.ask','quote.askPrice','quote.bestOffer','quote.sellPrice','ask','askPrice']);
  const tradeCount=extractFirst(quote,['quote.tradeCount','quote.trades','quote.operations','quote.operationsCount','quote.quantityOperations','tradeCount','trades']);
  const panelTradeCount=extractFirst(panel,['tradeCount','trades','operations','operationsCount','quantityOperations']);
  const bidSize=extractFirst(quote,['quote.bidSize','quote.bidQuantity','quote.bestBidSize','bidSize']);
  const askSize=extractFirst(quote,['quote.offerSize','quote.askSize','quote.askQuantity','quote.bestOfferSize','askSize']);
  const mid=bid>0&&ask>0?(bid+ask)/2:NaN;
  const spreadPct=mid>0&&ask>=bid?(ask-bid)/mid*100:NaN;
  return{bid,ask,spreadPct,tradeCount:Number.isFinite(tradeCount)?tradeCount:panelTradeCount,bidSize,askSize,depth:Number.isFinite(bidSize)&&Number.isFinite(askSize)?bidSize+askSize:NaN};
}
function liquidityMetrics({bars=[],panel={},quote=null}={}){
  const m=quoteMicrostructure(quote,panel);
  const a5=adtv(bars,5),a20=adtv(bars,20),a40=adtv(bars,40);
  const currentVolumeAmount=finite(panel?.volumeAmount);
  const acceleration=a20>0&&a5>0?(a5/a20-1)*100:NaN;
  const persist=persistence(bars,40);
  return{adtv5:a5,adtv20:a20,adtv40:a40,currentVolumeAmount,tradeCount:m.tradeCount,spreadPct:m.spreadPct,depth:m.depth,bid:m.bid,ask:m.ask,volumeAccelerationPct:acceleration,persistence:persist};
}
function rankPercentile(v,arr,invert=false){const x=arr.filter(Number.isFinite).sort((a,b)=>a-b);if(!Number.isFinite(v)||!x.length)return NaN;let n=x.filter(z=>z<=v).length;let p=n/x.length*100;return invert?100-p:p}
function buildTierUniverse(rows,settings={}){
  const cfg=normalizeSettings(settings),src=(rows||[]).map(r=>({...r,liquidity:r.liquidity||liquidityMetrics(r)}));
  const fields=['adtv5','adtv20','adtv40','currentVolumeAmount','tradeCount','spreadPct','volumeAccelerationPct','persistence'];
  const pools=Object.fromEntries(fields.map(k=>[k,src.map(r=>finite(r.liquidity?.[k])).filter(Number.isFinite)]));
  return src.map(r=>{
    const l=r.liquidity||{};
    const comps={
      adtv20:rankPercentile(finite(l.adtv20),pools.adtv20),
      adtv5:rankPercentile(finite(l.adtv5),pools.adtv5),
      adtv40:rankPercentile(finite(l.adtv40),pools.adtv40),
      current:rankPercentile(finite(l.currentVolumeAmount),pools.currentVolumeAmount),
      trades:rankPercentile(finite(l.tradeCount),pools.tradeCount),
      spread:rankPercentile(finite(l.spreadPct),pools.spreadPct,true),
      acceleration:rankPercentile(finite(l.volumeAccelerationPct),pools.volumeAccelerationPct),
      persistence:Number.isFinite(finite(l.persistence))?clamp(finite(l.persistence)*100):NaN
    };
    const weights={adtv20:30,adtv5:18,adtv40:12,current:8,trades:8,spread:10,acceleration:6,persistence:8};
    let num=0,den=0;for(const [k,w] of Object.entries(weights)){if(Number.isFinite(comps[k])){num+=comps[k]*w;den+=w}}
    const score=den?num/den:NaN,coverage=den/100;
    const critical=Number.isFinite(finite(l.adtv20))&&finite(l.adtv20)>0&&Number.isFinite(finite(l.persistence));
    const gateReasons=[];
    if(!Number.isFinite(comps.adtv20)||comps.adtv20<cfg.minOperationalAdtvPercentile)gateReasons.push(`ADTV20 debajo del percentil operativo ${cfg.minOperationalAdtvPercentile.toFixed(0)}`);
    if(!Number.isFinite(finite(l.persistence))||finite(l.persistence)<cfg.minOperationalPersistence)gateReasons.push(`persistencia de volumen inferior a ${(cfg.minOperationalPersistence*100).toFixed(0)}%`);
    if(Number.isFinite(finite(l.spreadPct))&&finite(l.spreadPct)>cfg.maxOperationalSpreadPct)gateReasons.push(`spread ${finite(l.spreadPct).toFixed(2)}% superior al máximo ${cfg.maxOperationalSpreadPct.toFixed(2)}%`);
    const operationalEligible=critical&&gateReasons.length===0;
    let tier='C';
    if(operationalEligible&&score>=cfg.tierAThreshold&&coverage>=0.70&&finite(l.persistence)>=cfg.minTierAPersistence)tier='A';
    else if(operationalEligible&&score>=cfg.tierBThreshold&&coverage>=0.52&&finite(l.persistence)>=cfg.minTierBPersistence)tier='B';
    const missing=fields.filter(k=>!Number.isFinite(finite(l[k])));
    return{...r,liquidity:{...l,score,coveragePct:coverage*100,components:comps,missing,operationalEligible,gateReasons,adtv20Percentile:comps.adtv20},tier};
  }).sort((a,b)=>(finite(b.liquidity?.score)||-1)-(finite(a.liquidity?.score)||-1));
}
function effectiveHurdle(settings={}){const s=normalizeSettings(settings);return Math.max(s.hurdlePct,s.entryFeePct+s.exitFeePct+s.fxFrictionPct+s.safetyMarginPct)}
function profitState(pnlPct,settings={}){const p=finite(pnlPct),h=effectiveHurdle(settings);if(!Number.isFinite(p))return{key:'INSUFFICIENT',label:'PNL USD PENDIENTE',hurdlePct:h};if(p<0)return{key:'LOSS',label:'PÉRDIDA REAL',hurdlePct:h};if(p<=h)return{key:'BREAKEVEN',label:'BREAK-EVEN / GANANCIA INSUFICIENTE',hurdlePct:h};if(p<=5)return{key:'REAL_PROFIT',label:'PROFIT REAL',hurdlePct:h};if(p<=10)return{key:'MATERIALIZABLE',label:'PROFIT MATERIALIZABLE',hurdlePct:h};return{key:'IMPORTANT',label:'PROFIT IMPORTANTE',hurdlePct:h}}
function realizableUsd(input={},settings={}){
  const s=normalizeSettings(settings),qty=finite(input.quantity),entryArs=finite(input.entryCedearArs),currentArs=finite(input.currentCedearArs),entryCcl=finite(input.entryCcl),currentCcl=finite(input.currentCcl),entryUnderlyingUsd=finite(input.entryUnderlyingUsd),currentUnderlyingUsd=finite(input.currentUnderlyingUsd),ratio=finite(input.ratio);
  const bid=finite(input.bidArs),spread=finite(input.spreadPct);let executableArs=bid>0?bid:currentArs;
  let executionQuality=bid>0?'BID':'ESTIMATED_FROM_LAST';
  if(!(bid>0)&&currentArs>0){const fallback=Number.isFinite(spread)&&spread>=0?spread:s.fallbackMarketSpreadPct;executableArs=currentArs*(1-fallback/200)}
  const grossEntryArs=qty>0&&entryArs>0?qty*entryArs:NaN,explicitEntryFees=finite(input.entryFeesArs),entryFeesArs=Number.isFinite(explicitEntryFees)&&explicitEntryFees>=0?explicitEntryFees:(Number.isFinite(grossEntryArs)?grossEntryArs*s.entryFeePct/100:NaN);
  const investedArs=Number.isFinite(grossEntryArs)?grossEntryArs+(Number.isFinite(entryFeesArs)?entryFeesArs:0):NaN;
  const usdInvested=finite(input.usdInvested)>0?finite(input.usdInvested):(investedArs>0&&entryCcl>0?investedArs/entryCcl*(1+s.fxFrictionPct/100):NaN);
  const grossSaleArs=qty>0&&executableArs>0?qty*executableArs:NaN;
  const exitCostsArs=grossSaleArs>0?grossSaleArs*s.exitFeePct/100:NaN;
  const netSaleArs=grossSaleArs>0?grossSaleArs-exitCostsArs:NaN;
  const usdBuyPrice=currentCcl>0?currentCcl*(1+s.fxFrictionPct/100):NaN;
  const usdRealizable=netSaleArs>0&&usdBuyPrice>0?netSaleArs/usdBuyPrice:NaN;
  const pnlUsd=usdRealizable>0&&usdInvested>0?usdRealizable-usdInvested:NaN;
  const pnlUsdPct=usdRealizable>0&&usdInvested>0?(usdRealizable/usdInvested-1)*100:NaN;
  const pnlArsPct=currentArs>0&&entryArs>0?(currentArs/entryArs-1)*100:NaN;
  const pnlUnderlyingPct=currentUnderlyingUsd>0&&entryUnderlyingUsd>0?(currentUnderlyingUsd/entryUnderlyingUsd-1)*100:NaN;
  const implicitCcl=currentArs>0&&currentUnderlyingUsd>0&&ratio>0?currentArs*ratio/currentUnderlyingUsd:NaN;
  const cclDislocationPct=implicitCcl>0&&currentCcl>0?(implicitCcl/currentCcl-1)*100:NaN;
  const missing=[];if(!(qty>0))missing.push('cantidad');if(!(entryArs>0))missing.push('precio compra ARS');if(!(currentArs>0))missing.push('precio actual ARS');if(!(entryCcl>0)&&!(finite(input.usdInvested)>0))missing.push('CCL entrada o USD invertidos');if(!(currentCcl>0))missing.push('CCL actual');
  return{quantity:qty,entryCedearArs:entryArs,currentCedearArs:currentArs,entryUnderlyingUsd,currentUnderlyingUsd,entryCcl,currentCcl,bidArs:bid,spreadPct:spread,entryFeesArs,entryFeeSource:Number.isFinite(explicitEntryFees)?'EXPLICIT':'CONFIG_DEFAULT',usdInvested,usdRealizable,pnlUsd,pnlUsdPct,pnlArsPct,pnlUnderlyingPct,grossSaleArs,netSaleArs,exitCostsArs,executableArs,executionQuality,usdBuyPrice,implicitCcl,cclDislocationPct,profit:profitState(pnlUsdPct,s),missing,dataSufficient:missing.length===0};
}
function score01(v,lo,hi,invert=false){const n=finite(v);if(!Number.isFinite(n))return NaN;const z=clamp((n-lo)/(hi-lo),0,1)*100;return invert?100-z:z}
function sectorFundamentalModel(sector=''){
  const x=String(sector||'').toLowerCase();
  if(/banco|financ/.test(x))return{key:'FINANCIALS',roe:[7,24],roic:null,margin:[5,35],debtEq:null,sales:[-8,22],eps:[-20,35],pe:[5,22],peg:[.5,3.5],pfcf:null};
  if(/semiconductor|tecnolog/.test(x))return{key:'TECH',roe:[6,35],roic:[4,30],margin:[0,38],debtEq:[.1,2.5],sales:[-12,45],eps:[-25,60],pe:[12,60],peg:[.5,3.5],pfcf:[12,65]};
  if(/energ|petr|gas|minería|mineria|material/.test(x))return{key:'CYCLICAL_COMMODITY',roe:[0,28],roic:[0,22],margin:[-5,30],debtEq:[.1,3.5],sales:[-25,35],eps:[-45,55],pe:[4,28],peg:[.4,4],pfcf:[4,35]};
  if(/utility|consumo defensivo|salud/.test(x))return{key:'DEFENSIVE',roe:[5,28],roic:[4,22],margin:[0,28],debtEq:[.2,3.5],sales:[-5,22],eps:[-12,30],pe:[9,38],peg:[.6,3.5],pfcf:[8,45]};
  return{key:'GENERAL',roe:[5,30],roic:[4,25],margin:[0,25],debtEq:[.2,2.5],sales:[-10,30],eps:[-20,40],pe:[8,45],peg:[.5,3],pfcf:[8,50]};
}
function fundamentalComponents(f={},sector=''){
  const m=sectorFundamentalModel(sector),q=[],v=[],add=(arr,val,band,invert=false)=>{const n=finite(val);if(Number.isFinite(n)&&Array.isArray(band))arr.push(score01(n,band[0],band[1],invert))};
  add(q,f.roe,m.roe);add(q,f.roic,m.roic);add(q,f.profitMargin,m.margin);add(q,f.debtEq,m.debtEq,true);add(q,f.salesYY,m.sales);add(q,f.epsYY,m.eps);
  const pe=Number.isFinite(finite(f.forwardPE))?finite(f.forwardPE):finite(f.pe);add(v,pe,m.pe,true);add(v,f.peg,m.peg,true);add(v,f.pfcf,m.pfcf,true);
  return{fundamentalQuality:q.length?avg(q):NaN,valuation:v.length?avg(v):NaN,sectorModel:m.key,qualityInputs:q.length,valuationInputs:v.length};
}
function structureScore(a){if(!a)return NaN;const sc=finite(a.score),trend=String(a.trend||'').toLowerCase(),structure=String(a.structure||'').toLowerCase();let x=Number.isFinite(sc)?50+sc*7:50;if(trend.includes('alcista'))x+=8;if(structure==='alcista')x+=8;if(trend.includes('bajista'))x-=12;if(structure==='bajista')x-=10;return clamp(x)}
function momentumScore(a){if(!a)return NaN;let x=50;if(String(a.macdState||'').toLowerCase().includes('alcista'))x+=20;if(String(a.macdState||'').toLowerCase().includes('bajista'))x-=20;const vr=finite(a.volumeRatio);if(Number.isFinite(vr))x+=clamp((vr-1)*25,-15,20);return clamp(x)}
function upsideDownsideRatio(input={}){
  const up=finite(input.remainingUpsidePct),down=Math.abs(finite(input.downsideToSupportPct));
  return Number.isFinite(up)&&up>0&&Number.isFinite(down)&&down>0?up/down:NaN;
}
function upsideDownsideScore(input={}){
  const ratio=upsideDownsideRatio(input),up=finite(input.remainingUpsidePct),down=Math.abs(finite(input.downsideToSupportPct));
  if(!Number.isFinite(ratio))return NaN;
  let x=score01(ratio,.75,4);
  if(Number.isFinite(up))x=x*.75+score01(up,2,30)*.25;
  if(Number.isFinite(down)&&down>25)x-=10;
  return clamp(x);
}
function rotationScore(input={}){
  const f=fundamentalComponents(input.fundamentals||{},input.sector||'');
  const components={
    fundamentalQuality:Number.isFinite(finite(input.fundamentalQuality))?finite(input.fundamentalQuality):f.fundamentalQuality,
    valuation:Number.isFinite(finite(input.valuation))?finite(input.valuation):f.valuation,
    weeklyStructure:Number.isFinite(finite(input.weeklyStructure))?finite(input.weeklyStructure):structureScore(input.weekly),
    dailyStructure:Number.isFinite(finite(input.dailyStructure))?finite(input.dailyStructure):structureScore(input.daily),
    momentum:Number.isFinite(finite(input.momentum))?finite(input.momentum):momentumScore(input.daily),
    upsideDownside:Number.isFinite(finite(input.upsideDownside))?finite(input.upsideDownside):upsideDownsideScore(input),
    catalysts:Number.isFinite(finite(input.catalysts))?finite(input.catalysts):NaN,
    liquidity:Number.isFinite(finite(input.liquidity))?finite(input.liquidity):finite(input.liquidityScore)
  };
  let num=0,den=0;for(const [k,w] of Object.entries(ROTATION_WEIGHTS)){const v=finite(components[k]);if(Number.isFinite(v)){num+=clamp(v)*w;den+=w}}
  const score=den?num/den:NaN,coveragePct=den/100*100,missing=Object.keys(ROTATION_WEIGHTS).filter(k=>!Number.isFinite(finite(components[k])));
  return{score,coveragePct,components,weights:{...ROTATION_WEIGHTS},missing,auditable:true};
}
function opportunityCostScore({remainingUpsidePct,downsideToSupportPct,rotationScore:rs,currentProfitPct}={}){
  const up=finite(remainingUpsidePct),down=Math.abs(finite(downsideToSupportPct)),r=finite(rs),p=finite(currentProfitPct);let parts=[];
  if(Number.isFinite(up)&&Number.isFinite(down)&&down>0)parts.push(clamp(100-(up/down)*30));
  if(Number.isFinite(r))parts.push(clamp(100-r));
  if(Number.isFinite(p)&&p>5)parts.push(clamp(50+p*2));
  return parts.length?avg(parts):NaN;
}
function entryTiming(input={}){
  const plan=input?.technical?.plan||input?.plan||{},state=input?.state||{};
  const status=String(plan.status||input.entryStatus||'').toUpperCase(),direction=String(plan.direction||input.entryDirection||'').toUpperCase(),score=finite(plan.score??input.entryScore);
  if(status==='ESPERAR CONFIRMACIÓN'||status==='ESPERAR CONFIRMACION')return{key:'WAIT_CONFIRMATION',label:'ESPERAR CONFIRMACIÓN',executable:false,score};
  if(status==='OPERABLE'&&direction==='LONG')return{key:'BUY_NOW',label:'COMPRAR AHORA',executable:true,score};
  if(state.key==='BUY'&&!status)return{key:'BUY_NOW',label:'COMPRAR AHORA',executable:true,score};
  if(state.key==='WAIT_CONFIRMATION')return{key:'WAIT_CONFIRMATION',label:'ESPERAR CONFIRMACIÓN',executable:false,score};
  if(state.key==='ENTRY_ZONE')return{key:'ENTRY_ZONE',label:'ZONA DE ENTRADA',executable:false,score};
  if(state.key==='WAIT')return{key:'WAIT',label:'ESPERAR',executable:false,score};
  return{key:'WATCH',label:'SEGUIMIENTO',executable:false,score};
}
function switchingCostPct(settings={}){const s=normalizeSettings(settings);return Math.max(0,s.exitFeePct)+Math.max(0,s.entryFeePct)+Math.max(0,s.fxFrictionPct)}
function opportunityEfficiency(input={}){
  const asset=finite(input.assetScore??input.rotationScore??input.rotation?.score),entry=finite(input.entryScore??input.technical?.plan?.score),coverage=finite(input.coveragePct??input.rotation?.coveragePct),up=finite(input.remainingUpsidePct),ratio=finite(input.potentialDownsideRatio),liq=finite(input.liquidityScore??input.liquidity?.score),timing=entryTiming(input);
  const parts=[];const add=(v,w)=>{if(Number.isFinite(v))parts.push([clamp(v),w])};
  add(asset,35);add(entry,20);add(coverage,10);add(Number.isFinite(up)?clamp(up*3.2):NaN,15);add(Number.isFinite(ratio)?clamp((ratio/4)*100):NaN,10);add(liq,10);
  let num=0,den=0;for(const [v,w] of parts){num+=v*w;den+=w}let value=den?num/den:NaN;if(Number.isFinite(value)){if(timing.executable)value+=6;else if(timing.key==='WAIT_CONFIRMATION')value-=2;else if(timing.key==='WAIT')value-=7;value=clamp(value)}
  return{score:value,assetScore:asset,entryScore:entry,coveragePct:coverage,timing,auditable:true};
}
function seriesReturns(bars,lookback=60){
  const xs=(Array.isArray(bars)?bars:[]).map(x=>finite(x?.close)).filter(Number.isFinite).slice(-(Math.max(10,lookback)+1));const out=[];
  for(let i=1;i<xs.length;i++)if(xs[i-1]>0&&xs[i]>0)out.push(Math.log(xs[i]/xs[i-1]));return out;
}
function returnCorrelation(a,b,lookback=60){
  const x=seriesReturns(a,lookback),y=seriesReturns(b,lookback),n=Math.min(x.length,y.length);if(n<20)return NaN;const xx=x.slice(-n),yy=y.slice(-n),mx=avg(xx),my=avg(yy);let num=0,dx=0,dy=0;for(let i=0;i<n;i++){const ax=xx[i]-mx,by=yy[i]-my;num+=ax*by;dx+=ax*ax;dy+=by*by}return dx>0&&dy>0?clamp(num/Math.sqrt(dx*dy),-1,1):NaN;
}
function portfolioRotationContext(current={},candidate={},portfolio=[]){
  const rows=(Array.isArray(portfolio)?portfolio:[]).map(x=>({symbol:String(x?.symbol||''),sector:String(x?.sector||'Otros'),usd:Math.max(0,finite(x?.usd??x?.valueUsd??x?.valuation?.usdRealizable)||0)})),total=sum(rows.map(x=>x.usd)),curSymbol=String(current.symbol||''),curSector=String(current.sector||'Otros'),candSector=String(candidate.sector||'Otros'),source=rows.find(x=>x.symbol===curSymbol),sourceUsd=source?.usd||0;
  const sectorUsd=sector=>sum(rows.filter(x=>x.sector===sector).map(x=>x.usd));const curSectorUsd=sectorUsd(curSector),candSectorUsd=sectorUsd(candSector),sameSector=curSector===candSector;
  const candidateSectorAfterUsd=sameSector?candSectorUsd:candSectorUsd+sourceUsd;const candidateSectorAfterPct=total>0?candidateSectorAfterUsd/total*100:NaN,currentSectorPct=total>0?curSectorUsd/total*100:NaN,candidateSectorPct=total>0?candSectorUsd/total*100:NaN,correlation=returnCorrelation(current?.technical?.daily,candidate?.technical?.daily,60);
  return{totalPortfolioUsd:total,sourceUsd,currentSector:curSector,candidateSector:candSector,currentSectorPct,candidateSectorPct,candidateSectorAfterPct,sameSector,correlation};
}
function rotationComparison(current={},candidate={},settings={},context={}){
  const s=normalizeSettings(settings),curEff=opportunityEfficiency(current),candEff=opportunityEfficiency(candidate),curScore=finite(current.assetScore??current.rotationScore??current.rotation?.score),candScore=finite(candidate.assetScore??candidate.rotationScore??candidate.rotation?.score),scoreDelta=Number.isFinite(curScore)&&Number.isFinite(candScore)?candScore-curScore:NaN,utilityDelta=Number.isFinite(candEff.score)&&Number.isFinite(curEff.score)?candEff.score-curEff.score:NaN;
  const curUp=finite(current.remainingUpsidePct),candUp=finite(candidate.remainingUpsidePct),curDown=Math.abs(finite(current.downsideToSupportPct)),candDown=Math.abs(finite(candidate.downsideToSupportPct)),costs=switchingCostPct(s),grossEdge=Number.isFinite(curUp)&&Number.isFinite(candUp)?candUp-curUp:NaN,riskPenalty=Number.isFinite(curDown)&&Number.isFinite(candDown)?Math.max(0,candDown-curDown)*s.rotationRiskPenaltyFactor:0;
  const concentrationAfter=finite(context.candidateSectorAfterPct),concentrationPenalty=Number.isFinite(concentrationAfter)?Math.max(0,concentrationAfter-35)*s.rotationConcentrationPenaltyFactor:0,corr=finite(context.correlation),correlationPenalty=Number.isFinite(corr)&&corr>0.75?(corr-0.75)*s.rotationCorrelationPenaltyFactor:0,netEdge=Number.isFinite(grossEdge)?grossEdge-costs-riskPenalty-concentrationPenalty-correlationPenalty:NaN;
  const timing=candEff.timing,coverage=finite(candidate.rotation?.coveragePct??candidate.coveragePct),persistenceRuns=Math.max(0,Math.floor(finite(candidate.persistenceRuns)||0)),persistenceOk=persistenceRuns>=Math.max(1,Math.round(s.rotationPersistenceRuns));
  const qualityFloorOk=Number.isFinite(candScore)&&candScore>=s.rotationMinAssetScore&&(!Number.isFinite(curScore)||candScore>=curScore-s.rotationMaxScoreDowngrade),superiorityOk=(Number.isFinite(scoreDelta)&&scoreDelta>=s.rotationDeltaMin)||(Number.isFinite(utilityDelta)&&utilityDelta>=s.rotationUtilityDeltaMin)||(Number.isFinite(netEdge)&&netEdge>=s.rotationNetEdgeMinPct+5&&(!Number.isFinite(scoreDelta)||scoreDelta>=-2)),coverageOk=Number.isFinite(coverage)&&coverage>=s.rotationCandidateCoverageMin,edgeOk=Number.isFinite(netEdge)?netEdge>=s.rotationNetEdgeMinPct:(Number.isFinite(utilityDelta)&&utilityDelta>=s.rotationUtilityDeltaMin+3),qualityOk=qualityFloorOk&&superiorityOk;
  let key='HOLD',label='MANTENER',reason='No hay una alternativa que supere simultáneamente calidad/eficiencia, ventaja neta, cobertura, persistencia y timing.';
  if(qualityOk&&coverageOk&&edgeOk){
    const portfolioNote=Number.isFinite(concentrationAfter)?` Exposición sector destino post-rotación aprox. ${concentrationAfter.toFixed(1)}%.`:'';
    const correlationNote=Number.isFinite(corr)?` Correlación 60d ${corr.toFixed(2)}.`:'';
    if(timing.executable&&persistenceOk){key='ROTATE';label='ROTAR';reason=`Alternativa ejecutable con ${Number.isFinite(scoreDelta)?`Δ score ${scoreDelta.toFixed(1)} pts`:''}${Number.isFinite(utilityDelta)?`${Number.isFinite(scoreDelta)?' · ':''}Δ eficiencia ${utilityDelta.toFixed(1)} pts`:''}${Number.isFinite(netEdge)?` · ventaja neta estimada ${netEdge.toFixed(1)}%`:''} y persistencia ${persistenceRuns} ciclos.${portfolioNote}${correlationNote}`}
    else {key='PREPARE_ROTATION';label='PREPARAR ROTACIÓN';reason=`Existe una alternativa superior${Number.isFinite(utilityDelta)?` en eficiencia por ${utilityDelta.toFixed(1)} pts`:Number.isFinite(scoreDelta)?` por ${scoreDelta.toFixed(1)} pts`:''}, pero ${!timing.executable?'todavía no tiene entrada confirmada':`la señal necesita ${Math.max(1,Math.round(s.rotationPersistenceRuns))} ciclos de persistencia`}. No vender aún.${portfolioNote}${correlationNote}`}
  }
  const recommendedSellPct=key==='ROTATE'?(Number.isFinite(netEdge)&&netEdge>=12?75:Number.isFinite(netEdge)&&netEdge>=7?50:25):0;
  return{key,label,reason,recommendedSellPct,currentEfficiency:curEff.score,candidateEfficiency:candEff.score,utilityDelta,scoreDelta,grossUpsideEdgePct:grossEdge,switchingCostPct:costs,riskPenaltyPct:riskPenalty,concentrationPenaltyPct:concentrationPenalty,correlationPenaltyPct:correlationPenalty,netEdgePct:netEdge,candidateTiming:timing,persistenceRuns,persistenceRequired:Math.max(1,Math.round(s.rotationPersistenceRuns)),qualityOk,qualityFloorOk,superiorityOk,coverageOk,edgeOk,persistenceOk,executable:timing.executable,candidateSymbol:String(candidate.symbol||''),portfolioContext:{...context},auditable:true};
}
function selectBestRotation(current={},candidates=[],settings={},context={}){
  const portfolio=Array.isArray(context.portfolio)?context.portfolio:[],comps=(candidates||[]).filter(c=>c&&String(c.symbol||'')!==String(current.symbol||'')&&!c.dataEssentialMissing&&!c.blacklisted&&!c.allocationBlocked&&c.liquidity?.operationalEligible!==false&&['A','B'].includes(String(c.tier||''))).map(c=>{const pc=portfolioRotationContext(current,c,portfolio);return{candidate:c,comparison:rotationComparison(current,c,settings,{...context,...pc,portfolio:undefined})}});
  const rank=x=>{const c=x.comparison;return (c.key==='ROTATE'?300:c.key==='PREPARE_ROTATION'?200:0)+(Number.isFinite(c.utilityDelta)?c.utilityDelta:0)+(Number.isFinite(c.netEdgePct)?Math.min(40,c.netEdgePct):0)+(Number.isFinite(c.candidateEfficiency)?c.candidateEfficiency/10:0)};
  comps.sort((a,b)=>rank(b)-rank(a));const best=comps[0]||null;return{bestCandidate:best?.candidate||null,comparison:best?.comparison||null,alternatives:comps.slice(0,5).map(x=>({symbol:x.candidate.symbol,state:x.candidate.state?.key,timing:x.comparison.candidateTiming?.key,scoreDelta:x.comparison.scoreDelta,netEdgePct:x.comparison.netEdgePct,utilityDelta:x.comparison.utilityDelta,correlation:x.comparison.portfolioContext?.correlation,sectorAfterPct:x.comparison.portfolioContext?.candidateSectorAfterPct,key:x.comparison.key}))};
}
function operationalState(input={},settings={}){
  const s=normalizeSettings(settings),rot=input.rotation||{},val=input.valuation||{},score=finite(input.rotationScore),coverage=finite(input.scoreCoveragePct),tier=String(input.tier||'C'),pnl=finite(val.pnlUsdPct),delta=finite(rot.delta),structuralRatio=Number.isFinite(finite(input.potentialDownsideRatio))?finite(input.potentialDownsideRatio):upsideDownsideRatio(input),missing=Array.isArray(input.missingData)?input.missingData.filter(Boolean):[];
  if(input.blacklisted&&!input.hasPosition)return{key:'EXCLUDED',label:'EXCLUIDO',reason:`Blacklist manual${input.blacklistReason?`: ${input.blacklistReason}`:''}. No se analiza como destino de capital hasta quitar la exclusión.`};
  if(input.dataEssentialMissing)return{key:'INSUFFICIENT',label:'ANÁLISIS PARCIAL',reason:missing.length?`Radar no pudo completar todavía: ${missing.join(', ')}. Reintentá con Analizar.`:'Radar no pudo completar todavía todos los datos necesarios. Reintentá con Analizar.'};
  if(input.hasPosition){
    if(rot.recommendation?.key==='ROTATE')return{key:'ROTATE',label:'ROTAR',reason:rot.recommendation.reason};
    if(rot.recommendation?.key==='PREPARE_ROTATION')return{key:'PREPARE_ROTATION',label:'PREPARAR ROTACIÓN',reason:rot.recommendation.reason};
    if(input.blacklisted)return{key:'HOLD_EXCLUDED',label:'EXCLUIDO · NO AUMENTAR',reason:`El activo está en blacklist${input.blacklistReason?`: ${input.blacklistReason}`:''}. Se mantiene monitoreo porque ya está en cartera, pero no puede recibir capital nuevo ni ser destino de rotación.`};
    if(Number.isFinite(delta)&&delta>=s.rotationDeltaMin&&rot.superiorCandidate&&rot.superiorCandidate.state?.key==='BUY'&&((Number.isFinite(pnl)&&pnl>effectiveHurdle(s))||input.structuralDeterioration||input.liquidityDegraded))return{key:'ROTATE',label:'ROTAR',reason:`Existe una alternativa ejecutable superior por ${delta.toFixed(1)} puntos y la posición actual presenta profit materializable o deterioro estructural/liquidez.`};
    if(Number.isFinite(pnl)&&pnl>10&&input.nearResistance)return{key:'REALIZE',label:'MATERIALIZAR',reason:'Profit USD importante y cercanía a resistencia relevante.'};
    if(Number.isFinite(pnl)&&pnl>5&&(input.nearResistance||finite(input.remainingUpsidePct)<5))return{key:'REALIZE_PARTIAL',label:'MATERIALIZAR PARCIAL',reason:'Profit USD materializable con upside restante reducido o resistencia próxima.'};
    if(input.liquidityDegraded)return{key:'HOLD',label:'REVISAR LIQUIDEZ',reason:'La posición quedó fuera de Tier A/B. No se aplica stop-loss automático: revisar salida/rotación eficiente sin aumentar exposición.'};
    if(input.structuralDeterioration)return{key:'HOLD',label:'REVISAR ESTRUCTURA',reason:'La estructura técnica se deterioró. No se aplica stop-loss automático: revisar tesis, materialización o rotación.'};
    return{key:'HOLD',label:'MANTENER',reason:'La posición conserva estructura válida y no existe una rotación claramente superior.'};
  }
  if(input.liquidityEligible===false)return{key:'WATCHLIST',label:'FUERA POR LIQUIDEZ',reason:`No supera el filtro duro de liquidez${Array.isArray(input.liquidityGateReasons)&&input.liquidityGateReasons.length?`: ${input.liquidityGateReasons.join(' · ')}`:''}. No se asigna capital nuevo.`};
  if(!['A','B'].includes(tier))return{key:'WATCHLIST',label:'SEGUIMIENTO',reason:'La liquidez no alcanza Tier A/B para la estrategia operativa.'};
  if(Number.isFinite(structuralRatio)&&structuralRatio<s.minPotentialDownside)return{key:'WAIT',label:'ESPERAR',reason:`Potencial/caída a soporte ${structuralRatio.toFixed(2)} inferior al mínimo ${s.minPotentialDownside.toFixed(2)}. No usa stop-loss.`};
  const es=String(input.entryStatus||'').toUpperCase();
  if(score>=68&&(es==='ESPERAR CONFIRMACIÓN'||es==='ESPERAR CONFIRMACION'))return{key:'WAIT_CONFIRMATION',label:'ESPERAR CONFIRMACIÓN',reason:`El activo es atractivo para cartera, pero el plan operativo todavía no confirmó entrada${coverage<80?` y la cobertura del score es ${Number.isFinite(coverage)?coverage.toFixed(0):'N/D'}%`:''}. Mantener en seguimiento; no ejecutar compra.`};
  if(!(coverage>=80))return{key:'ENTRY_ZONE',label:'ZONA DE ENTRADA',reason:'La zona puede ser interesante, pero falta cobertura suficiente para elevarla a compra fuerte.'};
  if(score>=78&&input.technicalConfirmed&&input.entryAttractive!==false)return{key:'BUY',label:'COMPRAR AHORA',reason:'Tier A/B, score de activo alto, cobertura suficiente y plan técnico LONG operable confirmado cerca de una zona razonable de entrada.'};
  if(score>=68)return{key:'ENTRY_ZONE',label:'ZONA DE ENTRADA',reason:'Atractivo suficiente para seguimiento de entrada; todavía no existe señal operable completa.'};
  return{key:'WAIT',label:'ESPERAR',reason:'Todavía no existe ventaja suficiente para asignar capital.'};
}
function buildAlerts(input={},settings={}){
  const out=[],s=normalizeSettings(settings),val=input.valuation||{},p=finite(val.pnlUsdPct),tier=String(input.tier||''),state=input.state||{};
  const push=(severity,type,reason)=>out.push({severity,type,reason,createdAt:new Date().toISOString()});
  if(input.blacklisted)push('YELLOW','POLICY',`Blacklist manual${input.blacklistReason?`: ${input.blacklistReason}`:''}. No aumentar ni usar como destino de rotación.`);
  if(input.dataEssentialMissing)push('YELLOW','DATA_QUALITY',Array.isArray(input.missingData)&&input.missingData.length?`Análisis parcial: falta completar ${input.missingData.join(', ')}.`:'Análisis parcial: falta completar una o más fuentes.');
  if(input.liquidityDegraded)push('RED','LIQUIDITY',`La posición quedó fuera del universo operativo Tier A/B${tier?` (Tier ${tier})`:''}.`);
  else if(input.tierPrevious&&tier&&input.tierPrevious!==tier&&['C','D'].includes(tier))push('RED','LIQUIDITY',`La liquidez se degradó de Tier ${input.tierPrevious} a Tier ${tier}.`);
  if(Number.isFinite(p)&&p>10)push('ORANGE','PROFIT','PnL USD realizable supera 10%: revisar materialización.');else if(Number.isFinite(p)&&p>5)push('ORANGE','PROFIT','PnL USD realizable supera 5%: profit materializable.');else if(Number.isFinite(p)&&p>effectiveHurdle(s))push('YELLOW','PROFIT',`PnL USD realizable superó el hurdle efectivo ${effectiveHurdle(s).toFixed(2)}%.`);
  if(input.nearResistance)push(Number.isFinite(p)&&p>=5?'ORANGE':'YELLOW','TECHNICAL','Precio próximo a resistencia estructural.');
  if(input.invalidated)push('ORANGE','STRUCTURE','Pérdida de estructura: revisar tesis o rotación. El módulo no aplica stop-loss automático.');
  if(input.weeklyBearish)push('ORANGE','TECHNICAL','La estructura semanal está bajista: revisar continuidad de la tesis.');
  if(Number.isFinite(finite(input.gapPct))&&finite(input.gapPct)<=-4)push('ORANGE','GAP',`Gap adverso ${finite(input.gapPct).toFixed(2)}% respecto del cierre previo.`);
  if(Number.isFinite(finite(input.volumeAccelerationPct))&&finite(input.volumeAccelerationPct)<=-40)push('YELLOW','VOLUME','El volumen monetario de 5 ruedas se desaceleró más de 40% frente a 20 ruedas.');
  if(Number.isFinite(finite(input.cclMovePct))&&Math.abs(finite(input.cclMovePct))>=3)push('ORANGE','CCL_MOVE',`Movimiento abrupto del CCL de ${finite(input.cclMovePct).toFixed(2)}% desde la última actualización utilizable.`);
  if(Number.isFinite(finite(input.cclDislocationPct))&&Math.abs(finite(input.cclDislocationPct))>=3)push('YELLOW','CCL_DISLOCATION',`Desacople CEDEAR/subyacente vs CCL de ${finite(input.cclDislocationPct).toFixed(2)}%.`);
  if(input.earningsSoon)push('YELLOW','EARNINGS',String(input.earningsReason||'Earnings próximos: revisar gap/event risk antes de aumentar exposición.'));
  if(state.key==='BUY')push('ORANGE','BUY','El activo pasó a COMPRAR con confirmación y cobertura suficiente.');else if(state.key==='WAIT_CONFIRMATION')push('YELLOW','BUY','Activo atractivo para cartera, pero el timing operativo exige ESPERAR CONFIRMACIÓN.');else if(state.key==='ENTRY_ZONE')push('YELLOW','BUY','El activo está en ZONA DE ENTRADA; todavía no existe señal operable completa.');
  if(state.key==='ROTATE')push('ORANGE','ROTATION','Se detectó una rotación ejecutable: la alternativa superior tiene timing confirmado y supera los filtros netos.');else if(state.key==='PREPARE_ROTATION')push('YELLOW','ROTATION','Existe una alternativa superior, pero todavía no corresponde vender: Radar espera confirmación/persistencia del destino.');
  if(!out.length)push('GREEN','NORMAL','Seguimiento normal; sin condición urgente.');
  return out;
}
function simulateRotation(input={},settings={}){
  const s=normalizeSettings(settings),sellPct=clamp(finite(input.sellPct),0,100),currentUsd=finite(input.currentUsdRealizable),entryCostPct=Number.isFinite(finite(input.entryCostPct))?finite(input.entryCostPct):s.entryFeePct;
  const gross=currentUsd>0?currentUsd*sellPct/100:NaN,net=gross;
  const embeddedExitCostsUsd=Math.max(0,finite(input.embeddedExitCostsUsd)||0)*sellPct/100;
  const dest=(input.destinations||[]).map(x=>({...x,weightPct:finite(x.weightPct)}));const totalW=sum(dest.map(x=>x.weightPct));
  const allocations=dest.map(x=>({symbol:x.symbol,sector:x.sector||'Otros',weightPct:x.weightPct,grossUsd:net>0&&totalW>0?net*x.weightPct/totalW:NaN,netInvestableUsd:net>0&&totalW>0?net*x.weightPct/totalW*(1-entryCostPct/100):NaN,rotationScore:finite(x.rotationScore),downsidePct:finite(x.downsidePct),upsidePct:finite(x.upsidePct)}));
  const weighted=(field)=>{const valid=allocations.filter(x=>Number.isFinite(finite(x[field]))&&x.weightPct>0),w=sum(valid.map(x=>x.weightPct));return w>0?sum(valid.map(x=>finite(x[field])*x.weightPct))/w:NaN};
  const afterScore=weighted('rotationScore'),afterDownsidePct=weighted('downsidePct'),afterUpsidePct=weighted('upsidePct');
  const beforeScore=finite(input.currentRotationScore),beforeDownsidePct=finite(input.currentDownsidePct),beforeUpsidePct=finite(input.currentUpsidePct),delta=Number.isFinite(afterScore)&&Number.isFinite(beforeScore)?afterScore-beforeScore:NaN;
  const sectors=allocations.filter(x=>x.weightPct>0).map(x=>({sector:x.sector,weightPct:x.weightPct}));
  return{sellPct,grossRecoveredUsd:gross,netRecoveredUsd:net,totalEstimatedCostsUsd:gross>0?embeddedExitCostsUsd+net*entryCostPct/100:NaN,allocations,beforeScore,afterScore,scoreDelta:delta,beforeDownsidePct,afterDownsidePct,beforeUpsidePct,afterUpsidePct,beforeSector:input.currentSector||'N/D',afterSectorExposure:sectors,meetsRotationDelta:Number.isFinite(delta)&&delta>=s.rotationDeltaMin,noOrderExecution:true};
}
function stagedEntry(capitalUsd,settings={}){const s=normalizeSettings(settings),c=finite(capitalUsd);return s.entryTranches.map((w,i)=>({stage:`E${i+1}`,weightPct:w,usd:c>0?c*w/100:NaN}))}
function stagedProfit(quantity,settings={}){const s=normalizeSettings(settings),q=finite(quantity),labels=['TP estructural 1','TP estructural 2','Agotamiento / rechazo','Runner'];return s.profitTranches.map((w,i)=>({stage:labels[i],weightPct:w,quantity:q>0?q*w/100:NaN}))}
function criticalCaseArsOnly({entryArs,currentArs,entryCcl,currentCcl,quantity=1}={}){return realizableUsd({entryCedearArs:entryArs,currentCedearArs:currentArs,entryCcl,currentCcl,quantity}, {entryFeePct:0,exitFeePct:0,fxFrictionPct:0,safetyMarginPct:0,fallbackMarketSpreadPct:0,hurdlePct:3})}
const api={VERSION,DEFAULTS,ROTATION_WEIGHTS,normalizeSettings,adtv,persistence,quoteMicrostructure,liquidityMetrics,buildTierUniverse,effectiveHurdle,profitState,realizableUsd,sectorFundamentalModel,fundamentalComponents,structureScore,momentumScore,upsideDownsideRatio,upsideDownsideScore,rotationScore,opportunityCostScore,entryTiming,switchingCostPct,opportunityEfficiency,seriesReturns,returnCorrelation,portfolioRotationContext,rotationComparison,selectBestRotation,operationalState,buildAlerts,simulateRotation,stagedEntry,stagedProfit,criticalCaseArsOnly};
globalThis.RadarCedearRotationEngine=Object.freeze(api);
})();

;
