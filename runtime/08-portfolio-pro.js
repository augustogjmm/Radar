/* Radar Tecnico G2 - Portfolio ledger, benchmarks, authority, validation, research and analysis UI
   Extracted from certified runtime; order preserved. */

/* ===== RUNTIME BLOCK 34 ===== */
/* Radar Técnico G2 — Phase 10L / v4.43.0
   Portfolio Pro local ledger / diversification / movement runtime extraction.
   Ownership-only move from the single legacy inline compatibility bridge.
   Portfolio transaction, diversification, reduction and cash-flow semantics are intentionally unchanged.
*/

const portfolioV76={reduceItem:null,labResults:[],labMeta:null,relativeCache:new Map(),regression:null,g2BacktestRows:null,g2BacktestValidation:null};

function txId(){return 'TX-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase()}
function ensureTransactionHistory(item){
 if(!item)return;
 if(!Array.isArray(item.transactions))item.transactions=[];
 if(item.inPortfolio&&item.transactions.length===0&&Number(item.positionSize)>0&&Number(item.buyPrice)>0){
   item.transactions.push({id:txId(),type:'BUY',ts:Number(item.portfolioAddedAt)||Date.now(),qty:Number(item.positionSize)/Number(item.buyPrice),price:Number(item.buyPrice),amount:Number(item.positionSize),fees:0,currency:item.portfolioCurrency||defaultPortfolioCurrency(item.type),source:'migración v76'});
 }
 recomputePositionFromTransactions(item);
}
function recomputePositionFromTransactions(item){
 if(!item||!Array.isArray(item.transactions))return;
 const tx=[...item.transactions].sort((a,b)=>Number(a.ts)-Number(b.ts));
 let qty=0,cost=0,realized=0,income=0;
 for(const t of tx){
   const typ=String(t.type||'').toUpperCase(),q=Math.max(0,Number(t.qty)||0),p=Math.max(0,Number(t.price)||0),fees=Math.max(0,Number(t.fees)||0);
   if(typ==='BUY'){
     qty+=q;cost+=q*p+fees;
   }else if(typ==='SELL'){
     const sellQty=Math.min(qty,q);
     const avg=qty>0?cost/qty:0;
     realized+=sellQty*(p-avg)-fees;
     qty-=sellQty;cost-=sellQty*avg;
     if(qty<1e-10){qty=0;cost=0}
   }else if(typ==='DIVIDEND'||typ==='COUPON'){
     const a=Math.max(0,Number(t.amount)||0);
     income+=a;realized+=a;
   }
 }
 item.quantity=qty;
 item.positionSize=cost;
 item.buyPrice=qty>0?cost/qty:0;
 item.realizedPnl=realized;
 item.cashIncome=income;
 item.inPortfolio=qty>1e-10;
}
function addPortfolioBuy(item,amount,price,fees=0,source='manual',prepared=null){
 if(!(Number(amount)>0)||!(Number(price)>0))throw new Error('Capital y precio deben ser mayores a cero.');ensureTransactionHistory(item);const qty=Number(amount)/Number(price),before=Number(item.quantity)||0,tx={id:String(prepared?.id||txId()),type:'BUY',ts:Number(prepared?.ts)||Date.now(),qty,price:Number(price),amount:Number(amount),fees:Math.max(0,Number(fees)||0),currency:prepared?.currency||item.portfolioCurrency||defaultPortfolioCurrency(item.type),source:prepared?.source||source,g2Native:prepared?.g2Native===true,g2CashImpactApplied:prepared?.g2CashImpactApplied===true};if(!item.transactions.some(x=>String(x.id)===tx.id))item.transactions.push(tx);recomputePositionFromTransactions(item);if(prepared?.skipAudit!==true)recordDecisionAudit({source:'Cartera',symbol:item.symbol,decision:before>0?'AUMENTAR':'COMPRAR',action:`+${qty.toFixed(qty<1?6:4)} unidades`,data:{amount:Number(amount),price:Number(price),fees:Number(fees)||0,currency:item.portfolioCurrency},reason:`Movimiento desde ${source}.`});return tx
}
function addPortfolioSell(item,qty,price,fees=0,source='manual',prepared=null){
 ensureTransactionHistory(item);const available=Number(item.quantity)||0,q=Number(qty),p=Number(price);if(!(available>0))throw new Error('La posición no tiene tenencia disponible.');if(!(q>0))throw new Error('La cantidad a vender debe ser mayor a cero.');if(q>available+1e-9)throw new Error(`No podés vender ${q}; la tenencia disponible es ${available}.`);if(!(p>0))throw new Error('El precio debe ser mayor a cero.');const avg=Number(item.buyPrice)||0,realized=q*(p-avg)-Math.max(0,Number(fees)||0),full=q>=available-1e-9,tx={id:String(prepared?.id||txId()),type:'SELL',ts:Number(prepared?.ts)||Date.now(),qty:q,price:p,amount:q*p,fees:Math.max(0,Number(fees)||0),currency:prepared?.currency||item.portfolioCurrency||defaultPortfolioCurrency(item.type),source:prepared?.source||source,realized,g2Native:prepared?.g2Native===true,g2CashImpactApplied:prepared?.g2CashImpactApplied===true};if(!item.transactions.some(x=>String(x.id)===tx.id))item.transactions.push(tx);recomputePositionFromTransactions(item);if(prepared?.skipAudit!==true)recordDecisionAudit({source:'Cartera',symbol:item.symbol,decision:full?'CERRAR POSICIÓN':'REDUCIR',action:`-${q.toFixed(q<1?6:4)} unidades`,data:{price:p,fees:Number(fees)||0,realized,currency:item.portfolioCurrency},reason:`Venta ${full?'total':'parcial'} con control de tenencia.`});return tx
}
function addPortfolioIncome(item,type,amount,ts,prepared=null){
 ensureTransactionHistory(item);const a=Number(amount);if(!(a>0))throw new Error('El importe debe ser mayor a cero.');if(item?.type==='crypto')throw new Error('Los criptoactivos no tienen dividendos ni cupones en Cartera.');const typ=['argbond','on'].includes(item?.type)?'COUPON':'DIVIDEND',tx={id:String(prepared?.id||txId()),type:typ,ts:Number(prepared?.ts)||Number(ts)||Date.now(),qty:0,price:0,amount:a,fees:0,currency:prepared?.currency||item.portfolioCurrency||defaultPortfolioCurrency(item.type),source:prepared?.source||'manual',g2Native:prepared?.g2Native===true,g2CashImpactApplied:prepared?.g2CashImpactApplied===true};if(!item.transactions.some(x=>String(x.id)===tx.id))item.transactions.push(tx);recomputePositionFromTransactions(item);if(prepared?.skipAudit!==true)recordDecisionAudit({source:'Cartera',symbol:item.symbol,decision:typ==='COUPON'?'CUPÓN':'DIVIDENDO',action:`Ingreso ${a}`,data:{amount:a,currency:item.portfolioCurrency},reason:'Ingreso registrado manualmente.'});return tx
}
function allPortfolioTransactions(){
 const rows=[];
 for(const item of (state.config.watchlist||[])){
   ensureTransactionHistory(item);
   for(const t of (item.transactions||[]))rows.push({symbol:item.symbol,assetType:item.type,item,...t});
 }
 return rows.sort((a,b)=>Number(b.ts)-Number(a.ts));
}
function portfolioFactor(item){
 const sec=String(portfolioFallbackSector(item)||'').toLowerCase(),type=item.type;
 if(type==='crypto')return'Crypto / Beta alto';
 if(type==='argbond')return'Argentina soberano / tasas';
 if(type==='on')return'Crédito corporativo Argentina';
 if(type==='argstock')return'Riesgo Argentina / equity';
 if(sec.includes('tecn')||sec.includes('semiconductor'))return'Tecnología / Growth USA';
 if(sec.includes('finan')||sec.includes('banco'))return'Financieras';
 if(sec.includes('energ')||sec.includes('petr')||sec.includes('oil'))return'Energía / commodities';
 if(sec.includes('salud')||sec.includes('health'))return'Salud';
 if(sec.includes('consum'))return'Consumo';
 if(type==='cedear')return'Equity global vía CEDEAR';
 return'Equity general';
}
function diversificationAnalysis(stats){
 const items=stats.items||[],total=stats.invested;if(!items.length||!(total>0))return{score:0,label:'SIN CARTERA',cls:'warn',effectiveN:0,topSector:'—',topFactor:'—',warnings:['No hay posiciones con capital consolidable.']};
 const weights=[],sector=new Map(),factor=new Map(),currency=new Map(),classes=new Map();for(const item of items){const cur=item.portfolioCurrency||defaultPortfolioCurrency(item.type),inv=convertPortfolioAmount(Number(item.positionSize),cur,stats.base);if(!Number.isFinite(inv)||inv<=0)continue;const w=inv/total;weights.push(w);const sec=portfolioFallbackSector(item),fac=portfolioFactor(item),cl=portfolioClassLabel(item.type);sector.set(sec,(sector.get(sec)||0)+w);factor.set(fac,(factor.get(fac)||0)+w);currency.set(cur,(currency.get(cur)||0)+w);classes.set(cl,(classes.get(cl)||0)+w)}
 const hhi=weights.reduce((a,w)=>a+w*w,0),effectiveN=hhi>0?1/hhi:0,largest=weights.length?Math.max(...weights):1,top=m=>[...m.entries()].sort((a,b)=>b[1]-a[1])[0]||['—',0],[topSec,topSecW]=top(sector),[topFac,topFacW]=top(factor),[topCur,topCurW]=top(currency);let score=100;score-=Math.max(0,(largest-.20)*110);score-=Math.max(0,(topSecW-.35)*75);score-=Math.max(0,(topFacW-.40)*70);score-=Math.max(0,(topCurW-.80)*45);if(items.length<3)score-=25;else if(items.length<5)score-=10;if(classes.size<2&&items.length>=3)score-=10;const cp=correlationDiversificationPenalty();if(cp)score-=cp.penalty;score=decisionClamp(Math.round(score));const label=score>=80?'DIVERSIFICADA':score>=65?'ACEPTABLE':score>=45?'CONCENTRADA':'MUY CONCENTRADA',cls=score>=65?'good':score>=45?'warn':'bad',warnings=[];if(largest>=.35)warnings.push(`Mayor posición ${(largest*100).toFixed(1)}%: concentración individual alta.`);if(topSecW>=.45)warnings.push(`Sector "${topSec}" ${(topSecW*100).toFixed(1)}%: concentración sectorial.`);if(topFacW>=.50)warnings.push(`Factor "${topFac}" ${(topFacW*100).toFixed(1)}%: varias posiciones pueden caer por el mismo motivo.`);if(topCurW>=.85&&currency.size>1)warnings.push(`Moneda ${topCur} ${(topCurW*100).toFixed(1)}%: exposición dominante.`);if(effectiveN<3&&items.length>=3)warnings.push(`Nº efectivo ${effectiveN.toFixed(1)}.`);if(cp&&cp.penalty>0)warnings.push(`Diversificación falsa: ${cp.text}`);if(!warnings.length)warnings.push('No se detectan concentraciones graves.');return{score,label,cls,effectiveN,topSector:`${topSec} ${(topSecW*100).toFixed(0)}%`,topFactor:`${topFac} ${(topFacW*100).toFixed(0)}%`,warnings}
}
function renderDiversification(stats){
 if(!$('diversificationScore'))return;
 const d=diversificationAnalysis(stats),box=$('diversificationScoreBox');
 box.className=`diversification-score ${d.cls}`;
 $('diversificationScore').textContent=d.score+'/100';$('diversificationLabel').textContent=d.label;
 $('diversificationWhy').textContent='Evalúa concentración individual, sector, factor, moneda, clases y número efectivo de posiciones.';
 $('divPositions').textContent=stats.items.length;$('divEffectiveN').textContent=d.effectiveN?d.effectiveN.toFixed(1):'—';$('divTopSector').textContent=d.topSector;$('divTopFactor').textContent=d.topFactor;
 $('diversificationWarnings').innerHTML=d.warnings.map((x,i)=>`<div class="${d.cls==='bad'?'danger':d.cls==='warn'?'warning':''}">• ${escapeHtml(x)}</div>`).join('');
}
function renderPortfolioLedger(){
 if(!$('portfolioLedgerBody'))return;const rows=allPortfolioTransactions(),base=state.config.portfolioBaseCurrency||'ARS';let realized=0,income=0;for(const item of (state.config.watchlist||[])){const cur=item.portfolioCurrency||defaultPortfolioCurrency(item.type),r=convertPortfolioAmount(Number(item.realizedPnl)||0,cur,base),inc=convertPortfolioAmount(Number(item.cashIncome)||0,cur,base);if(Number.isFinite(r))realized+=r;if(Number.isFinite(inc))income+=inc}
 $('ledgerRealized').textContent=fmtPortfolioMoney(realized,base);$('ledgerRealized').className=realized>0?'green':realized<0?'red':'';$('ledgerIncome').textContent=fmtPortfolioMoney(income,base);$('ledgerCount').textContent=rows.length;$('ledgerLast').textContent=rows.length?new Date(Number(rows[0].ts)).toLocaleDateString('es-AR'):'—';
 $('portfolioLedgerBody').innerHTML=rows.length?rows.slice(0,200).map(t=>{const tt=String(t.type||'').toUpperCase(),typ=tt==='BUY'?'COMPRA / AUMENTO':tt==='SELL'?'REDUCCIÓN / VENTA':tt==='COUPON'?'CUPÓN':tt==='DIVIDEND'?'DIVIDENDO':'MOVIMIENTO',cls=tt==='SELL'?'red':tt==='BUY'?'green':(tt==='COUPON'||tt==='DIVIDEND')?'amber':'';return `<tr><td>${new Date(Number(t.ts)).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</td><td><b>${escapeHtml(t.symbol)}</b></td><td class="${cls}">${typ}</td><td>${Number(t.qty)>0?Number(t.qty).toFixed(Number(t.qty)<1?6:4):'—'}</td><td>${Number(t.price)>0?fmt(Number(t.price)):'—'}</td><td>${Number(t.amount)>0?fmtPositionMoney(Number(t.amount)):'—'}</td><td>${escapeHtml(t.currency||defaultPortfolioCurrency(t.assetType||t.item?.type))}</td><td>${Number.isFinite(Number(t.realized))?`${Number(t.realized)>=0?'+':''}${fmtPositionMoney(Number(t.realized))}`:'—'}</td><td>${escapeHtml(t.source||'—')}</td></tr>`}).join(''):'<tr><td colspan="9" class="watch-empty">Sin movimientos.</td></tr>';
}
function openReducePosition(idx,closeAll=false){
 const item=state.config.watchlist?.[idx];if(!item)return;ensureTransactionHistory(item);if(!(Number(item.quantity)>0)){window.radarNotify?.('La posición no tiene tenencia disponible.','warn');return}portfolioV76.reduceItem={item,idx,closeAll:!!closeAll};const pp=portfolioPnl(item,state.watchResults[watchKey(item)]);$('reducePositionTitle').textContent=closeAll?'Cerrar posición':'Reducir posición';$('reducePositionSubtitle').textContent=closeAll?'Cierre total: se venderá exactamente el 100% de la tenencia disponible.':'Venta parcial o total con controles de tenencia.';$('reduceSymbol').value=item.symbol;$('reduceCurrentQty').value=Number(item.quantity).toFixed(Number(item.quantity)<1?6:4);$('reduceMode').value='pct';$('reduceValue').value=closeAll?'100':'25';$('reduceMode').disabled=!!closeAll;$('reduceValue').disabled=!!closeAll;$('reducePrice').value=Number.isFinite(pp.price)?pp.price:(Number(item.buyPrice)||'');$('reduceFees').value='0';$('reducePositionSave').textContent=closeAll?'Confirmar cierre total':'Confirmar reducción';updateReducePreview();$('reducePositionOverlay').classList.add('active');$('reducePositionOverlay').setAttribute('aria-hidden','false');
}
function closeReducePosition(){portfolioV76.reduceItem=null;$('reduceMode').disabled=false;$('reduceValue').disabled=false;$('reducePositionTitle').textContent='Reducir posición';$('reducePositionSave').textContent='Confirmar reducción';$('reducePositionOverlay').classList.remove('active');$('reducePositionOverlay').setAttribute('aria-hidden','true')}
function reductionQtyFromInputs(){
 const c=portfolioV76.reduceItem,item=c?.item;if(!item)return NaN;
 const available=Number(item.quantity)||0,mode=$('reduceMode').value,v=Number($('reduceValue').value),price=Number($('reducePrice').value);
 if(!(v>0))return NaN;
 if(mode==='pct')return available*v/100;
 if(mode==='qty')return v;
 if(mode==='amount'&&price>0)return v/price;
 return NaN;
}
function updateReducePreview(){
 const item=portfolioV76.reduceItem?.item;if(!item)return;
 const available=Number(item.quantity)||0,q=reductionQtyFromInputs(),price=Number($('reducePrice').value),fees=Number($('reduceFees').value)||0,avg=Number(item.buyPrice)||0;
 let msg='';
 if(!(price>0))msg='<span class="reduce-error">Ingresá un precio de ejecución válido.</span>';
 else if(!(q>0))msg='<span class="reduce-error">Ingresá una reducción válida.</span>';
 else if(q>available+1e-9)msg=`<span class="reduce-error">Control bloqueado: intentás vender ${q.toFixed(6)} y sólo tenés ${available.toFixed(6)}.</span>`;
 else{
   const pct=q/available*100,real=q*(price-avg)-fees,left=available-q;
   msg=`Se venderán <b>${q.toFixed(q<1?6:4)}</b> (${pct.toFixed(1)}%) a ${fmt(price)}. P&L realizado estimado: <b class="${real>=0?'green':'red'}">${real>=0?'+':''}${fmtPositionMoney(real)}</b>. Quedarán ${Math.max(0,left).toFixed(left<1?6:4)} unidades.${left<=1e-9?' La posición se cerrará completamente.':''}`;
 }
 $('reducePreview').innerHTML=msg;
}
async function confirmReducePosition(){
 const c=portfolioV76.reduceItem,item=c?.item;if(!item)return;const q=reductionQtyFromInputs(),price=Number($('reducePrice').value),fees=Number($('reduceFees').value)||0;if(c.closeAll&&Math.abs(q-Number(item.quantity))>1e-8){$('reducePreview').innerHTML='<span class="reduce-error">Control de cierre: la cantidad debe ser exactamente la tenencia total.</span>';return}try{const src=c.closeAll?'cierre total v88':'reducción manual v88',draft={id:txId(),type:'SELL',ts:Date.now(),qty:q,price,amount:q*price,fees,currency:item.portfolioCurrency||defaultPortfolioCurrency(item.type),source:src,g2Native:true,g2CashImpactApplied:true};await g2PortfolioCommitMutation(item,draft,()=>addPortfolioSell(item,q,price,fees,src,draft));const wasClose=c.closeAll,symbol=item.symbol;try{await saveConfigStrict()}catch(e){closeReducePosition();renderWatchlist();renderScanner();try{renderRfScanner()}catch{};try{renderDecisionCenter()}catch{};throw e}closeReducePosition();renderWatchlist();renderScanner();try{renderRfScanner()}catch{};try{renderDecisionCenter()}catch{};try{updateAnalysisPortfolioButton()}catch{};try{updateBondPortfolioActions()}catch{};window.radarNotify?.(`${symbol}: ${wasClose?'posición cerrada':'posición reducida'} correctamente.`,'ok')}catch(e){if(e?.radarAlreadyReported===true)return;$('reducePreview').innerHTML=`<span class="reduce-error">${escapeHtml(e.message||e)}</span>`}
}
function openCashFlow(){
 const list=(state.config.watchlist||[]).filter(x=>x.type!=='crypto'&&(x.inPortfolio||Array.isArray(x.transactions)&&x.transactions.length));if(!list.length){window.radarNotify?.('No hay posiciones elegibles para dividendos o cupones. Crypto queda excluido.','warn');return}
 $('cashFlowAsset').innerHTML=list.map(x=>`<option value="${state.config.watchlist.indexOf(x)}">${escapeHtml(x.symbol)} · ${escapeHtml(x.portfolioCurrency||defaultPortfolioCurrency(x.type))}</option>`).join('');$('cashFlowAmount').value='';$('cashFlowDate').value=new Date().toISOString().slice(0,10);syncCashFlowType();$('cashFlowOverlay').classList.add('active');$('cashFlowOverlay').setAttribute('aria-hidden','false');
}
function syncCashFlowType(){
 const idx=Number($('cashFlowAsset')?.value),item=state.config.watchlist?.[idx],sel=$('cashFlowType');if(!sel)return;if(!item){sel.innerHTML='';return}if(['argbond','on'].includes(item.type))sel.innerHTML='<option value="COUPON">Cupón</option>';else sel.innerHTML='<option value="DIVIDEND">Dividendo</option>';
}
function closeCashFlow(){$('cashFlowOverlay').classList.remove('active');$('cashFlowOverlay').setAttribute('aria-hidden','true')}
async function saveCashFlow(){
 const idx=Number($('cashFlowAsset').value),item=state.config.watchlist?.[idx],amount=Number($('cashFlowAmount').value),typ=$('cashFlowType').value,date=$('cashFlowDate').value;if(!item)return;if(!(amount>0)){window.radarNotify?.('Ingresá un importe mayor a cero.','warn');$('cashFlowAmount')?.focus();return}try{const ts=date?new Date(date+'T12:00:00').getTime():Date.now(),resolvedType=['argbond','on'].includes(item?.type)?'COUPON':'DIVIDEND',draft={id:txId(),type:resolvedType,ts,qty:0,price:0,amount,fees:0,currency:item.portfolioCurrency||defaultPortfolioCurrency(item.type),source:'manual',g2Native:true,g2CashImpactApplied:true};await g2PortfolioCommitMutation(item,draft,()=>addPortfolioIncome(item,typ,amount,ts,draft));try{await saveConfigStrict()}catch(e){closeCashFlow();renderWatchlist();throw e}closeCashFlow();renderWatchlist();window.radarNotify?.(`${item.symbol}: ${resolvedType==='COUPON'?'cupón':'dividendo'} registrado.`,'ok')}catch(e){if(e?.radarAlreadyReported===true)return;window.radarNotify?.(String(e.message||e),'bad')}
}

;

/* ===== RUNTIME BLOCK 35 ===== */
/* Radar Técnico G2 — Phase 10M / v4.44.0
   Portfolio benchmark / backup / contextual refresh runtime extraction.
   Ownership-only move from the single legacy inline compatibility bridge.
   Relative-strength, backup/restore and portfolio refresh semantics are intentionally unchanged.
*/

function benchmarkSectorEtf(sector){
 const s=String(sector||'').toLowerCase();
 if(s.includes('tecn')||s.includes('semiconductor'))return'XLK';
 if(s.includes('finan')||s.includes('banco'))return'XLF';
 if(s.includes('energ')||s.includes('oil')||s.includes('petr'))return'XLE';
 if(s.includes('salud')||s.includes('health'))return'XLV';
 if(s.includes('industrial'))return'XLI';
 if(s.includes('consumo')||s.includes('consumer'))return'XLY';
 if(s.includes('servicios públicos')||s.includes('utilities'))return'XLU';
 if(s.includes('inmobili'))return'XLRE';
 if(s.includes('material'))return'XLB';
 return null;
}
function mainBenchmark(type,symbol){
 if(type==='crypto')return symbol==='BTCUSDT'?'ETHUSDT':'BTCUSDT';
 if(type==='argstock')return'^MERV';
 if(type==='cedear')return'SPY';
 return'SPY';
}
async function benchmarkBars(symbol,key,type){
 if(type==='crypto'){
   const tf=TF_CRYPTO[key]||TF_CRYPTO.medium;return await fetchBinance(symbol,tf.interval);
 }
 if(type==='argstock'){
   const tf=key==='short'?{interval:'1d',range:'1y'}:key==='medium'?{interval:'1wk',range:'5y'}:{interval:'1mo',range:'10y'};
   return await fetchYahoo(symbol,tf.interval,tf.range,true);
 }
 const tf=TF_STOCK[key]||TF_STOCK.medium;return await fetchYahoo(symbol,tf.interval,tf.range,true);
}
function returnBars(data,n){
 if(!Array.isArray(data)||data.length<Math.min(5,n+1))return NaN;
 const rows=data.slice(-Math.min(data.length,n+1)),a=Number(rows[0]?.close),b=Number(rows.at(-1)?.close);
 return a>0&&Number.isFinite(b)?(b/a-1)*100:NaN;
}
async function loadRelativeStrengthForCurrent(){
 if(!$('rsHeadline')||!state.symbol||!state.type)return;
 if(['argbond','on'].includes(state.type)){renderRelativeStrength(null);return}
 const key=state.currentKey||'medium',bench=mainBenchmark(state.type,state.symbol),sector=state.assetProfile?.sector||portfolioFallbackSector({type:state.type,symbol:state.symbol}),sectorEtf=['stock','cedear'].includes(state.type)?benchmarkSectorEtf(sector):null;
 const cacheKey=[state.type,state.symbol,key,bench,sectorEtf].join('|');
 $('rsHeadline').textContent='Calculando…';$('rsHeadline').className='bias amber';
 try{
   let x=portfolioV76.relativeCache.get(cacheKey);
   if(!x||Date.now()-x.ts>15*60*1000){
     const asset=state.datasets?.[key];
     const [b,s]=await Promise.allSettled([benchmarkBars(bench,key,state.type),sectorEtf?benchmarkBars(sectorEtf,key,'stock'):Promise.resolve(null)]);
     x={ts:Date.now(),asset,bench: b.status==='fulfilled'?b.value:null,sector:s.status==='fulfilled'?s.value:null,benchSymbol:bench,sectorSymbol:sectorEtf};
     portfolioV76.relativeCache.set(cacheKey,x);
   }
   renderRelativeStrength(x);
 }catch(e){renderRelativeStrength({error:String(e.message||e),benchSymbol:bench,sectorSymbol:sectorEtf})}
}
function renderRelativeStrength(x){
 const ids=['rsAsset20','rsBench20','rsExcess20','rsAsset60','rsBench60','rsExcess60'];ids.forEach(id=>$(id).textContent='—');
 $('rsBenchmark').textContent=x?.benchSymbol||'—';$('rsSectorBenchmark').textContent=x?.sectorSymbol||'—';
 if(!x?.asset||!x?.bench){$('rsHeadline').textContent='SIN DATOS COMPARABLES';$('rsHeadline').className='bias amber';$('rsWhy').textContent=x?.error||'La fuente no entregó una serie comparable. No se inventa fuerza relativa.';return}
 const a20=returnBars(x.asset,20),b20=returnBars(x.bench,20),a60=returnBars(x.asset,60),b60=returnBars(x.bench,60),e20=a20-b20,e60=a60-b60;
 const set=(id,v)=>{$(id).textContent=Number.isFinite(v)?decisionFmtPct(v):'—';$(id).className=Number.isFinite(v)?v>0?'rs-positive':v<0?'rs-negative':'rs-neutral':''};
 set('rsAsset20',a20);set('rsBench20',b20);set('rsExcess20',e20);set('rsAsset60',a60);set('rsBench60',b60);set('rsExcess60',e60);
 let label='NEUTRAL',cls='amber';
 if(Number.isFinite(e20)&&Number.isFinite(e60)){if(e20>2&&e60>3){label='FORTALEZA RELATIVA ALTA';cls='green'}else if(e20<-2&&e60<-3){label='DEBILIDAD RELATIVA';cls='red'}}
 $('rsHeadline').textContent=label;$('rsHeadline').className=`bias ${cls}`;
 let sectorText='';
 if(x.sector){const s20=returnBars(x.sector,20);if(Number.isFinite(s20))sectorText=` Sector ETF ${x.sectorSymbol}: ${decisionFmtPct(s20)} en 20 barras.`}
 $('rsWhy').textContent=`Activo vs ${x.benchSymbol}: exceso ${Number.isFinite(e20)?decisionFmtPct(e20):'—'} en 20 barras y ${Number.isFinite(e60)?decisionFmtPct(e60):'—'} en 60.${sectorText} No modifica aún el Score Oportunidad.`;
}

// Phase 10K: Research Lab / backtest / replay orchestration moved to /g2/runtime/research-lab-runtime.js

const RADAR_CEDEAR_ROTATION_BACKUP_KEY='radar_cedear_rotation_v1';
function readCedearRotationBackupState(){
 try{const raw=localStorage.getItem(RADAR_CEDEAR_ROTATION_BACKUP_KEY);if(!raw)return null;const parsed=JSON.parse(raw);return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:null}catch(e){console.warn('backup Cartera USD',e);return null}
}
function exportRadarBackup(){
 const daily={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('radar_daily_v78_'))daily[k]=localStorage.getItem(k)}const cedearRotation=readCedearRotationBackupState();const backup={format:'RadarTecnicoBackup',version:'v93',createdAt:new Date().toISOString(),config:state.config,signals:signalJournal?.signals||[],decisions:v78.decisionAudit.records||[],dailySnapshots:daily,localState:{schemaVersion:1,cedearRotation}};const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`radar_backup_v93_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
async function restoreRadarBackup(file){
 if(!file)return;let j;try{j=JSON.parse(await file.text())}catch{window.radarNotify('El archivo no es JSON válido.','bad');return}if(j?.format!=='RadarTecnicoBackup'||!j.config||!Array.isArray(j.config.watchlist)){window.radarNotify('Backup inválido.','bad');return}if(!await window.radarConfirm(`¿Restaurar backup ${j.version||''}? La configuración actual será reemplazada por el contenido del archivo.`,{title:'Restaurar backup',confirmLabel:'Restaurar',tone:'warn'}))return;state.config={...state.config,...j.config};for(const item of state.config.watchlist||[])ensureTransactionHistory(item);await saveConfigStrict();if(Array.isArray(j.signals)){signalJournal.signals=j.signals;await saveSignalJournal()}if(Array.isArray(j.decisions)){v78.decisionAudit.records=j.decisions;await saveDecisionAudit()}if(j.dailySnapshots)for(const[k,v]of Object.entries(j.dailySnapshots))localStorage.setItem(k,v);const cedearRotation=j?.localState?.cedearRotation;if(cedearRotation&&typeof cedearRotation==='object'&&!Array.isArray(cedearRotation)){localStorage.setItem(RADAR_CEDEAR_ROTATION_BACKUP_KEY,JSON.stringify(cedearRotation));try{window.RadarCedearRotationRuntime?.reloadPersistedState?.()}catch(e){console.warn('restore Cartera USD runtime',e)}}renderWatchlist();renderSignalHistory();renderDecisionAudit();renderDecisionCenter();await applyMonitorMode(false);window.radarNotify(cedearRotation?'Backup restaurado. Cartera USD, Seguimiento y configuración quedaron recuperados.':'Backup restaurado y migrado correctamente.','ok')
}

// Phase 9X: QA / preflight runtime moved to /g2/runtime/qa-preflight-runtime.js
let portfolioUiMode='watchlist';
function setPortfolioUiMode(mode){
 portfolioUiMode=mode;const title=$('portfolioContextTitle'),sub=$('portfolioContextSubtitle'),badge=$('portfolioContextBadge'),btn=$('refreshWatchlistBtn'),go=$('goPortfolioBtn'),root=$('watchlistView'),icon=root?.querySelector('.workspace-context-main .alloc-rpt-doc-icon');
 if(root){root.classList.toggle('mode-watchlist',mode==='watchlist');root.classList.toggle('mode-portfolio',mode==='portfolio');root.classList.toggle('mode-risk',mode==='risk')}
 if(mode==='watchlist'){if(title)title.textContent='Seguimiento';if(sub)sub.innerHTML='Activos en seguimiento <i></i> disparadores y alertas <i></i> acceso rápido al análisis';if(badge)badge.textContent='SEGUIMIENTO';if(icon)icon.textContent='★';if(btn)btn.textContent='Actualizar seguimiento';if(go){go.textContent='Ver Cartera 360';go.style.display=''}}
 else if(mode==='portfolio'){if(title)title.textContent='Cartera';if(sub)sub.innerHTML='Posiciones reales <i></i> monitoreo y precios <i></i> Seguimiento separado';if(badge)badge.textContent='POSICIONES REALES';if(icon)icon.textContent='▣';if(btn)btn.textContent='Actualizar cartera';if(go)go.style.display='none'}
 else{if(title)title.textContent='Riesgo & Performance';if(sub)sub.innerHTML='Correlación y contribución <i></i> rendimiento vs benchmark <i></i> escenarios de estrés';if(badge)badge.textContent='RIESGO & PERFORMANCE';if(icon)icon.textContent='◇';if(btn)btn.textContent='Actualizar cartera';if(go)go.style.display='none'}
}
async function qaRefreshItemWithTimeout(item,ms=22000){let tm;try{return await Promise.race([refreshSingleWatchItem(item,false),new Promise((_,rej)=>tm=setTimeout(()=>rej(new Error('Timeout de actualización')),ms))])}finally{clearTimeout(tm)}}
async function refreshPortfolioPositions(silent=false){
 const btn=$('refreshWatchlistBtn'),prog=$('refreshPortfolioProgress'),items=(state.config.watchlist||[]).filter(x=>x.inPortfolio);if(!silent){btn.disabled=true;btn.textContent='Actualizando cartera…'}let ok=0,fail=0;
 for(let i=0;i<items.length;i++){if(prog)prog.textContent=`${i+1}/${items.length}`;try{await qaRefreshItemWithTimeout(items[i]);ok++}catch(e){fail++;state.watchResults[watchKey(items[i])]={...(state.watchResults[watchKey(items[i])]||{}),error:String(e.message||e)}}renderWatchlist()}
 v78.lastBrowserMonitor=Date.now();renderMonitorStatus();try{await saveConfigBestEffort('portfolio-price-refresh-cache')}catch{}if(prog)prog.textContent=fail?`${ok} OK · ${fail} error(es)`:items.length?`${ok}/${items.length} OK`:'Sin posiciones';if(!silent){btn.disabled=false;btn.textContent='Actualizar cartera'}return{ok,fail,total:items.length};
}
async function refreshCurrentPortfolioContext(silent=false){return portfolioUiMode==='watchlist'?refreshWatchlist(silent):refreshPortfolioPositions(silent)}

;

/* ===== RUNTIME BLOCK 36 ===== */
// Radar Técnico G2 — Phase 10J / v4.41.0
// Portfolio authority / shadow / dual-write / read-model / cutover orchestration runtime.
// Ownership-only extraction from the legacy compatibility bridge; financial semantics unchanged.

let g2FeaturePromise=null;
async function g2RuntimeFeatures(){
 if(!g2FeaturePromise)g2FeaturePromise=fetch('/api/g2/features',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
 return g2FeaturePromise;
}

let g2PortfolioSyncTimer=null,g2PortfolioShadowState=null,g2PortfolioLiveState=null,g2PortfolioDualWriteState=null,g2PortfolioAuthorityState=null;
function g2PortfolioAuthorityMode(){return g2PortfolioAuthorityState?.mode==='G2_FIRST'?'G2_FIRST':'G1_FIRST'}
async function g2PortfolioLoadAuthority(){
 const f=await g2RuntimeFeatures();if(!f?.portfolioAuthority){g2PortfolioAuthorityState={mode:'G1_FIRST',disabled:true,updatedAt:Date.now()};g2PortfolioRenderCutover();return g2PortfolioAuthorityState}
 try{const r=await fetch('/api/g2/portfolio/authority?id='+encodeURIComponent('portfolio:g1:default'),{cache:'no-store'});if(r.status===404){g2PortfolioAuthorityState={mode:'G1_FIRST',missing:true,updatedAt:Date.now()};g2PortfolioRenderCutover();return g2PortfolioAuthorityState}if(!r.ok)throw new Error(await r.text());g2PortfolioAuthorityState={...(await r.json()),updatedAt:Date.now()};g2PortfolioRenderCutover();return g2PortfolioAuthorityState}catch(e){g2PortfolioAuthorityState={mode:'G1_FIRST',error:String(e.message||e),updatedAt:Date.now()};g2PortfolioRenderCutover();return g2PortfolioAuthorityState}
}
function g2PortfolioTxToG1(t){return{id:String(t.transactionId||t.id||txId()),type:String(t.type||'').toUpperCase(),ts:Date.parse(t.tradeDate)||Date.now(),qty:Number(t.quantity)||0,price:Number(t.price)||0,amount:Number(t.amount)||0,fees:Number(t.fees)||0,currency:t.currency,source:t.source||'Cartera',g2Native:t.metadata?.g2Native===true,g2CashImpactApplied:t.metadata?.cashImpactApplied!==false,cashReconciliation:t.metadata?.cashReconciliation===true,authoritative:t.metadata?.authoritative===true,metadata:t.metadata||{}}}
function g2PortfolioApplyReadModelToG1(record){
 if(!record?.portfolio||!Array.isArray(record.transactions))return false;state.config.watchlist=Array.isArray(state.config.watchlist)?state.config.watchlist:[];
 const grouped=new Map();for(const t of record.transactions){if(!t.instrumentId)continue;const sym=String(t.metadata?.symbol||String(t.instrumentId).split(':').at(-1)||'').toUpperCase(),typ=String(t.metadata?.assetType||String(t.instrumentId).split(':').at(-2)||'auto').toLowerCase(),key=sym+'|'+typ;if(!grouped.has(key))grouped.set(key,{symbol:sym,type:typ,transactions:[]});grouped.get(key).transactions.push(g2PortfolioTxToG1(t))}
 const seen=new Set();for(const g of grouped.values()){let item=state.config.watchlist.find(x=>String(x.symbol).toUpperCase()===g.symbol&&String(x.type).toLowerCase()===g.type&&((x.inPortfolio)||Array.isArray(x.transactions)&&x.transactions.length))||state.config.watchlist.find(x=>String(x.symbol).toUpperCase()===g.symbol&&String(x.type).toLowerCase()===g.type);if(!item){item={symbol:g.symbol,type:g.type,tf:'medium',transactions:[]};state.config.watchlist.push(item)}item.transactions=g.transactions;item.g2PortfolioManaged=true;const pos=(record.portfolio.positions||[]).find(x=>String(x.symbol||x.metadata?.symbol||'').toUpperCase()===g.symbol);if(pos){item.portfolioCurrency=pos.costBasis?.currency||item.portfolioCurrency||defaultPortfolioCurrency(item.type);item.quantity=Number(pos.quantity)||0;item.positionSize=Number(pos.costBasis?.amount)||0;item.buyPrice=Number(pos.averageCost)||0;item.realizedPnl=Number(pos.realizedPnl?.amount)||0;item.cashIncome=Number(pos.income?.amount)||0;item.inPortfolio=Number(pos.quantity)>1e-10}else recomputePositionFromTransactions(item);seen.add(g.symbol+'|'+g.type)}
 for(const item of state.config.watchlist){if(item.g2PortfolioManaged===true&&!seen.has(String(item.symbol).toUpperCase()+'|'+String(item.type).toLowerCase())){item.transactions=[];recomputePositionFromTransactions(item)}}
 const cashTypes=new Set(['DEPOSIT','WITHDRAWAL','FEE','INTEREST','TRANSFER']);state.config.portfolioCashTransactions=record.transactions.filter(t=>!t.instrumentId&&cashTypes.has(String(t.type).toUpperCase())).map(g2PortfolioTxToG1);const m=record.portfolio.metadata||{};if(m.cashReconciledAt)state.config.portfolioCashReconciliation={reconciledAt:m.cashReconciledAt,reason:m.cashReconciliationReason||'Conciliación de caja',targetBalances:m.cashReconciliationTargets||record.portfolio.cashBalances||[]};state.config.g2PortfolioAuthorityMirror={mode:g2PortfolioAuthorityMode(),revision:record.revision,updatedAt:Date.now()};return true
}
async function g2PortfolioTransitionAuthority(action){
 const f=await g2RuntimeFeatures();if(!f?.portfolioAuthority)return alert('La función avanzada de autoridad de cartera no está habilitada en este modo.');
 if(action==='ACTIVATE_G2_FIRST'){const a=await g2PortfolioAssessCutover(true);if(!a?.eligible)return alert('Cutover BLOCKED. Corregí primero los bloqueos indicados.');if(!confirm('Activar G2 como fuente de verdad de la cartera? Las operaciones escribirán primero en el ledger G2 y G1 quedará como espejo de rollback.'))return}
 else if(!confirm('Volver a G1_FIRST? El estado actual de G2 se copiará al espejo G1 antes del rollback.'))return;
 const reason=action==='ACTIVATE_G2_FIRST'?'Phase 5D cutover gate READY · promoción explícita':'Phase 5D rollback explícito del operador';try{if(action==='ROLLBACK_G1_FIRST'){const rec=await g2PortfolioLoadReadModel();if(rec){g2PortfolioApplyReadModelToG1(rec);await saveConfigStrict()}}const r=await fetch('/api/g2/portfolio/authority',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolioId:'portfolio:g1:default',action,reason,parityIssues:g2PortfolioShadowState?.issues||[],fresh:true,expectedRevision:action==='ACTIVATE_G2_FIRST'?(g2PortfolioCutoverState?.result?.revision??g2PortfolioReadState?.record?.revision??g2PortfolioShadowState?.revision):(g2PortfolioReadState?.record?.revision??g2PortfolioShadowState?.revision)})});if(!r.ok)throw new Error(await r.text());const out=await r.json();g2PortfolioAuthorityState={...out.authority,updatedAt:Date.now()};g2PortfolioReadState={ok:true,record:out.record,updatedAt:Date.now(),features:f};g2PortfolioApplyReadModelToG1(out.record);await saveConfigBestEffort('g2-authority-mirror');g2PortfolioRenderReadModel();g2PortfolioRenderCutover();await g2PortfolioRefreshLive(true);if(action==='ROLLBACK_G1_FIRST')await g2PortfolioShadowSync(true);return out}catch(e){alert('No se pudo cambiar la autoridad de Portfolio: '+String(e.message||e));return null}
}
function g2PortfolioAuditG2First(item,t){const typ=String(t.type||'').toUpperCase(),q=Number(t.qty)||0,p=Number(t.price)||0;if(typ==='BUY')recordDecisionAudit({source:'Cartera',symbol:item.symbol,decision:Number(item.quantity)>q?'AUMENTAR':'COMPRAR',action:`+${q.toFixed(q<1?6:4)} unidades`,data:{amount:Number(t.amount)||0,price:p,currency:t.currency},reason:'Transacción confirmada en el libro de cartera.'});else if(typ==='SELL')recordDecisionAudit({source:'Cartera',symbol:item.symbol,decision:Number(item.quantity)<=1e-10?'CERRAR POSICIÓN':'REDUCIR',action:`-${q.toFixed(q<1?6:4)} unidades`,data:{price:p,currency:t.currency},reason:'Transacción confirmada en el libro de cartera.'});else if(['DIVIDEND','COUPON'].includes(typ))recordDecisionAudit({source:'Cartera',symbol:item.symbol,decision:typ==='COUPON'?'CUPÓN':'DIVIDENDO',action:`Ingreso ${Number(t.amount)||0}`,data:{currency:t.currency},reason:'Ingreso confirmado en el libro de cartera.'})}
/* Phase 5B regression anchor: g2PortfolioDualWriteTransaction(item,item.transactions?.at(-1)) */
async function g2PortfolioCommitMutation(item,t,legacyApply){
 const f=await g2RuntimeFeatures();if(f?.portfolioG2First){if(!g2PortfolioAuthorityState)await g2PortfolioLoadAuthority();if(g2PortfolioAuthorityMode()==='G2_FIRST'){if(!g2PortfolioReadState?.record)await g2PortfolioLoadReadModel();const payload=g2PortfolioTxPayload(item,t,g2PortfolioReadState?.record?.revision);let r=await fetch('/api/g2/portfolio/transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(r.status===409){await g2PortfolioLoadReadModel();payload.expectedRevision=g2PortfolioReadState?.record?.revision;r=await fetch('/api/g2/portfolio/transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}if(!r.ok)throw new Error('El motor de cartera bloqueó la operación: '+await r.text());const record=await r.json();g2PortfolioReadState={ok:true,record,updatedAt:Date.now(),features:f};g2PortfolioAuthorityState={...(g2PortfolioAuthorityState||{}),mode:'G2_FIRST',revision:record.revision,updatedAt:Date.now()};g2PortfolioApplyReadModelToG1(record);g2PortfolioAuditG2First(item,t);await saveConfigBestEffort('g2-authoritative-transaction-mirror');g2PortfolioRenderReadModel();if(f.portfolioLive)await g2PortfolioRefreshLive(true);return{mode:'G2_FIRST',record}}}
 const out=legacyApply();const tx=out&&typeof out==='object'?out:t;await g2PortfolioDualWriteTransaction(item,tx);return{mode:'G1_FIRST',transaction:tx}
}
function g2PortfolioShadowPayload(){
 const list=Array.isArray(state.config?.watchlist)?state.config.watchlist:[];
 for(const item of list){try{ensureTransactionHistory(item)}catch{}}
 return{portfolioId:'portfolio:g1:default',name:'Cartera principal G1',baseCurrency:state.config?.portfolioBaseCurrency||'ARS',replace:true,cashTransactions:Array.isArray(state.config?.portfolioCashTransactions)?state.config.portfolioCashTransactions:[],cashReconciliation:state.config?.portfolioCashReconciliation||undefined,watchlist:list.map(item=>({symbol:item.symbol,type:item.type,portfolioCurrency:item.portfolioCurrency||defaultPortfolioCurrency(item.type),transactions:Array.isArray(item.transactions)?item.transactions:[],inPortfolio:!!item.inPortfolio,positionSize:Number(item.positionSize)||0,buyPrice:Number(item.buyPrice)||0,portfolioAddedAt:Number(item.portfolioAddedAt)||null,metadata:{sector:item.sector||portfolioFallbackSector(item),region:item.region||portfolioRegion(item),riskClassOverride:item.riskClassOverride||'AUTO',durationYears:Number.isFinite(Number(item.durationYears))?Number(item.durationYears):undefined,modifiedDuration:Number.isFinite(Number(item.modifiedDuration))?Number(item.modifiedDuration):undefined}}))};
}
function g2PortfolioParity(record){
 const issues=[],g2=new Map((record?.portfolio?.positions||[]).map(p=>[String(p.symbol||p.metadata?.symbol||''),p]));
 for(const item of (state.config?.watchlist||[])){ensureTransactionHistory(item);if(!(item.transactions?.length))continue;const p=g2.get(String(item.symbol));if(!p){issues.push(`${item.symbol}: no aparece en proyección G2`);continue}const pairs=[['qty',Number(item.quantity)||0,Number(p.quantity)||0],['cost',Number(item.positionSize)||0,Number(p.costBasis?.amount)||0],['avg',Number(item.buyPrice)||0,Number(p.averageCost)||0],['realized',Number(item.realizedPnl)||0,Number(p.realizedPnl?.amount)||0]];for(const [label,a,b] of pairs){const tol=Math.max(1e-7,Math.abs(Number(a))*1e-8);if(Math.abs(Number(a)-Number(b))>tol)issues.push(`${item.symbol} ${label}: G1 ${Number(a)} vs G2 ${Number(b)}`)}}
 return{ok:issues.length===0,issues};
}
function g2PortfolioInstrumentId(item){return `legacy:g1:${String(item?.type||'auto').toLowerCase()}:${String(item?.symbol||'').trim().toUpperCase()}`}
function g2PortfolioTxPayload(item,t,revision){
 const typ=String(t?.type||'').toUpperCase(),cashOnly=['DEPOSIT','WITHDRAWAL','FEE','TRANSFER'].includes(typ),ts=Number(t?.ts)||Date.now(),q=Number(t?.qty),p=Number(t?.price),amount=Number(t?.amount);
 return{transactionId:String(t?.id||txId()),portfolioId:'portfolio:g1:default',instrumentId:cashOnly?undefined:g2PortfolioInstrumentId(item),type:typ,tradeDate:new Date(ts).toISOString(),quantity:Number.isFinite(q)&&q>0?q:undefined,price:Number.isFinite(p)&&p>0?p:undefined,amount:Number.isFinite(amount)&&amount>=0?amount:((q>0&&p>0)?q*p:0),currency:t?.currency||item?.portfolioCurrency||defaultPortfolioCurrency(item?.type),fees:Math.max(0,Number(t?.fees)||0),source:String(t?.source||'Cartera'),metadata:{symbol:item?.symbol,assetType:item?.type,sector:item?.sector||portfolioFallbackSector(item),region:item?.region||portfolioRegion(item),riskClassOverride:item?.riskClassOverride||'AUTO',durationYears:Number.isFinite(Number(item?.durationYears))?Number(item.durationYears):undefined,modifiedDuration:Number.isFinite(Number(item?.modifiedDuration))?Number(item.modifiedDuration):undefined,cashImpactApplied:true,g1Imported:false,g2Native:true},expectedRevision:Number.isFinite(Number(revision))?Number(revision):undefined};
}
function g2PortfolioRenderLiveStatus(){
 const el=$('g2PortfolioLiveStatus');if(!el)return;
 const f=g2PortfolioLiveState?.features;if(f&&f.portfolioLive===false){el.className='portfolio360-note g2-portfolio-live';el.textContent='Valuación avanzada no disponible en este modo. Se mantiene la información local de cartera.';return}
 if(!g2PortfolioLiveState){el.className='portfolio360-note g2-portfolio-live';el.textContent='Estado de cartera: esperando primera valuación.';return}
 if(!g2PortfolioLiveState.ok){el.className='portfolio360-note g2-portfolio-live bad';el.textContent=`Valuación de cartera no disponible · ${g2PortfolioLiveState.error||'sin detalle'}`;return}
 const snap=g2PortfolioLiveState.result?.snapshot,base=snap?.baseCurrency||state.config?.portfolioBaseCurrency||'ARS',mv=Number(snap?.marketValueBase?.amount),eq=Number(snap?.equityValueBase?.amount),up=Number(snap?.unrealizedPnlBase?.amount),cov=Number(snap?.coveragePct),status=String(snap?.dataStatus||'UNAVAILABLE'),cashStatus=String(g2PortfolioLiveState.result?.cashLedgerStatus||'COMPLETE'),quotes=(g2PortfolioLiveState.result?.prices||[]).length,errs=(g2PortfolioLiveState.result?.quoteErrors||[]).length;
 const equityText=cashStatus==='PARTIAL'?'N/D (caja histórica incompleta)':fmtPortfolioMoney(eq,base),cls=status==='ERROR'||status==='UNAVAILABLE'?'bad':cashStatus==='PARTIAL'||status!=='LIVE'||cov<99.9?'warn':'good';el.className=`portfolio360-note g2-portfolio-live ${cls}`;el.innerHTML=`<b>Cartera · ${escapeHtml(status)}</b> · Valor activos ${fmtPortfolioMoney(mv,base)} · Equity ${equityText} · Caja ${escapeHtml(cashStatus)} · P&amp;L no realizado ${Number.isFinite(up)?`${up>=0?'+':''}${fmtPortfolioMoney(up,base)}`:'—'} · Cobertura ${Number.isFinite(cov)?cov.toFixed(0)+'%':'—'} · ${quotes} cotización(es)${errs?` · ${errs} sin dato`:''}.`;
}
async function g2PortfolioRefreshLive(force=false){
 const features=await g2RuntimeFeatures();if(!features?.portfolioLive){g2PortfolioLiveState={ok:false,features,error:'Función live desactivada',updatedAt:Date.now()};g2PortfolioRenderLiveStatus();return null}
 try{const r=await fetch('/api/g2/portfolio/live-snapshot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolioId:'portfolio:g1:default',fresh:!!force})});if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`Valuación de cartera ${r.status}`)}const result=await r.json();g2PortfolioLiveState={ok:true,features,result,updatedAt:Date.now()};g2PortfolioRenderLiveStatus();return result}catch(e){g2PortfolioLiveState={ok:false,features,error:String(e.message||e),updatedAt:Date.now()};g2PortfolioRenderLiveStatus();console.warn('G2 Portfolio live snapshot -> G1 remains authoritative',e);return null}
}
async function g2PortfolioShadowSync(force=false){
 const features=await g2RuntimeFeatures();if(!features?.portfolio){g2PortfolioLiveState={ok:false,features,error:'Portfolio G2 desactivado',updatedAt:Date.now()};g2PortfolioRenderLiveStatus();return null}
 if(features?.portfolioAuthority){await g2PortfolioLoadAuthority();if(g2PortfolioAuthorityMode()==='G2_FIRST'){const record=await g2PortfolioLoadReadModel();if(record){g2PortfolioApplyReadModelToG1(record);const parity=g2PortfolioParity(record);g2PortfolioShadowState={ok:parity.ok,issues:parity.issues,warnings:['G2_FIRST activo: import G1 bloqueado; G1 se mantiene como espejo.'],revision:record.revision||0,updatedAt:Date.now(),record,features};if(features?.portfolioLive)g2PortfolioRefreshLive(force).catch(()=>{});return g2PortfolioShadowState}}}
 const payload=g2PortfolioShadowPayload();
 try{const r=await fetch('/api/g2/portfolio/import-g1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`G2 Portfolio ${r.status}`)}const out=await r.json(),parity=g2PortfolioParity(out.record);g2PortfolioShadowState={ok:parity.ok,issues:parity.issues,warnings:out.warnings||[],revision:out.record?.revision||0,updatedAt:Date.now(),record:out.record,features};if(!parity.ok)console.warn('G2 Portfolio shadow parity mismatch',parity.issues);if(features?.portfolioLive)g2PortfolioRefreshLive(force).catch(()=>{});else{g2PortfolioLiveState={ok:false,features,error:'Función live desactivada',updatedAt:Date.now()};g2PortfolioRenderLiveStatus()}if(features?.portfolioRead)g2PortfolioLoadReadModel().catch(()=>{});if(features?.portfolioCutover)g2PortfolioAssessCutover(false).catch(()=>{});return g2PortfolioShadowState}catch(e){g2PortfolioShadowState={ok:false,issues:[String(e.message||e)],warnings:[],revision:0,updatedAt:Date.now(),features};console.warn('G2 Portfolio shadow sync -> G1 remains authoritative',e);g2PortfolioLiveState={ok:false,features,error:String(e.message||e),updatedAt:Date.now()};g2PortfolioRenderLiveStatus();return g2PortfolioShadowState}
}
async function g2PortfolioDualWriteTransaction(item,t){
 const features=await g2RuntimeFeatures();if(!features?.portfolioDualWrite||!t)return null;
 t.g2Native=true;t.g2CashImpactApplied=true;
 try{
  if(!g2PortfolioShadowState?.record)await g2PortfolioShadowSync(false);
  const payload=g2PortfolioTxPayload(item,t,g2PortfolioShadowState?.revision);
  let r=await fetch('/api/g2/portfolio/transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(r.status===502||r.status===503||r.status===409){await g2PortfolioShadowSync(false);delete payload.expectedRevision;r=await fetch('/api/g2/portfolio/transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}
  if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`G2 dual-write ${r.status}`)}
  const record=await r.json(),parity=g2PortfolioParity(record);g2PortfolioShadowState={ok:parity.ok,issues:parity.issues,warnings:g2PortfolioShadowState?.warnings||[],revision:record?.revision||0,updatedAt:Date.now(),record,features};g2PortfolioDualWriteState={ok:true,transactionId:t.id,revision:record?.revision||0,updatedAt:Date.now()};if(features?.portfolioLive)g2PortfolioRefreshLive(true).catch(()=>{});return record
 }catch(e){g2PortfolioDualWriteState={ok:false,transactionId:t?.id,error:String(e.message||e),updatedAt:Date.now()};console.warn('G2 Portfolio dual-write failed; G1 transaction preserved and will retry via sync',e);return null}
}
function g2PortfolioScheduleSync(){
 clearTimeout(g2PortfolioSyncTimer);g2PortfolioSyncTimer=setTimeout(()=>{g2PortfolioShadowSync().catch(()=>{})},180);
}

let g2PortfolioReadState=null,g2PortfolioCutoverState=null;
function g2PortfolioMergeCashTransactions(txs){state.config.portfolioCashTransactions=Array.isArray(state.config.portfolioCashTransactions)?state.config.portfolioCashTransactions:[];const ids=new Set(state.config.portfolioCashTransactions.map(x=>String(x.id)));for(const t of (txs||[])){if(!['DEPOSIT','WITHDRAWAL','FEE','INTEREST','TRANSFER'].includes(String(t.type||'').toUpperCase()))continue;const id=String(t.transactionId||t.id||'');if(!id||ids.has(id))continue;state.config.portfolioCashTransactions.push({id,type:t.type,ts:Date.parse(t.tradeDate)||Date.now(),amount:Number(t.amount)||0,fees:Number(t.fees)||0,currency:t.currency,source:t.source||'Cartera',g2Native:t.metadata?.g2Native===true,g2CashImpactApplied:t.metadata?.cashImpactApplied!==false,cashReconciliation:t.metadata?.cashReconciliation===true,authoritative:t.metadata?.authoritative===true,metadata:t.metadata||{}});ids.add(id)}}
function g2PortfolioRenderReadModel(){const el=$('g2PortfolioReadModel');if(!el)return;if(!g2PortfolioReadState?.ok){el.textContent=g2PortfolioReadState?.error?`Read model G2 no disponible: ${g2PortfolioReadState.error}`:'Read model G2: esperando lectura.';return}const r=g2PortfolioReadState.record,ps=(r?.portfolio?.positions||[]).filter(x=>Number(x.quantity)>1e-10),tx=r?.transactions||[],cash=r?.portfolio?.cashBalances||[];const pos=ps.length?ps.slice(0,8).map(x=>`${escapeHtml(x.symbol||x.instrumentId)} ${Number(x.quantity).toFixed(Number(x.quantity)<1?6:4)}`).join(' · '):'sin posiciones';const cb=cash.length?cash.map(x=>`${escapeHtml(x.currency)} ${fmtPositionMoney(Number(x.amount))}`).join(' · '):'sin caja registrada';el.innerHTML=`<b>Read model G2 · rev ${Number(r?.revision)||0}</b> · ${ps.length} posiciones · ${tx.length} movimientos · Caja: ${cb}.<br><span class="read-model-muted">${pos}</span>`}
async function g2PortfolioLoadReadModel(){const f=await g2RuntimeFeatures();if(!f?.portfolioRead){g2PortfolioReadState={ok:false,error:'desactivado',features:f};g2PortfolioRenderReadModel();return null}try{const r=await fetch('/api/g2/portfolio/record?id='+encodeURIComponent('portfolio:g1:default'),{cache:'no-store'});if(!r.ok)throw new Error(await r.text());const record=await r.json();g2PortfolioReadState={ok:true,record,updatedAt:Date.now(),features:f};if(f?.portfolioAuthority&&!g2PortfolioAuthorityState){try{await g2PortfolioLoadAuthority()}catch{}}if(g2PortfolioAuthorityMode()==='G2_FIRST')g2PortfolioApplyReadModelToG1(record);g2PortfolioRenderReadModel();return record}catch(e){g2PortfolioReadState={ok:false,error:String(e.message||e),updatedAt:Date.now(),features:f};g2PortfolioRenderReadModel();return null}}
function g2PortfolioRenderCutover(){const el=$('g2PortfolioCutoverStatus');if(!el)return;const mode=g2PortfolioAuthorityMode(),prom=$('g2PortfolioPromoteBtn'),roll=$('g2PortfolioRollbackBtn');if(prom)prom.disabled=mode==='G2_FIRST'||g2PortfolioCutoverState?.result?.eligible!==true;if(roll)roll.disabled=mode!=='G2_FIRST';if(!g2PortfolioCutoverState){el.className='portfolio360-note';el.innerHTML=`Autoridad <b>${mode}</b> · Cutover pendiente.`;return}if(!g2PortfolioCutoverState.ok){el.textContent=`Autoridad ${mode} · Cutover no evaluado: ${g2PortfolioCutoverState.error||'error'}`;return}const x=g2PortfolioCutoverState.result,ready=x?.eligible===true,blocks=x?.blockers||[];el.className=`portfolio360-note ${mode==='G2_FIRST'||ready?'good':'warn'}`;el.innerHTML=`<b>Autoridad ${mode}</b> · Gate ${ready?'READY':'BLOCKED'} · Caja ${escapeHtml(x.cashLedgerStatus||'—')} · Cobertura ${Number(x.coveragePct||0).toFixed(0)}% · Paridad ${x.parityIssues?.length?x.parityIssues.length+' desvío(s)':'OK'}${blocks.length?` · Bloqueos: ${escapeHtml(blocks.join(', '))}`:mode==='G2_FIRST'?' · G2 es fuente de verdad; rollback G1 disponible.':' · G2 cumple el gate técnico para promoción.'}`}
async function g2PortfolioAssessCutover(force=false){const f=await g2RuntimeFeatures();if(!f?.portfolioCutover){g2PortfolioCutoverState={ok:false,error:'función desactivada',features:f};g2PortfolioRenderCutover();return null}const parity=g2PortfolioShadowState?.issues||[];try{const r=await fetch('/api/g2/portfolio/cutover-assessment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolioId:'portfolio:g1:default',parityIssues:parity,fresh:!!force})});if(!r.ok)throw new Error(await r.text());const result=await r.json();g2PortfolioCutoverState={ok:true,result,updatedAt:Date.now(),features:f};g2PortfolioRenderCutover();return result}catch(e){g2PortfolioCutoverState={ok:false,error:String(e.message||e),updatedAt:Date.now(),features:f};g2PortfolioRenderCutover();return null}}
function g2CashOpen(){$('g2CashAmount').value='';$('g2CashCurrency').value=state.config?.portfolioBaseCurrency||'ARS';$('g2CashDate').value=new Date().toISOString().slice(0,10);$('g2CashOverlay').classList.add('active');$('g2CashOverlay').setAttribute('aria-hidden','false')}
function g2CashClose(){$('g2CashOverlay').classList.remove('active');$('g2CashOverlay').setAttribute('aria-hidden','true')}
async function g2CashSave(){const f=await g2RuntimeFeatures();if(!f?.portfolioReconciliation){alert('La gestión de caja no está habilitada en este modo.');return}const amount=Number($('g2CashAmount').value),type=$('g2CashType').value,currency=$('g2CashCurrency').value,date=$('g2CashDate').value;if(!(amount>0))return alert('Ingresá un importe mayor a cero.');const t={id:txId(),type,ts:date?new Date(date+'T12:00:00').getTime():Date.now(),amount,fees:0,currency,source:'Movimiento de caja',g2Native:true,g2CashImpactApplied:true};try{const payload={transactionId:t.id,portfolioId:'portfolio:g1:default',type:t.type,tradeDate:new Date(t.ts).toISOString(),amount:t.amount,currency:t.currency,fees:0,source:t.source,metadata:{g2Native:true,cashImpactApplied:true}};const r=await fetch('/api/g2/portfolio/transaction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(await r.text());state.config.portfolioCashTransactions=Array.isArray(state.config.portfolioCashTransactions)?state.config.portfolioCashTransactions:[];if(!state.config.portfolioCashTransactions.some(x=>x.id===t.id))state.config.portfolioCashTransactions.push(t);await saveConfigBestEffort('g2-authoritative-cash-mirror');g2CashClose();await g2PortfolioShadowSync(true);await g2PortfolioLoadReadModel();await g2PortfolioAssessCutover(false)}catch(e){alert('No se pudo registrar el movimiento de caja: '+String(e.message||e))}}
function g2ReconcileOpen(){$('g2ReconARS').value='';$('g2ReconUSD').value='';$('g2ReconUSDT').value='';$('g2ReconReason').value='';$('g2ReconcileOverlay').classList.add('active');$('g2ReconcileOverlay').setAttribute('aria-hidden','false')}
function g2ReconcileClose(){$('g2ReconcileOverlay').classList.remove('active');$('g2ReconcileOverlay').setAttribute('aria-hidden','true')}
async function g2ReconcileSave(){const targetBalances=[];for(const c of ['ARS','USD','USDT']){const raw=$('g2Recon'+c).value;if(raw!==''&&Number.isFinite(Number(raw)))targetBalances.push({currency:c,amount:Number(raw)})}const reason=$('g2ReconReason').value.trim();if(!targetBalances.length)return alert('Ingresá al menos un saldo real a reconciliar.');if(!reason)return alert('Indicá la fuente o motivo de la reconciliación.');try{if(!g2PortfolioShadowState?.record)await g2PortfolioShadowSync(false);const r=await fetch('/api/g2/portfolio/reconcile-cash',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolioId:'portfolio:g1:default',targetBalances,reason,expectedRevision:g2PortfolioShadowState?.revision})});if(!r.ok)throw new Error(await r.text());const out=await r.json();state.config.portfolioCashTransactions=(state.config.portfolioCashTransactions||[]).filter(x=>!x.cashReconciliation);g2PortfolioMergeCashTransactions(out.adjustments||[]);state.config.portfolioCashReconciliation={reconciledAt:out.reconciledAt,reason,targetBalances};await saveConfigBestEffort('g2-authoritative-reconciliation-mirror');g2ReconcileClose();await g2PortfolioShadowSync(true);await g2PortfolioLoadReadModel();await g2PortfolioAssessCutover(true)}catch(e){alert('No se pudo reconciliar caja: '+String(e.message||e))}}

;

/* ===== RUNTIME BLOCK 37 ===== */
/* Radar Técnico G2 — Phase 10I / v4.40.0
   Technical Validation client + Advanced Validation / Model Validation runtime owner.
   Mechanical extraction from the certified v4.39.0 / Phase 10H inline bridge.
   No financial semantics, scoring weights, backtest rules, costs, OOS rules or model-application rules changed. */

function g2TechnicalValidationPayload(data,key,context={}){
 const symbol=String(context.symbol||state.symbol||'unknown').toUpperCase(),tf=context.timeframe||state.tfs?.[key]?.interval||key;
 return{instrumentId:`legacy:g1:${symbol}`,timeframe:tf,profile:key,sourceId:context.source||state.source||'G1 UI',bars:data,maxBars:Number(context.maxBars)||80,commissionBps:Number(context.commissionBps)||0,slippageBps:Number(context.slippageBps)||0,trainPct:Number(context.trainPct)||70,randomTrials:Number(context.randomTrials)||25,scoreWeights:state.config?.scoreWeights||null,scoreModelVersion:Number(state.config?.scoreModelVersion)||1};
}
async function g2TechnicalValidationPost(route,payload){
 const features=await g2RuntimeFeatures();if(!features?.technicalValidation)throw new Error('G2 Technical Validation disabled');
 const r=await fetch(`/api/g2/technical/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 if(!r.ok){let msg='';try{msg=await r.text()}catch{};throw new Error(msg||`G2 Technical Validation ${r.status}`)}return await r.json();
}
function renderQuickBacktestFields(bt){$('btCount').textContent=bt?.count??0;$('btWins').textContent=bt?.wins??0;$('btLosses').textContent=bt?.losses??0;$('btRate').textContent=Number.isFinite(Number(bt?.rate))?Number(bt.rate).toFixed(1)+'%':'Muestra insuficiente'}
let g2QuickBacktestRequestToken=0;
async function refreshQuickBacktestRuntime(a){
 const token=++g2QuickBacktestRequestToken,features=await g2RuntimeFeatures();if(!features?.technicalValidation)return;
 try{const payload=g2TechnicalValidationPayload(a.data,a.key,{symbol:state.symbol,timeframe:state.tfs?.[a.key]?.interval,source:state.source,maxBars:12});const bt=await g2TechnicalValidationPost('quick-backtest',payload);if(token!==g2QuickBacktestRequestToken||state.analyses?.[a.key]!==a)return;renderQuickBacktestFields(bt)}catch(e){console.warn('G2 Quick Backtest -> legacy result retained',e)}
}
function adaptG2BacktestRow(row){const s=row?.signal||{},o=row?.outcome||{};return{sig:{plan:s.plan,status:s.status,price:s.price,ts:Date.parse(s.ts),a:{breakType:s.breakSignal,emaState:s.emaState,macdState:s.macdState,structure:s.structure,score:s.directionalScore,c:s.price}},out:{status:o.status,r:o.r,netR:o.netR,mfe:o.mfePct,mae:o.maePct,endIndex:o.endIndex,entry:o.entry},index:s.index}}
function renderAdvancedValidationG2(v){
 if(!v)return;const is=v.inSample||{},oos=v.outOfSample||{},all=v.all||{},folds=v.folds||[];
 $('labIsR').textContent=Number.isFinite(Number(is.avgR))?Number(is.avgR).toFixed(2)+'R':'—';$('labOosR').textContent=Number.isFinite(Number(oos.avgR))?Number(oos.avgR).toFixed(2)+'R':'—';$('labBuyHold').textContent=Number.isFinite(Number(v.buyHoldPct))?decisionFmtPct(Number(v.buyHoldPct)):'—';$('labRandomBaseline').textContent=Number.isFinite(Number(v.randomBaselineAvgR))?Number(v.randomBaselineAvgR).toFixed(2)+'R':'—';
 $('labWalkForward').innerHTML=folds.map(f=>`<div class="validation-box"><small>Fold ${f.fold}</small><b>${Number.isFinite(Number(f.avgR))?Number(f.avgR).toFixed(2)+'R':'—'}</b><span class="signal-sub">${f.n||0} casos · ${Number.isFinite(Number(f.winRate))?Number(f.winRate).toFixed(0)+'% win':'—'}</span></div>`).join('');
 const label=v.evidence==='FAVORABLE'?'EVIDENCIA FAVORABLE':v.evidence==='MIXED'?'MIXTA / REVISAR':'MUESTRA LIMITADA';$('labValidationChip').textContent=label;$('labValidationChip').className=`intel-chip ${v.evidence==='FAVORABLE'?'good':v.evidence==='MIXED'?'neutral':'warn'}`;$('labValidationNote').textContent=`G2 Backtest Engine · Costos: ${Number(v.costs?.commissionBps)||0} bps comisión + ${Number(v.costs?.slippageBps)||0} bps slippage por lado. Split ${Number(v.trainPct)||70}/${100-(Number(v.trainPct)||70)}. OOS ${oos.n||0} casos. Baseline aleatorio con semilla fija.`;portfolioV76.validation={is:{n:is.n,avg:is.avgR,wr:is.winRate,pf:is.profitFactor,dd:is.maxDrawdownR,rs:is.rSeries||[]},oos:{n:oos.n,avg:oos.avgR,wr:oos.winRate,pf:oos.profitFactor,dd:oos.maxDrawdownR,rs:oos.rSeries||[]},folds,bh:v.buyHoldPct,random:v.randomBaselineAvgR,all:{n:all.n,avg:all.avgR,wr:all.winRate,pf:all.profitFactor,dd:all.maxDrawdownR,rs:all.rSeries||[]}};
}

/* Advanced validation */
function costRForSignal(sig){const bps=Math.max(0,Number($('labCommissionBps')?.value)||0)+Math.max(0,Number($('labSlippageBps')?.value)||0),riskPct=Math.abs(Number(sig?.plan?.riskPct));return riskPct>0?(2*bps/100)/riskPct:0}
function netLabR(row){const r=Number(row.out?.r);return Number.isFinite(r)?r-costRForSignal(row.sig):NaN}
function metricsFromLabRows(rows){const resolved=rows.filter(x=>['WIN','LOSS'].includes(x.out.status)),rs=resolved.map(netLabR).filter(Number.isFinite),wins=resolved.filter(x=>netLabR(x)>0),avg=mean(rs),wr=resolved.length?wins.length/resolved.length*100:NaN,gain=rs.filter(x=>x>0).reduce((a,b)=>a+b,0),loss=Math.abs(rs.filter(x=>x<0).reduce((a,b)=>a+b,0));let eq=0,peak=0,dd=0;for(const r of rs){eq+=r;peak=Math.max(peak,eq);dd=Math.min(dd,eq-peak)}return{n:resolved.length,avg,wr,pf:loss>0?gain/loss:(gain>0?Infinity:NaN),dd,rs}}
function seededRand(seed){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}}
function randomBaseline(data,key,count,trials,maxBars){if(data.length<100||count<3)return NaN;const rnd=seededRand(770077),vals=[];for(let t=0;t<trials;t++){const rs=[];for(let z=0;z<count;z++){const i=80+Math.floor(rnd()*Math.max(1,data.length-82)),sig=labSignalAt(data,key,Math.min(i,data.length-2));if(!sig?.plan||sig.plan.direction==='SIN SETUP')continue;sig.status={...sig.status,kind:sig.plan.direction==='LONG'?'buy':'sell'};const o=evaluateLabTrade(data,i,sig,maxBars);if(['WIN','LOSS'].includes(o.status))rs.push(netLabR({sig,out:o}))}if(rs.length)vals.push(mean(rs))}return mean(vals)}
function walkForwardMetrics(rows){if(rows.length<12)return[];const sorted=[...rows].sort((a,b)=>a.sig.ts-b.sig.ts),folds=[];for(let f=0;f<4;f++){const a=Math.floor(sorted.length*f/4),b=Math.floor(sorted.length*(f+1)/4);folds.push({fold:f+1,...metricsFromLabRows(sorted.slice(a,b))})}return folds}
function buyHoldReturn(data){const a=Number(data?.[0]?.close),b=Number(data?.at(-1)?.close);return a>0&&Number.isFinite(b)?(b/a-1)*100:NaN}
function renderAdvancedValidation(rows,data,key){const trainPct=Number($('labTrainPct')?.value)||70,cut=Math.max(1,Math.floor(rows.length*trainPct/100)),is=metricsFromLabRows(rows.slice(0,cut)),oos=metricsFromLabRows(rows.slice(cut)),folds=walkForwardMetrics(rows),bh=buyHoldReturn(data),random=randomBaseline(data,key,Math.max(4,Math.floor(rows.length*.75)),Number($('labRandomTrials')?.value)||25,Number($('labMaxBars')?.value)||80),all=metricsFromLabRows(rows);$('labIsR').textContent=Number.isFinite(is.avg)?is.avg.toFixed(2)+'R':'—';$('labOosR').textContent=Number.isFinite(oos.avg)?oos.avg.toFixed(2)+'R':'—';$('labBuyHold').textContent=Number.isFinite(bh)?decisionFmtPct(bh):'—';$('labRandomBaseline').textContent=Number.isFinite(random)?random.toFixed(2)+'R':'—';$('labWalkForward').innerHTML=folds.map(f=>`<div class="validation-box"><small>Fold ${f.fold}</small><b>${Number.isFinite(f.avg)?f.avg.toFixed(2)+'R':'—'}</b><span class="signal-sub">${f.n} casos · ${Number.isFinite(f.wr)?f.wr.toFixed(0)+'% win':'—'}</span></div>`).join('');const robust=all.n>=30&&oos.n>=8&&Number.isFinite(all.avg)&&Number.isFinite(oos.avg),beatsRandom=Number.isFinite(random)&&Number.isFinite(oos.avg)?oos.avg>random:false;$('labValidationChip').textContent=robust&&oos.avg>0&&beatsRandom?'EVIDENCIA FAVORABLE':robust?'MIXTA / REVISAR':'MUESTRA LIMITADA';$('labValidationChip').className=`intel-chip ${robust&&oos.avg>0&&beatsRandom?'good':robust?'neutral':'warn'}`;$('labValidationNote').textContent=`Costos: ${Number($('labCommissionBps').value)||0} bps comisión + ${Number($('labSlippageBps').value)||0} bps slippage por lado. Split ${trainPct}/${100-trainPct}. OOS ${oos.n} casos. Baseline aleatorio con semilla fija.`;portfolioV76.validation={is,oos,folds,bh,random,all}}
function componentCorrelation(rows,k){const xs=[],ys=[];for(const r of rows){if(!['WIN','LOSS'].includes(r.out.status))continue;const max=SCORE_BASE_MAX[k],x=Number(r.sig.plan?.components?.[k])/max,y=netLabR(r);if(Number.isFinite(x)&&Number.isFinite(y)){xs.push(x);ys.push(y)}}return pearson(xs,ys)}
function generateModelProposalLegacy(){const rows=portfolioV76.labResults||[],resolved=rows.filter(x=>['WIN','LOSS'].includes(x.out.status));if(resolved.length<30){$('modelValidationSummary').textContent=`Muestra insuficiente: ${resolved.length}. Se requieren al menos 30 señales resueltas.`;$('applyModelProposalBtn').disabled=true;return}const current=currentScoreWeights(),raw={},corrs={};for(const k of Object.keys(SCORE_BASE_MAX)){const c=componentCorrelation(resolved,k);corrs[k]=c;raw[k]=current[k]*(1+decisionClamp(c,-.5,.5)*.45)}const total=Object.values(raw).reduce((a,b)=>a+b,0),proposal={};for(const k of Object.keys(raw))proposal[k]=raw[k]/total*100;const label={structure:'Estructura',mtf:'Multi-TF',fib:'Fibonacci',emas:'EMAs',macd:'MACD',volume:'Volumen',rr:'R:R'};$('modelWeightsBody').innerHTML=Object.keys(SCORE_BASE_MAX).map(k=>{const c=corrs[k],delta=proposal[k]-current[k],read=!Number.isFinite(c)?'Sin datos':c>.12?'Aporta':c<-.12?'Perjudica':'Neutro';return `<tr><td><b>${label[k]}</b></td><td>${current[k].toFixed(1)}</td><td>${Number.isFinite(c)?c.toFixed(3):'—'}</td><td>${proposal[k].toFixed(1)} (${delta>=0?'+':''}${delta.toFixed(1)})</td><td>${read}</td></tr>`}).join('');const oldM=metricsFromLabRows(resolved),selected=resolved.filter(r=>weightedComponentScore(r.sig.plan.components,proposal)>=72),newM=metricsFromLabRows(selected);v78.modelProposal={weights:proposal,corrs,current,oldM,newM,n:resolved.length};$('modelValidationSummary').innerHTML=`Propuesta sobre ${resolved.length} señales. Expectancy actual ${Number.isFinite(oldM.avg)?oldM.avg.toFixed(2):'—'}R; subconjunto propuesto ${selected.length} casos · ${Number.isFinite(newM.avg)?newM.avg.toFixed(2):'—'}R. Validar OOS antes de aplicar.`;$('applyModelProposalBtn').disabled=false}
async function generateModelProposal(){
 const features=await g2RuntimeFeatures();
 if(features?.technicalValidation&&Array.isArray(portfolioV76.g2BacktestRows)){
  try{
   const r=await g2TechnicalValidationPost('model-validation',{rows:portfolioV76.g2BacktestRows,scoreWeights:state.config?.scoreWeights||null});
   if(!r.sufficientSample){$('modelValidationSummary').textContent=`Muestra insuficiente: ${r.sampleSize||0}. Se requieren al menos ${r.minimumRequired||30} señales resueltas.`;$('applyModelProposalBtn').disabled=true;return}
   const label={structure:'Estructura',mtf:'Multi-TF',fib:'Fibonacci',emas:'EMAs',macd:'MACD',volume:'Volumen',rr:'R:R'},current=r.currentWeights||currentScoreWeights(),proposal=r.proposedWeights||current,corrs={};
   for(const x of r.components||[])corrs[x.component]=x.correlationNetR;
   $('modelWeightsBody').innerHTML=(r.components||[]).map(x=>{const c=Number(x.correlationNetR),delta=Number(x.proposedWeight)-Number(x.currentWeight),read=x.reading==='CONTRIBUTES'?'Aporta':x.reading==='HURTS'?'Perjudica':x.reading==='NO_DATA'?'Sin datos':'Neutro';return `<tr><td><b>${label[x.component]||x.component}</b></td><td>${Number(x.currentWeight).toFixed(1)}</td><td>${Number.isFinite(c)?c.toFixed(3):'—'}</td><td>${Number(x.proposedWeight).toFixed(1)} (${delta>=0?'+':''}${delta.toFixed(1)})</td><td>${read}</td></tr>`}).join('');
   const cv=r.currentMetrics||{},nv=r.proposedSubsetMetrics||{},oldM={n:cv.n||0,avg:cv.avgR,wr:cv.winRate,pf:cv.profitFactor,dd:cv.maxDrawdownR,rs:cv.rSeries||[]},newM={n:nv.n||0,avg:nv.avgR,wr:nv.winRate,pf:nv.profitFactor,dd:nv.maxDrawdownR,rs:nv.rSeries||[]};v78.modelProposal={weights:proposal,corrs,current,oldM,newM,n:r.sampleSize};$('modelValidationSummary').innerHTML=`G2 Model Validation sobre ${r.sampleSize} señales. Expectancy actual ${Number.isFinite(Number(oldM.avg))?Number(oldM.avg).toFixed(2):'—'}R; subconjunto propuesto ${r.proposedSubsetSize||0} casos · ${Number.isFinite(Number(newM.avg))?Number(newM.avg).toFixed(2):'—'}R. Validar OOS antes de aplicar.`;$('applyModelProposalBtn').disabled=false;return;
  }catch(e){console.warn('G2 Model Validation -> legacy fallback',e)}
 }
 return generateModelProposalLegacy();
}
async function applyModelProposal(){const p=v78.modelProposal;if(!p)return;if(!await window.radarConfirm(`Aplicar nuevos pesos y crear M${(Number(state.config.scoreModelVersion)||1)+1}?`,{title:'Recalibrar modelo',confirmLabel:'Aplicar pesos',tone:'warn'}))return;const prev=currentScoreWeights();state.config.scoreWeights=p.weights;state.config.scoreModelVersion=(Number(state.config.scoreModelVersion)||1)+1;state.config.scoreModelHistory=state.config.scoreModelHistory||[];state.config.scoreModelHistory.push({ts:Date.now(),from:prev,to:p.weights,evidence:{n:p.n,oldAvgR:p.oldM.avg,newAvgR:p.newM.avg},radar:'v93'});await saveConfigStrict();recordDecisionAudit({source:'Model Validation',symbol:'MODELO',decision:'RECALIBRAR SCORE',action:'Pesos aplicados',data:{from:prev,to:p.weights},reason:`Aplicación explícita. ${p.n} señales.`});$('modelValidationSummary').textContent=`Pesos aplicados. Modelo activo: ${scoreModelLabel()}.`;$('applyModelProposalBtn').disabled=true;v78.modelProposal=null}
async function resetModelWeights(){if(!await window.radarConfirm('¿Restaurar los pesos base del modelo?',{title:'Restaurar pesos base',confirmLabel:'Restaurar',tone:'warn'}))return;const prev=currentScoreWeights();state.config.scoreWeights={...SCORE_BASE_MAX};state.config.scoreModelVersion=(Number(state.config.scoreModelVersion)||1)+1;state.config.scoreModelHistory=state.config.scoreModelHistory||[];state.config.scoreModelHistory.push({ts:Date.now(),from:prev,to:{...SCORE_BASE_MAX},reason:'reset base',radar:'v93'});await saveConfigStrict();recordDecisionAudit({source:'Model Validation',symbol:'MODELO',decision:'RESET SCORE',action:'Pesos base',data:{from:prev,to:SCORE_BASE_MAX},reason:'Restauración explícita.'});$('modelValidationSummary').textContent=`Pesos base restaurados. Modelo: ${scoreModelLabel()}.`}

;

/* ===== RUNTIME BLOCK 38 ===== */
/* Radar Técnico G2 — Phase 10K / v4.42.0
   Research Lab / backtest orchestration runtime extraction.
   Ownership-only move from the single legacy inline compatibility bridge.
   Financial, scoring, backtest, replay and model-validation semantics are intentionally unchanged.
*/

function showLabView(){
 setInstitutionalView('labViewBtn','Laboratorio de Investigación','Replay, backtest, walk-forward y validación del modelo');hideAllMainViews();setTechnicalStatusVisible(false);$('labView').classList.add('active')}
async function labFetch(){
 const raw=normSymbol($('labSymbol').value),sel=$('labType').value,key=$('labTf').value,type=resolveWatchType(raw,sel),symbol=displaySymbolForType(raw,type);
 if(!raw)throw new Error('Ingresá un activo.');
 if(['argbond','on'].includes(type))throw new Error('Replay técnico no se aplica a renta fija.');
 const p=await fetchScannerSeries({symbol,type},key);return{...p,key};
}
function labSignalAt(data,key,index){
 const slice=data.slice(0,index+1);if(slice.length<80)return null;
 const a=analyzeSeries(slice,key),plan=computeTradePlan(a,true),status=scannerStatus(plan,a,'No validado',null);
 return{a,plan,status,price:a.c,ts:Number(slice.at(-1).time)*1000};
}
function evaluateLabTrade(data,startIndex,sig,maxBars=80){
 const p=sig.plan,short=p.direction==='SHORT'||sig.status.kind==='sell';let entry=Number(sig.price),activeStart=startIndex+1;
 if(sig.status.kind==='near'){
   let found=-1;
   for(let j=startIndex+1;j<Math.min(data.length,startIndex+1+maxBars);j++){
     if(Number(data[j].low)<=Math.max(p.entryLow,p.entryHigh)&&Number(data[j].high)>=Math.min(p.entryLow,p.entryHigh)){found=j;break}
   }
   if(found<0)return{status:'UNTRIGGERED',r:null,mfe:null,mae:null,endIndex:Math.min(data.length-1,startIndex+maxBars)};
   activeStart=found;entry=(Number(p.entryLow)+Number(p.entryHigh))/2;
 }
 if(!(entry>0)||!Number.isFinite(Number(p.stop))||!Number.isFinite(Number(p.tp1)))return{status:'NO_LEVELS',r:null,mfe:null,mae:null,endIndex:startIndex};
 const stop=Number(p.stop),tp=Number(p.tp1),bars=[];let status='OPEN',endIndex=Math.min(data.length-1,startIndex+maxBars);
 for(let j=activeStart;j<=endIndex;j++){
   const b=data[j];bars.push(b);const hs=short?Number(b.high)>=stop:Number(b.low)<=stop,ht=short?Number(b.low)<=tp:Number(b.high)>=tp;
   if(hs&&ht){status='AMBIGUOUS';endIndex=j;break}
   if(ht){status='WIN';endIndex=j;break}
   if(hs){status='LOSS';endIndex=j;break}
 }
 const mm=auditMfeMae(bars,entry,short),risk=Math.abs(entry-stop),reward=Math.abs(tp-entry);
 return{status,r:status==='WIN'&&risk>0?reward/risk:status==='LOSS'?-1:null,mfe:mm.mfe,mae:mm.mae,endIndex,entry};
}
function renderLabResults(rows){
 portfolioV76.labResults=rows;const resolved=rows.filter(x=>['WIN','LOSS'].includes(x.out.status)),amb=rows.filter(x=>x.out.status==='AMBIGUOUS'),m=metricsFromLabRows(rows);$('labSignals').textContent=rows.length;$('labResolved').textContent=resolved.length;$('labWinRate').textContent=Number.isFinite(m.wr)?m.wr.toFixed(1)+'%':'—';$('labAvgR').textContent=Number.isFinite(m.avg)?m.avg.toFixed(2)+'R':'—';$('labProfitFactor').textContent=m.pf===Infinity?'∞':Number.isFinite(m.pf)?m.pf.toFixed(2):'—';$('labMaxDd').textContent=Number.isFinite(m.dd)?m.dd.toFixed(2)+'R':'—';$('labAmbiguous').textContent=amb.length;$('labBody').innerHTML=rows.length?rows.map(x=>`<tr><td>${new Date(x.sig.ts).toLocaleDateString('es-AR')}</td><td>${escapeHtml(x.sig.status.label)}</td><td>${x.sig.status.oppScore}/100</td><td>${fmt(Number(x.out.entry||x.sig.price))}</td><td>${fmt(Number(x.sig.plan.stop))}</td><td>${fmt(Number(x.sig.plan.tp1))}</td><td>${x.out.status}</td><td>${Number.isFinite(netLabR(x))?netLabR(x).toFixed(2)+'R':'—'}</td><td>${Number.isFinite(Number(x.out.mfe))?Number(x.out.mfe).toFixed(2)+'%':'—'}</td><td>${Number.isFinite(Number(x.out.mae))?Number(x.out.mae).toFixed(2)+'%':'—'}</td></tr>`).join(''):'<tr><td colspan="10" class="signal-empty">Sin señales.</td></tr>';$('labStatus').innerHTML=`<b>Backtest terminado:</b> ${rows.length} señales · ${resolved.length} resueltas · modelo ${scoreModelLabel()}. R neta de costos configurados.`
}
async function runLabBacktest(){
 $('labBacktestBtn').disabled=true;$('labReplayBtn').disabled=true;$('labStatus').textContent='Cargando serie y recorriendo histórico con costos y validación…';
 try{
  const pack=await labFetch(),data=pack.data,key=pack.key,features=await g2RuntimeFeatures();
  if(features?.technicalValidation){
   try{
    const payload=g2TechnicalValidationPayload(data,key,{symbol:pack.symbol,timeframe:pack.tfs?.[key]?.interval,source:'Research Lab',maxBars:Number($('labMaxBars')?.value)||80,commissionBps:Number($('labCommissionBps')?.value)||0,slippageBps:Number($('labSlippageBps')?.value)||0,trainPct:Number($('labTrainPct')?.value)||70,randomTrials:Number($('labRandomTrials')?.value)||25});
    const result=await g2TechnicalValidationPost('backtest',payload),rows=(result.rows||[]).map(adaptG2BacktestRow);portfolioV76.g2BacktestRows=result.rows||[];portfolioV76.g2BacktestValidation=result.validation||null;portfolioV76.labMeta={symbol:pack.symbol,type:pack.type,key,generatedAt:Date.now(),modelVersion:scoreModelLabel(),engine:result.engine?.name||'TechnicalBacktestEngine'};renderLabResults(rows);renderAdvancedValidationG2(result.validation);$('labStatus').innerHTML+=` <span class="intel-chip good">G2 ${escapeHtml(result.engine?.version||'')}</span>`;return;
   }catch(e){console.warn('G2 Research Backtest -> legacy fallback',e)}
  }
  const rows=[];let cooldownUntil=0,maxBars=Number($('labMaxBars')?.value)||80;for(let i=80;i<data.length-2;i++){if(i<cooldownUntil)continue;const sig=labSignalAt(data,key,i);if(!sig||!['buy','near','sell'].includes(sig.status.kind))continue;const out=evaluateLabTrade(data,i,sig,maxBars);out.netR=Number.isFinite(Number(out.r))?Number(out.r)-costRForSignal(sig):null;rows.push({sig,out,index:i});cooldownUntil=Math.max(i+3,Math.min(data.length-1,out.endIndex||i)+1)}portfolioV76.g2BacktestRows=null;portfolioV76.g2BacktestValidation=null;portfolioV76.labMeta={symbol:pack.symbol,type:pack.type,key,generatedAt:Date.now(),modelVersion:scoreModelLabel()};renderLabResults(rows);renderAdvancedValidation(rows,data,key)
 }catch(e){$('labStatus').innerHTML=`<span class="red">${escapeHtml(e.message||e)}</span>`}finally{$('labBacktestBtn').disabled=false;$('labReplayBtn').disabled=false}
}
async function runLabReplay(){
 $('labReplayBtn').disabled=true;$('labStatus').textContent='Reconstruyendo el estado histórico…';
 try{
   const pack=await labFetch(),date=$('labDate').value,features=await g2RuntimeFeatures();
   if(features?.technicalValidation){
    try{const payload=g2TechnicalValidationPayload(pack.data,pack.key,{symbol:pack.symbol,timeframe:pack.tfs?.[pack.key]?.interval,source:'Research Lab Replay'});payload.asOf=date?new Date(date+'T23:59:59').getTime():null;const r=await g2TechnicalValidationPost('replay',payload),sig=r.signal,d=new Date(r.asOf).toLocaleString('es-AR');$('labReplayResult').innerHTML=`<b>${escapeHtml(pack.symbol)} · ${d}</b><br>DATO: cierre ${fmt(Number(r.price))} · TF ${escapeHtml((getTfsForType(pack.type)[pack.key]||{}).label||pack.key)}.<br>ANÁLISIS: ${escapeHtml(r.explanation||'Sin explicación disponible.')}<br>DECISIÓN: <b>${escapeHtml(sig.status?.label||'SIN SETUP')}</b> · Score oportunidad ${Number(sig.status?.oppScore)||0}/100.<br>ACCIÓN: ${escapeHtml(sig.plan?.action||'Sin acción.')}<br><span class="intel-chip good">G2 Replay ${escapeHtml(r.engine?.version||'')}</span>`;$('labStatus').textContent='Replay G2 calculado point-in-time usando únicamente las barras disponibles hasta la fecha seleccionada.';return}catch(e){console.warn('G2 Replay -> legacy fallback',e)}
   }
   const cut=date?new Date(date+'T23:59:59').getTime()/1000:Infinity,rows=pack.data.filter(x=>Number(x.time)<=cut);if(rows.length<80)throw new Error('No hay al menos 80 barras anteriores a esa fecha.');
   const sig=labSignalAt(rows,pack.key,rows.length-1),d=new Date(Number(rows.at(-1).time)*1000).toLocaleString('es-AR');if(!sig)throw new Error('No se pudo reconstruir el análisis.');$('labReplayResult').innerHTML=`<b>${escapeHtml(pack.symbol)} · ${d}</b><br>DATO: cierre ${fmt(sig.price)} · TF ${escapeHtml((getTfsForType(pack.type)[pack.key]||{}).label||pack.key)}.<br>ANÁLISIS: ${escapeHtml(scannerWhy(sig.plan,sig.a,'No validado',sig.status,null))}<br>DECISIÓN: <b>${escapeHtml(sig.status.label)}</b> · Score oportunidad ${sig.status.oppScore}/100.<br>ACCIÓN: ${escapeHtml(sig.plan?.action||'Sin acción.')}`;$('labStatus').textContent='Replay calculado usando únicamente las barras disponibles hasta la fecha seleccionada.';
 }catch(e){$('labReplayResult').innerHTML=`<span class="red">${escapeHtml(e.message||e)}</span>`}finally{$('labReplayBtn').disabled=false}
}
function exportLabCsv(){
 const rows=portfolioV76.labResults||[];if(!rows.length){window.radarNotify('No hay resultados de backtest para exportar.','warn');return}
 const cols=['fecha','senal','score','entrada','stop','tp1','resultado','r','mfe_pct','mae_pct'],body=rows.map(x=>[new Date(x.sig.ts).toISOString(),x.sig.status.label,x.sig.status.oppScore,x.out.entry||x.sig.price,x.sig.plan.stop,x.sig.plan.tp1,x.out.status,x.out.r,x.out.mfe,x.out.mae]);
 const csv=[cols.join(','),...body.map(r=>r.map(csvEscape).join(','))].join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`radar_backtest_${portfolioV76.labMeta?.symbol||'activo'}_${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

;

/* ===== RUNTIME BLOCK 39 ===== */
// Radar Técnico G2 — Phase 10O / v4.46.0
// Analysis UI / chart presentation / execution orchestration extracted from the final inline compatibility bridge.
// Mechanical ownership move only: technical indicators, analyzeSeries and computeTradePlan remain in the inline technical core.

function resetUI(){
 destroyCharts();
 $('tfButtons').innerHTML='';
 for(const [v,t] of [['macroVal','macroTf'],['mediumVal','mediumTf'],['shortVal','shortTf'],['microVal','microTf']]){
   $(v).textContent='—';$(v).className='v amber';$(t).textContent='—';
 }
 ['support','resistance','confirmation','invalidation','fibDirection','fib382','fib500','fib618','emaState','macdState','ema200State','atrState','volumeState',
  'tradeDirection','tradeEntry','tradeTrigger','tradeStop','tradeTp1','tradeTp2','tradeRisk','tradePct1','tradeRR1','tradeRR2',
  'confluenceScore','btCount','btWins','btLosses','btRate'].forEach(id=>{if($(id))$(id).textContent='—'});
 $('setupStatus').textContent='SIN SETUP';$('setupStatus').className='status-chip amber';$('scoreFill').style.width='0%';
 $('decisionWhy').textContent='Sin análisis.';$('decisionAction').textContent='Sin análisis.';$('decisionInvalidation').textContent='Sin análisis.';
 $('scoreBreakdown').innerHTML='<span class="pill">—</span>';
 $('structurePills').innerHTML='<span class="pill">—</span>';
 $('shortText').textContent='—';$('mediumText').textContent='—';$('macroText').textContent='—';
 $('bias').textContent='—';$('bias').className='bias amber';$('biasNote').textContent='Sin análisis disponible.';
 $('scenarioMain').textContent='—';$('scenarioAlt').textContent='—';
 $('lastPrice').textContent='—';$('changePct').textContent='—';$('changePct').className='';
 $('lastCandleTime').textContent='—';$('freshnessBadge').textContent='—';$('freshnessBadge').className='source';
 resetAssetProfile();
 resetFundamentals(state.type);
}


let mainChart=null,macdChart=null,volumeChart=null,chartResizeObserver=null;
function addSeries(chart,type,opts){
 if(chart.addSeries)return chart.addSeries(LightweightCharts[type],opts);
 const m={CandlestickSeries:'addCandlestickSeries',LineSeries:'addLineSeries',HistogramSeries:'addHistogramSeries'}[type];
 return chart[m](opts);
}
function destroyCharts(){
 if(chartResizeObserver){chartResizeObserver.disconnect();chartResizeObserver=null}
 if(mainChart){mainChart.remove();mainChart=null}
 if(macdChart){macdChart.remove();macdChart=null}
 if(volumeChart){volumeChart.remove();volumeChart=null}
}
let analysisResizeRaf=0;
function resizeOneChart(chart,id,minWidth=320){
 const el=$(id);if(!chart||!el)return;const rect=el.getBoundingClientRect();const width=Math.floor(rect.width),height=Math.floor(rect.height);if(width<minWidth||height<40)return;chart.applyOptions({width,height});
}
function resizeAnalysisCharts(){
 resizeOneChart(mainChart,'chart');resizeOneChart(macdChart,'macd');resizeOneChart(volumeChart,'volume');
}
function scheduleAnalysisChartResize(delay=0){
 if(analysisResizeRaf)cancelAnimationFrame(analysisResizeRaf);
 const run=()=>{analysisResizeRaf=requestAnimationFrame(()=>{analysisResizeRaf=0;resizeAnalysisCharts()})};
 if(delay>0)setTimeout(run,delay);else run();
}
function hline(series,price,title,color,style=2,label=true,width=1){
 if(!Number.isFinite(price))return;
 series.createPriceLine({price,color,lineWidth:width,lineStyle:style,axisLabelVisible:label,title:label?title:''});
}
function renderChart(key){
 updateAnalysisPortfolioButton();
 setTimeout(()=>loadRelativeStrengthForCurrent().catch(()=>{}),20);

 state.currentKey=key;
 document.querySelectorAll('.tf-btn').forEach(b=>b.classList.toggle('active',b.dataset.key===key));
 const a=state.analyses[key],tf=state.tfs[key];if(!a)return;
 $('selectedTf').textContent=tf.label;
 const lastTfCandle=a.data?.at(-1)?.time;
 if(lastTfCandle){
   $('lastCandleTime').textContent=fmtDateTimeUnix(lastTfCandle);
   if(state.type==='argstock'||state.type==='cedear'){
     $('freshnessBadge').textContent='BYMA · DEMORADO';
     $('freshnessBadge').className='source warn';
   }else{
     const fr=freshnessFor(lastTfCandle,tf);
     $('freshnessBadge').textContent=fr.label;
     $('freshnessBadge').className='source '+fr.cls;
   }
 }
 destroyCharts();
 const common={layout:{background:{type:'solid',color:'#06121d'},textColor:'#9fb5c5'},grid:{vertLines:{color:'#10283a'},horzLines:{color:'#10283a'}},rightPriceScale:{borderColor:'#2f688e',scaleMargins:{top:.08,bottom:.08}},timeScale:{borderColor:'#2f688e',timeVisible:true,secondsVisible:false},crosshair:{mode:0}};
 mainChart=LightweightCharts.createChart($('chart'),{...common,width:Math.max(320,$('chart').clientWidth)});
 const candle=addSeries(mainChart,'CandlestickSeries',{upColor:'#27d17f',downColor:'#ff626e',borderVisible:false,wickUpColor:'#27d17f',wickDownColor:'#ff626e'});
 candle.setData(a.data.map(d=>({time:d.time,open:d.open,high:d.high,low:d.low,close:d.close})));

 if($('showEma').checked){
   const line=(arr,color,w)=>{const s=addSeries(mainChart,'LineSeries',{color,lineWidth:w,priceLineVisible:false,lastValueVisible:false});s.setData(a.data.map((d,i)=>({time:d.time,value:arr[i]})))};
   line(a.e20,'#a0ca92',1);line(a.e50,'#eeeeee',1);line(a.e200,'#8195a3',2);
 }

 if($('showStructure').checked){
   const visible=a.sw.slice(-6);
   const st=addSeries(mainChart,'LineSeries',{color:'#8195a3',lineWidth:1,lineStyle:0,priceLineVisible:false,lastValueVisible:false});
   st.setData(visible.map(s=>({time:s.time,value:s.price})));
   const marks=visible.slice(-4).map(s=>({time:s.time,position:s.type==='H'?'aboveBar':'belowBar',color:(s.label==='HH'||s.label==='HL')?'#27d17f':'#ff626e',shape:s.type==='H'?'arrowDown':'arrowUp',text:s.label}));
   if(a.breakType!=='Sin ruptura reciente')marks.push({time:a.data.at(-1).time,position:a.breakType.includes('alcista')?'belowBar':'aboveBar',color:'#f3b84b',shape:'circle',text:a.breakType});
   if(LightweightCharts.createSeriesMarkers)LightweightCharts.createSeriesMarkers(candle,marks);else if(candle.setMarkers)candle.setMarkers(marks);
 }

 const details=$('showDetails').checked;
 if($('showFib').checked&&a.fib){
   // Vista limpia: sólo la zona dorada relevante.
   hline(candle,a.fib.levels[.5],'Fib .50','#f3b84b',2,true,1);
   hline(candle,a.fib.levels[.618],'Fib .618','#27d17f',2,true,1);
   if(details){
     const extraFib={0:'#8195a3',.236:'#8195a3',.382:'#eeeeee',.786:'#9fb5c5',1:'#8195a3'};
     for(const r of [0,.236,.382,.786,1])hline(candle,a.fib.levels[r],`Fib ${r}`,extraFib[r],2,true,1);
   }
 }
 const zones=srZones(a);
 // Los rangos exactos quedan siempre visibles en el panel lateral.
 // Sólo se dibujan sus bordes en modo Detalles.
 if(details){
   if(zones.support){hline(candle,zones.support.low,'','#27d17f',2,false);hline(candle,zones.support.high,'','#27d17f',2,false)}
   if(zones.resistance){hline(candle,zones.resistance.low,'','#ff626e',2,false);hline(candle,zones.resistance.high,'','#ff626e',2,false)}
 }
 const plan=computeTradePlan(a);
 if(plan && plan.direction!=='SIN SETUP'){
  // Una sola línea representa la zona de entrada; el rango completo está en el lateral.
  if(Number.isFinite(plan.entry))hline(candle,plan.entry,plan.status==='OPERABLE'?'ENTRADA CONFIRMADA':'ZONA A VIGILAR · NO ENTRAR',plan.status==='OPERABLE'?'#f6fbff':'#f3b84b',2,true,1);
  if(Number.isFinite(plan.trigger))hline(candle,plan.trigger,'TRIGGER','#f3b84b',2,true,1);
  if(Number.isFinite(plan.stop))hline(candle,plan.stop,'STOP','#ff626e',0,true,1);
  if(Number.isFinite(plan.tp1))hline(candle,plan.tp1,`TP1 +${plan.pct1.toFixed(2)}%`,'#27d17f',0,true,1);
  if(details){
    if(Number.isFinite(plan.entryLow))hline(candle,plan.entryLow,'','#aab8c1',2,false);
    if(Number.isFinite(plan.entryHigh))hline(candle,plan.entryHigh,'','#aab8c1',2,false);
    if(Number.isFinite(plan.tp2))hline(candle,plan.tp2,'TP2','#a0ca92',2,true,1);
   }
 }

 const barsToShow=state.currentKey==='macro'?105:state.currentKey==='medium'?120:140;
 const total=a.data.length;
 const initialRange={from:Math.max(0,total-barsToShow),to:total+3};
 mainChart.timeScale().setVisibleLogicalRange(initialRange);

 macdChart=LightweightCharts.createChart($('macd'),{...common,height:110,width:Math.max(320,$('macd').clientWidth)});
 const hist=addSeries(macdChart,'HistogramSeries',{priceLineVisible:false,lastValueVisible:false});
 hist.setData(a.data.map((d,i)=>({time:d.time,value:a.m.hist[i],color:a.m.hist[i]>=0?'rgba(39,209,127,.55)':'rgba(255,98,110,.55)'})));
 const ml=addSeries(macdChart,'LineSeries',{color:'#eeeeee',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
 const sl=addSeries(macdChart,'LineSeries',{color:'#f3b84b',lineWidth:1,priceLineVisible:false,lastValueVisible:false});
 ml.setData(a.data.map((d,i)=>({time:d.time,value:a.m.macd[i]})));sl.setData(a.data.map((d,i)=>({time:d.time,value:a.m.signal[i]})));

 volumeChart=LightweightCharts.createChart($('volume'),{...common,height:78,width:Math.max(320,$('volume').clientWidth)});
 const vs=addSeries(volumeChart,'HistogramSeries',{priceFormat:{type:'volume'},priceLineVisible:false,lastValueVisible:false});
 vs.setData(a.data.map(d=>({time:d.time,value:d.volume||0,color:d.close>=d.open?'rgba(39,209,127,.48)':'rgba(255,98,110,.48)'})));
 macdChart.timeScale().setVisibleLogicalRange(initialRange);
 volumeChart.timeScale().setVisibleLogicalRange(initialRange);

 let syncingRange=false;
 const syncRange=(source,targets)=>source.timeScale().subscribeVisibleLogicalRangeChange(r=>{
   if(!r||syncingRange)return;
   syncingRange=true;
   try{targets.forEach(t=>t.timeScale().setVisibleLogicalRange(r))}
   finally{syncingRange=false}
 });
 syncRange(mainChart,[macdChart,volumeChart]);
 syncRange(macdChart,[mainChart,volumeChart]);
 syncRange(volumeChart,[mainChart,macdChart]);

 // Responsive real v81: ancho + alto, sidebar, paneles y cambios de layout.
 const observed=[$('chart'),$('macd'),$('volume'),document.querySelector('.analysis-view .chart-card'),$('analysisView')].filter(Boolean);
 chartResizeObserver=new ResizeObserver(()=>scheduleAnalysisChartResize());
 observed.forEach(el=>chartResizeObserver.observe(el));
 requestAnimationFrame(()=>requestAnimationFrame(()=>resizeAnalysisCharts()));
 setTimeout(()=>scheduleAnalysisChartResize(),180);

 // Update current timeframe details every time the user changes timeframe.
 updateSide(a);
 let price=a.c, ch;
 if((state.type==='argstock'||state.type==='cedear')&&state.bymaQuote){
   const qv=quoteValue(state.bymaQuote);
   if(Number.isFinite(qv.price))price=qv.price;
   ch=qv.change;
 }else{
   const prev=a.data.at(-2)?.close||a.data[0].close;ch=(a.c/prev-1)*100;
 }
 $('lastPrice').textContent=fmt(price);
 $('changePct').textContent=Number.isFinite(ch)?pct(ch):'—';
 $('changePct').className=Number.isFinite(ch)?(ch>=0?'green':'red'):'';
}



function renderTechnicalPremiumVisuals(a,plan){
 const con=$('technicalConfluenceVisual'),ready=$('technicalReadinessVisual');if(!con||!ready)return;
 const comp=plan?.components||{},labels={structure:'Estructura',mtf:'Multi-TF',fib:'Fibonacci',emas:'EMAs',macd:'MACD',volume:'Volumen',rr:'R:R'},max={structure:25,mtf:20,fib:15,emas:15,macd:10,volume:10,rr:5};
 const palette=['#249ef4','#28c88a','#9b72ff','#e7b44f','#ef7278','#4fc5d8','#7d93a8'];
 const total=Object.entries(max).reduce((acc,[k,m])=>acc+Math.max(0,Math.min(m,Number(comp[k]||0))),0);
 let cursor=0;const seg=[];const legend=[];Object.keys(max).forEach((k,i)=>{const v=Math.max(0,Math.min(max[k],Number(comp[k]||0))),pct=v;const from=cursor,to=cursor+pct;cursor=to;if(pct>0)seg.push(`${palette[i]} ${from}% ${to}%`);legend.push(`<div class="premium-donut-legend-row"><i style="background:${palette[i]};color:${palette[i]}"></i><span>${labels[k]}</span><b>${Math.round(v)}/${max[k]}</b></div>`)});if(cursor<100)seg.push(`#153043 ${cursor}% 100%`);
 con.innerHTML=`<div class="premium-donut-layout"><div class="premium-donut-shell"><div class="premium-donut" style="background:conic-gradient(${seg.join(',')})"><div class="premium-donut-hole"><b>${Math.round(plan?.score||0)}</b><small>Confluencia</small><em>/100</em></div></div></div><div class="premium-donut-legend">${legend.join('')}</div></div>`;
 const price=Number(a?.c),lo=Number(plan?.entryLow),hi=Number(plan?.entryHigh),rr=Number(plan?.rr1);let dist=NaN;if(Number.isFinite(price)&&price>0&&Number.isFinite(lo)&&Number.isFinite(hi)){dist=price<lo?(lo-price)/price*100:price>hi?(price-hi)/price*100:0}
 const gates=[['Estructura',plan?.direction==='LONG'?a?.structure==='alcista':plan?.direction==='SHORT'?a?.structure==='bajista':false],['Zona',Number.isFinite(dist)&&dist<=1.25],['Trigger',plan?.status==='OPERABLE'],['R:R',Number.isFinite(rr)&&rr>=1.5]];
 const passed=gates.filter(x=>x[1]).length,readiness=Math.round(passed/gates.length*100),rc=plan?.status==='OPERABLE'?'#28c88a':readiness>=50?'#e7b44f':'#ef7278';
 ready.innerHTML=`<div class="technical-readiness-gauge" style="--readiness:${readiness};--readiness-color:${rc}"><div><b>${readiness}%</b><small>Readiness</small></div></div><div class="technical-gate-list">${gates.map(([n,ok])=>`<div class="technical-gate ${ok?'ok':'wait'}"><span>${ok?'✓':'○'} ${n}</span><b>${ok?'OK':'PENDIENTE'}</b></div>`).join('')}</div><div class="technical-entry-distance">${plan?.status==='OPERABLE'?'<b>ENTRADA CONFIRMADA</b>':'<b>NO ENTRAR</b>'}<span>${Number.isFinite(dist)?`Distancia a zona: ${dist.toFixed(2)}%`:'Zona no calculable'} · ${Number.isFinite(rr)?`R:R ${rr.toFixed(2)}`:'R:R N/D'}</span></div>`;
}

function updateSide(a){
 const z=srZones(a),s=z.support?.mid??a.lastL?.price,r=z.resistance?.mid??a.lastH?.price,bull=a.score>=0;
 const plan=computeTradePlan(a);
 $('support').textContent=z.support?`${fmt(z.support.low)}–${fmt(z.support.high)}`:fmt(s);
 $('resistance').textContent=z.resistance?`${fmt(z.resistance.low)}–${fmt(z.resistance.high)}`:fmt(r);
 $('confirmation').textContent=fmt(bull?r:s);$('invalidation').textContent=fmt(bull?s:r);

 if(plan){
  $('setupStatus').textContent=plan.status;
  $('setupStatus').className='status-chip '+(plan.status==='OPERABLE'?'green':plan.status==='SIN SETUP'?'red':'amber');
  $('confluenceScore').textContent=Number.isFinite(plan.score)?plan.score+'/100':'—';
  $('scoreFill').style.width=Math.max(0,Math.min(100,plan.score||0))+'%';
  $('tradeDirection').textContent=plan.direction;$('tradeDirection').className=plan.direction==='LONG'?'green':plan.direction==='SHORT'?'red':'amber';
  $('tradeEntry').textContent=Number.isFinite(plan.entryLow)?`${fmt(plan.entryLow)}–${fmt(plan.entryHigh)}`:'—';
  $('tradeTrigger').textContent=Number.isFinite(plan.trigger)?fmt(plan.trigger):'—';
  $('tradeStop').textContent=Number.isFinite(plan.stop)?fmt(plan.stop):'—';
  $('tradeTp1').textContent=Number.isFinite(plan.tp1)?`${fmt(plan.tp1)} (${plan.pct1.toFixed(2)}%)`:'—';
  $('tradeTp2').textContent=Number.isFinite(plan.tp2)?fmt(plan.tp2):'—';
  $('tradeRisk').textContent=Number.isFinite(plan.riskPct)?plan.riskPct.toFixed(2)+'%':'—';
  $('tradePct1').textContent=Number.isFinite(plan.pct1)?plan.pct1.toFixed(2)+'%':'—';
  $('tradeRR1').textContent=Number.isFinite(plan.rr1)?'1:'+plan.rr1.toFixed(2):'—';
  $('tradeRR2').textContent=Number.isFinite(plan.rr2)?'1:'+plan.rr2.toFixed(2):'—';
  $('decisionWhy').textContent=(plan.why||[]).join(' ');
  $('decisionAction').textContent=plan.action||'—';
  $('decisionInvalidation').textContent=plan.invalidation||'—';
  const labels={structure:'Estructura',mtf:'Multi-TF',fib:'Fibonacci',emas:'EMAs',macd:'MACD',volume:'Volumen',rr:'R:R'},max={structure:25,mtf:20,fib:15,emas:15,macd:10,volume:10,rr:5};
  $('scoreBreakdown').innerHTML=Object.entries(plan.components||{}).map(([k,v])=>`<span class="pill"><span>${labels[k]||k}</span><b>${Math.round(v)}/${max[k]||''}</b></span>`).join('')||'<span class="pill">Sin score direccional</span>';
 }else{
  $('setupStatus').textContent='SIN SETUP';$('confluenceScore').textContent='—';$('scoreFill').style.width='0%';
 }
 $('emaState').textContent=a.emaState;$('macdState').textContent=a.macdState;$('ema200State').textContent=a.c>a.e200.at(-1)?'Por encima':'Por debajo';
 const av=a.A?.at(-1);$('atrState').textContent=Number.isFinite(av)?`${fmt(av)} (${(av/a.c*100).toFixed(2)}%)`:'—';
 $('volumeState').textContent=Number.isFinite(a.volumeRatio)?`${a.volumeRatio.toFixed(2)}x ${a.volumeRatio>=1.05?'sobre':'vs'} media`:'No disponible';
 const recent=a.sw.slice(-5).map(x=>x.label);
 $('structurePills').innerHTML=[`Estructura ${a.structure}`,a.breakType,...recent].map(x=>`<span class="pill">${x}</span>`).join('');
 if(a.fib){
  $('fibDirection').textContent=a.fib.up?'Impulso alcista':'Impulso bajista';$('fib382').textContent=fmt(a.fib.levels[.382]);$('fib500').textContent=fmt(a.fib.levels[.5]);$('fib618').textContent=fmt(a.fib.levels[.618]);
 }else{$('fibDirection').textContent='—';$('fib382').textContent='—';$('fib500').textContent='—';$('fib618').textContent='—'}

 if(plan&&plan.status==='OPERABLE'){
  $('scenarioMain').textContent=`Setup ${plan.direction} operable: zona ${fmt(plan.entryLow)}–${fmt(plan.entryHigh)}, trigger ${fmt(plan.trigger)}, TP1 ${fmt(plan.tp1)} y stop ${fmt(plan.stop)}.`;
 }else if(plan&&plan.status==='ESPERAR CONFIRMACIÓN'){
  $('scenarioMain').textContent=`No entrar todavía. ${plan.action}`;
 }else{
  $('scenarioMain').textContent=plan?.action||'No existe una operación válida en esta temporalidad.';
 }
 $('scenarioAlt').textContent=plan?.invalidation||'Esperar un nuevo cambio estructural.';

 renderTechnicalPremiumVisuals(a,plan);
 updatePositionSizing(plan);
 const bt=quickBacktest(a);renderQuickBacktestFields(bt);refreshQuickBacktestRuntime(a);
}
function updateSummary(){
 for(const [k,vId,tId] of [['macro','macroVal','macroTf'],['medium','mediumVal','mediumTf'],['short','shortVal','shortTf'],['micro','microVal','microTf']]){
   const a=state.analyses[k],el=$(vId);
   if(!a){
     el.textContent='NO DISPONIBLE';el.className='v amber';
     $(tId).textContent=(state.type==='argstock'||state.type==='cedear')?'BYMA gratuito sin intradiario histórico':'Sin datos';
   }else{
     el.textContent=a.trend.toUpperCase();el.className='v '+cls(a.trend);$(tId).textContent=state.tfs[k].label+' · '+a.structure;
   }
 }
 $('shortText').textContent=state.analyses.short?describe(state.analyses.short,state.tfs.short.label):'No disponible.';
 $('mediumText').textContent=state.analyses.medium?describe(state.analyses.medium,state.tfs.medium.label):'No disponible.';
 $('macroText').textContent=state.analyses.macro?describe(state.analyses.macro,state.tfs.macro.label):'No disponible.';
 const[b,c,n]=bias();$('bias').textContent=b;$('bias').className='bias '+c;$('biasNote').textContent=n;
}
function buildButtons(){
 $('tfButtons').innerHTML=Object.entries(state.tfs).map(([k,v])=>`<button class="tf-btn ${k==='short'?'active':''}" data-key="${k}">${v.label}</button>`).join('');
 document.querySelectorAll('.tf-btn').forEach(b=>b.addEventListener('click',()=>renderChart(b.dataset.key)));
}


function renderStrategyAnalytics(){
 if(!$('strategyAnalyticsBody')||typeof signalJournal==='undefined')return;
 const resolved=(signalJournal.signals||[]).filter(x=>['WIN','LOSS'].includes(x.auditStatus)&&signalIsAuditable(x)),groups=new Map();
 for(const s of resolved){
   const k=`${typeLabel(s.type)} · ${s.tfLabel||s.key||'—'} · ${signalKindLabel(s.kind)}`,g=groups.get(k)||{key:k,n:0,w:0,rs:[],mfe:[],mae:[]};
   g.n++;if(s.auditStatus==='WIN')g.w++;if(Number.isFinite(Number(s.rMultiple)))g.rs.push(Number(s.rMultiple));if(Number.isFinite(Number(s.mfePct)))g.mfe.push(Number(s.mfePct));if(Number.isFinite(Number(s.maePct)))g.mae.push(Number(s.maePct));groups.set(k,g);
 }
 const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN,rows=[...groups.values()].sort((a,b)=>b.n-a.n);
 $('strategyAnalyticsBody').innerHTML=rows.length?rows.map(g=>`<tr><td>${escapeHtml(g.key)}</td><td>${g.n}</td><td>${(g.w/g.n*100).toFixed(1)}%</td><td>${Number.isFinite(avg(g.rs))?avg(g.rs).toFixed(2)+'R':'—'}</td><td>${Number.isFinite(avg(g.mfe))?avg(g.mfe).toFixed(2)+'%':'—'}</td><td>${Number.isFinite(avg(g.mae))?avg(g.mae).toFixed(2)+'%':'—'}</td></tr>`).join(''):'<tr><td colspan="6" class="signal-empty">Todavía no hay suficientes señales resueltas.</td></tr>';
 const robust=rows.filter(x=>x.n>=10),best=[...robust].sort((a,b)=>avg(b.rs)-avg(a.rs))[0],worst=[...robust].sort((a,b)=>avg(a.rs)-avg(b.rs))[0];
 $('strategyAnalyticsSummary').innerHTML=resolved.length<20?`<b>Muestra insuficiente:</b> ${resolved.length} señales resueltas. No conviene recalibrar pesos todavía.`:
   `Señales resueltas ${resolved.length}.${best?` Mejor segmento con ≥10 casos: <b>${escapeHtml(best.key)}</b> · ${avg(best.rs).toFixed(2)}R.`:''}${worst&&worst!==best?` Segmento más débil: <b>${escapeHtml(worst.key)}</b> · ${avg(worst.rs).toFixed(2)}R.`:''}`;
 const metrics=[
   ['Segmentos',rows.length],['Con ≥10 casos',robust.length],['Mejor R',best?avg(best.rs).toFixed(2)+'R':'—'],['Peor R',worst?avg(worst.rs).toFixed(2)+'R':'—']
 ];
 $('strategyAnalyticsGrid').innerHTML=metrics.map(([a,b])=>`<div class="div-mini"><small>${escapeHtml(a)}</small><b>${escapeHtml(String(b))}</b></div>`).join('');
}


async function loadAll(){
 const raw=normSymbol($('symbol').value);if(!raw)return;
 const type=detectType(raw,$('assetType').value);
 const actual=type==='crypto'?cryptoSymbol(raw):(['argstock','cedear','argbond','on'].includes(type)?bymaSymbol(raw):raw);
 state.type=type;state.symbol=actual;state.datasets={};state.analyses={};state.bymaQuote=null;
 state.tfs=type==='crypto'?TF_CRYPTO:((['argstock','cedear','argbond','on'].includes(type))?TF_BYMA:TF_STOCK);

 resetUI();
 buildButtons();
 $('assetTitle').textContent=actual;
 $('analyzeBtn').disabled=true;$('loading').classList.add('show');$('statusLine').textContent='Analizando '+actual+'…';
 $('dataErrorBanner').classList.remove('show');$('queryTime').textContent=fmtDateTimeNow();
 const errors=[];

 try{
   if(['argstock','cedear','argbond','on'].includes(type)){
     const results=await Promise.allSettled([fetchBymaHistory(actual),fetchBymaQuote(actual)]);
     if(results[0].status!=='fulfilled')throw results[0].reason;
     const daily=results[0].value;
     if(results[1].status==='fulfilled')state.bymaQuote=results[1].value;else errors.push('Cotización actual: '+results[1].reason?.message);

     state.datasets.short=daily.slice(-700);
     state.datasets.medium=aggregateBars(daily,'week').slice(-700);
     state.datasets.macro=aggregateBars(daily,'month').slice(-700);
     state.source='Open BYMADATA';
   }else{
     for(const[k,tf]of Object.entries(state.tfs)){
       try{
         state.datasets[k]=type==='crypto'?await fetchBinance(actual,tf.interval):await fetchYahoo(actual,tf.interval,tf.range);
       }catch(e){errors.push(`${tf.label}: ${e.message||e}`)}
     }
     if(!Object.keys(state.datasets).length)throw new Error(errors.join(' | ')||'Sin datos');
     state.source=type==='crypto'?'Binance Spot':'Yahoo Finance';
   }

   for(const[k,data]of Object.entries(state.datasets)){
     if(data?.length>=30)state.analyses[k]=await analyzeSeriesRuntime(data,k,{symbol:actual,timeframe:state.tfs[k]?.interval,source:state.source});
   }
   if(!Object.keys(state.analyses).length)throw new Error('No hay histórico suficiente para analizar.');
   await hydrateG2TradePlans({symbol:actual,source:state.source});

   buildButtons();updateSummary();
   const preferred=state.analyses.short?'short':Object.keys(state.analyses)[0];
   renderChart(preferred);

   $('assetTitle').textContent=actual+' · '+(
     type==='crypto'?'CRYPTO':
     type==='cedear'?'CEDEAR / BYMA':
     type==='argstock'?'ACCIÓN ARGENTINA / BYMA':
     type==='argbond'?'BONO / LETRA ARGENTINA / BYMA':
     type==='on'?'OBLIGACIÓN NEGOCIABLE / BYMA':
     'ACCIÓN / ADR USA'
   );
   $('sourceBadge').textContent=state.source;$('sourceBadge').className='source ok';
   $('queryTime').textContent=fmtDateTimeNow();

   // Identidad/sector y fundamentales cargan en forma independiente.
   // Una falla en metadata nunca rompe el análisis técnico.
   loadAssetProfile(type,actual);
   loadFundamentals(type,actual);

   if(['argstock','cedear','argbond','on'].includes(type)){
     $('freshnessBadge').textContent='DEMORA APROX. 20 MIN';$('freshnessBadge').className='source warn';
     $('statusLine').textContent='Datos reales: Open BYMADATA. Histórico gratuito EOD; cotización de panel con demora.';
     $('systemRead').textContent='Argentina usa Open BYMADATA sin clave. El histórico gratuito disponible es diario/semanal/mensual; no se inventan velas intradiarias.';
   }else{
     $('statusLine').textContent=`Datos reales: ${state.source}.`+(errors.length?` Parcial: ${errors.join(' | ')}`:'');
     $('systemRead').textContent='Datos reales únicamente. Precio y estructura tienen prioridad; EMAs, MACD y Fibonacci se usan como confirmación y contexto.';
   }
 }catch(e){
   resetUI();buildButtons();
   $('assetTitle').textContent=actual;
   $('sourceBadge').textContent='SIN DATOS';$('sourceBadge').className='source bad';
   $('freshnessBadge').textContent='NO DISPONIBLE';$('freshnessBadge').className='source bad';
   $('queryTime').textContent=fmtDateTimeNow();
   $('dataErrorBanner').classList.add('show');
   $('dataErrorBanner').innerHTML='<b>DATOS NO DISPONIBLES:</b> '+String(e.message||e);
   $('statusLine').textContent='Error real de fuente: '+String(e.message||e);
 }
 $('loading').classList.remove('show');$('analyzeBtn').disabled=false;
}
function runPrimaryAnalysis(){
 const raw=normSymbol($('symbol').value);if(!raw)return;
 const type=detectType(raw,$('assetType').value);
 if(['argbond','on'].includes(type))loadBondAnalysis(raw,type);
 else{showAnalysisView();loadAll()}
}

;
