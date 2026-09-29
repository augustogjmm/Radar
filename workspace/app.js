import {analyzeSeries,computeTradePlan,opportunityState} from './engine.js';

const $=id=>document.getElementById(id);
const state={market:'today',rows:[],selected:null,bonds:[],risk:null,watch:loadWatch(),running:false,legacyConfig:null,today:null};
const WATCH_KEY='radar_workspace_watch_v1';
const LEGACY_CONFIG_KEY='radar_web_config_v1';
const TODAY_SNAPSHOT_KEY='radar_workspace_today_snapshot_v1';
const MARKET_META={
  today:['HOY','Qué requiere tu atención'],
  cedear:['CEDEAR','Oportunidades en CEDEAR'],
  arg:['ARGENTINA','Acciones líderes'],
  crypto:['CRYPTO','Spot USDT por volumen'],
  bonds:['BONOS','Soberanos en USD'],
  watch:['SEGUIMIENTO','Activos que estás mirando']
};

function loadWatch(){try{return JSON.parse(localStorage.getItem(WATCH_KEY)||'[]')}catch{return[]}}
function saveWatch(){localStorage.setItem(WATCH_KEY,JSON.stringify(state.watch))}
function watchKey(x){return `${x.type}|${x.symbol}`}
function isWatched(x){return state.watch.some(w=>watchKey(w)===watchKey(x))}
function toggleWatch(item){
  const k=watchKey(item),i=state.watch.findIndex(w=>watchKey(w)===k);
  if(i>=0)state.watch.splice(i,1);else state.watch.push({symbol:item.symbol,type:item.type});
  saveWatch();syncWatchButton(item);
  if(state.market==='watch')loadMarket('watch');
}
function syncWatchButton(item){
  const on=item&&isWatched(item),btn=item?.type==='bond'?$('bondWatchBtn'):$('watchBtn');
  if(btn)btn.textContent=on?'✓ En seguimiento':'+ Seguir';
}
function n(v){const x=Number(v);return Number.isFinite(x)?x:NaN}
function fmt(v,d=2){return Number.isFinite(n(v))?new Intl.NumberFormat('es-AR',{maximumFractionDigits:d}).format(n(v)):'—'}
function fmtPct(v,d=1){return Number.isFinite(n(v))?`${n(v)>=0?'+':''}${n(v).toFixed(d)}%`:'—'}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function liquidity(x){for(const k of ['quoteVolume','volumeAmount','tradeVolume','volume']){const v=n(x?.[k]);if(Number.isFinite(v)&&v>0)return v}return 0}
async function json(url,timeout=30000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw new Error(await r.text()||`HTTP ${r.status}`);return await r.json()}
  finally{clearTimeout(t)}
}


function loadLegacyConfig(){
  try{
    const raw=JSON.parse(localStorage.getItem(LEGACY_CONFIG_KEY)||'null');
    state.legacyConfig=raw?.config&&typeof raw.config==='object'?raw.config:{};
  }catch{state.legacyConfig={}}
  const legacy=(state.legacyConfig?.watchlist||[]).map(x=>({...x,symbol:String(x.symbol||'').toUpperCase()})).filter(x=>x.symbol);
  const merged=new Map();
  for(const x of [...legacy,...state.watch])merged.set(watchKey(x),x);
  state.watch=[...merged.values()].map(x=>({
    ...x,
    type:x.type==='argbond'?'bond':x.type,
    legacyType:x.type
  }));
  saveWatch();
}
function legacyPortfolioItems(){
  const legacy=(state.legacyConfig?.watchlist||[]).filter(x=>x?.inPortfolio);
  return legacy.map(x=>{
    const type=x.type==='argbond'?'bond':x.type;
    const buy=Number(x.buyPrice)||0,pos=Number(x.positionSize)||0;
    const qty=Number(x.quantity)>0?Number(x.quantity):(buy>0&&pos>0?pos/buy:0);
    return{...x,symbol:String(x.symbol||'').toUpperCase(),type,legacyType:x.type,quantity:qty,buyPrice:buy,positionSize:pos,portfolioCurrency:x.portfolioCurrency||defaultPortfolioCurrencyLite(type)};
  }).filter(x=>x.symbol);
}
function defaultPortfolioCurrencyLite(type){
  if(type==='crypto')return'USDT';
  if(type==='stock')return'USD';
  return'ARS';
}
function snapshotLoad(){try{return JSON.parse(localStorage.getItem(TODAY_SNAPSHOT_KEY)||'null')}catch{return null}}
function snapshotSave(data){try{localStorage.setItem(TODAY_SNAPSHOT_KEY,JSON.stringify(data))}catch{}}
function usdEquivalent(value,currency,mep){
  if(!Number.isFinite(value))return NaN;
  const c=String(currency||'').toUpperCase();
  if(c==='USD'||c==='USDT')return value;
  if(c==='ARS'&&Number.isFinite(mep)&&mep>0)return value/mep;
  return NaN;
}
function attentionSeverity(row){
  if(row.error)return 1;
  if(row.type==='bond')return 0;
  const label=String(row.opp?.label||'');
  if(/EVITAR|SALIDA/.test(label))return 4;
  if(/CONTRA TENDENCIA/.test(label))return 3;
  if(/DEBILIDAD/.test(label))return 2;
  if(/OPERABLE|COMPRA|LONG|SHORT/.test(label))return 3;
  if(/CERCA/.test(label))return 2;
  return 0;
}
function todayRowKey(x){return `${x.type}|${x.symbol}`}
async function analyzeTodayItem(item){
  if(item.type==='bond'){
    if(!state.bonds.length)await loadBonds();
    const b=state.bonds.find(x=>x.symbol===item.symbol);
    if(!b)return{...item,error:'Sin métricas de renta fija'};
    return{...item,...b,type:'bond'};
  }
  try{return{...item,...await analyzeItem(item)}}catch(e){return{...item,error:String(e?.message||e)}}
}
function currentInstrumentPrice(r){return Number.isFinite(n(r.price))?n(r.price):NaN}
function renderTodayList(hostId,rows,mode){
  const host=$(hostId);if(!host)return;
  if(!rows.length){
    host.innerHTML=`<div class="empty">${mode==='portfolio'?'No hay posiciones marcadas como cartera en Radar.':mode==='watch'?'No hay activos de seguimiento con cambios relevantes.':'Nada requiere atención inmediata.'}</div>`;
    return;
  }
  host.innerHTML=rows.map(r=>{
    const sev=attentionSeverity(r),pnl=Number.isFinite(r.pnlPct)?fmtPct(r.pnlPct):'—';
    const delta=Number.isFinite(r.priceDeltaPct)?fmtPct(r.priceDeltaPct):'';
    const label=r.type==='bond'?'RENTA FIJA':(r.opp?.label|| (r.error?'SIN DATOS':'SIN SETUP'));
    let detail='';
    if(r.type==='bond')detail=[Number.isFinite(r.tir)?`TIR ${fmt(r.tir,2)}%`:'',Number.isFinite(r.paridad)?`paridad ${fmt(r.paridad,1)}%`:'',r.inPortfolio?'P&L no estimado hasta normalizar base':'' ].filter(Boolean).join(' · ');
    else detail=r.error?r.error:(r.opp?.reason||r.plan?.action||'Sin cambio accionable');
    return `<button class="today-row sev-${sev}" data-today-symbol="${esc(r.symbol)}" data-today-type="${esc(r.type)}">
      <span class="today-asset"><b>${esc(r.symbol)}</b><small>${esc(r.type)}${r.inPortfolio?' · cartera':''}</small></span>
      <span class="today-state">${esc(label)}</span>
      <span class="today-detail">${esc(detail)}</span>
      <span class="today-metric"><b>${r.inPortfolio?pnl:(delta||'—')}</b><small>${r.inPortfolio?'P&L':'desde revisión'}</small></span>
    </button>`;
  }).join('');
  host.querySelectorAll('[data-today-symbol]').forEach(el=>el.addEventListener('click',()=>openTodayItem(el.dataset.todaySymbol,el.dataset.todayType)));
}
function openTodayItem(symbol,type){
  const all=[...(state.today?.portfolio||[]),...(state.today?.watch||[])];
  const r=all.find(x=>x.symbol===symbol&&x.type===type);
  if(!r)return;
  state.selected=r;
  if(type==='bond')renderBond(r);else if(!r.error)renderTechnical(r);else showResearchError(symbol,r.error);
}
async function refreshToday(force=false){
  if(state.running&&!force)return;
  state.running=true;state.market='today';
  document.querySelectorAll('.market-tab').forEach(b=>b.classList.toggle('active',b.dataset.market==='today'));
  $('todayView').hidden=false;$('discoverView').hidden=true;
  $('todayAttention').innerHTML='<div class="empty">Analizando cartera y seguimiento…</div>';
  try{
    loadLegacyConfig();
    const previous=snapshotLoad(),portfolioBase=legacyPortfolioItems();
    const watchBase=state.watch.filter(x=>!portfolioBase.some(p=>todayRowKey(p)===todayRowKey(x))).slice(0,12);
    if(!state.bonds.length&&(portfolioBase.some(x=>x.type==='bond')||watchBase.some(x=>x.type==='bond')))await loadBonds().catch(()=>{});
    const analyzeAll=async(items,workers=4)=>{
      const out=[];let i=0;
      await Promise.all(Array.from({length:Math.min(workers,Math.max(1,items.length))},async()=>{while(i<items.length){const item=items[i++];out.push(await analyzeTodayItem(item))}}));
      return out;
    };
    const [portfolio,watch]=await Promise.all([analyzeAll(portfolioBase),analyzeAll(watchBase)]);
    const coreMep=n($('mMep')?.textContent?.replace(/[^0-9,.-]/g,'').replace('.','').replace(',','.'));
    const mep=Number.isFinite(coreMep)?coreMep:n(window.__RADAR_TODAY_MEP);
    let valueUsd=0,costUsd=0;
    for(const r of portfolio){
      r.inPortfolio=true;
      const price=currentInstrumentPrice(r),qty=Number(r.quantity)||0,buy=Number(r.buyPrice)||0;
      if(r.type!=='bond'&&Number.isFinite(price)&&qty>0){
        r.currentValue=price*qty;r.costValue=buy>0?buy*qty:Number(r.positionSize)||NaN;
        r.pnl=r.currentValue-r.costValue;r.pnlPct=Number.isFinite(r.costValue)&&r.costValue>0?r.pnl/r.costValue*100:NaN;
        const cv=usdEquivalent(r.currentValue,r.portfolioCurrency,mep),cc=usdEquivalent(r.costValue,r.portfolioCurrency,mep);
        if(Number.isFinite(cv))valueUsd+=cv;if(Number.isFinite(cc))costUsd+=cc;
      }else if(r.type==='bond'){
        r.valuationNote='P&L pendiente de normalizar nominal, moneda y base de cotización.';
      }
    }
    const previousMap=new Map((previous?.assets||[]).map(x=>[todayRowKey(x),x]));
    for(const r of [...portfolio,...watch]){
      const prev=previousMap.get(todayRowKey(r)),price=currentInstrumentPrice(r);
      if(prev&&Number.isFinite(price)&&Number.isFinite(n(prev.price))&&n(prev.price)!==0)r.priceDeltaPct=(price/n(prev.price)-1)*100;
      if(prev?.label&&prev.label!==(r.opp?.label||''))r.stateChangedFrom=prev.label;
    }
    const changes=[];
    for(const r of [...portfolio,...watch]){
      if(r.stateChangedFrom)changes.push({...r,changeText:`${r.stateChangedFrom} → ${r.opp?.label||'—'}`});
      else if(Number.isFinite(r.priceDeltaPct)&&Math.abs(r.priceDeltaPct)>=2)changes.push({...r,changeText:`Precio ${fmtPct(r.priceDeltaPct)} desde la revisión anterior`});
    }
    const riskNow=n(state.risk?.value),riskPrev=n(previous?.risk),riskDelta=Number.isFinite(riskNow)&&Number.isFinite(riskPrev)?riskNow-riskPrev:NaN;
    if(Number.isFinite(riskDelta)&&Math.abs(riskDelta)>=25)changes.unshift({symbol:'RIESGO PAÍS',type:'macro',changeText:`${riskDelta>=0?'+':''}${Math.round(riskDelta)} pb desde la revisión anterior`,priceDeltaPct:NaN});
    const attention=[...portfolio,...watch].filter(r=>attentionSeverity(r)>=2||r.stateChangedFrom).sort((a,b)=>attentionSeverity(b)-attentionSeverity(a)).slice(0,8);
    const watchedRelevant=watch.filter(r=>attentionSeverity(r)>=2||Number.isFinite(r.priceDeltaPct)).sort((a,b)=>attentionSeverity(b)-attentionSeverity(a)).slice(0,8);
    state.today={portfolio,watch,changes,attention,previous};
    $('todayPositions').textContent=String(portfolio.length);
    $('todayValue').textContent=valueUsd>0?`USD ${fmt(valueUsd,0)}`:'—';
    const totalPnl=valueUsd>0&&costUsd>0?(valueUsd-costUsd)/costUsd*100:NaN;
    $('todayPnl').textContent=Number.isFinite(totalPnl)?`${fmtPct(totalPnl)} vs costo`:'Valor sólo donde moneda/precio son comparables';
    $('todayAttentionCount').textContent=String(attention.length);
    $('todayRisk').textContent=Number.isFinite(riskNow)?`${Math.round(riskNow)} pb`:'—';
    $('todayRiskDelta').textContent=Number.isFinite(riskDelta)?`${riskDelta>=0?'+':''}${Math.round(riskDelta)} pb desde revisión anterior`:(previous?'Sin comparación':'Primera revisión');
    $('todayWhen').textContent=previous?.at?`Comparando contra ${new Date(previous.at).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'})}`:'Primera revisión: se crea línea base';
    renderTodayList('todayAttention',attention,'attention');
    renderTodayList('todayPortfolio',portfolio,'portfolio');
    renderTodayList('todayWatch',watchedRelevant,'watch');
    const changeHost=$('todayChanges');
    if(!changes.length)changeHost.innerHTML='<div class="empty">No hay cambios relevantes respecto de la revisión anterior.</div>';
    else changeHost.innerHTML=changes.slice(0,10).map(r=>`<div class="today-change"><b>${esc(r.symbol)}</b><span>${esc(r.changeText||'Cambio detectado')}</span></div>`).join('');
    snapshotSave({at:Date.now(),risk:riskNow,assets:[...portfolio,...watch].map(r=>({symbol:r.symbol,type:r.type,price:currentInstrumentPrice(r),label:r.opp?.label||'',score:r.plan?.score??null}))});
  }catch(e){
    $('todayAttention').innerHTML=`<div class="empty">No se pudo completar la revisión: ${esc(e.message)}</div>`;
  }finally{state.running=false}
}
async function loadContext(){
  const [risk,core,health]=await Promise.all([
    json('/api/dashboard/risk').catch(()=>null),
    json('/api/dashboard/core').catch(()=>null),
    json('/api/health/deep',90000).catch(()=>null)
  ]);
  state.risk=risk;
  $('mRisk').textContent=Number.isFinite(n(risk?.value))?`${Math.round(n(risk.value))} pb`:'—';
  window.__RADAR_TODAY_MEP=n(core?.fx?.mep?.venta);
  $('mMep').textContent=Number.isFinite(n(core?.fx?.mep?.venta))?`$ ${fmt(core.fx.mep.venta,0)}`:'—';
  $('mCcl').textContent=Number.isFinite(n(core?.fx?.ccl?.venta))?`$ ${fmt(core.fx.ccl.venta,0)}`:'—';
  const hp=$('healthPill'),bad=Number(health?.criticalFailures||0);
  hp.className='health '+(health?(bad?'bad':'ok'):'bad');
  hp.textContent=health?(bad?`${bad} fuente(s) degradada(s)`:'Fuentes verificadas'):'Health no disponible';
}

function parseByma(j){
  if(j?.s!=='ok'||!Array.isArray(j.t))throw new Error('BYMA sin histórico');
  const out=[];for(let i=0;i<j.t.length;i++){
    const b={time:n(j.t[i]),open:n(j.o?.[i]),high:n(j.h?.[i]),low:n(j.l?.[i]),close:n(j.c?.[i]),volume:n(j.v?.[i])||0};
    if([b.open,b.high,b.low,b.close].every(Number.isFinite))out.push(b);
  }return out;
}
function parseYahoo(j){
  const r=j?.chart?.result?.[0],q=r?.indicators?.quote?.[0];if(!r?.timestamp?.length||!q)throw new Error('Yahoo sin histórico');
  const out=[];r.timestamp.forEach((t,i)=>{const b={time:n(t),open:n(q.open?.[i]),high:n(q.high?.[i]),low:n(q.low?.[i]),close:n(q.close?.[i]),volume:n(q.volume?.[i])||0};if([b.open,b.high,b.low,b.close].every(Number.isFinite))out.push(b)});return out;
}
function aggregateBars(bars,mode){
  const bucket=new Map();
  for(const b of bars){
    const d=new Date(b.time*1000);
    let key;
    if(mode==='week'){
      const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
      const day=(x.getUTCDay()+6)%7;x.setUTCDate(x.getUTCDate()-day);
      key=x.toISOString().slice(0,10);
    }else key=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    const prev=bucket.get(key);
    if(!prev)bucket.set(key,{...b});
    else{prev.high=Math.max(prev.high,b.high);prev.low=Math.min(prev.low,b.low);prev.close=b.close;prev.volume=(prev.volume||0)+(b.volume||0);prev.time=b.time}
  }
  return [...bucket.values()].sort((a,b)=>a.time-b.time);
}
async function fetchBars(item,tf='trade'){
  if(item.type==='crypto'){
    const interval=tf==='trade'?'1h':tf==='higher'?'4h':'1d';
    const j=await json(`/api/binance?symbol=${encodeURIComponent(item.symbol)}&interval=${interval}`);
    if(!Array.isArray(j))throw new Error('Binance sin histórico');
    return{bars:j.map(x=>({time:Math.floor(n(x[0])/1000),open:n(x[1]),high:n(x[2]),low:n(x[3]),close:n(x[4]),volume:n(x[5])||0})).filter(b=>[b.open,b.high,b.low,b.close].every(Number.isFinite)),source:'Binance',tf:interval.toUpperCase()};
  }
  if(item.type==='stock'){
    const interval=tf==='trade'?'1d':'1wk',range=tf==='trade'?'2y':'5y';
    return{bars:parseYahoo(await json(`/api/yahoo?symbol=${encodeURIComponent(item.symbol)}&interval=${interval}&range=${range}`)),source:'Yahoo Finance',tf:interval==='1d'?'1D':'1W'};
  }
  let daily,source;
  try{daily=parseByma(await json(`/api/byma/history?symbol=${encodeURIComponent(item.symbol)}&days=7300`));source='Open BYMADATA'}
  catch(e){daily=parseYahoo(await json(`/api/yahoo?symbol=${encodeURIComponent(item.symbol+'.BA')}&interval=1d&range=5y&quiet=1`));source='Yahoo .BA fallback'}
  if(tf==='trade')return{bars:daily,source,tf:'1D'};
  if(tf==='higher')return{bars:aggregateBars(daily,'week'),source,tf:'1W'};
  const monthly=aggregateBars(daily,'month');
  return monthly.length>=80?{bars:monthly,source,tf:'1M'}:{bars:aggregateBars(daily,'week'),source,tf:'1W macro'};
}
function mtfLabel(a){return a?.score>=2?'ALCISTA':a?.score<=-2?'BAJISTA':'NEUTRAL'}
function applyInvestmentRules(item,trade,plan,higher,macro){
  const longOnly=item.type!=='crypto',dir=plan?.direction;
  const h=mtfLabel(higher),m=mtfLabel(macro);
  let aligned=false,label='',reason='';
  if(dir==='LONG'){
    aligned=h==='ALCISTA'&&m==='ALCISTA';
    label=longOnly?'COMPRA':'LONG';
    reason=aligned?'Superior y macro confirman la compra.':`Compra bloqueada: superior ${h.toLowerCase()} / macro ${m.toLowerCase()}.`;
  }else if(dir==='SHORT'){
    aligned=!longOnly&&h==='BAJISTA'&&m==='BAJISTA';
    label=longOnly?'EVITAR / SALIDA':'SHORT';
    reason=longOnly?'Radar no abre shorts en renta variable; la lectura bajista se usa como señal de riesgo.':(aligned?'Superior y macro confirman el short.':`Short bloqueado: superior ${h.toLowerCase()} / macro ${m.toLowerCase()}.`);
  }
  const base=opportunityState(trade,plan);
  if(longOnly&&dir==='SHORT'){
    const strong=plan?.status==='OPERABLE'||(plan?.score||0)>=75;
    return{...base,kind:strong?'sell':'wait',label:strong?'EVITAR / SALIDA':'DEBILIDAD',rank:(strong?300:170)+(plan?.score||0),aligned:false,reason,higher:h,macro:m};
  }
  if(['LONG','SHORT'].includes(dir)&&!aligned)return{...base,kind:'wait',label:'CONTRA TENDENCIA',rank:180+(plan?.score||0),aligned:false,reason,higher:h,macro:m};
  return{...base,label:base.kind==='buy'?label:base.kind==='sell'?label:base.label,aligned,reason,higher:h,macro:m};
}

async function analyzeItem(item){
  const [tradePack,higherPack,macroPack]=await Promise.all([fetchBars(item,'trade'),fetchBars(item,'higher'),fetchBars(item,'macro')]);
  const a=analyzeSeries(tradePack.bars,'short'),higher=analyzeSeries(higherPack.bars,'medium'),macro=analyzeSeries(macroPack.bars,'macro');
  const plan=computeTradePlan(a),opp=applyInvestmentRules(item,a,plan,higher,macro);
  return{...item,bars:tradePack.bars,source:tradePack.source,tf:tradePack.tf,a,higher,macro,plan,opp,price:a.c};
}
async function universe(market){
  if(market==='crypto'){
    const j=await json('/api/binance/universe?top=12');
    return(j.items||[]).sort((a,b)=>liquidity(b)-liquidity(a)).slice(0,12).map(x=>({symbol:String(x.symbol).toUpperCase(),type:'crypto'}));
  }
  if(market==='cedear'){
    const j=await json('/api/byma/cedears?liquid=1');
    return(j.items||[]).sort((a,b)=>liquidity(b)-liquidity(a)).slice(0,12).map(x=>({symbol:String(x.symbol).toUpperCase(),type:'cedear'}));
  }
  if(market==='arg'){
    const j=await json('/api/byma/equities?mode=leading');
    return(j.items||[]).sort((a,b)=>liquidity(b)-liquidity(a)).slice(0,12).map(x=>({symbol:String(x.symbol).toUpperCase(),type:'argstock'}));
  }
  if(market==='watch')return state.watch.filter(x=>x.type!=='bond');
  return[];
}
async function loadBonds(){
  const j=await json('/api/fixed-income/analytics',45000);
  state.risk=j.countryRisk||state.risk;
  state.bonds=(j.bonds||[])
    .filter(x=>/^(AE|AL|GD)\d{2}/.test(String(x.ticker||x.symbol||'').toUpperCase()))
    .map(x=>({symbol:String(x.ticker||x.symbol).toUpperCase(),type:'bond',price:n(x.precio??x.price),tir:n(x.tir),paridad:n(x.paridad),duration:n(x.duration),maturity:x.vencimiento||x.maturityDate||'',raw:x}))
    .filter(x=>x.symbol)
    .sort((a,b)=>(b.tir||-999)-(a.tir||-999));
  return state.bonds;
}

function filteredRows(){
  const sf=$('stateFilter').value,min=n($('scoreFilter').value)||0;
  return state.rows.filter(r=>{
    if(r.type==='bond')return true;
    if((r.plan?.score||0)<min)return false;
    if(sf==='actionable')return['buy','sell','near'].includes(r.opp.kind);
    if(sf==='operable')return['buy','sell'].includes(r.opp.kind);
    if(sf==='wait')return r.opp.kind==='wait'||r.opp.kind==='none';
    return true;
  });
}
function renderRows(){
  const host=$('opportunityList'),rows=filteredRows();
  if(!rows.length){host.innerHTML='<div class="empty">No hay resultados con este filtro. Eso es una salida válida: ampliá el filtro sólo si querés explorar, no para fabricar una señal.</div>';return}
  host.innerHTML=rows.map(r=>{
    if(r.type==='bond')return `<button class="op-row ${state.selected?.symbol===r.symbol?'selected':''}" data-symbol="${esc(r.symbol)}" data-type="bond">
      <span><b>${esc(r.symbol)}</b><small>Soberano USD</small></span><span class="state wait">RENTA FIJA</span><span class="num">—</span><span class="num">${fmt(r.price)}</span><span class="num">TIR ${Number.isFinite(r.tir)?fmt(r.tir,2)+'%':'—'}</span><span class="num">Par. ${Number.isFinite(r.paridad)?fmt(r.paridad,1)+'%':'—'}</span>
    </button>`;
    const p=r.plan,o=r.opp;
    return `<button class="op-row ${state.selected?.symbol===r.symbol?'selected':''}" data-symbol="${esc(r.symbol)}" data-type="${esc(r.type)}">
      <span><b>${esc(r.symbol)}</b><small>${esc(r.type)} · ${esc(r.tf)} · ${esc(r.opp.higher||'—')}/${esc(r.opp.macro||'—')}</small></span>
      <span class="state ${esc(o.kind)}">${esc(o.label)}</span>
      <span class="num">${Math.round(p?.score||0)}</span>
      <span class="num">${fmt(r.price)}</span>
      <span class="num">${Number.isFinite(p?.entryLow)?fmt(p.entryLow)+' – '+fmt(p.entryHigh):'—'}</span>
      <span class="num">${Number.isFinite(p?.rr1)?'1:'+p.rr1.toFixed(2):'—'}</span>
    </button>`;
  }).join('');
  host.querySelectorAll('.op-row').forEach(el=>el.addEventListener('click',()=>openResult(el.dataset.symbol,el.dataset.type)));
}

async function loadMarket(market){
  if(market==='today'){await refreshToday();return}
  if(state.running)return;state.running=true;state.market=market;
  $('todayView').hidden=true;$('discoverView').hidden=false;
  document.querySelectorAll('.market-tab').forEach(b=>b.classList.toggle('active',b.dataset.market===market));
  const [kick,title]=MARKET_META[market];$('marketKicker').textContent=kick;$('marketTitle').textContent=title;
  $('opportunityList').innerHTML='<div class="empty">Actualizando universo y análisis…</div>';
  try{
    if(market==='bonds'){state.rows=(await loadBonds()).slice(0,14)}
    else if(market==='watch'){
      const bonds=state.watch.filter(x=>x.type==='bond');
      const tech=state.watch.filter(x=>x.type!=='bond'),results=[];
      let i=0;await Promise.all(Array.from({length:3},async()=>{while(i<tech.length){const item=tech[i++];try{results.push(await analyzeItem(item))}catch{}}}));
      if(bonds.length){if(!state.bonds.length)await loadBonds();for(const b of bonds){const hit=state.bonds.find(x=>x.symbol===b.symbol);if(hit)results.push(hit)}}
      state.rows=results.sort((a,b)=>(b.opp?.rank||0)-(a.opp?.rank||0));
    }else{
      const items=await universe(market),results=[],errors=[];let i=0;
      await Promise.all(Array.from({length:4},async()=>{while(i<items.length){const item=items[i++];try{results.push(await analyzeItem(item))}catch(e){errors.push(item.symbol)}}}));
      state.rows=results.sort((a,b)=>(b.opp?.rank||0)-(a.opp?.rank||0));
      $('coverage').textContent=`${results.length}/${items.length} analizados${errors.length?' · '+errors.length+' sin datos':''}`;
    }
    if(market==='bonds')$('coverage').textContent=`${state.rows.length} soberanos con métricas`;
    if(market==='watch')$('coverage').textContent=`${state.rows.length} activos en seguimiento`;
    const currentStillVisible=state.rows.some(x=>state.selected&&x.symbol===state.selected.symbol&&x.type===state.selected.type);
    if(!currentStillVisible)state.selected=null;
    renderRows();
    if(state.rows.length&&!state.selected)openResult(state.rows[0].symbol,state.rows[0].type);
  }catch(e){$('opportunityList').innerHTML=`<div class="empty">No se pudo cargar ${esc(title)}: ${esc(e.message)}</div>`;$('coverage').textContent='Error de datos'}
  finally{state.running=false}
}
function openResult(symbol,type){
  const r=state.rows.find(x=>x.symbol===symbol&&x.type===type);
  if(r){state.selected=r;renderRows();if(type==='bond')renderBond(r);else renderTechnical(r);return}
  if(type==='bond'){loadBonds().then(()=>{const b=state.bonds.find(x=>x.symbol===symbol);if(b){state.selected=b;renderBond(b)}});return}
  analyzeItem({symbol,type}).then(x=>{state.selected=x;renderTechnical(x)}).catch(e=>showResearchError(symbol,e.message));
}
function showResearchError(symbol,msg){
  $('researchEmpty').hidden=false;$('researchTechnical').hidden=true;$('researchBond').hidden=true;
  $('researchEmpty').innerHTML=`<span>ANÁLISIS</span><h2>${esc(symbol)}</h2><p>${esc(msg)}</p>`;
}
function renderTechnical(r){
  $('researchEmpty').hidden=true;$('researchTechnical').hidden=false;$('researchBond').hidden=true;
  const lastBar=r.bars?.at(-1),fresh=lastBar?.time?new Date(lastBar.time*1000).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
  $('rType').textContent=r.type.toUpperCase();$('rSymbol').textContent=r.symbol;$('rSource').textContent=`${r.source} · ${r.tf} · última vela ${fresh}`;$('rPrice').textContent=fmt(r.price);$('rTf').textContent=r.tf;
  const ds=$('rState');ds.className='decision '+r.opp.kind;ds.textContent=r.opp.label;$('rScore').textContent=`${Math.round(r.plan?.score||0)}/100`;
  $('rEntry').textContent=Number.isFinite(r.plan?.entryLow)?`${fmt(r.plan.entryLow)} – ${fmt(r.plan.entryHigh)}`:'—';$('rTrigger').textContent=fmt(r.plan?.trigger);$('rStop').textContent=fmt(r.plan?.stop);$('rTp1').textContent=fmt(r.plan?.tp1);$('rTp2').textContent=fmt(r.plan?.tp2);$('rRr').textContent=Number.isFinite(r.plan?.rr1)?`1:${r.plan.rr1.toFixed(2)}`:'—';
  $('rAction').textContent=[r.opp?.reason,r.plan?.action].filter(Boolean).join(' ');$('rWhy').innerHTML=[`Superior: ${r.opp?.higher||'—'} · Macro: ${r.opp?.macro||'—'}`,...(r.plan?.why||[])].map(x=>`<li>${esc(x)}</li>`).join('');
  $('rStructure').textContent=`${r.a.structure} · Op ${mtfLabel(r.a)} · Sup ${mtfLabel(r.higher)} · Macro ${mtfLabel(r.macro)}`;$('rEma').textContent=r.a.emaState;$('rMacd').textContent=r.a.macdState;$('rVolume').textContent=Number.isFinite(r.a.volumeRatio)?`${r.a.volumeRatio.toFixed(2)}x`:'—';
  syncWatchButton(r);drawSpark(r);
}
function renderBond(b){
  $('researchEmpty').hidden=true;$('researchTechnical').hidden=true;$('researchBond').hidden=false;
  $('bSymbol').textContent=b.symbol;$('bPrice').textContent=fmt(b.price);$('bTir').textContent=Number.isFinite(b.tir)?fmt(b.tir,2)+'%':'—';$('bParity').textContent=Number.isFinite(b.paridad)?fmt(b.paridad,1)+'%':'—';$('bDuration').textContent=Number.isFinite(b.duration)?fmt(b.duration,2)+' a':'—';$('bMaturity').textContent=b.maturity||'—';
  $('bRisk').textContent=Number.isFinite(n(state.risk?.value))?`${Math.round(n(state.risk.value))} pb`:'—';
  const parts=[];if(Number.isFinite(b.tir))parts.push(`TIR ${fmt(b.tir,2)}%`);if(Number.isFinite(b.paridad))parts.push(`paridad ${fmt(b.paridad,1)}%`);if(Number.isFinite(b.duration))parts.push(`duration ${fmt(b.duration,2)} años`);
  $('bRead').textContent=(parts.length?parts.join(' · ')+'. ':'')+'Usalo como comparación relativa dentro de la curva, no como señal aislada de compra.';
  syncWatchButton(b);
}
function drawSpark(r){
  const c=$('spark'),ctx=c.getContext('2d'),w=c.width,h=c.height,vals=r.bars.slice(-120).map(x=>x.close);ctx.clearRect(0,0,w,h);
  if(vals.length<2)return;const lo=Math.min(...vals),hi=Math.max(...vals),range=hi-lo||1,pad=12;
  ctx.strokeStyle='#29404d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
  ctx.strokeStyle='#80b9dc';ctx.lineWidth=2;ctx.beginPath();
  vals.forEach((v,i)=>{const x=pad+i*(w-2*pad)/(vals.length-1),y=h-pad-(v-lo)/range*(h-2*pad);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
}
async function directSearch(){
  const symbol=$('symbolSearch').value.trim().toUpperCase(),type=$('symbolType').value;if(!symbol)return;
  if(type==='bond'){openResult(symbol,'bond');return}
  $('researchEmpty').hidden=false;$('researchEmpty').innerHTML=`<span>ANÁLISIS</span><h2>${esc(symbol)}</h2><p>Cargando datos…</p>`;
  openResult(symbol,type);
}

document.querySelectorAll('.market-tab').forEach(b=>b.addEventListener('click',()=>loadMarket(b.dataset.market)));
$('refreshBtn').addEventListener('click',()=>loadMarket(state.market));$('todayRefreshBtn').addEventListener('click',()=>refreshToday(true));$('stateFilter').addEventListener('change',renderRows);$('scoreFilter').addEventListener('input',renderRows);
$('searchBtn').addEventListener('click',directSearch);$('symbolSearch').addEventListener('keydown',e=>{if(e.key==='Enter')directSearch()});
$('watchBtn').addEventListener('click',()=>state.selected&&toggleWatch(state.selected));$('bondWatchBtn').addEventListener('click',()=>state.selected&&toggleWatch(state.selected));

await loadContext();
loadLegacyConfig();
await refreshToday(true);
