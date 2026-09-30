/* Radar Técnico G2 · Daily Radar
   Immediate value on open: portfolio alerts, market changes and a short actionable shortlist. */
(()=>{
'use strict';

const VERSION='1.0.0';
const SNAPSHOT_KEY='radar_daily_snapshot_v1';
const CORE_UNIVERSE=[
  {symbol:'BTCUSDT',type:'crypto',label:'Bitcoin'},
  {symbol:'ETHUSDT',type:'crypto',label:'Ethereum'},
  {symbol:'SOLUSDT',type:'crypto',label:'Solana'},
  {symbol:'GGAL',type:'argstock',label:'Grupo Galicia'},
  {symbol:'YPFD',type:'argstock',label:'YPF'},
  {symbol:'PAMP',type:'argstock',label:'Pampa Energía'},
  {symbol:'AAPL',type:'cedear',label:'Apple CEDEAR'},
  {symbol:'NVDA',type:'cedear',label:'NVIDIA CEDEAR'},
  {symbol:'MELI',type:'cedear',label:'MercadoLibre CEDEAR'},
  {symbol:'SPY',type:'stock',label:'S&P 500'},
  {symbol:'QQQ',type:'stock',label:'Nasdaq 100'}
];
const RF_CORE=['AE38','AL30','GD30'];

const state={running:false,lastRun:0,results:[],rf:[],errors:[],changes:[],portfolio:[]};

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const compact=(s,n=170)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trim()+'…':s};

function mount(){
  if($('dailyRadarPanel')) return $('dailyRadarPanel');
  const hero=$('productHomeHero'),dashboard=$('dashboardView');
  if(!hero||!dashboard) return null;
  const panel=document.createElement('section');
  panel.id='dailyRadarPanel';
  panel.className='daily-radar-panel';
  panel.innerHTML=`
    <div class="daily-radar-head">
      <div>
        <span class="product-kicker">RADAR DE HOY</span>
        <h2>Lo que cambió y merece atención</h2>
        <p id="dailyRadarSubtitle">Radar revisa automáticamente activos líquidos, cartera y renta fija. No inventa señales para llenar la pantalla.</p>
      </div>
      <div class="daily-radar-actions">
        <span id="dailyRadarWhen" class="daily-radar-when">Sin ejecutar</span>
        <button id="dailyRadarRefresh" type="button" class="secondary-action">Actualizar ahora</button>
      </div>
    </div>
    <div class="daily-radar-kpis">
      <div><small>ATENCIÓN AHORA</small><b id="dailyRadarAttention">—</b><span>Señales o riesgos concretos</span></div>
      <div><small>CAMBIOS</small><b id="dailyRadarChanges">—</b><span>Desde la última ejecución</span></div>
      <div><small>CARTERA A REVISAR</small><b id="dailyRadarPortfolio">—</b><span>Salida, reducción o vigilancia</span></div>
      <div><small>COBERTURA</small><b id="dailyRadarCoverage">—</b><span>Activos con datos válidos</span></div>
    </div>
    <div id="dailyRadarStatus" class="daily-radar-status">Preparando lectura automática…</div>
    <div class="daily-radar-grid">
      <div class="daily-radar-main">
        <div class="daily-radar-section-head"><h3>Prioridades</h3><span>Máximo 5</span></div>
        <div id="dailyRadarList" class="daily-radar-list"><div class="daily-radar-empty">Analizando…</div></div>
      </div>
      <div class="daily-radar-side">
        <div class="daily-radar-section-head"><h3>Renta fija</h3><span>Lectura separada</span></div>
        <div id="dailyRadarRf" class="daily-radar-list compact"><div class="daily-radar-empty">Consultando soberanos…</div></div>
        <div class="daily-radar-section-head portfolio-head"><h3>Cartera</h3><span>Qué requiere acción</span></div>
        <div id="dailyRadarPortfolioList" class="daily-radar-list compact"><div class="daily-radar-empty">Sin revisar todavía.</div></div>
      </div>
    </div>
  `;
  hero.insertAdjacentElement('afterend',panel);
  $('dailyRadarRefresh')?.addEventListener('click',()=>run(true));
  return panel;
}

function rank(r){
  const kind=r?.status?.kind;
  const base=kind==='buy'?100:kind==='sell'?96:kind==='near'?82:kind==='wait'?45:0;
  const score=Number(r?.status?.oppScore??r?.plan?.score??0);
  return base+Math.min(30,Math.max(0,score))/10;
}

function snapshotFrom(results,rf){
  const out={at:Date.now(),items:{}};
  for(const r of results){
    const k=`${r.item?.type}|${r.item?.symbol}`;
    out.items[k]={kind:r.status?.kind||'none',score:Number(r.status?.oppScore??r.plan?.score??0)||0,price:Number(r.price)||null};
  }
  for(const r of rf){
    const k=`rf|${r.item?.symbol}`;
    out.items[k]={kind:r.status?.kind||'none',score:Number(r.rfScore??r.score??0)||0,price:Number(r.price)||null};
  }
  return out;
}

function loadSnapshot(){
  try{return JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'null')}catch{return null}
}
function saveSnapshot(x){try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(x))}catch{}}

function computeChanges(prev,next){
  const changes=[];
  if(!prev?.items) return changes;
  for(const [k,v] of Object.entries(next.items||{})){
    const p=prev.items[k];if(!p)continue;
    if(p.kind!==v.kind){
      changes.push({key:k,type:'state',from:p.kind,to:v.kind});
      continue;
    }
    if(Number.isFinite(v.score)&&Number.isFinite(p.score)&&Math.abs(v.score-p.score)>=10){
      changes.push({key:k,type:'score',from:p.score,to:v.score});
      continue;
    }
    if(Number.isFinite(v.price)&&Number.isFinite(p.price)&&p.price>0){
      const pct=(v.price/p.price-1)*100;
      if(Math.abs(pct)>=3) changes.push({key:k,type:'price',pct});
    }
  }
  return changes;
}

function portfolioRows(){
  const rows=[];
  const config=window.RadarState?.config?.watchlist||window.state?.config?.watchlist||[];
  const results=window.RadarState?.watchResults||window.state?.watchResults||{};
  for(let i=0;i<config.length;i++){
    const item=config[i];if(!item?.inPortfolio)continue;
    try{
      const key=typeof window.watchKey==='function'?window.watchKey(item):null;
      const res=key?results[key]:null;
      const d=typeof window.portfolioDecision==='function'?window.portfolioDecision(item,res):null;
      if(!d||!['exit','reduce','watch'].includes(d.key))continue;
      rows.push({i,item,d});
    }catch{}
  }
  return rows.sort((a,b)=>({exit:0,reduce:1,watch:2}[a.d.key]-({exit:0,reduce:1,watch:2}[b.d.key])));
}

function opportunityCard(r){
  const kind=r.status?.kind||'none';
  const score=Math.round(Number(r.status?.oppScore??r.plan?.score??0)||0);
  const symbol=esc(r.item?.symbol||'—');
  const type=esc(r.item?.type||'');
  const label=esc(r.status?.label||kind.toUpperCase());
  const why=esc(compact(r.why,185));
  const fallback=r.providerFallback?'<span class="daily-radar-source warn">fallback</span>':'';
  return `<button class="daily-radar-item ${kind}" data-daily-symbol="${symbol}" data-daily-type="${type}" data-daily-key="${esc(r.key||'short')}">
    <span class="daily-radar-state">${label}</span>
    <span class="daily-radar-asset"><b>${symbol}</b><small>${type}</small></span>
    <span class="daily-radar-reason">${why}</span>
    <span class="daily-radar-score"><small>Score</small><b>${score}</b>${fallback}</span>
  </button>`;
}

function rfCard(r){
  const score=Math.round(Number(r.rfScore??r.score??0)||0);
  const symbol=esc(r.item?.symbol||'—');
  const why=esc(compact(r.why,135));
  const label=esc(r.status?.label||'RF');
  return `<button class="daily-radar-item rf" data-daily-bond="${symbol}">
    <span class="daily-radar-state">${label}</span>
    <span class="daily-radar-asset"><b>${symbol}</b><small>Soberano</small></span>
    <span class="daily-radar-reason">${why}</span>
    <span class="daily-radar-score"><small>Score RF</small><b>${score}</b></span>
  </button>`;
}

function portfolioCard(x){
  return `<button class="daily-radar-item portfolio ${esc(x.d.key)}" data-daily-portfolio="${x.i}">
    <span class="daily-radar-state">${esc(x.d.label)}</span>
    <span class="daily-radar-asset"><b>${esc(x.item.symbol)}</b><small>${esc(x.item.type)}</small></span>
    <span class="daily-radar-reason">${esc(compact(x.d.why,135))}</span>
  </button>`;
}

function bindItems(){
  document.querySelectorAll('[data-daily-symbol]').forEach(el=>el.addEventListener('click',()=>{
    const {dailySymbol:s,dailyType:t,dailyKey:k}=el.dataset;
    if(typeof window.openScanResult==='function') window.openScanResult(s,t,k||'short');
  }));
  document.querySelectorAll('[data-daily-bond]').forEach(el=>el.addEventListener('click',()=>{
    if(typeof window.loadBondAnalysis==='function') window.loadBondAnalysis(el.dataset.dailyBond,'argbond');
  }));
  document.querySelectorAll('[data-daily-portfolio]').forEach(el=>el.addEventListener('click',()=>{
    if(typeof window.openWatchItem==='function') window.openWatchItem(Number(el.dataset.dailyPortfolio));
  }));
}

function render(){
  mount();
  const valid=state.results.filter(r=>!r.error);
  const actionable=valid.filter(r=>['buy','sell','near'].includes(r.status?.kind)).sort((a,b)=>rank(b)-rank(a)).slice(0,5);
  const portfolio=state.portfolio;

  if($('dailyRadarAttention')) $('dailyRadarAttention').textContent=String(actionable.length+portfolio.filter(x=>['exit','reduce'].includes(x.d.key)).length);
  if($('dailyRadarChanges')) $('dailyRadarChanges').textContent=String(state.changes.length);
  if($('dailyRadarPortfolio')) $('dailyRadarPortfolio').textContent=String(portfolio.length);
  if($('dailyRadarCoverage')) $('dailyRadarCoverage').textContent=`${valid.length}/${CORE_UNIVERSE.length}`;
  if($('dailyRadarWhen')) $('dailyRadarWhen').textContent=state.lastRun?new Date(state.lastRun).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):'Sin ejecutar';

  if($('dailyRadarList')){
    $('dailyRadarList').innerHTML=actionable.length
      ? actionable.map(opportunityCard).join('')
      : '<div class="daily-radar-empty strong">No hay oportunidades suficientemente claras en el universo automático. Eso también es una señal útil.</div>';
  }
  if($('dailyRadarRf')){
    const rows=[...state.rf].sort((a,b)=>(Number(b.rfScore??b.score)||0)-(Number(a.rfScore??a.score)||0)).slice(0,2);
    $('dailyRadarRf').innerHTML=rows.length?rows.map(rfCard).join(''):'<div class="daily-radar-empty">Renta fija sin lectura válida por ahora.</div>';
  }
  if($('dailyRadarPortfolioList')){
    $('dailyRadarPortfolioList').innerHTML=portfolio.length?portfolio.slice(0,3).map(portfolioCard).join(''):'<div class="daily-radar-empty">No hay posiciones que requieran atención inmediata.</div>';
  }
  if($('dailyRadarStatus')){
    const errors=state.errors.length;
    const fallback=state.results.filter(x=>x.providerFallback).length;
    $('dailyRadarStatus').textContent=`${valid.length} de ${CORE_UNIVERSE.length} activos con datos · ${actionable.length} hallazgos · ${state.changes.length} cambios desde la última ejecución${fallback?` · ${fallback} con fuente alternativa`:''}${errors?` · ${errors} fallos`:''}.`;
  }
  bindItems();
}

async function scanCore(){
  const results=[],errors=[];
  let cursor=0;
  const workers=Array.from({length:3},async()=>{
    while(true){
      const i=cursor++;if(i>=CORE_UNIVERSE.length)return;
      const item=CORE_UNIVERSE[i];
      try{
        const r=await window.scanOne(item,'short');
        results.push(r);
      }catch(e){
        errors.push({item,error:String(e?.message||e)});
        results.push({item,status:{kind:'none',label:'SIN DATOS',oppScore:0},error:String(e?.message||e)});
      }
    }
  });
  await Promise.all(workers);
  return{results,errors};
}

async function scanRf(){
  if(typeof window.prepareFixedIncomeAnalytics!=='function'||typeof window.scanFixedIncomeOne!=='function') return [];
  try{
    const res=await fetch('/api/byma/fixed-income?kind=sovereign&currency=ALL&liquid=0',{cache:'no-store'});
    if(!res.ok) throw new Error('RF HTTP '+res.status);
    const j=await res.json();
    const items=(j.items||[]).filter(x=>RF_CORE.includes(String(x.symbol||'').toUpperCase())).map(x=>({symbol:String(x.symbol).toUpperCase(),type:'argbond',panel:x}));
    if(!items.length) return [];
    await window.prepareFixedIncomeAnalytics(items);
    return items.map(x=>window.scanFixedIncomeOne(x));
  }catch(e){
    state.errors.push({item:{symbol:'RF'},error:String(e?.message||e)});
    return [];
  }
}

async function run(force=false){
  mount();
  if(state.running) return;
  if(!force&&state.lastRun&&Date.now()-state.lastRun<5*60*1000) return;
  state.running=true;state.errors=[];
  if($('dailyRadarStatus')) $('dailyRadarStatus').textContent='Actualizando cartera, mercado y oportunidades…';
  if($('dailyRadarRefresh')) $('dailyRadarRefresh').disabled=true;

  try{
    const cfg=window.RadarState?.config?.watchlist||window.state?.config?.watchlist||[];
    if(cfg.some(x=>x?.inPortfolio)&&typeof window.refreshWatchlist==='function'){
      try{await window.refreshWatchlist(true)}catch(e){state.errors.push({item:{symbol:'Cartera'},error:String(e?.message||e)})}
    }
    state.portfolio=portfolioRows();

    const prev=loadSnapshot();
    const core=await scanCore();
    state.results=core.results;state.errors.push(...core.errors);
    state.rf=await scanRf();

    const next=snapshotFrom(state.results,state.rf);
    state.changes=computeChanges(prev,next);
    saveSnapshot(next);
    state.lastRun=Date.now();
    render();
  }catch(e){
    state.errors.push({item:{symbol:'Radar'},error:String(e?.message||e)});
    if($('dailyRadarStatus')) $('dailyRadarStatus').textContent='No se pudo completar Radar de Hoy: '+String(e?.message||e);
  }finally{
    state.running=false;
    if($('dailyRadarRefresh')) $('dailyRadarRefresh').disabled=false;
  }
}

function boot(){
  mount();
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const ready=typeof window.scanOne==='function'&&(window.RadarState?.config||window.state?.config);
    if(ready||attempts>=8){
      clearInterval(timer);
      if(ready) run(false);
      else if($('dailyRadarStatus')) $('dailyRadarStatus').textContent='Radar de Hoy no pudo iniciar automáticamente. Usá “Actualizar ahora”.';
    }
  },1200);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.RadarDailyRadar=Object.freeze({version:VERSION,state,run,render});
})();