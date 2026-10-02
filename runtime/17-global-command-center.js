/* Radar Técnico · Global Command Center
   Visual implementation of the approved global-market dashboard.
   Uses Radar's existing local APIs and analytical engines; no fabricated market values. */
(()=>{
'use strict';

const VERSION='reference-5.0-objective-lock';
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
  loading:false,lastUpdate:0,markets:new Map(),intraday:new Map(),fixedIncome:new Map(),
  selectedRegion:'europe',selectedCountry:null,scope:'global',filter:'all',worldMapLoaded:false,
  universes:{equities:[],cedears:[],fixed:[]},opportunityLeaders:[],
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
  {id:'gold',symbol:'GC=F',name:'Oro',region:'global',flag:'●',decimals:1},
  {id:'soy',symbol:'ZS=F',name:'Soja',region:'global',flag:'●',decimals:1},
  {id:'copper',symbol:'HG=F',name:'Cobre',region:'global',flag:'●',decimals:2},

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

const REGION_FLAGS={northamerica:'🇺🇸',europe:'🇪🇺',asia:'🌏',latam:'🌎',oceania:'🇦🇺'};
const COUNTRY_META={
  ARG:{label:'Argentina',flag:'🇦🇷',region:'latam'},BRA:{label:'Brasil',flag:'🇧🇷',region:'latam'},MEX:{label:'México',flag:'🇲🇽',region:'latam'},
  USA:{label:'Estados Unidos',flag:'🇺🇸',region:'northamerica'},GBR:{label:'Reino Unido',flag:'🇬🇧',region:'europe'},DEU:{label:'Alemania',flag:'🇩🇪',region:'europe'},
  FRA:{label:'Francia',flag:'🇫🇷',region:'europe'},ESP:{label:'España',flag:'🇪🇸',region:'europe'},ITA:{label:'Italia',flag:'🇮🇹',region:'europe'},
  JPN:{label:'Japón',flag:'🇯🇵',region:'asia'},CHN:{label:'China',flag:'🇨🇳',region:'asia'},AUS:{label:'Australia',flag:'🇦🇺',region:'oceania'}
};
function contextInfo(){
  if(state.selectedCountry&&COUNTRY_META[state.selectedCountry]){const c=COUNTRY_META[state.selectedCountry];return{key:state.selectedCountry,label:c.label,flag:c.flag,region:c.region,isArgentina:state.selectedCountry==='ARG'}}
  if(state.scope==='region'&&REGIONS[state.selectedRegion])return{key:state.selectedRegion,label:REGIONS[state.selectedRegion].label,flag:REGION_FLAGS[state.selectedRegion]||'🌐',region:state.selectedRegion,isArgentina:false};
  return{key:'global',label:'Global',flag:'🌐',region:state.selectedRegion,isArgentina:false};
}
function applyContext(region,country=null){if(region&&REGIONS[region])state.selectedRegion=region;state.selectedCountry=country&&COUNTRY_META[country]?country:null;state.scope=state.selectedCountry?'country':(region?'region':'global');renderAll()}
function resetContext(){state.selectedCountry=null;state.scope='global';renderAll()}

const ASSET_BY_ID=Object.fromEntries(ASSETS.map(x=>[x.id,x]));
const OPPORTUNITY_MARKET_SYMBOL={
  GGAL:'GGAL.BA',YPFD:'YPFD.BA',PAMP:'PAMP.BA',VIST:'VIST.BA',TGSU2:'TGSU2.BA',
  AAPL:'AAPL',NVDA:'NVDA',MELI:'MELI',SPY:'SPY',QQQ:'QQQ',
  AL30:'AL30D',AE38:'AE38D',GD30:'GD30D'
};
const OPPORTUNITY_TYPE={
  GGAL:'argstock',YPFD:'argstock',PAMP:'argstock',VIST:'argstock',TGSU2:'argstock',
  AAPL:'cedear',NVDA:'cedear',MELI:'cedear',SPY:'cedear',QQQ:'cedear',
  AL30:'argbond',AE38:'argbond',GD30:'argbond'
};
const OPPORTUNITY_LABEL={
  GGAL:'Grupo Galicia',YPFD:'YPF',PAMP:'Pampa Energía',VIST:'Vista Energy',TGSU2:'Transportadora de Gas del Sur',
  AAPL:'Apple CEDEAR',NVDA:'NVIDIA CEDEAR',MELI:'MercadoLibre CEDEAR',SPY:'S&P 500 CEDEAR',QQQ:'Nasdaq 100 CEDEAR',
  AL30:'Bonar 2030',AE38:'Bonar 2038',GD30:'Global 2030'
};
const OPPORTUNITY_ORDER=['YPFD','AL30','GGAL','PAMP','VIST','TGSU2','AAPL','NVDA','MELI','SPY','QQQ','AE38','GD30'];

const MAP_VIEW={w:1200,h:520,minLat:-60,maxLat:85};
const REGION_VIEWS={
  northamerica:[130,70,320,220],
  europe:[490,45,280,195],
  asia:[790,70,340,240],
  latam:[290,220,240,300],
  oceania:[940,280,260,220],
  argentina:[350,255,115,225]
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
  'NUEVA YORK':[16,5],'LONDRES':[-55,-8],'TOKIO':[9,-7],'SÃO PAULO':[-8,16],'ARGENTINA':[-8,-8],'SÍDNEY':[9,-7],
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
    const r=await fetch('/assets/world-markets.svg?v=20261001-gcc31',{cache:'force-cache'});
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
          if(!defs.querySelector('#rtToneStrongUp')){
            defs.insertAdjacentHTML('beforeend',`
              <linearGradient id="rtToneStrongUp" x1="0" y1="0" x2="0.92" y2="1"><stop offset="0%" stop-color="#6dffc0"/><stop offset="27%" stop-color="#16dc78"/><stop offset="68%" stop-color="#079954"/><stop offset="100%" stop-color="#043923"/></linearGradient>
              <linearGradient id="rtToneModUp" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0%" stop-color="#83eab1"/><stop offset="34%" stop-color="#3fc97c"/><stop offset="100%" stop-color="#155b3b"/></linearGradient>
              <linearGradient id="rtToneNeutral" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0%" stop-color="#7f98a7"/><stop offset="42%" stop-color="#486575"/><stop offset="100%" stop-color="#203746"/></linearGradient>
              <linearGradient id="rtToneModDown" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0%" stop-color="#ff9b83"/><stop offset="35%" stop-color="#ef5944"/><stop offset="100%" stop-color="#792423"/></linearGradient>
              <linearGradient id="rtToneStrongDown" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0%" stop-color="#ff8f9d"/><stop offset="31%" stop-color="#ef334a"/><stop offset="72%" stop-color="#a8152d"/><stop offset="100%" stop-color="#500b1a"/></linearGradient>`);
          }
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
        if(layer&&!svg.querySelector('#rtTerrainOverlay')){
          const terrain=document.createElementNS('http://www.w3.org/2000/svg','g');
          terrain.setAttribute('id','rtTerrainOverlay');
          terrain.setAttribute('pointer-events','none');
          [...layer.querySelectorAll(':scope > .rt-country')].forEach(country=>{
            const clone=country.cloneNode(false);
            clone.removeAttribute('id');
            clone.removeAttribute('data-region');
            clone.removeAttribute('data-country');
            clone.removeAttribute('data-code');
            clone.setAttribute('class','rt-terrain-overlay');
            terrain.appendChild(clone);
          });
          layer.appendChild(terrain);
        }
        layer?.insertAdjacentHTML('beforeend',marketMarkers());
        const tooltip=document.createElement('div');
        tooltip.className='rt-map-tooltip';
        tooltip.hidden=true;
        host.appendChild(tooltip);
        const clearRegionHover=()=>{
          qa('[data-label-region]').forEach(el=>el.classList.remove('rt-region-hover-muted'));
        };
        svg.addEventListener('pointermove',ev=>{
          const country=ev.target.closest?.('.rt-country[data-region]');
          if(!country){
            tooltip.hidden=true;
            clearRegionHover();
            return;
          }
          const region=country.dataset.region;
          const id=COUNTRY_MARKET[country.dataset.code];
          const ch=id?periodChange(get(id),'day'):regionChange(region,'day');
          tooltip.hidden=false;
          tooltip.innerHTML=`<b>${esc(country.dataset.country||'Mercado')}</b><span class="${signClass(ch)}">${pct(ch)}</span><small>${id?esc(ASSET_BY_ID[id]?.name||'Índice'):'Sentimiento regional'}</small>`;
          const box=host.getBoundingClientRect();
          tooltip.style.left=`${clamp(ev.clientX-box.left+12,8,box.width-150)}px`;
          tooltip.style.top=`${clamp(ev.clientY-box.top+12,8,box.height-70)}px`;

          qa('[data-label-region]').forEach(el=>{
            el.classList.toggle('rt-region-hover-muted',el.dataset.labelRegion===region);
          });
        });
        svg.addEventListener('pointerleave',()=>{
          tooltip.hidden=true;
          clearRegionHover();
        });
        svg.addEventListener('click',ev=>{
          const country=ev.target.closest?.('.rt-country[data-region]');
          const key=country?.dataset?.region,code=country?.dataset?.code||null;
          if(key&&REGIONS[key])applyContext(key,code);
        });
      }
    }
    state.worldMapLoaded=true;
    renderMap();
    renderSession(new Date());
    renderReferencePanels();
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
  const detailView=state.selectedCountry==='ARG'?REGION_VIEWS.argentina:(REGION_VIEWS[key]||REGION_VIEWS.europe);
  clone.setAttribute('viewBox',detailView.join(' '));
  clone.setAttribute('preserveAspectRatio','xMidYMid slice');
  clone.querySelectorAll('.rt-country').forEach(p=>{
    const match=state.selectedCountry?p.dataset.code===state.selectedCountry:p.dataset.region===key;
    p.classList.toggle('rt-detail-focus',match);
    p.classList.toggle('rt-detail-dim',!match);
  });
  clone.querySelectorAll('.rt-market-marker').forEach(m=>m.remove());
  clone.querySelectorAll('.rt-region-aura').forEach(a=>{
    a.style.display=a.dataset.glowRegion===key?'':'none';
  });
  clone.querySelector('#rtCountryLayer')?.insertAdjacentHTML('beforeend',marketMarkers(key));
  if(state.selectedCountry==='ARG')clone.querySelectorAll('.rt-market-marker').forEach(m=>{if(m.dataset.markerName!=='ARGENTINA')m.remove()});
  host.replaceChildren(clone);
  const panel=host.closest('.rt-detail-map');
  const view=state.selectedCountry==='ARG'?REGION_VIEWS.argentina:(REGION_VIEWS[key]||REGION_VIEWS.europe);
  if(panel&&view){
    const [vx,vy,vw,vh]=view,rect=panel.getBoundingClientRect();
    const sx=rect.width/Math.max(1,vw),sy=rect.height/Math.max(1,vh);
    panel.style.setProperty('--rt-detail-bg-w',`${(MAP_VIEW.w*sx).toFixed(1)}px`);
    panel.style.setProperty('--rt-detail-bg-h',`${(MAP_VIEW.h*sy).toFixed(1)}px`);
    panel.style.setProperty('--rt-detail-bg-x',`${(-vx*sx).toFixed(1)}px`);
    panel.style.setProperty('--rt-detail-bg-y',`${(-vy*sy).toFixed(1)}px`);
  }
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
      <div class="rt-brand-copy"><b>RADAR TÉCNICO</b><small>MERCADOS EN CONTEXTO</small></div>
    </div>
    <nav class="rt-nav" aria-label="Navegación principal">
      <button data-rt-nav="global" class="active">Vista Global</button>
      <button data-rt-nav="markets">Mercados</button>
      <button data-rt-nav="opportunities">Oportunidades</button>
      <button data-rt-nav="screener">Screener</button>
      <button data-rt-nav="argentina">Argentina</button>
      <button data-rt-nav="education">Educación</button>
    </nav>
    <label class="rt-header-search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
      <input id="rtGlobalSearch" placeholder="Buscar activo (AAPL, GGAL, BTC…)" autocomplete="off">
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
  q('[data-rt-nav="global"]')?.addEventListener('click',()=>{resetContext();goHome()});
  q('[data-rt-nav="markets"]')?.addEventListener('click',()=>goHome('#rtMarketSignals'));
  q('[data-rt-nav="opportunities"]')?.addEventListener('click',()=>goHome('#rtOpportunities'));
  q('[data-rt-nav="screener"]')?.addEventListener('click',()=>clickOriginal('scannerViewBtn'));
  q('[data-rt-nav="argentina"]')?.addEventListener('click',()=>{applyContext('latam','ARG');goHome('#rtArgentinaSignals')});
  q('[data-rt-nav="education"]')?.addEventListener('click',()=>{$('helpBtn')?.click();$('helpViewBtn')?.click()});
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
  <div class="rt-reference-shell">
    <main class="rt-reference-main">
      <section class="rt-card rt-world-card">
        <div class="rt-map-head"><h2>Mapa de Sentimiento Global</h2><p>Rendimiento regional · últimas 24 hs</p><span id="rtContextBadge" class="rt-context-badge">🌐 Global</span></div>
        <div class="rt-session-box">
          <div class="rt-session-label">SESIÓN ACTUAL</div>
          <div class="rt-session-current">
            <div id="rtSessionFlag" class="rt-session-flag">🌐</div>
            <div class="rt-session-copy"><small id="rtSessionStatus">En curso</small><b id="rtSessionName">Calculando…</b></div>
          </div>
          <div class="rt-session-progress"><i id="rtSessionProgress"></i></div>
          <div class="rt-session-window" id="rtSessionWindow">—</div>
          <div class="rt-session-next-label">Próxima sesión</div>
          <div id="rtNextSessions" class="rt-next-sessions"><div id="rtNextSessionRows"></div></div>
          <div class="rt-session-count"><small>Cierra en</small><b id="rtSessionCountdown">--:--:--</b></div>
        </div>
        <div class="rt-world-wrap">
          <div id="rtWorldMapHost" class="rt-world-map rt-world-map-host" aria-label="Mapa mundial interactivo">
            <div class="rt-map-loading"><span></span><b>Cargando cartografía de mercado…</b></div>
          </div>
          <button id="rtMapReset" class="rt-map-reset" hidden>← Volver al mundo</button>
          <div class="rt-map-label rt-label-na" data-label-region="northamerica"><b>América del Norte</b><strong>—</strong><small>S&P 500 · NASDAQ</small></div>
          <div class="rt-map-label rt-label-eu" data-label-region="europe"><b>Europa</b><strong>—</strong><small>DAX · FTSE · CAC</small></div>
          <div class="rt-map-label rt-label-asia" data-label-region="asia"><b>Asia</b><strong>—</strong><small>NIKKEI · HANG SENG</small></div>
          <div class="rt-map-label rt-label-latam" data-label-region="latam"><b>América Latina</b><strong>—</strong><small>BOVESPA · MERVAL</small></div>
          <div class="rt-map-label rt-label-oceania" data-label-region="oceania"><b>Oceanía</b><strong>—</strong><small>ASX 200</small></div>
        </div>
      </section>

      <section class="rt-card rt-sessions-card">
        <div class="rt-sessions-head"><b>Sesiones del mercado</b><span>(hora ARG)</span></div>
        <div id="rtSessionStrip" class="rt-session-strip"></div>
      </section>

      <div class="rt-reference-lower">
        <section id="rtMarketSignals" class="rt-card rt-signals-card">
          <div class="rt-signals-head">
            <div><h2>Semáforos globales <span>(impacto en Argentina)</span></h2><small>Variables reales que condicionan la rueda local</small></div>
            <button id="rtRefresh" class="rt-link-button">Actualizar</button>
          </div>
          <div class="rt-signal-columns"><span>Indicador</span><span>Valor</span><span>Señal</span><span>Impacto en Argentina</span><span>Comentario</span></div>
          <div id="rtSignalList" class="rt-signal-list"></div>
        </section>

        <section id="rtArgentinaSignals" class="rt-card rt-reading-card">
          <div class="rt-reading-head">
            <h2>Lectura para Argentina</h2>
            <div class="rt-reading-tabs"><button class="active">Hoy</button><button>Semana</button><button>Mes</button></div>
          </div>
          <div class="rt-reading-gauge">
            <div class="rt-gauge-arc"></div>
            <i id="rtArgentinaNeedle"></i>
            <strong id="rtArgentinaScore">0,0</strong>
            <b id="rtArgentinaLabel">NEUTRAL - CAUTELA</b>
          </div>
          <div id="rtArgentinaBullets" class="rt-reading-bullets"></div>
        </section>
      </div>

      <section id="rtOpportunities" class="rt-card rt-opps-card">
        <div class="rt-opps-header">
          <div class="rt-opps-title"><h2>Oportunidades en Argentina</h2><p>CEDEARs, Acciones y Bonos · volumen + lectura técnica real</p></div>
          <div class="rt-tabs">
            <button class="rt-tab active" data-rt-filter="all">Destacadas</button>
            <button class="rt-tab" data-rt-filter="cedear">CEDEARs</button>
            <button class="rt-tab" data-rt-filter="argstock">Acciones</button>
            <button class="rt-tab" data-rt-filter="argbond">Bonos</button>
          </div>
          <button id="rtMoreOpps" class="rt-link-button">Ver todas →</button>
        </div>
        <div class="rt-opps-wrap">
          <table class="rt-opps-table">
            <thead><tr><th>Ticker</th><th>Activo</th><th>Tipo</th><th>Precio</th><th>Var. %</th><th>Tendencia</th><th>Volumen</th><th>Señal</th><th>Razón de la oportunidad</th></tr></thead>
            <tbody id="rtOppsBody"><tr><td colspan="9" class="rt-opps-empty">Analizando oportunidades con datos reales…</td></tr></tbody>
          </table>
        </div>
      </section>
    </main>

    <aside class="rt-reference-sidebar">
      <section class="rt-card rt-side-card rt-indices-card">
        <div class="rt-side-head"><h3>Índices principales</h3><button class="rt-link-button">Ver todos →</button></div>
        <div class="rt-side-columns"><span>Índice</span><span>Último</span><span>Var. %</span><span>Tendencia</span></div>
        <div id="rtIndicesList" class="rt-side-list"></div>
      </section>

      <section class="rt-card rt-side-card rt-commodities-card">
        <div class="rt-side-head"><h3>Commodities y monedas</h3></div>
        <div class="rt-side-columns"><span>Activo</span><span>Último</span><span>Var. %</span><span>Tendencia</span></div>
        <div id="rtCommoditiesList" class="rt-side-list"></div>
      </section>

      <section class="rt-card rt-side-card rt-alerts-card">
        <div class="rt-side-head"><h3>Alertas relevantes</h3><span class="rt-live-mini">LIVE</span></div>
        <div id="rtAlertsList" class="rt-alerts-list"></div>
      </section>
    </aside>
  </div>
  <div id="rtRefreshOverlay" class="rt-refresh-overlay" aria-live="polite"><div class="rt-refresh-core"><span class="rt-refresh-spinner"></span><b>Actualizando Radar</b><small id="rtRefreshPhase">Mercados, volumen y oportunidades…</small></div></div>`;
  dash.prepend(root);
  bindDashboard();
}

function bindDashboard(){
  qa('[data-label-region]').forEach(el=>el.addEventListener('click',()=>{
    const key=el.dataset.labelRegion;if(!key||!REGIONS[key])return;
    applyContext(key,null);
  }));
  $('rtRegionOpen')?.addEventListener('click',()=>goHome('#rtRegionDetail'));
  $('rtWatchAll')?.addEventListener('click',()=>clickOriginal('watchlistViewBtn'));
  $('rtMoreOpps')?.addEventListener('click',()=>clickOriginal('scannerViewBtn'));
  $('rtRefresh')?.addEventListener('click',()=>refresh(true));
  $('rtMapReset')?.addEventListener('click',()=>resetContext());
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
    const next=sessions.map(x=>({...x,delta:nextOpenDelta(date,x)})).sort((a,b)=>a.delta-b.delta).slice(0,1);
    $('rtNextSessionRows').innerHTML=next.map(x=>`<span><i>${x.flag}</i><b>${x.name}</b><small>En ${Math.floor(x.delta/3600)}h ${Math.floor((x.delta%3600)/60)}m</small></span>`).join('');
  }
  if(active){
    const duration=Math.max(1,active.close-active.open),elapsed=Math.max(0,active.sec-active.open);
    if($('rtSessionProgress'))$('rtSessionProgress').style.width=`${clamp(elapsed/duration*100,0,100)}%`;
    if($('rtSessionWindow'))$('rtSessionWindow').textContent=`${String(Math.floor(active.open/3600)).padStart(2,'0')}:${String(Math.floor((active.open%3600)/60)).padStart(2,'0')} – ${String(Math.floor(active.close/3600)).padStart(2,'0')}:${String(Math.floor((active.close%3600)/60)).padStart(2,'0')} (local)`;
    if($('rtSessionStatus'))$('rtSessionStatus').textContent='En curso';
  }else{
    if($('rtSessionProgress'))$('rtSessionProgress').style.width='0%';
    if($('rtSessionWindow'))$('rtSessionWindow').textContent='Mercados principales entre sesiones';
    if($('rtSessionStatus'))$('rtSessionStatus').textContent='Próxima apertura';
  }
  renderMarketSessions(date);
}

function applyMapViewport(){
  const svg=q('#rtWorldMapHost svg'),host=$('rtWorldMapHost'),reset=$('rtMapReset');
  if(!svg||!host)return;
  let view=[0,0,MAP_VIEW.w,MAP_VIEW.h];
  if(state.selectedCountry==='ARG')view=REGION_VIEWS.argentina;
  else if(state.scope==='region'||state.scope==='country')view=REGION_VIEWS[state.selectedRegion]||view;
  svg.setAttribute('viewBox',view.join(' '));
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  const zoomed=state.scope!=='global';
  host.closest('.rt-world-card')?.classList.toggle('rt-map-zoomed',zoomed);
  if(reset){reset.hidden=!zoomed;reset.textContent=zoomed?`← Volver al mundo · ${contextInfo().flag} ${contextInfo().label}`:'← Volver al mundo'}
}
function renderMarketSessions(date){
  const root=$('rtSessionStrip');if(!root)return;
  const defs=[
    {label:'Asia',flag:'🌏',tz:'Asia/Hong_Kong',open:9*3600+30*60,close:16*3600,asset:'hangseng',region:'asia'},
    {label:'Sídney',flag:'🇦🇺',tz:'Australia/Sydney',open:10*3600,close:16*3600,asset:'asx',region:'oceania'},
    {label:'Tokio',flag:'🇯🇵',tz:'Asia/Tokyo',open:9*3600,close:15*3600+30*60,asset:'nikkei',region:'asia'},
    {label:'Europa',flag:'🇪🇺',tz:'Europe/London',open:8*3600,close:16*3600+30*60,asset:'stoxx',region:'europe'},
    {label:'Nueva York',flag:'🇺🇸',tz:'America/New_York',open:9*3600+30*60,close:16*3600,asset:'sp500',region:'northamerica'}
  ];
  root.innerHTML=defs.map(x=>{
    const p=zonedParts(date,x.tz),sec=p.h*3600+p.m*60+p.s,weekday=p.day>=1&&p.day<=5;
    const active=weekday&&sec>=x.open&&sec<x.close,upcoming=weekday&&sec<x.open;
    const status=active?'En curso':upcoming?'Próxima':'Cerrada',ch=x.asset?periodChange(get(x.asset),'day'):regionChange(x.region,'day');
    const cls=Number.isFinite(ch)?ch>.03?'positive':ch<-.03?'negative':'neutral':'neutral';
    const hh=s=>String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor((s%3600)/60)).padStart(2,'0');
    return `<article class="rt-session-tile ${active?'active':''}"><div class="rt-session-tile-top"><i>${x.flag}</i><b>${x.label}</b><span class="${cls}"></span></div><small class="${active?'live':''}">${status}</small><div><em>${hh(x.open)} – ${hh(x.close)}</em><strong class="${signClass(ch)}">${pct(ch)}</strong></div></article>`;
  }).join('');
}
function sideMarketRow(assetId,labelOverride=null){
  const a=ASSET_BY_ID[assetId],m=get(assetId);if(!a||!m||!Number.isFinite(m.last))return'';
  const ch=periodChange(m,'day'),bars=(m.bars||[]).map(x=>num(x.close)).filter(Number.isFinite);
  return `<div class="rt-side-row"><b>${esc(labelOverride||a.name)}</b><span>${fmt(m.last,a.decimals)}</span><span class="${signClass(ch)}">${pct(ch)}</span><span>${miniSpark(bars)}</span></div>`;
}
function renderIndicesPanel(){
  const root=$('rtIndicesList');if(!root)return;
  const ids=[['sp500','S&P 500'],['nasdaq','Nasdaq'],['dow','Dow Jones'],['dax','DAX (Alemania)'],['ftse','FTSE 100 (UK)'],['nikkei','Nikkei 225'],['hangseng','Hang Seng (HK)'],['bovespa','Bovespa (BR)'],['merval','S&P Merval (ARG)']];
  const rows=ids.map(([id,label])=>sideMarketRow(id,label)).filter(Boolean);
  root.innerHTML=rows.length?rows.join(''):'<div class="rt-side-empty">Cargando índices…</div>';
}
function renderCommoditiesPanel(){
  const root=$('rtCommoditiesList');if(!root)return;
  const rows=[sideMarketRow('wti','Petróleo WTI'),sideMarketRow('gold','Oro (XAU)'),sideMarketRow('soy','Soja'),sideMarketRow('copper','Cobre'),sideMarketRow('dxy','DXY (Dólar)')].filter(Boolean);
  const ccl=window.RadarDashboardData?.fx?.ccl||{},last=num(ccl.venta),ch=num(ccl.changePct);
  if(Number.isFinite(last)){
    const hist=(ccl.history||[]).map(x=>num(x.value)).filter(Number.isFinite);
    rows.push(`<div class="rt-side-row"><b>USD/ARS (CCL)</b><span>${fmt(last,1)}</span><span class="${signClass(ch)}">${pct(ch)}</span><span>${miniSpark(hist)}</span></div>`);
  }
  const v=sideMarketRow('vix','VIX');if(v)rows.push(v);
  root.innerHTML=rows.join('')||'<div class="rt-side-empty">Cargando commodities…</div>';
}
function renderAlertsPanel(){
  const root=$('rtAlertsList');if(!root)return;
  const now=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'}),rows=[];
  const push=(tone,text)=>rows.push({tone,text});
  const vix=get('vix'),vixCh=periodChange(vix,'day');if(Number.isFinite(vixCh))push(vixCh>0?'bad':'good',`VIX ${vixCh>=0?'sube':'baja'} ${Math.abs(vixCh).toFixed(1)}% · volatilidad global`);
  const oil=get('wti'),oilCh=periodChange(oil,'day');if(Number.isFinite(oilCh))push(oilCh>0?'warn':'good',`WTI ${oilCh>=0?'sube':'baja'} ${Math.abs(oilCh).toFixed(1)}% · energía`);
  const tnx=get('tnx'),tnxCh=periodChange(tnx,'day');if(Number.isFinite(tnxCh))push(tnxCh>0?'bad':'good',`US 10Y ${tnxCh>=0?'sube':'baja'} ${Math.abs(tnxCh).toFixed(2)}% · tasas globales`);
  const dxy=get('dxy'),dxyCh=periodChange(dxy,'day');if(Number.isFinite(dxyCh))push(dxyCh>0?'bad':'good',`DXY ${dxyCh>=0?'se fortalece':'se debilita'} ${Math.abs(dxyCh).toFixed(2)}%`);
  const m=get('merval'),mCh=periodChange(m,'day');if(Number.isFinite(mCh))push(mCh>0?'good':'bad',`Merval ${mCh>=0?'sube':'baja'} ${Math.abs(mCh).toFixed(1)}% en la rueda`);
  const risk=window.RadarDashboardData?.risk||{},rv=num(risk.value),rp=num(risk.previous);
  if(Number.isFinite(rv)){const delta=Number.isFinite(rp)?rv-rp:NaN;push(Number.isFinite(delta)&&delta>0?'bad':Number.isFinite(delta)&&delta<0?'good':'warn',`Riesgo país ${fmt(rv,0)} pb${Number.isFinite(delta)?` · ${delta>=0?'+':''}${fmt(delta,0)} pb`:''}`)}
  root.innerHTML=rows.slice(0,7).map(x=>`<div class="rt-alert-row"><time>${now}</time><i class="${x.tone}"></i><span>${esc(x.text)}</span></div>`).join('')||'<div class="rt-side-empty">Sin alertas con datos válidos.</div>';
}
function renderArgentinaReading(){
  if(!$('rtArgentinaScore'))return;
  const score=clamp(scoreArgentina('day'),-1,1),s=trafficState(score),angle=-78+(score+1)*78;
  $('rtArgentinaScore').textContent=fmt(score,1);
  $('rtArgentinaLabel').textContent=s.key==='positive'?'POSITIVO':s.key==='negative'?'NEGATIVO - CAUTELA':'NEUTRAL - CAUTELA';
  $('rtArgentinaLabel').className=s.key;
  if($('rtArgentinaNeedle'))$('rtArgentinaNeedle').style.transform=`rotate(${angle}deg)`;
  const risk=window.RadarDashboardData?.risk||{},rv=num(risk.value),rp=num(risk.previous),rd=Number.isFinite(rv)&&Number.isFinite(rp)?rv-rp:NaN;
  const metrics=[
    ['tnx','Tasa EE.UU. 10Y',x=>`${fmt(x.last,2)}% · ${pct(periodChange(x,'day'))}`],
    ['vix','VIX',x=>`${fmt(x.last,1)} · ${pct(periodChange(x,'day'))}`],
    ['wti','Petróleo WTI',x=>`${fmt(x.last,1)} · ${pct(periodChange(x,'day'))}`],
    ['dxy','DXY',x=>`${fmt(x.last,1)} · ${pct(periodChange(x,'day'))}`]
  ];
  const bullets=metrics.map(([id,label,fn])=>{const x=get(id);if(!Number.isFinite(x?.last))return'';const ch=periodChange(x,'day'),tone=!Number.isFinite(ch)?'warn':id==='vix'||id==='tnx'||id==='dxy'?(ch>0?'bad':'good'):(ch>0?'warn':'good');return `<div><i class="${tone}"></i><span><b>${label}:</b> ${fn(x)}</span></div>`}).filter(Boolean);
  if(Number.isFinite(rv))bullets.push(`<div><i class="${Number.isFinite(rd)?rd>0?'bad':rd<0?'good':'warn':'warn'}"></i><span><b>Riesgo país:</b> ${fmt(rv,0)} pb${Number.isFinite(rd)?` · ${rd>=0?'+':''}${fmt(rd,0)} pb`:''}</span></div>`);
  $('rtArgentinaBullets').innerHTML=bullets.slice(0,4).join('');
}
function renderReferencePanels(){
  renderIndicesPanel();renderCommoditiesPanel();renderAlertsPanel();renderArgentinaReading();renderMarketSessions(new Date());applyMapViewport();
}

async function fetchHistoryBars(symbol,signal){
  try{
    const r=await fetch(`/api/byma/history?symbol=${encodeURIComponent(symbol)}&days=180&tf=short&_=${Date.now()}`,{cache:'no-store',signal});
    if(!r.ok)return[];
    const h=await r.json(),t=h.t||[],c=h.c||[],v=h.v||[];
    return t.map((time,i)=>({time:num(time),close:num(c[i]),volume:num(v[i])})).filter(x=>Number.isFinite(x.time)&&Number.isFinite(x.close));
  }catch{return[]}
}
function techFromBars(bars){
  const closes=(bars||[]).map(x=>num(x.close)).filter(Number.isFinite);
  if(closes.length<8)return{kind:'wait',label:'SEGUIMIENTO',oppScore:35,setup:'Histórico insuficiente',trend:'Lateral'};
  const last=closes.at(-1),ma5=closes.slice(-5).reduce((a,b)=>a+b,0)/Math.min(5,closes.length),ma20=closes.slice(-20).reduce((a,b)=>a+b,0)/Math.min(20,closes.length);
  const hi20=Math.max(...closes.slice(-20,-1)),lo20=Math.min(...closes.slice(-20,-1));
  const mom5=closes.length>5&&closes.at(-6)?(last/closes.at(-6)-1)*100:0;
  if(last>hi20&&ma5>ma20&&mom5>1)return{kind:'buy',label:'OPORTUNIDAD',oppScore:88,setup:'Ruptura con momentum',trend:'Alcista'};
  if(ma5>ma20&&mom5>.25)return{kind:'near',label:'POSIBLE',oppScore:72,setup:'Tendencia alcista',trend:'Alcista'};
  if(last<lo20||(ma5<ma20&&mom5<-1))return{kind:'sell',label:'NO',oppScore:18,setup:'Presión bajista',trend:'Bajista'};
  return{kind:'wait',label:'SEGUIMIENTO',oppScore:48,setup:'Esperar confirmación',trend:ma5>=ma20?'Alcista':'Lateral'};
}
async function buildLocalOpportunityLeaders(signal){
  const pools=[
    ...(state.universes.equities||[]).slice(0,5).map(x=>({panel:x,type:'argstock'})),
    ...(state.universes.cedears||[]).slice(0,5).map(x=>({panel:x,type:'cedear'})),
    ...(state.universes.fixed||[]).filter(x=>x.category==='LECAP/BONCAP').slice(0,4).map(x=>({panel:x,type:'bill'})),
    ...(state.universes.fixed||[]).filter(x=>x.category!=='LECAP/BONCAP'&&x.type==='bond').slice(0,5).map(x=>({panel:x,type:'argbond'}))
  ];
  const rows=await Promise.all(pools.map(async x=>{
    const symbol=String(x.panel.symbol||'').toUpperCase(),bars=await fetchHistoryBars(symbol,signal),tech=techFromBars(bars);
    const last=num(x.panel.trade??x.panel.closingPrice??bars.at(-1)?.close),prev=bars.length>1?num(bars.at(-2)?.close):NaN;
    const changePct=Number.isFinite(last)&&Number.isFinite(prev)&&prev?((last/prev)-1)*100:NaN;
    const volume=num(x.panel.volumeAmount??x.panel.tradeVolume??x.panel.volume);
    return{item:{symbol,type:x.type,requestedType:x.type,label:symbol,panel:x.panel},status:{kind:tech.kind,label:tech.label,oppScore:tech.oppScore},trend:tech.trend,setup:tech.setup,marketOnly:true,bars,marketData:{last,changePct,volume,bars,source:x.panel?.source||'Open BYMADATA'}};
  }));
  state.opportunityLeaders=rows.filter(r=>Number.isFinite(r.marketData?.last)&&Number.isFinite(r.marketData?.volume)&&r.marketData.volume>0);
}
async function fetchBatch(force=false){
  const adrSymbols=['YPF','GGAL','VIST','PAM'];
  const symbols=[...new Set([...ASSETS.map(x=>x.symbol),...Object.values(OPPORTUNITY_MARKET_SYMBOL),...adrSymbols])];
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
    // Query local BYMA universes sequentially. Open BYMADATA is considerably
    // more reliable when we avoid a three-endpoint burst from the same refresh.
    const equityRes=await fetch('/api/byma/equities?mode=all',{cache:'no-store',signal:ctrl.signal}).catch(()=>null);
    const cedearRes=await fetch('/api/byma/cedears?liquid=1',{cache:'no-store',signal:ctrl.signal}).catch(()=>null);
    const fixedRes=await fetch('/api/byma/fixed-income?kind=all&currency=ALL&liquid=1',{cache:'no-store',signal:ctrl.signal}).catch(()=>null);
    const j=await dailyRes.json();
    for(const x of (j.items||[])){
      const bars=(x.bars||[]).map(b=>({time:num(b.time),close:num(b.close),volume:num(b.volume)})).filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close));
      state.markets.set(String(x.symbol),{ok:!!x.ok,last:num(x.last),changePct:num(x.changePct),volume:num(x.volume),bars,source:x.source||j.source||'Yahoo Finance',time:num(x.time),error:x.error||''});
    }
    if(intraRes?.ok){
      const intraday=await intraRes.json();
      for(const x of (intraday.items||[])){
        const bars=(x.bars||[]).map(b=>({time:num(b.time),close:num(b.close),volume:num(b.volume)})).filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close));
        if(bars.length>2)state.intraday.set(String(x.symbol),{ok:!!x.ok,last:num(x.last),changePct:num(x.changePct),bars,source:x.source||intraday.source||'Yahoo Finance'});
      }
    }
    if(equityRes?.ok){const x=await equityRes.json();state.universes.equities=(x.items||[]).sort((a,b)=>(num(b.volumeAmount)||0)-(num(a.volumeAmount)||0))}
    if(cedearRes?.ok){const x=await cedearRes.json();state.universes.cedears=(x.items||[]).sort((a,b)=>(num(b.volumeAmount)||0)-(num(a.volumeAmount)||0))}
    if(fixedRes?.ok){
      const x=await fixedRes.json();state.universes.fixed=(x.items||[]).sort((a,b)=>(num(b.volumeAmount)||0)-(num(a.volumeAmount)||0));state.fixedIncome.clear();
      for(const item of state.universes.fixed){const symbol=String(item.symbol||'').toUpperCase(),last=num(item.trade??item.closingPrice),volume=num(item.volumeAmount??item.tradeVolume??item.volume);state.fixedIncome.set(symbol,{ok:Number.isFinite(last),last,changePct:NaN,bars:[],volume,source:x.source||'BYMA',panel:item})}
    }
    await buildLocalOpportunityLeaders(ctrl.signal);
    const adrRows=adrSymbols.map(symbol=>{
      const market=state.markets.get(symbol);if(!market||!Number.isFinite(market.last)||!(num(market.volume)>0))return null;
      const tech=techFromBars(market.bars||[]);
      return{item:{symbol,type:'adr',requestedType:'stock',label:symbol},status:{kind:tech.kind,label:tech.label,oppScore:tech.oppScore},trend:tech.trend,setup:tech.setup,marketOnly:true,bars:market.bars||[],marketData:market};
    }).filter(Boolean);
    state.opportunityLeaders.push(...adrRows);
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
function regionalToneClass(v){
  if(!Number.isFinite(v))return'neutral';
  if(v>=1)return'strong-up';if(v>=.05)return'mod-up';if(v<=-1)return'strong-down';if(v<=-.05)return'mod-down';return'neutral';
}
function signClass(v){return !Number.isFinite(v)?'rt-flat':v>.03?'rt-up':v<-.03?'rt-down':'rt-flat'}

function renderMap(){
  const ctx=contextInfo();if($('rtContextBadge'))$('rtContextBadge').textContent=`${ctx.flag} ${ctx.label}`;
  qa('#rtWorldMapHost .rt-market-marker').forEach(m=>{
    m.classList.remove('up','down','neutral');
    m.classList.add(markerTone(m.dataset.markerAsset));
  });
  qa('#rtWorldMapHost .rt-region-aura').forEach(a=>{
    const key=a.dataset.glowRegion,ch=regionChange(key,'day'),tone=regionalToneClass(ch);
    a.classList.remove('strong-up','mod-up','neutral','mod-down','strong-down');
    a.classList.add(tone);
  });
  const countries=qa('#rtWorldMapHost .rt-country');
  countries.forEach(el=>{
    const key=el.dataset.region;
    const mapped=COUNTRY_MARKET[el.dataset.code];
    const ch=mapped?periodChange(get(mapped),'day'):regionChange(key,'day');
    const tone=mapped?toneClass(ch):regionalToneClass(ch);
    el.classList.remove('strong-up','mod-up','neutral','mod-down','strong-down');
    el.classList.add(tone);
    el.classList.toggle('selected-region',key===state.selectedRegion);
    el.classList.toggle('selected-country',!!state.selectedCountry&&el.dataset.code===state.selectedCountry);
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
  applyMapViewport();
}

function renderWatch(){
  const ctx=contextInfo(),rows=[];
  const make=(flag,name,last,ch,dec=2,invert=false)=>{if(!Number.isFinite(last))return;const cls=!Number.isFinite(ch)?'rt-flat':invert?(ch<0?'rt-up':ch>0?'rt-down':'rt-flat'):signClass(ch);rows.push(`<div class="rt-watch-row"><span class="rt-watch-symbol"><i>${flag}</i><b>${esc(name)}</b></span><span class="wv">${fmt(last,dec)}</span><span class="wc ${cls}">${pct(ch)}</span></div>`)};
  if(ctx.isArgentina){
    const m=get('merval');make('🇦🇷','MERVAL',num(m?.last),periodChange(m,'day'),0);
    const risk=window.RadarDashboardData?.risk||{},rv=num(risk.value),rp=num(risk.previous),rch=Number.isFinite(rv)&&Number.isFinite(rp)&&rp?(rv/rp-1)*100:NaN;make('🇦🇷','RIESGO PAÍS',rv,rch,0,true);
    for(const x of (state.universes.equities||[]).slice(0,3))make('🇦🇷',String(x.symbol||''),num(x.trade),NaN,num(x.trade)>=1000?0:2);
    for(const x of (state.universes.fixed||[]).filter(x=>x.type==='bond').slice(0,2))make('🇦🇷',String(x.symbol||''),num(x.trade??x.closingPrice),NaN,2);
  }else if(state.scope==='region'){
    for(const id of (REGIONS[state.selectedRegion]?.ids||[])){const asset=ASSET_BY_ID[id],m=get(id);make(asset.flag,asset.name,num(m?.last),periodChange(m,'day'),asset.decimals)}
    const v=get('vix');make('⚡','VIX',num(v?.last),periodChange(v,'day'),1);
  }else{
    for(const id of ['sp500','nasdaq','dow','dax','nikkei','hangseng','merval']){const asset=ASSET_BY_ID[id],m=get(id);make(asset.flag,asset.name,num(m?.last),periodChange(m,'day'),asset.decimals)}
  }
  const h=q('.rt-watch-card .rt-section-title h3');if(h)h.textContent=ctx.isArgentina?'Watchlist Argentina':state.scope==='region'?`Watchlist ${ctx.label}`:'Watchlist';
  $('rtWatchList').innerHTML=rows.slice(0,8).join('')||'<div class="rt-watch-empty">Sin datos válidos para este contexto.</div>';
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
  const ctx=contextInfo(),key=state.selectedRegion,region=REGIONS[key]||REGIONS.europe,title=ctx.isArgentina?'Argentina':region.label,flag=ctx.isArgentina?'🇦🇷':(ctx.flag||REGION_FLAGS[key]||'🌐');
  const titleNode=$('rtDetailTitle');if(titleNode)titleNode.innerHTML=`<span id="rtDetailFlag" class="rt-detail-flag">${flag}</span> Detalle de ${ctx.isArgentina?'País':'Región'}: ${esc(title)}`;
  $('rtDetailSubtitle').textContent=ctx.isArgentina?'MERVAL · Riesgo País · Bonos · acciones líderes':`${region.indices} · rendimiento y amplitud`;
  renderDetailGeo(key);
  if(ctx.isArgentina){
    const rows=[],m=get('merval'),mch=periodChange(m,'day');
    if(Number.isFinite(m?.last))rows.push(`<div class="rt-market-line"><b>🇦🇷 MERVAL</b><span class="price">${fmt(m.last,0)}</span><span class="chg ${signClass(mch)}">${pct(mch)}</span></div>`);
    const risk=window.RadarDashboardData?.risk||{},rv=num(risk.value),rp=num(risk.previous),rch=Number.isFinite(rv)&&Number.isFinite(rp)&&rp?(rv/rp-1)*100:NaN;
    if(Number.isFinite(rv))rows.push(`<div class="rt-market-line"><b>🇦🇷 Riesgo País</b><span class="price">${fmt(rv,0)}</span><span class="chg ${rch<0?'rt-up':rch>0?'rt-down':'rt-flat'}">${pct(rch)}</span></div>`);
    for(const x of (state.universes.equities||[]).slice(0,4)){const p=num(x.trade),vol=num(x.volumeAmount);if(!Number.isFinite(p))continue;rows.push(`<div class="rt-market-line"><b>🇦🇷 ${esc(x.symbol)}</b><span class="price">${fmt(p,p>=1000?0:2)}</span><span class="chg rt-flat">${Number.isFinite(vol)?compactVolume(vol):'liq.'}</span></div>`)}
    $('rtRegionList').innerHTML=rows.slice(0,6).join('');
  }else{
    $('rtRegionList').innerHTML=region.ids.map(id=>{const asset=ASSET_BY_ID[id],m=get(id),ch=periodChange(m,'day');return `<div class="rt-market-line"><b>${asset.flag} ${esc(asset.detailName||asset.name)}</b><span class="price">${Number.isFinite(m?.last)?fmt(m.last,asset.decimals):'s/d'}</span><span class="chg ${signClass(ch)}">${pct(ch)}</span></div>`}).join('');
  }
  const focusAsset=ASSET_BY_ID[ctx.isArgentina?'merval':region.focus],intra=intradaySeries(ctx.isArgentina?'latam':key),focusItem=ctx.isArgentina?get('merval'):null;
  const values=ctx.isArgentina?focusSeries(focusItem,40):(intra?.values?.length?intra.values:regionSeries(key));
  const d=svgLine(values,520,94,8);$('rtRegionSpark').setAttribute('d',d);
  const last=ctx.isArgentina?periodChange(get('merval'),'day'):regionChange(key,'day');$('rtRegionLastValue').textContent=pct(last);$('rtRegionLastValue').className=signClass(last);
  $('rtDetailChartName').textContent=`${focusAsset?.name||title} · Últimas 24 hs`;
  renderDetailAxis(ctx.isArgentina?(get('merval')?.bars||[]):(intra?.bars||[]));renderDetailYAxis(values,focusAsset?.decimals??1);
  if(d)$('rtRegionArea').setAttribute('d',`${d} L512,86 L8,86 Z`);else $('rtRegionArea').setAttribute('d','');
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
function scoreContext(period){
  const ctx=contextInfo();if(ctx.isArgentina||state.scope==='global')return scoreArgentina(period);
  const local=regionChange(state.selectedRegion,period),vix=periodChange(get('vix'),period),dxy=periodChange(get('dxy'),period),tnx=periodChange(get('tnx'),period);
  const vals=[{v:local,good:1,w:1.8},{v:vix,good:-1,w:1},{v:dxy,good:-1,w:.6},{v:tnx,good:-1,w:.6}];
  let score=0,used=0;for(const x of vals){if(!Number.isFinite(x.v)||Math.abs(x.v)<.02)continue;score+=(x.v>0?1:-1)*x.good*x.w;used+=x.w}return used?score/used:0;
}
function renderTraffic(){
  const ctx=contextInfo(),defs=[['Hoy','day'],['Semana','week'],['Mes','month']];
  const title=q('#rtArgentinaSignals .rt-section-title h2'),sub=q('#rtArgentinaSignals .rt-section-title p');
  if(title)title.textContent=`${ctx.isArgentina?'Argentina':state.scope==='region'?ctx.label:'Argentina'}: Semáforos`;
  if(sub)sub.textContent=ctx.isArgentina?'Lectura local + contexto global':state.scope==='region'?'Lectura del mercado seleccionado + riesgo global':'Lectura combinada del contexto global y local';
  $('rtTrafficGrid').innerHTML=defs.map(([label,p])=>{
    const score=scoreContext(p),s=trafficState(score);
    return `<article class="rt-traffic-card">
      <div class="rt-light ${s.key}"><i></i><i></i><i></i></div>
      <div class="rt-traffic-copy"><small>${label==='Hoy'?(ctx.isArgentina?'Argentina Hoy':state.scope==='region'?ctx.label+' Hoy':'Argentina Hoy'):label}</small><strong class="${s.key}">${s.label}</strong><p>${esc(trafficNarrative(p,s))}</p></div>
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
function signalComment(name,stateKey,change){
  const n=String(name||'').toLowerCase();
  if(n.includes('bonos')||n.includes('10y'))return stateKey==='bad'?'Tasas altas restan flujo a emergentes.':'Menor presión financiera global.';
  if(n.includes('vix'))return stateKey==='bad'?'Aumenta la aversión al riesgo.':'Baja la volatilidad global.';
  if(n.includes('petróleo'))return 'Impacta inflación y sector energético.';
  if(n.includes('dólar')||n.includes('dxy'))return stateKey==='bad'?'Dólar fuerte complica emergentes.':'Dólar más débil alivia emergentes.';
  if(n.includes('emergentes'))return stateKey==='good'?'Mejora el apetito por riesgo emergente.':'Flujo débil hacia emergentes.';
  if(n.includes('riesgo país'))return stateKey==='bad'?'Sube el costo de financiamiento local.':'Mejora el costo de financiamiento local.';
  if(n.includes('merval'))return stateKey==='good'?'Mejora el pulso accionario local.':'Presión sobre acciones argentinas.';
  return stateKey==='bad'?'Condición adversa para riesgo.':stateKey==='good'?'Condición favorable para riesgo.':'Sin señal direccional dominante.';
}
function signalRow(icon,name,value,change,polarity,note,override=null){
  const c=num(change);let stateKey='warn';
  if(Number.isFinite(c)&&Math.abs(c)>.03){
    const adverse=(c>0&&polarity==='upbad')||(c<0&&polarity==='downbad');
    stateKey=adverse?'bad':'good';
  }
  if(/petróleo/i.test(name))stateKey='warn';
  if(override?.kind)stateKey=override.kind;
  const label=override?.label||(stateKey==='bad'?'Negativo':stateKey==='good'?'Positivo':'Mixto');
  return `<div class="rt-signal-row">
    <span class="rt-signal-indicator"><span class="rt-signal-icon">${SIGNAL_ICONS[icon]||''}</span><b>${esc(name)}</b></span>
    <span class="rt-signal-value">${value||'—'}</span>
    <span class="rt-signal-state ${stateKey}"><i></i>${label}</span>
    <span class="rt-signal-impact">${esc(note)}</span>
    <span class="rt-signal-note">${esc(signalComment(name,stateKey,c))}</span>
  </div>`;
}
function renderSignals(){
  const ctx=contextInfo(),tnx=get('tnx'),vix=get('vix'),wti=get('wti'),dxy=get('dxy'),eem=get('eem');
  const oil=periodChange(wti,'day'),yieldCh=periodChange(tnx,'day'),vixCh=periodChange(vix,'day'),dxyCh=periodChange(dxy,'day'),eemCh=periodChange(eem,'day');
  const head=q('#rtMarketSignals .rt-signals-head h2'),note=q('#rtMarketSignals .rt-signals-head small');
  if(head)head.textContent=ctx.isArgentina?'Semáforos de Mercado · Argentina':state.scope==='region'?`Semáforos · ${ctx.label}`:'Semáforos de Mercado';
  if(note)note.textContent=ctx.isArgentina?'Variables que impactan directamente en activos argentinos':state.scope==='region'?'Variables globales + mercado seleccionado':'Cruce de variables globales y su impacto en Argentina';
  const rows=[];
  if(ctx.isArgentina){
    const m=get('merval'),mch=periodChange(m,'day');rows.push(signalRow('globe','MERVAL',Number.isFinite(m?.last)?fmt(m.last,0):'s/d',mch,'downbad','Pulso accionario local'));
    const risk=window.RadarDashboardData?.risk||{},rv=num(risk.value),rp=num(risk.previous),rch=Number.isFinite(rv)&&Number.isFinite(rp)&&rp?(rv/rp-1)*100:NaN;rows.push(signalRow('risk','Riesgo País',Number.isFinite(rv)?fmt(rv,0):'s/d',rch,'upbad','Costo financiero argentino'));
    rows.push(signalRow('dollar','Dólar / DXY',Number.isFinite(dxy?.last)?fmt(dxy.last,1):'s/d',dxyCh,'upbad','Dólar fuerte presiona emergentes'));
    rows.push(signalRow('rates','Bonos EE.UU. 10Y',Number.isFinite(tnx?.last)?fmt(tnx.last,2)+'%':'s/d',yieldCh,'upbad','Tasa global de descuento'));
    rows.push(signalRow('vix','VIX',Number.isFinite(vix?.last)?fmt(vix.last,1):'s/d',vixCh,'upbad','Aversión global al riesgo'));
    rows.push(signalRow('oil','Petróleo WTI',Number.isFinite(wti?.last)?fmt(wti.last,1):'s/d',oil,'downbad','Impacto en energía argentina'));
  }else{
    const focus=REGIONS[state.selectedRegion]?.focus||'sp500',asset=ASSET_BY_ID[focus],fm=get(focus),fch=periodChange(fm,'day');
    if(state.scope==='region'&&asset)rows.push(signalRow('globe',asset.name,Number.isFinite(fm?.last)?fmt(fm.last,asset.decimals):'s/d',fch,'downbad',`Pulso principal de ${ctx.label}`));
    rows.push(signalRow('rates','Bonos de EE.UU. (Tasas)',Number.isFinite(tnx?.last)?fmt(tnx.last,2)+'%':'s/d',yieldCh,'upbad','Condición financiera global'));
    rows.push(signalRow('vix','VIX (volatilidad)',Number.isFinite(vix?.last)?fmt(vix.last,1):'s/d',vixCh,'upbad','Aversión al riesgo'));
    rows.push(signalRow('oil','Petróleo (WTI)',Number.isFinite(wti?.last)?fmt(wti.last,1):'s/d',oil,'upbad','Inflación / energía'));
    rows.push(signalRow('dollar','Dólar / DXY',Number.isFinite(dxy?.last)?fmt(dxy.last,1):'s/d',dxyCh,'upbad','Condición monetaria global'));
    rows.push(signalRow('risk','Emergentes / EEM',Number.isFinite(eem?.last)?fmt(eem.last,2):'s/d',eemCh,'downbad','Apetito por riesgo emergente'));
  }
  $('rtSignalList').innerHTML=rows.filter(Boolean).slice(0,6).join('');
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
  if(r?.marketOnly){
    const bars=opportunityMarket(r)?.bars||[];
    const closes=bars.slice(-21).map(x=>num(x.close)).filter(Number.isFinite);
    if(closes.length>5){
      const last=closes.at(-1),base=closes[0];
      const change=base?((last/base)-1)*100:0;
      if(change>=2)return['Alcista',''];
      if(change<=-2)return['Bajista','bad'];
    }
    return['Lateral','warn'];
  }
  const text=[r?.status?.label,r?.trend,r?.plan?.trend,r?.reason,r?.why].filter(Boolean).join(' ').toLowerCase();
  if(/alcista|buy|compra|long|ruptura/.test(text))return['Alcista',''];
  if(/bajista|sell|venta|short/.test(text))return['Bajista','bad'];
  const market=opportunityMarket(r),closes=(market?.bars||[]).slice(-21).map(x=>num(x.close)).filter(Number.isFinite);
  if(closes.length>5){
    const base=closes[0],last=closes.at(-1),change=base?((last/base)-1)*100:0;
    if(change>=2)return['Alcista',''];
    if(change<=-2)return['Bajista','bad'];
  }
  return['Lateral','warn'];
}
function opportunityPrice(r,price){
  if(!Number.isFinite(price))return's/d';
  const t=opportunityAssetType(r),ccy=String(r?.item?.panel?.denominationCcy||'').toUpperCase();
  if(t==='adr')return 'USD '+fmt(price,2);
  if((t==='argbond'||t==='bond'||t==='bill'||t==='letra')&&ccy==='USD')return 'USD '+fmt(price,2);
  return '$ '+fmt(price,price>=1000?0:2);
}
const TICKER_ALIAS={
  YPFD:'YPF',PAMP:'PAM',AL30:'AL30',AE38:'AE38',GD30:'GD30',
  GGAL:'GGAL',VIST:'VIST',TGSU2:'TGSU2',AAPL:'AAPL',NVDA:'NVDA',MELI:'MELI'
};
const SECONDARY_TICKER={
  YPFD:'YPFD',PAMP:'PAMP',AL30:'AL30D',AE38:'AE38D',GD30:'GD30D',
  GGAL:'GGAL',VIST:'VIST',TGSU2:'TGSU2'
};
function opportunityAssetType(r){
  const symbol=String(r?.item?.symbol||'').toUpperCase();
  return OPPORTUNITY_TYPE[symbol]||String(r?.item?.requestedType||r?.item?.type||'').toLowerCase();
}
function opportunityMarket(r){
  if(r?.marketData)return r.marketData;
  const symbol=String(r?.item?.symbol||'').toUpperCase();
  if(OPPORTUNITY_TYPE[symbol]==='argbond'){
    return state.fixedIncome.get(symbol+'D')||state.fixedIncome.get(symbol)||null;
  }
  const marketSymbol=OPPORTUNITY_MARKET_SYMBOL[symbol];
  return marketSymbol?state.markets.get(marketSymbol):null;
}
function opportunityFallback(symbol){
  return {
    item:{symbol,type:OPPORTUNITY_TYPE[symbol]||'argstock',label:OPPORTUNITY_LABEL[symbol]||symbol},
    status:{kind:'wait',label:'SEGUIMIENTO',oppScore:0},
    marketOnly:true
  };
}
function oppType(r){
  const t=opportunityAssetType(r);
  if(t==='cedear')return'CEDEAR';if(t==='adr')return'ADR';if(t==='bill'||t==='letra')return'Letra';if(t==='argbond'||t==='bond')return'Bono';if(t==='argstock')return'Merval';if(t==='crypto')return'Crypto';return t||'Activo';
}

function opportunityVolumeValue(r){
  const market=opportunityMarket(r);
  const direct=num(market?.volume??r?.volume??r?.item?.panel?.volumeAmount??r?.item?.panel?.tradeVolume??r?.item?.panel?.volume);
  if(Number.isFinite(direct)&&direct>0)return direct;
  const marketBars=(market?.bars||[]).map(x=>num(x.volume)).filter(v=>Number.isFinite(v)&&v>0);
  if(marketBars.length)return marketBars.at(-1);
  const sourceBars=extractBars(r).map(x=>num(x.volume)).filter(v=>Number.isFinite(v)&&v>0);
  return sourceBars.length?sourceBars.at(-1):NaN;
}
function compactVolume(v){
  if(!Number.isFinite(v))return's/d';
  if(v>=1e9)return fmt(v/1e9,1)+'B';
  if(v>=1e6)return fmt(v/1e6,1)+'M';
  if(v>=1e3)return fmt(v/1e3,1)+'K';
  return fmt(v,0);
}
function opportunityDecision(r){
  const kind=String(r?.status?.kind||'').toLowerCase();
  if(kind==='buy')return{label:'OPORTUNIDAD',cls:'yes'};
  if(kind==='near')return{label:'POSIBLE',cls:'near'};
  if(kind==='sell')return{label:'NO',cls:'no'};
  if(kind==='wait')return{label:'SEGUIMIENTO',cls:'watch'};
  return{label:'SEGUIMIENTO',cls:'watch'};
}
function timing(r){
  const kind=String(r?.status?.kind||'');
  if(kind==='buy'||kind==='sell')return['Ahora',''];
  if(kind==='near')return['Corto plazo',''];
  if(kind==='wait')return['Esperar','warn'];
  return['Seguimiento','warn'];
}
function miniSpark(values){
  if(!values.length)return'<span class="rt-data-missing">SIN HIST.</span>';
  const vals=values.slice(-20),d=svgLine(vals,104,30,2),down=vals.at(-1)<vals[0];
  const area=d?`${d} L102,28 L2,28 Z`:'';
  return `<svg class="rt-spark ${down?'down':''}" viewBox="0 0 104 30" preserveAspectRatio="none"><path class="spark-area" d="${area}"/><path class="spark-line" d="${d}"/></svg>`;
}
function volumeChart(bars){
  const vals=(bars||[]).slice(-14).map(x=>num(x.volume)).filter(Number.isFinite);
  if(vals.length<3)return'<span class="rt-data-missing">VOL. ACTUAL</span>';
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
  if(r?.setup)return r.setup;
  if(r?.marketOnly){
    const bars=opportunityMarket(r)?.bars||[];
    if(bars.length>20){
      const closes=bars.slice(-20).map(x=>num(x.close)).filter(Number.isFinite);
      const first=closes[0],last=closes.at(-1),hi=Math.max(...closes.slice(0,-1)),lo=Math.min(...closes.slice(0,-1));
      if(Number.isFinite(last)&&Number.isFinite(hi)&&last>hi)return'Ruptura de resistencia';
      if(Number.isFinite(last)&&Number.isFinite(lo)&&last<lo)return'Pérdida de soporte';
      if(Number.isFinite(first)&&Number.isFinite(last)&&last>first*1.03)return'Consolidación alcista';
      if(Number.isFinite(first)&&Number.isFinite(last)&&last<first*.97)return'Presión bajista';
    }
    return'Seguimiento técnico';
  }
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
  if(r?.marketOnly){const d=opportunityDecision(r);if(d.cls==='yes')return'Volumen alto y señal técnica confirmada.';if(d.cls==='near')return'Volumen alto; falta confirmación de entrada.';if(d.cls==='no')return'Volumen alto, pero estructura técnica desfavorable.';return'Activo líquido en seguimiento técnico.';}
  const kind=String(r?.status?.kind||''),trend=opportunityTrend(r)[0];
  if(kind==='buy')return'Confluencia técnica y momentum favorables.';
  if(kind==='near')return'Cerca de zona válida; falta confirmación.';
  if(kind==='sell')return'Sesgo bajista; evitar entrada long.';
  if(kind==='wait')return trend.startsWith('Alcista')?'Tendencia favorable, todavía sin trigger.':'Sin entrada limpia; esperar confirmación.';
  return'Lectura técnica en seguimiento.';
}
function loadingOpportunityRows(){
  return OPPORTUNITY_LOADING.map(x=>`<tr class="rt-opportunity-loading">
    <td><b class="ticker">${esc(TICKER_ALIAS[x.symbol]||x.symbol)}</b></td>
    <td><span class="rt-cell-skeleton w78"></span></td>
    <td><span class="rt-type rt-type-${x.type}">${x.type==='argbond'?'Bono':'Acción'}</span></td>
    <td><span class="rt-cell-skeleton w55"></span></td>
    <td><span class="rt-cell-skeleton w38"></span></td>
    <td><span class="rt-spark-loading"></span></td>
    <td><span class="rt-cell-skeleton w56"></span></td>
    <td><span class="rt-cell-skeleton w48"></span></td>
    <td><span class="rt-cell-skeleton w90"></span></td>
  </tr>`).join('');
}

function renderOpportunities(){
  const daily=window.RadarDailyRadar?.state;
  const allowed=new Set(['cedear','argstock','argbond','bond','adr','bill','letra','stock']);
  let results=[...(state.opportunityLeaders||[]),...(daily?.results||[]),...(daily?.rf||[])].filter(r=>r?.item?.symbol&&allowed.has(opportunityAssetType(r)));

  const bySymbol=new Map();
  for(const r of results){
    const s=String(r.item.symbol||'').toUpperCase(),k=opportunityAssetType(r)+'|'+s;
    const prev=bySymbol.get(k);
    const score=num(r?.status?.oppScore??r?.rfScore??r?.score)||0;
    const prevScore=num(prev?.status?.oppScore??prev?.rfScore??prev?.score)||-Infinity;
    if(!prev||score>prevScore)bySymbol.set(k,r);
  }

  for(const symbol of OPPORTUNITY_ORDER){
    if([...bySymbol.keys()].some(k=>k.endsWith('|'+symbol)))continue;
    const market=state.markets.get(OPPORTUNITY_MARKET_SYMBOL[symbol]);
    const fixed=state.fixedIncome.get(symbol+'D')||state.fixedIncome.get(symbol);
    if(market?.bars?.length>2||Number.isFinite(market?.last)||Number.isFinite(fixed?.last)){const r=opportunityFallback(symbol);bySymbol.set(opportunityAssetType(r)+'|'+symbol,r);}
  }

  results=[...bySymbol.values()];

  if(state.filter!=='all')results=results.filter(r=>{
    const t=opportunityAssetType(r);
    if(state.filter==='argbond')return t==='argbond'||t==='bond';
    if(state.filter==='bill')return t==='bill'||t==='letra';
    return t===state.filter;
  });

  // Ranking is by liquidity first, but normalized inside each instrument family.
  // This prevents comparing raw CEDEAR share volume against nominal bond volume as if they were equivalent.
  const groups=new Map();
  for(const r of results){
    const t=opportunityAssetType(r);
    if(!groups.has(t))groups.set(t,[]);
    groups.get(t).push(r);
  }
  const volumeRank=new Map();
  for(const [t,rows] of groups){
    rows.sort((a,b)=>{
      const av=opportunityVolumeValue(a),bv=opportunityVolumeValue(b);
      return (Number.isFinite(bv)?bv:-1)-(Number.isFinite(av)?av:-1);
    });
    rows.forEach((r,i)=>volumeRank.set(r,{rank:i+1,total:rows.length,score:rows.length<=1?1:1-i/(rows.length-1)}));
  }

  results=results.sort((a,b)=>{
    const ar=volumeRank.get(a),br=volumeRank.get(b);
    const as=ar?.score??0,bs=br?.score??0;
    if(bs!==as)return bs-as;
    const ad=opportunityDecision(a),bd=opportunityDecision(b);
    const priority={yes:4,near:3,watch:2,no:1};
    if((priority[bd.cls]||0)!==(priority[ad.cls]||0))return(priority[bd.cls]||0)-(priority[ad.cls]||0);
    const av=opportunityVolumeValue(a),bv=opportunityVolumeValue(b);
    return (Number.isFinite(bv)?bv:-1)-(Number.isFinite(av)?av:-1);
  }).slice(0,6);

  if(!results.length){
    if(!daily?.lastRun||daily?.running){
      $('rtOppsBody').innerHTML=loadingOpportunityRows();
      return;
    }
    $('rtOppsBody').innerHTML='<tr><td colspan="9" class="rt-opps-empty">Sin activos con volumen y datos válidos para este filtro.</td></tr>';return;
  }

  $('rtOppsBody').innerHTML=results.map(r=>{
    const market=opportunityMarket(r);
    const sourceBars=extractBars(r);
    const marketBars=(market?.bars||[]).map(x=>({close:num(x.close),volume:num(x.volume)})).filter(x=>Number.isFinite(x.close));
    const bars=marketBars.length>2?marketBars:sourceBars;
    const marketVolumeCount=marketBars.filter(x=>Number.isFinite(x.volume)&&x.volume>0).length;
    const volumeBars=marketVolumeCount>=5?marketBars:sourceBars;
    const rv=relVolume(volumeBars),trend=opportunityTrend(r),decision=opportunityDecision(r);
    const price=Number.isFinite(num(market?.last))?num(market.last):num(r.price??r.last??r.panel?.price);
    const day=Number.isFinite(num(market?.changePct))?num(market.changePct):(bars.length>1&&bars.at(-2).close?(bars.at(-1).close/bars.at(-2).close-1)*100:NaN);
    const setup=opportunitySetup(r);
    const comment=opportunityComment(r);
    const fullComment=String(r?.reason||r?.why||r?.status?.reason||r?.plan?.reason||comment).replace(/\s+/g,' ').trim();
    const vv=opportunityVolumeValue(r),vr=volumeRank.get(r);
    const symbol=String(r.item.symbol||'').toUpperCase(),assetName=OPPORTUNITY_LABEL[symbol]||r.item.label||symbol;
    return `<tr data-rt-symbol="${esc(r.item.symbol)}" data-rt-type="${esc(r.item.requestedType||r.item.type||'auto')}">
      <td><b class="ticker">${esc(TICKER_ALIAS[symbol]||symbol)}</b></td>
      <td class="rt-asset-name">${esc(assetName)}</td>
      <td><span class="rt-type rt-type-${esc(opportunityAssetType(r))}">${esc(oppType(r))}</span></td>
      <td>${opportunityPrice(r,price)}</td>
      <td class="${signClass(day)}">${pct(day)}</td>
      <td><div class="rt-trend-cell">${miniSpark(bars.map(x=>x.close))}<span class="rt-trend ${trend[1]}">${trend[1]==='bad'?'↘':trend[1]==='warn'?'→':'↗'} ${esc(trend[0])}</span></div></td>
      <td><div class="rt-volume-ref"><b>${compactVolume(vv)}</b><small>#${vr?.rank||'—'}${Number.isFinite(rv)?' · '+fmt(rv,1)+'x':''}</small></div></td>
      <td><span class="rt-opp-decision ${decision.cls}">${esc(decision.label)}</span></td>
      <td title="${esc(fullComment)}">${esc(setup+' · '+comment)}</td>
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
  renderMap();renderSession(new Date());renderSignals();renderReferencePanels();renderOpportunities();
}

async function refresh(force=false){
  if(state.loading)return;state.loading=true;document.body.classList.add('rt-refreshing');
  if($('rtRefresh')){$('rtRefresh').disabled=true;$('rtRefresh').textContent='Actualizando…'}
  if($('rtRefreshPhase'))$('rtRefreshPhase').textContent='Actualizando mercados, volumen y contexto…';
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
    state.loading=false;state.lastUpdate=Date.now();document.body.classList.remove('rt-refreshing');
    if($('rtRefresh')){$('rtRefresh').disabled=false;$('rtRefresh').textContent='Actualizar'}
    const live=q('.rt-live');if(live)live.textContent='Actualizado '+new Date(state.lastUpdate).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
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

window.RadarGlobalCommandCenter=Object.freeze({version:VERSION,state,refresh,renderAll,selectRegion:key=>{if(REGIONS[key])applyContext(key,null)},selectArgentina:()=>applyContext('latam','ARG'),resetContext});
})();