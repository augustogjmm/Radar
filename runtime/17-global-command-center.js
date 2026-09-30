/* Radar Técnico · Global Command Center
   Visual implementation of the approved global-market dashboard.
   Uses Radar's existing local APIs and analytical engines; no fabricated market values. */
(()=>{
'use strict';

const VERSION='1.0.0';
const $=id=>document.getElementById(id);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:NaN};
const fmt=(v,d=2)=>Number.isFinite(num(v))?new Intl.NumberFormat('es-AR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(num(v)):'—';
const pct=v=>Number.isFinite(num(v))?`${num(v)>=0?'+':''}${fmt(v,2)}%`:'—';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const median=a=>{const x=a.filter(Number.isFinite).sort((a,b)=>a-b);if(!x.length)return NaN;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2};

const state={
  loading:false,lastUpdate:0,markets:new Map(),selectedRegion:'europe',filter:'all',
  sessionTimer:null,renderTimer:null
};

const ASSETS=[
  {id:'sp500',symbol:'^GSPC',name:'S&P 500',region:'northamerica',flag:'🇺🇸',decimals:1},
  {id:'nasdaq',symbol:'^IXIC',name:'NASDAQ',region:'northamerica',flag:'🇺🇸',decimals:1},
  {id:'dow',symbol:'^DJI',name:'DOW JONES',region:'northamerica',flag:'🇺🇸',decimals:1},
  {id:'vix',symbol:'^VIX',name:'VIX',region:'global',flag:'⚡',decimals:1},
  {id:'tnx',symbol:'^TNX',name:'US 10Y',region:'global',flag:'🏛',decimals:2},
  {id:'dxy',symbol:'DX-Y.NYB',name:'DXY',region:'global',flag:'$',decimals:2},
  {id:'wti',symbol:'CL=F',name:'WTI',region:'global',flag:'◉',decimals:2},
  {id:'eem',symbol:'EEM',name:'Emergentes',region:'global',flag:'◈',decimals:2},

  {id:'dax',symbol:'^GDAXI',name:'DAX',region:'europe',flag:'🇩🇪',decimals:1},
  {id:'ftse',symbol:'^FTSE',name:'FTSE 100',region:'europe',flag:'🇬🇧',decimals:1},
  {id:'cac',symbol:'^FCHI',name:'CAC 40',region:'europe',flag:'🇫🇷',decimals:1},
  {id:'stoxx',symbol:'^STOXX50E',name:'STOXX 50',region:'europe',flag:'🇪🇺',decimals:1},
  {id:'ibex',symbol:'^IBEX',name:'IBEX 35',region:'europe',flag:'🇪🇸',decimals:1},

  {id:'nikkei',symbol:'^N225',name:'NIKKEI',region:'asia',flag:'🇯🇵',decimals:1},
  {id:'hangseng',symbol:'^HSI',name:'HANG SENG',region:'asia',flag:'🇭🇰',decimals:1},
  {id:'shanghai',symbol:'000001.SS',name:'SHANGHAI',region:'asia',flag:'🇨🇳',decimals:1},

  {id:'merval',symbol:'^MERV',name:'MERVAL',region:'latam',flag:'🇦🇷',decimals:0},
  {id:'bovespa',symbol:'^BVSP',name:'BOVESPA',region:'latam',flag:'🇧🇷',decimals:0},
  {id:'mexico',symbol:'^MXX',name:'IPC MÉXICO',region:'latam',flag:'🇲🇽',decimals:0},

  {id:'asx',symbol:'^AXJO',name:'ASX 200',region:'oceania',flag:'🇦🇺',decimals:1}
];

const REGIONS={
  northamerica:{label:'América del Norte',short:'Norteamérica',ids:['sp500','nasdaq','dow'],indices:'S&P 500 · NASDAQ · DOW'},
  europe:{label:'Europa',short:'Europa',ids:['ftse','dax','cac','ibex','stoxx'],indices:'DAX · FTSE · CAC'},
  asia:{label:'Asia',short:'Asia',ids:['nikkei','hangseng','shanghai'],indices:'NIKKEI · HANG SENG'},
  latam:{label:'LatAm',short:'LatAm',ids:['merval','bovespa','mexico'],indices:'MERVAL · BOVESPA'},
  oceania:{label:'Oceanía',short:'Oceanía',ids:['asx'],indices:'ASX 200'}
};

const ASSET_BY_ID=Object.fromEntries(ASSETS.map(x=>[x.id,x]));

function insertShell(){
  if($('rtGlobalAppbar')) return;
  document.body.classList.add('rt-global-shell');
  const bar=document.createElement('header');
  bar.id='rtGlobalAppbar';
  bar.className='rt-appbar';
  bar.innerHTML=`
    <div class="rt-brand">
      <div class="rt-logo" aria-hidden="true"><i></i></div>
      <div class="rt-brand-copy"><b>Radar Técnico</b><small>MERCADOS GLOBALES. SEÑALES REALES. MEJORES DECISIONES.</small></div>
    </div>
    <nav class="rt-nav" aria-label="Navegación principal">
      <button data-rt-nav="global" class="active">Vista Global</button>
      <button data-rt-nav="argentina">Argentina</button>
      <button data-rt-nav="markets">Mercados</button>
      <button data-rt-nav="sectors">Sectores</button>
      <button data-rt-nav="screeners">Screeners</button>
      <button data-rt-nav="news">Noticias</button>
      <button data-rt-nav="reports">Reportes</button>
    </nav>
    <label class="rt-header-search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
      <input id="rtGlobalSearch" placeholder="Buscar activo, índice o ticker…" autocomplete="off">
    </label>
    <div class="rt-livebox">
      <div class="rt-dateblock"><small id="rtDateText">—</small><b id="rtClockText">--:--</b><small>(GMT-3)</small></div>
      <span class="rt-live">En tiempo real</span>
    </div>`;
  document.body.insertAdjacentElement('afterbegin',bar);
  bindShell();
  tickClock();
  state.sessionTimer=setInterval(tickClock,1000);
}

function bindShell(){
  q('[data-rt-nav="global"]')?.addEventListener('click',()=>goHome());
  q('[data-rt-nav="argentina"]')?.addEventListener('click',()=>goHome('#rtArgentinaSignals'));
  q('[data-rt-nav="markets"]')?.addEventListener('click',()=>goHome('#rtMarketSignals'));
  q('[data-rt-nav="sectors"]')?.addEventListener('click',()=>clickOriginal('scannerViewBtn'));
  q('[data-rt-nav="screeners"]')?.addEventListener('click',()=>clickOriginal('scannerViewBtn'));
  q('[data-rt-nav="news"]')?.addEventListener('click',()=>goHome('#rtRegionDetail'));
  q('[data-rt-nav="reports"]')?.addEventListener('click',()=>clickOriginal('signalsViewBtn'));
  $('rtGlobalSearch')?.addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;
    const value=e.currentTarget.value.trim();if(!value)return;
    const input=$('symbol');if(input)input.value=value;
    const type=$('assetType');if(type)type.value='auto';
    $('analyzeBtn')?.click();
  });
}

function clickOriginal(id){$(id)?.click();setActiveForView(id)}
function goHome(anchor){
  $('homeViewBtn')?.click();
  setActiveForView('homeViewBtn');
  if(anchor)setTimeout(()=>$(anchor.slice(1))?.scrollIntoView({behavior:'smooth',block:'start'}),80);
}
function setActiveForView(id){
  const key=id==='homeViewBtn'?'global':id==='scannerViewBtn'?'screeners':id==='signalsViewBtn'?'reports':null;
  qa('.rt-nav button').forEach(b=>b.classList.toggle('active',key&&b.dataset.rtNav===key));
}

function tickClock(){
  const now=new Date();
  const t=now.toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'});
  const d=now.toLocaleDateString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  if($('rtClockText'))$('rtClockText').textContent=t;
  if($('rtDateText'))$('rtDateText').textContent=d.replace('.','');
  renderSession(now);
}

function mountDashboard(){
  const dash=$('dashboardView');
  if(!dash||$('rtGlobalRadar'))return;
  const root=document.createElement('section');
  root.id='rtGlobalRadar';
  root.innerHTML=`
  <div class="rt-main-grid">
    <section class="rt-card rt-world-card">
      <div class="rt-map-head"><h2>Mapa de Sentimiento Global</h2><p>Rendimiento regional · última rueda disponible</p></div>
      <div class="rt-session-box">
        <div id="rtSessionFlag" class="rt-session-flag">🇺🇸</div>
        <div class="rt-session-copy"><small>Sesión activa</small><b id="rtSessionName">Calculando…</b></div>
        <span class="rt-session-dot"></span>
        <div class="rt-session-count"><small>Cierra en</small><b id="rtSessionCountdown">--:--:--</b></div>
      </div>
      <div id="rtNextSessions" class="rt-next-sessions"></div>
      <div class="rt-world-wrap">
        <svg class="rt-world-map" viewBox="0 0 1000 470" aria-label="Mapa mundial interactivo">
          <path id="rtRegionNorthamerica" data-region="northamerica" class="rt-continent neutral" d="M52,103 L94,69 157,58 223,83 250,120 238,157 210,171 188,207 150,211 126,184 97,167 69,137Z"/>
          <path class="rt-continent neutral" data-region="northamerica" d="M210,170 L241,175 258,195 247,214 225,207 209,188Z"/>
          <path id="rtRegionLatam" data-region="latam" class="rt-continent neutral" d="M250,213 L292,219 326,254 331,299 316,342 295,381 270,407 259,375 263,337 248,304 238,266Z"/>
          <path id="rtRegionEurope" data-region="europe" class="rt-continent neutral" d="M455,105 L493,88 534,96 553,118 538,139 509,146 483,135 459,125Z"/>
          <path class="rt-continent neutral" data-region="europe" d="M488,144 L505,143 517,161 510,181 493,173 480,153Z"/>
          <path id="rtRegionAsia" data-region="asia" class="rt-continent neutral" d="M536,94 L607,72 694,67 778,90 854,117 910,153 902,190 851,199 812,181 764,198 731,225 673,215 631,183 591,170 547,142Z"/>
          <path class="rt-continent neutral" data-region="asia" d="M742,222 L773,224 799,251 788,281 757,277 735,249Z"/>
          <path id="rtRegionAfrica" class="rt-continent neutral" d="M468,176 L517,163 568,184 592,228 582,283 555,333 522,347 489,307 468,262 450,217Z"/>
          <path id="rtRegionOceania" data-region="oceania" class="rt-continent neutral" d="M797,321 L844,302 893,315 918,348 896,376 850,382 813,362Z"/>
          <path class="rt-continent neutral" data-region="oceania" d="M936,376 L951,369 963,384 952,399 938,394Z"/>
          <path class="rt-continent neutral" d="M370,77 L402,58 424,70 413,96 384,100Z"/>
        </svg>
        <div class="rt-map-label rt-label-na" data-label-region="northamerica"><b>América del Norte</b><strong>—</strong><small>S&P 500 · NASDAQ</small></div>
        <div class="rt-map-label rt-label-eu" data-label-region="europe"><b>Europa</b><strong>—</strong><small>DAX · FTSE · CAC</small></div>
        <div class="rt-map-label rt-label-asia" data-label-region="asia"><b>Asia</b><strong>—</strong><small>NIKKEI · HANG SENG</small></div>
        <div class="rt-map-label rt-label-latam" data-label-region="latam"><b>LatAm</b><strong>—</strong><small>BOVESPA · MERVAL</small></div>
        <div class="rt-map-label rt-label-oceania" data-label-region="oceania"><b>Oceanía</b><strong>—</strong><small>ASX 200</small></div>
        <span class="rt-city ny">Nueva York</span><span class="rt-city lon">Londres</span><span class="rt-city tokyo">Tokio</span><span class="rt-city sao">São Paulo</span><span class="rt-city bue">Argentina</span><span class="rt-city syd">Sídney</span>
        <div class="rt-map-legend">
          <div class="rt-legend-line"><i class="s1"></i>Fuerte alza</div>
          <div class="rt-legend-line"><i class="s2"></i>Alza moderada</div>
          <div class="rt-legend-line"><i class="s3"></i>Neutral</div>
          <div class="rt-legend-line"><i class="s4"></i>Caída moderada</div>
          <div class="rt-legend-line"><i class="s5"></i>Fuerte caída</div>
        </div>
      </div>
    </section>

    <section id="rtRegionDetail" class="rt-card rt-detail-card">
      <div class="rt-section-title"><div><h3 id="rtDetailTitle">Detalle de Región: Europa</h3><p id="rtDetailSubtitle">Índices principales y tendencia</p></div><button id="rtRegionOpen" class="rt-link-button">Abrir vista completa →</button></div>
      <div class="rt-detail-map">
        <svg viewBox="0 0 360 170" aria-hidden="true">
          <path class="hot" d="M78 49 111 34 135 43 147 63 132 79 103 75 86 65Z"/>
          <path class="hot" d="M145 39 179 29 218 36 239 54 230 72 197 80 171 71 151 60Z"/>
          <path class="hot" d="M130 83 158 76 187 87 192 108 176 122 147 117 128 99Z"/>
          <path d="M218 78 247 73 269 91 264 111 238 118 218 102Z"/>
          <path d="M75 84 101 78 117 96 108 113 84 110 70 98Z"/>
        </svg>
        <span class="rt-detail-city" style="left:20%;top:38%">Londres</span>
        <span class="rt-detail-city" style="left:49%;top:39%">Frankfurt</span>
        <span class="rt-detail-city" style="left:38%;top:58%">París</span>
      </div>
      <div id="rtRegionList" class="rt-detail-list"></div>
      <div class="rt-detail-chart"><svg viewBox="0 0 400 80" preserveAspectRatio="none"><defs><linearGradient id="rtAreaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#27d77e" stop-opacity=".24"/><stop offset="100%" stop-color="#27d77e" stop-opacity="0"/></linearGradient></defs><path id="rtRegionArea" class="area" d=""/><path id="rtRegionSpark" d=""/></svg></div>
    </section>

    <section class="rt-card rt-watch-card">
      <div class="rt-section-title"><div><h3>Watchlist</h3><p>Mercados clave</p></div><button id="rtWatchAll" class="rt-link-button">Ver todo</button></div>
      <div id="rtWatchList" class="rt-watch-list"></div>
      <div class="rt-risk-strip">
        <div class="rt-risk-label"><span>Riesgo Global</span><b id="rtRiskLabel">CALCULANDO</b></div>
        <div class="rt-risk-gauge"><i id="rtRiskNeedle" style="left:50%"></i></div>
        <div class="rt-risk-meta"><span id="rtRiskVix">VIX —</span><span id="rtRiskTnx">US10Y —</span></div>
      </div>
    </section>
  </div>

  <div class="rt-mid-grid">
    <section id="rtArgentinaSignals" class="rt-card rt-arg-card">
      <div class="rt-section-title"><div><h2>Argentina: Semáforos</h2><p>Lectura combinada del contexto global y local</p></div><button id="rtRefresh" class="rt-link-button">Actualizar</button></div>
      <div id="rtTrafficGrid" class="rt-traffic-grid"></div>
    </section>

    <section id="rtMarketSignals" class="rt-card rt-signals-card">
      <div class="rt-signals-head"><div><h2>Semáforos de Mercado</h2><small>Cruce de variables globales y su impacto en Argentina</small></div></div>
      <div id="rtSignalList" class="rt-signal-list"></div>
    </section>
  </div>

  <section class="rt-card rt-opps-card">
    <div class="rt-opps-header">
      <div class="rt-opps-title"><h2>Oportunidades Argentina</h2><p>Activos con potencial según análisis técnico y contexto de mercado.</p></div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="rt-tabs">
          <button class="rt-tab active" data-rt-filter="all">Todos</button>
          <button class="rt-tab" data-rt-filter="cedear">CEDEARs</button>
          <button class="rt-tab" data-rt-filter="argbond">Bonos</button>
          <button class="rt-tab" data-rt-filter="argstock">Merval</button>
        </div>
        <button id="rtMoreOpps" class="rt-link-button">Ver más oportunidades →</button>
      </div>
    </div>
    <div class="rt-opps-wrap">
      <table class="rt-opps-table">
        <thead><tr><th>Activo</th><th>Tipo</th><th>Último precio</th><th>Var.</th><th>Volumen</th><th>Gráfico</th><th>Setup técnico</th><th>Tendencia</th><th>Timing</th><th>Comentario</th></tr></thead>
        <tbody id="rtOppsBody"><tr><td colspan="10" class="rt-opps-empty">Analizando oportunidades con datos reales…</td></tr></tbody>
      </table>
    </div>
  </section>`;
  dash.prepend(root);
  bindDashboard();
}

function bindDashboard(){
  qa('[data-region]').forEach(el=>el.addEventListener('click',()=>{
    const key=el.dataset.region;if(!key||!REGIONS[key])return;
    state.selectedRegion=key;renderRegionDetail();
  }));
  $('rtRegionOpen')?.addEventListener('click',()=>goHome('#rtRegionDetail'));
  $('rtWatchAll')?.addEventListener('click',()=>clickOriginal('watchlistViewBtn'));
  $('rtMoreOpps')?.addEventListener('click',()=>clickOriginal('scannerViewBtn'));
  $('rtRefresh')?.addEventListener('click',()=>refresh(true));
  qa('[data-rt-filter]').forEach(b=>b.addEventListener('click',()=>{
    state.filter=b.dataset.rtFilter||'all';
    qa('[data-rt-filter]').forEach(x=>x.classList.toggle('active',x===b));
    renderOpportunities();
  }));
}

function zonedParts(date,timeZone){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const o=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  const dayIndex={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[o.weekday];
  return{day:dayIndex,h:Number(o.hour)%24,m:Number(o.minute),s:Number(o.second)};
}
function nextOpenDelta(now,session){
  const p=zonedParts(now,session.tz),sec=p.h*3600+p.m*60+p.s;
  const isWeekday=p.day>=1&&p.day<=5;
  if(isWeekday&&sec<session.open)return session.open-sec;
  let days=1;
  while(days<=7){
    const d=(p.day+days)%7;
    if(d>=1&&d<=5)break;
    days++;
  }
  return (86400-sec)+(days-1)*86400+session.open;
}
function renderSession(date){
  if(!$('rtSessionName'))return;
  const sessions=[
    {name:'Nueva York',flag:'🇺🇸',tz:'America/New_York',open:9*3600+30*60,close:16*3600},
    {name:'Londres',flag:'🇬🇧',tz:'Europe/London',open:8*3600,close:16*3600+30*60},
    {name:'Tokio',flag:'🇯🇵',tz:'Asia/Tokyo',open:9*3600,close:15*3600+30*60},
    {name:'Sídney',flag:'🇦🇺',tz:'Australia/Sydney',open:10*3600,close:16*3600}
  ];
  const live=sessions.map(x=>{
    const p=zonedParts(date,x.tz),sec=p.h*3600+p.m*60+p.s;
    const active=p.day>=1&&p.day<=5&&sec>=x.open&&sec<x.close;
    return{...x,sec,active,left:active?x.close-sec:NaN};
  });
  const active=live.find(x=>x.active)||null;
  if(active){
    $('rtSessionName').textContent=active.name;$('rtSessionFlag').textContent=active.flag;
    const left=Math.max(0,active.left),hh=Math.floor(left/3600),mm=Math.floor((left%3600)/60),ss=Math.floor(left%60);
    $('rtSessionCountdown').textContent=[hh,mm,ss].map(x=>String(x).padStart(2,'0')).join(':');
  }else{
    $('rtSessionName').textContent='Entre sesiones';$('rtSessionFlag').textContent='🌐';$('rtSessionCountdown').textContent='—';
  }
  if($('rtNextSessions')){
    const next=sessions.map(x=>({...x,delta:nextOpenDelta(date,x)})).sort((a,b)=>a.delta-b.delta).slice(0,3);
    $('rtNextSessions').innerHTML=next.map(x=>`<span>${x.flag} ${x.name} · +${Math.floor(x.delta/3600)}h ${Math.floor((x.delta%3600)/60)}m</span>`).join('');
  }
}

async function fetchBatch(force=false){
  const symbols=[...new Set(ASSETS.map(x=>x.symbol))];
  const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),45000);
  try{
    const url=`/api/yahoo-batch?symbols=${encodeURIComponent(symbols.join(','))}&range=6mo&interval=1d&fresh=${force?'1':'0'}&_=${Date.now()}`;
    const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});
    if(!r.ok)throw new Error(`Mercado HTTP ${r.status}`);
    const j=await r.json();
    for(const x of (j.items||[])){
      const bars=(x.bars||[]).map(b=>({time:num(b.time),close:num(b.close),volume:num(b.volume)})).filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close));
      state.markets.set(String(x.symbol),{ok:!!x.ok,last:num(x.last),changePct:num(x.changePct),bars,source:x.source||j.source||'Yahoo Finance',time:num(x.time),error:x.error||''});
    }
  }finally{clearTimeout(tm)}
}

function get(id){const a=ASSET_BY_ID[id];return a?state.markets.get(a.symbol):null}
function periodChange(item,period='day'){
  if(!item)return NaN;
  if(period==='day'&&Number.isFinite(item.changePct))return item.changePct;
  const b=item.bars||[];if(b.length<2)return NaN;
  const back=period==='week'?5:period==='month'?21:1;
  const last=num(b.at(-1)?.close),prev=num(b[Math.max(0,b.length-1-back)]?.close);
  return Number.isFinite(last)&&Number.isFinite(prev)&&prev!==0?(last/prev-1)*100:NaN;
}
function regionChange(key,period='day'){
  const vals=(REGIONS[key]?.ids||[]).map(id=>periodChange(get(id),period)).filter(Number.isFinite);
  return median(vals);
}
function toneClass(v){
  if(!Number.isFinite(v))return'neutral';
  if(v>=1.2)return'strong-up';if(v>=.15)return'mod-up';if(v<=-1.2)return'strong-down';if(v<=-.15)return'mod-down';return'neutral';
}
function signClass(v){return !Number.isFinite(v)?'rt-flat':v>.03?'rt-up':v<-.03?'rt-down':'rt-flat'}

function renderMap(){
  for(const key of Object.keys(REGIONS)){
    const ch=regionChange(key,'day'),tone=toneClass(ch);
    qa(`[data-region="${key}"]`).forEach(el=>{el.classList.remove('strong-up','mod-up','neutral','mod-down','strong-down');el.classList.add(tone)});
    const label=q(`[data-label-region="${key}"]`);
    if(label){
      label.classList.remove('positive','negative','neutral');
      label.classList.add(Number.isFinite(ch)?ch>.03?'positive':ch<-.03?'negative':'neutral':'neutral');
      const strong=q('strong',label);if(strong)strong.textContent=pct(ch);
    }
  }
}

function renderWatch(){
  const ids=['sp500','nasdaq','dow','dax','nikkei','hangseng','merval'];
  const rows=ids.map(id=>{
    const a=ASSET_BY_ID[id],m=get(id),ch=periodChange(m,'day');
    return `<div class="rt-watch-row"><span class="rt-watch-symbol"><i>${a.flag}</i><b>${esc(a.name)}</b></span><span class="wv">${Number.isFinite(m?.last)?fmt(m.last,a.decimals):'—'}</span><span class="wc ${signClass(ch)}">${pct(ch)}</span></div>`;
  });
  const risk=window.RadarDashboardData?.risk||{};
  rows.push(`<div class="rt-watch-row"><span class="rt-watch-symbol"><i>🇦🇷</i><b>RIESGO PAÍS</b></span><span class="wv">${Number.isFinite(num(risk.value))?fmt(risk.value,0):'—'}</span><span class="wc ${Number.isFinite(num(risk.change))?(num(risk.change)<0?'rt-up':num(risk.change)>0?'rt-down':'rt-flat'):'rt-flat'}">${Number.isFinite(num(risk.change))?`${num(risk.change)>=0?'+':''}${fmt(risk.change,0)} pb`:'—'}</span></div>`);
  $('rtWatchList').innerHTML=rows.join('');
}

function riskModel(){
  const vix=get('vix'),tnx=get('tnx'),dxy=get('dxy'),eem=get('eem');
  let score=50;
  const vv=num(vix?.last);
  if(Number.isFinite(vv))score+=(vv-18)*2.2;
  const tc=periodChange(tnx,'day');if(Number.isFinite(tc))score+=clamp(tc*3,-10,10);
  const dc=periodChange(dxy,'day');if(Number.isFinite(dc))score+=clamp(dc*5,-8,8);
  const ec=periodChange(eem,'day');if(Number.isFinite(ec))score-=clamp(ec*5,-10,10);
  score=clamp(score,5,95);
  const label=score<34?'BAJO':score<67?'MODERADO':'ALTO';
  return{score,label};
}
function renderRisk(){
  const r=riskModel();$('rtRiskLabel').textContent=r.label;$('rtRiskNeedle').style.left=`${r.score}%`;
  const v=get('vix'),t=get('tnx');$('rtRiskVix').textContent=`VIX ${Number.isFinite(v?.last)?fmt(v.last,1):'—'}`;$('rtRiskTnx').textContent=`US10Y ${Number.isFinite(t?.last)?fmt(t.last,2)+'%':'—'}`;
}

function regionSeries(key){
  const items=(REGIONS[key]?.ids||[]).map(get).filter(x=>x?.bars?.length);
  if(!items.length)return[];
  const length=Math.min(...items.map(x=>x.bars.length),40);
  const series=[];
  for(let i=-length;i<0;i++){
    const vals=items.map(x=>x.bars.at(i)?.close).filter(Number.isFinite);
    if(vals.length)series.push(median(vals));
  }
  if(series.length<2)return[];
  const base=series[0];return series.map(v=>base?((v/base)-1)*100:0);
}
function svgLine(values,w=400,h=80,p=5){
  if(!values.length)return'';
  const lo=Math.min(...values),hi=Math.max(...values),span=hi-lo||1;
  return values.map((v,i)=>{
    const x=p+i*(w-2*p)/Math.max(1,values.length-1),y=h-p-(v-lo)*(h-2*p)/span;
    return`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
function renderRegionDetail(){
  const key=state.selectedRegion,region=REGIONS[key]||REGIONS.europe;
  $('rtDetailTitle').textContent=`Detalle de Región: ${region.label}`;
  const rows=region.ids.map(id=>{
    const a=ASSET_BY_ID[id],m=get(id),ch=periodChange(m,'day');
    return `<div class="rt-market-line"><b>${a.flag} ${esc(a.name)}</b><span class="price">${Number.isFinite(m?.last)?fmt(m.last,a.decimals):'—'}</span><span class="chg ${signClass(ch)}">${pct(ch)}</span></div>`;
  });
  $('rtRegionList').innerHTML=rows.join('');
  const values=regionSeries(key),d=svgLine(values);$('rtRegionSpark').setAttribute('d',d);
  if(d){const area=`${d} L395,75 L5,75 Z`;$('rtRegionArea').setAttribute('d',area)}else $('rtRegionArea').setAttribute('d','');
}

function localRiskChange(period='day'){
  const r=window.RadarDashboardData?.risk||{};
  if(period==='day')return num(r.change);
  const h=(r.history||[]).map(x=>num(x.value)).filter(Number.isFinite);
  const back=period==='week'?5:21;if(h.length<=back)return NaN;
  return h.at(-1)-h.at(-1-back);
}
function scoreArgentina(period){
  const values=[
    {v:periodChange(get('merval'),period),good:1,w:1.4},
    {v:periodChange(get('eem'),period),good:1,w:1},
    {v:periodChange(get('vix'),period),good:-1,w:1.2},
    {v:periodChange(get('tnx'),period),good:-1,w:1},
    {v:periodChange(get('dxy'),period),good:-1,w:.9},
    {v:localRiskChange(period),good:-1,w:1.5}
  ];
  let score=0,used=0;
  for(const x of values){
    if(!Number.isFinite(x.v)||Math.abs(x.v)<.02)continue;
    score+=(x.v>0?1:-1)*x.good*x.w;used+=x.w;
  }
  return used?score/used:0;
}
function trafficState(score){
  if(score>.2)return{key:'positive',label:'POSITIVO',copy:'Contexto combinado favorable para riesgo argentino.'};
  if(score<-.2)return{key:'negative',label:'NEGATIVO',copy:'Contexto combinado exige mayor cautela y selectividad.'};
  return{key:'neutral',label:'NEUTRAL',copy:'Señales mixtas; conviene esperar confirmaciones.'};
}
function renderTraffic(){
  const defs=[['Hoy','day'],['Semana','week'],['Mes','month']];
  $('rtTrafficGrid').innerHTML=defs.map(([label,p])=>{
    const s=trafficState(scoreArgentina(p));
    return `<article class="rt-traffic-card">
      <div class="rt-light ${s.key}"><i></i><i></i><i></i></div>
      <div class="rt-traffic-copy"><small>Argentina ${label}</small><strong class="${s.key}">${s.label}</strong><p>${s.copy}</p></div>
    </article>`;
  }).join('');
}

function signalRow(icon,name,value,change,polarity,note){
  const c=num(change);let stateKey='warn',label='NEUTRAL';
  if(Number.isFinite(c)&&Math.abs(c)>.03){
    const adverse=(c>0&&polarity==='upbad')||(c<0&&polarity==='downbad');
    stateKey=adverse?'bad':'good';label=c>0?'ALZA':'BAJA';
  }
  return `<div class="rt-signal-row"><span class="rt-signal-icon">${icon}</span><b>${esc(name)}</b><span class="rt-signal-value ${signClass(c)}">${value}</span><span class="rt-signal-state ${stateKey}">${label}</span><span class="rt-signal-note">${esc(note)}</span></div>`;
}
function renderSignals(){
  const tnx=get('tnx'),vix=get('vix'),wti=get('wti'),dxy=get('dxy'),eem=get('eem');
  const oil=periodChange(wti,'day'),yieldCh=periodChange(tnx,'day'),vixCh=periodChange(vix,'day'),dxyCh=periodChange(dxy,'day'),eemCh=periodChange(eem,'day');
  const inflationPressure=(Number.isFinite(oil)?oil:0)+(Number.isFinite(yieldCh)?yieldCh*.5:0);
  const emergingRisk=(Number.isFinite(vixCh)?vixCh:0)+(Number.isFinite(yieldCh)?yieldCh:0)-(Number.isFinite(eemCh)?eemCh:0);
  $('rtSignalList').innerHTML=[
    signalRow('🏛','Bonos de EE.UU. (10Y)',Number.isFinite(tnx?.last)?`${fmt(tnx.last,2)}%`:'—',yieldCh,'upbad','Tasas al alza endurecen condiciones financieras.'),
    signalRow('⌁','VIX (volatilidad)',Number.isFinite(vix?.last)?fmt(vix.last,1):'—',vixCh,'upbad','Más volatilidad implica mayor aversión al riesgo.'),
    signalRow('◉','Petróleo (WTI)',Number.isFinite(wti?.last)?`USD ${fmt(wti.last,2)}`:'—',oil,'upbad','Subas fuertes pueden sumar presión inflacionaria global.'),
    signalRow('$','Dólar / DXY',Number.isFinite(dxy?.last)?fmt(dxy.last,2):'—',dxyCh,'upbad','Dólar fuerte suele presionar activos emergentes.'),
    signalRow('◎','Presión inflacionaria','Derivada',inflationPressure,'upbad','Lectura combinada de energía y tasas; no es IPC oficial.'),
    signalRow('⚠','Riesgo para emergentes','Compuesto',emergingRisk,'upbad','Cruce de VIX, tasas y desempeño de EEM.')
  ].join('');
}

function extractBars(r){
  const candidates=[r?.bars,r?.data,r?.dataset,r?.datasets?.short,r?.datasets?.medium,r?.result?.bars];
  for(const c of candidates)if(Array.isArray(c)&&c.length>1)return c.map(x=>({close:num(x.close??x.c),volume:num(x.volume??x.v)})).filter(x=>Number.isFinite(x.close));
  return[];
}
function relVolume(bars){
  if(!bars?.length)return NaN;
  const vols=bars.slice(-21).map(x=>num(x.volume)).filter(v=>Number.isFinite(v)&&v>0);if(vols.length<5)return NaN;
  const last=vols.at(-1),avg=vols.slice(0,-1).reduce((a,b)=>a+b,0)/Math.max(1,vols.length-1);return avg?last/avg:NaN;
}
function opportunityTrend(r){
  const text=[r?.status?.label,r?.trend,r?.plan?.trend,r?.reason,r?.why].filter(Boolean).join(' ').toLowerCase();
  if(/alcista|buy|compra|long|ruptura/.test(text))return['Alcista',''];
  if(/bajista|sell|venta|short/.test(text))return['Bajista','bad'];
  return['Lateral / espera','warn'];
}
function oppType(r){
  const t=String(r?.item?.type||'').toLowerCase();
  if(t==='cedear')return'CEDEAR';if(t==='argbond'||t==='bond')return'Bono';if(t==='argstock')return'Merval';if(t==='crypto')return'Crypto';return t||'Activo';
}
function timing(r){
  const kind=String(r?.status?.kind||'');
  if(kind==='buy'||kind==='sell')return['Ahora',''];
  if(kind==='near')return['Corto plazo',''];
  if(kind==='wait')return['Esperar','warn'];
  return['Seguimiento','warn'];
}
function miniSpark(values){
  if(!values.length)return'<span style="color:#667f92">—</span>';
  const d=svgLine(values.slice(-20),92,25,2),down=values.at(-1)<values[0];
  return `<svg class="rt-spark ${down?'down':''}" viewBox="0 0 92 25" preserveAspectRatio="none"><path d="${d}"/></svg>`;
}
function scoreBars(score){
  const n=clamp(Math.round((num(score)||0)/20),1,5);
  return `<span class="rt-scorebars">${[1,2,3,4,5].map(i=>`<i style="height:${5+i*2+(i<=n?6:0)}px;opacity:${i<=n?1:.25}"></i>`).join('')}</span>`;
}
function renderOpportunities(){
  const daily=window.RadarDailyRadar?.state;
  let results=[...(daily?.results||[]),...(daily?.rf||[])].filter(r=>r?.item?.symbol);
  if(state.filter!=='all')results=results.filter(r=>String(r.item.type||'').toLowerCase()===state.filter);
  results=results.sort((a,b)=>(num(b?.status?.oppScore??b?.rfScore??b?.score)||0)-(num(a?.status?.oppScore??a?.rfScore??a?.score)||0)).slice(0,6);
  if(!results.length){
    $('rtOppsBody').innerHTML='<tr><td colspan="10" class="rt-opps-empty">No hay oportunidades válidas para mostrar con el filtro actual.</td></tr>';return;
  }
  $('rtOppsBody').innerHTML=results.map(r=>{
    const bars=extractBars(r),rv=relVolume(bars),trend=opportunityTrend(r),tm=timing(r),price=num(r.price??r.last??r.panel?.price),score=num(r?.status?.oppScore??r?.rfScore??r?.score);
    const day=bars.length>1&&bars.at(-2).close?(bars.at(-1).close/bars.at(-2).close-1)*100:NaN;
    const setup=String(r?.status?.label||r?.plan?.label||r?.setup||'Seguimiento').replace(/_/g,' ');
    const comment=String(r?.reason||r?.why||r?.status?.reason||r?.plan?.reason||'Lectura técnica disponible al abrir el activo.').replace(/\s+/g,' ').trim();
    return `<tr data-rt-symbol="${esc(r.item.symbol)}" data-rt-type="${esc(r.item.type||'auto')}">
      <td><b class="ticker">${esc(r.item.symbol)}</b></td>
      <td><span class="rt-type">${esc(oppType(r))}</span></td>
      <td>${Number.isFinite(price)?fmt(price,2):'—'}</td>
      <td class="${signClass(day)}">${pct(day)}</td>
      <td>${Number.isFinite(rv)?`${fmt(rv,1)}x`:scoreBars(score)}</td>
      <td>${miniSpark(bars.map(x=>x.close))}</td>
      <td>${esc(setup)}</td>
      <td><span class="rt-pill ${trend[1]}">${trend[0]}</span></td>
      <td><span class="rt-pill ${tm[1]}">${tm[0]}</span></td>
      <td>${esc(comment.slice(0,110))}</td>
    </tr>`;
  }).join('');
  qa('#rtOppsBody tr[data-rt-symbol]').forEach(row=>row.addEventListener('click',()=>{
    const input=$('symbol');if(input)input.value=row.dataset.rtSymbol;
    const type=$('assetType');if(type)type.value=row.dataset.rtType||'auto';
    $('analyzeBtn')?.click();
  }));
}

function renderAll(){
  if(!$('rtGlobalRadar'))return;
  renderMap();renderWatch();renderRisk();renderRegionDetail();renderTraffic();renderSignals();renderOpportunities();
  state.lastUpdate=Date.now();
}

async function refresh(force=false){
  if(state.loading)return;state.loading=true;
  if($('rtRefresh')){$('rtRefresh').disabled=true;$('rtRefresh').textContent='Actualizando…'}
  try{
    $('dashRefreshBtn')?.click();
    await fetchBatch(force);
    renderAll();
    if(window.RadarDailyRadar?.run)window.RadarDailyRadar.run(force).then(()=>renderOpportunities()).catch(()=>{});
  }catch(e){
    console.warn('Global Command Center',e);
    window.radarNotify?.(`No se pudo completar la vista global: ${e?.message||e}`,'warn');
    renderAll();
  }finally{
    state.loading=false;
    if($('rtRefresh')){$('rtRefresh').disabled=false;$('rtRefresh').textContent='Actualizar'}
  }
}

function watchViews(){
  const ids=['dashboardView','scannerView','rfScannerView','watchlistView','portfolio360Section','signalsView','analysisView','bondView'];
  const obs=new MutationObserver(()=>{
    if($('dashboardView')?.classList.contains('active'))setActiveForView('homeViewBtn');
    else if($('scannerView')?.classList.contains('active')||$('rfScannerView')?.classList.contains('active'))setActiveForView('scannerViewBtn');
    else if($('signalsView')?.classList.contains('active'))setActiveForView('signalsViewBtn');
    else qa('.rt-nav button').forEach(b=>b.classList.remove('active'));
  });
  ids.forEach(id=>{const el=$(id);if(el)obs.observe(el,{attributes:true,attributeFilter:['class','style']})});
}

function boot(){
  insertShell();mountDashboard();watchViews();
  if(!$('rtGlobalRadar'))return;
  renderAll();
  setTimeout(()=>refresh(false),350);
  let tries=0;
  state.renderTimer=setInterval(()=>{
    tries++;renderOpportunities();
    if(tries>12||window.RadarDailyRadar?.state?.lastRun)clearInterval(state.renderTimer);
  },1500);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.RadarGlobalCommandCenter=Object.freeze({version:VERSION,state,refresh,renderAll,selectRegion:key=>{if(REGIONS[key]){state.selectedRegion=key;renderRegionDetail()}}});
})();