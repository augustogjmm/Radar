/* Radar Tecnico G2 - Fixed-income detail and scanner controller
   Extracted from certified runtime; order preserved. */

/* ===== RUNTIME BLOCK 19 ===== */
'use strict';
/*
 Radar Técnico G2 — Phase 10E / v4.36.0
 Fixed-income deep-analysis runtime extracted from the legacy inline bridge.
 Ownership: contract/cashflow normalization, G2 FixedIncomeEngine hydration, bond detail rendering,
 yield/duration/convexity scenarios, peers and bond watchlist handoff.
 Financial semantics are intentionally unchanged from certified v4.35.0 / 10D.
*/

const bondState={symbol:null,type:null,rf:null,panel:null,info:null,analytics:null,countryRisk:null};

function bondVal(obj,keys){
 for(const k of keys){
   const v=obj?.[k];
   if(v===undefined||v===null)continue;
   if(typeof v==='string'){
     const s=cleanSourceText(v);
     if(s)return s;
   }else{
     return v;
   }
 }
 return null;
}
function bondNum(obj,keys){
 const v=bondVal(obj,keys);
 if(v===null||v===undefined||String(v).trim()==='')return NaN;
 const raw=String(v).trim();
 let n=Number(raw);
 if(Number.isFinite(n))return n;
 const normalized=raw.includes(',')?raw.replace(/[.]/g,'').replace(',','.'):raw;
 n=Number(normalized);
 return Number.isFinite(n)?n:NaN;
}

function parseBondCalendarDate(v){
 if(!v)return null;
 if(v instanceof Date&&!isNaN(v)){
   return new Date(v.getFullYear(),v.getMonth(),v.getDate(),12,0,0,0);
 }
 const s=cleanSourceText(v);

 // YYYY-MM-DD o timestamp ISO: interpretar como fecha calendario local,
 // no como UTC, para evitar que Argentina muestre el día anterior.
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(m)return new Date(+m[1],+m[2]-1,+m[3],12,0,0,0);

 m=s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})/);
 if(m)return new Date(+m[3],+m[2]-1,+m[1],12,0,0,0);

 const d=new Date(s);
 if(isNaN(d))return null;
 return new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0,0);
}
function daysUntilBondDate(v){
 const d=parseBondCalendarDate(v);
 if(!d)return NaN;
 const today=new Date();today.setHours(12,0,0,0);
 return Math.max(0,Math.round((d-today)/86400000));
}

function bondDate(v){
 const d=parseBondCalendarDate(v);
 if(!d)return v?cleanSourceText(v):'—';
 const dd=String(d.getDate()).padStart(2,'0');
 const mm=String(d.getMonth()+1).padStart(2,'0');
 return `${dd}/${mm}/${d.getFullYear()}`;
}
function bondPct(v,d=2){return Number.isFinite(v)?v.toFixed(d)+'%':'—'}
function bondMoney(v){return Number.isFinite(v)?new Intl.NumberFormat('es-AR',{maximumFractionDigits:4}).format(v):'—'}



function deepFindBondField(obj,patterns,maxDepth=5){
 const regs=(Array.isArray(patterns)?patterns:[patterns]).map(x=>x instanceof RegExp?x:new RegExp(x,'i'));
 const seen=new Set();

 function walk(v,depth){
   if(v===null||v===undefined||depth>maxDepth)return null;
   if(typeof v!=='object')return null;
   if(seen.has(v))return null;
   seen.add(v);

   for(const [k,val] of Object.entries(v)){
     if(regs.some(rx=>rx.test(String(k)))){
       if(val!==null&&val!==undefined&&cleanSourceText(val)!=='')return val;
     }
   }
   for(const val of Object.values(v)){
     if(val&&typeof val==='object'){
       const found=walk(val,depth+1);
       if(found!==null&&found!==undefined)return found;
     }
   }
   return null;
 }
 return walk(obj,0);
}

function flattenBondText(obj,maxDepth=6){
 const out=[],seen=new Set();
 function walk(v,d){
   if(v===null||v===undefined||d>maxDepth)return;
   if(typeof v==='string'||typeof v==='number'){
     const s=cleanSourceText(v);
     if(s)out.push(s);
     return;
   }
   if(typeof v!=='object'||seen.has(v))return;
   seen.add(v);
   for(const x of Object.values(v))walk(x,d+1);
 }
 walk(obj,0);
 return out.join(' ');
}
function parseCouponFrequency(text){
 const s=cleanSourceText(text).toLowerCase();
 if(/mensual/.test(s))return 12;
 if(/bimestral/.test(s))return 6;
 if(/trimestral/.test(s))return 4;
 if(/cuatrimestral/.test(s))return 3;
 if(/semestral/.test(s))return 2;
 if(/anual/.test(s))return 1;
 return NaN;
}
function parseCouponRate(text){
 const s=cleanSourceText(text);
 const m=s.match(/([0-9]+(?:[.,][0-9]+)?)\s*%/);
 if(!m)return NaN;
 return Number(m[1].replace(',','.'));
}
function addMonthsBondDate(d,months){
 const day=d.getDate();
 const x=new Date(d.getFullYear(),d.getMonth()+months,1,12,0,0,0);
 const last=new Date(x.getFullYear(),x.getMonth()+1,0,12,0,0,0).getDate();
 x.setDate(Math.min(day,last));
 return x;
}
function derivePlainVanillaOnSchedule(rf){
 if(rf?.rfClass!=='ON'||!rf?.contract)return false;
 if(Array.isArray(rf.futureFlows)&&rf.futureFlows.length)return false;

 const freq=rfNum(rf.contract.frequency);
 const rate=rfNum(rf.contract.couponRate);
 const maturity=parseBondCalendarDate(rf.vencimiento);
 const emission=parseBondCalendarDate(rf.contract.emission);

 if(!Number.isFinite(freq)||freq<=0||!Number.isFinite(rate)||rate<0||!maturity)return false;

 const months=Math.round(12/freq);
 if(!Number.isFinite(months)||months<=0)return false;

 const allDates=[];
 let d=new Date(maturity);
 for(let guard=0;guard<100;guard++){
   if(emission&&d<=emission)break;
   allDates.push(new Date(d));
   d=addMonthsBondDate(d,-months);
 }
 allDates.sort((a,b)=>a-b);

 const today=new Date();today.setHours(12,0,0,0);
 const couponNominal=100*(rate/100)/freq;
 const bullet=!!rf.contract.bullet;

 const flows=allDates.filter(d=>d>=today).map(d=>{
   const isMaturity=Math.abs(d-maturity)<86400000;
   const capital=bullet&&isMaturity?100:0;
   const interest=couponNominal;
   return{
     fecha:bondDate(d),
     capital,
     interes:interest,
     total:capital+interest,
     source:'derivado por términos contractuales'
   };
 });

 if(!flows.length)return false;
 rf.flujos=flows;
 rf.generatedSchedule=true;
 prepareRemainingCashflows(rf);

 const previous=addMonthsBondDate(rf.nextFlowDate,-months);
 const next=rf.nextFlowDate;
 if(previous&&next&&today>previous&&today<next){
   const totalDays=(next-previous)/86400000;
   const elapsed=(today-previous)/86400000;
   if(totalDays>0){
     rf.accruedInterest=couponNominal*(elapsed/totalDays);
     rf.accruedInterestDerived=true;
   }
 }
 return true;
}

function textContainsAny(text,parts){
 const s=cleanSourceText(text).toLowerCase();
 return parts.some(p=>s.includes(p.toLowerCase()));
}

function bondCurrentPrice(rf,panel){
 const vals=[rfNum(rf?.precio),rfNum(rf?.price),rfNum(panel?.trade),rfNum(panel?.closingPrice)];
 for(const v of vals)if(Number.isFinite(v)&&v>0)return v;
 const bid=rfNum(panel?.bidPrice),ask=rfNum(panel?.offerPrice);
 if(Number.isFinite(bid)&&bid>0&&Number.isFinite(ask)&&ask>0)return(bid+ask)/2;
 if(Number.isFinite(bid)&&bid>0)return bid;
 if(Number.isFinite(ask)&&ask>0)return ask;
 return NaN;
}
function bondPriceSource(rf,panel){
 if(Number.isFinite(rfNum(rf?.precio))&&rfNum(rf?.precio)>0)return'compararfondos.com.ar · precio BYMA';
 if(Number.isFinite(rfNum(panel?.trade))&&rfNum(panel?.trade)>0)return'Open BYMADATA · última operación';
 if(Number.isFinite(rfNum(panel?.closingPrice))&&rfNum(panel?.closingPrice)>0)return'Open BYMADATA · cierre';
 if(Number.isFinite(rfNum(panel?.bidPrice))||Number.isFinite(rfNum(panel?.offerPrice)))return'Open BYMADATA · puntas';
 return'Precio no disponible';
}

function normalizeBondFlow(flow){
 const obj=flow||{},keys=Object.keys(obj);
 const keyBy=(rx)=>keys.find(k=>rx.test(String(k)));
 const rawBy=(rx)=>{const k=keyBy(rx);return k?obj[k]:null};

 const date=bondVal(obj,['fecha','fechaPago','paymentDate','date','vencimiento','fechaVencimiento'])||
            cleanSourceText(rawBy(/fecha|date|venc/i));

 let capital=bondNum(obj,['capital','amort','amortizacion','amortización','amortization','principal']);
 if(!Number.isFinite(capital))capital=bondNum({v:rawBy(/capital|amort|principal/i)},['v']);

 let interest=bondNum(obj,['renta','interes','interés','intereses','interest','coupon','cupon','cupón']);
 if(!Number.isFinite(interest))interest=bondNum({v:rawBy(/inter[eé]s|renta|coupon|cup[oó]n/i)},['v']);

 let total=bondNum(obj,['flujo','total','cashflow','pago','payment','importe','monto','amount']);
 if(!Number.isFinite(total))total=bondNum({v:rawBy(/flujo|cash.?flow|pago|payment|importe|monto|amount|total/i)},['v']);

 if(!Number.isFinite(total)){
   const parts=[capital,interest].filter(Number.isFinite);
   if(parts.length)total=parts.reduce((a,b)=>a+b,0);
 }

 if(!Number.isFinite(total)){
   const nums=[];
   for(const [k,v] of Object.entries(obj)){
     if(/fecha|date|id|ticker|nombre|tipo|moneda|indice/i.test(k))continue;
     const n=bondNum({v},['v']);
     if(Number.isFinite(n)&&n!==0)nums.push(n);
   }
   if(nums.length===1)total=nums[0];
 }

 return{date,capital,interest,total,raw:obj};
}
function renderBondCashflows(flows,rf=null){
 const today=new Date();today.setHours(12,0,0,0);

 let arr=(Array.isArray(flows)?flows:[]).map(normalizeBondFlow).filter(x=>{
   const d=parseFlowDateValue(x.date);
   return (!d||d>=today)&&(x.date||Number.isFinite(x.total)||Number.isFinite(x.capital)||Number.isFinite(x.interest));
 });

 if(!arr.length){
   $('bondCashflowBody').innerHTML='<tr><td colspan="5">No se pudo estructurar todavía el calendario futuro.</td></tr>';
   $('bondCalendarSummary').textContent='La ficha contractual llegó, pero la fuente analítica no devolvió cashflows y no fue posible derivarlos de forma segura.';
   return;
 }

 const totals=arr.map(x=>x.total).filter(Number.isFinite);
 const max=totals.length?Math.max(1,...totals.map(Math.abs)):1;

 let summary=`Pagos futuros desde hoy: ${arr.length}.`;
 if(rf?.argenBondValidated)summary+=' Cashflows contrastados con argen.bond.';
 else if(rf?.generatedSchedule)summary+=' Calendario derivado de tasa, frecuencia, vencimiento y amortización informados por la ficha contractual.';

 if(rfContractCurrency(rf)==='USD')summary+=' Importes expresados por VN 100 en USD.';
 if(Number.isFinite(rf?.residual))summary+=` Residual: ${rf.residual.toFixed(2)}%.`;

 $('bondCalendarSummary').textContent=summary;

 $('bondCashflowBody').innerHTML=arr.map(x=>`
  <tr>
   <td>${bondDate(x.date)}</td>
   <td>${Number.isFinite(x.capital)?formatContractAmount(x.capital,rf):'—'}</td>
   <td>${Number.isFinite(x.interest)?formatContractAmount(x.interest,rf):'—'}</td>
   <td><b>${Number.isFinite(x.total)?formatContractAmount(x.total,rf):'—'}</b></td>
   <td>${Number.isFinite(x.total)
     ?`<div class="bond-cashbar"><i style="width:${Math.max(3,Math.abs(x.total)/max*100)}%"></i></div>`
     :'<span class="rf-na">importe no estructurado</span>'}</td>
  </tr>`).join('');
}
function modifiedDurationValue(rf){
 const d=Number(rf?.duration),y=Number(rf?.tir);
 if(!Number.isFinite(d))return NaN;
 return Number.isFinite(y)?d/(1+y/100):d;
}
function priceSensitivityPct(rf,deltaBps){
 const md=modifiedDurationValue(rf);return Number.isFinite(md)?-md*(deltaBps/10000)*100:NaN;
}
function estimatedPriceFromYield(rf,price,targetYield){
 const y=Number(rf?.tir),t=Number(targetYield);
 if(!Number.isFinite(price)||!Number.isFinite(y)||!Number.isFinite(t))return NaN;
 const pct=priceSensitivityPct(rf,(t-y)*100);return Number.isFinite(pct)?price*(1+pct/100):NaN;
}
function renderBondScenarios(rf){
 $('bondScenarioGrid').innerHTML=[-200,-100,-50,50,100,200].map(bp=>{
   const pct=priceSensitivityPct(rf,bp),pos=Number.isFinite(pct)&&pct>=0;
   return `<div class="bond-scenario ${pos?'positive':'negative'}"><small>Yield ${bp>0?'+':''}${bp} pb</small><b>${Number.isFinite(pct)?(pct>=0?'+':'')+pct.toFixed(2)+'%':'—'}</b></div>`;
 }).join('');
}
function bondClass(rf,type){
 const t=String(rf?.tipo||'').toLowerCase();
 if(type==='on'||/obligaci|corporativ|\bon\b/.test(t))return'ON';
 if(/dual/.test(t))return'DUAL';
 if(/cer|uva|boncer/.test(t))return'CER';
 if(/dollar|dólar|linked/.test(t))return'DL';
 if(/lecap|boncap|fija|capitaliz/.test(t))return'FIJA';
 if(/soberano|global|bonar|provincial/.test(t))return'SOBERANO';
 return'OTRO';
}

function enrichBondContractData(rf,panel,info,type){
 const root=info?.data?.[0]||info||{};
 const price=bondCurrentPrice(rf,panel);
 const parity=rfNum(rf?.paridad);

 const amortRaw=deepFindBondField(root,[/forma.*amort/i,/amortiz/i]);
 const couponRaw=deepFindBondField(root,[/tipo.*inter/i,/tasa.*inter/i,/intereses?/i,/^interes$/i,/cup[oó]n/i]);
 const isinRaw=deepFindBondField(root,[/^isin$/i,/codigo.*isin/i]);
 const emissionRaw=deepFindBondField(root,[/fecha.*emisi/i,/emision/i]);
 const issuerRaw=deepFindBondField(root,[/^emisor$/i,/denominacion.*emisor/i]);
 const lawRaw=deepFindBondField(root,[/^ley$/i,/legisl/i,/pais.*ley/i]);
 const guaranteeRaw=deepFindBondField(root,[/garant/i]);
 const nominalRaw=deepFindBondField(root,[/monto.*nominal/i,/valor.*nominal/i]);
 const residualAmountRaw=deepFindBondField(root,[/monto.*residual/i]);
 const minDenomRaw=deepFindBondField(root,[/denominacion.*min/i,/minim/i]);

 const currencyRaw=deepFindBondField(root,[
   /moneda.*emisi/i,/moneda.*denomin/i,/moneda.*pago/i,/moneda.*capital/i,
   /denomin.*moneda/i,/currency.*issue/i,/payment.*currency/i
 ]);

 const nominal=rfNum(nominalRaw),residualAmount=rfNum(residualAmountRaw);
 const fullText=flattenBondText(root);

 const descriptor=[
   rf?.nombre,rf?.tipo,panel?.category,
   deepFindBondField(root,[/denominacion/i,/descripcion/i,/nombre/i]),
   couponRaw,amortRaw,fullText
 ].filter(Boolean).map(cleanSourceText).join(' ');

 const bullet=textContainsAny(amortRaw,[
   'íntegra al vencimiento','integra al vencimiento',
   '100% al vencimiento','total al vencimiento','una cuota al vencimiento',
   'única cuota','unica cuota','bullet'
 ]);

 const zeroCoupon=textContainsAny(descriptor,[
   'cero cupón','cero cupon','cupón cero','cupon cero','zero coupon'
 ]);

 const currencyText=cleanSourceText(currencyRaw)+' '+fullText;
 let contractCurrency=normalizeContractCurrencyText(currencyRaw);
 if(!contractCurrency){
   if(/D[ÓO]LARES?\s+ESTADOUNIDENSES|USD|U\$S/i.test(currencyText))contractCurrency='USD';
   else if(/PESOS?\s+ARGENTINOS|ARS/i.test(currencyText))contractCurrency='ARS';
 }

 let paymentLocation='';
 if(/D[ÓO]LARES?\s+ESTADOUNIDENSES.{0,120}(EXTERIOR|CABLE)/i.test(currencyText)||
    /PAGADER[AO]S?.{0,120}(EXTERIOR|CABLE)/i.test(currencyText)){
   paymentLocation='EXT';
 }else if(/D[ÓO]LARES?\s+ESTADOUNIDENSES.{0,120}(ARGENTINA|LOCAL)/i.test(currencyText)||
          /PAGADER[AO]S?.{0,120}(ARGENTINA|LOCAL)/i.test(currencyText)){
   paymentLocation='LOCAL';
 }

 const frequency=parseCouponFrequency(cleanSourceText(couponRaw)+' '+fullText);
 const couponRate=parseCouponRate(cleanSourceText(couponRaw));

 rf.contract={
   amortization:cleanSourceText(amortRaw),
   coupon:cleanSourceText(couponRaw),
   isin:cleanSourceText(isinRaw),
   emission:emissionRaw,
   issuer:cleanSourceText(issuerRaw),
   law:cleanSourceText(lawRaw),
   guarantee:cleanSourceText(guaranteeRaw),
   nominal,
   residualAmount,
   minDenomination:rfNum(minDenomRaw),
   bullet,
   zeroCoupon,
   contractCurrency,
   paymentLocation,
   frequency,
   frequencyLabel:Number.isFinite(frequency)?({12:'Mensual',6:'Bimestral',4:'Trimestral',3:'Cuatrimestral',2:'Semestral',1:'Anual'}[frequency]||''):'',
   couponRate
 };

 if(Number.isFinite(nominal)&&nominal>0&&Number.isFinite(residualAmount)&&residualAmount>=0){
   const pct=residualAmount/nominal*100;
   if(pct>=0&&pct<=100){
     rf.residual=pct;
     rf.residualDerived=false;
   }
 }

 if(zeroCoupon&&(!Number.isFinite(rf.accruedInterest)||rf.accruedInterest<0)){
   rf.accruedInterest=0;
   rf.accruedInterestDerived=true;
 }

 if((!Number.isFinite(rf.residual)||rf.residual<=0||rf.residual>100)&&bullet){
   rf.residual=100;
   rf.residualDerived=true;
 }

 rf.couponLabel=zeroCoupon?'Cero cupón':(cleanSourceText(couponRaw)||'No informado');
 rf.amortizationLabel=cleanSourceText(amortRaw)||(bullet?'Íntegra al vencimiento':'No informada');
 rf.isinLabel=cleanSourceText(isinRaw)||'No informado por BYMA';
 rf.issuerLabel=cleanSourceText(issuerRaw)||'No informado';
 rf.lawLabel=cleanSourceText(lawRaw)||'No informada';
 rf.guaranteeLabel=cleanSourceText(guaranteeRaw)||'No informada';
 rf.emissionLabel=emissionRaw?bondDate(emissionRaw):'No informada';

 return rf;
}


function solveBondYtm(price,flows){
 if(!Number.isFinite(price)||price<=0||!Array.isArray(flows)||!flows.length)return NaN;
 const today=new Date();today.setHours(12,0,0,0);

 const cf=flows.map(x=>{
   const d=parseBondCalendarDate(x.date||x.fecha);
   const total=rfNum(x.total);
   if(!d||!Number.isFinite(total))return null;
   const t=Math.max(0,(d-today)/86400000/365);
   return{t,total};
 }).filter(Boolean).filter(x=>x.t>0);

 if(!cf.length)return NaN;

 const pv=y=>cf.reduce((s,x)=>s+x.total/Math.pow(1+y,x.t),0);
 let lo=-0.90,hi=2.00;
 let flo=pv(lo)-price,fhi=pv(hi)-price;
 if(!Number.isFinite(flo)||!Number.isFinite(fhi)||flo*fhi>0)return NaN;

 for(let i=0;i<100;i++){
   const mid=(lo+hi)/2;
   const fm=pv(mid)-price;
   if(Math.abs(fm)<1e-8)return mid*100;
   if(flo*fm<=0){
     hi=mid;fhi=fm;
   }else{
     lo=mid;flo=fm;
   }
 }
 return ((lo+hi)/2)*100;
}
function numericModifiedDuration(price,yieldPct,flows){
 if(!Number.isFinite(price)||!Number.isFinite(yieldPct)||!Array.isArray(flows)||!flows.length)return NaN;
 const today=new Date();today.setHours(12,0,0,0);
 const cf=flows.map(x=>{
   const d=parseBondCalendarDate(x.date||x.fecha);
   const total=rfNum(x.total);
   if(!d||!Number.isFinite(total))return null;
   return{t:Math.max(0,(d-today)/86400000/365),total};
 }).filter(Boolean).filter(x=>x.t>0);

 const pv=y=>cf.reduce((s,x)=>s+x.total/Math.pow(1+y,x.t),0);
 const y=yieldPct/100,eps=0.0001;
 const p0=pv(y),pUp=pv(y+eps),pDn=pv(y-eps);
 if(!Number.isFinite(p0)||p0<=0||!Number.isFinite(pUp)||!Number.isFinite(pDn))return NaN;
 return-(pUp-pDn)/(2*p0*eps);
}
function finalizeOnAnalytics(rf,panel,ctx){
 if(rf?.rfClass!=='ON')return rf;

 if((!Array.isArray(rf.futureFlows)||!rf.futureFlows.length)){
   derivePlainVanillaOnSchedule(rf);
 }

 const contractPrice=bondPriceInContractCurrency(rf,panel,ctx);
 rf.contractPrice=contractPrice;

 if(Number.isFinite(rf.accruedInterest)&&rf.accruedInterest>=0&&
    Number.isFinite(rf.residual)&&rf.residual>=0){
   rf.technicalValue=rf.residual+rf.accruedInterest;
   rf.technicalValueDerived=true;
 }

 if((!Number.isFinite(rf.paridad)||rf.paridad<=0)&&
    Number.isFinite(contractPrice)&&contractPrice>0&&
    Number.isFinite(rf.technicalValue)&&rf.technicalValue>0){
   rf.paridad=contractPrice/rf.technicalValue*100;
   rf.paridadDerived=true;
 }

 if((!Number.isFinite(rf.tir))&&Number.isFinite(contractPrice)&&contractPrice>0&&
    Array.isArray(rf.futureFlows)&&rf.futureFlows.length){
   const dirty=contractPrice+(Number.isFinite(rf.accruedInterest)?rf.accruedInterest:0);
   const y=solveBondYtm(dirty,rf.futureFlows);
   if(Number.isFinite(y)){
     rf.tir=y;
     rf.tirDerived=true;
   }
 }

 if((!Number.isFinite(rf.duration)||rf.duration<=0)&&Number.isFinite(rf.tir)&&
    Number.isFinite(contractPrice)&&Array.isArray(rf.futureFlows)&&rf.futureFlows.length){
   const dirty=contractPrice+(Number.isFinite(rf.accruedInterest)?rf.accruedInterest:0);
   const md=numericModifiedDuration(dirty,rf.tir,rf.futureFlows);
   if(Number.isFinite(md)&&md>0){
     rf.duration=md;
     rf.durationDerived=true;
   }
 }

 if(!rf.ecoNextPayment&&rf.nextFlowDate)rf.ecoNextPayment=bondDate(rf.nextFlowDate);
 return rf;
}


function g2LocalDateString(){
 const d=new Date(),p=n=>String(n).padStart(2,'0');
 return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function g2BondIsoDate(v){
 const d=parseBondCalendarDate(v);return d?d.toISOString():null;
}
function g2BondFlowVerification(flow){
 const src=String(flow?.source||flow?.raw?.source||'').toLowerCase();
 if(src.includes('argen.bond'))return'VERIFIED';
 if(src.includes('derivado')||src.includes('argentinadatos'))return'PARTIAL';
 return'UNVERIFIED';
}
function g2FixedIncomeCashflows(rf,letter){
 let rows=Array.isArray(rf?.futureFlows)&&rf.futureFlows.length?rf.futureFlows:(Array.isArray(rf?.flujos)?rf.flujos:[]);
 const currency=rfContractCurrency(rf)||'—';
 const out=rows.map(normalizeBondFlow).map(x=>({
   paymentDate:g2BondIsoDate(x.date),
   coupon:Number.isFinite(x.interest)?x.interest:undefined,
   amortization:Number.isFinite(x.capital)?x.capital:undefined,
   total:Number.isFinite(x.total)?x.total:NaN,
   currency,
   verification:g2BondFlowVerification(x.raw||x),
   sourceId:String(x?.raw?.source||x?.source||'legacy-fixed-income')
 })).filter(x=>x.paymentDate&&Number.isFinite(x.total));
 if(!out.length&&letter&&Number.isFinite(rfNum(letter.vpv))){
   const dt=g2BondIsoDate(letter.fechaVencimiento||rf?.vencimiento);
   if(dt)out.push({paymentDate:dt,coupon:0,amortization:rfNum(letter.vpv),total:rfNum(letter.vpv),currency,verification:'PARTIAL',sourceId:'ArgentinaDatos'});
 }
 return out;
}
function g2FixedIncomeExternalMetrics(rf){
 const source=rf?.argenBondValidated?'argen.bond':rf?.validationSource||(rf?.ecoValidated?'Eco Valores':'legacy-fixed-income');
 const rows=[];
 if(Number.isFinite(rfNum(rf?.tir)))rows.push({metric:'ytm',value:rfNum(rf.tir),sourceId:source});
 if(Number.isFinite(rfNum(rf?.paridad)))rows.push({metric:'parity',value:rfNum(rf.paridad),sourceId:source});
 if(Number.isFinite(rfNum(rf?.duration)))rows.push({metric:'macaulayDuration',value:rfNum(rf.duration),sourceId:source});
 if(Number.isFinite(rfNum(rf?.accruedInterest)))rows.push({metric:'accruedInterest',value:rfNum(rf.accruedInterest),sourceId:source});
 if(Number.isFinite(rfNum(rf?.technicalValue)))rows.push({metric:'technicalValue',value:rfNum(rf.technicalValue),sourceId:source});
 return rows;
}

function g2FixedIncomeClass(rf){
 return({SOBERANO_USD:'SOVEREIGN_USD',FIJA:'FIXED_RATE',CER:'CER',DL:'DOLLAR_LINKED',DUAL:'DUAL',ON:'CORPORATE',OTRO:'OTHER'})[rf?.rfClass]||'OTHER';
}
function g2FixedIncomeLegacyTerms(rf,panel){
 const c=rf?.contract||{},source=rf?.argenBondValidated?'argen.bond':rf?.validationSource||'legacy-fixed-income';
 return{
   instrumentId:`legacy:g1:${String(bondState?.symbol||rf?.ticker||'unknown').toUpperCase()}`,
   symbol:String(bondState?.symbol||rf?.ticker||'').toUpperCase(),fixedIncomeClass:g2FixedIncomeClass(rf),
   contractualCurrency:rfContractCurrency(rf)||'',paymentCurrency:c.paymentCurrencyLabel||rfContractCurrency(rf)||'',quoteCurrency:rfQuoteCurrency(panel).code||'',
   paymentLocation:c.paymentLocation||'',issueDate:g2BondIsoDate(c.issueDate||rf?.issueDate),maturity:g2BondIsoDate(rf?.vencimiento||panel?.maturityDate),faceValue:Number.isFinite(rfNum(c.faceValue))?rfNum(c.faceValue):Number.isFinite(rfNum(rf?.faceValue))?rfNum(rf.faceValue):null,couponRatePct:Number.isFinite(rfNum(rf?.couponRate))?rfNum(rf.couponRate):null,
   frequencyLabel:c.frequencyLabel||'',couponType:c.couponType||'',issuer:c.issuer||'',law:c.law||'',amortizationDescription:c.amortization||'',sourceId:source,
   settlementDays:Number.isFinite(rfNum(c.settlementDays))?rfNum(c.settlementDays):null,exCouponDays:Number.isFinite(rfNum(c.exCouponDays))?rfNum(c.exCouponDays):null,calendarId:c.calendarId||'',
   indexationBaseDate:g2BondIsoDate(c.indexationBaseDate),indexationLagDays:Number.isFinite(rfNum(c.indexationLagDays))?rfNum(c.indexationLagDays):null,indexationReference:c.indexationReference||'',
   dayCountConvention:(rf?.rfClass==='FIJA'&&rf?.letter)?'ACT_365':null,yieldConvention:'ANNUAL_EFFECTIVE',verified:!!(rf?.argenBondValidated&&c.contractCurrency)
 };
}
async function g2FixedIncomeAuthorityRuntime(rf,panel,letter){
 const features=await g2RuntimeFeatures();if(!features?.fixedIncomeAuthority)return null;
 const body={instrumentId:`legacy:g1:${String(bondState?.symbol||rf?.ticker||'unknown').toUpperCase()}`,valuationDate:g2LocalDateString(),tradeDate:g2LocalDateString(),legacyTerms:g2FixedIncomeLegacyTerms({...rf,letter},panel),cashflows:g2FixedIncomeCashflows(rf,letter)};
 const r=await fetch('/api/g2/fixed-income/authority',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`G2 Fixed Income Authority ${r.status}`)}
 const x=await r.json();if(!x||!x.authorityStatus||!Array.isArray(x.adjustedCashflows))throw new Error('Respuesta G2 Fixed Income Authority incompatible');return x;
}

function g2FixedIncomeScenarioPayload(rf,panel,targetYield,targetRisk,currentRisk){
 const g2=rf?.g2FixedIncome||{},price=bondCurrentPrice(rf,panel),flows=Array.isArray(g2.remainingCashflows)&&g2.remainingCashflows.length?g2.remainingCashflows:g2FixedIncomeCashflows(rf,rf?.letter);
 const body={instrumentId:`legacy:g1:${String(bondState?.symbol||rf?.ticker||'unknown').toUpperCase()}`,valuationDate:g2LocalDateString(),basePrice:Number.isFinite(price)?price:null,
   baseDirtyPrice:Number.isFinite(Number(g2.dirtyPrice))?Number(g2.dirtyPrice):null,baseYieldPct:Number.isFinite(rfNum(rf?.tir))?rfNum(rf.tir):null,
   targetYieldPct:Number.isFinite(targetYield)?targetYield:null,modifiedDuration:Number.isFinite(rfNum(rf?.modifiedDuration))?rfNum(rf.modifiedDuration):rfModifiedDuration(rf),
   convexity:Number.isFinite(rfNum(rf?.convexity))?rfNum(rf.convexity):null,cashflows:flows,dayCountConvention:g2?.terms?.dayCountConvention||null,
   countryRiskCurrentBps:Number.isFinite(currentRisk)?currentRisk:null,countryRiskTargetBps:Number.isFinite(targetRisk)?targetRisk:null,countryRiskPassThrough:Number.isFinite(targetRisk)&&Number.isFinite(currentRisk)?1:null};
 if(Number.isFinite(targetYield))body.countryRiskTargetBps=null;
 return body;
}
async function g2FixedIncomeScenarioRuntime(rf,panel,targetYield,targetRisk,currentRisk){
 const features=await g2RuntimeFeatures();if(!features?.fixedIncomeScenarios)return null;
 const body=g2FixedIncomeScenarioPayload(rf,panel,targetYield,targetRisk,currentRisk);
 const r=await fetch('/api/g2/fixed-income/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`G2 Fixed Income Scenario ${r.status}`)}
 const x=await r.json();if(!x||!x.method)throw new Error('Respuesta G2 Fixed Income Scenario incompatible');return x;
}
function g2ScannerInput(item,ctx,objective,horizon){
 const rf=item?.panel?.rf||{},q=rfQuoteCurrency(item?.panel),contract=rfContractCurrency(rf),mep=fxMid(ctx?.fx?.mep),ccl=fxMid(ctx?.fx?.ccl);
 return{instrumentId:`legacy:g1:${String(item?.symbol||'unknown').toUpperCase()}`,symbol:String(item?.symbol||'').toUpperCase(),fixedIncomeClass:g2FixedIncomeClass(rf),objective,horizon,
   yieldPct:Number.isFinite(rfYieldMetric(rf))?rfYieldMetric(rf):null,parity:Number.isFinite(rfNum(rf.paridad))?rfNum(rf.paridad):null,duration:Number.isFinite(rfNum(rf.duration))?rfNum(rf.duration):null,
   modifiedDuration:Number.isFinite(rfNum(rf.modifiedDuration))?rfNum(rf.modifiedDuration):null,convexity:Number.isFinite(rfNum(rf.convexity))?rfNum(rf.convexity):null,price:Number.isFinite(rfNum(rf.price))?rfNum(rf.price):null,
   daysToMaturity:Number.isFinite(rfNum(rf.days))?rfNum(rf.days):null,liquidityPercentile:Number.isFinite(rfNum(rf.liquidityPct))?rfNum(rf.liquidityPct):null,yieldPercentile:Number.isFinite(rfNum(rf.yieldPct))?rfNum(rf.yieldPct):null,
   curveScore:Number.isFinite(rfNum(rf.curveScore))?rfNum(rf.curveScore):null,curveSpread:Number.isFinite(rfNum(rf.curveSpread))?rfNum(rf.curveSpread):null,cashflowStatus:rf.cashflowStatus||(rf.cashflowQuality>=100?'VERIFIED':rf.cashflowQuality>=75?'PARTIAL':'UNVERIFIED'),
   cashflowQuality:Number.isFinite(rfNum(rf.cashflowQuality))?rfNum(rf.cashflowQuality):null,futureFlowCount:Number(rf.futureFlowCount||0),hasFinalPayment:!!(rf.letter&&Number.isFinite(rfNum(rf.vpv))&&rfNum(rf.vpv)>0),coreDataCount:Number(rf.coreDataCount||0),
   externallyValidated:!!(rf.ecoValidated||rf.argenBondValidated),dataConflict:!!rf.dataConflict,quoteCurrency:q.code||'—',contractualCurrency:contract||'—',residual:Number.isFinite(rfNum(rf.residual))?rfNum(rf.residual):null,
   totalReturnToMaturity:Number.isFinite(rfNum(rf.totalReturnToMaturity))?rfNum(rf.totalReturnToMaturity):null,contractVerification:rf?.g2FixedIncomeAuthority?.authorityStatus||rf?.g2FixedIncome?.terms?.verification||null,creditAssessment:rf?.g2FixedIncomeAuthority?.creditAssessment||null,countryRiskValueBps:Number.isFinite(rfNum(ctx?.countryRisk?.value))?rfNum(ctx.countryRisk.value):null,
   countryRiskChange30dBps:Number.isFinite(rfNum(ctx?.countryRisk?.change30d))?rfNum(ctx.countryRisk.change30d):null,fxAvailable:Number.isFinite(mep)||Number.isFinite(ccl),
   referenceRateName:rf?.rateReference?.name||undefined,referenceRateTnaPct:Number.isFinite(rfNum(rf?.rateReference?.tna))?rfNum(rf.rateReference.tna):null,rateSpreadPct:Number.isFinite(rfNum(rf?.rateReference?.spreadPp))?rfNum(rf.rateReference.spreadPp):null,rateScore:rf?.rateReference?.applicable&&Number.isFinite(rfNum(rf?.rateReference?.score))?rfNum(rf.rateReference.score):null};
}
async function g2FixedIncomeScannerRuntime(items,ctx,objective,horizon){
 const features=await g2RuntimeFeatures();if(!features?.fixedIncomeScanner)return null;
 const body={items:items.map(item=>g2ScannerInput(item,ctx,objective,horizon))};
 const r=await fetch('/api/g2/fixed-income/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`G2 Fixed Income Scanner ${r.status}`)}
 const x=await r.json();if(!x||!Array.isArray(x.results))throw new Error('Respuesta G2 Fixed Income Scanner incompatible');return new Map(x.results.map(row=>[String(row.symbol||'').toUpperCase(),row]));
}
async function hydrateG2FixedIncome(rf,panel,letter,context={}){
 const features=await g2RuntimeFeatures();if(!features?.fixedIncome)return null;
 try{
  const contractPrice=bondPriceInContractCurrency(rf,panel,{fx:context.fx||{}});
  const price=Number.isFinite(contractPrice)?contractPrice:NaN;
  const accrued=rfNum(rf?.accruedInterest),technical=rfNum(rf?.technicalValue),residual=rfNum(rf?.residual);
  let authority=null;try{authority=await g2FixedIncomeAuthorityRuntime(rf,panel,letter)}catch(e){console.warn('G2 Fixed Income Authority -> análisis sin autoridad',e)}
  if(authority)rf.g2FixedIncomeAuthority=authority;
  const authoritativeFlows=authority?.adjustedCashflows||g2FixedIncomeCashflows(rf,letter);
  const body={
    instrumentId:`legacy:g1:${String(bondState?.symbol||rf?.ticker||'unknown').toUpperCase()}`,
    valuationDate:g2LocalDateString(),currency:rfContractCurrency(rf)||'—',
    price:Number.isFinite(price)?price:null,priceType:'CLEAN',
    accruedInterest:Number.isFinite(accrued)&&accrued>=0?accrued:null,
    technicalValue:Number.isFinite(technical)&&technical>0?technical:null,
    residualValue:Number.isFinite(residual)&&residual>=0?residual:null,
    maturity:g2BondIsoDate(rf?.vencimiento||panel?.maturityDate),
    cashflows:authoritativeFlows,externalMetrics:g2FixedIncomeExternalMetrics(rf),
    terms:authority?.terms||null,legacyTerms:authority?null:g2FixedIncomeLegacyTerms({...rf,letter},panel),
    dayCountConvention:(rf?.rfClass==='FIJA'&&letter)?'ACT_365':null,
    yieldConvention:(rf?.rfClass==='FIJA'&&letter)?'ANNUAL_EFFECTIVE':null
  };
  const r=await fetch('/api/g2/fixed-income/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`G2 Fixed Income ${r.status}`)}
  const a=await r.json();if(!a||a?.engine?.name!=='FixedIncomeEngine'||!Array.isArray(a.remainingCashflows))throw new Error('Respuesta G2 Fixed Income incompatible');
  rf.g2FixedIncome=a;
  rf.cashflowStatus=a.cashflowStatus;
  rf.cashflowQuality=a.cashflowStatus==='VERIFIED'?100:a.cashflowStatus==='PARTIAL'?75:25;
  const g2Conflicts=(a.validationResults||[]).filter(x=>x.status==='DATA_CONFLICT').map(x=>`${x.metric}: conflicto entre cálculo y fuente externa`);
  rf.dataConflict=!!rf.dataConflict||g2Conflicts.length>0;
  rf.validationDiffs=[...new Set([...(rf.validationDiffs||[]),...g2Conflicts])];
  const assumedConvention=(a.warnings||[]).some(x=>String(x).includes('CONVENTION_NOT_SUPPLIED'));
  a.authority=authority||undefined;
  const trustedFlows=a.cashflowStatus!=='UNVERIFIED'&&!assumedConvention&&(!authority||authority.authorityStatus==='VERIFIED');
  if(trustedFlows&&Number.isFinite(Number(a.ytm))){rf.tir=Number(a.ytm);rf.tirDerived=true;rf.tirSource='Radar G2 FixedIncomeEngine'}
  if(Number.isFinite(Number(a.parity))){rf.paridad=Number(a.parity);rf.paridadDerived=true}
  if(trustedFlows&&Number.isFinite(Number(a.macaulayDuration))){rf.duration=Number(a.macaulayDuration);rf.durationDerived=true}
  if(trustedFlows&&Number.isFinite(Number(a.modifiedDuration)))rf.modifiedDuration=Number(a.modifiedDuration);
  if(trustedFlows&&Number.isFinite(Number(a.convexity)))rf.convexity=Number(a.convexity);
  if(Number.isFinite(Number(a.technicalValue)))rf.technicalValue=Number(a.technicalValue);
  if(Number.isFinite(Number(a.accruedInterest)))rf.accruedInterest=Number(a.accruedInterest);
  if(Array.isArray(a.remainingCashflows)&&a.remainingCashflows.length){
    rf.futureFlows=a.remainingCashflows.map(x=>({date:x.paymentDate,capital:rfNum(x.amortization),interest:rfNum(x.coupon),total:rfNum(x.total),source:x.sourceId||'Radar G2'}));
    rf.futureFlowCount=rf.futureFlows.length;
    const dates=rf.futureFlows.map(x=>parseFlowDateValue(x.date)).filter(Boolean).sort((a,b)=>a-b);
    rf.nextFlowDate=dates[0]||null;rf.lastFlowDate=dates.at(-1)||null;
  }
  return a;
 }catch(e){console.warn('G2 Fixed Income -> legacy fallback',bondState?.symbol||rf?.ticker||'',e);return null}
}

function bondRiskText(cls,cr,rf=null){
 if(cls==='ON'){
   const p=[];
   if(rf?.contract?.issuer)p.push(`Emisor: ${rf.contract.issuer}.`);
   if(rf?.rating)p.push(`Calificación informada: ${rf.rating}.`);
   if(rf?.contract?.guarantee)p.push(`Garantía: ${rf.contract.guarantee}.`);
   if(rfContractCurrency(rf)==='USD'){
     p.push(`Moneda de pago: ${rf?.contract?.paymentLocation==='EXT'?'dólar Cable / exterior':rf?.contract?.paymentLocation==='LOCAL'?'USD local / MEP':'USD'}.`);
   }
   p.push('El riesgo país es contexto macro, pero no reemplaza el spread ni el riesgo crediticio del emisor.');
   p.push('Antes de comprar hay que evaluar balance, flujo de caja, deuda, cobertura de intereses, covenants, seniority y riesgo sectorial.');
   return p.join(' ');
 }
 if(cls==='SOBERANO')return `Soberano argentino: riesgo político, legal, programa financiero y reestructuración.${cr&&Number.isFinite(Number(cr.value))?' Riesgo país: '+Math.round(cr.value)+' pb.':''}`;
 if(cls==='CER')return 'CER: importa la TIR real, inflación futura, rezago del CER y la curva real.';
 if(cls==='DL')return 'Dollar-linked: depende del tipo de cambio contractual y del ritmo de devaluación.';
 if(cls==='DUAL')return 'Dual: el payoff depende de la mejor condición contractual; no debe resumirse en una TIR fija inventada.';
 if(cls==='FIJA')return 'Tasa fija / LECAP-BONCAP: importan inflación esperada, tasa nominal, plazo, refinanciamiento y liquidez.';
 return 'Revisar moneda, vencimiento, estructura contractual, liquidez y riesgo del emisor.';
}
function buildBondReading(rf,panel,cr,type,letter){
 const lines=[];
 const price=bondCurrentPrice(rf,panel);
 const tir=rfNum(rf?.tir),par=rfNum(rf?.paridad),dur=rfNum(rf?.duration);
 const cls=bondClass(rf,type),q=rfQuoteCurrency(panel),contract=rfContractCurrency(rf);

 if(Number.isFinite(tir)){
   lines.push(`<strong>TIR:</strong> ${tir.toFixed(2)}%${rf.tirDerived?' (estimada desde precio convertido + cashflows)':''}.`);
 }
 if(Number.isFinite(par)&&par>0){
   lines.push(`<strong>Paridad:</strong> ${par.toFixed(1)}%${rf.paridadDerived?' (estimada)':''}.`);
 }
 if(Number.isFinite(dur)&&dur>0){
   lines.push(`<strong>Duration:</strong> ${dur.toFixed(2)} años${rf.durationDerived?' (estimada)':''}.`);
 }

 if(Number.isFinite(price)){
   const pview=rfPriceView({panel},rf,bondState.analytics||{});
   lines.push(`<strong>Precio de la especie:</strong> ${pview.main} · ${pview.sub}.`);
 }

 if(Number.isFinite(rf?.contractPrice)){
   lines.push(`<strong>Precio equivalente en moneda contractual:</strong> ${formatContractAmount(rf.contractPrice,rf)} por VN 100.`);
 }

 if(Number.isFinite(rf?.technicalValue)&&rf.technicalValue>0){
   lines.push(`<strong>Valor técnico:</strong> ${formatContractAmount(rf.technicalValue,rf)}${rf.technicalValueDerived?' (derivado/estimado)':''}.`);
 }

 const payLabel=rf?.contract?.paymentCurrencyLabel||
   (contract==='USD'
     ?(rf?.contract?.paymentLocation==='EXT'?'USD exterior / Cable':rf?.contract?.paymentLocation==='LOCAL'?'USD local / MEP':'USD')
     :contract);

 lines.push(`<strong>Moneda contractual / pago:</strong> ${cleanSourceText(payLabel)||'No informada'}.`);

 if(rf?.rating)lines.push(`<strong>Calificación:</strong> ${cleanSourceText(rf.rating)}.`);
 if(rf?.contract?.bullet)lines.push('<strong>Amortización:</strong> capital en una cuota al vencimiento.');

 if((rf.futureFlowCount||0)>0){
   const next=rf.nextFlowDate?bondDate(rf.nextFlowDate):(rf.ecoNextPayment||'—');
   lines.push(`<strong>Pagos pendientes:</strong> ${rf.futureFlowCount}. Próximo: ${cleanSourceText(next)}.`);
 }

 if(rf?.argenBondValidated){
   lines.push('<strong>Control de mercado:</strong> TIR, paridad, duration y cashflows enriquecidos con argen.bond; BYMA sigue siendo la fuente contractual primaria.');
 }
 if(rf?.g2FixedIncome){
   const q=rf.g2FixedIncome.cashflowStatus||'UNVERIFIED',conf=(rf.g2FixedIncome.validationResults||[]).filter(x=>x.status==='DATA_CONFLICT').length;
   lines.push(`<strong>Radar G2 Fixed Income:</strong> ${q} · ${conf?conf+' conflicto(s) de fuente':'sin conflicto material detectado'} · engine ${rf.g2FixedIncome.engine?.version||'1.1.0'}.`);
   if(rf?.g2FixedIncomeAuthority){const au=rf.g2FixedIncomeAuthority;lines.push(`<strong>Autoridad contractual G2:</strong> ${au.authorityStatus} · settlement ${au.settlementDate||'N/D'} · schedule ${au.schedule?.status||'N/D'}${au.creditAssessment?` · crédito ${au.creditAssessment.status}`:''}.`)}
 }

 return `<div class="bond-line-stack">${lines.map(x=>`<div>${x}</div>`).join('')}</div>`;
}
function renderBondInstrumentInfo(rf,panel,info,type){
 const q=rfQuoteCurrency(panel);
 const fmt=(v,d,l='calculado')=>d?`${v} · ${l}`:v;

 const resOk=Number.isFinite(rf?.residual)&&rf.residual>=0&&rf.residual<=100;
 const vt=Number.isFinite(rf?.technicalValue)&&rf.technicalValue>0;
 const acc=Number.isFinite(rf?.accruedInterest);
 const nom=rfNum(rf?.contract?.nominal);
 const resAmt=rfNum(rf?.contract?.residualAmount);
 const min=rfNum(rf?.contract?.minDenomination);

 let guarantee=rf?.guaranteeLabel||'No informada';
 if(/garant[ií]a com[uú]n/i.test(guarantee)){
   guarantee+=' · sin garantía real específica';
 }

 let law=rf?.contract?.law||rf?.lawLabel||'No informada';
 if(/^ARG$/i.test(law))law='Argentina';

 const rows=[
  ['Tipo',cleanSourceText(rf?.tipo||panel?.category||typeLabel(type))||'—'],
  ['Moneda contractual',rfContractCurrency(rf)==='USD'
     ?(`USD${rf?.contract?.paymentLocation==='EXT'?' · pago dólar Cable / exterior':rf?.contract?.paymentLocation==='LOCAL'?' · pago USD local / MEP':''}`)
     :(cleanSourceText(rfContractCurrency(rf))||'No informada')],
  ['Cotización / liquidación',cleanSourceText(q.label)||'—'],
  ['Emisor',rf?.contract?.issuer||rf?.issuerLabel||'No informado'],
  ['Calificación',rf?.rating||'No informada'],
  ['Garantía',guarantee],
  ['Ley',law],
  ['Fecha emisión',rf?.contract?.emission?bondDate(rf.contract.emission):(rf?.emissionLabel||'No informada')],
  ['Vencimiento',bondDate(rf?.vencimiento||panel?.maturityDate)],
  ['Monto nominal emitido',Number.isFinite(nom)?formatContractAmount(nom,rf):'No informado'],
  ['Monto residual',Number.isFinite(resAmt)?formatContractAmount(resAmt,rf):'No informado'],
  ['Residual vigente',resOk?fmt(rf.residual.toFixed(2)+'%',rf.residualDerived,'inferido'):'No validado'],
  ['Denominación mínima',Number.isFinite(min)?formatContractAmount(min,rf):'No informada'],
  ['Frecuencia de cupón',rf?.contract?.frequencyLabel||'No informada'],
  ['Convención G2',rf?.g2FixedIncome?.terms?.dayCountConvention||'No verificada'],
  ['Indexación G2',rf?.g2FixedIncome?.terms?.indexationType||'NONE'],
  ['Calidad términos G2',rf?.g2FixedIncome?.terms?.verification||'No disponible'],
  ['Valor técnico',vt?fmt(formatContractAmount(rf.technicalValue,rf),rf.technicalValueDerived,'estimado/derivado'):'No disponible'],
  ['Interés corrido',acc?fmt(formatContractAmount(rf.accruedInterest,rf),rf.accruedInterestDerived,'estimado'):'No disponible'],
  ['Próximo pago',rf?.ecoNextPayment||'No informado'],
  ['Amortización',rf?.amortizationLabel||rf?.contract?.amortization||'No informada'],
  ['Intereses / cupón',rf?.couponLabel||rf?.contract?.coupon||'No informado'],
  ['ISIN',rf?.isinLabel||'No informado por BYMA']
 ];

 $('bondInstrumentData').innerHTML=rows.map(([k,v])=>
   `<div class="bond-metric-row"><span>${k}</span><b>${cleanSourceText(v)||'—'}</b></div>`
 ).join('');
}
function renderBondReturnInfo(rf,panel,letter){
 const price=bondCurrentPrice(rf,panel),rows=[];

 if(Number.isFinite(rfNum(rf?.tir)))rows.push(['TIR',`${rf.tir.toFixed(2)}%${rf.tirDerived?' · estimada':''}`]);
 if(Number.isFinite(rfNum(rf?.paridad)))rows.push(['Paridad',`${rf.paridad.toFixed(1)}%${rf.paridadDerived?' · estimada':''}`]);
 if(Number.isFinite(rfNum(rf?.duration)))rows.push(['Duration',`${rf.duration.toFixed(2)} años${rf.durationDerived?' · estimada':''}`]);

 const md=modifiedDurationValue(rf);
 if(Number.isFinite(md))rows.push(['Duration modificada',md.toFixed(2)]);
 if(Number.isFinite(rfNum(rf?.convexity)))rows.push(['Convexidad',rfNum(rf.convexity).toFixed(2)]);

 if(Number.isFinite(price))rows.push(['Precio especie',bondMoney(price)+' · '+rfQuoteCurrency(panel).label]);
 if(Number.isFinite(rf?.contractPrice))rows.push(['Precio equivalente VN100',formatContractAmount(rf.contractPrice,rf)]);
 if(Number.isFinite(rf?.technicalValue))rows.push(['Valor técnico',formatContractAmount(rf.technicalValue,rf)]);
 if(rf?.rating)rows.push(['Calificación',cleanSourceText(rf.rating)]);
 if(rf?.argenBondValidated)rows.push(['Fuente analítica','argen.bond']);

 if(letter){
   const vpv=rfNum(letter.vpv),days=daysUntilBondDate(letter.fechaVencimiento);
   if(Number.isFinite(vpv))rows.push(['VPV / pago final',bondMoney(vpv)]);
   if(days>0)rows.push(['Días a vencimiento',Math.ceil(days)]);
   if(Number.isFinite(vpv)&&Number.isFinite(price)&&price>0&&days>0){
     rows.push(['Carry bruto',((vpv/price-1)*100).toFixed(2)+'%']);
     rows.push(['TEA implícita',((Math.pow(vpv/price,365/days)-1)*100).toFixed(2)+'%']);
   }
 }

 $('bondReturnData').innerHTML=(rows.length?rows:[['Métricas','No disponibles']])
   .map(([k,v])=>`<div class="bond-metric-row"><span>${k}</span><b>${v}</b></div>`).join('');
}
function peerCandidates(current,bonds,type){
 const cls=bondClass(current,type),dur=Number(current?.duration);
 return bonds.filter(b=>String(b.ticker||'').toUpperCase()!==bondState.symbol)
   .filter(b=>bondClass(b,String(b.tipo||'').toLowerCase().includes('on')?'on':'argbond')===cls)
   .map(b=>({b,d:Number.isFinite(dur)&&Number.isFinite(Number(b.duration))?Math.abs(Number(b.duration)-dur):999}))
   .sort((a,b)=>a.d-b.d).slice(0,5).map(x=>x.b);
}
function renderBondPeers(rf,bonds,type){
 const rows=[{...rf,ticker:bondState.symbol,_current:true},...peerCandidates(rf,bonds,type)];
 $('bondPeersBody').innerHTML=rows.map(b=>`<tr class="${b._current?'bond-peer-current':''}">
   <td><b>${b.ticker||'—'}</b>${b._current?' · actual':''}</td><td>${b.tipo||'—'}</td><td>${bondDate(b.vencimiento)}</td>
   <td>${bondPct(Number(b.tir))}</td><td>${bondPct(Number(b.paridad),1)}</td><td>${Number.isFinite(Number(b.duration))?Number(b.duration).toFixed(2):'—'}</td>
 </tr>`).join('');
}

async function loadBondAnalysis(symbol,type){
 window.radarCaptureDrillOrigin?.();
 const s=normSymbol(symbol).replace('.BA','');bondState.symbol=s;bondState.type=type;
 if($('symbol'))$('symbol').value=s;if($('assetType'))$('assetType').value=type;
 showBondView();
 $('bondTitle').textContent=s+' · '+(type==='on'?'OBLIGACIÓN NEGOCIABLE':'RENTA FIJA');
 $('bondName').textContent='Cargando ficha…';$('bondSource').textContent=type==='on'?'Open BYMADATA + Eco Valores + DolarApi':'Open BYMADATA + compararfondos.com.ar + Eco Valores + DolarApi';
 $('bondUpdated').textContent=fmtDateTimeNow();$('bondReading').textContent='Cargando…';
 try{
   const [analyticsRes,infoRes,panelRes,ecoRes]=await Promise.allSettled([
     fetchFixedIncomeAnalytics(),
     fetchBondInfo(s),
     fetchJsonOrThrow('/api/byma/fixed-income?kind=all&currency=ALL&liquid=0','BYMA renta fija'),
     fetchEcoBond(s)
   ]);
   if(analyticsRes.status!=='fulfilled')throw analyticsRes.reason;
   const analytics=analyticsRes.value,bonds=Array.isArray(analytics.bonds)?analytics.bonds:[],letters=Array.isArray(analytics.letters)?analytics.letters:[];
   const panels=panelRes.status==='fulfilled'&&Array.isArray(panelRes.value.items)?panelRes.value.items:[];
   let rf=null;for(const c of rfTickerCandidates(s)){rf=bonds.find(x=>String(x.ticker||'').toUpperCase()===c);if(rf)break}
   const panel=panels.find(x=>String(x.symbol||'').toUpperCase()===s)||{},info=infoRes.status==='fulfilled'?infoRes.value:null;
   const letter=letters.find(x=>String(x.ticker||'').toUpperCase()===s)||null;
   rf=rf?{...rf}:{ticker:s,tipo:type==='on'?'ON':panel.category||'Renta fija',moneda:type==='on'?'':(panel.denominationCcy||''),vencimiento:panel.maturityDate||'',flujos:[]};
   const tempItem={symbol:s,type,panel:{...panel,rf}};
   if(ecoRes.status==='fulfilled')applyEcoValidation(tempItem,ecoRes.value);
   rf=tempItem.panel.rf;
   prepareRemainingCashflows(rf);
   rf.price=bondCurrentPrice(rf,panel);

   enrichBondContractData(rf,panel,info,type);

   finalizeOnAnalytics(rf,panel,{fx:analytics.fx||{}});
   await hydrateG2FixedIncome(rf,panel,letter,{fx:analytics.fx||{}});

   bondState.rf=rf;bondState.panel=panel;bondState.info=info;bondState.analytics=analytics;bondState.countryRisk=analytics.countryRisk||null;

   const price=bondCurrentPrice(rf,panel),tir=rfNum(rf.tir),par=rfNum(rf.paridad),dur=rfNum(rf.duration);
   const maturity=rf.vencimiento||panel.maturityDate||bondVal(info?.data?.[0],['fechaVencimiento','vencimiento']);
   const days=daysUntilBondDate(maturity);
   const cls=bondClass(rf,type),cr=analytics.countryRisk;
   if($('bondScenarioTitle'))$('bondScenarioTitle').textContent=type==='on'?'ESCENARIOS DE YIELD / PRECIO':'ESCENARIOS DE TASA / RIESGO';
   if($('bondTargetRiskWrap'))$('bondTargetRiskWrap').style.display=type==='on'?'none':'block';
   if($('bondScenarioNote'))$('bondScenarioNote').textContent=type==='on'
     ?'G2 intenta repricing exacto por cashflows; si no alcanza la calidad, usa duration + convexidad. Riesgo país no se trata como spread de la ON.'
     :'G2 intenta repricing exacto por cashflows; si no, usa duration + convexidad y deja explícito el supuesto de pass-through de riesgo país.';


   $('bondTitle').textContent=s+' · '+(rf.tipo||panel.category||(type==='on'?'ON':'BONO'));
   $('bondName').textContent=rf.nombre||bondVal(info?.data?.[0],['denominacion','nombre','descripcion'])||'Instrumento de renta fija';
      const payTag=rfContractCurrency(rf)==='USD'
     ?(rf?.contract?.paymentLocation==='EXT'?'USD · pago Cable':rf?.contract?.paymentLocation==='LOCAL'?'USD · pago MEP':'USD')
     :rfContractCurrency(rf);
   $('bondTags').innerHTML=[payTag,'Cotiza '+rfQuoteCurrency(panel).label,cls,type==='on'?'Corporativo':'Argentina',maturity?'Vto. '+bondDate(maturity):'']
     .filter(x=>x&&x!=='—').map(x=>`<span class="bond-tag">${x}</span>`).join('');
   const pview=rfPriceView({panel},rf,{fx:analytics.fx||{}});
   $('bondPrice').textContent=Number.isFinite(price)?pview.main:'—';
   const priceNote=document.querySelector('#bondPrice + span');
   if(priceNote)priceNote.textContent=Number.isFinite(price)
     ?`${bondPriceSource(rf,panel)}${pview.sub?' · '+pview.sub:''}`
     :'No se obtuvo un precio válido';
   const residualOk=Number.isFinite(rf.residual)&&rf.residual>0&&rf.residual<=100;
   $('bondResidual').textContent=residualOk?rf.residual.toFixed(2)+'%':'—';
   $('bondResidualNote').textContent=residualOk?'Capital nominal pendiente después de amortizaciones':'Residual porcentual no validado';
   $('bondYieldLabel').textContent=cls==='CER'?'TIR REAL':cls==='FIJA'&&letter?'TEA / TIR':'TIR';
   if(cls==='FIJA'&&letter&&Number.isFinite(price)&&price>0&&days>0&&Number.isFinite(Number(letter.vpv))){
     const tea=(Math.pow(Number(letter.vpv)/price,365/days)-1)*100;$('bondYield').textContent=tea.toFixed(2)+'%';$('bondYieldNote').textContent='TEA implícita al VPV';
   }else{
     $('bondYield').textContent=Number.isFinite(tir)?tir.toFixed(2)+'%':'—';
     $('bondYieldNote').textContent=Number.isFinite(tir)
       ?(rf.argenBondValidated?'Mercado · argen.bond':rf.tirDerived?'Estimación desde cashflows + FX':'Yield hasta vencimiento')
       :'No se fuerza una TIR';
   }
   $('bondParity').textContent=Number.isFinite(par)?par.toFixed(1)+'%':'—';
   $('bondDuration').textContent=Number.isFinite(dur)?dur.toFixed(2)+' a':'—';
   $('bondMaturity').textContent=bondDate(maturity);$('bondDays').textContent=Number.isFinite(days)?days+' días restantes':'—';
   if(cr&&Number.isFinite(Number(cr.value))){
     $('bondCountryRisk').textContent=Math.round(cr.value)+' pb';
     const d=Number(cr.change30d);
     $('bondCountryRiskChange').textContent=type==='on'
       ?`Contexto país · no es spread crediticio de la ON`
       :(Number.isFinite(d)?`${d>=0?'+':''}${Math.round(d)} pb en 30 días · ${cr.date||''}`:`Último ${cr.date||''}`);
   }else{
     $('bondCountryRisk').textContent='—';
     $('bondCountryRiskChange').textContent='No disponible';
   }
   const fx=analytics.fx||{};
   $('bondFxMep').textContent=fxDisplay(fx.mep);$('bondFxCcl').textContent=fxDisplay(fx.ccl);$('bondFxOfficial').textContent=fxDisplay(fx.official);
   $('bondFxMepDate').textContent=fx.mep?.fecha?new Date(fx.mep.fecha).toLocaleString('es-AR'):'—';
   $('bondFxCclDate').textContent=fx.ccl?.fecha?new Date(fx.ccl.fecha).toLocaleString('es-AR'):'—';
   $('bondFxOfficialDate').textContent=fx.official?.fecha?new Date(fx.official.fecha).toLocaleString('es-AR'):'—';

   $('bondReading').innerHTML=buildBondReading(rf,panel,cr,type,letter);
   renderBondCashflows(rf.futureFlows||rf.flujos||[],rf);renderBondScenarios(rf);renderBondInstrumentInfo(rf,panel,info,type);renderBondReturnInfo(rf,panel,letter);renderBondPeers(rf,bonds,type);
   $('bondRiskBox').textContent=bondRiskText(cls,cr,rf);
   $('bondTargetYield').value=Number.isFinite(tir)?Math.max(0,tir-1).toFixed(2):'';
   $('bondTargetRisk').value=cr&&Number.isFinite(Number(cr.value))?Math.max(0,Math.round(Number(cr.value)-100)):'';
   $('bondScenarioResult').textContent='Modificá los supuestos y calculá un escenario. G2 prioriza repricing exacto; si no hay datos suficientes, degrada a duration + convexidad.';
   $('bondUpdated').textContent=fmtDateTimeNow();
   const inWatch=(state.config.watchlist||[]).some(x=>x.symbol===s&&x.type===type);
   $('bondAddWatchBtn').disabled=inWatch;$('bondAddWatchBtn').textContent=inWatch?'En Watchlist':'+ Watchlist';
   updateBondPortfolioActions();
 }catch(e){
   $('bondName').textContent='No se pudo completar la ficha';$('bondReading').innerHTML=`<strong>Error de fuente:</strong> ${String(e.message||e)}. No se inventan datos.`;
 }
}

function updateBondPortfolioActions(){
 if(!bondState?.symbol||!bondState?.type)return;const ref=portfolioItemRef(bondState.symbol,bondState.type,'medium'),inPortfolio=!!ref.item?.inPortfolio;$('bondAddPortfolioBtn').disabled=false;$('bondAddPortfolioBtn').textContent=inPortfolio?'+ Aumentar':'+ Cartera';$('bondReducePortfolioBtn').disabled=!inPortfolio;$('bondClosePortfolioBtn').disabled=!inPortfolio;
}
async function calculateBondScenario(){
 const rf=bondState.rf||{},price=bondCurrentPrice(rf,bondState.panel);
 const ty=Number($('bondTargetYield').value),tr=Number($('bondTargetRisk').value),cr=Number(bondState.countryRisk?.value),pieces=[];
 try{
   const g2=await g2FixedIncomeScenarioRuntime(rf,bondState.panel,Number.isFinite(ty)?ty:NaN,Number.isFinite(tr)?tr:NaN,Number.isFinite(cr)?cr:NaN);
   if(g2&&Number.isFinite(Number(g2.selectedPrice))&&Number.isFinite(price)){
     const pct=Number(g2.priceChangePct),label=g2.method==='EXACT_CASHFLOW_REPRICE'?'repricing exacto por cashflows':g2.method==='DURATION_CONVEXITY'?'duration + convexidad':'duration';
     if(Number.isFinite(Number(g2.targetYieldPct)))pieces.push(`TIR ${Number(g2.baseYieldPct).toFixed(2)}% → ${Number(g2.targetYieldPct).toFixed(2)}%: precio aproximado ${bondMoney(Number(g2.selectedPrice))} (${pct>=0?'+':''}${pct.toFixed(2)}%) · ${label}.`);
     else if(Number.isFinite(tr)&&Number.isFinite(cr))pieces.push(`Riesgo país ${Math.round(cr)} → ${Math.round(tr)} pb: precio aproximado ${bondMoney(Number(g2.selectedPrice))} (${pct>=0?'+':''}${pct.toFixed(2)}%) · pass-through 1:1 explícito para compatibilidad.`);
     if(Array.isArray(g2.warnings)&&g2.warnings.length)pieces.push(`Avisos G2: ${g2.warnings.join(', ')}.`);
     $('bondScenarioResult').textContent=pieces.join(' ');return;
   }
 }catch(e){console.warn('G2 Fixed Income Scenario -> legacy fallback',e)}
 const legacyPieces=[];
 if(Number.isFinite(ty)&&Number.isFinite(Number(rf.tir))&&Number.isFinite(price)){
   const est=estimatedPriceFromYield(rf,price,ty);
   if(Number.isFinite(est)){const pct=(est/price-1)*100;legacyPieces.push(`TIR ${Number(rf.tir).toFixed(2)}% → ${ty.toFixed(2)}%: precio aproximado ${bondMoney(est)} (${pct>=0?'+':''}${pct.toFixed(2)}%).`)}
 }
 if(Number.isFinite(tr)&&Number.isFinite(cr)&&Number.isFinite(price)&&bondClass(rf,bondState.type)==='SOBERANO'){
   const pct=priceSensitivityPct(rf,tr-cr);
   if(Number.isFinite(pct)){const est=price*(1+pct/100);legacyPieces.push(`Riesgo país ${Math.round(cr)} → ${Math.round(tr)} pb, suponiendo que la yield acompañe aproximadamente: precio ≈ ${bondMoney(est)} (${pct>=0?'+':''}${pct.toFixed(2)}%).`)}
 }
 if(!legacyPieces.length)legacyPieces.push('No hay datos suficientes para ese escenario.');
 legacyPieces.push('Fallback G1: aproximación de primer orden por duration.');
 $('bondScenarioResult').textContent=legacyPieces.join(' ');
}

async function addCurrentBondToWatchlist(){
 if(!bondState.symbol||!bondState.type)return;
 if(!(state.config.watchlist||[]).some(x=>x.symbol===bondState.symbol&&x.type===bondState.type)){
   state.config.watchlist.push({symbol:bondState.symbol,type:bondState.type,tf:'medium',positionSize:0,buyPrice:0,inPortfolio:false});await saveConfigStrict();renderWatchlist();
 }
 $('bondAddWatchBtn').textContent='En Watchlist';$('bondAddWatchBtn').disabled=true;
}

;

/* ===== RUNTIME BLOCK 20 ===== */
// Radar Técnico G2 — Phase 10F / v4.37.0
// Scanner controller runtime extracted from the legacy inline compatibility bridge.
// Ownership only: scanner execution, RF scan state and scanner/navigation orchestration; no scoring semantics changed.

function openScanResult(symbol,type,key){
 $('symbol').value=symbol;$('assetType').value=type;
 if(['argbond','on'].includes(type)){loadBondAnalysis(symbol,type);return}
 showAnalysisView();loadAll().then(()=>{if(state.analyses?.[key])renderChart(key)});
}


let rfScanState={running:false,stop:false,results:[],context:null,universeTotal:0,sourceTotal:0,unsupported:0,excluded:0,excludedReasons:{}};

async function rfScannerUniverse(){
 normalizeRfOnSelection();

 const selected=$('rfUniverse').value;
 const currency=$('rfCurrency').value;
 const credit=isRfCreditMode();

 const kind=credit?'rf_on':selected;
 const liquid=credit
   ?($('rfUniverse').value==='rf_on_liquid')
   :['rf_public_liquid','rf_on_liquid'].includes(kind);

 const map={
   rf_all:'all',
   rf_sovereign:'sovereign',
   rf_letters:'letters',
   rf_public_liquid:'public',
   rf_on:'on',
   rf_on_liquid:'on'
 };

 const j=await fetchJsonOrThrow(
   `/api/byma/fixed-income?kind=${map[kind]||'all'}&currency=${currency}&liquid=${liquid?1:0}`,
   'BYMA renta fija'
 );

 if(!Array.isArray(j.items))throw new Error('BYMA no devolvió instrumentos.');

 $('rfUniverseInfo').textContent=credit
   ?`ON BYMA: ${j.count} especies corporativas · ${currency}${liquid?' · con volumen hoy':''}. Se preseleccionan por cotización y liquidez; la ficha se completa al abrir.`
   :`Universo: ${j.count} instrumentos · ${currency} · Open BYMADATA.`;

 return j.items.map(x=>({
   symbol:x.symbol,
   type:x.category==='ON'?'on':'argbond',
   panel:x
 }));
}
function rfFallbackUniverseFromAnalytics(payload){
 const selected=$('rfUniverse')?.value||'rf_all',currency=String($('rfCurrency')?.value||'ARS').toUpperCase(),credit=isRfCreditMode();
 // Los filtros de ON o "con volumen" requieren evidencia BYMA real. No se fabrica liquidez ni crédito corporativo desde una fuente secundaria.
 if(credit||['rf_public_liquid','rf_on','rf_on_liquid'].includes(selected))return[];
 const bonds=Array.isArray(payload?.bonds)?payload.bonds:[],letters=Array.isArray(payload?.letters)?payload.letters:[],letterMap=new Map(letters.map(l=>[String(l?.ticker||'').trim().toUpperCase(),l]));
 const out=[],seen=new Set();
 const providerCurrency=(v)=>{
  const raw=String(v||'ARS').trim();
  if(typeof normalizeContractCurrencyText==='function'){const c=normalizeContractCurrencyText(raw);if(c)return c}
  const c=raw.toUpperCase();
  if(/PESO|ARS|\$/.test(c))return'ARS';
  if(/D[ÓO]LAR|USD|U\$S/.test(c))return'USD';
  return c;
 };
 const allowCurrency=(v)=>{const c=providerCurrency(v);return currency==='ALL'||c===currency||(currency==='ARS'&&!c)};
 const allowKind=(symbol,tipo,hasLetter)=>{
  const s=String(symbol||'').toUpperCase(),t=String(tipo||'').toLowerCase();
  // In an explicit LECAP/BONCAP universe, generic "tasa fija" is not enough: it may
  // describe provincials or other bonds. Require provider classification, ArgentinaDatos
  // letter coverage or the known Treasury ticker convention.
  const tickerLetter=/^S[A-Z0-9]{4}$/.test(s)||/^T(?:[0-9]{2}[A-Z][0-9]|[0-9][A-Z][0-9])$/.test(s);
  const letter=hasLetter||/lecap|boncap|capitalizable/.test(t)||tickerLetter;
  if(selected==='rf_letters')return letter;
  if(selected==='rf_sovereign')return !/obligaci|corporativ|\bon\b/.test(t);
  return true;
 };
 const add=(symbol,rf={},letter=null)=>{const sym=String(symbol||'').trim().toUpperCase();if(!sym||seen.has(sym)||!allowCurrency(rf?.moneda||'ARS')||!allowKind(sym,rf?.tipo,!!letter))return;const denom=providerCurrency(rf?.moneda||'ARS');seen.add(sym);out.push({symbol:sym,type:'argbond',panel:{symbol:sym,category:letter?'LECAP/BONCAP':'Fallback analítico',securityType:'GO',denominationCcy:denom||'ARS',settlementType:'',maturityDate:String(letter?.fechaVencimiento||rf?.vencimiento||''),daysToMaturity:NaN,trade:Number(rf?.precio)||0,closingPrice:Number(rf?.precio)||0,bidPrice:0,offerPrice:0,volume:0,tradeVolume:0,volumeAmount:0,fallbackSource:letter?'ArgentinaDatos + CompararFondos':'CompararFondos'}})};
 for(const b of bonds){const sym=String(b?.ticker||'').trim().toUpperCase();add(sym,b,letterMap.get(sym)||null)}
 for(const l of letters){const sym=String(l?.ticker||'').trim().toUpperCase();if(!sym||seen.has(sym))continue;add(sym,{ticker:sym,tipo:'LECAP/BONCAP',moneda:'ARS',vencimiento:l?.fechaVencimiento,precio:NaN},l)}
 return out;
}
function rfBuildData(items,payload){
 const bonds=Array.isArray(payload.bonds)?payload.bonds:[],letters=Array.isArray(payload.letters)?payload.letters:[];
 const bmap=new Map(bonds.map(b=>[String(b.ticker||'').toUpperCase(),b])),lmap=new Map(letters.map(l=>[String(l.ticker||'').toUpperCase(),l])),covered=[];
 for(const item of items){let b=null,l=null,matched=null;for(const c of rfTickerCandidates(item.symbol)){if(!b&&bmap.has(c)){b=bmap.get(c);matched=c}if(!l&&lmap.has(c)){l=lmap.get(c);if(!matched)matched=c}}
  // BYMA is the existence/quote authority. Secondary analytics ENRICH the row but must never
  // delete a live BYMA instrument before argen.bond / Eco recovery gets a chance to run.
  item.panel=item.panel||{};
  const rf=b?{...b}:{ticker:String(item.symbol||'').toUpperCase(),nombre:'',tipo:item.type==='on'?'Obligación Negociable':String(item.panel?.category||''),moneda:item.panel?.denominationCcy||'',vencimiento:item.panel?.maturityDate||'',flujos:[]};
  rf.analyticsPending=!b&&!l&&item.type!=='on';
  rf.primaryAnalyticsSource=b?'CompararFondos':(l?'ArgentinaDatos':'BYMA pendiente de enriquecimiento');
  rf.letter=l||null;rf.tir=rfNum(rf.tir);rf.paridad=rfNum(rf.paridad);rf.duration=rfNum(rf.duration);rf.price=bondCurrentPrice(rf,item.panel);rf.days=rfDays(item,rf,l);rf.rfClass=item.type==='on'?'ON':classifyFixedIncome(item,rf,l);prepareRemainingCashflows(rf);
  if(l&&Number.isFinite(rf.price)&&rf.price>0&&Number.isFinite(rf.days)&&rf.days>0&&Number.isFinite(rfNum(l.vpv))){const vpv=rfNum(l.vpv);rf.vpv=vpv;rf.totalReturnToMaturity=(vpv/rf.price-1)*100;rf.teaMarket=(Math.pow(vpv/rf.price,365/rf.days)-1)*100;rf.cashflowQuality=100;rf.analyticsPending=false}
  rf.scenario100=rfScenarioUpside(rf,100);rf.coreDataCount=[rfYieldMetric(rf),rf.paridad,rf.duration,rf.price].filter(Number.isFinite).length;item.panel.rf=rf;item.canonicalTicker=matched||String(item.symbol||'').replace(/[DC]$/,'');covered.push(item);
 }
 const best=new Map();for(const item of covered){const key=String(item.canonicalTicker||item.symbol).toUpperCase(),prev=best.get(key),vol=rfNum(item.panel?.volumeAmount),pv=rfNum(prev?.panel?.volumeAmount);if(!prev||(!Number.isFinite(pv)&&Number.isFinite(vol))||(Number.isFinite(vol)&&vol>pv))best.set(key,item)}
 const result=[...best.values()];
 for(const cls of [...new Set(result.map(x=>x.panel?.rf?.rfClass).filter(Boolean))]){const g=result.filter(x=>x.panel.rf.rfClass===cls),liqs=g.map(x=>rfNum(x.panel?.volumeAmount)).filter(Number.isFinite),ys=g.map(x=>rfYieldMetric(x.panel.rf)).filter(Number.isFinite);for(const item of g){item.panel.rf.liquidityPct=percentileRank(rfNum(item.panel?.volumeAmount),liqs);item.panel.rf.yieldPct=percentileRank(rfYieldMetric(item.panel.rf),ys)}}
 refreshRfRelativeMetrics(result);return result;
}
function renderRfScanner(){
 updateRfCreditUi();const all=rfScanState.results||[],credit=isRfCreditMode();let rows=[...all],f=$('rfFilter').value;if(f==='attractive')rows=rows.filter(x=>x.status.kind==='buy');if(f==='interesting')rows=rows.filter(x=>['buy','near'].includes(x.status.kind));if(f==='valid')rows=rows.filter(x=>x.status.kind!=='none');rows.sort((a,b)=>(b.score||-1)-(a.score||-1));
 const rfAttractive=all.filter(x=>x.status.kind==='buy').length,rfInteresting=all.filter(x=>x.status.kind==='near').length,rfNeutral=all.filter(x=>['wait','sell'].includes(x.status.kind)).length,rfNoData=rfScanState.excluded||0;
 $('rfsAnalyzed').textContent=all.length;$('rfsAttractive').textContent=rfAttractive;$('rfsInteresting').textContent=rfInteresting;$('rfsNeutral').textContent=rfNeutral;$('rfsNoData').textContent=rfNoData;
 if($('rfAnalyticsVisual'))$('rfAnalyticsVisual').innerHTML=premiumAnalyticsCountDonut([
   {name:'Atractivos',value:rfAttractive},{name:'Interesantes',value:rfInteresting},{name:'Neutros / poco atractivos',value:rfNeutral},{name:'Descartados incompletos',value:rfNoData}
 ],{centerTitle:'Ranking RF',centerLabel:all.length?'Comparados':'Sin escaneo',centerValue:String(all.length||'—'),emptyText:'Ejecutá el escáner de renta fija para visualizar la distribución del ranking.'});
 const ctx=rfScanState.context||{},cr=ctx.countryRisk,fx=ctx.fx||{};$('rfsCountryRisk').textContent=cr&&Number.isFinite(Number(cr.value))?Math.round(cr.value)+' pb':'—';$('rfsRiskTrend').textContent=cr?(Number.isFinite(Number(cr.change30d))?`${Number(cr.change30d)>=0?'+':''}${Math.round(cr.change30d)} pb / 30d · ${cr.date||''}`:`Último ${cr.date||''}`):'Fuente no disponible';$('rfsMep').textContent=fxDisplay(fx.mep);$('rfsCcl').textContent=fxDisplay(fx.ccl);$('rfsOfficial').textContent=fxDisplay(fx.official);$('rfsMepDate').textContent=fx.mep?.fecha?`${fx.mep.source||'Fuente'} · ${new Date(fx.mep.fecha).toLocaleString('es-AR')}`:'Fuente no disponible';$('rfsCclDate').textContent=fx.ccl?.fecha?`${fx.ccl.source||'Fuente'} · ${new Date(fx.ccl.fecha).toLocaleString('es-AR')}`:'Fuente no disponible';$('rfsOfficialDate').textContent=fx.official?.fecha?`${fx.official.source||'Fuente'} · ${new Date(fx.official.fecha).toLocaleString('es-AR')}`:'Fuente no disponible';
 const refSummary=rfReferenceRateSummary(ctx.localRates);if($('rfsReferenceRate'))$('rfsReferenceRate').textContent=refSummary.value;if($('rfsReferenceRateNote'))$('rfsReferenceRateNote').textContent=refSummary.note;
 $('rfsCoverage').textContent=`${all.length}/${rfScanState.universeTotal||ctx.total||0}`;$('rfsObjective').textContent=credit?'Preselección corporativa / ON':$('rfObjective').selectedOptions[0].textContent;$('rfsHorizon').textContent=$('rfHorizon').selectedOptions[0].textContent;
 const best=rows.find(x=>x.status.kind==='buy'&&rfValidationOkForBest(x));if(best){$('rfsBest').textContent=best.item.symbol;const rr=best.rf?.rateReference;$('rfsBestWhy').textContent=credit?`Score mercado ${best.score}/100 · abrir ficha`:(rr?.applicable&&Number.isFinite(rr.spreadPp)?`Score ${best.score}/100 · ${rr.spreadPp>=0?'+':''}${rr.spreadPp.toFixed(2)} pp vs ${rr.name}`:`Score ${best.score}/100 · completo y validado`)}else{$('rfsBest').textContent='—';$('rfsBestWhy').textContent=credit?'No hay ON con preselección alta':'No hay hallazgo verde validado'}
 const tm=Object.entries(rfScanState.excludedReasons||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k}: ${v}`).join(' · ');$('rfDiagnostic').innerHTML=best?(credit?`Mejor ON para analizar: <b>${best.item.symbol}</b> · ${best.score}/100. Es una preselección de mercado; abrila para revisar riesgo del emisor y condiciones contractuales.`:`Mejor hallazgo válido: <b>${best.item.symbol}</b> · ${best.score}/100. Sólo compite contra instrumentos con datos completos.`):(credit?`No hay ON con preselección alta bajo estos filtros.${tm?` Principales descartes: ${tm}.`:''}`:`No hay un hallazgo atractivo y validado con datos completos.${tm?` Principales descartes: ${tm}.`:''}`);
 if(!rows.length){$('rfBody').innerHTML='<tr><td colspan="17">No hay resultados para este filtro.</td></tr>';return}
 $('rfBody').innerHTML=rows.map(r=>{const rf=r.rf||{},y=rfYieldMetric(rf),creditRow=credit&&rf.rfClass==='ON',spr=onMarketSpreadPct(r.item.panel);const curve=creditRow?(Number.isFinite(spr)?spr.toFixed(2)+'%':'—'):(Number.isFinite(rf.curveSpread)?(rf.curveSpread>0.4?`+${rf.curveSpread.toFixed(2)} pp`:rf.curveSpread<-0.4?`${rf.curveSpread.toFixed(2)} pp`:'En curva'):'—');const scen=creditRow?'Abrir ficha':rf.rfClass==='FIJA'&&Number.isFinite(rf.totalReturnToMaturity)?`Carry ${rf.totalReturnToMaturity.toFixed(1)}%`:Number.isFinite(rf.scenario100)?`-100pb ≈ +${rf.scenario100.toFixed(1)}%`:'—';const price=rfPriceView(r.item,rf,rfScanState.context||{}),q=rfQuoteCurrency(r.item.panel),contract=rfContractCurrency(rf),next=rf.nextFlowDate?bondDate(rf.nextFlowDate):(rf.ecoNextPayment||'—'),flow=creditRow?'Se completa al abrir':(rf.futureFlowCount||0)>0?`${rf.futureFlowCount} pago(s)`:rf.letter?'1 pago final':'No verificado';const badge=creditRow?'<span class="rf-validated">ON · BYMA</span>':(rf.ecoValidated?`<span class="${rf.dataConflict?'rf-conflict':'rf-validated'}">${rf.dataConflict?'Dato corregido':'Validado Eco'}</span>`:'<span class="rf-unvalidated">Fuente primaria</span>');return `<tr><td><span class="scan-action ${r.status.kind}">${r.status.label}</span></td><td><b>${r.item.symbol}</b><div class="rf-meta">${rf.nombre||''}</div>${badge}</td><td>${rfClassLabel(rf.rfClass)}</td><td class="rf-currency-cell"><b>${contract}</b><span>Cotiza: ${q.label}</span></td><td>${Number.isFinite(rf.days)?Math.round(rf.days)+' d':'—'}</td><td class="rf-flow-cell"><b>${flow}</b><span>${creditRow?'Ficha contractual BYMA':`Próx.: ${next}${Number.isFinite(rf.residual)?` · residual ${rf.residual.toFixed(1)}%`:''}`}</span></td><td><span class="rf-money">${price.main}</span><span class="rf-money-sub">${price.sub}</span></td><td><span class="rf-score ${r.score>=75?'high':r.score>=60?'med':'low'}">${r.score}/100</span></td><td>${Number.isFinite(y)?y.toFixed(2)+'%':(creditRow?'Al abrir':'—')}<div class="rf-meta">${creditRow&&!Number.isFinite(y)?'si hay cashflows válidos':rfYieldLabel(rf)}</div></td><td>${rfRateReferenceCell(rf)}</td><td>${Number.isFinite(rf.paridad)&&rf.paridad>0?rf.paridad.toFixed(1)+'%':(creditRow?'Al abrir':'—')}</td><td>${Number.isFinite(rf.duration)&&rf.duration>0?rf.duration.toFixed(2)+' a':(creditRow?'Al abrir':'—')}</td><td>${curve}</td><td>${Number.isFinite(rf.liquidityPct)?rf.liquidityPct+'/100':'—'}</td><td>${scen}</td><td class="why">${formatScanWhy(r.why)}</td><td><div class="scan-actions"><button class="scan-open" onclick="loadBondAnalysis('${r.item.symbol}','${r.item.type}')">Analizar</button>${scanResultInWatchlist(r.item.symbol,r.item.type,'medium')?'<button class="scan-watch added" disabled>En Watchlist</button>':`<button class="scan-watch" onclick="addScanResultToWatchlist('${r.item.symbol}','${r.item.type}','medium',this);setTimeout(renderRfScanner,100)">+ Watchlist</button>`}${portfolioContextActionsHtml(r.item.symbol,r.item.type,'medium','Scanner RF')}</div></td></tr>`}).join('');
}
function rearmRfScanner(message='Filtros modificados. Presioná Escanear para actualizar.'){
 if(rfScanState.running)return false;
 const btn=$('rfStartBtn');
 if(btn){btn.disabled=false;btn.textContent='Escanear';btn.removeAttribute('aria-disabled');btn.removeAttribute('aria-busy');btn.classList.remove('radar-action-busy','radar-action-peer-locked','radar-action-long-running')}
 if($('rfStopBtn'))$('rfStopBtn').disabled=true;
 if($('rfProgressText'))$('rfProgressText').textContent=message;
 return true;
}
async function startRfScanner(){
 normalizeRfOnSelection();
 if(rfScanState.running)return;

 rfScanState={running:true,stop:false,results:[],context:null,universeTotal:0,sourceTotal:0,unsupported:0,excluded:0,excludedReasons:{}};

 $('rfStartBtn').textContent='Escaneando…';
 $('rfStopBtn').disabled=false;
 $('rfProgressBar').style.width='2%';
 $('rfProgressCount').textContent='0/0';
 $('rfProgressText').textContent='Conectando con BYMA y cargando métricas de renta fija…';
 $('rfDiagnostic').innerHTML='<b>Iniciando scanner…</b> obteniendo universo, rendimiento, tasa de referencia, paridad, duration, cashflows y riesgo país.';
 $('rfBody').innerHTML='<tr><td colspan="17" class="premium-table-loading"><span class="dash-mini-spinner"></span><span>Cargando datos reales…</span></td></tr>';

 try{
   // Universo BYMA y analítica secundaria se consultan en paralelo. Una caída parcial no debe vaciar todo Renta Fija.
   const [universeResult,analyticsResult]=await Promise.allSettled([rfScannerUniverse(),fetchFixedIncomeAnalytics()]);
   if(analyticsResult.status!=='fulfilled')throw new Error(`Analítica RF no disponible: ${analyticsResult.reason?.message||analyticsResult.reason||'error desconocido'}`);
   const payload=analyticsResult.value;
   let rawItems=universeResult.status==='fulfilled'?universeResult.value:[];
   let fallbackUsed=false;
   if(!rawItems.length){
     rawItems=rfFallbackUniverseFromAnalytics(payload);
     fallbackUsed=rawItems.length>0;
     if(!fallbackUsed){
       const bymaWhy=universeResult.status==='rejected'?(universeResult.reason?.message||String(universeResult.reason)):'BYMA devolvió 0 instrumentos';
       throw new Error(`${bymaWhy}. La cobertura secundaria tampoco permite construir este universo sin inventar datos.`);
     }
   }

   $('rfProgressText').textContent=fallbackUsed?`BYMA no aportó universo; recuperados ${rawItems.length} instrumentos desde cobertura secundaria. Completando métricas…`:`BYMA cargó ${rawItems.length} especies. Cargando analítica y tasas de referencia…`;
   $('rfProgressCount').textContent=`0/${rawItems.length}`;
   $('rfProgressBar').style.width='8%';

   let items=rfBuildData(rawItems,payload);
   rfScanState.sourceTotal=rawItems.length;
   rfScanState.fallbackUsed=fallbackUsed;
   rfScanState.universeTotal=items.length;
   rfScanState.unsupported=items.filter(x=>x?.panel?.rf?.analyticsPending).length;
   const primaryCovered=Math.max(0,items.length-rfScanState.unsupported);

   if($('rfObjective').value==='credit'){
     $('rfUniverseInfo').textContent=`ON BYMA: ${rawItems.length} especies · ${items.length} tickers corporativos deduplicados para preselección.`;
     $('rfProgressText').textContent=`Preseleccionando ${items.length} ON por precio, vencimiento, liquidez y calidad de cotización…`;
   }else if(fallbackUsed){
     const warn=Array.isArray(payload?.warnings)&&payload.warnings.length?` · incidencia: ${payload.warnings[0]}`:'';
     $('rfUniverseInfo').textContent=`COBERTURA PARCIAL: ${rawItems.length} instrumentos cargados desde CompararFondos/ArgentinaDatos · cobertura primaria ${primaryCovered}/${items.length}${warn}.`;
     $('rfProgressText').textContent=`Fallback explícito: ${items.length} instrumentos cargados. Se validará completitud antes de rankear; no se atribuye liquidez BYMA.`;
   }else{
     $('rfUniverseInfo').textContent=`BYMA: ${rawItems.length} especies · cobertura analítica primaria: ${primaryCovered} · pendientes de enriquecimiento: ${rfScanState.unsupported}.`;
     $('rfProgressText').textContent=`Cobertura primaria ${primaryCovered}/${items.length}. Validando y recuperando datos antes de rankear…`;
   }
   $('rfProgressBar').style.width='12%';

   rfScanState.context={
     countryRisk:payload.countryRisk||null,
     fx:payload.fx||null,
     localRates:payload.localRates||null,
     coverage:0,
     total:items.length
   };
   applyRfReferenceRates(items,rfScanState.context);
   $('rfProgressBar').style.width='18%';
   if(isRfCreditMode()){
     $('rfProgressText').textContent='Ordenando ON por cotización, liquidez, actividad y plazo…';
   }else{
     $('rfProgressText').textContent='Validando mejores candidatos y controlando pagos restantes…';
     await validateTopRfCandidates(items,rfScanState.context);
     rfScanState.unsupported=items.filter(x=>x?.panel?.rf?.analyticsPending).length;
     // Una segunda fuente puede corregir el rendimiento; recalculamos el spread contra tasa con el dato final.
     applyRfReferenceRates(items,rfScanState.context);
     $('rfProgressText').textContent='Validación completada. Construyendo ranking final…';
   }
   const objective=$('rfObjective').value;
   const horizon=$('rfHorizon').value;
   let g2ScannerMap=null;
   if(!isRfCreditMode()){
     try{g2ScannerMap=await g2FixedIncomeScannerRuntime(items,rfScanState.context,objective,horizon)}catch(e){console.warn('G2 Fixed Income Scanner -> legacy fallback',e)}
   }

   for(let idx=0;idx<items.length;idx++){
     if(rfScanState.stop)break;

     const item=items[idx],rf=item.panel.rf;
     const creditMode=isRfCreditMode()&&rf.rfClass==='ON';
     const g2row=!creditMode&&g2ScannerMap?g2ScannerMap.get(String(item.symbol||'').toUpperCase()):null;
     const check=g2row?{complete:!!g2row.complete,missing:Array.isArray(g2row.missing)?g2row.missing:[]}:rfCompleteness(item,rfScanState.context,objective,horizon);

     if(check.complete){
       const score=creditMode?onPreselectionScore(item,horizon):(g2row?Number(g2row.score):fixedIncomeDedicatedScore(item,rfScanState.context,objective,horizon));
       const status=creditMode?onPreselectionStatus(score):(g2row?.status||rfStatus(score,rf,objective,horizon));
       if(g2row){rf.g2Scanner=g2row;if(Number.isFinite(Number(g2row.scenario100Pct)))rf.scenario100=Number(g2row.scenario100Pct)}
       rfScanState.results.push({item,rf,score,complete:true,status,why:creditMode?onMarketWhy(item):buildRfReadingDedicated(item,rfScanState.context,objective,horizon)});
     }else{
       rfScanState.excluded++;
       for(const reason of check.missing){
         rfScanState.excludedReasons[reason]=(rfScanState.excludedReasons[reason]||0)+1;
       }
     }

     const done=idx+1;
     $('rfProgressCount').textContent=`${done}/${items.length}`;
     $('rfProgressBar').style.width=(18+(done/items.length*82)).toFixed(1)+'%';
     if(done%15===0||done===items.length)renderRfScanner();
     await new Promise(r=>setTimeout(r,0));
   }
   rfScanState.context.coverage=rfScanState.results.length;
   renderRfScanner();
   if(rfScanState.stop){
     $('rfProgressText').textContent='Escaneo detenido.';
   }else if(isRfCreditMode()){
     $('rfProgressText').textContent=`BYMA ${rfScanState.sourceTotal}: ${rfScanState.universeTotal} ON deduplicadas · ${rfScanState.results.length} preseleccionadas · ${rfScanState.excluded} sin datos mínimos de mercado.`;
   }else if(rfScanState.results.length===0){
     const topMissing=Object.entries(rfScanState.excludedReasons||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${v}`).join(' · ');
     $('rfProgressText').textContent=`SIN COMPARABLES COMPLETOS: 0/${rfScanState.universeTotal}. ${topMissing||'La fuente analítica no completó los datos requeridos.'}`;
     $('rfDiagnostic').innerHTML=`<b>Incidencia de datos:</b> el universo existe, pero ninguna especie quedó suficientemente enriquecida para rankear sin inventar métricas.${topMissing?` Faltantes principales: ${topMissing}.`:''}`;
   }else{
     const recovered=Number(rfScanState.context?.recoveredFromSecondary||0);
     $('rfProgressText').textContent=`BYMA ${rfScanState.sourceTotal}: ${rfScanState.universeTotal} especies preservadas · ${rfScanState.results.length} comparables completos · ${rfScanState.excluded} incompletos${recovered?` · ${recovered} recuperados por fuente secundaria`:''}.`;
   }
 }catch(e){
   const msg=String(e?.message||e||'Error desconocido');
   console.error('Scanner renta fija',e);
   $('rfProgressText').textContent='ERROR: '+msg;
   $('rfDiagnostic').innerHTML='<b>No se pudo completar el scanner:</b> '+msg+'<br><span class="scanner-error-note">Revisá radar_log.txt si el mensaje proviene del servidor.</span>';
   $('rfBody').innerHTML=`<tr><td colspan="17" class="scanner-error-cell"><b>Error:</b> ${msg}</td></tr>`;
   $('rfProgressBar').style.width='0%';
 }
 rfScanState.running=false;
 rfScanState.completedAt=Date.now();
 try{await captureDedicatedRfSignals()}catch(e){console.warn('capture RF signals',e)}
 $('rfStartBtn').textContent='Escanear';
 $('rfStopBtn').disabled=true;
 // radarBindAction libera su lock en finally. Re-armamos en la siguiente tarea
 // para evitar restaurar accidentalmente el estado disabled capturado al iniciar.
 setTimeout(()=>rearmRfScanner($('rfProgressText')?.textContent||'Listo para escanear.'),0);
}
function stopRfScanner(){
 rfScanState.stop=true;
 $('rfProgressText').textContent='Deteniendo scanner…';
 $('rfStopBtn').disabled=true;
}

function showFixedIncomeScanner(){
 setInstitutionalView('fixedIncomeBtn','Escáner de renta fija','Bonos · Letras · ON · rendimiento, duration, paridad, liquidez y riesgo');
 showRfScannerView();
 normalizeRfOnSelection();
 $('rfUniverseInfo').textContent=isRfCreditMode()
   ?'Modo ON activo: elegí moneda y horizonte. Radar preselecciona las ON desde BYMA.'
   :'Elegí universo, moneda, objetivo y horizonte. Presioná Escanear para actualizar el ranking.';
 refreshRfSelectionSummary();
 renderRfScanner();
}

// Phase 10C: market intelligence runtime moved to /g2/runtime/market-intelligence-runtime.js

function updateScanModeButton(){
 const detailed=$('scannerView').classList.contains('scan-detailed');
 if($('scanModeBtn')){
   $('scanModeBtn').textContent=detailed?'Vista simple':'Vista detallada';
   $('scanModeBtn').classList.toggle('active',detailed);
 }
}
function toggleScanMode(){
 $('scannerView').classList.toggle('scan-detailed');
 updateScanModeButton();
}


function hideAllMainViews(preserveScanner=false){
 if(!preserveScanner&&state?.scan?.running){state.scan.stop=true;if($('scanProgressText'))$('scanProgressText').textContent='Deteniendo escáner al salir de la pantalla…'}
 $('analysisView').classList.add('hidden');
 if($('dashboardView'))$('dashboardView').classList.remove('active');
 $('scannerView').classList.remove('active');
 $('watchlistView').classList.remove('active');
 if($('signalsView'))$('signalsView').classList.remove('active');
 $('rfScannerView').classList.remove('active');
 $('bondView').classList.remove('active');
}
function setTechnicalStatusVisible(show){
 if($('technicalStatusGrid'))$('technicalStatusGrid').style.display=show?'grid':'none';
 if(!show&&$('dataErrorBanner'))$('dataErrorBanner').classList.remove('show');
}
function showBondView(){
 setInstitutionalView('fixedIncomeBtn','Renta fija · detalle','Flujos · TIR · duration · paridad · escenarios');hideAllMainViews();setTechnicalStatusVisible(false);$('bondView').classList.add('active')}
function showRfScannerView(){
 setInstitutionalView('fixedIncomeBtn','Escáner de renta fija','Bonos · Letras · ON · rendimiento, duration, paridad, liquidez y riesgo');hideAllMainViews();setTechnicalStatusVisible(false);$('rfScannerView').classList.add('active')}

function showScannerView(){
 setInstitutionalView('scannerViewBtn','Escáner de renta variable','Acciones · CEDEARs · Cripto · ranking técnico y oportunidades');
 updateScanModeButton();hideAllMainViews(true);setTechnicalStatusVisible(false);$('scannerView').classList.add('active');renderScanner();
}
async function startScanner(){
 if(state.scan.running)return;
 const key=$('scanTf').value;
 state.scan={running:true,stop:false,results:[],skipped:0};
 $('stopScanBtn').disabled=false;
 $('scanProgressBar').style.width='0%';
 $('scanProgressText').textContent='Resolviendo universo completo…';
 $('scanProgressCount').textContent='0/0';
 renderScanner();

 let items;
 try{
   items=await scannerUniverseItems();
 }catch(e){
   state.scan.running=false;
   $('startScanBtn').disabled=false;$('stopScanBtn').disabled=true;
   $('scanProgressText').textContent='No se pudo cargar el universo: '+String(e.message||e)+' · Reintentá en unos segundos.';
   return;
 }
 if(isFixedIncomeUniverse($('scanUniverse').value)){
   $('scanProgressText').textContent='Cargando TIR, paridad, duration y riesgo país…';
   await prepareFixedIncomeAnalytics(items);
   renderRfContext();
 }
 if(!items.length){
   state.scan.running=false;
   $('startScanBtn').disabled=false;$('stopScanBtn').disabled=true;
   $('scanProgressText').textContent='El universo está vacío.';
   return;
 }

 const total=items.length;
 $('scanProgressCount').textContent=`0/${total}`;
 $('scanProgressText').textContent=isFixedIncomeUniverse($('scanUniverse').value)?`Comparando ${total} instrumentos de renta fija…`:`Escaneando ${total} activos sin límite artificial…`;

 let cursor=0,done=0;
 const u=$('scanUniverse').value;
 // Paralelismo moderado: acelera universos grandes sin disparar demasiadas consultas simultáneas.
 const workersCount=isFixedIncomeUniverse(u)?1:(u==='crypto100')?5:(u==='cedear'||u==='cedear_liquid'||u==='arg_leading'||u==='arg_general'||u==='arg_all')?3:4;

 const worker=async()=>{
   while(true){
     if(state.scan.stop)return;
     const i=cursor++;
     if(i>=total)return;
     const item=items[i];
     try{
       if(isFixedIncomeUniverse(u)){
         state.scan.results.push(scanFixedIncomeOne(item));
       }else{
         state.scan.results.push(await scanOne(item,key));
       }
     }catch(e){
       const isCedearUs=(u==='usa_cedear');
       const msg=String(e.message||e);
       if(isCedearUs && /Yahoo Finance|Sin datos Yahoo|Historial insuficiente/i.test(msg)){
         state.scan.skipped=(state.scan.skipped||0)+1;
       }else{
         state.scan.results.push({
           item:{symbol:item.symbol,type:resolveWatchType(item.symbol,item.type)},
           status:{kind:'none',label:'SIN DATOS',oppScore:0},
           error:msg
         });
       }
     }
     done++;
     $('scanProgressCount').textContent=`${done}/${total}`;
     $('scanProgressBar').style.width=(done/total*100).toFixed(1)+'%';
     $('scanProgressText').textContent=`Analizados ${done} de ${total} · último: ${item.symbol}`;

     const last=state.scan.results.at(-1);
     if(isFixedIncomeUniverse(u) || done%20===0 || ['buy','near','sell'].includes(last?.status?.kind) || done===total)renderScanner();

     // Cede tiempo a la UI; no es un límite de universo.
     await new Promise(r=>setTimeout(r,80));
   }
 };

 await Promise.all(Array.from({length:workersCount},()=>worker()));

 state.scan.running=false;
 state.scan.completedAt=Date.now();
 renderScanner();
 try{await captureScannerSignals()}catch(e){console.warn('capture scanner signals',e)}
 try{scannerOpportunityAlerts()}catch{}
 $('stopScanBtn').disabled=true;
 setTimeout(()=>{if(!state.scan.running&&$('startScanBtn'))$('startScanBtn').disabled=false},0);
 const skipped=state.scan.skipped||0;
 $('scanProgressText').textContent=state.scan.stop
   ? `Escaneo detenido por el usuario en ${done}/${total}.`
   : `Escaneo completo: ${done}/${total} procesados${skipped?` · ${skipped} códigos no USA/no resolubles omitidos`:''}.`;
}
function stopScanner(){state.scan.stop=true;$('scanProgressText').textContent='Deteniendo…'}

;
