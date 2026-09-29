import {analyzeSeries,computeTradePlan,opportunityState} from './engine.js';

const $=id=>document.getElementById(id);
const state={market:'cedear',rows:[],selected:null,bonds:[],risk:null,watch:loadWatch(),running:false};
const WATCH_KEY='radar_workspace_watch_v1';
const MARKET_META={
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

async function loadContext(){
  const [risk,core,health]=await Promise.all([
    json('/api/dashboard/risk').catch(()=>null),
    json('/api/dashboard/core').catch(()=>null),
    json('/api/health/deep',90000).catch(()=>null)
  ]);
  state.risk=risk;
  $('mRisk').textContent=Number.isFinite(n(risk?.value))?`${Math.round(n(risk.value))} pb`:'—';
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
async function fetchBars(item){
  if(item.type==='crypto'){
    const j=await json(`/api/binance?symbol=${encodeURIComponent(item.symbol)}&interval=1h`);
    if(!Array.isArray(j))throw new Error('Binance sin histórico');
    return{bars:j.map(x=>({time:Math.floor(n(x[0])/1000),open:n(x[1]),high:n(x[2]),low:n(x[3]),close:n(x[4]),volume:n(x[5])||0})).filter(b=>[b.open,b.high,b.low,b.close].every(Number.isFinite)),source:'Binance',tf:'1H'};
  }
  if(item.type==='stock'){
    return{bars:parseYahoo(await json(`/api/yahoo?symbol=${encodeURIComponent(item.symbol)}&interval=1d&range=2y`)),source:'Yahoo Finance',tf:'1D'};
  }
  try{
    return{bars:parseByma(await json(`/api/byma/history?symbol=${encodeURIComponent(item.symbol)}&days=7300`)),source:'Open BYMADATA',tf:'1D'};
  }catch(e){
    return{bars:parseYahoo(await json(`/api/yahoo?symbol=${encodeURIComponent(item.symbol+'.BA')}&interval=1d&range=5y&quiet=1`)),source:'Yahoo .BA fallback',tf:'1D'};
  }
}
async function analyzeItem(item){
  const pack=await fetchBars(item),a=analyzeSeries(pack.bars,'short'),plan=computeTradePlan(a),opp=opportunityState(a,plan);
  return{...item,bars:pack.bars,source:pack.source,tf:pack.tf,a,plan,opp,price:a.c};
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
      <span><b>${esc(r.symbol)}</b><small>${esc(r.type)} · ${esc(r.tf)}</small></span>
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
  if(state.running)return;state.running=true;state.market=market;
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
  $('rAction').textContent=r.plan?.action||'Sin acción técnica activa.';$('rWhy').innerHTML=(r.plan?.why||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  $('rStructure').textContent=r.a.structure;$('rEma').textContent=r.a.emaState;$('rMacd').textContent=r.a.macdState;$('rVolume').textContent=Number.isFinite(r.a.volumeRatio)?`${r.a.volumeRatio.toFixed(2)}x`:'—';
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
$('refreshBtn').addEventListener('click',()=>loadMarket(state.market));$('stateFilter').addEventListener('change',renderRows);$('scoreFilter').addEventListener('input',renderRows);
$('searchBtn').addEventListener('click',directSearch);$('symbolSearch').addEventListener('keydown',e=>{if(e.key==='Enter')directSearch()});
$('watchBtn').addEventListener('click',()=>state.selected&&toggleWatch(state.selected));$('bondWatchBtn').addEventListener('click',()=>state.selected&&toggleWatch(state.selected));

await loadContext();
await loadMarket('cedear');
