/* Radar Técnico · Global Command Center
   Visual implementation of the approved global-market dashboard.
   Uses Radar's existing local APIs and analytical engines; no fabricated market values. */
(()=>{
'use strict';

const VERSION='2.9.0';
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
  loading:false,lastUpdate:0,markets:new Map(),intraday:new Map(),selectedRegion:'europe',filter:'all',worldMapLoaded:false,
  sessionTimer:null,renderTimer:null
};

const ASSETS=[
  {id:'sp500',symbol:'^GSPC',name:'S&P 500',region:'northamerica',flag:'🇺🇸',decimals:1},
  {id:'nasdaq',symbol:'^IXIC',name:'NASDAQ',region:'northamerica',flag:'🇺🇸',decimals:1},
  {id:'dow',symbol:'^DJI',name:'DOW JONES',region:'northamerica',flag:'🇺🇸',decimals:1},
  {id:'vix',symbol:'^VIX',name:'VIX',region:'global',flag:'⚡',decimals:1},
  {id:'move',symbol:'^MOVE',name:'MOVE',region:'global',flag:'〽',decimals:1},
  {id:'tnx',symbol:'^TNX',name:'US 10Y',region:'global',flag:'🏛',decimals:2},
  {id:'dxy',symbol:'DX-Y.NYB',name:'DXY',region:'global',flag:'$',decimals:2},
  {id:'wti',symbol:'CL=F',name:'WTI',region:'global',flag:'◉',decimals:2},
  {id:'eem',symbol:'EEM',name:'Emergentes',region:'global',flag:'◈',decimals:2},

  {id:'dax',symbol:'^GDAXI',name:'DAX',detailName:'DAX (Alemania)',region:'europe',flag:'🇩🇪',decimals:1},
  {id:'ftse',symbol:'^FTSE',name:'FTSE 100',region:'europe',flag:'🇬🇧',decimals:1},
  {id:'cac',symbol:'^FCHI',name:'CAC 40',detailName:'CAC 40 (Francia)',region:'europe',flag:'🇫🇷',decimals:1},
  {id:'stoxx',symbol:'^STOXX',name:'STOXX 600',region:'europe',flag:'🇪🇺',decimals:1},
  {id:'ibex',symbol:'^IBEX',name:'IBEX 35',detailName:'IBEX 35 (España)',region:'europe',flag:'🇪🇸',decimals:1},
  {id:'ftsemib',symbol:'FTSEMIB.MI',name:'FTSE MIB',detailName:'FTSE MIB (Italia)',region:'europe',flag:'🇮🇹',decimals:1},

  {id:'nikkei',symbol:'^N225',name:'NIKKEI',region:'asia',flag:'🇯🇵',decimals:1},
  {id:'hangseng',symbol:'^HSI',name:'HANG SENG',region:'asia',flag:'🇭🇰',decimals:1},
  {id:'shanghai',symbol:'000001.SS',name:'SHANGHAI',region:'asia',flag:'🇨🇳',decimals:1},

  {id:'merval',symbol:'^MERV',name:'MERVAL',region:'latam',flag:'🇦🇷',decimals:0},
  {id:'bovespa',symbol:'^BVSP',name:'BOVESPA',region:'latam',flag:'🇧🇷',decimals:0},
  {id:'mexico',symbol:'^MXX',name:'IPC MÉXICO',region:'latam',flag:'🇲🇽',decimals:0},

  {id:'asx',symbol:'^AXJO',name:'ASX 200',region:'oceania',flag:'🇦🇺',decimals:1}
];

const REGIONS={
  northamerica:{label:'América del Norte',short:'Norteamérica',ids:['sp500','nasdaq','dow'],focus:'sp500',indices:'S&P 500 · NASDAQ · DOW'},
  europe:{label:'Europa',short:'Europa',ids:['ftse','dax','cac','ibex','ftsemib','stoxx'],focus:'stoxx',indices:'DAX · FTSE · CAC'},
  asia:{label:'Asia',short:'Asia',ids:['nikkei','hangseng','shanghai'],focus:'nikkei',indices:'NIKKEI · HANG SENG'},
  latam:{label:'LatAm',short:'LatAm',ids:['merval','bovespa','mexico'],focus:'merval',indices:'MERVAL · BOVESPA'},
  oceania:{label:'Oceanía',short:'Oceanía',ids:['asx'],focus:'asx',indices:'ASX 200'}
};
const COUNTRY_MARKET={
  USA:'sp500',GBR:'ftse',DEU:'dax',FRA:'cac',ESP:'ibex',ITA:'ftsemib',
  JPN:'nikkei',CHN:'shanghai',ARG:'merval',BRA:'bovespa',MEX:'mexico',AUS:'asx'
};

const ASSET_BY_ID=Object.fromEntries(ASSETS.map(x=>[x.id,x]));

const MAP_VIEW={w:1200,h:520,minLat:-60,maxLat:85};
const REGION_VIEWS={
  northamerica:[130,70,320,220],
  europe:[515,45,250,195],
  asia:[790,70,340,240],
  latam:[290,220,240,300],
  oceania:[940,280,260,220]
};
const MARKET_CITIES={
  northamerica:[['NUEVA YORK',-74.006,40.7128,'sp500'],['TORONTO',-79.3832,43.6532,'sp500']],
  europe:[['LONDRES',-0.1276,51.5072,'ftse'],['FRANKFURT',8.6821,50.1109,'dax'],['PARÍS',2.3522,48.8566,'cac']],
  asia:[['TOKIO',139.6917,35.6895,'nikkei'],['HONG KONG',114.1694,22.3193,'hangseng'],['SHANGHÁI',121.4737,31.2304,'shanghai']],
  latam:[['SÃO PAULO',-46.6333,-23.5505,'bovespa'],['ARGENTINA',-58.3816,-34.6037,'merval'],['CIUDAD DE MÉXICO',-99.1332,19.4326,'mexico']],
  oceania:[['SÍDNEY',151.2093,-33.8688,'asx']]
};
function mapXY(lon,lat){
  return [
    (lon+180)/360*MAP_VIEW.w,
    (MAP_VIEW.maxLat-Math.max(MAP_VIEW.minLat,Math.min(MAP_VIEW.maxLat,lat)))/(MAP_VIEW.maxLat-MAP_VIEW.minLat)*MAP_VIEW.h
  ];
}
function markerTone(assetId){
  const ch=assetId?periodChange(get(assetId),'day'):NaN;
  return !Number.isFinite(ch)?'neutral':ch>.03?'up':ch<-.03?'down':'neutral';
}
const DETAIL_CITY_LABEL={
  'NUEVA YORK':'Nueva York','TORONTO':'Toronto','LONDRES':'Londres','FRANKFURT':'Frankfurt','PARÍS':'París',
  'TOKIO':'Tokio','HONG KONG':'Hong Kong','SHANGHÁI':'Shanghái','SÃO PAULO':'São Paulo','ARGENTINA':'Argentina',
  'CIUDAD DE MÉXICO':'Ciudad de México','SÍDNEY':'Sídney'
};
const MAIN_MARKET_LABELS=new Set(['NUEVA YORK','LONDRES','TOKIO','SÃO PAULO','ARGENTINA','SÍDNEY']);
const MARKER_OFFSETS={
  'NUEVA YORK':[10,-8],'LONDRES':[-55,-8],'TOKIO':[9,-7],'SÃO PAULO':[9,15],'ARGENTINA':[9,-8],'SÍDNEY':[9,-7],
  'FRANKFURT':[10,-2],'PARÍS':[-35,16],'TORONTO':[-46,-8],'HONG KONG':[9,14],'SHANGHÁI':[9,-8],'CIUDAD DE MÉXICO':[-72,16]
};
const DETAIL_MARKER_OFFSETS={
  'LONDRES':[-16,-16],
  'FRANKFURT':[18,5],
  'PARÍS':[-14,25]
};
function marketMarkers(regionOnly=null){
  const entries=regionOnly?[[regionOnly,MARKET_CITIES[regionOnly]||[]]]:Object.entries(MARKET_CITIES);
  return entries.flatMap(([region,cities])=>cities
    .filter(([name])=>regionOnly||MAIN_MARKET_LABELS.has(name))
    .map(([name,lon,lat,assetId])=>{
      const [cx,cy]=mapXY(lon,lat),tone=markerTone(assetId);
      const special=name==='ARGENTINA'?' argentina':'';
      const displayName=regionOnly?(DETAIL_CITY_LABEL[name]||name):name;
      const offsets=regionOnly?DETAIL_MARKER_OFFSETS:MARKER_OFFSETS;
      const [tx,ty]=offsets[name]||MARKER_OFFSETS[name]||[9,-7];
      const anchor=tx<0?'end':'start';
      return `<g class="rt-market-marker ${tone}${special}" data-marker-region="${region}" data-marker-asset="${assetId||''}" data-marker-name="${name}" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})"><circle r="4.2"/><circle class="halo" r="9"/><text x="${tx}" y="${ty}" text-anchor="${anchor}">${displayName}</text></g>`;
    })).join('');
}
async function loadWorldMap(){
  if(state.worldMapLoaded)return;
  try{
    const r=await fetch('/assets/world-markets.svg?v=20261001-gcc18',{cache:'force-cache'});
    if(!r.ok)throw new Error(`Mapa HTTP ${r.status}`);
    const svgText=await r.text();
    const host=$('rtWorldMapHost');
    if(host){
      host.innerHTML=svgText;
      const svg=q('svg',host);
      if(svg){
        const layer=svg.querySelector('#rtCountryLayer');
        if(layer&&!svg.querySelector('#rtTextureLayer')){
          let defs=svg.querySelector('defs');
          if(!defs){
            defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
            svg.insertBefore(defs,svg.firstChild);
          }
          defs.insertAdjacentHTML('beforeend',`
            <filter id="rtProceduralTerrain" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency=".010 .024" numOctaves="5" seed="23" result="noise"/>
              <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
              <feDiffuseLighting in="mono" surfaceScale="3.2" diffuseConstant=".72" lighting-color="#a6bdc8" result="light">
                <feDistantLight azimuth="225" elevation="48"/>
              </feDiffuseLighting>
              <feComposite in="light" in2="SourceGraphic" operator="in" result="shaded"/>
              <feBlend in="SourceGraphic" in2="shaded" mode="soft-light"/>
            </filter>
            <filter id="rtUrbanGlow" x="-250%" y="-250%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="rtOceanNoise" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency=".032 .082" numOctaves="2" seed="11" result="n"/>
              <feColorMatrix in="n" type="saturate" values="0" result="mono"/>
              <feComponentTransfer in="mono"><feFuncA type="table" tableValues="0 .04 .11 .18"/></feComponentTransfer>
            </filter>`);
          const ocean=document.createElementNS('http://www.w3.org/2000/svg','rect');
          ocean.id='rtOceanTexture';
          ocean.setAttribute('x','0');ocean.setAttribute('y','0');ocean.setAttribute('width',MAP_VIEW.w);ocean.setAttribute('height',MAP_VIEW.h);
          ocean.setAttribute('filter','url(#rtOceanNoise)');
          ocean.setAttribute('class','rt-ocean-texture');
          layer.parentNode.insertBefore(ocean,layer);
          const texture=layer.cloneNode(true);
          texture.id='rtTextureLayer';
          texture.querySelectorAll('.rt-country').forEach(p=>{
            p.removeAttribute('data-region');p.removeAttribute('data-country');p.removeAttribute('data-code');
            p.setAttribute('class','rt-land-texture');
          });
          layer.parentNode.insertBefore(texture,layer);
          const lights=document.createElementNS('http://www.w3.org/2000/svg','g');
          lights.id='rtCityLightsLayer';
          const points=[
            [-74,40.7],[-87.6,41.9],[-95.4,29.8],[-118.2,34],[-122.4,37.8],[-79.4,43.7],
            [-0.1,51.5],[2.35,48.85],[4.9,52.37],[8.68,50.1],[13.4,52.5],[12.5,41.9],[-3.7,40.4],
            [37.6,55.75],[28.98,41.0],[31.2,30.0],[3.38,6.45],[28.0,-26.2],
            [72.9,19.1],[77.2,28.6],[80.3,13.1],[103.8,1.35],[100.5,13.75],
            [116.4,39.9],[121.47,31.23],[114.17,22.32],[126.98,37.57],[139.69,35.69],[135.5,34.7],
            [151.2,-33.87],[144.96,-37.8],[-46.63,-23.55],[-43.2,-22.9],[-58.38,-34.6],[-70.65,-33.45],
            [-99.13,19.43],[-77.04,-12.05]
          ];
          lights.innerHTML=points.flatMap(([lon,lat],i)=>{
            return Array.from({length:6},(_,j)=>{
              const a=i*1.73+j*1.91,spread=j===0?0:(.45+(j%3)*.42);
              const px=lon+Math.cos(a)*spread,py=lat+Math.sin(a)*spread*.58;
              const [lx,ly]=mapXY(px,py),r=j===0?(i%5===0?1.8:1.35):(.42+(j%3)*.16);
              const o=j===0?.82:(.28+(j%4)*.09);
              return `<circle class="rt-city-light" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="${r.toFixed(2)}" opacity="${o.toFixed(2)}"/>`;
            });
          }).join('');
          layer.parentNode.insertBefore(lights,layer);
        }
        if(layer&&!svg.querySelector('#rtHeatGlowLayer')){
          const glow=document.createElementNS('http://www.w3.org/2000/svg','g');
          glow.setAttribute('id','rtHeatGlowLayer');
          [...layer.querySelectorAll('.rt-country')].forEach(country=>{
            const clone=country.cloneNode(false);
            clone.removeAttribute('id');
            clone.classList.add('rt-heat-glow');
            glow.appendChild(clone);
          });
          layer.parentNode.insertBefore(glow,layer);
        }
        layer?.insertAdjacentHTML('beforeend',marketMarkers());
        const tooltip=document.createElement('div');
        tooltip.className='rt-map-tooltip';
        tooltip.hidden=true;
        host.appendChild(tooltip);
        svg.addEventListener('pointermove',ev=>{
          const country=ev.target.closest?.('.rt-country[data-region]');
          if(!country){tooltip.hidden=true;return}
          const region=country.dataset.region;
          const id=COUNTRY_MARKET[country.dataset.code];
          const ch=id?periodChange(get(id),'day'):regionChange(region,'day');
          tooltip.hidden=false;
          tooltip.innerHTML=`<b>${esc(country.dataset.country||'Mercado')}</b><span class="${signClass(ch)}">${pct(ch)}</span><small>${id?esc(ASSET_BY_ID[id]?.name||'Índice'):'Sentimiento regional'}</small>`;
          const box=host.getBoundingClientRect();
          tooltip.style.left=`${clamp(ev.clientX-box.left+12,8,box.width-150)}px`;
          tooltip.style.top=`${clamp(ev.clientY-box.top+12,8,box.height-70)}px`;
        });
        svg.addEventListener('pointerleave',()=>{tooltip.hidden=true});
        svg.addEventListener('click',ev=>{
          const country=ev.target.closest?.('.rt-country[data-region]');
          const key=country?.dataset?.region;
          if(key&&REGIONS[key]){state.selectedRegion=key;renderMap();renderRegionDetail()}
        });
      }
    }
    state.worldMapLoaded=true;
    renderMap();
    renderRegionDetail();
    renderSession(new Date());
  }catch(e){
    console.warn('World map',e);
    const host=$('rtWorldMapHost');
    if(host)host.innerHTML='<div class="rt-map-loading error"><b>Cartografía no disponible</b><small>Los datos de mercado siguen operativos.</small></div>';
  }
}
function renderDetailGeo(key){
  const source=q('#rtWorldMapHost svg');
  const host=$('rtDetailGeoHost');
  if(!source||!host)return;
  const clone=source.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add('rt-detail-geo-svg');
  clone.setAttribute('viewBox',(REGION_VIEWS[key]||REGION_VIEWS.europe).join(' '));
  clone.setAttribute('preserveAspectRatio','xMidYMid slice');
  clone.querySelectorAll('.rt-country').forEach(p=>{
    const match=p.dataset.region===key;
    p.classList.toggle('rt-detail-focus',match);
    p.classList.toggle('rt-detail-dim',!match);
  });
  clone.querySelectorAll('.rt-market-marker').forEach(m=>m.remove());
  clone.querySelectorAll('.rt-region-aura').forEach(a=>{
    a.style.display=a.dataset.glowRegion===key?'':'none';
  });
  clone.querySelector('#rtCountryLayer')?.insertAdjacentHTML('beforeend',marketMarkers(key));
  host.replaceChildren(clone);
}

function insertShell(){
  if($('rtGlobalAppbar')) return;
  document.body.classList.add('rt-global-shell');
  const bar=document.createElement('header');
  bar.id='rtGlobalAppbar';
  bar.className='rt-appbar';
  bar.innerHTML=`
    <div class="rt-brand">
      <div class="rt-logo" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="7"/>
          <path d="M24 1v46M1 24h46"/><path class="sweep" d="M24 24 40 8"/>
          <circle class="dot" cx="24" cy="24" r="2.2"/>
        </svg>
      </div>
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
      <span class="rt-head-icon" title="Alertas" aria-label="Alertas">
        <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
      </span>
      <span class="rt-head-avatar" aria-label="Perfil">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle class="avatar-bg" cx="16" cy="16" r="14"/>
          <path class="avatar-hair" d="M8.5 14.3c0-6.2 3.5-9.5 7.9-9.5 5 0 8.1 3.9 7.5 10.3-.4-2.6-2-4.4-4.1-5.3-1.4 2-4.6 3.3-8.7 3.1-.2 2.6.3 5.1 1.7 7.2-2.8-1.1-4.3-3-4.3-5.8Z"/>
          <ellipse class="avatar-face" cx="16" cy="15" rx="5.3" ry="6.3"/>
          <circle class="avatar-eye" cx="14" cy="14.8" r=".55"/><circle class="avatar-eye" cx="18.1" cy="14.8" r=".55"/>
          <path class="avatar-mouth" d="M14.6 17.8c1 .8 2 .8 2.9 0"/>
          <path class="avatar-shirt" d="M7.7 27c1.1-4.5 4-6.8 8.3-6.8 4.2 0 7.1 2.3 8.3 6.8"/>
        </svg>
      </span>
      <div class="rt-dateblock"><small id="rtDateText">—</small><b>(GMT-3)</b></div>
      <div class="rt-clockblock"><b id="rtClockText">--:--</b><small>(GMT-3)</small></div>
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
  const t=now.toLocaleTimeString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hour12:false});
  const dp=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',weekday:'short',day:'2-digit',month:'short',year:'numeric'}).formatToParts(now);
  const dm=Object.fromEntries(dp.map(x=>[x.type,x.value.replace('.','')]));
  const cap=s=>s?String(s).charAt(0).toUpperCase()+String(s).slice(1):'';
  const d=`${cap(dm.weekday)} ${dm.day} ${cap(dm.month)} ${dm.year}`;
  if($('rtClockText'))$('rtClockText').textContent=t;
  if($('rtDateText'))$('rtDateText').textContent=d;
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
      <div class="rt-map-head"><h2>Mapa de Sentimiento Global</h2><p>Rendimiento regional (últimas 24 hs)</p></div>
      <div class="rt-session-box">
        <div id="rtSessionFlag" class="rt-session-flag">🇺🇸</div>
        <div class="rt-session-copy"><small>Sesión activa</small><b id="rtSessionName">Calculando…</b></div>
        <span class="rt-session-dot"></span>
        <div class="rt-session-count"><small>Cierra en</small><b id="rtSessionCountdown">--:--:--</b></div>
      </div>
      <div id="rtNextSessions" class="rt-next-sessions"><b>Próximas sesiones:</b><div id="rtNextSessionRows"></div></div>
      <div class="rt-world-wrap">
        <div id="rtWorldMapHost" class="rt-world-map rt-world-map-host" aria-label="Mapa mundial interactivo">
          <div class="rt-map-loading"><span></span><b>Cargando cartografía de mercado…</b></div>
        </div>
        <div class="rt-map-label rt-label-na" data-label-region="northamerica"><b>América del Norte</b><strong>—</strong><small>S&P 500 · NASDAQ</small></div>
        <div class="rt-map-label rt-label-eu" data-label-region="europe"><b>Europa</b><strong>—</strong><small>DAX · FTSE · CAC</small></div>
        <div class="rt-map-label rt-label-asia" data-label-region="asia"><b>Asia</b><strong>—</strong><small>NIKKEI · HANG SENG</small></div>
        <div class="rt-map-label rt-label-latam" data-label-region="latam"><b>LatAm</b><strong>—</strong><small>BOVESPA · MERVAL</small></div>
        <div class="rt-map-label rt-label-oceania" data-label-region="oceania"><b>Oceanía</b><strong>—</strong><small>ASX 200</small></div>
        <div class="rt-map-legend">
          <div class="rt-legend-line"><i class="s1"></i>Fuerte alza</div>
          <div class="rt-legend-line"><i class="s2"></i>Alza moderada</div>
          <div class="rt-legend-line"><i class="s3"></i>Neutral</div>
          <div class="rt-legend-line"><i class="s4"></i>Caída moderada</div>
          <div class="rt-legend-line"><i class="s5"></i>Fuerte caída</div>
        </div>
      </div>
    </section>

    <div class="rt-middle-stack">
    <section class="rt-card rt-risk-card">
      <div class="rt-risk-card-left">
        <span>Riesgo Global</span>
        <div class="rt-risk-gauge"><span class="zone low"></span><span class="zone mid"></span><span class="zone high"></span><i id="rtRiskNeedle" style="left:50%"></i></div>
      </div>
      <div class="rt-risk-card-right">
        <b id="rtRiskLabel">CALCULANDO</b>
        <div class="rt-risk-meta"><span id="rtRiskVix">VIX —</span><i></i><span id="rtRiskMove">MOVE —</span><span id="rtRiskTnx" hidden>US10Y —</span></div>
      </div>
    </section>
    <section id="rtRegionDetail" class="rt-card rt-detail-card">
      <div class="rt-section-title"><div><h3 id="rtDetailTitle">Detalle de Región: Europa</h3><p id="rtDetailSubtitle">Índices principales y tendencia</p></div><button id="rtRegionOpen" class="rt-link-button">Abrir vista completa →</button></div>
      <div class="rt-detail-topgrid">
        <div class="rt-detail-map">
          <div id="rtDetailGeoHost" class="rt-detail-geo-host"></div>
        </div>
        <div id="rtRegionList" class="rt-detail-list"></div>
      </div>
      <div class="rt-detail-chart">
        <div class="rt-detail-chart-head"><span id="rtDetailChartName">Índice regional · última sesión</span><b id="rtRegionLastValue">—</b></div>
        <div id="rtDetailYAxis" class="rt-detail-yaxis"><span>—</span><span>—</span></div>
        <svg viewBox="0 0 520 94" preserveAspectRatio="none">
          <defs><linearGradient id="rtAreaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#27d77e" stop-opacity=".30"/><stop offset="100%" stop-color="#27d77e" stop-opacity="0"/></linearGradient></defs>
          <g class="rt-chart-grid"><path d="M7 18H513M7 42H513M7 66H513"/><path d="M104 8V80M208 8V80M312 8V80M416 8V80"/></g>
          <path id="rtRegionArea" class="area" d=""/><path id="rtRegionSpark" d=""/>
        </svg>
        <div id="rtDetailAxis" class="rt-detail-axis"><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span><span>—</span></div>
      </div>
    </section>
    </div>

    <section class="rt-card rt-watch-card">
      <div class="rt-section-title"><div><h3>Watchlist</h3><p>Mercados clave</p></div><button id="rtWatchAll" class="rt-link-button">Ver todo</button></div>
      <div id="rtWatchList" class="rt-watch-list"></div>
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
    <div class="rt-opps-layout">
      <div class="rt-opps-wrap">
        <table class="rt-opps-table">
          <thead><tr><th>Activo</th><th>Tipo</th><th>Último precio</th><th>Var. 24h</th><th>Volumen</th><th>Gráfico 20d</th><th>Setup técnico</th><th>Tendencia</th><th>Timing</th><th>Comentario</th></tr></thead>
          <tbody id="rtOppsBody"><tr><td colspan="10" class="rt-opps-empty">Analizando oportunidades con datos reales…</td></tr></tbody>
        </table>
      </div>
      <aside class="rt-opps-aside">
        <div class="rt-legend-panel">
          <b>Leyenda de Colores</b>
          <div><i class="s1"></i><span>Fuerte alza</span><small>&gt; +2%</small></div>
          <div><i class="s2"></i><span>Alza moderada</span><small>+0,5% a +2%</small></div>
          <div><i class="s3"></i><span>Neutral</span><small>-0,5% a +0,5%</small></div>
          <div><i class="s4"></i><span>Caída moderada</span><small>-2% a -0,5%</small></div>
          <div><i class="s5"></i><span>Fuerte caída</span><small>&lt; -2%</small></div>
        </div>
        <div class="rt-source-panel">
          <b>Fuentes y mercado</b>
          <p><span class="rt-status-dot"></span>Datos en tiempo real</p>
          <small>Bolsas, índices, commodities, bonos y tipo de cambio. Delayed en algunos mercados.</small>
        </div>
      </aside>
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
  qa('.rt-market-marker').forEach(m=>m.classList.remove('active-session'));
  if(active){
    $('rtSessionName').textContent=active.name;$('rtSessionFlag').textContent=active.flag;
    const cityMap={'Nueva York':'sp500','Londres':'ftse','Tokio':'nikkei','Sídney':'asx'};
    const activeAsset=cityMap[active.name];
    if(activeAsset)qa(`.rt-market-marker[data-marker-asset="${activeAsset}"]`).forEach(m=>m.classList.add('active-session'));
    const left=Math.max(0,active.left),hh=Math.floor(left/3600),mm=Math.floor((left%3600)/60),ss=Math.floor(left%60);
    $('rtSessionCountdown').textContent=[hh,mm,ss].map(x=>String(x).padStart(2,'0')).join(':');
  }else{
    $('rtSessionName').textContent='Entre sesiones';$('rtSessionFlag').textContent='🌐';$('rtSessionCountdown').textContent='—';
  }
  if($('rtNextSessionRows')){
    const next=sessions.map(x=>({...x,delta:nextOpenDelta(date,x)})).sort((a,b)=>a.delta-b.delta).slice(0,3);
    $('rtNextSessionRows').innerHTML=next.map(x=>`<span><i>${x.flag}</i><b>${x.name}</b><small>+${Math.floor(x.delta/3600)}h ${Math.floor((x.delta%3600)/60)}m</small></span>`).join('');
  }
}

async function fetchBatch(force=false){
  const symbols=[...new Set(ASSETS.map(x=>x.symbol))];
  const intradaySymbols=[...new Set(Object.values(REGIONS).map(r=>ASSET_BY_ID[r.focus]?.symbol).filter(Boolean))];
  const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),45000);
  try{
    const stamp=Date.now(),fresh=force?'1':'0';
    const dailyUrl=`/api/yahoo-batch?symbols=${encodeURIComponent(symbols.join(','))}&range=6mo&interval=1d&fresh=${fresh}&_=${stamp}`;
    const intraUrl=`/api/yahoo-batch?symbols=${encodeURIComponent(intradaySymbols.join(','))}&range=5d&interval=15m&fresh=${fresh}&_=${stamp}`;
    const [dailyRes,intraRes]=await Promise.all([
      fetch(dailyUrl,{cache:'no-store',signal:ctrl.signal}),
      fetch(intraUrl,{cache:'no-store',signal:ctrl.signal}).catch(()=>null)
    ]);
    if(!dailyRes.ok)throw new Error(`Mercado HTTP ${dailyRes.status}`);
    const j=await dailyRes.json();
    for(const x of (j.items||[])){
      const bars=(x.bars||[]).map(b=>({time:num(b.time),close:num(b.close),volume:num(b.volume)})).filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close));
      state.markets.set(String(x.symbol),{ok:!!x.ok,last:num(x.last),changePct:num(x.changePct),bars,source:x.source||j.source||'Yahoo Finance',time:num(x.time),error:x.error||''});
    }
    if(intraRes?.ok){
      const intraday=await intraRes.json();
      for(const x of (intraday.items||[])){
        const bars=(x.bars||[]).map(b=>({time:num(b.time),close:num(b.close)})).filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close));
        if(bars.length>2)state.intraday.set(String(x.symbol),{ok:!!x.ok,last:num(x.last),changePct:num(x.changePct),bars,source:x.source||intraday.source||'Yahoo Finance'});
      }
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
  if(v>=2)return'strong-up';if(v>=.5)return'mod-up';if(v<=-2)return'strong-down';if(v<=-.5)return'mod-down';return'neutral';
}
function signClass(v){return !Number.isFinite(v)?'rt-flat':v>.03?'rt-up':v<-.03?'rt-down':'rt-flat'}

function renderMap(){
  qa('#rtWorldMapHost .rt-market-marker').forEach(m=>{
    m.classList.remove('up','down','neutral');
    m.classList.add(markerTone(m.dataset.markerAsset));
  });
  qa('#rtWorldMapHost .rt-region-aura').forEach(a=>{
    const key=a.dataset.glowRegion,ch=regionChange(key,'day'),tone=toneClass(ch);
    a.classList.remove('strong-up','mod-up','neutral','mod-down','strong-down');
    a.classList.add(tone);
  });
  const countries=qa('#rtWorldMapHost .rt-country');
  countries.forEach(el=>{
    const key=el.dataset.region;
    const mapped=COUNTRY_MARKET[el.dataset.code];
    const ch=mapped?periodChange(get(mapped),'day'):regionChange(key,'day');
    const tone=toneClass(ch);
    el.classList.remove('strong-up','mod-up','neutral','mod-down','strong-down');
    el.classList.add(tone);
    el.classList.toggle('selected-region',key===state.selectedRegion);
  });
  for(const key of Object.keys(REGIONS)){
    const ch=regionChange(key,'day');
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
  const riskValue=num(risk.value);
  const hist=(risk.history||[]).map(x=>num(x.value)).filter(Number.isFinite);
  const riskPrev=Number.isFinite(num(risk.previous))?num(risk.previous):(hist.length>1?hist.at(-2):NaN);
  const riskPct=Number.isFinite(riskValue)&&Number.isFinite(riskPrev)&&riskPrev!==0?(riskValue/riskPrev-1)*100:NaN;
  rows.push(`<div class="rt-watch-row"><span class="rt-watch-symbol"><i>🇦🇷</i><b>RIESGO PAÍS</b></span><span class="wv">${Number.isFinite(riskValue)?fmt(riskValue,0):'—'}</span><span class="wc ${Number.isFinite(riskPct)?(riskPct<0?'rt-up':riskPct>0?'rt-down':'rt-flat'):'rt-flat'}">${pct(riskPct)}</span></div>`);
  $('rtWatchList').innerHTML=rows.join('');
}

function riskModel(){
  const vix=get('vix'),move=get('move'),tnx=get('tnx'),dxy=get('dxy'),eem=get('eem');
  let score=50;
  const vv=num(vix?.last),mv=num(move?.last);
  if(Number.isFinite(vv))score+=(vv-18)*2.2;
  if(Number.isFinite(mv))score+=(mv-100)*0.18;
  const tc=periodChange(tnx,'day');if(Number.isFinite(tc))score+=clamp(tc*3,-10,10);
  const dc=periodChange(dxy,'day');if(Number.isFinite(dc))score+=clamp(dc*5,-8,8);
  const ec=periodChange(eem,'day');if(Number.isFinite(ec))score-=clamp(ec*5,-10,10);
  score=clamp(score,5,95);
  const label=score<34?'BAJO':score<67?'MODERADO':'ALTO';
  return{score,label};
}
function renderRisk(){
  const r=riskModel();$('rtRiskLabel').textContent=r.label;$('rtRiskNeedle').style.left=`${r.score}%`;
  const v=get('vix'),mv=get('move'),t=get('tnx');
  $('rtRiskVix').textContent=`VIX ${Number.isFinite(v?.last)?fmt(v.last,1):'—'}`;
  $('rtRiskMove').textContent=`MOVE ${Number.isFinite(mv?.last)?fmt(mv.last,1):'—'}`;
  $('rtRiskTnx').textContent=`US10Y ${Number.isFinite(t?.last)?fmt(t.last,2)+'%':'—'}`;
}

function focusSeries(item,maxBars=40){
  const bars=(item?.bars||[]).slice(-maxBars);
  return bars.map(b=>num(b.close)).filter(Number.isFinite);
}
function intradaySeries(key){
  const region=REGIONS[key],asset=ASSET_BY_ID[region?.focus],item=asset?state.intraday.get(asset.symbol):null;
  const bars=(item?.bars||[]).slice(-40);
  if(bars.length<3)return null;
  const values=bars.map(b=>num(b.close)).filter(Number.isFinite);
  return values.length>2?{values,bars,item}:null;
}
function formatChartTime(ts){
  if(!Number.isFinite(num(ts)))return'—';
  return new Date(num(ts)*1000).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'});
}
function renderDetailAxis(bars){
  const root=$('rtDetailAxis');if(!root)return;
  const spans=[...root.children];
  if(!bars?.length){spans.forEach(x=>x.textContent='—');return}
  spans.forEach((el,i)=>{
    const idx=Math.round(i*(bars.length-1)/Math.max(1,spans.length-1));
    el.textContent=formatChartTime(bars[idx]?.time);
  });
}
function renderDetailYAxis(values,decimals=1){
  const root=$('rtDetailYAxis');if(!root)return;
  const spans=[...root.children],clean=(values||[]).filter(Number.isFinite);
  if(!clean.length){spans.forEach(x=>x.textContent='—');return}
  const hi=Math.max(...clean),lo=Math.min(...clean);
  if(spans[0])spans[0].textContent=fmt(hi,decimals);
  if(spans[1])spans[1].textContent=fmt(lo,decimals);
}
function regionSeries(key){
  const region=REGIONS[key];
  const focus=region?.focus?get(region.focus):null;
  const direct=focusSeries(focus,40);
  if(direct.length>1)return direct;
  const items=(region?.ids||[]).map(get).filter(x=>x?.bars?.length);
  if(!items.length)return[];
  const length=Math.min(...items.map(x=>x.bars.length),40),series=[];
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
  $('rtDetailSubtitle').textContent=`${region.indices} · rendimiento y amplitud`;
  renderDetailGeo(key);
  const rows=region.ids.map(id=>{
    const a=ASSET_BY_ID[id],m=get(id),ch=periodChange(m,'day');
    const wk=periodChange(m,'week');
    return `<div class="rt-market-line">
      <b>${a.flag} ${esc(a.detailName||a.name)}</b>
      <span class="price">${Number.isFinite(m?.last)?fmt(m.last,a.decimals):'—'}</span>
      <span class="chg ${signClass(ch)}">${pct(ch)}</span>
    </div>`;
  });
  $('rtRegionList').innerHTML=rows.join('');
  const focusAsset=ASSET_BY_ID[region.focus],intra=intradaySeries(key);
  const values=intra?.values?.length?intra.values:regionSeries(key);
  const d=svgLine(values,520,94,8);$('rtRegionSpark').setAttribute('d',d);
  const last=regionChange(key,'day');
  $('rtRegionLastValue').textContent=pct(last);
  $('rtRegionLastValue').className=signClass(last);
  $('rtDetailChartName').textContent=`${focusAsset?.name||region.short} · Últimas 24 hs`;
  renderDetailAxis(intra?.bars||[]);
  renderDetailYAxis(values,focusAsset?.decimals??1);
  if(d){const area=`${d} L512,86 L8,86 Z`;$('rtRegionArea').setAttribute('d',area)}else $('rtRegionArea').setAttribute('d','');
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
  if(score>.2)return{key:'positive',label:'POSITIVO',copy:'Mejora en bonos y flujo de capitales.'};
  if(score<-.2)return{key:'negative',label:'NEGATIVO',copy:'Mayor aversión al riesgo y presión local.'};
  return{key:'neutral',label:'NEUTRAL',copy:'Lateral, con volatilidad.'};
}
function trafficDrivers(period){
  const raw=[
    periodChange(get('merval'),period),
    periodChange(get('eem'),period),
    -(periodChange(get('vix'),period)||0),
    -(periodChange(get('tnx'),period)||0),
    -(localRiskChange(period)||0)
  ].map(v=>Number.isFinite(v)?v:0);
  const max=Math.max(0.15,...raw.map(v=>Math.abs(v)));
  return raw.map(v=>({v,h:clamp(22+Math.abs(v)/max*48,22,70)}));
}
function trafficNarrative(period,s){
  if(period==='month'&&s.key==='positive')return'Tendencia alcista si se sostienen las señales.';
  return s.copy;
}
function renderTraffic(){
  const defs=[['Hoy','day'],['Semana','week'],['Mes','month']];
  $('rtTrafficGrid').innerHTML=defs.map(([label,p])=>{
    const score=scoreArgentina(p),s=trafficState(score);
    return `<article class="rt-traffic-card">
      <div class="rt-light ${s.key}"><i></i><i></i><i></i></div>
      <div class="rt-traffic-copy"><small>${label==='Hoy'?'Argentina Hoy':label}</small><strong class="${s.key}">${s.label}</strong><p>${esc(trafficNarrative(p,s))}</p></div>
      <div class="rt-driver-chart ${s.key}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </article>`;
  }).join('');
}

const SIGNAL_ICONS={
  rates:'<svg viewBox="0 0 24 24"><path d="M3 20h18M5 18V9m4 9V6m4 12V10m4 8V4m4 14v-7"/><path d="m4 7 5-4 4 3 7-5"/></svg>',
  vix:'<svg viewBox="0 0 24 24"><path d="M3 18 7 12l4 3 5-9 5 4"/><path d="M3 21h18"/></svg>',
  oil:'<svg viewBox="0 0 24 24"><path d="M12 3s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12Z"/><path d="M9 17c1 1 2 1.5 3.5 1.5"/></svg>',
  dollar:'<svg viewBox="0 0 24 24"><path d="M12 2v20M17 6.5c-1.2-1.6-2.9-2.2-5-2.2-3 0-5 1.4-5 3.6 0 5.1 10 2.3 10 7.6 0 2.4-2.1 4.1-5.3 4.1-2.3 0-4.3-.8-5.7-2.5"/></svg>',
  globe:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.3 3 14.7 0 18M12 3c-3 3.3-3 14.7 0 18"/></svg>',
  risk:'<svg viewBox="0 0 24 24"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/></svg>'
};
function signalRow(icon,name,value,change,polarity,note,override=null){
  const c=num(change);let stateKey='warn',label='NEUTRAL',arrow='•';
  if(Number.isFinite(c)&&Math.abs(c)>.03){
    const adverse=(c>0&&polarity==='upbad')||(c<0&&polarity==='downbad');
    stateKey=adverse?'bad':'good';label=c>0?'ALZA':'BAJA';arrow=c>0?'↑':'↓';
  }
  if(override){
    if(override.label)label=override.label;
    if(override.kind)stateKey=override.kind;
    if(override.arrow!==undefined)arrow=override.arrow;
  }
  return `<div class="rt-signal-row"><span class="rt-signal-icon">${SIGNAL_ICONS[icon]||''}</span><b>${esc(name)}</b><span class="rt-signal-arrow ${signClass(c)}">${arrow}</span><span class="rt-signal-value">${value||''}</span><span class="rt-signal-state ${stateKey}">${label}</span><span class="rt-signal-note">${esc(note)}</span></div>`;
}
function renderSignals(){
  const tnx=get('tnx'),vix=get('vix'),wti=get('wti'),dxy=get('dxy'),eem=get('eem');
  const oil=periodChange(wti,'day'),yieldCh=periodChange(tnx,'day'),vixCh=periodChange(vix,'day'),dxyCh=periodChange(dxy,'day'),eemCh=periodChange(eem,'day');
  const inflationPressure=(Number.isFinite(oil)?oil:0)+(Number.isFinite(yieldCh)?yieldCh*.5:0);
  const emergingRisk=(Number.isFinite(vixCh)?vixCh:0)+(Number.isFinite(yieldCh)?yieldCh:0)-(Number.isFinite(eemCh)?eemCh:0);
  const infState=inflationPressure>.2?{label:'ALZA',kind:'bad',arrow:'♨'}:inflationPressure<-.2?{label:'BAJA',kind:'good',arrow:'↓'}:{label:'NEUTRAL',kind:'warn',arrow:'•'};
  const emState=emergingRisk>1?{label:'ALTO',kind:'bad',arrow:'↘'}:emergingRisk<-.5?{label:'BAJO',kind:'good',arrow:'↗'}:{label:'MODERADO',kind:'warn',arrow:'•'};
  $('rtSignalList').innerHTML=[
    signalRow('rates','Bonos de EE.UU. (Tasas)',Number.isFinite(tnx?.last)?`${fmt(tnx.last,2)}%`:'—',yieldCh,'upbad','Presión bajista para emergentes'),
    signalRow('vix','VIX (volatilidad)',Number.isFinite(vix?.last)?fmt(vix.last,1):'—',vixCh,'upbad','Más aversión al riesgo'),
    signalRow('oil','Petróleo (WTI)',Number.isFinite(wti?.last)?fmt(wti.last,1):'—',oil,'upbad','Presión inflacionaria'),
    signalRow('dollar','Dólar / DXY',Number.isFinite(dxy?.last)?fmt(dxy.last,1):'—',dxyCh,'upbad','Dólar fuerte, más presión local'),
    signalRow('globe','Inflación global','Presión',inflationPressure,'upbad','Presión alcista',infState),
    signalRow('risk','Riesgo para emergentes','',emergingRisk,'upbad','Salida de capitales, mayor volatilidad',emState)
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
const TICKER_ALIAS={
  YPFD:'YPF',PAMP:'PAM',AL30:'AL30',AE38:'AE38',GD30:'GD30',
  GGAL:'GGAL',VIST:'VIST',TGSU2:'TGSU2',AAPL:'AAPL',NVDA:'NVDA',MELI:'MELI'
};
const SECONDARY_TICKER={
  YPFD:'YPFD',PAMP:'PAMP',AL30:'AL30D',AE38:'AE38D',GD30:'GD30D',
  GGAL:'GGAL',VIST:'VIST',TGSU2:'TGSU2'
};
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
  const vals=values.slice(-20),d=svgLine(vals,104,30,2),down=vals.at(-1)<vals[0];
  const area=d?`${d} L102,28 L2,28 Z`:'';
  return `<svg class="rt-spark ${down?'down':''}" viewBox="0 0 104 30" preserveAspectRatio="none"><path class="spark-area" d="${area}"/><path class="spark-line" d="${d}"/></svg>`;
}
function volumeChart(bars){
  const vals=(bars||[]).slice(-14).map(x=>num(x.volume)).filter(Number.isFinite);
  if(vals.length<3)return'<span style="color:#667f92">—</span>';
  const max=Math.max(...vals)||1;
  return `<span class="rt-volume-bars">${vals.map((v,i)=>{
    const up=i===0||num(bars.slice(-14)[i]?.close)>=num(bars.slice(-14)[Math.max(0,i-1)]?.close);
    return `<i class="${up?'up':'down'}" style="height:${Math.max(18,v/max*100)}%"></i>`;
  }).join('')}</span>`;
}
function scoreBars(score){
  const n=clamp(Math.round((num(score)||0)/20),1,5);
  return `<span class="rt-scorebars">${[1,2,3,4,5].map(i=>`<i style="height:${5+i*2+(i<=n?6:0)}px;opacity:${i<=n?1:.25}"></i>`).join('')}</span>`;
}
const OPPORTUNITY_LOADING=[
  {symbol:'YPFD',type:'argstock'},{symbol:'AL30',type:'argbond'},{symbol:'GGAL',type:'argstock'},
  {symbol:'PAMP',type:'argstock'},{symbol:'VIST',type:'argstock'},{symbol:'TGSU2',type:'argstock'}
];
function opportunitySetup(r){
  const a=r?.analysis||{},kind=String(r?.status?.kind||''),br=String(a.breakType||'').toLowerCase();
  if(br.includes('choch alcista'))return'Cambio de estructura';
  if(br.includes('bos alcista'))return'Ruptura de resistencia';
  if(br.includes('choch bajista')||br.includes('bos bajista'))return'Ruptura bajista';
  if(kind==='buy')return'Confirmación técnica';
  if(kind==='near')return'En zona técnica';
  const ema=String(a.emaState||'').toLowerCase();
  if(ema.includes('alcista'))return'Consolidación alcista';
  if(ema.includes('bajista'))return'Presión bajista';
  return kind==='wait'?'Esperar confirmación':'Seguimiento';
}
function opportunityComment(r){
  const kind=String(r?.status?.kind||''),trend=opportunityTrend(r)[0];
  if(kind==='buy')return'Confluencia técnica y momentum favorables.';
  if(kind==='near')return'Cerca de zona válida; falta confirmación.';
  if(kind==='sell')return'Sesgo bajista; evitar entrada long.';
  if(kind==='wait')return trend.startsWith('Alcista')?'Tendencia favorable, todavía sin trigger.':'Sin entrada limpia; esperar confirmación.';
  return'Lectura técnica en seguimiento.';
}
function loadingOpportunityRows(){
  return OPPORTUNITY_LOADING.map(x=>`<tr class="rt-opportunity-loading">
    <td><div class="rt-asset-cell"><b class="ticker">${esc(TICKER_ALIAS[x.symbol]||x.symbol)}</b><small>${esc(SECONDARY_TICKER[x.symbol]||x.symbol)}</small></div></td>
    <td><span class="rt-type rt-type-${x.type}">${x.type==='argbond'?'Bono':'Merval'}</span></td>
    <td><span class="rt-cell-skeleton w55"></span></td><td><span class="rt-cell-skeleton w38"></span></td>
    <td><span class="rt-mini-bars-loading"><i></i><i></i><i></i><i></i><i></i><i></i></span></td>
    <td><span class="rt-spark-loading"></span></td>
    <td><span class="rt-cell-skeleton w78"></span></td><td><span class="rt-cell-skeleton w56"></span></td>
    <td><span class="rt-cell-skeleton w48"></span></td><td><span class="rt-cell-skeleton w90"></span></td>
  </tr>`).join('');
}

function renderOpportunities(){
  const daily=window.RadarDailyRadar?.state;
  const allowed=new Set(['cedear','argstock','argbond','bond']);
  let results=[...(daily?.results||[]),...(daily?.rf||[])].filter(r=>r?.item?.symbol&&allowed.has(String(r.item.type||'').toLowerCase()));
  if(state.filter!=='all')results=results.filter(r=>{
    const t=String(r.item.type||'').toLowerCase();
    return state.filter==='argbond'?(t==='argbond'||t==='bond'):t===state.filter;
  });
  results=results.sort((a,b)=>(num(b?.status?.oppScore??b?.rfScore??b?.score)||0)-(num(a?.status?.oppScore??a?.rfScore??a?.score)||0)).slice(0,6);
  if(!results.length){
    if(!daily?.lastRun||daily?.running){
      $('rtOppsBody').innerHTML=loadingOpportunityRows();
      return;
    }
    $('rtOppsBody').innerHTML='<tr><td colspan="10" class="rt-opps-empty">Sin candidatos con datos válidos para este filtro.</td></tr>';return;
  }
  $('rtOppsBody').innerHTML=results.map(r=>{
    const bars=extractBars(r),rv=relVolume(bars),trend=opportunityTrend(r),tm=timing(r),price=num(r.price??r.last??r.panel?.price),score=num(r?.status?.oppScore??r?.rfScore??r?.score);
    const day=bars.length>1&&bars.at(-2).close?(bars.at(-1).close/bars.at(-2).close-1)*100:NaN;
    const setup=opportunitySetup(r);
    const comment=opportunityComment(r);
    const fullComment=String(r?.reason||r?.why||r?.status?.reason||r?.plan?.reason||comment).replace(/\s+/g,' ').trim();
    return `<tr data-rt-symbol="${esc(r.item.symbol)}" data-rt-type="${esc(r.item.type||'auto')}">
      <td><div class="rt-asset-cell"><b class="ticker">${esc(TICKER_ALIAS[r.item.symbol]||r.item.symbol)}</b><small>${esc(SECONDARY_TICKER[r.item.symbol]||r.item.symbol)}</small></div></td>
      <td><span class="rt-type rt-type-${esc(String(r.item.type||'').toLowerCase())}">${esc(oppType(r))}</span></td>
      <td>${Number.isFinite(price)?fmt(price,2):'—'}</td>
      <td class="${signClass(day)}">${pct(day)}</td>
      <td><div class="rt-volume-cell">${volumeChart(bars)}<small>${Number.isFinite(rv)?fmt(rv,1)+'x':'s/d'}</small></div></td>
      <td>${miniSpark(bars.map(x=>x.close))}</td>
      <td>${esc(setup)}</td>
      <td><span class="rt-trend ${trend[1]}"><i>${trend[1]==='bad'?'↓':trend[1]==='warn'?'●':'↑'}</i>${trend[0]}</span></td>
      <td><span class="rt-pill ${tm[1]}">${tm[0]}</span></td>
      <td title="${esc(fullComment)}">${esc(comment)}</td>
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
  loadWorldMap();
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