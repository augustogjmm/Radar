/* Radar Técnico · Watchlist Workstation
   Isolated full-screen watchlist. Uses live data already loaded by Global Command Center. */
(()=>{
'use strict';

const $=id=>document.getElementById(id);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:NaN};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=(v,d=2)=>Number.isFinite(num(v))?new Intl.NumberFormat('es-AR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(num(v)):'s/d';
const pct=v=>Number.isFinite(num(v))?`${num(v)>=0?'+':''}${fmt(v,2)}%`:'—';
const global=()=>window.RadarGlobalCommandCenter;
const state=()=>global()?.state;
const customKey='radar.watchlist.custom.v1';

let filter='all',search='',selected='sp500',period='1D',editMode=false;
let custom=[];
const seriesCache=new Map();

const BASE=[
  {key:'sp500',symbol:'^GSPC',name:'S&P 500',ticker:'SPX',category:'index',region:'EE.UU.',flag:'US',dec:1},
  {key:'nasdaq',symbol:'^IXIC',name:'NASDAQ',ticker:'IXIC',category:'index',region:'EE.UU.',flag:'US',dec:1},
  {key:'dow',symbol:'^DJI',name:'DOW JONES',ticker:'DJI',category:'index',region:'EE.UU.',flag:'US',dec:1},
  {key:'dax',symbol:'^GDAXI',name:'DAX',ticker:'DAX',category:'index',region:'Europa',flag:'DE',dec:1},
  {key:'nikkei',symbol:'^N225',name:'NIKKEI',ticker:'N225',category:'index',region:'Asia',flag:'JP',dec:1},
  {key:'hangseng',symbol:'^HSI',name:'HANG SENG',ticker:'HSI',category:'index',region:'Asia',flag:'HK',dec:1},
  {key:'merval',symbol:'^MERV',name:'MERVAL',ticker:'IMV',category:'index',region:'LatAm',flag:'AR',dec:0},
  {key:'ggal',symbol:'GGAL',name:'GGAL',ticker:'ADR',category:'equity',region:'EE.UU.',flag:'AR',dec:2},
  {key:'ypf',symbol:'YPF',name:'YPF',ticker:'ADR',category:'equity',region:'EE.UU.',flag:'AR',dec:2},
  {key:'spy',symbol:'SPY',name:'SPY',ticker:'SPY',category:'etf',region:'EE.UU.',flag:'US',dec:2},
  {key:'vix',symbol:'^VIX',name:'VIX',ticker:'VIX',category:'macro',region:'Global',flag:'US',dec:1},
  {key:'tnx',symbol:'^TNX',name:'US 10Y',ticker:'US10Y',category:'bond',region:'Global',flag:'US',dec:2,unit:'%'},
  {key:'dxy',symbol:'DX-Y.NYB',name:'DXY',ticker:'DXY',category:'fx',region:'Global',flag:'US',dec:2}
];

function loadCustom(){
  try{custom=JSON.parse(localStorage.getItem(customKey)||'[]').filter(x=>x&&x.symbol&&x.name)}catch{custom=[]}
}
function specs(){
  return [...BASE,...custom.map((x,i)=>({...x,key:x.key||`custom-${i}-${x.symbol}`,category:x.category||'equity',region:x.region||'Global',flag:x.flag||'GL',dec:Number.isFinite(x.dec)?x.dec:2,custom:true}))];
}
function market(spec){
  return state()?.markets?.get?.(spec.symbol)||null;
}
function barsOf(item){return (item?.bars||[]).map(x=>({time:num(x.time),close:num(x.close),volume:num(x.volume)})).filter(x=>Number.isFinite(x.close))}
function dayChange(item){
  if(Number.isFinite(num(item?.changePct)))return num(item.changePct);
  const b=barsOf(item);if(b.length<2)return NaN;
  const a=b.at(-2).close,z=b.at(-1).close;return a?((z/a)-1)*100:NaN;
}
function periodPerf(item,n=20){
  const b=barsOf(item);if(b.length<2)return NaN;
  const z=b.at(-1).close,a=b[Math.max(0,b.length-1-n)].close;return a?((z/a)-1)*100:NaN;
}
function priceText(spec,item){
  const v=num(item?.last??barsOf(item).at(-1)?.close);
  if(!Number.isFinite(v))return's/d';
  if(spec.unit==='%')return fmt(v,spec.dec)+'%';
  if(spec.category==='equity'||spec.category==='etf')return'US$ '+fmt(v,spec.dec);
  if(spec.key==='merval')return fmt(v,0);
  return fmt(v,spec.dec);
}
function levels(item){
  const c=barsOf(item).slice(-21).map(x=>x.close).filter(Number.isFinite);
  if(c.length<3)return{support:NaN,resistance:NaN};
  const hist=c.slice(0,-1);
  return{support:Math.min(...hist),resistance:Math.max(...hist)};
}
function classify(spec,item){
  const day=dayChange(item),perf=periodPerf(item,20),lv=levels(item),last=num(item?.last??barsOf(item).at(-1)?.close);
  let trend='NEUTRAL',trendCls='neutral';
  if(Number.isFinite(perf)&&perf>=2){trend='ALCISTA';trendCls='bull'}
  else if(Number.isFinite(perf)&&perf<=-2){trend='BAJISTA';trendCls='bear'}
  let setup=trend;
  if(Number.isFinite(last)&&Number.isFinite(lv.resistance)&&last>lv.resistance*1.001){setup='RUPTURA';trend='ALCISTA';trendCls='bull'}
  else if(Number.isFinite(last)&&Number.isFinite(lv.support)&&last<lv.support*.999){setup='PÉRDIDA SOPORTE';trend='BAJISTA';trendCls='bear'}
  let score=50;
  if(Number.isFinite(perf))score+=clamp(perf*3.3,-25,25);
  if(Number.isFinite(day))score+=clamp(day*4.2,-15,15);
  if(setup==='RUPTURA')score+=8;
  if(setup==='PÉRDIDA SOPORTE')score-=8;
  if(spec.key==='vix')score=100-score;
  score=clamp(Math.round(score),20,92);
  let alert='—',alertCls='none';
  if((Number.isFinite(day)&&day<=-2)||score<=35){alert='CRÍTICA';alertCls='critical'}
  else if(score>=78&&trendCls==='bull'){alert='LISTA';alertCls='ready'}
  else if((Number.isFinite(day)&&Math.abs(day)>=.8)||score<50){alert='VIGILAR';alertCls='watch'}
  let action='MANTENER',actionCls='hold';
  if(spec.category==='macro'){action=score<45?'VIGILAR':'MANTENER';actionCls=score<45?'watch':'hold'}
  else if(score>=75&&trendCls==='bull'){action='COMPRAR';actionCls='buy'}
  else if(score<=38&&trendCls==='bear'){action='VENDER';actionCls='sell'}
  else if(score<50){action='VIGILAR';actionCls='watch'}
  const comment=commentFor(spec,trendCls,setup,day);
  return{day,perf,trend,trendCls,setup,score,alert,alertCls,action,actionCls,lv,last,comment};
}
function commentFor(spec,trend,setup,day){
  if(setup==='RUPTURA')return'Ruptura confirmada; vigilar continuidad y volumen.';
  if(setup==='PÉRDIDA SOPORTE')return'Pierde soporte de corto plazo; aumenta el riesgo.';
  if(spec.key==='vix')return Number.isFinite(day)&&day<0?'La volatilidad cede y mejora el apetito por riesgo.':'Volatilidad elevada; exige mayor cautela.';
  if(spec.key==='tnx')return Number.isFinite(day)&&day<0?'Rendimientos ceden; mejora el contexto de riesgo.':'Tasas firmes; presionan valuaciones.';
  if(spec.key==='dxy')return Number.isFinite(day)&&day<0?'Dólar pierde fuerza global.':'Dólar firme; condiciona activos de riesgo.';
  if(spec.key==='ypf')return trend==='bull'?'Momentum favorable; seguir petróleo y riesgo argentino.':'Necesita recuperar momentum.';
  if(spec.key==='ggal')return trend==='bull'?'Mejora técnica; sensible a riesgo país y bancos.':'Esperar confirmación del sector financiero.';
  if(trend==='bull')return'Tendencia positiva de corto plazo.';
  if(trend==='bear')return'Presión vendedora; esperar estabilización.';
  return'Lateraliza; requiere confirmación antes de actuar.';
}
function flag(code){
  const c=String(code||'GL').toUpperCase();
  if(c==='US')return '<svg viewBox="0 0 28 18"><rect width="28" height="18" fill="#fff"/><g fill="#b22234"><rect y="0" width="28" height="2"/><rect y="4" width="28" height="2"/><rect y="8" width="28" height="2"/><rect y="12" width="28" height="2"/><rect y="16" width="28" height="2"/></g><rect width="12" height="10" fill="#3c3b6e"/></svg>';
  if(c==='AR')return '<svg viewBox="0 0 28 18"><rect width="28" height="18" fill="#74acdf"/><rect y="6" width="28" height="6" fill="#fff"/><circle cx="14" cy="9" r="2" fill="#f6b40e"/></svg>';
  if(c==='DE')return '<svg viewBox="0 0 28 18"><rect width="28" height="6"/><rect y="6" width="28" height="6" fill="#dd0000"/><rect y="12" width="28" height="6" fill="#ffce00"/></svg>';
  if(c==='JP')return '<svg viewBox="0 0 28 18"><rect width="28" height="18" fill="#fff"/><circle cx="14" cy="9" r="4.3" fill="#bc002d"/></svg>';
  if(c==='HK')return '<svg viewBox="0 0 28 18"><rect width="28" height="18" fill="#de2910"/><circle cx="14" cy="9" r="4" fill="#fff" opacity=".95"/><circle cx="14" cy="9" r="2.4" fill="#de2910"/></svg>';
  return '<svg viewBox="0 0 28 18"><rect width="28" height="18" rx="2" fill="#0b3950"/><circle cx="14" cy="9" r="5" fill="none" stroke="#36d8ff"/><path d="M5 9h18M14 2v14" stroke="#36d8ff"/></svg>';
}
function linePath(values,w=220,h=54,p=3){
  const v=values.filter(Number.isFinite);if(v.length<2)return'';
  const lo=Math.min(...v),hi=Math.max(...v),span=hi-lo||1;
  return v.map((n,i)=>{const x=p+i*(w-2*p)/(v.length-1),y=h-p-(n-lo)*(h-2*p)/span;return`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}).join(' ');
}
function spark(item,w=95,h=25){
  const v=barsOf(item).slice(-20).map(x=>x.close);if(v.length<2)return'<span class="rtw-nodata">s/d</span>';
  const d=linePath(v,w,h,2),down=v.at(-1)<v[0];
  return`<svg class="rtw-spark ${down?'down':''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="area" d="${d} L${w-2},${h-2} L2,${h-2}Z"/><path class="line" d="${d}"/></svg>`;
}
function scoreRing(n){
  const s=clamp(Math.round(n),0,100),cls=s>=70?'good':s>=50?'mid':'bad';
  return`<span class="rtw-score ${cls}" style="--score:${s}"><b>${s}</b></span>`;
}
function allRows(){return specs().map(spec=>({spec,item:market(spec),...classify(spec,market(spec))}))}
function visibleRows(){
  let rows=allRows();
  if(filter!=='all')rows=rows.filter(r=>r.spec.category===filter);
  if(search){const z=search.toLowerCase();rows=rows.filter(r=>[r.spec.name,r.spec.ticker,r.spec.symbol,r.spec.region].some(x=>String(x).toLowerCase().includes(z)))}
  return rows;
}
function categoryLabel(c){return({index:'Índices',equity:'Acciones',etf:'ETFs',macro:'Macro',bond:'Bonos',fx:'Divisas'})[c]||c}
function setupClass(x){return x==='ALCISTA'||x==='RUPTURA'?'good':x.includes('BAJISTA')||x.includes('PÉRDIDA')?'bad':'neutral'}
function getSelectedRow(){
  const rows=allRows();return rows.find(r=>r.spec.key===selected)||rows[0]||null;
}
function regionCounts(rows){
  const m=new Map();for(const r of rows)m.set(r.spec.region,(m.get(r.spec.region)||0)+1);return [...m.entries()].sort((a,b)=>b[1]-a[1]);
}
function kpis(rows){
  const valid=rows.filter(r=>Number.isFinite(r.last)),bull=valid.filter(r=>r.trendCls==='bull').length,bear=valid.filter(r=>r.trendCls==='bear').length,neutral=Math.max(0,valid.length-bull-bear);
  const opp=valid.filter(r=>r.score>=75&&r.trendCls==='bull').length;
  const critical=valid.filter(r=>r.alertCls==='critical').length,watch=valid.filter(r=>r.alertCls==='watch').length;
  const risk=globalRisk();
  return{valid,bull,bear,neutral,opp,critical,watch,risk};
}
function globalRisk(){
  const st=state(),v=st?.markets?.get?.('^VIX'),t=st?.markets?.get?.('^TNX'),d=st?.markets?.get?.('DX-Y.NYB');
  let s=50;
  if(Number.isFinite(num(v?.last)))s+=(num(v.last)-18)*2.1;
  const tc=dayChange(t);if(Number.isFinite(tc))s+=clamp(tc*3,-10,10);
  const dc=dayChange(d);if(Number.isFinite(dc))s+=clamp(dc*4,-7,7);
  s=clamp(s,5,95);return{score:s,label:s<34?'Bajo':s<67?'Moderado':'Alto'};
}

function mount(){
  if($('rtWatchlistWorkstation'))return;
  const el=document.createElement('section');el.id='rtWatchlistWorkstation';el.className='rtw-shell';el.hidden=true;
  el.innerHTML=`
    <header class="rtw-topbar">
      <div class="rtw-brand-official" aria-label="Radar Técnico · Mercados globales. Señales reales. Mejores decisiones."></div>
      <nav class="rtw-nav">
        <button data-rtw-nav="global">Visión Global</button>
        <button data-rtw-nav="europe">Europa</button>
        <button data-rtw-nav="northamerica">EE.UU.</button>
        <button data-rtw-nav="latam">LatAm</button>
        <button data-rtw-nav="markets">Mercados</button>
        <button data-rtw-nav="sectors">Sectores</button>
        <button class="active" data-rtw-nav="watchlist">Watchlist</button>
        <button data-rtw-nav="news">Noticias</button>
        <button data-rtw-nav="calendar">Calendario</button>
      </nav>
      <label class="rtw-search"><span>⌕</span><input id="rtwSearch" placeholder="Buscar activo, ticker o sector..." autocomplete="off"></label>
      <div class="rtw-live"><i></i>Mercado en tiempo real</div>
      <div class="rtw-clock"><b id="rtwClock">--:--:--</b><small id="rtwDate">—</small></div>
    </header>

    <section class="rtw-hero">
      <div class="rtw-title-icon">★</div>
      <div><h1>Watchlist Inteligente</h1><p>Tus activos clave, con alertas, análisis y oportunidades listas para decidir.</p></div>
    </section>

    <section id="rtwKpis" class="rtw-kpis"></section>

    <main class="rtw-main">
      <section class="rtw-panel rtw-list-panel">
        <header class="rtw-panel-head">
          <div class="rtw-panel-title"><span>▤</span><h2>Mi Watchlist</h2></div>
          <div id="rtwFilters" class="rtw-filters"></div>
          <div class="rtw-actions">
            <button id="rtwAdd">＋ Añadir activo</button>
            <button id="rtwEdit">✎ Editar</button>
            <button id="rtwMore">•••</button>
          </div>
        </header>
        <div class="rtw-table-wrap">
          <table class="rtw-table">
            <thead><tr><th></th><th>ACTIVO / TICKER</th><th>REGIÓN</th><th>ÚLTIMO</th><th>VAR. %</th><th>TENDENCIA (1D)</th><th>SETUP</th><th>CONVICCIÓN</th><th>ALERTA</th><th>ACCIÓN SUGERIDA</th><th>COMENTARIO</th></tr></thead>
            <tbody id="rtwRows"></tbody>
          </table>
        </div>
      </section>

      <aside class="rtw-side">
        <section class="rtw-panel rtw-side-card"><header><h2>▥ Top oportunidades</h2><button data-rtw-scroll="table">Ver más →</button></header><div id="rtwTop" class="rtw-top-list"></div></section>
        <section class="rtw-panel rtw-side-card"><header><h2>♟ Alertas críticas y de seguimiento</h2><button data-rtw-scroll="alerts">Ver todas →</button></header><div id="rtwAlerts" class="rtw-alert-list"></div></section>
        <section class="rtw-panel rtw-distribution"><header><h2>▥ Distribución de la watchlist</h2></header><div id="rtwDistribution"></div></section>
      </aside>

      <section class="rtw-panel rtw-detail">
        <header class="rtw-detail-head"><div id="rtwSelectedTitle"></div><div id="rtwSelectedLast"></div><button id="rtwFullAnalysis">Ver análisis completo →</button></header>
        <div class="rtw-detail-grid">
          <div class="rtw-chart-card">
            <div id="rtwPeriods" class="rtw-periods"></div>
            <div class="rtw-big-chart"><div id="rtwYAxis" class="rtw-yaxis"></div><svg id="rtwChart" viewBox="0 0 560 150" preserveAspectRatio="none"><g class="grid"><path d="M8 25H552M8 60H552M8 95H552M8 130H552"/><path d="M100 8V142M200 8V142M300 8V142M400 8V142M500 8V142"/></g><defs><linearGradient id="rtwChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2df0a0" stop-opacity=".30"/><stop offset="100%" stop-color="#2df0a0" stop-opacity="0"/></linearGradient></defs><path id="rtwChartArea" class="area"/><path id="rtwChartLine" class="line"/></svg><div id="rtwXAxis" class="rtw-xaxis"></div></div>
          </div>
          <div class="rtw-analysis-card"><h3>▥ Análisis rápido</h3><div id="rtwQuick"></div></div>
          <div class="rtw-thesis-card"><h3>▤ Tesis y contexto</h3><p id="rtwThesis"></p></div>
        </div>
      </section>

      <section class="rtw-panel rtw-next">
        <header><h2>◎ Próxima acción</h2></header>
        <div id="rtwNextAction"></div>
      </section>
    </main>
    <div id="rtwMenu" class="rtw-menu" hidden><button id="rtwRefresh">Actualizar datos</button><button id="rtwReset">Restablecer filtros</button></div>
  `;
  document.body.appendChild(el);
  bind();
}

function bind(){
  q('[data-rtw-nav="global"]')?.addEventListener('click',()=>{close();q('[data-rt-nav="global"]')?.click()});
  for(const key of ['europe','northamerica','latam']){
    q(`[data-rtw-nav="${key}"]`)?.addEventListener('click',()=>{close();global()?.selectRegion?.(key);setTimeout(()=>$('rtRegionOpen')?.click(),90)});
  }
  q('[data-rtw-nav="markets"]')?.addEventListener('click',()=>{close();q('[data-rt-nav="markets"]')?.click()});
  q('[data-rtw-nav="sectors"]')?.addEventListener('click',()=>{close();q('[data-rt-nav="sectors"]')?.click()});
  q('[data-rtw-nav="news"]')?.addEventListener('click',()=>{close();q('[data-rt-nav="news"]')?.click()});
  q('[data-rtw-nav="calendar"]')?.addEventListener('click',()=>{close();$('calendarViewBtn')?.click()});
  $('rtwSearch')?.addEventListener('input',e=>{search=e.currentTarget.value.trim();renderTable()});
  $('rtwSearch')?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.currentTarget.value='';search='';renderTable()}});
  $('rtwAdd')?.addEventListener('click',addCustom);
  $('rtwEdit')?.addEventListener('click',()=>{editMode=!editMode;$('rtwEdit').classList.toggle('active',editMode);renderTable()});
  $('rtwMore')?.addEventListener('click',e=>{e.stopPropagation();$('rtwMenu').hidden=!$('rtwMenu').hidden});
  $('rtwRefresh')?.addEventListener('click',async()=>{ $('rtwMenu').hidden=true;await global()?.refresh?.(true);render();});
  $('rtwReset')?.addEventListener('click',()=>{filter='all';search='';$('rtwSearch').value='';$('rtwMenu').hidden=true;render()});
  $('rtwFullAnalysis')?.addEventListener('click',()=>{const r=getSelectedRow();if(!r)return;close();const input=$('symbol');if(input)input.value=r.spec.symbol;const type=$('assetType');if(type)type.value='auto';$('analyzeBtn')?.click()});
  document.addEventListener('click',e=>{if($('rtwMenu')&&!$('rtwMenu').hidden&&!e.target.closest('#rtwMenu')&&!e.target.closest('#rtwMore'))$('rtwMenu').hidden=true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('rtWatchlistWorkstation')?.hidden)close()});
}
function bindDynamic(){
  qa('[data-rtw-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.rtwFilter;render()}));
  qa('[data-rtw-key]').forEach(row=>row.addEventListener('click',e=>{
    if(e.target.closest('[data-rtw-remove]'))return;
    selected=row.dataset.rtwKey;renderTable();renderDetail();loadSeries(getSelectedRow()?.spec,period);
  }));
  qa('[data-rtw-remove]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();removeCustom(btn.dataset.rtwRemove)}));
  qa('[data-rtw-period]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.rtwPeriod;renderDetail();loadSeries(getSelectedRow()?.spec,period)}));
}

async function addCustom(){
  const symbol=prompt('Ticker de Yahoo Finance (ejemplo: MELI, QQQ, BTC-USD):','');if(!symbol)return;
  const clean=symbol.trim().toUpperCase();if(!clean)return;
  const name=(prompt('Nombre para mostrar:',clean)||clean).trim();
  try{
    const res=await fetch(`/api/yahoo-batch?symbols=${encodeURIComponent(clean)}&range=6mo&interval=1d&fresh=1&_=${Date.now()}`,{cache:'no-store'});
    const j=await res.json(),x=j?.items?.[0];
    if(!res.ok||!x?.ok)throw new Error(x?.error||'Sin datos');
    const bars=(x.bars||[]).map(b=>({time:num(b.time),close:num(b.close),volume:num(b.volume)})).filter(b=>Number.isFinite(b.close));
    state()?.markets?.set?.(clean,{ok:true,last:num(x.last),changePct:num(x.changePct),volume:num(x.volume),bars,source:x.source||j.source||'Yahoo Finance'});
    custom.push({key:'custom-'+clean,symbol:clean,name,ticker:clean,category:'equity',region:'Global',flag:'GL',dec:2,custom:true});
    localStorage.setItem(customKey,JSON.stringify(custom));selected='custom-'+clean;render();
  }catch(err){window.radarNotify?.('No pude agregar '+clean+': '+(err?.message||err),'warn')||alert('No pude agregar '+clean)}
}
function removeCustom(key){
  custom=custom.filter(x=>(x.key||('custom-'+x.symbol))!==key);
  localStorage.setItem(customKey,JSON.stringify(custom));
  if(selected===key)selected='sp500';render();
}

function render(){
  if(!$('rtWatchlistWorkstation')||$('rtWatchlistWorkstation').hidden)return;
  renderKpis();renderFilters();renderTable();renderSide();renderDetail();bindDynamic();tick();
}
function renderKpis(){
  const rows=allRows(),k=kpis(rows),total=k.valid.length||rows.length;
  const bullPct=total?Math.round(k.bull/total*100):0,neutralPct=total?Math.round(k.neutral/total*100):0,bearPct=Math.max(0,100-bullPct-neutralPct);
  $('rtwKpis').innerHTML=`
    <article class="rtw-kpi cyan"><div class="rtw-kpi-icon">◎</div><div><small>Activos monitoreados</small><strong>${total}</strong><span>${custom.length?custom.length+' personalizados':'Cobertura multi-mercado'}</span></div><div class="rtw-mini-bars">${[35,52,44,68,58,82,70].map(x=>`<i style="height:${x}%"></i>`).join('')}</div></article>
    <article class="rtw-kpi green"><div class="rtw-kpi-icon">▥</div><div><small>Oportunidades listas</small><strong>${k.opp}</strong><span>${k.bull} alcistas · ${k.neutral} neutrales</span></div><div class="rtw-kpi-line">${spark(rows.find(r=>r.spec.key==='sp500')?.item)}</div></article>
    <article class="rtw-kpi red"><div class="rtw-kpi-icon">♟</div><div><small>Alertas activas</small><strong>${k.critical+k.watch}</strong><span>${k.critical} críticas · ${k.watch} seguimiento</span></div><div class="rtw-kpi-line">${spark(rows.find(r=>r.spec.key==='hangseng')?.item)}</div></article>
    <article class="rtw-kpi yellow"><div class="rtw-kpi-icon">◴</div><div><small>Riesgo promedio</small><strong>${k.risk.label}</strong><span>Índice de riesgo de la watchlist</span></div><div class="rtw-risk-mini"><i style="left:${k.risk.score}%"></i></div></article>
    <article class="rtw-kpi cyan"><div class="rtw-kpi-icon">◔</div><div><small>Sesgo global</small><strong>${k.bull>k.bear?'Alcista':k.bear>k.bull?'Bajista':'Neutral'}</strong><span>${bullPct}% alcistas · ${neutralPct}% neutros · ${bearPct}% bajistas</span></div><div class="rtw-bias-bars">${[bullPct,neutralPct,bearPct].map(x=>`<i style="height:${Math.max(12,x)}%"></i>`).join('')}</div></article>`;
}
function renderFilters(){
  const rows=allRows(),cats=['all','index','equity','etf','macro','bond','fx'];
  $('rtwFilters').innerHTML=cats.map(c=>{
    const n=c==='all'?rows.length:rows.filter(r=>r.spec.category===c).length;
    return`<button data-rtw-filter="${c}" class="${filter===c?'active':''}">${c==='all'?'Todos':categoryLabel(c)} (${n})</button>`;
  }).join('');
}
function renderTable(){
  const rows=visibleRows();
  $('rtwRows').innerHTML=rows.map(r=>{
    const s=r.spec,selectedCls=s.key===selected?'selected':'';
    return`<tr class="${selectedCls}" data-rtw-key="${esc(s.key)}">
      <td class="star">★</td>
      <td><div class="rtw-asset"><i>${flag(s.flag)}</i><b>${esc(s.name)}</b><small>${esc(s.ticker)}</small></div></td>
      <td>${esc(s.region)}</td>
      <td class="num">${priceText(s,r.item)}</td>
      <td class="num ${Number.isFinite(r.day)?r.day>0?'up':r.day<0?'down':'flat':'flat'}">${pct(r.day)}</td>
      <td class="spark">${spark(r.item)}</td>
      <td><span class="rtw-badge ${setupClass(r.setup)}">${esc(r.setup)}</span></td>
      <td>${scoreRing(r.score)}</td>
      <td><span class="rtw-alert ${r.alertCls}">${r.alert==='—'?'—':'● '+r.alert}</span></td>
      <td><span class="rtw-action ${r.actionCls}">${r.action}</span></td>
      <td class="comment">${esc(r.comment)}${editMode&&s.custom?` <button data-rtw-remove="${esc(s.key)}" class="rtw-remove">×</button>`:''}</td>
    </tr>`;
  }).join('')||'<tr><td colspan="11" class="rtw-empty">No hay activos que coincidan con el filtro.</td></tr>';
  qa('[data-rtw-key]').forEach(row=>row.addEventListener('click',e=>{if(e.target.closest('[data-rtw-remove]'))return;selected=row.dataset.rtwKey;renderTable();renderDetail();loadSeries(getSelectedRow()?.spec,period)}));
  qa('[data-rtw-remove]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();removeCustom(btn.dataset.rtwRemove)}));
}
function renderSide(){
  const rows=allRows().filter(r=>Number.isFinite(r.last));
  const top=[...rows].filter(r=>r.trendCls==='bull').sort((a,b)=>b.score-a.score).slice(0,5);
  $('rtwTop').innerHTML=top.map((r,i)=>`<button data-rtw-pick="${esc(r.spec.key)}"><span class="rank">${i+1}</span><i>${flag(r.spec.flag)}</i><b>${esc(r.spec.name)} <small>${esc(r.spec.ticker)}</small></b><strong class="up">${pct(r.day)}</strong><em>${r.trend}</em><span>Score ${r.score}</span><small class="why">${esc(r.comment)}</small></button>`).join('')||'<div class="rtw-empty-side">Sin oportunidades confirmadas.</div>';
  const alerts=[...rows].filter(r=>r.alertCls==='critical'||r.alertCls==='watch').sort((a,b)=>(a.alertCls==='critical'?-1:1)-(b.alertCls==='critical'?-1:1)||a.score-b.score).slice(0,4);
  $('rtwAlerts').innerHTML=alerts.map(r=>`<button data-rtw-pick="${esc(r.spec.key)}"><span class="dot ${r.alertCls}"></span><i>${flag(r.spec.flag)}</i><b>${esc(r.spec.name)}</b><strong class="${r.day<0?'down':'up'}">${pct(r.day)}</strong><em class="${r.alertCls}">${r.alert}</em><small>${esc(r.comment)}</small></button>`).join('')||'<div class="rtw-empty-side">Sin alertas relevantes.</div>';
  qa('[data-rtw-pick]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.rtwPick;renderTable();renderDetail();loadSeries(getSelectedRow()?.spec,period)}));

  const k=kpis(rows),total=Math.max(1,k.valid.length),bp=Math.round(k.bull/total*100),np=Math.round(k.neutral/total*100),rp=Math.max(0,100-bp-np),regions=regionCounts(rows),max=Math.max(1,...regions.map(x=>x[1]));
  $('rtwDistribution').innerHTML=`<div class="rtw-dist-grid"><div class="rtw-donut-wrap"><div class="rtw-donut" style="--bull:${bp}%;--neutral:${bp+np}%"><b>${rows.length}</b><small>activos</small></div><div class="rtw-dist-legend"><span><i class="bull"></i>Alcistas <b>${k.bull}</b><em>${bp}%</em></span><span><i class="neutral"></i>Neutrales <b>${k.neutral}</b><em>${np}%</em></span><span><i class="bear"></i>Bajistas <b>${k.bear}</b><em>${rp}%</em></span></div></div><div class="rtw-region-bars"><b>Por región</b>${regions.map(([name,n])=>`<span><small>${esc(name)}</small><i><em style="width:${Math.round(n/max*100)}%"></em></i><strong>${n}</strong></span>`).join('')}</div></div>`;
}
function renderDetail(){
  const r=getSelectedRow();if(!r)return;
  const s=r.spec;
  $('rtwSelectedTitle').innerHTML=`<span class="rtw-detail-flag">${flag(s.flag)}</span><h2>${esc(s.name)} <small>(${esc(s.ticker)})</small></h2><span class="rtw-star">★</span><em>${categoryLabel(s.category)}</em><em>${esc(s.region)}</em>`;
  $('rtwSelectedLast').innerHTML=`<b>${priceText(s,r.item)}</b><strong class="${r.day>0?'up':r.day<0?'down':'flat'}">${pct(r.day)}</strong>`;
  const ps=['1D','1S','1M','3M','6M','1A','5A'];$('rtwPeriods').innerHTML=ps.map(p=>`<button data-rtw-period="${p}" class="${period===p?'active':''}">${p}</button>`).join('');
  qa('[data-rtw-period]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.rtwPeriod;renderDetail();loadSeries(s,period)}));
  const lv=r.lv,dec=s.dec;
  $('rtwQuick').innerHTML=`<span>Tendencia<b class="${r.trendCls==='bull'?'up':r.trendCls==='bear'?'down':'flat'}">${r.trend}</b></span><span>Setup<b>${esc(r.setup)}</b></span><span>Soporte<b>${Number.isFinite(lv.support)?fmt(lv.support,dec):'s/d'}</b></span><span>Resistencia<b>${Number.isFinite(lv.resistance)?fmt(lv.resistance,dec):'s/d'}</b></span><span>Convicción<b>${r.score}/100</b></span>`;
  $('rtwThesis').textContent=thesis(r);
  const riskLine=Number.isFinite(lv.support)?`Riesgo: quiebre de ${fmt(lv.support,dec)}.`:'Riesgo: esperar definición de soporte.';
  const objective=Number.isFinite(lv.resistance)?`Objetivo / referencia: ${fmt(lv.resistance,dec)}.`:'Objetivo: requiere nueva referencia técnica.';
  $('rtwNextAction').innerHTML=`<strong class="${r.actionCls}">${r.action}</strong><ul><li class="ok">${actionSentence(r)}</li><li class="ok">${objective}</li><li class="risk">${riskLine}</li><li class="ok">${catalyst(s)}</li></ul>`;
  renderChart(existingSeries(s,period),s);
}
function thesis(r){
  const d=Number.isFinite(r.day)?pct(r.day):'sin variación disponible';
  if(r.trendCls==='bull')return`${r.spec.name} mantiene una estructura técnica positiva. El movimiento diario es ${d} y el score de convicción es ${r.score}/100. La lectura sigue favorable mientras respete el soporte reciente; una ruptura de resistencia refuerza la continuidad.`;
  if(r.trendCls==='bear')return`${r.spec.name} presenta presión técnica. El movimiento diario es ${d} y el score de convicción es ${r.score}/100. Conviene priorizar control de riesgo y esperar recuperación de soporte antes de asumir continuidad alcista.`;
  return`${r.spec.name} se encuentra en una zona de definición. El movimiento diario es ${d}. El sistema no detecta todavía una ventaja direccional suficiente; soporte y resistencia son las referencias para la próxima decisión.`;
}
function actionSentence(r){
  if(r.action==='COMPRAR')return'Considerar entrada sólo mientras se mantenga la estructura alcista.';
  if(r.action==='VENDER')return'Reducir exposición técnica mientras continúe la presión bajista.';
  if(r.action==='VIGILAR')return'Esperar confirmación antes de tomar una nueva posición.';
  return'Mantener mientras no invalide el soporte técnico.';
}
function catalyst(s){
  if(s.key==='tnx')return'Catalizador: expectativas de tasas y datos macro de EE.UU.';
  if(s.key==='vix')return'Catalizador: volatilidad implícita y flujo risk-on / risk-off.';
  if(s.key==='ggal'||s.key==='ypf'||s.key==='merval')return'Catalizador: riesgo país, flujo local y noticias de Argentina.';
  return'Catalizador: resultados, macro y comportamiento del mercado de referencia.';
}
function existingSeries(s,p){
  const item=market(s),all=barsOf(item);
  const n={ '1D':20,'1S':5,'1M':21,'3M':63,'6M':126,'1A':252,'5A':260 }[p]||21;
  return all.slice(-Math.min(n,all.length));
}
function renderChart(bars,s){
  const values=(bars||[]).map(x=>num(x.close)).filter(Number.isFinite),line=$('rtwChartLine'),area=$('rtwChartArea');
  if(!line||!area)return;
  if(values.length<2){line.setAttribute('d','');area.setAttribute('d','');$('rtwYAxis').innerHTML='<span>s/d</span>';$('rtwXAxis').innerHTML='<span>Sin histórico suficiente</span>';return}
  const d=linePath(values,560,150,8);line.setAttribute('d',d);area.setAttribute('d',d+' L552,142 L8,142 Z');
  const hi=Math.max(...values),lo=Math.min(...values);$('rtwYAxis').innerHTML=`<span>${fmt(hi,s.dec)}</span><span>${fmt((hi+lo)/2,s.dec)}</span><span>${fmt(lo,s.dec)}</span>`;
  const sample=[0,.2,.4,.6,.8,1].map(f=>bars[Math.min(bars.length-1,Math.round((bars.length-1)*f))]).filter(Boolean);
  $('rtwXAxis').innerHTML=sample.map(b=>`<span>${formatTime(b.time)}</span>`).join('');
}
function formatTime(t){
  if(!Number.isFinite(num(t)))return'—';
  const d=new Date(num(t)*1000);
  return period==='1D'?d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false}):d.toLocaleDateString('es-AR',{day:'2-digit',month:'short'});
}
async function loadSeries(s,p){
  if(!s)return;
  const key=s.symbol+'|'+p;
  if(seriesCache.has(key)){renderChart(seriesCache.get(key),s);return}
  const cfg={
    '1D':['5d','15m'],'1S':['1mo','1d'],'1M':['3mo','1d'],'3M':['6mo','1d'],
    '6M':['6mo','1d'],'1A':['1y','1d'],'5A':['5y','1wk']
  }[p]||['3mo','1d'];
  try{
    const res=await fetch(`/api/yahoo-batch?symbols=${encodeURIComponent(s.symbol)}&range=${cfg[0]}&interval=${cfg[1]}&fresh=0&_=${Date.now()}`,{cache:'no-store'});
    const j=await res.json(),x=j?.items?.[0];if(!res.ok||!x?.bars?.length)return;
    const bars=x.bars.map(b=>({time:num(b.time),close:num(b.close),volume:num(b.volume)})).filter(b=>Number.isFinite(b.close));
    seriesCache.set(key,bars);
    if(selected===s.key&&period===p)renderChart(bars,s);
  }catch{}
}
function tick(){
  const now=new Date();if($('rtwClock'))$('rtwClock').textContent=now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'});
  if($('rtwDate'))$('rtwDate').textContent=new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'America/Argentina/Buenos_Aires'}).format(now).replaceAll('.','');
}
function open(){
  mount();const el=$('rtWatchlistWorkstation');if(!el)return;el.hidden=false;document.body.classList.add('rtw-open');render();loadSeries(getSelectedRow()?.spec,period);tick();
  if(!state()?.markets?.size)global()?.refresh?.(false).then(()=>{render();loadSeries(getSelectedRow()?.spec,period)}).catch(()=>{});
}
function close(){
  const el=$('rtWatchlistWorkstation');if(el)el.hidden=true;document.body.classList.remove('rtw-open');
}
function hijack(){
  const b=$('rtWatchAll');
  if(b&&!b.dataset.rtwBound){b.dataset.rtwBound='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},true)}
}
function boot(){
  loadCustom();mount();hijack();setInterval(()=>{hijack();if(!$('rtWatchlistWorkstation')?.hidden)tick()},1000);
  const ob=new MutationObserver(hijack);ob.observe(document.body,{subtree:true,childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.RadarWatchlistWorkstation=Object.freeze({open,close,render});
})();