/* Radar Técnico · Watchlist Workstation
   Isolated full-screen watchlist. Uses live data already loaded by Global Command Center. */
(()=>{
'use strict';

const $=id=>document.getElementById(id);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(v===null||v===undefined||v==='')return NaN;const n=Number(v);return Number.isFinite(n)?n:NaN};
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
    const res=await fetch(`/api/yahoo-batch?symbols=${encodeURIComponent(clean)}&range=1y&interval=1d&fresh=1&_=${Date.now()}`,{cache:'no-store'});
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

/* Radar Técnico · Top Opportunities Workstation
   Full ranking opened from Watchlist > Top oportunidades > Ver más.
   Uses the existing analytical engines and market data; it does not fabricate signals. */
(()=>{
'use strict';
if(window.RadarTopOpportunities)return;

const $=id=>document.getElementById(id);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const num=v=>{if(v===null||v===undefined||v==='')return NaN;const n=Number(v);return Number.isFinite(n)?n:NaN};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=2)=>Number.isFinite(num(v))?new Intl.NumberFormat('es-AR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(num(v)):'s/d';
const pct=v=>Number.isFinite(num(v))?(num(v)>=0?'+':'')+fmt(v,2)+'%':'—';
const global=()=>window.RadarGlobalCommandCenter;
const gst=()=>global()?.state;
const daily=()=>window.RadarDailyRadar?.state;

let typeFilter='all',signalFilter='all',riskFilter='all',search='',selected='',rows=[],refreshing=false,directCandidates=[],cedearCandidates=[],cedearLoading=false,cedearLoadedAt=0,cedearRefreshPromise=null,cedearMeta={count:0,analyzedCount:0,source:'',officialCount:0,liquidityFloor:0},cedearProgress={phase:'idle',total:0,done:0,eligible:0,pct:0,message:'',error:''};

const TYPE_META={
  crypto:['Crypto','Crypto','USDT'],
  cedear:['CEDEAR','BYMA','ARS'],
  argstock:['Acción AR','BYMA','ARS'],
  adr:['ADR','EE.UU.','USD'],
  stock:['EE.UU. / ETF','EE.UU.','USD'],
  equity:['Acción','Mercado','s/d'],
  argbond:['Bono soberano','BYMA','s/d'],
  bond:['Bono','BYMA','s/d'],
  bill:['Letra','BYMA','ARS'],
  letra:['Letra','BYMA','ARS']
};

const DIRECT_UNIVERSE=[
  {symbol:'BTC',quote:'BTC-USD',label:'Bitcoin',type:'crypto',currency:'USD'},
  {symbol:'ETH',quote:'ETH-USD',label:'Ethereum',type:'crypto',currency:'USD'},
  {symbol:'SOL',quote:'SOL-USD',label:'Solana',type:'crypto',currency:'USD'},
  {symbol:'SPY',quote:'SPY',label:'S&P 500 ETF',type:'stock',currency:'USD'},
  {symbol:'QQQ',quote:'QQQ',label:'Nasdaq 100 ETF',type:'stock',currency:'USD'},
  {symbol:'AAPL',quote:'AAPL',label:'Apple',type:'stock',currency:'USD'},
  {symbol:'NVDA',quote:'NVDA',label:'NVIDIA',type:'stock',currency:'USD'},
  {symbol:'MELI',quote:'MELI',label:'MercadoLibre',type:'adr',currency:'USD'},
  {symbol:'GGAL',quote:'GGAL',label:'Grupo Galicia ADR',type:'adr',currency:'USD'},
  {symbol:'YPF',quote:'YPF',label:'YPF ADR',type:'adr',currency:'USD'},
  {symbol:'PAM',quote:'PAM',label:'Pampa Energía ADR',type:'adr',currency:'USD'},
  {symbol:'VIST',quote:'VIST',label:'Vista Energy ADR',type:'adr',currency:'USD'}
];

function emaSeries(values,period){
  const v=(values||[]).filter(Number.isFinite);if(!v.length)return[];
  const k=2/(period+1),out=[v[0]];
  for(let i=1;i<v.length;i++)out.push(v[i]*k+out[i-1]*(1-k));
  return out;
}
function emaLast(values,period){
  if((values||[]).filter(Number.isFinite).length<period)return NaN;
  return emaSeries(values,period).at(-1);
}
function rsiLast(values,period=14){
  const v=(values||[]).filter(Number.isFinite);if(v.length<=period)return NaN;
  let gains=0,losses=0;
  for(let i=1;i<=period;i++){const d=v[i]-v[i-1];if(d>=0)gains+=d;else losses-=d}
  let avgGain=gains/period,avgLoss=losses/period;
  for(let i=period+1;i<v.length;i++){const d=v[i]-v[i-1],g=d>0?d:0,l=d<0?-d:0;avgGain=(avgGain*(period-1)+g)/period;avgLoss=(avgLoss*(period-1)+l)/period}
  if(avgLoss===0)return 100;
  const rs=avgGain/avgLoss;return 100-(100/(1+rs));
}
function macdLast(values){
  const v=(values||[]).filter(Number.isFinite);if(v.length<35)return{line:NaN,signal:NaN,hist:NaN,histPrev:NaN};
  const e12=emaSeries(v,12),e26=emaSeries(v,26),offset=e12.length-e26.length;
  const line=e26.map((x,i)=>e12[i+offset]-x),sig=emaSeries(line,9);
  const hist=line.at(-1)-sig.at(-1),histPrev=line.at(-2)-sig.at(-2);
  return{line:line.at(-1),signal:sig.at(-1),hist,histPrev};
}
function weeklyCloses(bars){
  const groups=new Map();
  for(const b of (bars||[])){
    const t=num(b?.time),c=num(b?.close);if(!Number.isFinite(t)||!Number.isFinite(c))continue;
    const d=new Date(t*1000),day=d.getUTCDay()||7;
    const monday=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day+1));
    const key=monday.toISOString().slice(0,10);
    groups.set(key,c);
  }
  return[...groups.values()];
}
function avgAbsReturnPct(values,n=14){
  const v=(values||[]).filter(Number.isFinite).slice(-(n+1));if(v.length<5)return NaN;
  const r=[];for(let i=1;i<v.length;i++)if(v[i-1]>0)r.push(Math.abs(v[i]/v[i-1]-1)*100);
  return r.length?r.reduce((a,b)=>a+b,0)/r.length:NaN;
}
function relativeVolumeFromBars(bars){
  const v=(bars||[]).slice(-21).map(x=>num(x?.volume)).filter(x=>Number.isFinite(x)&&x>0);
  if(v.length<6)return NaN;
  const avg=v.slice(0,-1).reduce((a,b)=>a+b,0)/Math.max(1,v.length-1);
  return avg>0?v.at(-1)/avg:NaN;
}
function atrLast(bars,period=14){
  const b=(bars||[]).filter(x=>Number.isFinite(num(x?.close)));
  if(b.length<period+1)return NaN;
  const tr=[];
  for(let i=1;i<b.length;i++){
    const h=Number.isFinite(num(b[i].high))?num(b[i].high):num(b[i].close);
    const l=Number.isFinite(num(b[i].low))?num(b[i].low):num(b[i].close);
    const pc=num(b[i-1].close);
    tr.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)));
  }
  let a=tr.slice(0,period).reduce((x,y)=>x+y,0)/period;
  for(let i=period;i<tr.length;i++)a=(a*(period-1)+tr[i])/period;
  return a;
}
function technicalEngine(bars,context=50){
  const clean=(bars||[]).map(b=>({time:num(b?.time),open:num(b?.open),high:num(b?.high),low:num(b?.low),close:num(b?.close),volume:num(b?.volume)})).filter(b=>Number.isFinite(b.close));
  const closes=clean.map(x=>x.close),last=closes.at(-1),prev=closes.at(-2);
  if(closes.length<55||!Number.isFinite(last)){
    return{kind:'wait',label:'SEGUIMIENTO',oppScore:20,setup:'Histórico insuficiente',trend:'NEUTRAL',reason:'No hay histórico suficiente para validar tendencia y timing.',analysis:{engine:'TA-v3',sufficient:false,total:20,components:{trend:4,structure:4,momentum:3,volume:2,timing:2,rr:3,context:2},indicators:{bars:closes.length},gates:{trend:false,setup:false,momentum:false,volume:false,timing:false,rr:false,notExtended:false},failures:['histórico insuficiente']}};
  }

  const ema10=emaLast(closes,10),ema55=emaLast(closes,55),ema200=emaLast(closes,200);
  const weekly=weeklyCloses(clean),w10=emaLast(weekly,10),w20=emaLast(weekly,20),weeklyLast=weekly.at(-1);
  const rsi=rsiLast(closes,14),macd=macdLast(closes),rvol=relativeVolumeFromBars(clean);
  const atr=atrLast(clean,14),atrPct=Number.isFinite(atr)&&last>0?atr/last*100:NaN;

  const beforeBreakout=closes.slice(-22,-2),recent20=closes.slice(-21,-1),recent55=closes.slice(-56,-1),recent120=closes.slice(-121,-1);
  const trigger20=beforeBreakout.length?Math.max(...beforeBreakout):NaN;
  const lo20=recent20.length?Math.min(...recent20):NaN;
  const hi55=recent55.length?Math.max(...recent55):NaN,hi120=recent120.length?Math.max(...recent120):NaN;
  const mom5=closes.length>5&&closes.at(-6)>0?(last/closes.at(-6)-1)*100:NaN;

  const half1=recent20.slice(0,10),half2=recent20.slice(10);
  const higherHighs=half1.length&&half2.length&&Math.max(...half2)>Math.max(...half1);
  const higherLows=half1.length&&half2.length&&Math.min(...half2)>Math.min(...half1);
  const weeklyBull=Number.isFinite(w10)&&Number.isFinite(w20)&&Number.isFinite(weeklyLast)&&weeklyLast>w20&&w10>w20;
  const weeklyBear=Number.isFinite(w10)&&Number.isFinite(w20)&&Number.isFinite(weeklyLast)&&weeklyLast<w20&&w10<w20;
  const dailyBull=Number.isFinite(ema10)&&Number.isFinite(ema55)&&last>ema55&&ema10>ema55;
  const fullBull=dailyBull&&Number.isFinite(ema200)&&ema55>ema200;
  const dailyBear=Number.isFinite(ema10)&&Number.isFinite(ema55)&&last<ema55&&ema10<ema55;

  const breakoutNow=Number.isFinite(trigger20)&&Number.isFinite(prev)&&prev<=trigger20*1.002&&last>trigger20*1.002;
  const breakoutDistancePct=breakoutNow?Math.max(0,(last/trigger20-1)*100):NaN;
  const maxBreakoutDistancePct=Number.isFinite(atrPct)?clamp(atrPct*.75,1.0,2.8):1.8;
  const freshBreakout=breakoutNow&&breakoutDistancePct<=maxBreakoutDistancePct;

  const distEma10AbsPct=Number.isFinite(ema10)?Math.abs(last/ema10-1)*100:NaN;
  const distAboveEma10Pct=Number.isFinite(ema10)?Math.max(0,(last/ema10-1)*100):NaN;
  const distEma55Pct=Number.isFinite(ema55)?Math.abs(last/ema55-1)*100:NaN;
  const pullbackZone=dailyBull&&((Number.isFinite(distEma10AbsPct)&&distEma10AbsPct<=Math.max(2.2,(atrPct||1.5)*.9))||(Number.isFinite(distEma55Pct)&&distEma55Pct<=Math.max(2.5,(atrPct||1.5))));
  const lastBar=clean.at(-1)||{},bullishReaction=(Number.isFinite(lastBar.open)&&last>lastBar.open)||(Number.isFinite(prev)&&last>prev);
  const pullbackReady=pullbackZone&&bullishReaction&&Number.isFinite(rsi)&&rsi>=44&&rsi<=66&&!breakoutNow;

  const nearBreakout=Number.isFinite(trigger20)&&last<trigger20&&trigger20>0&&((trigger20-last)/last*100)<=Math.max(1.8,(atrPct||1.5)*.8)&&dailyBull;
  const tooFarFromEma10=Number.isFinite(distAboveEma10Pct)&&distAboveEma10Pct>Math.max(4.0,(atrPct||2)*1.25);
  const breakoutChased=Number.isFinite(trigger20)&&last>trigger20&& !freshBreakout && ((last/trigger20-1)*100)>maxBreakoutDistancePct;
  const lateEntry=dailyBull&&(tooFarFromEma10||breakoutChased);
  const overextended=lateEntry||(Number.isFinite(rsi)&&rsi>72);

  let trendScore=0;
  if(last>ema55)trendScore+=4;
  if(ema10>ema55)trendScore+=6;
  if(Number.isFinite(ema200)&&ema55>ema200)trendScore+=5;
  if(weeklyBull)trendScore+=5;
  if(weeklyBear)trendScore=Math.max(0,trendScore-5);

  let structureScore=4,setup='ESPERAR';
  if(freshBreakout){structureScore=20;setup='RUPTURA FRESCA'}
  else if(pullbackReady){structureScore=19;setup='PULLBACK CONFIRMADO'}
  else if(nearBreakout){structureScore=15;setup='CERCA DE RUPTURA'}
  else if(lateEntry){structureScore=8;setup='TARDE / ESPERAR PULLBACK'}
  else if(higherHighs&&higherLows&&dailyBull){structureScore=13;setup='ESTRUCTURA ALCISTA'}
  else if(dailyBear){structureScore=2;setup='ESTRUCTURA BAJISTA'}
  else if(higherHighs||higherLows){structureScore=9;setup='EN DESARROLLO'}

  let momentumScore=0;
  if(Number.isFinite(macd.line)&&Number.isFinite(macd.signal)&&macd.line>macd.signal)momentumScore+=6;
  if(Number.isFinite(macd.hist)&&macd.hist>0)momentumScore+=3;
  if(Number.isFinite(macd.hist)&&Number.isFinite(macd.histPrev)&&macd.hist>macd.histPrev)momentumScore+=1;
  if(Number.isFinite(rsi)){
    if(rsi>=50&&rsi<=64)momentumScore+=5;
    else if(rsi>=46&&rsi<50)momentumScore+=3;
    else if(rsi>64&&rsi<=70)momentumScore+=2;
  }
  momentumScore=clamp(momentumScore,0,15);

  let volumeScore=4;
  if(Number.isFinite(rvol)){
    volumeScore=rvol>=1.5?10:rvol>=1.2?9:rvol>=1?7:rvol>=.8?5:2;
    if(pullbackReady&&rvol<1)volumeScore=Math.max(volumeScore,6);
  }

  let timingScore=3;
  if(freshBreakout)timingScore=15;
  else if(pullbackReady)timingScore=15;
  else if(nearBreakout)timingScore=11;
  else if(lateEntry)timingScore=0;
  else if(pullbackZone)timingScore=8;

  const entryReference=freshBreakout?trigger20:pullbackReady?(Math.abs(last-ema10)<=Math.abs(last-ema55)?ema10:ema55):nearBreakout?trigger20:ema10;
  const supportCandidates=[lo20,ema55,freshBreakout?trigger20:NaN].filter(v=>Number.isFinite(v)&&v<last*.998);
  const nearestSupport=supportCandidates.length?Math.max(...supportCandidates):NaN;
  const minRiskPct=Math.max(Number.isFinite(atrPct)?atrPct*.9:1.5,1.5)/100;
  const structuralDistance=Number.isFinite(nearestSupport)?last-nearestSupport:last*minRiskPct;
  const riskDistance=Math.max(structuralDistance,last*minRiskPct);
  const stop=last-riskDistance;
  const resistances=[hi55,hi120].filter(v=>Number.isFinite(v)&&v>last*1.005).sort((a,b)=>a-b);
  const target=resistances[0]??(last+riskDistance*2);
  const rr=riskDistance>0&&target>last?(target-last)/riskDistance:0;
  const rrScore=rr>=2.2?15:rr>=1.8?13:rr>=1.5?10:rr>=1.2?6:2;
  const contextScore5=clamp(Math.round(clamp(context,0,100)*.05),0,5);
  const total=clamp(Math.round(trendScore+structureScore+momentumScore+volumeScore+timingScore+rrScore+contextScore5),0,100);
  const technicalScore=clamp(Math.round((trendScore+structureScore+momentumScore+volumeScore+timingScore+rrScore)/.95),0,100);

  const historyOk=closes.length>=200&&weekly.length>=20&&Number.isFinite(ema200);
  const trendGate=historyOk&&fullBull&&!weeklyBear;
  const setupGate=freshBreakout||pullbackReady;
  const momentumGate=momentumScore>=9&&Number.isFinite(rsi)&&rsi>=46&&rsi<=70&&Number.isFinite(macd.line)&&macd.line>macd.signal;
  const volumeGate=Number.isFinite(rvol)&&(freshBreakout?rvol>=1.0:pullbackReady?rvol>=.7:rvol>=.8);
  const timingGate=(freshBreakout||pullbackReady)&&!lateEntry;
  const rrGate=rr>=1.5;
  const buy=trendGate&&setupGate&&momentumGate&&volumeGate&&timingGate&&rrGate&&!overextended&&total>=70;
  const possible=!buy&&historyOk&&dailyBull&&!weeklyBear&&!lateEntry&&rr>=1.2&&total>=56&&(nearBreakout||pullbackZone||momentumScore>=9);
  const avoid=(historyOk&&dailyBear&&weeklyBear)||(rr>0&&rr<1)||(total<34);
  const kind=buy?'buy':possible?'near':avoid?'sell':'wait';
  const label=kind==='buy'?'OPORTUNIDAD':kind==='near'?'POSIBLE':kind==='sell'?'EVITAR':'SEGUIMIENTO';
  const trend=fullBull&&weeklyBull?'ALCISTA':dailyBear&&weeklyBear?'BAJISTA':dailyBull?'ALCISTA':'NEUTRAL';

  const failures=[];
  if(!historyOk)failures.push('histórico < 200 ruedas');
  if(!trendGate)failures.push('tendencia no confirmada D/W');
  if(!setupGate)failures.push('sin setup de entrada');
  if(!momentumGate)failures.push('momentum sin confirmar');
  if(!volumeGate)failures.push('volumen insuficiente');
  if(!timingGate)failures.push(lateEntry?'entrada tardía':'timing sin confirmar');
  if(!rrGate)failures.push('R/R < 1,5');
  if(overextended&&!lateEntry)failures.push('precio extendido');

  const reason='EMA10 '+(Number.isFinite(ema10)?fmt(ema10,2):'s/d')+' · EMA55 '+(Number.isFinite(ema55)?fmt(ema55,2):'s/d')+' · EMA200 '+(Number.isFinite(ema200)?fmt(ema200,2):'s/d')+' · RSI '+(Number.isFinite(rsi)?fmt(rsi,1):'s/d')+' · MACD '+(Number.isFinite(macd.hist)?(macd.hist>=0?'+':'')+fmt(macd.hist,2):'s/d')+' · RVOL '+(Number.isFinite(rvol)?fmt(rvol,2)+'x':'s/d')+' · Timing '+(lateEntry?'TARDE':freshBreakout?'RUPTURA FRESCA':pullbackReady?'PULLBACK':'ESPERAR')+' · R/R '+(Number.isFinite(rr)?fmt(rr,2):'s/d')+(failures.length?' · Falta: '+failures.slice(0,3).join(', '):'');

  return{
    kind,label,oppScore:total,setup,trend,reason,
    analysis:{
      engine:'TA-v3',sufficient:historyOk,total,technicalScore,
      components:{trend:trendScore,structure:structureScore,momentum:momentumScore,volume:volumeScore,timing:timingScore,rr:rrScore,context:contextScore5},
      indicators:{bars:closes.length,ema10,ema55,ema200,weeklyEma10:w10,weeklyEma20:w20,weeklyTrend:weeklyBull?'ALCISTA':weeklyBear?'BAJISTA':'NEUTRAL',rsi,macd:macd.line,macdSignal:macd.signal,macdHist:macd.hist,relVolume:rvol,momentum5:mom5,atr,atrPct,entryReference,entryDistancePct:Number.isFinite(entryReference)?Math.abs(last/entryReference-1)*100:NaN,breakoutTrigger:trigger20,breakoutDistancePct,support:nearestSupport,resistance:resistances[0]??trigger20,stop,target,rr,lateEntry,overextended},
      gates:{trend:trendGate,setup:setupGate,momentum:momentumGate,volume:volumeGate,timing:timingGate,rr:rrGate,notExtended:!overextended},
      failures
    }
  };
}
function directTech(bars,context=50){return technicalEngine(bars,context)}
function directRow(meta,market){
  if(!meta||!market)return null;
  const bars=(market.bars||[]).map(b=>({time:num(b?.time),open:num(b?.open),high:num(b?.high),low:num(b?.low),close:num(b?.close),volume:num(b?.volume)})).filter(b=>Number.isFinite(b.close));
  const last=num(market.last??bars.at(-1)?.close),volume=num(market.volume??bars.at(-1)?.volume);
  if(!Number.isFinite(last))return null;
  const tech=directTech(bars,contextScore(meta.type));
  return{
    item:{symbol:meta.symbol,type:meta.type,requestedType:meta.type,label:meta.label,panel:{currency:meta.currency}},
    status:{kind:tech.kind,label:tech.label,oppScore:tech.oppScore,reason:tech.reason},
    trend:tech.trend,setup:tech.setup,analysis:tech.analysis,why:tech.reason,marketOnly:true,bars,
    marketData:{last,changePct:num(market.changePct),volume,bars,source:market.source||'Yahoo Finance'}
  };
}
function globalMarketCandidates(){
  const st=gst(),out=[];
  if(!st?.markets)return out;
  for(const meta of DIRECT_UNIVERSE){
    const m=st.markets.get(meta.quote);
    const row=directRow(meta,m);
    if(row)out.push(row);
  }
  return out;
}
function universeCandidates(){
  const st=gst(),out=[];
  if(!st?.universes)return out;
  const add=(panel,type)=>{
    const symbol=String(panel?.symbol||'').toUpperCase();
    const last=num(panel?.trade??panel?.closingPrice),volume=num(panel?.volumeAmount??panel?.tradeVolume??panel?.volume);
    if(!symbol||!Number.isFinite(last))return;
    const market={last,changePct:num(panel?.changePct),volume,bars:[],source:panel?.source||'BYMA'};
    const currency=String(panel?.denominationCcy||panel?.currency||'ARS').toUpperCase();
    const row=directRow({symbol,label:String(panel?.description||panel?.securityDescription||symbol),type,currency},market);
    if(row){row.item.panel=panel;out.push(row)}
  };
  (st.universes.equities||[]).slice(0,40).forEach(x=>add(x,'argstock'));
  (st.universes.fixed||[]).slice(0,40).forEach(x=>add(x,x?.category==='LECAP/BONCAP'?'bill':'argbond'));
  return out;
}
function median(values){
  const a=(values||[]).filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return NaN;
  const m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function setCedearProgress(patch={}){
  cedearProgress={...cedearProgress,...patch};
  if(cedearProgress.total>0)cedearProgress.pct=Math.min(100,Math.round((cedearProgress.done/cedearProgress.total)*100));
  const shell=$('rtTopOpportunities');
  if(shell){
    shell.dataset.cedearLoading=String(cedearLoading);
    shell.dataset.cedearProgress=String(cedearProgress.pct||0);
    shell.dataset.cedearAnalyzed=String(cedearProgress.done||0);
    shell.dataset.cedearUniverseTotal=String(cedearProgress.total||0);
    shell.dataset.cedearUniverseCount=String(cedearCandidates.length);
    shell.dataset.cedearPhase=cedearProgress.phase||'idle';
  }
  renderCedearProgress();
}
function renderCedearProgress(){
  const el=$('rtoProgress');if(!el)return;
  const p=cedearProgress,total=p.total||0,done=p.done||0,left=Math.max(0,total-done);
  const show=cedearLoading||p.phase==='complete'||p.phase==='error';
  el.hidden=!show;
  if(!show)return;
  const title=p.phase==='complete'?'CEDEARs listos':p.phase==='error'?'CEDEARs con error':p.phase==='universe'?'Cargando universo oficial de CEDEARs':'Analizando CEDEARs líquidos';
  const detail=p.phase==='complete'
    ?(cedearCandidates.length+' líquidos analizados de '+total+' programas oficiales')
    :p.phase==='error'
      ?(p.error||'No se pudo completar el universo')
      :(done+' / '+total+' analizados · faltan '+left+' · '+(p.eligible||0)+' con liquidez verificada');
  const floor=cedearMeta.liquidityFloor>0?' · piso liquidez '+compactVolume(cedearMeta.liquidityFloor):'';
  el.innerHTML='<div class="rto-progress-copy"><b>'+esc(title)+'</b><span>'+esc(detail)+(p.phase==='complete'?esc(floor):'')+'</span></div><div class="rto-progress-track"><i style="width:'+(p.phase==='complete'?100:(p.pct||0))+'%"></i></div><strong>'+(p.phase==='complete'?'100%':(p.pct||0)+'%')+'</strong>';
  const b=$('rtoRefresh');
  if(b&&cedearLoading)b.textContent='Analizando '+(p.pct||0)+'%';
}
function liquidityFrom(panel,q,bars){
  const bymaTurnover=num(panel?.volumeAmount);
  const currentVolume=num(q?.volume),last=num(q?.last);
  const yahooTurnover=Number.isFinite(currentVolume)&&Number.isFinite(last)&&currentVolume>0&&last>0?currentVolume*last:NaN;
  const daily=(bars||[]).slice(-20).map(b=>{
    const c=num(b?.close),v=num(b?.volume);
    return Number.isFinite(c)&&Number.isFinite(v)&&c>0&&v>0?c*v:NaN;
  }).filter(Number.isFinite);
  const med=median(daily);
  const metric=Math.max(Number.isFinite(bymaTurnover)?bymaTurnover:0,Number.isFinite(yahooTurnover)?yahooTurnover:0,Number.isFinite(med)?med:0);
  return{metric,bymaTurnover,yahooTurnover,median20:med,tradedDays:daily.length};
}
function cedearCandidateFromMarket(program,panel,q){
  const symbol=String(program?.symbol||panel?.symbol||q?.symbol||'').toUpperCase().replace(/\.BA$/,'');
  if(!symbol||!q?.ok)return null;
  const bars=(q?.bars||[]).map(b=>({time:num(b?.time),open:num(b?.open),high:num(b?.high),low:num(b?.low),close:num(b?.close),volume:num(b?.volume)})).filter(b=>Number.isFinite(b.close));
  const last=num(q?.last??panel?.trade??panel?.closingPrice);
  if(!Number.isFinite(last)||last<=0)return null;
  const liq=liquidityFrom(panel,q,bars);
  if(!(liq.metric>0))return null;
  const tech=directTech(bars,contextScore('cedear'));
  const label=String(program?.underlying||program?.program||panel?.description||panel?.securityDescription||symbol);
  const panelOut={...(panel||{}),symbol,denominationCcy:'ARS',volumeAmount:liq.metric,program:program?.program||'',underlying:program?.underlying||'',ratioText:program?.ratioText||'',liquidityMetric:liq.metric,liquidityMedian20:liq.median20,tradedDays:liq.tradedDays};
  return{
    item:{symbol,type:'cedear',requestedType:'cedear',label,panel:panelOut},
    status:{kind:tech.kind,label:tech.label,oppScore:tech.oppScore,reason:tech.reason},
    trend:tech.trend,setup:tech.setup,analysis:tech.analysis,why:tech.reason,bars,marketOnly:true,cedearUniverse:true,
    _liquidityMetric:liq.metric,_tradedDays:liq.tradedDays,_bymaTurnover:liq.bymaTurnover,
    marketData:{last,changePct:num(q?.changePct),volume:liq.metric,bars,source:q?.source||panel?.source||'Yahoo Finance / BYMA'}
  };
}
async function fetchJsonNoStore(url){
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status+' '+url);
  return r.json();
}
async function refreshCedearCandidates(force=false){
  if(cedearLoading&&cedearRefreshPromise)return cedearRefreshPromise;
  if(!force&&cedearCandidates.length&&Date.now()-cedearLoadedAt<5*60*1000)return cedearCandidates;
  cedearLoading=true;
  setCedearProgress({phase:'universe',total:0,done:0,eligible:0,pct:0,message:'',error:''});
  cedearRefreshPromise=(async()=>{
    const [programResult,bymaResult]=await Promise.allSettled([
      fetchJsonNoStore('/api/cedear/programs?_='+Date.now()),
      fetchJsonNoStore('/api/byma/cedears?liquid=0&_='+Date.now())
    ]);
    const programs=programResult.status==='fulfilled'&&Array.isArray(programResult.value?.items)?programResult.value.items:[];
    const bymaItems=bymaResult.status==='fulfilled'&&Array.isArray(bymaResult.value?.items)?bymaResult.value.items:[];
    const officialMap=new Map(programs.map(x=>[String(x.symbol||'').toUpperCase(),x]).filter(x=>x[0]));
    const bymaMap=new Map(bymaItems.map(x=>[String(x.symbol||'').toUpperCase(),x]).filter(x=>x[0]));
    let symbols=officialMap.size?[...officialMap.keys()]:[...bymaMap.keys()];
    symbols=[...new Set(symbols)].filter(x=>/^[A-Z0-9.\-]{1,12}$/.test(x)).sort();
    if(!symbols.length)throw new Error('No se pudo obtener el universo oficial de CEDEARs');
    cedearMeta={...cedearMeta,officialCount:symbols.length,source:officialMap.size?'Banco Comafi + BYMA + Yahoo':'BYMA + Yahoo'};
    setCedearProgress({phase:'analysis',total:symbols.length,done:0,eligible:0});

    const chunks=[];for(let i=0;i<symbols.length;i+=40)chunks.push(symbols.slice(i,i+40));
    const provisional=[];
    for(let ci=0;ci<chunks.length;ci++){
      const chunk=chunks[ci];
      try{
        const q=await fetchJsonNoStore('/api/yahoo-batch?symbols='+encodeURIComponent(chunk.map(x=>x+'.BA').join(','))+'&range=1y&interval=1d&fresh='+(force?'1':'0')+'&_='+Date.now());
        const quotes=new Map((q.items||[]).map(x=>[String(x.symbol||'').toUpperCase().replace(/\.BA$/,''),x]));
        for(const symbol of chunk){
          const row=cedearCandidateFromMarket(officialMap.get(symbol),bymaMap.get(symbol),quotes.get(symbol));
          if(row)provisional.push(row);
        }
      }catch(e){console.warn('CEDEAR batch '+(ci+1),e)}
      const done=Math.min(symbols.length,(ci+1)*40);
      const positive=provisional.filter(x=>x._liquidityMetric>0);
      cedearCandidates=[...positive];
      setCedearProgress({phase:'analysis',total:symbols.length,done,eligible:positive.length});
      if(!$('rtTopOpportunities')?.hidden){
        rows=normalize();renderKpis();renderFilters();renderTableAndDetail();
      }
    }

    const metrics=provisional.map(x=>x._liquidityMetric).filter(x=>Number.isFinite(x)&&x>0);
    const med=median(metrics);
    let floor=Number.isFinite(med)?Math.max(1000000,med*.08):1000000;
    let eligible=provisional.filter(x=>x._liquidityMetric>=floor&&(x._tradedDays>=5||x._bymaTurnover>=floor));
    if(eligible.length<Math.min(20,provisional.length)){
      const sorted=[...provisional].sort((a,b)=>b._liquidityMetric-a._liquidityMetric);
      const fallbackFloor=sorted[Math.min(sorted.length-1,Math.max(0,Math.min(19,sorted.length-1)))]?._liquidityMetric;
      if(Number.isFinite(fallbackFloor)&&fallbackFloor>0){
        floor=Math.min(floor,fallbackFloor);
        eligible=provisional.filter(x=>x._liquidityMetric>=floor);
      }
    }
    cedearCandidates=eligible.sort((a,b)=>b._liquidityMetric-a._liquidityMetric);
    cedearLoadedAt=Date.now();
    cedearMeta={...cedearMeta,count:cedearCandidates.length,analyzedCount:provisional.length,liquidityFloor:floor};
    setCedearProgress({phase:'complete',total:symbols.length,done:symbols.length,eligible:cedearCandidates.length,pct:100});
    return cedearCandidates;
  })().catch(e=>{
    console.error('Top oportunidades CEDEAR',e);
    cedearCandidates=[];
    setCedearProgress({phase:'error',error:String(e?.message||e),done:0,eligible:0});
    return cedearCandidates;
  }).finally(()=>{
    cedearLoading=false;cedearRefreshPromise=null;
    const sh=$('rtTopOpportunities');if(sh)sh.dataset.cedearLoading='false';
    if(!$('rtTopOpportunities')?.hidden){
      rows=normalize();renderKpis();renderFilters();renderTableAndDetail();renderCedearProgress();
    }
    const b=$('rtoRefresh');if(b&&!refreshing){b.disabled=false;b.textContent='↻ Actualizar ranking'}
  });
  return cedearRefreshPromise;
}
async function refreshDirectCandidates(force=false){
  const symbols=DIRECT_UNIVERSE.map(x=>x.quote);
  try{
    const r=await fetch('/api/yahoo-batch?symbols='+encodeURIComponent(symbols.join(','))+'&range=1y&interval=1d&fresh='+(force?'1':'0')+'&_='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error('Yahoo HTTP '+r.status);
    const j=await r.json(),bySymbol=new Map((j.items||[]).map(x=>[String(x.symbol||'').toUpperCase(),x]));
    const next=[];
    for(const meta of DIRECT_UNIVERSE){
      const x=bySymbol.get(meta.quote.toUpperCase());
      if(!x?.ok&&!Number.isFinite(num(x?.last)))continue;
      const market={
        last:num(x.last),changePct:num(x.changePct),volume:num(x.volume),source:x.source||j.source||'Yahoo Finance',
        bars:(x.bars||[]).map(b=>({time:num(b.time),open:num(b.open),high:num(b.high),low:num(b.low),close:num(b.close),volume:num(b.volume)})).filter(b=>Number.isFinite(b.close))
      };
      const row=directRow(meta,market);if(row)next.push(row);
    }
    if(next.length)directCandidates=next;
  }catch(e){
    const fallback=globalMarketCandidates();
    if(fallback.length)directCandidates=fallback;
    console.warn('Top oportunidades: respaldo de mercado',e);
  }
  return directCandidates;
}

function installStyles(){
  if($('rtoStyles'))return;
  const st=document.createElement('style');st.id='rtoStyles';
  st.textContent=[
'#rtTopOpportunities{--o-bg:#020b13;--o-panel:#061a28;--o-panel2:#03131e;--o-edge:#0a6386;--o-cyan:#25d7ff;--o-green:#2bef96;--o-red:#ff586a;--o-yellow:#ffd24b;--o-text:#edf7fb;--o-muted:#86a1b1;position:fixed!important;inset:0!important;z-index:15000!important;width:100vw!important;height:100vh!important;overflow:auto!important;padding:0 18px 18px!important;color:var(--o-text)!important;background:radial-gradient(circle at 78% -8%,rgba(24,126,166,.16),transparent 31%),linear-gradient(180deg,#03111b,#020911)!important;font-family:"Roboto Condensed","Arial Narrow","Segoe UI",Arial,sans-serif!important;-webkit-font-smoothing:antialiased!important}',
'#rtTopOpportunities[hidden]{display:none!important}body.rto-open{overflow:hidden!important}#rtTopOpportunities *,#rtTopOpportunities *::before,#rtTopOpportunities *::after{box-sizing:border-box!important}',
'#rtTopOpportunities .rto-topbar{height:58px!important;margin:0 -18px!important;padding:0 18px!important;display:grid!important;grid-template-columns:320px minmax(560px,1fr) 250px 132px 110px!important;gap:8px!important;align-items:center!important;background:linear-gradient(180deg,#03131f,#020b13)!important;border-bottom:1px solid #0d5874!important;box-shadow:0 7px 22px rgba(0,0,0,.38)!important;position:sticky!important;top:0!important;z-index:8!important}',
'#rtTopOpportunities .rto-brand{height:54px!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important}',
'#rtTopOpportunities .rto-nav{height:38px!important;display:flex!important;align-items:center!important;justify-content:center!important;border:1px solid #104760!important;border-radius:5px!important;background:#03131f!important;overflow:hidden!important}',
'#rtTopOpportunities .rto-nav button{height:100%!important;padding:0 12px!important;border:0!important;border-right:1px solid #10364b!important;background:transparent!important;color:#a9bdc9!important;font:700 10px/1 inherit!important;white-space:nowrap!important}#rtTopOpportunities .rto-nav button.active{color:#7cecff!important;background:linear-gradient(180deg,#073b5a,#05253b)!important;box-shadow:inset 0 -2px 0 #22ccef!important}',
'#rtTopOpportunities .rto-search{height:32px!important;display:flex!important;align-items:center!important;gap:8px!important;padding:0 10px!important;border:1px solid #116083!important;border-radius:5px!important;background:#03141f!important;color:#42dfff!important}#rtTopOpportunities .rto-search input{width:100%!important;border:0!important;outline:0!important;background:transparent!important;color:#dcebf2!important;font:600 9px/1 inherit!important}',
'#rtTopOpportunities .rto-live{height:32px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;border:1px solid #0c684c!important;border-radius:4px!important;background:#05251d!important;color:#55eda8!important;font:800 8px/1 inherit!important}#rtTopOpportunities .rto-live i{width:7px!important;height:7px!important;border-radius:50%!important;background:#2bef96!important;box-shadow:0 0 8px rgba(43,239,150,.8)!important}',
'#rtTopOpportunities .rto-clock{text-align:right!important}#rtTopOpportunities .rto-clock b{display:block!important;font-size:14px!important}#rtTopOpportunities .rto-clock small{display:block!important;color:#718c9c!important;font-size:7px!important;margin-top:2px!important}',
'#rtTopOpportunities .rto-hero{min-height:92px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;padding:12px 8px!important;border-bottom:1px solid #0b4a65!important}',
'#rtTopOpportunities .rto-hero-copy{display:flex!important;align-items:center!important;gap:13px!important}.rto-hero-icon{width:52px!important;height:52px!important;display:grid!important;place-items:center!important;border:1px solid #1381aa!important;border-radius:7px!important;background:linear-gradient(145deg,#073e5b,#052438)!important;color:#45e4ff!important;font-size:25px!important;box-shadow:0 0 20px rgba(30,184,230,.12)!important}',
'#rtTopOpportunities .rto-hero h1{margin:0!important;font-size:30px!important;line-height:1!important;letter-spacing:-.5px!important}#rtTopOpportunities .rto-hero p{margin:7px 0 0!important;color:#95adba!important;font-size:11px!important}#rtTopOpportunities .rto-hero p b{color:#d7e7ee!important}',
'#rtTopOpportunities .rto-hero-actions{display:flex!important;gap:7px!important}.rto-btn{height:32px!important;padding:0 13px!important;border:1px solid #146b8d!important;border-radius:4px!important;background:#062437!important;color:#bcecff!important;font:800 9px/1 inherit!important}.rto-btn.primary{border-color:#138e62!important;background:#073e2c!important;color:#5bf0a6!important}',
'#rtTopOpportunities .rto-kpis{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:7px!important;margin:7px 0!important}.rto-kpi{min-height:76px!important;display:grid!important;grid-template-columns:42px 1fr!important;gap:8px!important;align-items:center!important;padding:9px 11px!important;border:1px solid #0c5877!important;border-radius:6px!important;background:linear-gradient(135deg,#072033,#041620)!important}.rto-kpi i{width:38px!important;height:38px!important;display:grid!important;place-items:center!important;border-radius:50%!important;border:1px solid #106d90!important;background:#052538!important;color:#36ddff!important;font-style:normal!important;font-size:17px!important}.rto-kpi small{display:block!important;color:#8aa3b1!important;font-size:7px!important;font-weight:800!important}.rto-kpi strong{display:block!important;margin-top:2px!important;font-size:21px!important;line-height:1!important}.rto-kpi span{display:block!important;margin-top:5px!important;color:#6f8a99!important;font-size:7px!important}.rto-kpi.good strong{color:#45eda0!important}.rto-kpi.warn strong{color:#ffda5b!important}.rto-kpi.bad strong{color:#ff6878!important}',
'#rtTopOpportunities .rto-toolbar{height:46px!important;display:grid!important;grid-template-columns:1fr auto auto!important;gap:9px!important;align-items:center!important;padding:0 9px!important;border:1px solid #0c5574!important;border-radius:6px 6px 0 0!important;background:linear-gradient(180deg,#072337,#041823)!important}.rto-filters,.rto-signal-filters{display:flex!important;align-items:center!important;gap:4px!important}.rto-filters button,.rto-signal-filters button{height:27px!important;padding:0 9px!important;border:1px solid #153e53!important;border-radius:4px!important;background:#071925!important;color:#8ea7b5!important;font:800 7.5px/1 inherit!important}.rto-filters button.active,.rto-signal-filters button.active{border-color:#1a9bc9!important;background:#073958!important;color:#8eeaff!important}',
'#rtTopOpportunities .rto-main{display:grid!important;grid-template-columns:minmax(0,1fr) 360px!important;gap:7px!important;min-height:560px!important}.rto-panel{border:1px solid #0c5574!important;border-radius:0 0 6px 6px!important;background:#041722!important;overflow:hidden!important}.rto-table-wrap{height:560px!important;overflow:auto!important}',
'#rtTopOpportunities .rto-table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important}.rto-table th{height:31px!important;position:sticky!important;top:0!important;z-index:2!important;padding:0 7px!important;border-bottom:1px solid #0b4c68!important;background:#061b28!important;color:#7895a5!important;font-size:6.5px!important;text-align:left!important;white-space:nowrap!important}.rto-table td{height:42px!important;padding:0 7px!important;border-bottom:1px solid #0a374b!important;color:#becfd8!important;font-size:8px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.rto-table tr{cursor:pointer!important}.rto-table tbody tr:hover{background:#08263a!important}.rto-table tbody tr.selected{background:#08324a!important;box-shadow:inset 3px 0 0 #24d6ff!important}',
'#rtTopOpportunities .rto-rank{width:23px!important;height:23px!important;display:grid!important;place-items:center!important;border-radius:4px!important;background:#0b4b75!important;color:#dff7ff!important;font-size:9px!important;font-weight:900!important}.rto-asset b{display:block!important;color:#edf7fb!important;font-size:9.5px!important}.rto-asset small{display:block!important;margin-top:2px!important;color:#6d8898!important;font-size:6.6px!important}.rto-tag{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:60px!important;height:19px!important;padding:0 6px!important;border:1px solid #2c586d!important;border-radius:3px!important;background:#102632!important;color:#b8cbd4!important;font-size:6.7px!important;font-weight:900!important}.rto-tag.crypto{border-color:#705b20!important;background:#30270a!important;color:#ffe073!important}.rto-tag.bond{border-color:#6b4c93!important;background:#251a36!important;color:#d4b0ff!important}.rto-up{color:#2bef96!important}.rto-down{color:#ff586a!important}.rto-flat{color:#9cb0bb!important}',
'#rtTopOpportunities .rto-trend,.rto-status,.rto-risk{display:inline-flex!important;align-items:center!important;justify-content:center!important;height:19px!important;padding:0 6px!important;border-radius:3px!important;font-size:6.5px!important;font-weight:900!important}.rto-trend.bull,.rto-status.buy{border:1px solid #168e59!important;background:#073d2b!important;color:#59eea5!important}.rto-trend.neutral,.rto-status.near,.rto-risk.mid{border:1px solid #8d7120!important;background:#3b310b!important;color:#ffdf62!important}.rto-trend.bear,.rto-status.avoid,.rto-risk.high{border:1px solid #9e3446!important;background:#43151e!important;color:#ff8490!important}.rto-status.watch,.rto-risk.low{border:1px solid #236b6c!important;background:#0a3435!important;color:#70e5df!important}',
'#rtTopOpportunities .rto-score{display:flex!important;align-items:center!important;gap:5px!important}.rto-score b{width:27px!important;text-align:right!important;font-size:8px!important}.rto-score i{height:7px!important;flex:1!important;border-radius:6px!important;background:#102d3b!important;overflow:hidden!important}.rto-score i em{display:block!important;height:100%!important;background:linear-gradient(90deg,#1d77b6,#2bef96)!important}.rto-score.mid i em{background:linear-gradient(90deg,#a17818,#ffd24b)!important}',
'#rtTopOpportunities .rto-empty{height:150px!important;text-align:center!important;color:#7190a0!important;font-size:9px!important}',
'#rtTopOpportunities .rto-side{display:grid!important;grid-template-rows:auto auto 1fr!important;gap:7px!important}.rto-card{border:1px solid #0c5574!important;border-radius:6px!important;background:#041722!important;overflow:hidden!important}.rto-card header{height:38px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 10px!important;border-bottom:1px solid #0b4c68!important;background:linear-gradient(180deg,#072337,#041823)!important}.rto-card header h2{margin:0!important;font-size:13px!important}.rto-card header span{color:#6e8b9a!important;font-size:7px!important}.rto-selected{padding:10px!important}.rto-selected-top{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:8px!important}.rto-selected-top h3{margin:0!important;font-size:18px!important}.rto-selected-top small{display:block!important;margin-top:3px!important;color:#718e9d!important;font-size:7px!important}.rto-big-score{width:54px!important;height:54px!important;display:grid!important;place-items:center!important;border-radius:50%!important;background:conic-gradient(#2bef96 calc(var(--score)*1%),#153646 0)!important;position:relative!important}.rto-big-score:after{content:""!important;position:absolute!important;inset:5px!important;border-radius:50%!important;background:#061821!important}.rto-big-score b{position:relative!important;z-index:1!important;font-size:16px!important}',
'#rtTopOpportunities .rto-reason{margin:9px 0 0!important;padding:8px!important;border:1px solid #0c4057!important;border-radius:5px!important;background:#03131e!important;color:#b5c6ce!important;font-size:8px!important;line-height:1.4!important}.rto-metrics{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important;margin-top:8px!important}.rto-metric{padding:7px!important;border:1px solid #0a4057!important;border-radius:4px!important;background:#051a27!important}.rto-metric small{display:block!important;color:#718d9c!important;font-size:6.5px!important}.rto-metric b{display:block!important;margin-top:3px!important;font-size:11px!important}',
'#rtTopOpportunities .rto-plan{padding:10px!important}.rto-plan-state{height:34px!important;display:grid!important;place-items:center!important;border-radius:4px!important;font-size:10px!important;font-weight:900!important}.rto-plan-state.buy{border:1px solid #168e59!important;background:#073d2b!important;color:#59eea5!important}.rto-plan-state.near{border:1px solid #8d7120!important;background:#3b310b!important;color:#ffdf62!important}.rto-plan-state.watch{border:1px solid #236b6c!important;background:#0a3435!important;color:#70e5df!important}.rto-plan p{margin:9px 0!important;color:#aebfc8!important;font-size:8px!important;line-height:1.45!important}.rto-plan-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}.rto-plan-actions button{height:29px!important;border:1px solid #135f7f!important;border-radius:4px!important;background:#062438!important;color:#b7eaff!important;font:800 7.5px/1 inherit!important}',
'#rtTopOpportunities .rto-method{padding:10px!important;color:#97acb7!important;font-size:7.5px!important;line-height:1.45!important}.rto-method b{color:#dbeaf0!important}.rto-method .formula{display:block!important;margin-top:7px!important;padding:7px!important;border:1px solid #0d4057!important;border-radius:4px!important;background:#03131e!important;color:#7fe9ff!important}',
'@media(max-width:1450px){#rtTopOpportunities{padding-left:10px!important;padding-right:10px!important}#rtTopOpportunities .rto-topbar{margin-left:-10px!important;margin-right:-10px!important;padding-left:10px!important;padding-right:10px!important;grid-template-columns:255px minmax(500px,1fr) 205px 120px 95px!important}.rto-nav button{padding:0 8px!important;font-size:8.5px!important}#rtTopOpportunities .rto-main{grid-template-columns:minmax(0,1fr) 315px!important}#rtTopOpportunities .rto-table th:nth-child(9),#rtTopOpportunities .rto-table td:nth-child(9){display:none!important}}'
  ].join('');
  document.head.appendChild(st);
}

function typeOf(r){
  const t=String(r?.item?.requestedType||r?.item?.type||'').toLowerCase();
  if(t==='bond')return'argbond';
  if(t==='letra')return'bill';
  return t||'equity';
}
function symbolOf(r){return String(r?.item?.symbol||'').toUpperCase()}
function marketFor(r){
  if(r?.marketData)return r.marketData;
  const st=gst(),s=symbolOf(r),t=typeOf(r);
  if(!st)return null;
  if(t==='argbond'||t==='bill')return st.fixedIncome?.get?.(s+'D')||st.fixedIncome?.get?.(s)||null;
  const aliases={YPFD:'YPF',PAMP:'PAM',AL30:'AL30D',AE38:'AE38D',GD30:'GD30D'};
  return st.markets?.get?.(s)||st.markets?.get?.(aliases[s])||null;
}
function barsOf(r){
  const m=marketFor(r);
  const candidates=[m?.bars,r?.bars,r?.data,r?.dataset,r?.datasets?.short,r?.result?.bars];
  for(const a of candidates){
    if(Array.isArray(a)&&a.length>1)return a.map(x=>({open:num(x?.open??x?.o),high:num(x?.high??x?.h),low:num(x?.low??x?.l),close:num(x?.close??x?.c),volume:num(x?.volume??x?.v),time:num(x?.time??x?.t)})).filter(x=>Number.isFinite(x.close));
  }
  return[];
}
function priceOf(r){
  const m=marketFor(r);
  return num(m?.last??m?.trade??m?.closingPrice??r?.price??r?.last??r?.item?.panel?.trade??r?.item?.panel?.closingPrice);
}
function changeOf(r,bars){
  const m=marketFor(r),direct=num(m?.changePct??r?.changePct);
  if(Number.isFinite(direct))return direct;
  if(bars.length>1&&bars.at(-2).close)return (bars.at(-1).close/bars.at(-2).close-1)*100;
  return NaN;
}
function volumeOf(r,bars){
  const m=marketFor(r),v=num(m?.volume??r?.volume??r?.item?.panel?.volumeAmount??r?.item?.panel?.tradeVolume??r?.item?.panel?.volume);
  if(Number.isFinite(v)&&v>0)return v;
  const vs=bars.map(x=>x.volume).filter(x=>Number.isFinite(x)&&x>0);
  return vs.length?vs.at(-1):NaN;
}
function relVolume(bars){
  const v=bars.slice(-21).map(x=>x.volume).filter(x=>Number.isFinite(x)&&x>0);
  if(v.length<5)return NaN;
  const avg=v.slice(0,-1).reduce((a,b)=>a+b,0)/Math.max(1,v.length-1);
  return avg?v.at(-1)/avg:NaN;
}
function trendOf(r,bars){
  const text=[r?.trend,r?.plan?.trend,r?.analysis?.emaState,r?.status?.label,r?.why].filter(Boolean).join(' ').toLowerCase();
  if(/alcista|bull|long|compra/.test(text))return{key:'bull',label:'ALCISTA'};
  if(/bajista|bear|short|venta/.test(text))return{key:'bear',label:'BAJISTA'};
  const c=bars.slice(-21).map(x=>x.close);
  if(c.length>5&&c[0]){
    const p=(c.at(-1)/c[0]-1)*100;
    if(p>=2)return{key:'bull',label:'ALCISTA'};
    if(p<=-2)return{key:'bear',label:'BAJISTA'};
  }
  return{key:'neutral',label:'NEUTRAL'};
}
function setupOf(r){
  const x=String(r?.setup||r?.analysis?.breakType||'').trim();
  if(x)return x;
  const k=String(r?.status?.kind||'').toLowerCase();
  if(k==='buy')return'Confirmación técnica';
  if(k==='near')return'En zona técnica';
  if(k==='sell')return'Estructura bajista';
  return'Esperar confirmación';
}
function techScoreOf(r){
  const n=num(r?.status?.oppScore??r?.plan?.score??r?.rfScore??r?.score);
  if(Number.isFinite(n))return clamp(n,0,100);
  const k=String(r?.status?.kind||'').toLowerCase();
  return k==='buy'?82:k==='near'?68:k==='wait'?48:k==='sell'?22:35;
}
function volatilityRisk(type,bars){
  const base={crypto:76,cedear:55,argstock:64,adr:54,stock:44,equity:52,argbond:60,bill:25}[type]??52;
  const c=bars.slice(-31).map(x=>x.close).filter(Number.isFinite),rets=[];
  for(let i=1;i<c.length;i++)if(c[i-1]>0)rets.push((c[i]/c[i-1]-1)*100);
  if(rets.length<5)return base;
  const mean=rets.reduce((a,b)=>a+b,0)/rets.length;
  const sd=Math.sqrt(rets.reduce((a,b)=>a+(b-mean)*(b-mean),0)/rets.length);
  return clamp(base+(sd-2)*5,15,92);
}
function contextScore(type){
  const st=gst();if(!st?.markets)return 50;
  const day=m=>{
    if(Number.isFinite(num(m?.changePct)))return num(m.changePct);
    const b=(m?.bars||[]).map(x=>num(x.close)).filter(Number.isFinite);
    return b.length>1&&b.at(-2)?(b.at(-1)/b.at(-2)-1)*100:NaN;
  };
  const vix=st.markets.get('^VIX'),tnx=st.markets.get('^TNX'),dxy=st.markets.get('DX-Y.NYB'),eem=st.markets.get('EEM'),merv=st.markets.get('^MERV');
  let s=55;
  const vc=day(vix),tc=day(tnx),dc=day(dxy),ec=day(eem),mc=day(merv);
  if(Number.isFinite(vc))s-=clamp(vc*2.5,-10,10);
  if(Number.isFinite(tc))s-=clamp(tc*1.8,-8,8);
  if(Number.isFinite(dc))s-=clamp(dc*1.4,-6,6);
  if(Number.isFinite(ec))s+=clamp(ec*2.2,-9,9);
  if(['argstock','argbond','bill','cedear'].includes(type)&&Number.isFinite(mc))s+=clamp(mc*1.8,-10,10);
  return clamp(s,20,88);
}
function metaOf(type,r){
  const base=TYPE_META[type]||[type||'Activo','Mercado','s/d'];
  const panel=r?.item?.panel||{};
  const ccy=String(panel.denominationCcy||panel.currency||base[2]||'s/d').toUpperCase();
  return{classLabel:base[0],market:base[1],currency:ccy};
}
function compactVolume(v){
  if(!Number.isFinite(v))return's/d';
  if(v>=1e9)return fmt(v/1e9,1)+'B';
  if(v>=1e6)return fmt(v/1e6,1)+'M';
  if(v>=1e3)return fmt(v/1e3,1)+'K';
  return fmt(v,0);
}
function riskLabel(n){return n<40?['BAJO','low']:n<67?['MODERADO','mid']:['ALTO','high']}
function horizonOf(type,kind){
  if(type==='argbond'||type==='bill')return kind==='buy'?'MEDIO':'MEDIO / ESPERAR';
  if(kind==='buy')return'CORTO';
  if(kind==='near')return'CORTO / ESPERAR';
  return'ESPERAR';
}
function statusOf(kind,score){
  if(kind==='buy')return{label:'OPORTUNIDAD',cls:'buy'};
  if(kind==='near')return{label:'POSIBLE',cls:'near'};
  if(kind==='sell')return{label:'EVITAR',cls:'avoid'};
  return{label:'SEGUIMIENTO',cls:'watch'};
}
function labelOf(r,symbol){
  return String(r?.item?.label||r?.item?.panel?.description||r?.item?.panel?.securityDescription||symbol);
}
function dedupeResults(){
  const legacy=[
    ...(gst()?.opportunityLeaders||[]),
    ...(daily()?.results||[]),
    ...(daily()?.rf||[]),
    ...directCandidates,
    ...globalMarketCandidates(),
    ...universeCandidates()
  ].filter(r=>r?.item?.symbol&&typeOf(r)!=='cedear');
  const pool=[...legacy,...cedearCandidates].filter(r=>r?.item?.symbol);
  const map=new Map();
  for(const r of pool){
    const symbol=symbolOf(r),type=typeOf(r);
    if(!symbol)continue;
    const key=type+'|'+symbol,n=techScoreOf(r),old=map.get(key);
    const oldLen=barsOf(old||{}).length,newLen=barsOf(r).length;
    const oldFull=oldLen>=200,newFull=newLen>=200;
    if(!old||(newFull&&!oldFull)||(newFull===oldFull&&newLen>oldLen+25)||(newFull===oldFull&&Math.abs(newLen-oldLen)<=25&&n>techScoreOf(old)))map.set(key,r);
  }
  return[...map.values()];
}
function normalize(){
  let items=dedupeResults().map(r=>{
    const symbol=symbolOf(r),type=typeOf(r),bars=barsOf(r),context=contextScore(type),risk=volatilityRisk(type,bars),volume=volumeOf(r,bars),rv=relVolume(bars),meta=metaOf(type,r),change=changeOf(r,bars);
    const equityLike=!['argbond','bill','bond'].includes(type);
    const advanced=equityLike&&bars.length>=55?technicalEngine(bars,context):null;
    const kind=advanced?.kind||String(r?.status?.kind||'wait').toLowerCase();
    const trend=advanced?{key:advanced.trend==='ALCISTA'?'bull':advanced.trend==='BAJISTA'?'bear':'neutral',label:advanced.trend}:trendOf(r,bars);
    const tech=advanced?.analysis?.technicalScore??techScoreOf(r);
    const setup=advanced?.setup||setupOf(r);
    const why=String(advanced?.reason||r?.why||r?.reason||r?.status?.reason||'').replace(/\s+/g,' ').trim();
    return{raw:r,key:type+'|'+symbol,symbol,type,label:labelOf(r,symbol),bars,kind,trend,tech,risk,context,volume,rv,meta,change,price:priceOf(r),setup,why,advanced:advanced?.analysis||r?.analysis||null};
  });
  const groups=new Map();
  for(const x of items){if(!groups.has(x.type))groups.set(x.type,[]);groups.get(x.type).push(x)}
  for(const group of groups.values()){
    const valid=group.filter(x=>Number.isFinite(x.volume)).sort((a,b)=>b.volume-a.volume);
    valid.forEach((x,i)=>{x.liquidity=valid.length===1?82:clamp(95-i*(50/Math.max(1,valid.length-1)),45,95)});
    group.filter(x=>!Number.isFinite(x.volume)).forEach(x=>x.liquidity=45);
  }
  items.forEach(x=>{
    if(x.advanced?.engine==='TA-v3'){
      x.score=clamp(Math.round(x.advanced.total),0,100);
      x.kind=x.advanced.gates?.trend&&x.advanced.gates?.setup&&x.advanced.gates?.momentum&&x.advanced.gates?.volume&&x.advanced.gates?.rr&&x.advanced.gates?.notExtended&&x.score>=72?'buy':x.kind;
    }else{
      const boost=x.kind==='buy'?8:x.kind==='near'?3:x.kind==='sell'?-28:x.kind==='none'?-16:-4;
      const trendBoost=x.trend.key==='bull'?5:x.trend.key==='bear'?-10:0;
      x.score=clamp(Math.round(x.tech*.56+x.liquidity*.12+(100-x.risk)*.14+x.context*.18+boost+trendBoost),0,100);
    }
    x.status=statusOf(x.kind,x.score);
    x.riskMeta=riskLabel(x.risk);
    x.horizon=horizonOf(x.type,x.kind);
    x.reason=x.why||[x.setup,x.trend.label,'técnica '+Math.round(x.tech)+'/100','liquidez '+Math.round(x.liquidity)+'/100'].join(' · ');
  });
  return items.sort((a,b)=>b.score-a.score||b.tech-a.tech);
}
function visible(){
  let out=[...rows];
  if(typeFilter!=='all'){
    if(typeFilter==='usa')out=out.filter(x=>x.type==='stock'||x.type==='adr');
    else if(typeFilter==='bond')out=out.filter(x=>x.type==='argbond'||x.type==='bill');
    else out=out.filter(x=>x.type===typeFilter);
  }
  if(signalFilter!=='all')out=out.filter(x=>x.status.cls===signalFilter);
  if(riskFilter==='elevated')out=out.filter(x=>x.risk>=50);
  if(search){const z=search.toLowerCase();out=out.filter(x=>[x.symbol,x.label,x.meta.classLabel,x.meta.market].some(v=>String(v).toLowerCase().includes(z)))}
  return out;
}
function summary(){
  const invest=[...rows],buy=invest.filter(x=>x.status.cls==='buy').length,near=invest.filter(x=>x.status.cls==='near').length,watch=invest.filter(x=>x.status.cls==='watch').length,avoid=invest.filter(x=>x.status.cls==='avoid').length;
  const avg=invest.length?Math.round(invest.reduce((a,b)=>a+b.risk,0)/invest.length):0;
  return{invest,buy,near,watch,avoid,avg};
}
function mount(){
  if($('rtTopOpportunities'))return;
  installStyles();
  const el=document.createElement('section');el.id='rtTopOpportunities';el.hidden=true;
  el.innerHTML=
'<header class="rto-topbar"><div id="rtoBrand" class="rto-brand"></div><nav class="rto-nav">'+
'<button data-rto-nav="global">Visión Global</button><button data-rto-nav="europe">Europa</button><button data-rto-nav="northamerica">EE.UU.</button><button data-rto-nav="latam">LatAm</button><button data-rto-nav="markets">Mercados</button><button data-rto-nav="sectors">Sectores</button><button data-rto-nav="watchlist">Watchlist</button><button class="active">Oportunidades</button>'+
'</nav><label class="rto-search"><span>⌕</span><input id="rtoSearch" placeholder="Buscar activo, ticker o mercado..."></label><div class="rto-live"><i></i>Ranking con datos reales</div><div class="rto-clock"><b id="rtoClock">--:--:--</b><small id="rtoDate">—</small></div></header>'+
'<section class="rto-hero"><div class="rto-hero-copy"><div class="rto-hero-icon">◆</div><div><h1>Top de Oportunidades</h1><p>Activos donde el Radar detecta mejor combinación de <b>señal técnica, liquidez, riesgo y contexto</b>. Oportunidad no equivale a recomendación automática.</p></div></div><div class="rto-hero-actions"><button id="rtoRefresh" class="rto-btn primary">↻ Actualizar ranking</button><button id="rtoBack" class="rto-btn">← Volver a Watchlist</button></div></section>'+
'<section id="rtoKpis" class="rto-kpis"></section>'+
'<section class="rto-toolbar"><div id="rtoFilters" class="rto-filters"></div><div id="rtoSignalFilters" class="rto-signal-filters"></div><button id="rtoMethodBtn" class="rto-btn">Cómo se ordena</button></section>'+
'<section id="rtoProgress" class="rto-progress" hidden></section>'+
'<main class="rto-main"><section class="rto-panel"><div class="rto-table-wrap"><table class="rto-table"><thead><tr><th style="width:42px">#</th><th style="width:170px">ACTIVO / TICKER</th><th style="width:120px">MERCADO</th><th style="width:92px">ÚLTIMO</th><th style="width:74px">VAR. %</th><th style="width:120px">TENDENCIA (1D)</th><th style="width:120px">SETUP</th><th style="width:92px">CONVICCIÓN</th><th style="width:98px">ESTADO</th><th style="width:110px">ACCIÓN SUGERIDA</th><th>COMENTARIO</th></tr></thead><tbody id="rtoRows"></tbody></table></div></section>'+
'<aside class="rto-side"><section class="rto-card"><header><h2>Activo seleccionado</h2><span id="rtoSelectedRank">—</span></header><div id="rtoSelected" class="rto-selected"></div></section><section class="rto-card"><header><h2>Plan de decisión</h2><span>sin ejecución automática</span></header><div id="rtoPlan" class="rto-plan"></div></section><section class="rto-card"><header><h2>Qué significa “Top”</h2><span>metodología</span></header><div id="rtoMethod" class="rto-method"></div></section></aside></main>';
  document.body.appendChild(el);
  const src=q('#rtWatchlistWorkstation .rtw-brand-official');
  if(src&&$('rtoBrand'))$('rtoBrand').style.backgroundImage=getComputedStyle(src).backgroundImage;
  bind();
}
function bind(){
  $('rtoBack')?.addEventListener('click',back);
  $('rtoRefresh')?.addEventListener('click',()=>refresh(true));
  $('rtoSearch')?.addEventListener('input',e=>{search=e.currentTarget.value.trim();riskFilter='all';renderKpis();renderTableAndDetail()});
  $('rtoMethodBtn')?.addEventListener('click',()=>{const m=$('rtoMethod');if(m)m.scrollIntoView({behavior:'smooth',block:'center'})});
  q('[data-rto-nav="watchlist"]')?.addEventListener('click',back);
  for(const key of ['global','europe','northamerica','latam','markets','sectors']){
    q('[data-rto-nav="'+key+'"]')?.addEventListener('click',()=>navigate(key));
  }
}
function navigate(key){
  close();
  window.RadarWatchlistWorkstation?.close?.();
  if(key==='global'){q('[data-rt-nav="global"]')?.click();return}
  if(['europe','northamerica','latam'].includes(key)){global()?.selectRegion?.(key);setTimeout(()=>$('rtRegionOpen')?.click(),80);return}
  if(key==='markets'){q('[data-rt-nav="markets"]')?.click();return}
  if(key==='sectors'){q('[data-rt-nav="sectors"]')?.click();return}
}
function render(){
  if($('rtTopOpportunities')?.hidden)return;
  rows=normalize();
  if(!selected||!rows.some(x=>x.key===selected))selected=rows.find(x=>x.kind!=='sell')?.key||rows[0]?.key||'';
  renderKpis();renderFilters();renderTableAndDetail();renderCedearProgress();tick();
}
function renderKpis(){
  const s=summary(),tone=s.avg<40?'good':s.avg<67?'warn':'bad',risk=riskLabel(s.avg)[0];
  const active=k=>k==='risk'?riskFilter==='elevated':k==='all'?(signalFilter==='all'&&riskFilter==='all'&&typeFilter==='all'&&!search):signalFilter===k;
  $('rtoKpis').innerHTML=
'<article tabindex="0" role="button" data-rto-kpi="buy" class="rto-kpi good '+(active('buy')?'active':'')+'"><i>✓</i><div><small>OPORTUNIDADES FUERTES</small><strong>'+s.buy+'</strong><span>Ver señales confirmadas con score suficiente</span></div></article>'+
'<article tabindex="0" role="button" data-rto-kpi="near" class="rto-kpi warn '+(active('near')?'active':'')+'"><i>◈</i><div><small>POSIBLES</small><strong>'+s.near+'</strong><span>Ver activos cerca de condición válida</span></div></article>'+
'<article tabindex="0" role="button" data-rto-kpi="watch" class="rto-kpi '+(active('watch')?'active':'')+'"><i>◎</i><div><small>EN SEGUIMIENTO</small><strong>'+s.watch+'</strong><span>Ver activos que esperan confirmación</span></div></article>'+
'<article tabindex="0" role="button" data-rto-kpi="risk" class="rto-kpi '+tone+' '+(active('risk')?'active':'')+'"><i>◴</i><div><small>RIESGO PROMEDIO</small><strong>'+risk+'</strong><span>Ver candidatos con riesgo moderado/alto · '+s.avg+'/100</span></div></article>'+
'<article tabindex="0" role="button" data-rto-kpi="all" class="rto-kpi '+(active('all')?'active':'')+'"><i>▦</i><div><small>COBERTURA DEL RANKING</small><strong>'+s.invest.length+'</strong><span>Mostrar nuevamente todo el universo cubierto</span></div></article>';
  qa('[data-rto-kpi]').forEach(card=>{
    const apply=()=>applyKpiFilter(card.dataset.rtoKpi);
    card.addEventListener('click',apply);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();apply()}});
  });
}
function applyKpiFilter(kind){
  typeFilter='all';
  search='';
  if($('rtoSearch'))$('rtoSearch').value='';
  if(kind==='risk'){
    signalFilter='all';
    riskFilter='elevated';
  }else if(kind==='all'){
    signalFilter='all';
    riskFilter='all';
  }else{
    signalFilter=kind;
    riskFilter='all';
  }
  renderKpis();
  renderFilters();
  renderTableAndDetail();
}
function renderFilters(){
  const count=t=>rows.filter(x=>t==='usa'?(x.type==='stock'||x.type==='adr'):t==='bond'?(x.type==='argbond'||x.type==='bill'):x.type===t).length;
  const defs=[['all','Todos',rows.length],['crypto','Crypto',count('crypto')],['cedear','CEDEAR',cedearLoading?(cedearProgress.eligible+'/'+(cedearProgress.total||'…')):count('cedear')],['argstock','Acciones AR',count('argstock')],['usa','EE.UU. / ADR',count('usa')],['bond','Bonos / Letras',count('bond')]];
  $('rtoFilters').innerHTML=defs.map(x=>'<button data-rto-filter="'+x[0]+'" class="'+(typeFilter===x[0]?'active':'')+'">'+x[1]+' <span>('+x[2]+')</span></button>').join('');
  const sig=[['all','Todas'],['buy','Oportunidad'],['near','Posible'],['watch','Seguimiento'],['avoid','Evitar']];
  $('rtoSignalFilters').innerHTML=sig.map(x=>'<button data-rto-signal="'+x[0]+'" class="'+(signalFilter===x[0]?'active':'')+'">'+x[1]+'</button>').join('');
  qa('[data-rto-filter]').forEach(b=>b.addEventListener('click',async()=>{
    typeFilter=b.dataset.rtoFilter;riskFilter='all';renderKpis();renderFilters();renderTableAndDetail();
    if(typeFilter==='cedear'){
      refreshCedearCandidates(false);
      renderCedearProgress();
    }
  }));
  qa('[data-rto-signal]').forEach(b=>b.addEventListener('click',()=>{signalFilter=b.dataset.rtoSignal;riskFilter='all';renderKpis();renderFilters();renderTableAndDetail()}));
}
function rtoFlag(x){
  const c=['cedear','argstock','argbond','bill'].includes(x.type)?'AR':['stock','adr'].includes(x.type)?'US':'GL';
  if(c==='AR')return '<svg viewBox="0 0 28 18"><rect width="28" height="18" fill="#74acdf"/><rect y="6" width="28" height="6" fill="#fff"/><circle cx="14" cy="9" r="2" fill="#f6b40e"/></svg>';
  if(c==='US')return '<svg viewBox="0 0 28 18"><rect width="28" height="18" fill="#fff"/><g fill="#b22234"><rect y="0" width="28" height="2"/><rect y="4" width="28" height="2"/><rect y="8" width="28" height="2"/><rect y="12" width="28" height="2"/><rect y="16" width="28" height="2"/></g><rect width="12" height="10" fill="#3c3b6e"/></svg>';
  return '<svg viewBox="0 0 28 18"><rect width="28" height="18" rx="2" fill="#0b3950"/><circle cx="14" cy="9" r="5" fill="none" stroke="#36d8ff"/><path d="M5 9h18M14 2v14" stroke="#36d8ff"/></svg>';
}
function rtoSpark(x,w=95,h=25){
  const v=(x.bars||[]).slice(-20).map(b=>num(b.close)).filter(Number.isFinite);
  if(v.length<2)return'<span class="rto-nodata">s/d</span>';
  const lo=Math.min(...v),hi=Math.max(...v),span=hi-lo||1,p=2;
  const d=v.map((n,i)=>{const xx=p+i*(w-2*p)/(v.length-1),yy=h-p-(n-lo)*(h-2*p)/span;return(i?'L':'M')+xx.toFixed(1)+','+yy.toFixed(1)}).join(' ');
  const down=v.at(-1)<v[0];
  return'<svg class="rto-spark '+(down?'down':'')+'" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><path class="area" d="'+d+' L'+(w-2)+','+(h-2)+' L2,'+(h-2)+'Z"/><path class="line" d="'+d+'"/></svg>';
}
function rtoScoreRing(n){
  const v=clamp(Math.round(num(n)||0),0,100),cls=v>=70?'good':v>=50?'mid':'bad';
  return'<span class="rto-score-ring '+cls+'" style="--score:'+v+'"><b>'+v+'</b></span>';
}
function rtoSetupClass(x){
  const z=String(x||'').toUpperCase();
  return z==='ALCISTA'||z.includes('RUPTURA')||z.includes('TENDENCIA ALCISTA')?'good':z.includes('BAJISTA')||z.includes('PRESIÓN')||z.includes('PÉRDIDA')?'bad':'neutral';
}
function actionFor(x){
  if(x.status.cls==='buy')return['COMPRAR','buy'];
  if(x.status.cls==='near')return['ESPERAR','watch'];
  if(x.status.cls==='avoid')return['EVITAR','sell'];
  return['SEGUIR','hold'];
}
function commentFor(x){
  if(x.advanced?.engine==='TA-v3'){
    const i=x.advanced.indicators||{};
    return x.status.cls==='buy'
      ?'Compra válida: tendencia D/W, setup, momentum, volumen y R/R confirmados.'
      :x.status.cls==='near'
        ?'Candidato técnico, pero todavía falta una confirmación para comprar.'
        :x.status.cls==='avoid'
          ?'No comprar: estructura/R/R o tendencia invalidan el long.'
          :'Seguimiento: '+(x.advanced.failures||[]).slice(0,2).join(' · ');
  }
  if(x.status.cls==='buy')return'Cumple condiciones técnicas y de liquidez; validar entrada y riesgo.';
  if(x.status.cls==='near')return'Cerca de condición válida; esperar confirmación.';
  if(x.status.cls==='avoid')return'Estructura desfavorable; no priorizar mientras no revierta.';
  return x.reason||'Sin ventaja suficiente todavía; seguir en observación.';
}
function priceText(x){
  if(!Number.isFinite(x.price))return's/d';
  const c=x.meta.currency;
  const d=x.price>=1000?0:2;
  if(c==='USD'||c==='USDT')return c+' '+fmt(x.price,d);
  if(c==='ARS')return'$ '+fmt(x.price,d);
  return fmt(x.price,d)+' '+(c==='S/D'?'':c);
}
function rowTypeClass(x){return x.type==='crypto'?'crypto':(x.type==='argbond'||x.type==='bill')?'bond':''}
function renderTableAndDetail(){
  const list=visible();
  if(list.length&&!list.some(x=>x.key===selected))selected=list[0].key;
  if(!list.length)selected='';
  const shell=$('rtTopOpportunities');
  if(shell){
    shell.dataset.signalFilter=signalFilter;
    shell.dataset.typeFilter=typeFilter;
    shell.dataset.riskFilter=riskFilter;
    shell.dataset.visibleRows=String(list.length);
  }
  $('rtoRows').innerHTML=list.length?list.map((x,i)=>{
    const rank=rows.findIndex(r=>r.key===x.key)+1,trendCls=x.trend.key,action=actionFor(x);
    return'<tr data-rto-key="'+esc(x.key)+'" data-rto-type="'+esc(x.type)+'" data-rto-volume="'+(Number.isFinite(x.volume)?x.volume:0)+'" data-rto-engine="'+esc(x.advanced?.engine||'legacy')+'" data-rto-buy-valid="'+String(!!(x.advanced?.gates?.trend&&x.advanced?.gates?.setup&&x.advanced?.gates?.momentum&&x.advanced?.gates?.volume&&x.advanced?.gates?.timing&&x.advanced?.gates?.rr&&x.advanced?.gates?.notExtended))+'" class="'+(x.key===selected?'selected':'')+'">'+
      '<td><span class="rto-rank">'+(rank>0?rank:i+1)+'</span></td>'+
      '<td><span class="rto-asset rto-asset-watch"><i>'+rtoFlag(x)+'</i><b>'+esc(x.symbol)+'</b><small>'+esc(x.label)+'</small></span></td>'+
      '<td><span class="rto-market-cell"><b>'+esc(x.meta.classLabel)+'</b><small>'+esc(x.meta.market)+' · '+esc(x.meta.currency)+'</small></span></td>'+
      '<td class="rto-num">'+priceText(x)+'</td>'+
      '<td class="rto-num '+(x.change>0?'rto-up':x.change<0?'rto-down':'rto-flat')+'">'+pct(x.change)+'</td>'+
      '<td class="rto-spark-cell">'+rtoSpark(x)+'</td>'+
      '<td><span class="rto-setup '+rtoSetupClass(x.setup)+'">'+esc(x.setup)+'</span></td>'+
      '<td>'+rtoScoreRing(x.score)+'</td>'+
      '<td><span class="rto-status '+x.status.cls+'">'+x.status.label+'</span></td>'+
      '<td><span class="rto-action '+action[1]+'">'+action[0]+'</span></td>'+
      '<td class="rto-comment" title="'+esc(x.reason)+'">'+esc(commentFor(x))+'</td></tr>';
  }).join(''):'<tr><td colspan="11" class="rto-empty">'+(cedearLoading&&typeFilter==='cedear'?'Analizando universo completo de CEDEARs con volumen…':'No hay activos que cumplan estos filtros.')+'</td></tr>';
  qa('[data-rto-key]').forEach(tr=>tr.addEventListener('click',()=>{selected=tr.dataset.rtoKey;renderTableAndDetail()}));
  renderDetail();
}
function selectedRow(){const list=visible();return list.find(x=>x.key===selected)||list[0]||null}
function renderDetail(){
  const x=selectedRow();if(!x){$('rtoSelected').innerHTML='<div class="rto-empty">Sin datos.</div>';$('rtoPlan').innerHTML='';return}
  const rank=rows.filter(r=>r.kind!=='sell').findIndex(r=>r.key===x.key)+1,risk=x.riskMeta,a=x.advanced?.engine==='TA-v3'?x.advanced:null,c=a?.components||{},i=a?.indicators||{};
  $('rtoSelectedRank').textContent=rank>0?'#'+rank+' del ranking':'—';
  const metrics=a
    ?'<div class="rto-metrics rto-metrics-ta"><div class="rto-metric"><small>TENDENCIA</small><b>'+Math.round(c.trend||0)+'/20</b></div><div class="rto-metric"><small>ESTRUCTURA</small><b>'+Math.round(c.structure||0)+'/20</b></div><div class="rto-metric"><small>MOMENTUM</small><b>'+Math.round(c.momentum||0)+'/15</b></div><div class="rto-metric"><small>VOLUMEN</small><b>'+Math.round(c.volume||0)+'/10</b></div><div class="rto-metric"><small>TIMING</small><b>'+Math.round(c.timing||0)+'/15</b></div><div class="rto-metric"><small>RIESGO / BENEFICIO</small><b>'+Math.round(c.rr||0)+'/15</b></div><div class="rto-metric"><small>CONTEXTO</small><b>'+Math.round(c.context||0)+'/5</b></div></div>'
    :'<div class="rto-metrics"><div class="rto-metric"><small>SEÑAL TÉCNICA</small><b>'+Math.round(x.tech)+'/100</b></div><div class="rto-metric"><small>LIQUIDEZ RELATIVA</small><b>'+Math.round(x.liquidity)+'/100</b></div><div class="rto-metric"><small>CONTEXTO</small><b>'+Math.round(x.context)+'/100</b></div><div class="rto-metric"><small>RIESGO</small><b class="'+(risk[1]==='high'?'rto-down':risk[1]==='low'?'rto-up':'')+'">'+risk[0]+'</b></div></div>';
  const indicators=a?'<div class="rto-indicator-strip"><span>EMA 10 <b>'+fmt(i.ema10,2)+'</b></span><span>EMA 55 <b>'+fmt(i.ema55,2)+'</b></span><span>EMA 200 <b>'+fmt(i.ema200,2)+'</b></span><span>Semanal <b>'+esc(i.weeklyTrend||'s/d')+'</b></span><span>RSI 14 <b>'+fmt(i.rsi,1)+'</b></span><span>MACD hist <b>'+fmt(i.macdHist,2)+'</b></span><span>RVOL <b>'+fmt(i.relVolume,2)+'x</b></span><span>Timing <b>'+(i.lateEntry?'TARDE':'VÁLIDO')+'</b></span><span>Dist. entrada <b>'+fmt(i.entryDistancePct,1)+'%</b></span><span>R/R <b>'+fmt(i.rr,2)+'</b></span></div>':'';
  $('rtoSelected').innerHTML=
'<div class="rto-selected-top"><div><h3>'+esc(x.symbol)+'</h3><small>'+esc(x.label)+' · '+esc(x.meta.classLabel)+' · '+esc(x.meta.market)+'</small></div><span class="rto-big-score" style="--score:'+x.score+'"><b>'+x.score+'</b></span></div>'+
'<div class="rto-reason">'+esc(x.reason)+'</div>'+metrics+indicators;
  let sentence='No hay una compra válida todavía. El activo queda en seguimiento hasta que confirme tendencia, setup, momentum, volumen y R/R.';
  if(x.status.cls==='buy')sentence='OPORTUNIDAD significa compra técnicamente válida: tendencia diaria/semanal, setup, momentum, volumen y relación riesgo/beneficio están confirmados. Igual debe respetarse el stop técnico.';
  else if(x.status.cls==='near')sentence='POSIBLE significa que el activo está cerca de una compra, pero falta al menos una condición obligatoria. No conviene anticiparse.';
  else if(x.status.cls==='avoid')sentence='EVITAR significa que el long no cumple las condiciones mínimas. No es una oportunidad de compra mientras no revierta la estructura.';
  const levels=a?'<span class="rto-levels">Entrada ref. '+fmt(x.price,2)+' · Stop '+fmt(i.stop,2)+' · Objetivo '+fmt(i.target,2)+' · R/R '+fmt(i.rr,2)+'</span>':'';
  $('rtoPlan').innerHTML='<div class="rto-plan-state '+x.status.cls+'">'+x.status.label+'</div><p>'+sentence+'</p>'+levels+'<div class="rto-plan-actions"><button id="rtoAnalyze">Ver análisis completo</button><button id="rtoWatchBack">Volver a Watchlist</button></div>';
  $('rtoAnalyze')?.addEventListener('click',()=>analyze(x));
  $('rtoWatchBack')?.addEventListener('click',back);
  $('rtoMethod').innerHTML='<b>Motor técnico TA-v3.</b> OPORTUNIDAD equivale a candidato de compra y no se obtiene sólo por score. Deben pasar simultáneamente los filtros obligatorios de tendencia diaria/semanal, setup, momentum, volumen, timing de entrada, R/R ≥ 1,5 y no estar sobreextendido.<span class="formula">Score 100 = Tendencia 20 + Estructura/Setup 20 + Momentum 15 + Volumen 10 + Timing de entrada 15 + Riesgo/Beneficio 15 + Contexto 5. OPORTUNIDAD sólo existe en ruptura fresca o pullback confirmado; si el precio ya se alejó del trigger/EMA, queda en SEGUIMIENTO como entrada tardía. EMA 10/55/200 define tendencia; MACD + RSI validan momentum; RVOL confirma participación; soporte/objetivo determinan el R/R.</span>';
}
function analyze(x){
  close();
  window.RadarWatchlistWorkstation?.close?.();
  if((x.type==='argbond'||x.type==='bill')&&typeof window.loadBondAnalysis==='function'){window.loadBondAnalysis(x.symbol,'argbond');return}
  if(typeof window.openScanResult==='function'){window.openScanResult(x.symbol,x.type,'short');return}
  const input=$('symbol');if(input)input.value=x.symbol;
  const type=$('assetType');if(type)type.value=x.type||'auto';
  $('analyzeBtn')?.click();
}
async function refresh(force){
  if(refreshing)return;refreshing=true;
  const b=$('rtoRefresh');if(b){b.disabled=true;b.textContent='Actualizando…'}
  try{
    await global()?.refresh?.(!!force);
    await refreshDirectCandidates(!!force);
    if(typeFilter==='cedear'||force)await refreshCedearCandidates(!!force);
    if(window.RadarDailyRadar?.run){
      try{await window.RadarDailyRadar.run(!!force)}catch(e){console.warn('Daily Radar no disponible para ranking',e)}
    }
  }catch(e){
    await refreshDirectCandidates(!!force).catch(()=>{});
    window.radarNotify?.('Actualización parcial del ranking: '+(e?.message||e),'warn');
  }
  finally{refreshing=false;if(b){b.disabled=false;b.textContent='↻ Actualizar ranking'}render()}
}
function tick(){
  const now=new Date();
  if($('rtoClock'))$('rtoClock').textContent=now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'});
  if($('rtoDate'))$('rtoDate').textContent=new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'America/Argentina/Buenos_Aires'}).format(now).replaceAll('.','');
}
function open(){
  mount();
  const el=$('rtTopOpportunities');if(!el)return;
  window.RadarWatchlistWorkstation?.close?.();
  el.hidden=false;document.body.classList.add('rto-open');render();tick();
  if(!cedearCandidates.length||Date.now()-cedearLoadedAt>=5*60*1000)refreshCedearCandidates(false);
  const d=daily();if(!rows.length||!d?.lastRun||!directCandidates.length)refresh(false);
}
function close(){
  const el=$('rtTopOpportunities');if(el)el.hidden=true;
  document.body.classList.remove('rto-open');
}
function back(){close();window.RadarWatchlistWorkstation?.open?.()}
document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-rtw-scroll="table"]');
  if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();open();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('rtTopOpportunities')?.hidden)back()});
setInterval(()=>{if(!$('rtTopOpportunities')?.hidden)tick()},1000);
window.RadarTopOpportunities=Object.freeze({open,close,render,refresh,evaluateTechnical:(bars,context=50)=>technicalEngine(bars,context)});
})();

/* Radar Técnico · Official Brand Invariant */
(()=>{
'use strict';
if(window.RadarOfficialBrand?.version==='1.0.0')return;

const VERSION='1.0.0';
const TAGLINE='MERCADOS GLOBALES. SEÑALES REALES. MEJORES DECISIONES.';
const MARKUP=`
  <div class="rt-logo" aria-hidden="true">
    <svg viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="20"/>
      <circle cx="24" cy="24" r="14"/>
      <circle cx="24" cy="24" r="7"/>
      <path d="M24 1v46M1 24h46"/>
      <path class="sweep" d="M24 24 40 8"/>
      <circle class="dot" cx="24" cy="24" r="2.2"/>
    </svg>
  </div>
  <div class="rt-brand-copy">
    <b>Radar Técnico</b>
    <small>${TAGLINE}</small>
  </div>`;

function installStyles(){
  if(document.getElementById('rtOfficialBrandStyles'))return;
  const style=document.createElement('style');
  style.id='rtOfficialBrandStyles';
  style.textContent=`
    /* One brand identity everywhere: exact artwork/copy from Visión Global. */
    .rt-brand-official-shell{
      display:flex!important;
      align-items:center!important;
      gap:12px!important;
      min-width:0!important;
      background-image:none!important;
      background-color:transparent!important;
      box-shadow:none!important;
      border:0!important;
    }
    .rt-brand-official-shell>.rt-logo{
      width:46px!important;height:46px!important;min-width:46px!important;
      display:grid!important;place-items:center!important;position:relative!important;
      color:#2bb7ff!important;background:none!important;border:0!important;
    }
    .rt-brand-official-shell>.rt-logo svg{
      width:46px!important;height:46px!important;overflow:visible!important;
      fill:none!important;stroke:currentColor!important;stroke-width:1.35!important;
      filter:drop-shadow(0 0 5px rgba(34,174,255,.38))!important;
    }
    .rt-brand-official-shell>.rt-logo svg circle:nth-child(1){stroke-width:1.8!important;fill:none!important}
    .rt-brand-official-shell>.rt-logo svg circle:nth-child(2){opacity:.78!important;fill:none!important}
    .rt-brand-official-shell>.rt-logo svg circle:nth-child(3){opacity:.9!important;fill:none!important}
    .rt-brand-official-shell>.rt-logo svg path{opacity:.72!important}
    .rt-brand-official-shell>.rt-logo svg .sweep{stroke:#68ceff!important;stroke-width:1.7!important;opacity:.85!important}
    .rt-brand-official-shell>.rt-logo svg .dot{fill:#33baff!important;stroke:none!important;opacity:1!important}
    .rt-brand-official-shell>.rt-brand-copy{
      display:flex!important;flex-direction:column!important;justify-content:center!important;
      min-width:0!important;line-height:1!important
    }
    .rt-brand-official-shell>.rt-brand-copy>b{
      display:block!important;margin:0!important;padding:0!important;
      font:770 27px/1 "Roboto Condensed","Arial Narrow","Segoe UI",Arial,sans-serif!important;
      letter-spacing:-.025em!important;color:#e1edf7!important;white-space:nowrap!important;
      text-shadow:none!important
    }
    .rt-brand-official-shell>.rt-brand-copy>small{
      display:block!important;margin:5px 0 0!important;padding:0!important;
      font:500 9px/1.2 "Roboto Condensed","Arial Narrow","Segoe UI",Arial,sans-serif!important;
      letter-spacing:.05em!important;color:#9bb0c0!important;white-space:nowrap!important;
      text-transform:none!important
    }

    /* Full-screen workstations use the same identity, slightly fitted to their header width. */
    #rtRegionalDecisionCenter .rt-brand-official-shell,
    #rtWatchlistWorkstation .rt-brand-official-shell,
    #rtTopOpportunities .rt-brand-official-shell{
      height:54px!important;width:auto!important;
    }
    #rtRegionalDecisionCenter .rt-brand-official-shell>.rt-logo,
    #rtWatchlistWorkstation .rt-brand-official-shell>.rt-logo,
    #rtTopOpportunities .rt-brand-official-shell>.rt-logo{
      width:42px!important;height:42px!important;min-width:42px!important
    }
    #rtRegionalDecisionCenter .rt-brand-official-shell>.rt-logo svg,
    #rtWatchlistWorkstation .rt-brand-official-shell>.rt-logo svg,
    #rtTopOpportunities .rt-brand-official-shell>.rt-logo svg{
      width:42px!important;height:42px!important
    }
    #rtRegionalDecisionCenter .rt-brand-official-shell>.rt-brand-copy>b,
    #rtWatchlistWorkstation .rt-brand-official-shell>.rt-brand-copy>b,
    #rtTopOpportunities .rt-brand-official-shell>.rt-brand-copy>b{
      font-size:23px!important
    }
    #rtRegionalDecisionCenter .rt-brand-official-shell>.rt-brand-copy>small,
    #rtWatchlistWorkstation .rt-brand-official-shell>.rt-brand-copy>small,
    #rtTopOpportunities .rt-brand-official-shell>.rt-brand-copy>small{
      font-size:7.5px!important;margin-top:4px!important;letter-spacing:.035em!important
    }

    /* Legacy/sidebar screens keep exactly the same artwork and wording in compact form. */
    #appSidebar .sidebar-brand.rt-brand-official-shell{
      height:auto!important;padding:12px 10px!important;gap:9px!important;
      align-items:center!important
    }
    #appSidebar .sidebar-brand.rt-brand-official-shell>.rt-logo{
      width:34px!important;height:34px!important;min-width:34px!important
    }
    #appSidebar .sidebar-brand.rt-brand-official-shell>.rt-logo svg{
      width:34px!important;height:34px!important
    }
    #appSidebar .sidebar-brand.rt-brand-official-shell>.rt-brand-copy>b{
      font-size:15px!important
    }
    #appSidebar .sidebar-brand.rt-brand-official-shell>.rt-brand-copy>small{
      font-size:6px!important;margin-top:3px!important;letter-spacing:.02em!important
    }

    @media(max-width:1450px){
      #rtRegionalDecisionCenter .rt-brand-official-shell,
      #rtWatchlistWorkstation .rt-brand-official-shell,
      #rtTopOpportunities .rt-brand-official-shell{gap:8px!important}
      #rtRegionalDecisionCenter .rt-brand-official-shell>.rt-logo,
      #rtWatchlistWorkstation .rt-brand-official-shell>.rt-logo,
      #rtTopOpportunities .rt-brand-official-shell>.rt-logo{
        width:36px!important;height:36px!important;min-width:36px!important
      }
      #rtRegionalDecisionCenter .rt-brand-official-shell>.rt-logo svg,
      #rtWatchlistWorkstation .rt-brand-official-shell>.rt-logo svg,
      #rtTopOpportunities .rt-brand-official-shell>.rt-logo svg{
        width:36px!important;height:36px!important
      }
      #rtRegionalDecisionCenter .rt-brand-official-shell>.rt-brand-copy>b,
      #rtWatchlistWorkstation .rt-brand-official-shell>.rt-brand-copy>b,
      #rtTopOpportunities .rt-brand-official-shell>.rt-brand-copy>b{
        font-size:19px!important
      }
      #rtRegionalDecisionCenter .rt-brand-official-shell>.rt-brand-copy>small,
      #rtWatchlistWorkstation .rt-brand-official-shell>.rt-brand-copy>small,
      #rtTopOpportunities .rt-brand-official-shell>.rt-brand-copy>small{
        font-size:6.2px!important
      }
    }
  `;
  document.head.appendChild(style);
}

function isOfficial(el){
  if(!el)return false;
  const title=el.querySelector(':scope > .rt-brand-copy > b')?.textContent?.trim();
  const tagline=el.querySelector(':scope > .rt-brand-copy > small')?.textContent?.trim();
  const logo=el.querySelector(':scope > .rt-logo svg .sweep');
  return title==='Radar Técnico'&&tagline===TAGLINE&&!!logo;
}
function normalizeOne(el){
  if(!el)return;
  el.classList.add('rt-brand-official-shell');
  el.setAttribute('aria-label','Radar Técnico · '+TAGLINE);
  if(!isOfficial(el))el.innerHTML=MARKUP;
  el.dataset.radarBrand='official-v1';
}
function normalizeAll(){
  installStyles();
  /* Global is the source of truth and already uses this exact markup. */
  document.querySelectorAll(
    '#rtGlobalAppbar .rt-brand, #rtRegionalDecisionCenter .rdc-brand, #rtWatchlistWorkstation .rtw-brand-official, #rtTopOpportunities .rto-brand, #appSidebar .sidebar-brand'
  ).forEach(normalizeOne);
}
function audit(){
  const targets=[
    ['Visión Global','#rtGlobalAppbar .rt-brand'],
    ['Regional','#rtRegionalDecisionCenter .rdc-brand'],
    ['Watchlist','#rtWatchlistWorkstation .rtw-brand-official'],
    ['Top Oportunidades','#rtTopOpportunities .rto-brand'],
    ['Sistema clásico','#appSidebar .sidebar-brand']
  ];
  return targets.map(([screen,selector])=>{
    const el=document.querySelector(selector);
    return{screen,present:!!el,official:!el||isOfficial(el)};
  });
}
function boot(){
  normalizeAll();
  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{queued=false;normalizeAll()});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',normalizeAll,{once:true});
  setTimeout(normalizeAll,0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.RadarOfficialBrand=Object.freeze({version:VERSION,normalize:normalizeAll,audit,markup:()=>MARKUP});
})();
