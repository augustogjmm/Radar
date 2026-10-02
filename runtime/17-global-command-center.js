/* Radar Técnico · Global Command Center
   Visual implementation of the approved global-market dashboard.
   Uses Radar's existing local APIs and analytical engines; no fabricated market values. */
(()=>{
'use strict';

const VERSION='golden-3.2-reference-complete';
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
  selectedRegion:'europe',selectedCountry:null,scope:'global',filter:'all',rdcPeriod:'day',worldMapLoaded:false,
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
  {id:'eurusd',symbol:'EURUSD=X',name:'EUR/USD',region:'europe',flag:'🇪🇺',decimals:4},
  {id:'vstoxx',symbol:'^V2TX',name:'VSTOXX',region:'europe',flag:'◒',decimals:1},
  {id:'brent',symbol:'BZ=F',name:'Petróleo Brent',region:'global',flag:'◉',decimals:2},
  {id:'bund10',symbol:'^DE10YB',name:'Bund 10Y',detailName:'Bund 10Y (Alemania)',region:'europe',flag:'🇩🇪',decimals:3,unit:'%'},
  {id:'euTech',symbol:'^SX8P',name:'Tecnología',region:'europe-sector',flag:'▦',decimals:1},
  {id:'euBanks',symbol:'^SX7P',name:'Bancos',region:'europe-sector',flag:'▥',decimals:1},
  {id:'euEnergy',symbol:'^SXEP',name:'Energía',region:'europe-sector',flag:'◉',decimals:1},
  {id:'euLuxury',symbol:'^SXQP',name:'Lujo',region:'europe-sector',flag:'◇',decimals:1},
  {id:'euIndustrials',symbol:'^SXNP',name:'Industriales',region:'europe-sector',flag:'⚙',decimals:1},

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
  q('[data-rt-nav="global"]')?.addEventListener('click',()=>{resetContext();goHome()});
  q('[data-rt-nav="argentina"]')?.addEventListener('click',()=>{applyContext('latam','ARG');goHome('#rtArgentinaSignals')});
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
  if($('rtRegionalDecisionCenter')&&!$('rtRegionalDecisionCenter').hidden)renderRegionalDecisionCenter();
}

function mountDashboard(){
  const dash=$('dashboardView');
  if(!dash||$('rtGlobalRadar'))return;
  const root=document.createElement('section');
  root.id='rtGlobalRadar';
  root.innerHTML=`
  <div class="rt-main-grid">
    <section class="rt-card rt-world-card">
      <div class="rt-map-head"><h2>Mapa de Sentimiento Global</h2><p>Rendimiento regional (últimas 24 hs)</p><span id="rtContextBadge" class="rt-context-badge">🌐 Global</span></div>
      <div class="rt-session-box">
        <div id="rtSessionFlag" class="rt-session-flag" aria-label="Banderas de sesiones activas"></div>
        <div class="rt-session-copy"><small>Sesiones activas</small><b id="rtSessionName">Calculando…</b></div>
        <span class="rt-session-dot"></span>
        <div class="rt-session-count"><small>Próximo cierre</small><b id="rtSessionCountdown">--:--:--</b></div>
      </div>
      <div id="rtNextSessions" class="rt-next-sessions"><b>Últimos cierres</b><div id="rtNextSessionRows"></div></div>
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
      <div class="rt-section-title"><div><h3 id="rtDetailTitle"><span id="rtDetailFlag" class="rt-detail-flag">🇪🇺</span> Detalle de Región: Europa</h3><p id="rtDetailSubtitle">Índices principales y tendencia</p></div><button id="rtRegionOpen" class="rt-link-button">Abrir vista completa →</button></div>
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
      <div class="rt-opps-title"><h2>Oportunidades Argentina</h2><p>Mayor volumen por segmento + evaluación real de oportunidad.</p></div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="rt-tabs">
          <button class="rt-tab active" data-rt-filter="all">Todos</button>
          <button class="rt-tab" data-rt-filter="cedear">CEDEARs</button>
          <button class="rt-tab" data-rt-filter="argbond">Bonos</button>
          <button class="rt-tab" data-rt-filter="argstock">Merval</button><button class="rt-tab" data-rt-filter="adr">ADRs</button><button class="rt-tab" data-rt-filter="bill">Letras</button>
        </div>
        <button id="rtMoreOpps" class="rt-link-button">Ver más oportunidades →</button>
      </div>
    </div>
    <div class="rt-opps-layout">
      <div class="rt-opps-wrap">
        <table class="rt-opps-table">
          <thead><tr><th>Activo</th><th>Tipo</th><th>Último precio</th><th>Var. 24h</th><th>Volumen / ranking</th><th>Gráfico 20d</th><th>Setup técnico</th><th>Tendencia</th><th>Oportunidad</th><th>Comentario</th></tr></thead>
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
  </section>
  <div id="rtRefreshOverlay" class="rt-refresh-overlay" aria-live="polite"><div class="rt-refresh-core"><span class="rt-refresh-spinner"></span><b>Actualizando Radar</b><small id="rtRefreshPhase">Mercados, volumen y oportunidades…</small></div></div>`;
  dash.prepend(root);
  bindDashboard();
}

function bindDashboard(){
  qa('[data-label-region]').forEach(el=>el.addEventListener('click',()=>{
    const key=el.dataset.labelRegion;if(!key||!REGIONS[key])return;
    applyContext(key,null);
  }));
  $('rtRegionOpen')?.addEventListener('click',()=>toggleRegionDetailExpanded());
  $('rtWatchAll')?.addEventListener('click',()=>clickOriginal('watchlistViewBtn'));
  $('rtMoreOpps')?.addEventListener('click',()=>clickOriginal('scannerViewBtn'));
  $('rtRefresh')?.addEventListener('click',()=>refresh(true));
  qa('[data-rt-filter]').forEach(b=>b.addEventListener('click',()=>{
    state.filter=b.dataset.rtFilter||'all';
    qa('[data-rt-filter]').forEach(x=>x.classList.toggle('active',x===b));
    renderOpportunities();
  }));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('rtRegionalDecisionCenter')&&!$('rtRegionalDecisionCenter').hidden)closeRegionalDecisionCenter()});
}

function sessionFlagSvg(code){
  const common='viewBox="0 0 28 18" role="img" aria-hidden="true"';
  if(code==='AR')return `<span class="rt-flag-svg"><svg ${common}><rect width="28" height="18" fill="#74acdf"/><rect y="6" width="28" height="6" fill="#fff"/><circle cx="14" cy="9" r="2" fill="#f6b40e"/></svg></span>`;
  if(code==='US')return `<span class="rt-flag-svg"><svg ${common}><rect width="28" height="18" fill="#fff"/><g fill="#b22234"><rect y="0" width="28" height="2"/><rect y="4" width="28" height="2"/><rect y="8" width="28" height="2"/><rect y="12" width="28" height="2"/><rect y="16" width="28" height="2"/></g><rect width="12" height="10" fill="#3c3b6e"/><g fill="#fff"><circle cx="2" cy="2" r=".6"/><circle cx="5" cy="2" r=".6"/><circle cx="8" cy="2" r=".6"/><circle cx="10.5" cy="2" r=".6"/><circle cx="3.5" cy="5" r=".6"/><circle cx="6.5" cy="5" r=".6"/><circle cx="9.5" cy="5" r=".6"/><circle cx="2" cy="8" r=".6"/><circle cx="5" cy="8" r=".6"/><circle cx="8" cy="8" r=".6"/></g></svg></span>`;
  if(code==='GB')return `<span class="rt-flag-svg"><svg ${common}><rect width="28" height="18" fill="#012169"/><path d="M0 0 28 18M28 0 0 18" stroke="#fff" stroke-width="4"/><path d="M0 0 28 18M28 0 0 18" stroke="#c8102e" stroke-width="2"/><path d="M14 0v18M0 9h28" stroke="#fff" stroke-width="6"/><path d="M14 0v18M0 9h28" stroke="#c8102e" stroke-width="3"/></svg></span>`;
  if(code==='JP')return `<span class="rt-flag-svg"><svg ${common}><rect width="28" height="18" fill="#fff"/><circle cx="14" cy="9" r="4.3" fill="#bc002d"/></svg></span>`;
  if(code==='AU')return `<span class="rt-flag-svg"><svg ${common}><rect width="28" height="18" fill="#012169"/><rect width="12" height="8" fill="#012169"/><path d="M0 0 12 8M12 0 0 8" stroke="#fff" stroke-width="2.4"/><path d="M6 0v8M0 4h12" stroke="#fff" stroke-width="3"/><path d="M6 0v8M0 4h12" stroke="#c8102e" stroke-width="1.5"/><g fill="#fff"><circle cx="20" cy="5" r="1"/><circle cx="23" cy="10" r="1"/><circle cx="18" cy="13" r="1"/><circle cx="25" cy="15" r=".8"/></g></svg></span>`;
  if(code==='BR')return `<span class="rt-flag-svg"><svg ${common}><rect width="28" height="18" fill="#009b3a"/><path d="M14 2.2 25 9 14 15.8 3 9Z" fill="#ffdf00"/><circle cx="14" cy="9" r="4.1" fill="#002776"/><path d="M10.5 8.3c2.2-.8 4.9-.5 7 .8" fill="none" stroke="#fff" stroke-width=".7"/></svg></span>`;
  return `<span class="rt-flag-svg rt-flag-generic">🌐</span>`;
}

function toggleRegionDetailExpanded(force){
  const center=$('rtRegionalDecisionCenter');
  const open=typeof force==='boolean'?force:!(center&&!center.hidden);
  if(open)openRegionalDecisionCenter();else closeRegionalDecisionCenter();
}

const RDC_CITY_TZ={
  northamerica:[['Nueva York','America/New_York'],['Chicago','America/Chicago'],['Toronto','America/Toronto']],
  europe:[['Londres','Europe/London'],['Frankfurt','Europe/Berlin'],['París','Europe/Paris'],['Madrid','Europe/Madrid'],['Milán','Europe/Rome']],
  asia:[['Tokio','Asia/Tokyo'],['Hong Kong','Asia/Hong_Kong'],['Shanghái','Asia/Shanghai']],
  latam:[['Buenos Aires','America/Argentina/Buenos_Aires'],['São Paulo','America/Sao_Paulo'],['México','America/Mexico_City']],
  oceania:[['Sídney','Australia/Sydney'],['Melbourne','Australia/Melbourne']]
};

function rdcRegionSessions(key,date=new Date()){
  const defs={
    northamerica:[{name:'Nueva York',tz:'America/New_York',open:9*3600+30*60,close:16*3600,asset:'sp500'}],
    europe:[{name:'Londres',tz:'Europe/London',open:8*3600,close:16*3600+30*60,asset:'stoxx'}],
    asia:[{name:'Tokio',tz:'Asia/Tokyo',open:9*3600,close:15*3600+30*60,asset:'nikkei'}],
    latam:[
      {name:'Argentina',tz:'America/Argentina/Buenos_Aires',open:11*3600,close:17*3600,asset:'merval'},
      {name:'Brasil',tz:'America/Sao_Paulo',open:10*3600,close:17*3600+55*60,asset:'bovespa'}
    ],
    oceania:[{name:'Sídney',tz:'Australia/Sydney',open:10*3600,close:16*3600,asset:'asx'}]
  };
  return (defs[key]||[]).map(x=>{
    const p=zonedParts(date,x.tz),sec=p.h*3600+p.m*60+p.s;
    const clock=p.day>=1&&p.day<=5&&sec>=x.open&&sec<x.close;
    const fresh=sessionMarketFresh(x.asset,date);
    const active=clock&&(fresh===true||(fresh===null&&state.lastUpdate===0));
    return {...x,active,left:active?x.close-sec:NaN};
  });
}
function rdcStatus(key,date=new Date()){
  const active=rdcRegionSessions(key,date).filter(x=>x.active);
  if(!active.length)return{active:false,label:'CERRADA',countdown:'—',sessions:[]};
  const left=Math.min(...active.map(x=>x.left).filter(Number.isFinite));
  return{active:true,label:'ABIERTA',countdown:shortCountdown(left,true),sessions:active};
}
function rdcTone(score){
  if(score>.2)return{label:'Positivo',cls:'good'};
  if(score<-.2)return{label:'Negativo',cls:'bad'};
  return{label:'Neutral',cls:'warn'};
}
function rdcPeriodLabel(){
  return state.rdcPeriod==='month'?'1M':state.rdcPeriod==='week'?'5D':'1D';
}
function rdcMomentum(key){
  const d=regionChange(key,'day'),w=regionChange(key,'week');
  const x=Number.isFinite(w)?w:d;
  if(!Number.isFinite(x))return{label:'Sin datos',cls:'flat'};
  if(x>.35)return{label:'Alcista',cls:'good'};
  if(x<-.35)return{label:'Bajista',cls:'bad'};
  return{label:'Lateral',cls:'warn'};
}
function rdcBreadth(key){
  const vals=(REGIONS[key]?.ids||[]).map(id=>periodChange(get(id),'day')).filter(Number.isFinite);
  const total=vals.length||1,up=vals.filter(v=>v>.03).length,down=vals.filter(v=>v<-.03).length,flat=vals.length-up-down;
  return{up,down,flat,total,upPct:Math.round(up/total*100),downPct:Math.round(down/total*100),flatPct:Math.round(flat/total*100)};
}
function rdcDriverMeta(id,ch){
  const defs={
    vix:{polarity:-1,note:'Volatilidad global y apetito por riesgo.'},
    tnx:{polarity:-1,note:'Condición financiera global y tasa de descuento.'},
    dxy:{polarity:-1,note:'Fortaleza del dólar frente a activos de riesgo.'},
    wti:{polarity:0,note:'Pulso de energía e inflación.'},
    eem:{polarity:1,note:'Flujo hacia mercados emergentes.'},
    bovespa:{polarity:1,note:'Referencia regional para activos latinoamericanos.'},
    merval:{polarity:1,note:'Pulso directo del mercado argentino.'},
    eurusd:{polarity:1,note:'Fortaleza del euro y lectura de actividad europea.'},
    bund10:{polarity:-1,note:'Rendimientos soberanos y condiciones financieras europeas.'},
    vstoxx:{polarity:-1,note:'Volatilidad implícita específica del mercado europeo.'},
    brent:{polarity:0,note:'Energía, inflación y sensibilidad cíclica europea.'}
  };
  const d=defs[id]||{polarity:1,note:'Pulso principal del mercado regional.'};
  let cls='warn',label='NEUTRAL';
  if(Number.isFinite(ch)&&Math.abs(ch)>.03){
    const favorable=d.polarity===0?null:(ch>0?1:-1)*d.polarity>0;
    cls=favorable===null?'warn':favorable?'good':'bad';
    label=favorable===null?'MIXTO':favorable?'POSITIVO':'PRESIÓN';
  }
  return{cls,label,note:d.note};
}
function rdcDisplayLast(id,a,m){
  if(!Number.isFinite(m?.last))return's/d';
  const value=fmt(m.last,a?.decimals??2);
  return (a?.unit==='%'||id==='tnx'||id==='bund10')?value+'%':value;
}
function rdcMarketRow(id){
  const a=ASSET_BY_ID[id],m=get(id);if(!a)return'';
  const ch=periodChange(m,'day'),impact=rdcDriverMeta(id,ch),bars=(m?.bars||[]).map(x=>num(x.close)).filter(Number.isFinite);
  return `<div class="rdc-driver-row">
    <span class="rdc-driver-name"><i>${a.flag||'•'}</i><b>${esc(a.detailName||a.name)}</b></span>
    <span class="rdc-driver-last">${rdcDisplayLast(id,a,m)}</span>
    <span class="rdc-driver-change ${signClass(ch)}">${pct(ch)}</span>
    <span class="rdc-impact ${impact.cls}">${impact.label}</span>
    <span class="rdc-driver-note">${esc(impact.note)}</span>
    <span class="rdc-driver-spark">${miniSpark(bars)}</span>
  </div>`;
}
function rdcOpportunityRows(){
  const specs=[
    {symbol:'GGAL',label:'GGAL (ADR)',market:'GGAL',type:'adr',flag:'🇦🇷'},
    {symbol:'YPFD',label:'YPF (ADR)',market:'YPF',type:'adr',flag:'🇦🇷'},
    {symbol:'PAMP',label:'PAMP (ADR)',market:'PAM',type:'adr',flag:'🇦🇷'},
    {symbol:'AE38',label:'AE38 (Bono 2038)',fixed:'AE38D',type:'argbond',flag:'🇦🇷'},
    {symbol:'AL30',label:'AL30 (Bono 2030)',fixed:'AL30D',type:'argbond',flag:'🇦🇷'},
    {symbol:'SPY',label:'SPY (CEDEAR)',market:'SPY',type:'cedear',flag:'🇺🇸'}
  ];
  const leaderBySymbol=new Map((state.opportunityLeaders||[]).map(r=>[String(r?.item?.symbol||'').toUpperCase(),r]));
  return specs.map(spec=>{
    const leader=leaderBySymbol.get(spec.symbol);
    const market=spec.fixed?state.fixedIncome.get(spec.fixed):state.markets.get(spec.market);
    const bars=(market?.bars||leader?.marketData?.bars||[]).map(x=>({close:num(x.close),volume:num(x.volume)})).filter(x=>Number.isFinite(x.close));
    const price=num(market?.last??market?.trade??market?.closingPrice??leader?.marketData?.last);
    const ch=Number.isFinite(num(market?.changePct))?num(market.changePct):(bars.length>1&&bars.at(-2).close?((bars.at(-1).close/bars.at(-2).close)-1)*100:NaN);
    let trend='Neutral',trendCls='warn';
    if(bars.length>5){
      const first=bars[Math.max(0,bars.length-20)]?.close,last=bars.at(-1)?.close;
      const perf=first&&last?((last/first)-1)*100:0;
      if(perf>1){trend='Alcista';trendCls='good'}else if(perf<-1){trend='Bajista';trendCls='bad'}
    }else if(Number.isFinite(ch)){if(ch>.25){trend='Alcista';trendCls='good'}else if(ch<-.25){trend='Bajista';trendCls='bad'}}
    const setup=leader?opportunitySetup(leader):(trend==='Alcista'?'Seguimiento alcista':trend==='Bajista'?'Presión bajista':'Zona de definición');
    const priceText=!Number.isFinite(price)?'s/d':spec.type==='adr'?'US$ '+fmt(price,2):spec.type==='cedear'?'ARS '+fmt(price,price>=1000?0:2):'US$ '+fmt(price,2);
    return `<div class="rdc-asset-row" data-rdc-symbol="${spec.symbol}" data-rdc-type="${spec.type}">
      <b><i class="rdc-asset-flag">${spec.flag}</i>${esc(spec.label)}</b>
      <span>${priceText}</span>
      <span class="${signClass(ch)}">${pct(ch)}</span>
      <span class="rdc-mini">${miniSpark(bars.map(x=>x.close))}</span>
      <span class="rdc-setup ${trendCls}">${trend.toUpperCase()}</span>
      <span class="rdc-comment">${esc(setup)}</span>
    </div>`;
  }).join('');
}
function rdcTrafficCards(){
  const concise=(p,s)=>{
    if(p==='day')return s.key==='positive'?'Mayor apetito por riesgo.':s.key==='negative'?'Menor apetito por riesgo.':'Señales globales mixtas.';
    if(p==='week')return s.key==='positive'?'Continúa el flujo favorable.':s.key==='negative'?'Continúa la presión externa.':'La semana mantiene tono mixto.';
    return s.key==='positive'?'Mejora el contexto de fondo.':s.key==='negative'?'Persiste presión global.':'Persiste volatilidad global.';
  };
  return [['Hoy','day'],['Semana','week'],['Mes','month']].map(([label,p])=>{
    const score=scoreArgentina(p),s=trafficState(score);
    return `<div class="rdc-impact-card ${s.key}">
      <small>${label}</small>
      <i class="rdc-signal-ring" aria-hidden="true"><span></span></i>
      <b>${s.label}</b>
      <p>${esc(concise(p,s))}</p>
    </div>`;
  }).join('');
}
function rdcChannels(){
  const vixCh=periodChange(get('vix'),'day'),tnxCh=periodChange(get('tnx'),'day'),brCh=periodChange(get('bovespa'),'day');
  const adrIds=['GGAL','YPF','PAM'],adrChanges=adrIds.map(sym=>periodChange(state.markets.get(sym),'day')).filter(Number.isFinite);
  const adrAvg=adrChanges.length?adrChanges.reduce((a,b)=>a+b,0)/adrChanges.length:NaN;
  const rows=[
    [vixCh<-.03?'good':vixCh>.03?'bad':'flat',`VIX ${vixCh<-.03?'cede y mejora':'se mantiene'} el sentimiento global`,pct(vixCh)],
    [tnxCh<-.03?'good':tnxCh>.03?'bad':'flat',`Tasas de EE.UU. ${tnxCh<-.03?'aflojan':'sin alivio claro'}`,pct(tnxCh)],
    [brCh>.03?'good':brCh<-.03?'bad':'flat',`Brasil ${brCh>.03?'acompaña con suba':'marca un tono mixto'}`,pct(brCh)],
    [adrAvg>.03?'good':adrAvg<-.03?'bad':'flat',`ADR argentinos con sesgo ${adrAvg>.03?'positivo':adrAvg<-.03?'negativo':'neutral'}`,pct(adrAvg)]
  ];
  return rows.map(([cls,text,value])=>`<div class="rdc-channel ${cls}"><i>✓</i><span><b>${esc(text)}</b></span><strong>${value}</strong></div>`).join('');
}
function rdcEventTime(m){
  const ts=num(m?.bars?.at(-1)?.time??m?.time);
  if(!Number.isFinite(ts))return new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'});
  return new Date(ts*1000).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'});
}
function rdcEvents(key){
  const ids=[...(REGIONS[key]?.ids||[]).slice(0,2),'vix','tnx','bovespa'];
  const seen=new Set(),events=[];
  for(const id of ids){
    if(seen.has(id))continue;seen.add(id);
    const a=ASSET_BY_ID[id],m=get(id),ch=periodChange(m,'day');if(!a||!Number.isFinite(ch))continue;
    const verb=ch>.03?'sube':ch<-.03?'cae':'permanece estable';
    events.push(`<div class="rdc-event"><time>${rdcEventTime(m)}</time><i class="${signClass(ch)}"></i><span><b>${esc(a.name)} ${verb} ${pct(ch)}</b><small>${esc(rdcDriverMeta(id,ch).note)}</small></span></div>`);
    if(events.length===4)break;
  }
  while(events.length<4){
    events.push(`<div class="rdc-event rdc-event-muted"><time>—</time><i></i><span><b>Sin nuevo cambio relevante</b><small>Esperando actualización válida del mercado.</small></span></div>`);
  }
  return events.join('');
}
function rdcCityClocks(key,date=new Date()){
  return (RDC_CITY_TZ[key]||[]).map(([name,tz])=>{
    const time=date.toLocaleTimeString('es-AR',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false});
    const day=new Intl.DateTimeFormat('es-AR',{timeZone:tz,day:'2-digit',month:'short'}).format(date).replace('.','');
    return `<div class="rdc-city-clock"><i></i><span>${esc(name)}</span><b>${time}</b><small>${esc(day)}</small></div>`;
  }).join('');
}
function rdcFlagMarkup(key){
  if(key==='europe')return `<svg viewBox="0 0 54 36" aria-label="Europa"><rect width="54" height="36" rx="4" fill="#003399"/><g fill="#ffcc00" transform="translate(27 18)">${Array.from({length:12},(_,i)=>{const a=(i*30-90)*Math.PI/180,x=Math.cos(a)*10,y=Math.sin(a)*10;return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.35"/>`}).join('')}</g></svg>`;
  if(key==='northamerica')return sessionFlagSvg('US').replace('rt-flag-svg','rdc-hero-flag-svg');
  if(key==='latam')return `<div class="rdc-region-glyph">🌎</div>`;
  if(key==='asia')return `<div class="rdc-region-glyph">🌏</div>`;
  if(key==='oceania')return sessionFlagSvg('AU').replace('rt-flag-svg','rdc-hero-flag-svg');
  return `<div class="rdc-region-glyph">🌐</div>`;
}
function rdcKpiIcon(kind){
  const icons={
    sentiment:'<svg viewBox="0 0 24 24"><path d="M4 19V12M8 19V8M12 19V5M16 19v-9M20 19V3"/></svg>',
    breadth:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v8h8"/></svg>',
    momentum:'<svg viewBox="0 0 24 24"><path d="m4 6 6 6-6 6M11 6l6 6-6 6M18 6l4 6-4 6"/></svg>',
    volatility:'<svg viewBox="0 0 24 24"><path d="M2 13h3l2-7 3 13 3-10 2 7 2-4h5"/></svg>',
    risk:'<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.2 8 8 10 4.8-2 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-5"/></svg>'
  };return icons[kind]||'';
}
function rdcSectorTiles(key){
  const ids=key==='europe'?[
    ['euTech','Tecnología','▦'],['euBanks','Bancos','▥'],['euEnergy','Energía','◉'],['euLuxury','Lujo','◇'],['euIndustrials','Industriales','⚙']
  ]:(REGIONS[key]?.ids||[]).slice(0,5).map(id=>[id,ASSET_BY_ID[id]?.name||id,'◆']);
  return ids.map(([id,label,icon])=>{
    const ch=periodChange(get(id),state.rdcPeriod||'day');
    return `<div class="${signClass(ch)}"><strong>${pct(ch)}</strong><i>${icon}</i><span>${esc(label)}</span><small>${Number.isFinite(ch)?'Hoy':'sin dato'}</small></div>`;
  }).join('');
}
function rdcMapCalloutData(key){
  const defs={
    europe:[
      ['Londres','ftse',17,35],['Frankfurt','dax',65,25],['París','cac',34,53],['Madrid','ibex',28,74],['Milán','ftsemib',72,61]
    ],
    northamerica:[['Nueva York','sp500',69,48],['Toronto','sp500',55,35]],
    asia:[['Tokio','nikkei',77,54],['Hong Kong','hangseng',46,68],['Shanghái','shanghai',40,42]],
    latam:[['São Paulo','bovespa',66,48],['Buenos Aires','merval',48,72],['México','mexico',23,24]],
    oceania:[['Sídney','asx',63,63]]
  };
  return defs[key]||[];
}
function renderRegionalCenterMap(key){
  const source=q('#rtWorldMapHost svg'),host=$('rtRdcMapHost');if(!source||!host)return;
  const clone=source.cloneNode(true);clone.removeAttribute('id');clone.classList.add('rdc-map-svg');
  clone.setAttribute('viewBox',(REGION_VIEWS[key]||REGION_VIEWS.europe).join(' '));
  clone.setAttribute('preserveAspectRatio','xMidYMid slice');
  clone.querySelectorAll('.rt-country').forEach(p=>{
    const match=p.dataset.region===key;
    p.classList.toggle('rt-detail-focus',match);p.classList.toggle('rt-detail-dim',!match);
  });
  clone.querySelectorAll('.rt-market-marker').forEach(m=>m.remove());
  clone.querySelector('#rtCountryLayer')?.insertAdjacentHTML('beforeend',marketMarkers(key));
  host.replaceChildren(clone);
  const layer=document.createElement('div');layer.className='rdc-map-callouts';
  layer.innerHTML=rdcMapCalloutData(key).map(([label,id,x,y])=>{
    const ch=periodChange(get(id),state.rdcPeriod||'day'),cls=signClass(ch);
    return `<div class="rdc-map-callout ${cls}" style="left:${x}%;top:${y}%"><span>${esc(label)}</span><b>${pct(ch)}</b></div>`;
  }).join('');
  host.appendChild(layer);
}
function mountRegionalDecisionCenter(){
  if($('rtRegionalDecisionCenter'))return;
  const el=document.createElement('section');el.id='rtRegionalDecisionCenter';el.className='rdc-shell';el.hidden=true;
  el.innerHTML=`
    <header class="rdc-topbar">
      <div class="rdc-brand"><span class="rdc-brand-mark"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 35 15 8l10 18L34 6l7 32-17-11L7 35Z"/><path class="pulse" d="M5 33 16 20l8 7 18-16"/><circle cx="24" cy="27" r="2.2"/></svg></span><b>Radar Técnico</b></div>
      <nav class="rdc-nav">
        <button data-rdc-action="global">Visión Global</button>
        <button data-rdc-region="europe">Europa</button>
        <button data-rdc-region="northamerica">EE.UU.</button>
        <button data-rdc-region="latam">LatAm</button>
        <button data-rdc-action="markets">Mercados</button>
        <button data-rdc-action="sectors">Sectores</button>
        <button data-rdc-action="news">Noticias</button>
        <button data-rdc-action="calendar">Calendario</button>
      </nav>
      <label class="rdc-search"><span>⌕</span><input id="rtRdcSearch" placeholder="Buscar activo, ticker o sector…"></label>
      <div class="rdc-live"><i></i>Mercado en tiempo real</div>
      <div class="rdc-topclock"><b id="rtRdcClock">--:--:--</b><small id="rtRdcDate">—</small></div>
      <button id="rtRdcClose" class="rdc-x" aria-label="Cerrar">×</button>
    </header>

    <div class="rdc-hero">
      <div class="rdc-skyline" aria-hidden="true">
        <svg viewBox="0 0 900 82" preserveAspectRatio="none"><defs><linearGradient id="rdcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#123c57" stop-opacity=".55"/><stop offset="1" stop-color="#020d16" stop-opacity=".08"/></linearGradient></defs><rect width="900" height="82" fill="url(#rdcSky)"/><g fill="#071823" opacity=".92"><path d="M0 77h900v5H0zM34 77V43h18v34m7 0V35h12v42m23 0V49h26v28m7 0V24h8v53m5 0V13h6v64m7 0V29h10v48m18 0V45h34v32m7 0V18h7v59m5 0V8h5v69m7 0V26h8v51m20 0V39h27v38m14 0V31h12v46m17 0V19h8v58m19 0V46h24v31m12 0V27h8v50m4 0V7h5v70m6 0V29h8v48m18 0V43h32v34m11 0V34h11v43m14 0V22h7v55m20 0V41h31v36m13 0V26h9v51m7 0V15h7v62m19 0V47h25v30m16 0V35h15v42m15 0V18h7v59m6 0V5h5v72m6 0V25h9v52m17 0V42h36v35"/></g><g fill="#f4b64a" opacity=".36"><rect x="141" y="31" width="2" height="2"/><rect x="204" y="42" width="3" height="2"/><rect x="343" y="50" width="3" height="2"/><rect x="497" y="36" width="3" height="2"/><rect x="666" y="49" width="3" height="2"/><rect x="807" y="39" width="3" height="2"/></g></svg>
      </div>
      <div class="rdc-region-id"><span id="rtRdcFlag" class="rdc-hero-flag"></span><div><h1 id="rtRdcTitle">Región</h1><p>Centro de decisión regional <b>›</b></p></div></div>
      <div class="rdc-open-state"><span id="rtRdcOpenBadge">—</span><small>CIERRE EN</small><b id="rtRdcCountdown">—</b></div>
      <div id="rtRdcClocks" class="rdc-clocks"></div>
    </div>

    <div class="rdc-kpis">
      <article class="rdc-kpi-card sentiment"><i class="rdc-kpi-icon">${rdcKpiIcon('sentiment')}</i><div class="rdc-kpi-copy"><small>Sentimiento Regional</small><strong id="rtRdcSentiment">—</strong><span id="rtRdcSentimentNote">vs. cierre anterior</span></div><span id="rtRdcSentimentSpark" class="rdc-kpi-spark"></span></article>
      <article class="rdc-kpi-card breadth"><i class="rdc-kpi-icon">${rdcKpiIcon('breadth')}</i><div class="rdc-kpi-copy"><small>Amplitud de Mercado</small><strong id="rtRdcBreadth">—</strong><span id="rtRdcBreadthNote">mercados de la región</span></div><span id="rtRdcBreadthSpark" class="rdc-kpi-spark"></span></article>
      <article class="rdc-kpi-card momentum"><i class="rdc-kpi-icon">${rdcKpiIcon('momentum')}</i><div class="rdc-kpi-copy"><small>Momentum</small><strong id="rtRdcMomentum">—</strong><span id="rtRdcMomentumNote">Tendencia de corto plazo</span></div><span id="rtRdcMomentumSpark" class="rdc-kpi-spark"></span></article>
      <article class="rdc-kpi-card volatility"><i class="rdc-kpi-icon">${rdcKpiIcon('volatility')}</i><div class="rdc-kpi-copy"><small id="rtRdcVolatilityTitle">Volatilidad</small><strong id="rtRdcVolatility">—</strong><span id="rtRdcVolatilityNote">—</span></div><span id="rtRdcVolatilitySpark" class="rdc-kpi-spark"></span></article>
      <article class="rdc-kpi-card risk"><i class="rdc-kpi-icon shield">${rdcKpiIcon('risk')}</i><div class="rdc-kpi-copy"><small>Riesgo Global</small><strong id="rtRdcRisk">—</strong><span id="rtRdcRiskNote">Índice de riesgo regional</span></div><span id="rtRdcRiskSpark" class="rdc-kpi-spark"></span></article>
    </div>

    <div class="rdc-main">
      <section class="rdc-panel rdc-drivers">
        <header><div><h2>▤ &nbsp;Qué está moviendo <span id="rtRdcDriverRegion">la región</span> hoy</h2><small>Drivers con efecto sobre el contexto regional</small></div><button class="rdc-more" data-rdc-action="markets">Ver más →</button></header>
        <div class="rdc-driver-head"><span>ACTIVO / EVENTO</span><span>ÚLTIMO</span><span>VAR. %</span><span>IMPACTO</span><span>COMENTARIO</span><span>TENDENCIA</span></div>
        <div id="rtRdcDrivers"></div>
      </section>

      <section class="rdc-panel rdc-internals">
        <header><div><h2>▥ &nbsp;Internals del mercado <span id="rtRdcInternalRegion"></span></h2><small>Amplitud, sectores, índices y mapa regional</small></div><button class="rdc-more" data-rdc-action="markets">Ver más →</button></header>
        <div class="rdc-internal-top">
          <div class="rdc-breadth-card"><b>Amplitud regional</b><div class="rdc-breadth-bar"><i id="rtRdcUpBar"></i><i id="rtRdcFlatBar"></i><i id="rtRdcDownBar"></i></div><div><span><strong id="rtRdcUpPct">—</strong> Alcistas</span><span><strong id="rtRdcFlatPct">—</strong> Sin cambio</span><span><strong id="rtRdcDownPct">—</strong> Bajistas</span></div></div>
          <div class="rdc-sector-wrap"><div class="rdc-sector-head"><b id="rtRdcSectorTitle">Sectores (STOXX 600)</b><span>Hoy⌄</span></div><div class="rdc-market-tiles" id="rtRdcMarketTiles"></div></div>
        </div>
        <div class="rdc-internal-bottom">
          <div class="rdc-index-list"><div class="rdc-index-head"><span>Principales índices</span><span>Último</span><span>Var. %</span><span>Tendencia (30D)</span></div><div id="rtRdcIndexRows"></div></div>
          <div class="rdc-map-card"><div class="rdc-map-title"><span><strong>Mapa de mercado</strong> <em id="rtRdcMapPeriodLabel">(var. % 1D)</em></span><div class="rdc-period-tabs"><button data-rdc-period="day" class="active">1D</button><button data-rdc-period="week">5D</button><button data-rdc-period="month">1M</button></div></div><div id="rtRdcMapHost" class="rdc-map-host"></div></div>
        </div>
      </section>

      <section class="rdc-panel rdc-arg-impact">
        <header><div><h2>🇦🇷 &nbsp;Impacto sobre Argentina</h2><small>Cómo se transmite el contexto internacional al mercado local</small></div><button class="rdc-more" data-rdc-action="argentina">Ver análisis completo →</button></header>
        <div class="rdc-arg-grid"><div id="rtRdcTraffic" class="rdc-impact-cards"></div><div><b class="rdc-subtitle">Canales de transmisión</b><div id="rtRdcChannels" class="rdc-channels"></div></div></div>
      </section>

      <section class="rdc-panel rdc-assets">
        <header><div><h2>▥ &nbsp;Activos a seguir <span>(relevantes para Argentina)</span></h2><small>Prioridad técnica y movimiento actual</small></div><button class="rdc-more" data-rdc-action="sectors">Ver más →</button></header>
        <div class="rdc-asset-head"><span>ACTIVO</span><span>ÚLTIMO</span><span>VAR. %</span><span>TENDENCIA (30D)</span><span>SETUP</span><span>COMENTARIO</span></div>
        <div id="rtRdcAssets"></div>
      </section>
    </div>

    <section class="rdc-timeline"><div class="rdc-timeline-title"><b>⚡ Qué cambió</b><small>Eventos clave de la jornada</small></div><div id="rtRdcEvents" class="rdc-events"></div><button class="rdc-news-btn" data-rdc-action="news">Ver todas las noticias →</button></section>
  `;
  document.body.appendChild(el);
  $('rtRdcClose')?.addEventListener('click',()=>closeRegionalDecisionCenter());
  el.querySelectorAll('[data-rdc-region]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.rdcRegion;if(!REGIONS[key])return;applyContext(key,null);renderRegionalDecisionCenter();
  }));
  el.querySelectorAll('[data-rdc-period]').forEach(btn=>btn.addEventListener('click',()=>{
    state.rdcPeriod=btn.dataset.rdcPeriod||'day';
    renderRegionalDecisionCenter();
  }));
  el.querySelectorAll('[data-rdc-action]').forEach(btn=>btn.addEventListener('click',()=>{
    const action=btn.dataset.rdcAction;
    if(action==='global'){closeRegionalDecisionCenter();resetContext();goHome();return}
    if(action==='argentina'){closeRegionalDecisionCenter();applyContext('latam','ARG');goHome('#rtArgentinaSignals');return}
    if(action==='markets'){closeRegionalDecisionCenter();goHome('#rtMarketSignals');return}
    if(action==='sectors'){closeRegionalDecisionCenter();clickOriginal('scannerViewBtn');return}
    if(action==='news'){closeRegionalDecisionCenter();q('[data-rt-nav="news"]')?.click();return}
    if(action==='calendar'){closeRegionalDecisionCenter();goHome();return}
  }));
  $('rtRdcSearch')?.addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;const value=e.currentTarget.value.trim();if(!value)return;
    closeRegionalDecisionCenter();const input=$('symbol');if(input)input.value=value;const type=$('assetType');if(type)type.value='auto';$('analyzeBtn')?.click();
  });
  el.addEventListener('click',e=>{
    const row=e.target.closest?.('.rdc-asset-row');if(!row)return;
    closeRegionalDecisionCenter();
    const input=$('symbol');if(input)input.value=row.dataset.rdcSymbol||'';
    const type=$('assetType');if(type)type.value=row.dataset.rdcType||'auto';
    $('analyzeBtn')?.click();
  });
}
function renderRegionalDecisionCenter(){
  const shell=$('rtRegionalDecisionCenter');if(!shell||shell.hidden)return;
  const key=state.selectedRegion,region=REGIONS[key]||REGIONS.europe,ctx=contextInfo(),now=new Date(),status=rdcStatus(key,now);
  $('rtRdcFlag').innerHTML=rdcFlagMarkup(key);$('rtRdcTitle').textContent=region.label;
  const badge=$('rtRdcOpenBadge');badge.textContent=status.label;badge.className=status.active?'open':'closed';
  $('rtRdcCountdown').textContent=status.countdown;$('rtRdcClocks').innerHTML=rdcCityClocks(key,now);
  $('rtRdcClock').textContent=now.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'America/Argentina/Buenos_Aires'});
  $('rtRdcDate').textContent=new Intl.DateTimeFormat('es-AR',{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'America/Argentina/Buenos_Aires'}).format(now).replaceAll('.','');
  shell.querySelectorAll('[data-rdc-region]').forEach(b=>b.classList.toggle('active',b.dataset.rdcRegion===key));
  shell.querySelectorAll('[data-rdc-period]').forEach(b=>b.classList.toggle('active',b.dataset.rdcPeriod===(state.rdcPeriod||'day')));
  if($('rtRdcMapPeriodLabel'))$('rtRdcMapPeriodLabel').textContent=`(var. % ${rdcPeriodLabel()})`;

  const sentiment=regionChange(key,'day'),breadth=rdcBreadth(key),mom=rdcMomentum(key),vix=get('vix'),vstoxx=get('vstoxx');
  const volItem=key==='europe'&&Number.isFinite(vstoxx?.last)?vstoxx:vix,volId=volItem===vstoxx?'VSTOXX':'VIX',volCh=periodChange(volItem,'day'),risk=riskModel();
  $('rtRdcSentiment').textContent=pct(sentiment);$('rtRdcSentiment').className=signClass(sentiment);
  $('rtRdcBreadth').textContent=`${breadth.upPct}% alcista`;$('rtRdcBreadth').className=breadth.upPct>breadth.downPct?'rt-up':breadth.downPct>breadth.upPct?'rt-down':'rt-flat';
  $('rtRdcBreadthNote').textContent=`${breadth.up} suben  |  ${breadth.down} bajan`;
  $('rtRdcMomentum').textContent=mom.label;$('rtRdcMomentum').className=mom.cls;
  $('rtRdcMomentumNote').textContent=Number.isFinite(regionChange(key,'week'))?`Semana ${pct(regionChange(key,'week'))}`:'Tendencia de corto plazo';
  $('rtRdcVolatilityTitle').textContent=`Volatilidad (${volId})`;
  $('rtRdcVolatility').textContent=Number.isFinite(volCh)?(volCh<-.03?'Baja':volCh>.03?'Alta':'Estable'):'s/d';$('rtRdcVolatility').className=signClass(-volCh);
  $('rtRdcVolatilityNote').textContent=`${Number.isFinite(volItem?.last)?fmt(volItem.last,1):'—'}  ${pct(volCh)}`;
  $('rtRdcRisk').textContent=risk.label;$('rtRdcRisk').className=risk.label==='BAJO'?'good':risk.label==='ALTO'?'bad':'warn';
  const move=get('move'),tnx=get('tnx');$('rtRdcRiskNote').textContent=`VIX ${Number.isFinite(vix?.last)?fmt(vix.last,1):'—'} · MOVE ${Number.isFinite(move?.last)?fmt(move.last,0):'—'}`;

  const regionVals=regionSeries(key),volVals=(volItem?.bars||[]).map(x=>num(x.close)).filter(Number.isFinite);
  $('rtRdcSentimentSpark').innerHTML=miniSpark(regionVals);
  $('rtRdcBreadthSpark').innerHTML=miniSpark(regionVals.map((v,i)=>v+i*.02));
  $('rtRdcMomentumSpark').innerHTML=miniSpark(regionVals);
  $('rtRdcVolatilitySpark').innerHTML=miniSpark(volVals);
  $('rtRdcRiskSpark').innerHTML=miniSpark(volVals.length?volVals:regionVals);

  $('rtRdcDriverRegion').textContent=region.label;$('rtRdcInternalRegion').textContent=region.label.toLowerCase();
  const driverIds=key==='europe'
    ?['dax','stoxx','eurusd','bund10','vix','brent','tnx']
    :[...(region.ids||[]).slice(0,3),'vix','tnx','dxy','wti','eem'];
  $('rtRdcDrivers').innerHTML=[...new Set(driverIds)].map(rdcMarketRow).filter(Boolean).slice(0,7).join('')||'<div class="rdc-empty">Sin drivers válidos.</div>';
  const missingDrivers=7-qa('#rtRdcDrivers .rdc-driver-row').length;
  if(key==='europe'&&missingDrivers>0){
    const fallback=['dax','stoxx','eurusd','bund10','vix','brent','tnx'];
    $('rtRdcDrivers').innerHTML=fallback.map(rdcMarketRow).join('');
  }

  $('rtRdcUpBar').style.width=breadth.upPct+'%';$('rtRdcFlatBar').style.width=breadth.flatPct+'%';$('rtRdcDownBar').style.width=breadth.downPct+'%';
  $('rtRdcUpPct').textContent=breadth.upPct+'%';$('rtRdcFlatPct').textContent=breadth.flatPct+'%';$('rtRdcDownPct').textContent=breadth.downPct+'%';
  $('rtRdcSectorTitle').textContent=key==='europe'?'Sectores (STOXX 600)':'Mercados líderes';
  $('rtRdcMarketTiles').innerHTML=rdcSectorTiles(key);
  $('rtRdcIndexRows').innerHTML=(region.ids||[]).map(id=>{
    const a=ASSET_BY_ID[id],m=get(id),ch=periodChange(m,'day'),bars=(m?.bars||[]).map(x=>num(x.close)).filter(Number.isFinite);
    return `<div class="rdc-index-row"><b>${a?.flag||''} ${esc(a?.detailName||a?.name||id)}</b><span>${rdcDisplayLast(id,a,m)}</span><span class="${signClass(ch)}">${pct(ch)}</span><span>${miniSpark(bars)}</span></div>`;
  }).join('');
  renderRegionalCenterMap(key);

  $('rtRdcTraffic').innerHTML=rdcTrafficCards();$('rtRdcChannels').innerHTML=rdcChannels();$('rtRdcAssets').innerHTML=rdcOpportunityRows();$('rtRdcEvents').innerHTML=rdcEvents(key);

}
function openRegionalDecisionCenter(){
  mountRegionalDecisionCenter();
  const shell=$('rtRegionalDecisionCenter');if(!shell)return;
  shell.hidden=false;document.body.classList.add('rt-rdc-open');
  renderRegionalDecisionCenter();
}
function closeRegionalDecisionCenter(){
  const shell=$('rtRegionalDecisionCenter');if(shell)shell.hidden=true;
  document.body.classList.remove('rt-rdc-open');
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
function sessionMarketFresh(assetId,date){
  const a=ASSET_BY_ID[assetId];if(!a)return null;
  const intra=state.intraday.get(a.symbol),daily=state.markets.get(a.symbol);
  const times=[
    num(intra?.bars?.at(-1)?.time),
    num(intra?.time),
    num(daily?.time)
  ].filter(Number.isFinite);
  if(!times.length)return null;
  const latest=Math.max(...times),now=Math.floor(date.getTime()/1000),age=now-latest;
  // 15m quotes can be delayed; 55m still distinguishes a live market from a holiday/stale close.
  return age>=-300&&age<=55*60;
}
function shortCountdown(seconds,withSeconds=false){
  const left=Math.max(0,seconds),hh=Math.floor(left/3600),mm=Math.floor((left%3600)/60),ss=Math.floor(left%60);
  return withSeconds?[hh,mm,ss].map(x=>String(x).padStart(2,'0')).join(':'):`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}
function renderSession(date){
  if(!$('rtSessionName'))return;
  const sessions=[
    {name:'Nueva York',short:'NY',code:'US',tz:'America/New_York',open:9*3600+30*60,close:16*3600,asset:'sp500'},
    {name:'Argentina',short:'ARG',code:'AR',tz:'America/Argentina/Buenos_Aires',open:11*3600,close:17*3600,asset:'merval'},
    {name:'Brasil',short:'BR',code:'BR',tz:'America/Sao_Paulo',open:10*3600,close:17*3600+55*60,asset:'bovespa'},
    {name:'Londres',short:'LON',code:'GB',tz:'Europe/London',open:8*3600,close:16*3600+30*60,asset:'stoxx'},
    {name:'Tokio',short:'TOK',code:'JP',tz:'Asia/Tokyo',open:9*3600,close:15*3600+30*60,asset:'nikkei'},
    {name:'Sídney',short:'SYD',code:'AU',tz:'Australia/Sydney',open:10*3600,close:16*3600,asset:'asx'}
  ];
  const live=sessions.map(x=>{
    const p=zonedParts(date,x.tz),sec=p.h*3600+p.m*60+p.s,weekday=p.day>=1&&p.day<=5;
    const clockActive=weekday&&sec>=x.open&&sec<x.close;
    const fresh=sessionMarketFresh(x.asset,date);
    // Before the first refresh we can only use the clock. Once market data exists,
    // freshness prevents weekends/holidays/stale markets from being shown as open.
    const active=clockActive&&(fresh===true||(fresh===null&&state.lastUpdate===0));
    return{...x,sec,clockActive,fresh,active,left:active?x.close-sec:NaN,change:periodChange(get(x.asset),'day')};
  });
  const active=live.filter(x=>x.active).sort((a,b)=>a.left-b.left);
  qa('.rt-market-marker').forEach(m=>m.classList.remove('active-session'));
  active.forEach(x=>qa(`.rt-market-marker[data-marker-asset="${x.asset}"]`).forEach(m=>m.classList.add('active-session')));

  const box=q('.rt-session-box');
  box?.classList.toggle('multi-active',active.length>1);
  box?.classList.toggle('triple-active',active.length>=3);

  if(active.length){
    $('rtSessionName').textContent=active.map(x=>x.name).join(' · ');
    $('rtSessionFlag').innerHTML=active.map(x=>`<span class="rt-active-flag" title="${esc(x.name)} · cierra en ${shortCountdown(x.left,true)}">${sessionFlagSvg(x.code)}</span>`).join('');
    const countdown=$('rtSessionCountdown');
    if(active.length===1){
      countdown.innerHTML=shortCountdown(active[0].left,true);
      countdown.classList.remove('multi');
    }else{
      countdown.classList.add('multi');
      countdown.innerHTML=active.map(x=>`<span><em>${esc(x.short)}</em>${shortCountdown(x.left,false)}</span>`).join('');
    }
    const countLabel=q('.rt-session-count small');if(countLabel)countLabel.textContent=active.length===1?'Cierra en':'Cierran en';
  }else{
    $('rtSessionName').textContent='Entre sesiones';
    $('rtSessionFlag').innerHTML=sessionFlagSvg('');
    $('rtSessionCountdown').classList.remove('multi');
    $('rtSessionCountdown').textContent='—';
    const countLabel=q('.rt-session-count small');if(countLabel)countLabel.textContent='Próxima apertura';
  }

  if($('rtNextSessionRows')){
    const closed=live.filter(x=>!x.active)
      .sort((a,b)=>nextOpenDelta(date,a)-nextOpenDelta(date,b))
      .slice(0,3);
    $('rtNextSessionRows').innerHTML=closed.map(x=>{
      const cls=Number.isFinite(x.change)?x.change>.03?'rt-up':x.change<-.03?'rt-down':'rt-flat':'rt-flat';
      return `<span class="rt-session-close-row"><i>${sessionFlagSvg(x.code)}</i><b>${esc(x.name)}</b><small class="${cls}">${pct(x.change)}</small></span>`;
    }).join('');
  }
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
  const intradaySymbols=[...new Set([...Object.values(REGIONS).map(r=>ASSET_BY_ID[r.focus]?.symbol),ASSET_BY_ID.bovespa?.symbol].filter(Boolean))];
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
  if(!values.length)return'<svg class="rt-spark rdc-spark-empty" viewBox="0 0 104 30" preserveAspectRatio="none"><path class="spark-empty-line" d="M2,20 C18,18 24,21 38,17 S62,15 76,17 S94,13 102,15"/></svg>';
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
    $('rtOppsBody').innerHTML='<tr><td colspan="10" class="rt-opps-empty">Sin activos con volumen y datos válidos para este filtro.</td></tr>';return;
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
    return `<tr data-rt-symbol="${esc(r.item.symbol)}" data-rt-type="${esc(r.item.requestedType||r.item.type||'auto')}">
      <td><div class="rt-asset-cell"><b class="ticker">${esc(TICKER_ALIAS[r.item.symbol]||r.item.symbol)}</b><small>${esc(SECONDARY_TICKER[r.item.symbol]||r.item.symbol)}</small></div></td>
      <td><span class="rt-type rt-type-${esc(opportunityAssetType(r))}">${esc(oppType(r))}</span></td>
      <td>${opportunityPrice(r,price)}</td>
      <td class="${signClass(day)}">${pct(day)}</td>
      <td><div class="rt-volume-cell">${volumeChart(volumeBars)}<small>#${vr?.rank||'—'} · ${compactVolume(vv)}${Number.isFinite(rv)?' · '+fmt(rv,1)+'x':''}</small></div></td>
      <td>${miniSpark(bars.map(x=>x.close))}</td>
      <td>${esc(setup)}</td>
      <td><span class="rt-trend ${trend[1]}"><i>${trend[1]==='bad'?'↓':trend[1]==='warn'?'●':'↑'}</i>${trend[0]}</span></td>
      <td><span class="rt-opp-decision ${decision.cls}">${decision.label}</span></td>
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
  if($('rtRegionalDecisionCenter')&&!$('rtRegionalDecisionCenter').hidden)renderRegionalDecisionCenter();
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