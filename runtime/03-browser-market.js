/* Radar Tecnico G2 - Browser foundation, dashboard, market intelligence and scanner universe
   Extracted from certified runtime; order preserved. */

/* ===== RUNTIME BLOCK 15 ===== */
// Radar Técnico G2 — Phase 10A — Browser foundation compatibility runtime
// Ownership extraction only: shared DOM/fetch/state, market/dashboard constants, local API queue and LKG/cache helpers.

const $=id=>document.getElementById(id);
const RADAR_NATIVE_FETCH=window.fetch.bind(window);
window.fetch=(input,init={})=>{const method=String(init?.method||'GET').toUpperCase(),url=typeof input==='string'?new URL(input,location.href):new URL(input.url,location.href);if(url.origin===location.origin&&!['GET','HEAD','OPTIONS'].includes(method)){const m=document.cookie.match(/(?:^|;\s*)radar_g2_csrf=([^;]+)/);if(m){const h=new Headers(init.headers||{});if(!h.has('X-Radar-CSRF'))h.set('X-Radar-CSRF',decodeURIComponent(m[1]));init={...init,headers:h}}}return RADAR_NATIVE_FETCH(input,init)};
const state={datasets:{},analyses:{},currentKey:'short',source:'',symbol:'',type:'',tfs:null,fundamentals:null,assetProfile:null,config:{watchlist:[],cedearBlacklist:[],lastPositionSize:0,alertsEnabled:false,portfolioBaseCurrency:'ARS',portfolioCapital:0,portfolioCashTransactions:[],portfolioCashReconciliation:null,riskPerTradePct:0.75,monitorMode:'RADAR',monitorAlerts:{levels:true,entry:true,state:true,opportunity:true,concentration:true},scoreWeights:null,scoreModelVersion:1,scoreModelHistory:[]},watchResults:{},watchTimer:null,scan:{running:false,stop:false,results:[]}};

let dashboardData={updated:null,risk:{history:[]},fx:{mep:{history:[]},ccl:{history:[]},official:{history:[]}},inflation:{history:[]}};

const DASHBOARD_CACHE_KEY='radar_dashboard_v93';
const DASHBOARD_CACHE_FALLBACK='radar_dashboard_v93_empty';

function saveDashboardCache(){
 try{
   localStorage.setItem(DASHBOARD_CACHE_KEY,JSON.stringify({savedAt:Date.now(),data:dashboardData}));
 }catch{}
}
function loadDashboardCache(){
 try{
   const raw=localStorage.getItem(DASHBOARD_CACHE_KEY)||localStorage.getItem(DASHBOARD_CACHE_FALLBACK);
   if(!raw)return false;
   const x=JSON.parse(raw);
   if(!x?.data||!x.savedAt||Date.now()-x.savedAt>24*60*60*1000)return false;
   dashboardData=x.data;
   if(!dashboardData.risk)dashboardData.risk={history:[]};
   if(!dashboardData.fx)dashboardData.fx={};
   for(const k of ['mep','ccl','official']){
     if(!dashboardData.fx[k])dashboardData.fx[k]={history:[]};
     if(!Array.isArray(dashboardData.fx[k].history))dashboardData.fx[k].history=[];
   }
   if(!dashboardData.inflation)dashboardData.inflation={history:[]};
   if(!Array.isArray(dashboardData.inflation.history))dashboardData.inflation.history=[];
   return true;
 }catch{return false}
}
function dashArray(x){
 if(Array.isArray(x))return x;
 if(Array.isArray(x?.data))return x.data;
 if(Array.isArray(x?.items))return x.items;
 return [];
}
function normalizeFxRows(raw){
 const rows=dashArray(raw);
 const by={};
 for(const x of rows){
   const casa=String(x?.casa||x?.nombre||'').toLowerCase();
   const key=casa==='bolsa'||casa.includes('mep')?'mep':casa==='contadoconliqui'||casa.includes('contado')?'ccl':casa==='oficial'||casa.includes('oficial')?'official':null;
   if(!key)continue;
   by[key]={
     compra:dashNum(x.compra),
     venta:dashNum(x.venta),
     changePct:dashNum(x.variacion),
     fecha:String(x.fechaActualizacion||x.fecha||''),
     source:'DolarApi'
   };
 }
 return by;
}
function applyFxCurrent(by,source='DolarApi'){
 let changed=false;
 for(const k of ['mep','ccl','official']){
   const v=by?.[k];
   if(!v)continue;
   const cur=dashboardData.fx[k]||{history:[]};
   if(dashValid(v.compra))cur.compra=dashNum(v.compra);
   if(dashValid(v.venta))cur.venta=dashNum(v.venta);
   if(dashValid(v.changePct))cur.changePct=dashNum(v.changePct);
   if(v.fecha)cur.fecha=v.fecha;
   cur.source=v.source||source;
   dashboardData.fx[k]=cur;
   changed=true;
 }
 if(changed){
   dashboardData.updated=new Date().toISOString();
   saveDashboardCache();
   renderDashboard();
 }
 return changed;
}
function applyInflationArray(raw){
 const rows=dashArray(raw).map(x=>({date:String(x?.fecha||'').slice(0,10),value:dashNum(x?.valor)}))
   .filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(x.value))
   .sort((a,b)=>a.date.localeCompare(b.date));
 if(!rows.length)return false;
 const q=rows.at(-1),p=rows.length>1?rows.at(-2):null;
 dashboardData.inflation={...dashboardData.inflation,value:q.value,period:q.date,previous:p?.value??null,change:p?q.value-p.value:null,source:'ArgentinaDatos / BCRA',history:rows.slice(-240)};
 dashboardData.updated=new Date().toISOString();
 saveDashboardCache();
 renderDashboard();
 return true;
}
function applyRiskArray(raw){
 const rows=dashArray(raw).map(x=>({date:String(x?.fecha||'').slice(0,10),value:dashNum(x?.valor)}))
   .filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(x.value))
   .sort((a,b)=>a.date.localeCompare(b.date));
 if(!rows.length)return false;
 const q=rows.at(-1),p=rows.length>1?rows.at(-2):null;
 dashboardData.risk={...dashboardData.risk,value:q.value,previous:p?.value??null,change:p?q.value-p.value:null,date:q.date,source:'ArgentinaDatos',fallback:true,history:rows.slice(-240)};
 dashboardData.updated=new Date().toISOString();
 saveDashboardCache();
 renderDashboard();
 return true;
}


let marketIntel={loading:false,updated:null,regime:null,breadthAr:null,breadthUs:null,rates:null,usCurve:null,arCurve:null,scannerAdjustment:0,scannerReason:'Contexto no calculado'};
// v5: explicit read-only bridges for modular runtimes; top-level const/let are not Window properties.
try{Object.defineProperties(globalThis,{RadarState:{configurable:true,get:()=>state},RadarDashboardData:{configurable:true,get:()=>dashboardData},RadarMarketIntel:{configurable:true,get:()=>marketIntel}})}catch{}
const BREADTH_US_SYMBOLS=['AAPL','MSFT','NVDA','JPM','XOM','WMT'];


const MARKET_ASSETS=[
 // RESUMEN / ÍNDICES DE EE.UU.
 {id:'sp500',group:'Índices',name:'S&P 500',symbol:'^GSPC',unit:'pts',decimals:2,summary:true},
 {id:'nasdaq',group:'Índices',name:'NASDAQ Composite',symbol:'^IXIC',unit:'pts',decimals:2},
 {id:'nasdaq100',group:'Índices',name:'NASDAQ 100',symbol:'^NDX',unit:'pts',decimals:2,summary:true},
 {id:'dow',group:'Índices',name:'Dow Jones',symbol:'^DJI',unit:'pts',decimals:2,summary:true},
 {id:'russell',group:'Índices',name:'Russell 2000',symbol:'^RUT',unit:'pts',decimals:2,summary:true},
 {id:'vix',group:'Índices',name:'VIX',symbol:'^VIX',unit:'pts',decimals:2,summary:true},

 // ARGENTINA / LATAM
 {id:'merval',group:'Índices',name:'MERVAL $',symbol:'^MERV',unit:'pts ARS',decimals:0,summary:true},
 {id:'merval_usd',group:'Índices',name:'S&P Merval USD (MEP)',symbol:'SPMERVDT',unit:'pts USD',decimals:2,summary:true,intraday:false,lineOnly:true,sourceType:'byma-merval-usd',sourceLabel:'BYMA'}, 
 {id:'bovespa',group:'Índices',name:'IBOVESPA Brasil',symbol:'^BVSP',unit:'pts',decimals:0},
 {id:'ipc_mex',group:'Índices',name:'IPC México',symbol:'^MXX',unit:'pts',decimals:2},

 // EUROPA
 {id:'stoxx50',group:'Índices',name:'Euro Stoxx 50',symbol:'^STOXX50E',unit:'pts',decimals:2},
 {id:'dax',group:'Índices',name:'DAX Alemania',symbol:'^GDAXI',unit:'pts',decimals:2},
 {id:'ftse',group:'Índices',name:'FTSE 100',symbol:'^FTSE',unit:'pts',decimals:2},
 {id:'cac',group:'Índices',name:'CAC 40',symbol:'^FCHI',unit:'pts',decimals:2},

 // ASIA
 {id:'nikkei',group:'Índices',name:'Nikkei 225',symbol:'^N225',unit:'pts',decimals:2},
 {id:'hangseng',group:'Índices',name:'Hang Seng',symbol:'^HSI',unit:'pts',decimals:2},

 // TREASURIES / TASAS USA
 {id:'ust13w',group:'Bonos USA',name:'Treasury Bill 13 semanas · yield',symbol:'^IRX',unit:'% yield',decimals:3},
 {id:'ust5y',group:'Bonos USA',name:'Treasury 5Y · yield',symbol:'^FVX',unit:'% yield',decimals:3},
 {id:'ust10y',group:'Bonos USA',name:'Treasury 10Y · yield',symbol:'^TNX',unit:'% yield',decimals:3,summary:true},
 {id:'ust30y',group:'Bonos USA',name:'Treasury 30Y · yield',symbol:'^TYX',unit:'% yield',decimals:3,summary:true},
 {id:'ust2f',group:'Bonos USA',name:'US 2Y T-Note Futures',symbol:'ZT=F',unit:'pts',decimals:4,intraday:false},
 {id:'ust5f',group:'Bonos USA',name:'US 5Y T-Note Futures',symbol:'ZF=F',unit:'pts',decimals:4,intraday:false},
 {id:'ust10f',group:'Bonos USA',name:'US 10Y T-Note Futures',symbol:'ZN=F',unit:'pts',decimals:4,intraday:false},
 {id:'ust30f',group:'Bonos USA',name:'US 30Y T-Bond Futures',symbol:'ZB=F',unit:'pts',decimals:4,intraday:false},

 // METALES PRECIOSOS E INDUSTRIALES
 {id:'gold',group:'Metales',name:'Oro',symbol:'GC=F',unit:'USD/oz',decimals:2,summary:true},
 {id:'silver',group:'Metales',name:'Plata',symbol:'SI=F',unit:'USD/oz',decimals:3},
 {id:'copper',group:'Metales',name:'Cobre',symbol:'HG=F',unit:'USD/lb',decimals:4,summary:true},
 {id:'platinum',group:'Metales',name:'Platino',symbol:'PL=F',unit:'USD/oz',decimals:2},
 {id:'palladium',group:'Metales',name:'Paladio',symbol:'PA=F',unit:'USD/oz',decimals:2},
 {id:'aluminum',group:'Metales',name:'Aluminio',symbol:'ALI=F',unit:'USD',decimals:2},

 // ENERGÍA
 {id:'wti',group:'Energía',name:'Petróleo WTI',symbol:'CL=F',unit:'USD/bbl',decimals:2,summary:true},
 {id:'brent',group:'Energía',name:'Petróleo Brent',symbol:'BZ=F',unit:'USD/bbl',decimals:2},
 {id:'natgas',group:'Energía',name:'Gas natural',symbol:'NG=F',unit:'USD/MMBtu',decimals:3,summary:true},
 {id:'gasoline',group:'Energía',name:'Gasolina RBOB',symbol:'RB=F',unit:'USD/gal',decimals:4},
 {id:'heating',group:'Energía',name:'Heating Oil',symbol:'HO=F',unit:'USD/gal',decimals:4},

 // AGRÍCOLAS
 {id:'corn',group:'Agrícolas',name:'Maíz',symbol:'ZC=F',unit:'US¢/bu',decimals:2},
 {id:'wheat',group:'Agrícolas',name:'Trigo',symbol:'ZW=F',unit:'US¢/bu',decimals:2},
 {id:'soy',group:'Agrícolas',name:'Soja',symbol:'ZS=F',unit:'US¢/bu',decimals:2,summary:true},
 {id:'soyoil',group:'Agrícolas',name:'Aceite de soja',symbol:'ZL=F',unit:'US¢/lb',decimals:3},
 {id:'coffee',group:'Agrícolas',name:'Café',symbol:'KC=F',unit:'US¢/lb',decimals:2},
 {id:'sugar',group:'Agrícolas',name:'Azúcar #11',symbol:'SB=F',unit:'US¢/lb',decimals:2},
 {id:'cocoa',group:'Agrícolas',name:'Cacao',symbol:'CC=F',unit:'USD/t',decimals:2},
 {id:'cotton',group:'Agrícolas',name:'Algodón',symbol:'CT=F',unit:'US¢/lb',decimals:2},
 {id:'cattle',group:'Agrícolas',name:'Ganado vivo',symbol:'LE=F',unit:'US¢/lb',decimals:2},

 // DIVISAS PRINCIPALES Y LATAM
 {id:'dxy',group:'FX',name:'Índice dólar DXY',symbol:'DX-Y.NYB',unit:'pts',decimals:3,summary:true},
 {id:'eurusd',group:'FX',name:'EUR/USD',symbol:'EURUSD=X',unit:'USD por EUR',decimals:5,summary:true},
 {id:'gbpusd',group:'FX',name:'GBP/USD',symbol:'GBPUSD=X',unit:'USD por GBP',decimals:5},
 {id:'usdjpy',group:'FX',name:'USD/JPY',symbol:'JPY=X',unit:'JPY por USD',decimals:3,summary:true},
 {id:'audusd',group:'FX',name:'AUD/USD',symbol:'AUDUSD=X',unit:'USD por AUD',decimals:5},
 {id:'nzdusd',group:'FX',name:'NZD/USD',symbol:'NZDUSD=X',unit:'USD por NZD',decimals:5},
 {id:'usdchf',group:'FX',name:'USD/CHF',symbol:'CHF=X',unit:'CHF por USD',decimals:5},
 {id:'usdcad',group:'FX',name:'USD/CAD',symbol:'CAD=X',unit:'CAD por USD',decimals:5},
 {id:'usdcny',group:'FX',name:'USD/CNY',symbol:'CNY=X',unit:'CNY por USD',decimals:4},
 {id:'usdbrl',group:'FX',name:'USD/BRL',symbol:'BRL=X',unit:'BRL por USD',decimals:4},
 {id:'usdmxn',group:'FX',name:'USD/MXN',symbol:'MXN=X',unit:'MXN por USD',decimals:4},
 {id:'usdars',group:'FX',name:'USD/ARS mercado FX',symbol:'ARS=X',unit:'ARS por USD',decimals:2,summary:true}
];
let marketBoardData=new Map(),marketBoardFilter='Resumen',marketBoardLoading=false,mervalUsdQuoteCache=null;
let marketCardLoads=new Map(),marketBoardLoadSeq=0;
let marketChart=null,marketCandleSeries=null,marketEma20Series=null,marketEma50Series=null,marketVolumeSeries=null;
let selectedMarketAsset=null,selectedMarketTf='1d';
const MARKET_TF={
 '15m':{interval:'15m',range:'5d',label:'15 minutos'},
 '1h':{interval:'1h',range:'1mo',label:'1 hora'},
 '1d':{interval:'1d',range:'1y',label:'1 día'},
 '1wk':{interval:'1wk',range:'5y',label:'1 semana'}
};

let dashboardChart=null,dashboardFastSeries=null,dashboardSlowSeries=null,dashboardTimer=null,dashboardSeriesKey='risk',dashboardLoadId=0;

function escapeHtml(value){
 return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

function dashNum(v){if(v===null||v===undefined||v==='')return NaN;const n=Number(v);return Number.isFinite(n)?n:NaN}
function dashValid(v){return Number.isFinite(dashNum(v))}
function dashMerge(t,s){if(!s||typeof s!=='object')return t;for(const[k,v]of Object.entries(s)){if(v&&typeof v==='object'&&!Array.isArray(v)){if(!t[k]||typeof t[k]!=='object'||Array.isArray(t[k]))t[k]={};dashMerge(t[k],v)}else if(v!==undefined)t[k]=v}return t}
async function fetchJsonTimeout(url,ms=8000){const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw new Error(`${r.status} ${await r.text()}`);return await r.json()}finally{clearTimeout(timer)}}

async function fetchTextTimeout(url,ms=5000,options={}){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);
 try{
   const r=await fetch(url,{cache:'no-store',signal:c.signal,...options});
   if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
   return await r.text();
 }finally{clearTimeout(timer)}
}
// Phase 3A: removed unused direct-Yahoo helpers. Browser market data must stay behind Radar local APIs.
let radarLocalApiChain=Promise.resolve();
let radarRefreshLock=false;

function isRadarLocalUrl(url){
 return String(url||'').startsWith('/api/');
}
function queuedLocalJson(url,ms=10000){
 const task=()=>fetchJsonTimeout(url,ms);
 const p=radarLocalApiChain.then(task,task);
 radarLocalApiChain=p.catch(()=>null);
 return p;
}
function loadMarketCache(){
 try{
   const raw=localStorage.getItem('radar_market_board_v78')||localStorage.getItem('radar_market_board_v62');
   if(!raw)return;
   const obj=JSON.parse(raw);
   if(!obj||!obj.savedAt||Date.now()-obj.savedAt>12*60*60*1000)return;
   Object.entries(obj.items||{}).forEach(([k,v])=>{
     if(v&&Number.isFinite(Number(v.last)))marketBoardData.set(k,v);
   });
 }catch{}
}
function saveMarketCache(){
 try{
   const items={};marketBoardData.forEach((v,k)=>{if(v&&Number.isFinite(Number(v.last)))items[k]=v});
   localStorage.setItem('radar_market_board_v78',JSON.stringify({savedAt:Date.now(),items}));
 }catch{}
}
function loadIntelCache(){
 try{
   const raw=localStorage.getItem('radar_intel_v78')||localStorage.getItem('radar_intel_v62');if(!raw)return;
   const x=JSON.parse(raw);if(!x||!x.savedAt||Date.now()-x.savedAt>12*60*60*1000)return;
   marketIntel={...marketIntel,...x.data,updated:x.savedAt};
 }catch{}
}
function saveIntelCache(){
 try{
   localStorage.setItem('radar_intel_v78',JSON.stringify({savedAt:Date.now(),data:{
     regime:marketIntel.regime,breadthAr:marketIntel.breadthAr,breadthUs:marketIntel.breadthUs,
     rates:marketIntel.rates,usCurve:marketIntel.usCurve,arCurve:marketIntel.arCurve,
     scannerAdjustment:marketIntel.scannerAdjustment,scannerReason:marketIntel.scannerReason
   }}));
 }catch{}
}

;

/* ===== RUNTIME BLOCK 16 ===== */
// Radar Técnico G2 — Phase 10B — Market dashboard runtime extraction
// Ownership-only move: dashboard loading/reconciliation/presentation and macro history chart.

function setDashStep(k,state,label=''){const e=$('dashStep'+k);if(!e)return;e.className='dash-load-step '+state;if(label)e.textContent=label}

function dashCardLoading(k,on){const e=document.querySelector(`.dash-kpi[data-dash-series="${k}"]`);if(e)e.classList.toggle('loading',!!on)}

function dashBegin(){
 $('dashLoadingPanel').classList.add('active');
 $('dashLoadingTitle').textContent='Cargando panel de mercado…';
 $('dashLoadingSub').textContent='Radar actualiza mercado, históricos y riesgo país por separado. Los mercados globales se cargan por categoría.';
 ['Core','Hist','Risk'].forEach(x=>setDashStep(x,'loading'));
 ['risk','mep','ccl','inflation'].forEach(x=>dashCardLoading(x,true));
 $('dashUpdated').textContent='Actualizando por etapas…';
}

function dashFinish(){const w=[...document.querySelectorAll('.dash-load-step.warn')].length;$('dashLoadingTitle').textContent=w?'Panel listo con algunas fuentes pendientes':'Panel actualizado';$('dashLoadingSub').textContent=w?'Lo disponible ya está operativo. Las fuentes pendientes se pueden reintentar sin bloquear Radar.':'Fuentes principales actualizadas.';setTimeout(()=>$('dashLoadingPanel').classList.remove('active'),w?4500:1800)}

function prevFromHist(h,date){if(!Array.isArray(h)||!h.length)return NaN;const d=String(date||new Date().toISOString()).slice(0,10),a=h.filter(x=>String(x.date)<d&&dashValid(x.value));return a.length?dashNum(a.at(-1).value):NaN}

function radarLocalDate(){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}

function applyFxHist(k,rows){
 const x=dashboardData.fx[k];x.history=Array.isArray(rows)?rows:[];
 const c=dashNum(x.venta),p=prevFromHist(x.history,x.fecha);
 if(Number.isFinite(c)&&Number.isFinite(p)&&p!==0){
   x.previousVenta=p;x.change=c-p;x.changePct=(c/p-1)*100;
   if(!String(x.source||'').includes('histórico ArgentinaDatos'))x.source=(x.source||'DolarApi')+' + histórico ArgentinaDatos';
 }
 if(Number.isFinite(c)){
   const d=radarLocalDate(),z=x.history.find(r=>r.date===d);
   if(z)z.value=c;else x.history.push({date:d,value:c});
   x.history.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
   if(x.history.length>240)x.history=x.history.slice(-240);
 }
}

function dashboardHistoryRows(k){
 let rows=[];
 if(k==='risk')rows=dashboardData.risk?.history||[];
 else if(['mep','ccl','official'].includes(k))rows=dashboardData.fx?.[k]?.history||[];
 else if(k==='inflation')rows=dashboardData.inflation?.history||[];
 return (rows||[]).map(x=>({date:String(x.date||x.fecha||'').slice(0,10),value:dashNum(x.value!==undefined?x.value:x.venta)}))
   .filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(x.value))
   .sort((a,b)=>a.date.localeCompare(b.date));
}

function reconcileDashboardFromHistory(k){
 const rows=dashboardHistoryRows(k);
 if(!rows.length)return false;
 const last=rows.at(-1),prev=rows.length>1?rows.at(-2):null;
 let changed=false;

 if(k==='risk'){
   const r=dashboardData.risk||(dashboardData.risk={history:[]});
   const curDate=String(r.date||'').slice(0,10);
   if(!dashValid(r.value)||!curDate||last.date>curDate){
     r.value=last.value;
     r.date=last.date;
     if(prev){
       r.previous=prev.value;
       r.change=last.value-prev.value;
     }
     if(!r.source||/pendiente/i.test(r.source))r.source='ArgentinaDatos · histórico';
     r.fallback=true;
     changed=true;
   }
   if(dashValid(r.value))dashCardLoading('risk',false);
 }

 if(['mep','ccl','official'].includes(k)){
   const x=dashboardData.fx[k]||(dashboardData.fx[k]={history:[]});
   const curDate=String(x.fecha||'').slice(0,10);
   if(!dashValid(x.venta)||!curDate||last.date>curDate){
     x.venta=last.value;
     x.fecha=last.date;
     if(prev&&prev.value!==0){
       x.previousVenta=prev.value;
       x.change=last.value-prev.value;
       x.changePct=(last.value/prev.value-1)*100;
     }
     if(!x.source||/pendiente/i.test(x.source))x.source='ArgentinaDatos · histórico';
     changed=true;
   }
   if(k==='mep'&&dashValid(x.venta))dashCardLoading('mep',false);
   if(k==='ccl'&&dashValid(x.venta))dashCardLoading('ccl',false);
 }

 if(k==='inflation'){
   const x=dashboardData.inflation||(dashboardData.inflation={history:[]});
   const curDate=String(x.period||'').slice(0,10);
   if(!dashValid(x.value)||!curDate||last.date>=curDate){
     x.value=last.value;
     x.period=last.date;
     if(prev){
       x.previous=prev.value;
       x.change=last.value-prev.value;
     }
     if(!x.source||/pendiente/i.test(x.source))x.source='ArgentinaDatos / BCRA · histórico';
     changed=true;
   }
   if(dashValid(x.value))dashCardLoading('inflation',false);
 }
 return changed;
}

function reconcileAllDashboardSeries(){
 let changed=false;
 for(const k of ['risk','mep','ccl','official','inflation']){
   if(reconcileDashboardFromHistory(k))changed=true;
 }
 return changed;
}

function fmtDashNum(v,d=1){const n=dashNum(v);return Number.isFinite(n)?new Intl.NumberFormat('es-AR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n):'—'}

function fmtDashMoney(v){const n=dashNum(v);return Number.isFinite(n)?'$ '+new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(n):'—'}

function dashboardDirection(delta,inverseGood=false){const n=dashNum(delta);if(!Number.isFinite(n))return{cls:'flat',text:'… CALCULANDO'};if(Math.abs(n)<1e-9)return{cls:'flat',text:'→ SIN CAMBIO'};const up=n>0;if(inverseGood)return up?{cls:'bad',text:`↑ +${fmtDashNum(n,0)}`}:{cls:'good',text:`↓ ${fmtDashNum(n,0)}`};return up?{cls:'up',text:`↑ +${fmtDashNum(n,2)}`}:{cls:'down',text:`↓ ${fmtDashNum(n,2)}`}}

function dashboardInflationDirection(delta){const n=dashNum(delta);if(!Number.isFinite(n))return{cls:'flat',text:'… CALCULANDO'};if(Math.abs(n)<.005)return{cls:'flat',text:'→ ESTABLE'};return n>0?{cls:'bad',text:`↑ ACELERA +${fmtDashNum(n,1)} pp`}:{cls:'good',text:`↓ DESACELERA ${fmtDashNum(n,1)} pp`}}

function setDashTrend(id,o){const e=$(id);if(!e)return;e.className='dash-trend '+o.cls;e.textContent=o.text}

function emaArray(values,period){const out=[];let prev=null,k=2/(period+1);values.forEach(v=>{const n=Number(v);if(!Number.isFinite(n)){out.push(null);return}prev=prev===null?n:n*k+prev*(1-k);out.push(prev)});return out}

function dashboardTrendRead(points,fast=20,slow=50,inverse=false){const vals=points.map(x=>Number(x.value)).filter(Number.isFinite);if(vals.length<3)return{trend:'SIN DATOS',text:'No hay suficiente historia.'};const f=emaArray(vals,Math.min(fast,Math.max(2,Math.floor(vals.length/3)))),s=emaArray(vals,Math.min(slow,Math.max(3,Math.floor(vals.length/1.7))));const last=vals.at(-1),ef=f.at(-1),es=s.at(-1);let trend='NEUTRAL';if(last>ef&&ef>es)trend='ALCISTA';else if(last<ef&&ef<es)trend='BAJISTA';const ctx=inverse?(trend==='BAJISTA'?'Lectura favorable: el indicador de riesgo desciende.':trend==='ALCISTA'?'Lectura adversa: el indicador de riesgo sube.':'Sin dirección limpia.'):(trend==='ALCISTA'?'Sesgo alcista.':trend==='BAJISTA'?'Sesgo bajista.':'Movimiento lateral o mixto.');return{trend,text:`Tendencia estimada: ${trend}. ${ctx}`}}

function dashPeriodLabel(v){
 const s=String(v||'').trim();
 if(!s)return'Último período pendiente';
 const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(!m)return s.length<=30?s:'Período informado';
 const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
 return d.toLocaleDateString('es-AR',{month:'long',year:'numeric'});
}

function dashDateLabel(v){if(!v)return'—';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('es-AR')}

async function loadDashboard(force=false){
 const id=++dashboardLoadId;
 const dashboardCoreReady=()=>dashValid(dashboardData?.fx?.mep?.venta)&&dashValid(dashboardData?.fx?.ccl?.venta)&&dashValid(dashboardData?.fx?.official?.venta)&&dashValid(dashboardData?.inflation?.value)&&dashValid(dashboardData?.risk?.value);if(!force&&dashboardData.updated&&dashboardCoreReady()){renderDashboard();return}

 stabilityState.dashboardStarted=Date.now();
 dashBegin();
 const b=$('dashRefreshBtn');
 if(b){b.disabled=true;b.textContent='Actualizando…'}

 // Si hay cache real, mostrarlo inmediatamente mientras refresca.
 if(loadDashboardCache()){
   renderDashboard();
   $('dashUpdated').textContent='Último dato guardado · actualizando…';
 }

 ['risk','mep','ccl','inflation'].forEach(x=>dashCardLoading(x,true));

 const tasks=[];

 // FX: siempre vía servidor local. El servidor decide legacy/G2 y controla calidad, cache y fallback.
 tasks.push((async()=>{
   let ok=false;
   try{
     const j=await fetchJsonTimeout(`/api/dashboard/fx-current?fresh=${force?'1':'0'}&_=${Date.now()}`,22000);
     ok=applyFxCurrent(j?.fx,'Servidor local');
   }catch(e){console.warn('FX local',e)}
   ['mep','ccl'].forEach(x=>dashCardLoading(x,false));
   setDashStep('Core',ok?'ok':'warn',ok?'Dólar ✓':'Dólar ⚠');
   renderDashboard();
 })());

 // Inflación: siempre vía servidor local; nunca desde el navegador al provider.
 tasks.push((async()=>{
   let ok=false;
   try{
     const j=await fetchJsonTimeout(`/api/dashboard/inflation-current?fresh=${force?'1':'0'}&_=${Date.now()}`,16000);
     ok=applyInflationArray(j?.rows||[]);
   }catch(e){console.warn('IPC local',e)}
   dashCardLoading('inflation',false);
   setDashStep('Hist',ok?'ok':'warn',ok?'IPC ✓':'IPC ⚠');
   renderDashboard();
 })());

 // Riesgo país: histórico local como respaldo; el snapshot live reemplaza luego.
 tasks.push((async()=>{
   let ok=false;
   try{
     const h=await fetchJsonTimeout('/api/dashboard/history?series=risk',16000);
     ok=applyRiskArray(h?.rows||[]);
   }catch(e){console.warn('Riesgo respaldo local',e)}
   if(ok){
     dashCardLoading('risk',false);
     setDashStep('Risk','warn','Riesgo respaldo');
   }
   try{
     const riskUrl=`/api/dashboard/risk?fresh=${force?'1':'0'}&_=${Date.now()}`;
     const r=await fetchJsonTimeout(riskUrl,22000);
     if(id===dashboardLoadId&&dashValid(r?.value)){
       const hist=dashboardData.risk.history||[];
       dashboardData.risk={...dashboardData.risk,...r,history:hist};
       const d=radarLocalDate(),v=dashNum(r.value),z=hist.find(x=>x.date===d);
       if(z)z.value=v;else hist.push({date:d,value:v});
       hist.sort((a,b)=>a.date.localeCompare(b.date));
       dashboardData.updated=new Date().toISOString();
       saveDashboardCache();
       ok=true;
       setDashStep('Risk',r.fallback?'warn':'ok',r.fallback?'Riesgo respaldo':'BondTerminal ✓');
     }
   }catch(e){console.warn('BondTerminal',e)}
   dashCardLoading('risk',false);
   if(!ok)setDashStep('Risk','warn','Riesgo ⚠');
   renderDashboard();
 })());

 // Históricos para gráficos: no bloquean los valores actuales.
 (async()=>{
   const series=['mep','ccl','official','risk','inflation'];
   for(const k of series){
     try{
       const j=await fetchJsonTimeout(`/api/dashboard/history?series=${encodeURIComponent(k)}&fresh=${force?'1':'0'}&_=${Date.now()}`,20000);
       const rows=(j?.rows||[]).map(x=>({date:String(x.date||''),value:dashNum(x.value)}))
         .filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(x.value));
       if(['mep','ccl','official'].includes(k))applyFxHist(k,rows);
       else if(k==='risk'){
         const liveVal=dashNum(dashboardData.risk?.value),liveDate=String(dashboardData.risk?.date||radarLocalDate()).slice(0,10);
         dashboardData.risk.history=rows;
         if(Number.isFinite(liveVal)&&/^\d{4}-\d{2}-\d{2}$/.test(liveDate)){
           const z=dashboardData.risk.history.find(x=>x.date===liveDate);
           if(z)z.value=liveVal;else dashboardData.risk.history.push({date:liveDate,value:liveVal});
           dashboardData.risk.history.sort((a,b)=>a.date.localeCompare(b.date));
         }
       }
       else dashboardData.inflation.history=rows;
       reconcileDashboardFromHistory(k);
       saveDashboardCache();
       renderDashboard();
     }catch(e){console.warn('hist local',k,e)}
   }
 })();

 await Promise.allSettled(tasks);

 if(id===dashboardLoadId){
   dashFinish();
   stabilityState.dashboardStarted=0;
   if(b){b.disabled=false;b.textContent='Actualizar'}
   $('dashUpdated').textContent='Actualizado '+new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
   saveDashboardCache();
   renderDashboard();
 }
}

function renderDashboard(){
 const d=dashboardData;if(!d)return;
 reconcileAllDashboardSeries();if(d.updated)$('dashUpdated').textContent=`Actualizado: ${dashDateLabel(d.updated)}`;
 const r=d.risk||{},rv=dashNum(r.value),rc=dashNum(r.change);
 let rp=dashNum(r.previous);
 if(Number.isFinite(rv)&&Number.isFinite(rc)&&(!Number.isFinite(rp)||Math.abs((rv-rp)-rc)>2))rp=rv-rc;$('dashRiskValue').textContent=Number.isFinite(rv)?`${fmtDashNum(rv,0)} pb`:'—';if(Number.isFinite(rv))dashCardLoading('risk',false);setDashTrend('dashRiskTrend',dashboardDirection(rc,true));$('dashRiskSub').textContent=Number.isFinite(rp)?`Cierre anterior ${fmtDashNum(rp,0)} pb${Number.isFinite(rc)?` · ${rc>=0?'+':''}${fmtDashNum(rc,0)} pb`:''}`:(Number.isFinite(rv)?'Cierre anterior pendiente':'Esperando BondTerminal…');{const rawTs=r.asOf||r.receivedAt||r.verifiedAt||r.fetchedAt||r.date||'';let age='';if(rawTs){const t=Date.parse(rawTs);if(Number.isFinite(t)){const mins=Math.max(0,Math.round((Date.now()-t)/60000));age=mins<60?`${mins}m`:mins<1440?`${Math.round(mins/60)}h`:`${Math.round(mins/1440)}d`;}}const stateLabel=r.status==='STALE'?'STALE':(r.fallback||r.isFallback)?'RESPALDO':r.status==='DELAYED'?'DEMORADO':'ACTUAL';$('dashRiskSource').textContent=`${r.source||'Fuente pendiente'} · ${stateLabel}${age?' · '+age:''}${r.sourceTimestamp?' · '+r.sourceTimestamp:(r.date?' · '+String(r.date).slice(0,10):'')}`;$('dashRiskSource').classList.toggle('dash-stale',stateLabel!=='ACTUAL');}
 const fx=(p,x)=>{const s=dashNum(x.venta),b=dashNum(x.compra),c=dashNum(x.changePct);if(Number.isFinite(s))dashCardLoading(p.toLowerCase(),false);$(`dash${p}Value`).textContent=Number.isFinite(s)?fmtDashMoney(s):'—';setDashTrend(`dash${p}Trend`,dashboardDirection(c));$(`dash${p}Sub`).textContent=`Compra ${Number.isFinite(b)?fmtDashMoney(b):'—'} · var. ${Number.isFinite(c)?(c>=0?'+':'')+fmtDashNum(c,2)+'%':'calculando…'}`;$(`dash${p}Source`).textContent=`${x.source||'Fuente pendiente'}${x.fecha?' · '+dashDateLabel(x.fecha):''}${x.history?.length?` · ${x.history.length} ruedas`:''}`};fx('Mep',d.fx?.mep||{});fx('Ccl',d.fx?.ccl||{});
 const i=d.inflation||{},iv=dashNum(i.value),ic=dashNum(i.change),iy=dashNum(i.yoy);$('dashInflValue').textContent=Number.isFinite(iv)?`${fmtDashNum(iv,1)}%`:'—';if(Number.isFinite(iv))dashCardLoading('inflation',false);setDashTrend('dashInflTrend',dashboardInflationDirection(ic));$('dashInflSub').textContent=`${dashPeriodLabel(i.period)}${Number.isFinite(iy)?` · interanual ${fmtDashNum(iy,1)}%`:''}`;$('dashInflSource').textContent=`${i.source||'Fuente pendiente'}${i.history?.length?` · ${i.history.length} meses`:''}`;
 const o=d.fx?.official||{},ob=dashNum(o.compra),os=dashNum(o.venta),oc=dashNum(o.changePct);$('dashOfficialValue').textContent=Number.isFinite(ob)||Number.isFinite(os)?`Compra ${fmtDashMoney(ob)} · Venta ${fmtDashMoney(os)}`:'—';setDashTrend('dashOfficialTrend',dashboardDirection(oc));$('dashOfficialDate').textContent=`${o.source||'Fuente pendiente'}${o.fecha?' · '+dashDateLabel(o.fecha):''}`;
 const gap=dashValid(d.fx?.ccl?.venta)&&dashValid(o.venta)&&dashNum(o.venta)>0?(dashNum(d.fx.ccl.venta)/dashNum(o.venta)-1)*100:NaN;$('dashCclGap').textContent=Number.isFinite(gap)?`${gap>=0?'+':''}${fmtDashNum(gap,1)}%`:'—';if($('dashDetail').classList.contains('active'))renderDashboardChart(dashboardSeriesKey)
}

function renderDashboardAgenda(){return}

function renderDashboardNews(){return}

function dashboardSeriesPoints(k){
 const d=dashboardData;if(!d)return[];let rows=[];if(k==='risk')rows=d.risk?.history||[];else if(['mep','ccl','official'].includes(k))rows=d.fx?.[k]?.history||[];else if(k==='inflation')rows=d.inflation?.history||[];return rows.map(x=>({time:String(x.date||x.fecha||'').slice(0,10),value:dashNum(x.value!==undefined?x.value:x.venta)})).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.time)&&Number.isFinite(x.value))
}

function dashboardSeriesTitle(k){return{risk:'Riesgo país Argentina',mep:'Dólar MEP · venta',ccl:'Dólar CCL · venta',official:'Dólar oficial · venta',inflation:'Inflación mensual oficial'}[k]||'Evolución'}

async function openDashboardChart(k){
 dashboardSeriesKey=k;$('dashDetail').classList.add('active');document.querySelectorAll('.dash-kpi').forEach(x=>x.classList.toggle('active',x.dataset.dashSeries===k));document.querySelectorAll('[data-series-tab]').forEach(x=>x.classList.toggle('active',x.dataset.seriesTab===k));
 if(!dashboardSeriesPoints(k).length){$('dashMacroChart').innerHTML='<div class="dash-section-loading dash-section-loading-chart"><span class="dash-mini-spinner"></span> Cargando histórico…</div>';try{const j=await fetchJsonTimeout(`/api/dashboard/history?series=${encodeURIComponent(k)}`,8500),rows=Array.isArray(j.rows)?j.rows:[];if(['mep','ccl','official'].includes(k))applyFxHist(k,rows);else if(k==='risk')dashboardData.risk.history=rows;else dashboardData.inflation.history=rows;reconcileDashboardFromHistory(k);saveDashboardCache();renderDashboard()}catch(e){console.warn(e)}}renderDashboardChart(k);setTimeout(()=>$('dashDetail').scrollIntoView({behavior:'smooth',block:'nearest'}),40)
}

function renderDashboardChart(k){
 if(!dashboardData||!$('dashMacroChart'))return;
 dashboardSeriesKey=k;
 const pts=dashboardSeriesPoints(k);
 $('dashDetailTitle').textContent=dashboardSeriesTitle(k);
 let src='—';
 if(k==='risk')src=dashboardData.risk?.source||'—';
 else if(['mep','ccl','official'].includes(k))src=dashboardData.fx?.[k]?.source||'—';
 else if(k==='inflation')src=dashboardData.inflation?.source||'—';
 $('dashDetailMeta').textContent=`${src} · ${pts.length} observaciones`;

 const labels={
   risk:{main:'Riesgo país',fast:'EMA 20',slow:'EMA 50',note:'En riesgo país, bajar es favorable; subir implica mayor prima de riesgo.'},
   mep:{main:'Dólar MEP',fast:'EMA 20',slow:'EMA 50',note:'Serie de cierre. Las EMA muestran tendencia, no precio objetivo.'},
   ccl:{main:'Dólar CCL',fast:'EMA 20',slow:'EMA 50',note:'Serie de cierre. Las EMA muestran tendencia, no precio objetivo.'},
   official:{main:'Dólar oficial',fast:'EMA 20',slow:'EMA 50',note:'Serie de cierre. Las EMA muestran tendencia, no precio objetivo.'},
   inflation:{main:'IPC mensual',fast:'Media 3 meses',slow:'Media 6 meses',note:'En inflación se usan medias cortas porque la frecuencia es mensual.'}
 }[k];
 if(labels){
   $('dashLegendMain').textContent=labels.main;
   $('dashLegendFast').textContent=labels.fast;
   $('dashLegendSlow').textContent=labels.slow;
   $('dashLegendNote').textContent=labels.note;
 }

 if(dashboardChart){dashboardChart.remove();dashboardChart=null}
 const el=$('dashMacroChart');el.innerHTML='';
 if(!pts.length){
   el.innerHTML='<div class="dash-empty dash-empty-chart">No se pudo obtener historial para esta serie. No se dibuja un gráfico vacío ni se inventan datos.<br><button class="secondary-action dash-retry" onclick="openDashboardChart(dashboardSeriesKey)">Reintentar historial</button></div>';
   $('dashChartRead').textContent='Historial pendiente.';
   return;
 }

 dashboardChart=LightweightCharts.createChart(el,{
   width:Math.max(320,el.clientWidth),height:330,
   layout:{background:{color:'#06121d'},textColor:'#9fb5c5'},
   grid:{vertLines:{color:'#10283a'},horzLines:{color:'#10283a'}},
   rightPriceScale:{borderColor:'#2f688e'},
   timeScale:{borderColor:'#2f688e',timeVisible:false},
   crosshair:{mode:0}
 });

 const fp=k==='inflation'?3:20,sp=k==='inflation'?6:50;
 const vals=pts.map(x=>x.value),f=emaArray(vals,fp),s=emaArray(vals,sp);

 const main=addSeries(
   dashboardChart,
   k==='inflation'?'HistogramSeries':'LineSeries',
   k==='inflation'
    ? {color:'#9fb5c5',priceLineVisible:true,lastValueVisible:true}
    : {color:'#9fb5c5',lineWidth:3,priceLineVisible:true,lastValueVisible:true,lineStyle:0}
 );
 main.setData(pts);

 dashboardFastSeries=addSeries(dashboardChart,'LineSeries',{
   color:'#9d78ff',lineWidth:2,priceLineVisible:false,lastValueVisible:false,lineStyle:0
 });
 dashboardSlowSeries=addSeries(dashboardChart,'LineSeries',{
   color:'#a0ca92',lineWidth:2,priceLineVisible:false,lastValueVisible:false,lineStyle:2
 });

 dashboardFastSeries.setData(pts.map((x,i)=>({time:x.time,value:f[i]})).filter(x=>Number.isFinite(x.value)));
 dashboardSlowSeries.setData(pts.map((x,i)=>({time:x.time,value:s[i]})).filter(x=>Number.isFinite(x.value)));
 dashboardChart.timeScale().fitContent();

 const tr=dashboardTrendRead(pts,fp,sp,k==='risk');
 let extra='';
 if(k==='inflation'){
   const c=dashNum(dashboardData.inflation?.value),p=dashNum(dashboardData.inflation?.previous);
   if(Number.isFinite(c)&&Number.isFinite(p))extra=` Último IPC ${fmtDashNum(c,1)}% vs ${fmtDashNum(p,1)}% previo.`;
 }else if(['mep','ccl','official'].includes(k)){
   const x=dashboardData.fx?.[k],chg=dashNum(x?.changePct);
   if(Number.isFinite(chg))extra=` Variación vs cierre previo: ${chg>=0?'+':''}${fmtDashNum(chg,2)}%.`;
 }else if(k==='risk'){
   const chg=dashNum(dashboardData.risk?.change);
   if(Number.isFinite(chg))extra=` Variación vs cierre anterior: ${chg>=0?'+':''}${fmtDashNum(chg,0)} pb.`;
 }
 $('dashChartRead').innerHTML=`<b>${tr.trend}</b> · ${escapeHtml(tr.text+extra)}`;
}

function showDashboardView(){
 setInstitutionalView('homeViewBtn','Centro de Mercado','Contexto, inteligencia de mercado y decisiones prioritarias');
 hideAllMainViews();
 setTechnicalStatusVisible(false);
 $('dashboardView').classList.add('active');
 if(dashboardData.updated)renderDashboard();
 renderMarketBoard();
 try{renderDecisionCenter()}catch{}
 if(marketIntel.updated){
   renderBreadth('ar',marketIntel.breadthAr);
   renderBreadth('us',marketIntel.breadthUs);
   renderRegime(marketIntel.regime);
   renderScannerContext();
   renderLocalRates(marketIntel.rates);
   renderCurves();
 }
}

;

/* ===== RUNTIME BLOCK 17 ===== */
// Radar Técnico G2 — Phase 10C / v4.34.0
// Market Intelligence runtime extraction.
// Ownership: reference-market history, breadth/regime/curves, market board and market-detail chart runtime.
// Behavior is intentionally preserved from the certified 4.33.0 / 10B inline bridge.
'use strict';

function marketFmt(asset,v){
 const n=dashNum(v);if(!Number.isFinite(n))return'—';
 return new Intl.NumberFormat('es-AR',{minimumFractionDigits:asset.decimals||0,maximumFractionDigits:asset.decimals??2}).format(n);
}
function marketEmaLast(bars,period){
 const vals=bars.map(x=>Number(x.close)).filter(Number.isFinite);
 if(!vals.length)return NaN;return emaArray(vals,period).at(-1);
}
function marketTrend(asset,bars){
 if(!Array.isArray(bars)||bars.length<20)return{key:'mixed',label:'SIN TENDENCIA'};
 const last=Number(bars.at(-1).close),e20=marketEmaLast(bars,20),e50=marketEmaLast(bars,50);
 if(Number.isFinite(last)&&Number.isFinite(e20)&&Number.isFinite(e50)){
   if(last>e20&&e20>e50)return{key:'up',label:'ALCISTA'};
   if(last<e20&&e20<e50)return{key:'down',label:'BAJISTA'};
 }
 return{key:'mixed',label:'MIXTA'};
}
async function fetchMarketBars(symbol,interval='1d',range='6mo',timeout=60000,force=false){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
 try{
   const u=`/api/yahoo?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&quiet=1&fresh=${force?'1':'0'}&_=${Date.now()}`;
   const r=await fetch(u,{cache:'no-store',signal:c.signal});
   if(!r.ok)throw new Error(await r.text());
   const j=await r.json(),res=j?.chart?.result?.[0],q=res?.indicators?.quote?.[0];
   if(!res?.timestamp?.length||!q)throw new Error('Yahoo no devolvió OHLC');
   const out=[];
   res.timestamp.forEach((time,i)=>{
     const open=Number(q.open?.[i]),high=Number(q.high?.[i]),low=Number(q.low?.[i]),close=Number(q.close?.[i]),volume=Number(q.volume?.[i]||0);
     if([open,high,low,close].every(Number.isFinite))out.push({time:Number(time),open,high,low,close,volume:Number.isFinite(volume)?volume:0});
   });
   if(out.length<2)throw new Error('Historial insuficiente');
   return out;
 }finally{clearTimeout(t)}
}

function unixArDate(ts){
 try{
   return new Intl.DateTimeFormat('en-CA',{
     timeZone:'America/Argentina/Buenos_Aires',
     year:'numeric',month:'2-digit',day:'2-digit'
   }).format(new Date(Number(ts)*1000));
 }catch{return''}
}
async function fetchMervalUsdOfficialQuote(force=false){
 if(!force&&mervalUsdQuoteCache)return mervalUsdQuoteCache;
 try{
   const j=await queuedLocalJson('/api/byma/merval-usd',12000);
   if(j&&dashValid(j.value)){mervalUsdQuoteCache=j;return j}
 }catch(e){console.warn('SPMERVDT oficial',e)}

 // Fallback transparente: ^MERV / MEP. Usa los mismos datos ya visibles en Radar.
 try{
   let merv=marketBoardData.get('merval');
   let mervLast=marketEntryValid(merv)?Number(merv.last):NaN;
   let mervChg=marketEntryValid(merv)?Number(merv.changePct):NaN;
   if(!Number.isFinite(mervLast)){
     const bars=await fetchMarketBars('^MERV','1d','5d',15000,force),last=bars.at(-1),prev=bars.length>1?bars.at(-2):null;
     mervLast=Number(last?.close);
     mervChg=prev&&Number(prev.close)?(mervLast/Number(prev.close)-1)*100:NaN;
   }

   let mep=dashboardData?.fx?.mep||{};
   if(!dashValid(mep.venta)){
     const fx=await fetchJsonTimeout('/api/dashboard/fx-current?fresh=1&_='+Date.now(),12000);
     if(fx?.fx?.mep)mep=fx.fx.mep;
   }
   const mepVenta=dashNum(mep.venta),mepChg=dashNum(mep.changePct);
   if(Number.isFinite(mervLast)&&Number.isFinite(mepVenta)&&mepVenta>0){
     const value=mervLast/mepVenta;
     const changePct=Number.isFinite(mervChg)&&Number.isFinite(mepChg)?(((1+mervChg/100)/(1+mepChg/100))-1)*100:mervChg;
     const j={value,changePct,symbol:'SPMERVDT',name:'S&P Merval USD (MEP)',source:'Proxy ^MERV / MEP · Radar',official:false,updated:new Date().toISOString()};
     mervalUsdQuoteCache=j;return j;
   }
 }catch(e){console.warn('SPMERVDT proxy',e)}
 return null;
}
function weeklyCloseFromDaily(bars){
 const map=new Map();
 bars.forEach(b=>{
   const d=new Date(Number(b.time)*1000);
   const day=(d.getUTCDay()+6)%7;
   const monday=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day));
   const key=monday.toISOString().slice(0,10);
   map.set(key,b);
 });
 return [...map.values()];
}
async function fetchMervalUsdSeries(range='1y',interval='1d',force=false){
 // Historial gratuito orientativo: S&P Merval ARS / MEP diario.
 // No se convierte en vela OHLC porque no existe OHLC oficial gratuito de SPMERVDT.
 const [merv,mepPayload,official]=await Promise.all([
   fetchMarketBars('^MERV','1d',range,10000,force),
   fetchJsonTimeout(`/api/dashboard/history?series=mep&fresh=${force?'1':'0'}&_=${Date.now()}`,16000),
   fetchMervalUsdOfficialQuote(force)
 ]);
 const mep=(Array.isArray(mepPayload?.rows)?mepPayload.rows:[])
   .map(x=>({date:String(x.date||'').slice(0,10),value:dashNum(x.value)}))
   .filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(x.value)&&x.value>0)
   .sort((a,b)=>a.date.localeCompare(b.date));
 if(!mep.length)throw new Error('Sin histórico MEP para construir la serie USD');

 let p=0,lastMep=NaN;
 const out=[];
 for(const b of merv){
   const date=unixArDate(b.time);
   while(p<mep.length&&mep[p].date<=date){lastMep=mep[p].value;p++}
   if(!Number.isFinite(lastMep)||lastMep<=0)continue;
   const close=Number(b.close)/lastMep;
   if(Number.isFinite(close))out.push({time:b.time,close,open:close,high:close,low:close,volume:0});
 }
 if(out.length<2)throw new Error('Histórico Merval USD insuficiente');

 if(official&&dashValid(official.value)){
   const today=radarLocalDate();
   const last=out.at(-1);
   if(unixArDate(last.time)===today){
     last.close=dashNum(official.value);last.open=last.high=last.low=last.close;
   }
 }
 return interval==='1wk'?weeklyCloseFromDaily(out):out;
}
async function fetchFredYieldBars(asset,interval='1d',range='1y',timeout=30000,force=false){
 const series=asset?.fredSeries||asset?.symbol;
 if(!series)throw new Error('Serie FRED no configurada');
 const c=new AbortController(),tm=setTimeout(()=>c.abort(),timeout);
 try{
   const u=`/api/treasury-series?series=${encodeURIComponent(series)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&fresh=${force?'1':'0'}&_=${Date.now()}`;
   const r=await fetch(u,{cache:'no-store',signal:c.signal});
   if(!r.ok)throw new Error(await r.text());
   const j=await r.json();
   const bars=(j?.rows||[]).map(x=>({
     time:Number(x.time),
     close:Number(x.close)
   })).filter(x=>Number.isFinite(x.time)&&Number.isFinite(x.close));
   if(bars.length<10)throw new Error(`FRED no devolvió historial suficiente para ${series}`);
   return bars;
 }finally{clearTimeout(tm)}
}

async function fetchTreasuryOfficialYieldBars(asset,interval='1d',range='1y',timeout=35000,force=false){
 const field=asset?.treasuryField;
 if(!field)throw new Error('Campo oficial del Treasury no configurado');
 const c=new AbortController(),tm=setTimeout(()=>c.abort(),timeout);
 try{
   const u=`/api/treasury-official-series?field=${encodeURIComponent(field)}&interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&fresh=${force?'1':'0'}&_=${Date.now()}`;
   const r=await fetch(u,{cache:'no-store',signal:c.signal});
   if(!r.ok){
     let msg='';try{msg=await r.text()}catch{}
     throw new Error(msg||`U.S. Treasury HTTP ${r.status}`);
   }
   const j=await r.json();
   const bars=(j?.rows||[]).map(x=>({time:Number(x.time),close:Number(x.close)}))
     .filter(x=>Number.isFinite(x.time)&&Number.isFinite(x.close));
   if(bars.length<10)throw new Error(`U.S. Treasury no devolvió historial suficiente para ${field}`);
   return bars;
 }finally{clearTimeout(tm)}
}

async function fetchMarketAssetBars(asset,interval='1d',range='6mo',timeout=8500,force=false){
 if(asset?.sourceType==='byma-merval-usd')return fetchMervalUsdSeries(range,interval,force);
 if(asset?.sourceType==='treasury-official-yield')return fetchTreasuryOfficialYieldBars(asset,interval,range,Math.max(timeout,35000),force);
 if(asset?.sourceType==='fred-yield')return fetchFredYieldBars(asset,interval,range,Math.max(timeout,30000),force);
 return fetchMarketBars(asset.symbol,interval,range,timeout,force);
}
function marketSourceLabel(asset,entry){
 if(entry?.source)return entry.source;
 if(asset?.sourceType==='byma-merval-usd')return 'BYMA actual · histórico proxy Merval/MEP';
 if(asset?.sourceType==='treasury-official-yield')return 'U.S. Department of the Treasury';
 if(asset?.sourceType==='fred-yield')return 'Federal Reserve / FRED H.15';
 return 'Yahoo Finance';
}


function intelChip(el,label,kind='neutral'){if(!el)return;el.textContent=label;el.className='intel-chip '+kind}
function breadthClass(x){if(!x||!Number.isFinite(x.above50))return'neutral';return x.above50>=60?'good':x.above50<=40?'bad':'neutral'}
function breadthLabel(x){if(!x||!Number.isFinite(x.above50))return'SIN DATOS';return x.above50>=65?'FUERTE':x.above50<=35?'DÉBIL':'MIXTO'}
function calcBreadth(rows){
 const good=(rows||[]).filter(x=>x&&x.ok),n=good.length;if(!n)return null;
 let adv=0,dec=0,flat=0,a20=0,a50=0,a200=0,a200n=0;
 good.forEach(x=>{if(x.change>0)adv++;else if(x.change<0)dec++;else flat++;if(x.above20)a20++;if(x.above50)a50++;if(x.above200!==null){a200n++;if(x.above200)a200++}});
 return{n,adv,dec,flat,above20:a20/n*100,above50:a50/n*100,above200:a200n?a200/a200n*100:NaN,adRatio:dec?adv/dec:adv};
}
function barsBreadthPoint(bars,symbol){
 if(!Array.isArray(bars)||bars.length<55)return null;
 const c=bars.map(x=>Number(x.close)).filter(Number.isFinite);if(c.length<55)return null;
 const last=c.at(-1),prev=c.at(-2),e20=emaArray(c,20).at(-1),e50=emaArray(c,50).at(-1),e200=c.length>=200?emaArray(c,200).at(-1):NaN;
 return{ok:true,symbol,last,change:prev?(last/prev-1)*100:0,above20:last>e20,above50:last>e50,above200:Number.isFinite(e200)?last>e200:null};
}
function renderBreadth(which,data){
 const pre=which==='ar'?'breadthAr':'breadthUs',chip=$(pre+'Chip'),value=$(pre+'Value'),label=$(pre+'Label'),bar=$(pre+'Bar'),mini=$(pre+'Mini');
 if(!data){value.textContent='—';intelChip(chip,'SIN DATOS');return}
 intelChip(chip,breadthLabel(data),breadthClass(data));value.textContent=`${Math.round(data.above50)}% > EMA50`;
 label.textContent=`${data.adv} suben · ${data.dec} bajan · ${data.flat} sin cambio · ${data.n} analizadas`;
 const total=Math.max(1,data.adv+data.dec+data.flat);
 bar.innerHTML=`<div class="breadth-adv" style="width:${data.adv/total*100}%"></div><div class="breadth-dec" style="width:${data.dec/total*100}%"></div><div class="breadth-flat" style="width:${data.flat/total*100}%"></div>`;
 mini.innerHTML=`<div><small>Sobre EMA20</small><b>${Number.isFinite(data.above20)?data.above20.toFixed(0)+'%':'—'}</b></div><div><small>Sobre EMA50</small><b>${data.above50.toFixed(0)}%</b></div><div><small>Sobre EMA200</small><b>${Number.isFinite(data.above200)?data.above200.toFixed(0)+'%':'—'}</b></div>`;
}
async function loadBreadthArgentina(){
 const pairs=[['GGAL','GGAL.BA'],['YPFD','YPFD.BA'],['PAMP','PAMP.BA'],['BMA','BMA.BA'],['BBAR','BBAR.BA'],['TXAR','TXAR.BA']],rows=[];
 const settled=await Promise.allSettled(pairs.map(async([local,yahoo])=>{
   const bars=await fetchMarketBars(yahoo,'1d','1y',18000);
   return barsBreadthPoint(bars,local);
 }));
 settled.forEach(x=>{if(x.status==='fulfilled'&&x.value)rows.push(x.value)});
 if(rows.length>=3)return calcBreadth(rows);

 // Fallback batch para completar faltantes si Yahoo individual falló.
 try{
   const have=new Set(rows.map(x=>x.symbol)),missing=pairs.filter(([local])=>!have.has(local));
   if(missing.length){
     const m=await fetchYahooBatch(missing.map(x=>({symbol:x[1]})),'1y','1d',30000);
     for(const [local,yahoo] of missing){const x=m.get(yahoo);if(!x?.ok||!x.bars?.length)continue;const p=barsBreadthPoint(x.bars,local);if(p)rows.push(p)}
   }
 }catch(e){console.warn('breadth AR batch fallback',e)}
 return calcBreadth(rows);
}
async function loadBreadthUs(){
 const rows=[];
 const settled=await Promise.allSettled(BREADTH_US_SYMBOLS.map(async symbol=>{
   const bars=await fetchMarketBars(symbol,'1d','1y',18000);
   return barsBreadthPoint(bars,symbol);
 }));
 settled.forEach(x=>{if(x.status==='fulfilled'&&x.value)rows.push(x.value)});
 if(rows.length)return calcBreadth(rows);
 try{
   const m=await fetchYahooBatch(BREADTH_US_SYMBOLS.map(symbol=>({symbol})),'1y','1d',30000);
   for(const symbol of BREADTH_US_SYMBOLS){const x=m.get(symbol);if(!x?.ok||!x.bars?.length)continue;const p=barsBreadthPoint(x.bars,symbol);if(p)rows.push(p)}
 }catch(e){console.warn('breadth USA batch fallback',e)}
 return calcBreadth(rows);
}
async function calculateRegime(){
 const comps=[];let score=50;
 const getCached=(id)=>marketBoardData.get(id);

 const sp=getCached('sp500');
 if(sp&&!sp.error&&Number.isFinite(sp.changePct)){
   const p=sp.changePct>0.5?8:sp.changePct<-0.5?-8:0;score+=p;
   comps.push({name:'S&P 500',points:p,reason:`${sp.changePct>=0?'+':''}${sp.changePct.toFixed(2)}% día`});
 }

 const vix=getCached('vix');
 if(vix&&!vix.error&&Number.isFinite(vix.last)){
   const v=Number(vix.last),p=v<18?8:v>30?-16:v>24?-9:0;score+=p;
   comps.push({name:'VIX',points:p,reason:`${v.toFixed(1)} pts`});
 }

 const dxy=getCached('dxy');
 if(dxy&&!dxy.error&&Number.isFinite(dxy.changePct)){
   const p=dxy.changePct>0.3?-5:dxy.changePct<-0.3?5:0;score+=p;
   comps.push({name:'DXY',points:p,reason:`${dxy.changePct>=0?'+':''}${dxy.changePct.toFixed(2)}% día`});
 }

 const t10=(marketIntel.usCurve||[]).find(x=>x.label==='10Y');
 if(t10){
   comps.push({name:'Treasury 10Y',points:0,reason:`${t10.y.toFixed(2)}% · FRED`});
 }

 const oil=getCached('wti');
 if(oil&&!oil.error&&Number.isFinite(oil.changePct)){
   const p=oil.changePct>4?-4:oil.changePct<-4?2:0;score+=p;
   comps.push({name:'WTI',points:p,reason:`${oil.changePct>=0?'+':''}${oil.changePct.toFixed(1)}% día`});
 }

 if(dashboardData?.risk&&dashValid(dashboardData.risk.change)){
   const ch=dashNum(dashboardData.risk.change),p=ch<=-10?8:ch<0?4:ch>=10?-8:ch>0?-4:0;score+=p;
   comps.push({name:'Riesgo país',points:p,reason:`${ch>=0?'+':''}${ch.toFixed(0)} pb`});
 }

 for(const [name,b] of [['Breadth USA',marketIntel.breadthUs],['Breadth AR',marketIntel.breadthAr]]){
   if(b){
     const p=b.above50>=65?7:b.above50<=35?-7:0;score+=p;
     comps.push({name,points:p,reason:`${b.above50.toFixed(0)}% > EMA50`});
   }
 }

 score=Math.max(0,Math.min(100,Math.round(score)));
 const label=score>=65?'RISK ON':score<=35?'RISK OFF':'NEUTRAL';
 const kind=label==='RISK ON'?'good':label==='RISK OFF'?'bad':'neutral';
 return{score,label,kind,components:comps.sort((a,b)=>Math.abs(b.points)-Math.abs(a.points))};
}
function renderRegime(r){
 if(!r)return;$('regimeValue').textContent=`${r.score}/100`;intelChip($('regimeChip'),r.label,r.kind);$('regimeBar').style.width=`${r.score}%`;
 $('regimeLabel').textContent=r.label==='RISK ON'?'Entorno favorable para riesgo, sujeto al setup.':r.label==='RISK OFF'?'Entorno defensivo: exige mayor confirmación.':'Entorno mixto: el activo y su breadth pesan más.';
 $('regimeReasons').innerHTML=r.components.slice(0,6).map(c=>`<li><b class="${c.points>0?'ctx-pos':c.points<0?'ctx-neg':'ctx-zero'}">${c.points>0?'+':''}${c.points}</b> · ${escapeHtml(c.name)}: ${escapeHtml(c.reason)}</li>`).join('');
}
function scannerContextFor(type='stock'){
 let adj=0,reasons=[];const r=marketIntel.regime;
 if(r){const p=r.score>=70?6:r.score>=60?3:r.score<=30?-8:r.score<=40?-4:0;adj+=p;if(p)reasons.push(`${r.label} ${p>0?'+':''}${p}`)}
 const isAr=['argstock','cedear','argbond','on'].includes(type),b=isAr?marketIntel.breadthAr:marketIntel.breadthUs;
 if(b){const p=b.above50>=65?4:b.above50<=35?-5:0;adj+=p;if(p)reasons.push(`breadth ${isAr?'AR':'USA'} ${p>0?'+':''}${p}`)}
 adj=Math.max(-12,Math.min(10,Math.round(adj)));return{adjustment:adj,reason:reasons.length?reasons.join(' · '):'Contexto neutral'};
}
function renderScannerContext(){
 const us=scannerContextFor('stock'),ar=scannerContextFor('argstock'),avg=Math.round((us.adjustment+ar.adjustment)/2);
 marketIntel.scannerAdjustment=avg;marketIntel.scannerReason=`USA ${us.adjustment>=0?'+':''}${us.adjustment} · Argentina ${ar.adjustment>=0?'+':''}${ar.adjustment}`;
 $('scannerCtxValue').textContent=`${avg>=0?'+':''}${avg} pts`;intelChip($('scannerCtxChip'),avg>=4?'FAVORABLE':avg<=-4?'DEFENSIVO':'NEUTRAL',avg>=4?'good':avg<=-4?'bad':'neutral');
 $('scannerCtxReasons').innerHTML=`<li>USA/CEDEAR: <b>${us.adjustment>=0?'+':''}${us.adjustment}</b> · ${escapeHtml(us.reason)}</li><li>Acciones Argentina: <b>${ar.adjustment>=0?'+':''}${ar.adjustment}</b> · ${escapeHtml(ar.reason)}</li><li>Límite: +10 / -12. No fabrica un trigger.</li>`;
}
function renderLocalRates(r){
 marketIntel.rates=r;const items=[['Caución BYMA',r?.caucion?.value,'% TNA',r?.caucion?.date||'N/D'],['TAMAR',r?.tamar?.value,'% TNA',r?.tamar?.date||'N/D'],['BADLAR',r?.badlar?.value,'% TNA',r?.badlar?.date||'N/D'],['TM20 · 30–35d',r?.tm20?.value??r?.deposit30?.value,'% TNA',r?.tm20?.date||r?.deposit30?.date||'N/D'],['CER',r?.cer?.value,' índice',r?.cer?.date||'N/D'],['UVA',r?.uva?.value,' ARS',r?.uva?.date||'N/D']];
 $('localRatesGrid').innerHTML=items.map(([n,v,u,d])=>`<div class="intel-rate"><small>${n}</small><b>${dashValid(v)?Number(v).toLocaleString('es-AR',{maximumFractionDigits:n==='CER'||n==='UVA'?4:2})+u:'—'}</b><span>${escapeHtml(String(d||''))}</span></div>`).join('');
 const count=Number(r?.available)||items.filter(([,v])=>dashValid(v)).length;
 $('localRatesNote').textContent=r?.source?`Fuente: ${r.source}. ${count}/6 referencias disponibles; cada tarjeta muestra la fecha del dato. No se completan valores faltantes con estimaciones.`:'Fuente no disponible.';
}
function curveSvg(points,color='#9fb5c5'){
 const p=(points||[]).filter(x=>Number.isFinite(x.x)&&Number.isFinite(x.y));if(p.length<2)return'<div class="intel-label">Datos insuficientes.</div>';
 const W=520,H=150,pad=28,minX=Math.min(...p.map(x=>x.x)),maxX=Math.max(...p.map(x=>x.x)),minY=Math.min(...p.map(x=>x.y)),maxY=Math.max(...p.map(x=>x.y)),sx=x=>pad+(x-minX)/(maxX-minX||1)*(W-pad*2),sy=y=>H-pad-(y-minY)/(maxY-minY||1)*(H-pad*2);
 return `<svg class="curve-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="#25404f"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="#25404f"/><polyline points="${p.map(x=>`${sx(x.x)},${sy(x.y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3"/>${p.map(x=>`<circle cx="${sx(x.x)}" cy="${sy(x.y)}" r="4" fill="${color}"/><text x="${sx(x.x)}" y="${sy(x.y)-8}" text-anchor="middle" fill="#c8d6de" font-size="9">${escapeHtml(x.label)} ${x.y.toFixed(2)}%</text>`).join('')}</svg>`;
}

function parseFredCurveCsv(text){
 const lines=String(text||'').trim().split(/\r?\n/);if(lines.length<2)return[];
 const head=lines[0].split(',').map(x=>x.trim());
 const idx={};head.forEach((x,i)=>idx[x]=i);
 for(let i=lines.length-1;i>=1;i--){
   const c=lines[i].split(',');
   const defs=[['3M','DGS3MO',.25],['2Y','DGS2',2],['5Y','DGS5',5],['10Y','DGS10',10],['30Y','DGS30',30]];
   const pts=[];
   for(const [label,k,x] of defs){
     const pos=idx[k],v=pos===undefined?NaN:Number(c[pos]);
     if(Number.isFinite(v))pts.push({label,x,y:v,date:c[0],source:'Federal Reserve / FRED H.15'});
   }
   if(pts.length>=4)return pts;
 }
 return[];
}

async function loadUsCurve(){
 const defs=[
   ['13w','ust13w','^IRX',0.25],
   ['5Y','ust5y','^FVX',5],
   ['10Y','ust10y','^TNX',10],
   ['30Y','ust30y','^TYX',30]
 ],pts=[];

 for(const [label,id,symbol,x] of defs){
   const q=marketBoardData.get(id);
   if(marketEntryValid(q)&&Number.isFinite(Number(q.last)))pts.push({label,x,y:Number(q.last),source:q.source||'Radar market board'});
 }

 const have=new Set(pts.map(x=>x.label));
 const missing=defs.filter(([label])=>!have.has(label));
 if(missing.length){
   const settled=await Promise.allSettled(missing.map(async([label,id,symbol,x])=>{
     const bars=await fetchMarketBars(symbol,'1d','1mo',15000),last=bars.at(-1);
     return last&&Number.isFinite(Number(last.close))?{label,x,y:Number(last.close),source:'Yahoo Finance · Radar'}:null;
   }));
   settled.forEach(x=>{if(x.status==='fulfilled'&&x.value)pts.push(x.value)});
 }

 try{
   const j=await fetchJsonTimeout('/api/treasury-curve',10000);
   for(const p of (j?.points||[])){
     const label=String(p.label||p.tenor||''),years=Number(p.years??(label==='3M'?.25:label==='2Y'?2:label==='5Y'?5:label==='10Y'?10:label==='30Y'?30:NaN)),y=Number(p.yield??p.value);
     if(label&&Number.isFinite(years)&&Number.isFinite(y)&&!pts.some(x=>x.label===label))pts.push({label,x:years,y,source:j.source||'FRED'});
   }
 }catch(e){console.warn('Treasury curve fallback',e)}

 return pts.sort((a,b)=>a.x-b.x);
}
async function loadArCurve(){
 try{const j=await fetchJsonTimeout('/api/fixed-income/curve',30000);const rows=(j?.bonds||[]).filter(b=>dashValid(b.tir)&&dashValid(b.duration)&&Number(b.tir)>0&&Number(b.duration)>0).map(b=>({label:String(b.ticker||'').toUpperCase(),x:Number(b.duration),y:Number(b.tir),paridad:dashNum(b.paridad)})).filter(x=>/^(AL|GD|AE)/.test(x.label)).sort((a,b)=>a.x-b.x);const out=[],seen=new Set();for(const x of rows){if(x.label&&!seen.has(x.label)){seen.add(x.label);out.push(x)}}return out.slice(0,12)}catch(e){console.warn('AR curve lite',e);return[]}
}
function renderCurves(){
 const us=marketIntel.usCurve||[],ar=marketIntel.arCurve||[];$('usCurveChart').innerHTML=curveSvg(us,'#9fb5c5');$('arCurveChart').innerHTML=curveSvg(ar,'#a0ca92');
 const f=l=>us.find(x=>x.label===l)?.y,y2=f('2Y'),y5=f('5Y'),y10=f('10Y'),y30=f('30Y'),s=[];
 if(Number.isFinite(y2)&&Number.isFinite(y10))s.push(`2Y–10Y ${((y10-y2)*100)>=0?'+':''}${((y10-y2)*100).toFixed(0)} pb`);if(Number.isFinite(y5)&&Number.isFinite(y10))s.push(`5Y–10Y ${((y10-y5)*100)>=0?'+':''}${((y10-y5)*100).toFixed(0)} pb`);if(Number.isFinite(y10)&&Number.isFinite(y30))s.push(`10Y–30Y ${((y30-y10)*100)>=0?'+':''}${((y30-y10)*100).toFixed(0)} pb`);$('usCurveSpreads').textContent=s.join(' · ')||'Spreads no disponibles.';
 const al=ar.find(x=>x.label==='AL30'),gd=ar.find(x=>x.label==='GD30'),a=[];if(al&&gd)a.push(`AL30–GD30 ${((al.y-gd.y)*100)>=0?'+':''}${((al.y-gd.y)*100).toFixed(0)} pb`);if(ar.length)a.push(`TIR ${Math.min(...ar.map(x=>x.y)).toFixed(1)}%–${Math.max(...ar.map(x=>x.y)).toFixed(1)}%`);$('arCurveSpreads').textContent=a.join(' · ')||'Sin suficientes soberanos USD.';
}
async function loadMarketIntelligence(force=false){
 if(marketIntel.loading)return;
 if(marketBoardLoading){$('intelStatus').textContent='Esperando Mercados de Referencia…';const start=Date.now();while(marketBoardLoading&&Date.now()-start<45000)await new Promise(r=>setTimeout(r,250))}
 const intelCacheComplete=!!marketIntel.breadthUs&&!!marketIntel.breadthAr&&Number(marketIntel.rates?.available||0)>0&&(marketIntel.usCurve?.length||0)>=4&&(marketIntel.arCurve?.length||0)>=2;if(!force&&intelCacheComplete&&marketIntel.updated&&Date.now()-marketIntel.updated<20*60*1000){renderBreadth('ar',marketIntel.breadthAr);renderBreadth('us',marketIntel.breadthUs);renderRegime(marketIntel.regime);renderScannerContext();renderLocalRates(marketIntel.rates);renderCurves();$('intelStatus').textContent='Contexto desde cache';return}
 marketIntel.loading=true;$('intelRefresh').disabled=true;
 try{
   $('intelStatus').textContent='1/5 · Curva Treasury USA…';try{marketIntel.usCurve=await loadUsCurve()}catch{marketIntel.usCurve=[]};renderCurves();
   $('intelStatus').textContent='2/5 · Curva soberana Argentina…';try{marketIntel.arCurve=await loadArCurve()}catch{marketIntel.arCurve=[]};renderCurves();
   $('intelStatus').textContent='3/5 · Breadth USA…';try{marketIntel.breadthUs=await loadBreadthUs()}catch{marketIntel.breadthUs=null};renderBreadth('us',marketIntel.breadthUs);
   $('intelStatus').textContent='4/5 · Breadth Argentina…';try{marketIntel.breadthAr=await loadBreadthArgentina()}catch{marketIntel.breadthAr=null};renderBreadth('ar',marketIntel.breadthAr);
   $('intelStatus').textContent='5/5 · Tasas argentinas…';try{marketIntel.rates=await fetchJsonTimeout('/api/local-rates',15000)}catch{marketIntel.rates=null};renderLocalRates(marketIntel.rates);
   $('intelStatus').textContent='Calculando régimen global…';marketIntel.regime=await calculateRegime();renderRegime(marketIntel.regime);renderScannerContext();marketIntel.updated=Date.now();saveIntelCache();$('intelStatus').textContent='Contexto actualizado '+new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
 }finally{
   if(!marketIntel.breadthUs)renderBreadth('us',null);if(!marketIntel.breadthAr)renderBreadth('ar',null);
   if(!marketIntel.usCurve?.length){$('usCurveChart').innerHTML='<div class="intel-label">Curva Treasury no disponible.</div>';$('usCurveSpreads').textContent='No bloquea el resto.'}
   if(!marketIntel.arCurve?.length){$('arCurveChart').innerHTML='<div class="intel-label">Curva soberana no disponible.</div>';$('arCurveSpreads').textContent='No bloquea el resto.'}
   if(!marketIntel.rates){$('localRatesGrid').innerHTML='<div class="intel-label">Tasas BCRA no disponibles en este momento.</div>';$('localRatesNote').textContent='No bloquea Mercados ni los scanners.'}
   marketIntel.loading=false;$('intelRefresh').disabled=false;
 }
}

async function marketMapLimit(items,limit,worker){
 let next=0;const runners=Array.from({length:Math.min(limit,items.length)},async()=>{
   while(true){const i=next++;if(i>=items.length)return;await worker(items[i],i)}
 });await Promise.allSettled(runners);
}


async function fetchMarketSnapshot(asset,timeout=60000){
 if(asset?.sourceType==='byma-merval-usd'){
   const q=await fetchMervalUsdOfficialQuote(false);
   if(q&&dashValid(q.value))return{last:dashNum(q.value),changePct:dashValid(q.changePct)?dashNum(q.changePct):NaN,lastTime:Math.floor(Date.now()/1000),source:q.source||'BYMA',bars:[]};
   throw new Error('S&P Merval USD no disponible');
 }
 const bars=await fetchMarketBars(asset.symbol,'1d','6mo',timeout);
 const last=bars.at(-1),prev=bars.length>1?bars.at(-2):null;
 return{last:Number(last.close),changePct:prev&&Number(prev.close)!==0?(Number(last.close)/Number(prev.close)-1)*100:NaN,lastTime:Number(last.time),source:'Yahoo Finance · motor v55',bars};
}
function snapshotDirection(entry){
 const c=Number(entry?.changePct);
 if(!Number.isFinite(c)||Math.abs(c)<0.03)return{key:'mixed',label:'ESTABLE'};
 return c>0?{key:'up',label:'SUBE'}:{key:'down',label:'BAJA'};
}


async function fetchYahooBatch(assets,range='6mo',interval='1d',timeout=40000){
 const list=(assets||[]).filter(a=>a&&a.symbol&&a.sourceType!=='byma-merval-usd');
 if(!list.length)return new Map();
 const symbols=[...new Set(list.map(a=>a.symbol))];
 const c=new AbortController(),tm=setTimeout(()=>c.abort(),timeout);
 try{
   const u=`/api/yahoo-batch?symbols=${encodeURIComponent(symbols.join(','))}&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
   const r=await fetch(u,{cache:'no-store',signal:c.signal});
   if(!r.ok)throw new Error(await r.text());
   const j=await r.json(),m=new Map();
   for(const x of (j?.items||[])){
     const bars=(x.bars||[]).map(b=>({time:Number(b.time),close:Number(b.close)})).filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close));
     m.set(String(x.symbol),{ok:!!x.ok,error:x.error||'',last:Number(x.last),changePct:Number(x.changePct),lastTime:Number(x.time),bars,source:x.source||j.source||'Yahoo Finance Spark'});
   }
   return m;
 }finally{clearTimeout(tm)}
}

function marketVisibleAssets(){
 if(marketBoardFilter==='Resumen')return MARKET_ASSETS.filter(a=>a.summary);
 if(marketBoardFilter==='Todos')return MARKET_ASSETS;
 return MARKET_ASSETS.filter(a=>a.group===marketBoardFilter);
}


function marketEntryValid(entry){
 return !!entry && !entry.error && Number.isFinite(Number(entry.last));
}
function commitMarketEntry(asset,entry,reason=''){
 if(!asset||!entry||!Number.isFinite(Number(entry.last)))return null;
 const old=marketBoardData.get(asset.id);
 const next={
   ...(marketEntryValid(old)?old:{}),
   ...entry,
   error:null,
   loadedAt:Date.now(),
   loadedReason:reason||entry.loadedReason||''
 };
 marketBoardData.set(asset.id,next);
 finishMarketLoading(asset.id);
 saveMarketCache();
 return next;
}
function commitMarketError(asset,error){
 if(!asset)return null;
 const old=marketBoardData.get(asset.id);
 // REGLA: un error posterior nunca borra un dato válido ya obtenido.
 if(marketEntryValid(old)){
   finishMarketLoading(asset.id);
   return old;
 }
 const next={error:String(error?.message||error||'Dato no disponible'),failedAt:Date.now()};
 marketBoardData.set(asset.id,next);
 finishMarketLoading(asset.id);
 return next;
}
function commitMarketBars(asset,bars,source='Yahoo Finance',tf='1d'){
 if(!asset||!Array.isArray(bars)||!bars.length)return null;
 const last=bars.at(-1),prev=bars.length>1?bars.at(-2):null;
 const value=Number(last.close);
 if(!Number.isFinite(value))return null;
 const pct=prev&&Number(prev.close)!==0?(value/Number(prev.close)-1)*100:NaN;
 const trend=(bars.length>=20)?marketTrend(asset,bars):snapshotDirection({changePct:pct});
 return commitMarketEntry(asset,{
   bars,
   last:value,
   changePct:pct,
   lastTime:Number(last.time),
   trend,
   source
 },`bars:${tf}`);
}

function marketCardHtml(asset,entry){
 const loading=marketCardLoads.has(asset.id);
 if(marketEntryValid(entry)){
   const ch=Number(entry.changePct),ck=!Number.isFinite(ch)||Math.abs(ch)<0.005?'flat':ch>0?'up':'down',arrow=ck==='up'?'▲':ck==='down'?'▼':'→',tr=entry.trend||snapshotDirection(entry);
   return `<div class="market-card" data-market-id="${asset.id}">
     <div class="market-card-group">${asset.group}</div><div class="market-card-name">${asset.name}</div><div class="market-card-symbol">${asset.symbol}</div>
     <div class="market-card-value">${marketFmt(asset,entry.last)} <span class="market-card-unit">${asset.unit}</span></div>
     <div class="market-card-change ${ck}">${arrow} ${Number.isFinite(ch)?(ch>=0?'+':'')+ch.toFixed(2)+'%':'—'}</div>
     <div class="market-card-trend">Lectura: <b class="${tr.key}">${tr.label}</b></div>
     <div class="market-card-foot">${escapeHtml(marketSourceLabel(asset,entry))} · ${entry.lastTime?fmtDateTimeUnix(entry.lastTime):'—'}${marketBadge(entry)}${loading?' · actualizando…':''}</div></div>`;
 }
 if(entry?.error)return `<div class="market-card" data-market-id="${asset.id}"><div class="market-card-group">${asset.group}</div><div class="market-card-name">${asset.name}</div><div class="market-card-symbol">${asset.symbol}</div><div class="market-card-error">Dato momentáneamente no disponible.<br><b>Hacé clic para abrir el gráfico y reintentar.</b></div></div>`;
 return `<div class="market-card" data-market-id="${asset.id}">
   <div class="market-card-group">${asset.group}</div><div class="market-card-name">${asset.name}</div><div class="market-card-symbol">${asset.symbol}</div>
   <div class="market-card-loading">${loading?'<span class="dash-mini-spinner"></span>Cargando cotización…':'Pendiente de actualización. Hacé clic para consultar.'}</div>
 </div>`;
}

function syncMarketFilterButtons(){
 document.querySelectorAll('.market-filter').forEach(b=>b.classList.toggle('active',(b.dataset.marketFilter||'Resumen')===marketBoardFilter));
}
function updateMarketBoardStatus(prefix=''){
 const assets=marketVisibleAssets();
 const ok=assets.filter(a=>marketEntryValid(marketBoardData.get(a.id))).length;
 const errors=assets.filter(a=>!marketEntryValid(marketBoardData.get(a.id))&&marketBoardData.get(a.id)?.error).length;
 const loading=assets.filter(a=>marketCardLoads.has(a.id)).length;
 const pending=Math.max(0,assets.length-ok-errors-loading);
 const bits=[`${ok}/${assets.length} con datos`];
 if(loading)bits.push(`${loading} cargando`);
 if(errors)bits.push(`${errors} sin dato`);
 if(pending)bits.push(`${pending} pendientes`);
 $('marketBoardStatus').textContent=(prefix?prefix+' · ':'')+`${marketBoardFilter} · `+bits.join(' · ');
}
async function loadOneMarketCard(asset,force=false){
 if(!asset)return null;
 const existing=marketBoardData.get(asset.id);
 if(!force&&marketEntryValid(existing))return existing;
 markMarketLoading(asset.id);
 renderMarketBoard();
 try{
   if(asset.sourceType==='byma-merval-usd'){
     const q=await fetchMervalUsdOfficialQuote(force);
     if(!q||!dashValid(q.value))throw new Error('SPMERVDT no disponible');
     const entry=commitMarketEntry(asset,{
       bars:[],
       last:dashNum(q.value),
       changePct:dashValid(q.changePct)?dashNum(q.changePct):NaN,
       lastTime:Math.floor(Date.now()/1000),
       trend:snapshotDirection({changePct:dashNum(q.changePct)}),
       source:q.source||'BYMA'
     },'tarjeta');
     renderMarketBoard();updateMarketBoardStatus();return entry;
   }
   const bars=await fetchMarketAssetBars(asset,'1d','1y',60000,force);
   const entry=commitMarketBars(asset,bars,asset.sourceLabel||'Yahoo Finance · tarjeta','1d');
   renderMarketBoard();updateMarketBoardStatus();return entry;
 }catch(e){
   const entry=commitMarketError(asset,e);
   renderMarketBoard();updateMarketBoardStatus();return entry;
 }
}

function renderMarketBoard(){
 const g=$('marketCardGrid');if(!g)return;
 syncMarketFilterButtons();
 const assets=marketVisibleAssets();
 g.innerHTML=assets.map(a=>marketCardHtml(a,marketBoardData.get(a.id))).join('');
 g.querySelectorAll('.market-card').forEach(c=>c.addEventListener('click',()=>openMarketAsset(c.dataset.marketId,selectedMarketTf)));
}
async function loadMarketBoard(force=false){
 if(marketBoardLoading)return;
 const assets=marketVisibleAssets();
 const targets=force?assets:assets.filter(a=>!marketEntryValid(marketBoardData.get(a.id)));

 if(!targets.length){
   renderMarketBoard();
   updateMarketBoardStatus('Cache');
   return;
 }

 marketBoardLoading=true;
 stabilityState.marketBoardStarted=Date.now();
 targets.forEach(a=>markMarketLoading(a.id));
 $('marketBoardStatus').textContent=`Cargando ${marketBoardFilter}: ${targets.length} mercados…`;
 renderMarketBoard();

 await marketMapLimit(targets,6,async asset=>{
   try{
     if(asset.sourceType==='byma-merval-usd'){
       const q=await fetchMervalUsdOfficialQuote(force);
       if(!q||!dashValid(q.value))throw new Error('SPMERVDT no disponible');
       commitMarketEntry(asset,{
         bars:[],
         last:dashNum(q.value),
         changePct:dashValid(q.changePct)?dashNum(q.changePct):NaN,
         lastTime:Math.floor(Date.now()/1000),
         trend:snapshotDirection({changePct:dashNum(q.changePct)}),
         source:q.source||'BYMA'
       },'precarga');
     }else{
       const bars=await fetchMarketAssetBars(asset,'1d','1y',60000,force);
       commitMarketBars(asset,bars,asset.sourceLabel||'Yahoo Finance · precarga','1d');
     }
   }catch(e){
     console.warn('market',asset.symbol,e);
     commitMarketError(asset,e);
   }finally{
     finishMarketLoading(asset.id);
   }
   renderMarketBoard();
   updateMarketBoardStatus('Cargando');
 });

 marketBoardLoading=false;
 stabilityState.marketBoardStarted=0;
 marketCardLoads.clear();stabilityState.marketStarted.clear();
 renderMarketBoard();
 saveMarketCache();
 updateMarketBoardStatus('Actualizado');
}
function marketEmaData(bars,period){
 const vals=bars.map(x=>Number(x.close)),ema=emaArray(vals,period);
 return bars.map((x,i)=>({time:x.time,value:ema[i]})).filter(x=>Number.isFinite(x.value));
}
function marketTrendRead(asset,bars){
 const tr=marketTrend(asset,bars),last=bars.at(-1),prev=bars.length>1?bars.at(-2):null,pct=prev&&prev.close?(last.close/prev.close-1)*100:NaN,e20=marketEmaLast(bars,20),e50=marketEmaLast(bars,50);
 return `Tendencia ${tr.label}. Último ${marketFmt(asset,last.close)} ${asset.unit}${Number.isFinite(pct)?` · ${pct>=0?'+':''}${pct.toFixed(2)}%`:''}. EMA20 ${marketFmt(asset,e20)} · EMA50 ${marketFmt(asset,e50)}.`;
}
async function openMarketAsset(id,tf='1d'){
 const asset=MARKET_ASSETS.find(x=>x.id===id);if(!asset)return;
 if(asset.intraday===false&&['15m','1h'].includes(tf))tf='1d';

 selectedMarketAsset=asset;selectedMarketTf=tf;
 $('marketDetail').classList.add('active');
 $('marketDetailTitle').textContent=asset.name;
 $('marketDetailMeta').textContent=`${asset.symbol} · ${asset.group} · ${asset.unit} · ${asset.sourceLabel||'Yahoo Finance'}`;
 if(asset.sourceType==='treasury-official-yield')$('marketChartRead').textContent='Rendimiento oficial diario del U.S. Treasury. No se inventan velas OHLC ni datos intradiarios.';
 if(asset.sourceType==='fred-yield')$('marketChartRead').textContent='Rendimiento oficial diario FRED. No se inventan velas OHLC ni datos intradiarios.';

 const lineOnly=!!asset.lineOnly;
 if($('marketLegendUp'))$('marketLegendUp').style.display=lineOnly?'none':'inline-flex';
 if($('marketLegendDown'))$('marketLegendDown').style.display=lineOnly?'none':'inline-flex';
 if($('marketLegendMain'))$('marketLegendMain').style.display=lineOnly?'inline-flex':'none';
 if($('marketLegendVolume'))$('marketLegendVolume').style.display=lineOnly?'none':'inline-flex';

 document.querySelectorAll('.market-tf').forEach(b=>{
   const disabled=asset.intraday===false&&['15m','1h'].includes(b.dataset.marketTf);
   b.disabled=disabled;
   b.title=disabled?'No hay intradiario oficial/gratuito confiable para este instrumento':'';
   b.classList.toggle('active',b.dataset.marketTf===tf);
 });
 $('marketCandleChart').innerHTML='<div class="market-chart-loading"><span class="dash-mini-spinner"></span>Cargando mercado…</div>';
 $('marketChartRead').textContent='Consultando datos…';

 try{
   const cfg=MARKET_TF[tf]||MARKET_TF['1d'];
   const bars=await fetchMarketAssetBars(asset,cfg.interval,cfg.range,10000);

   if(lineOnly)renderMarketLineChart(asset,bars,cfg);
   else renderMarketCandleChart(asset,bars,cfg);

   const last=bars.at(-1),prev=bars.length>1?bars.at(-2):null;
   let p=prev&&prev.close?(last.close/prev.close-1)*100:NaN;
   let value=last.close;

   // FUENTE DE VERDAD ÚNICA:
   // si el gráfico consiguió barras válidas, la tarjeta adopta ese dato inmediatamente.
   commitMarketBars(asset,bars,asset.sourceLabel||'Yahoo Finance · gráfico',tf);
   renderMarketBoard();
   updateMarketBoardStatus('Dato confirmado por gráfico');

   if(asset.sourceType==='byma-merval-usd'){
     const q=await fetchMervalUsdOfficialQuote(false);
     if(q&&dashValid(q.value)){value=dashNum(q.value);if(dashValid(q.changePct))p=dashNum(q.changePct)}
   }

   if(asset.sourceType==='byma-merval-usd'){
     const old=marketBoardData.get(asset.id)||{};
     commitMarketEntry(asset,{...old,last:Number(value),changePct:Number(p),lastTime:Number(last.time),source:'BYMA / SPMERVDT'},'gráfico BYMA');
     renderMarketBoard();updateMarketBoardStatus('Dato confirmado por gráfico');
   }

   $('marketDetailPrice').textContent=`${marketFmt(asset,value)} ${asset.unit}${Number.isFinite(p)?` · ${p>=0?'▲ +':'▼ '}${p.toFixed(2)}%`:''}`;
 }catch(e){
   if(marketChart){marketChart.remove();marketChart=null}
   $('marketCandleChart').innerHTML=`<div class="market-empty">No se pudieron obtener datos para ${escapeHtml(asset.name)} en ${escapeHtml(MARKET_TF[tf]?.label||tf)}.<br><span class="market-empty-detail">${escapeHtml(String(e.message||e))}</span></div>`;
   $('marketChartRead').textContent='Sin datos suficientes. Radar no inventa OHLC.';
 }
 setTimeout(()=>$('marketDetail').scrollIntoView({behavior:'smooth',block:'nearest'}),30);
}

function renderMarketLineChart(asset,bars,cfg){
 const el=$('marketCandleChart');el.innerHTML='';
 if(marketChart){marketChart.remove();marketChart=null}

 marketChart=LightweightCharts.createChart(el,{
   width:Math.max(320,el.clientWidth),height:430,
   layout:{background:{color:'#06121d'},textColor:'#9fb5c5'},
   grid:{vertLines:{color:'#10283a'},horzLines:{color:'#10283a'}},
   rightPriceScale:{borderColor:'#2f688e'},
   timeScale:{borderColor:'#2f688e',timeVisible:false},
   crosshair:{mode:0}
 });

 const pts=bars.map(x=>({time:x.time,value:Number(x.close)})).filter(x=>Number.isFinite(x.value));
 const main=addSeries(marketChart,'LineSeries',{
   color:'#9fb5c5',lineWidth:3,priceLineVisible:true,lastValueVisible:true
 });
 main.setData(pts);

 marketEma20Series=addSeries(marketChart,'LineSeries',{
   color:'#9d78ff',lineWidth:2,priceLineVisible:false,lastValueVisible:false,lineStyle:0
 });
 marketEma50Series=addSeries(marketChart,'LineSeries',{
   color:'#a0ca92',lineWidth:2,priceLineVisible:false,lastValueVisible:false,lineStyle:2
 });
 marketEma20Series.setData(marketEmaData(bars,20));
 marketEma50Series.setData(marketEmaData(bars,50));
 marketChart.timeScale().fitContent();

 const tr=marketTrend(asset,bars);
 $('marketChartRead').innerHTML=`<b>${tr.label}</b> · Serie histórica orientativa calculada como Merval ARS / MEP diario; el valor actual se prioriza desde BYMA (SPMERVDT). No se dibujan velas porque BYMA no publica OHLC histórico gratuito del índice.`;
}

function renderMarketCandleChart(asset,bars,cfg){
 const el=$('marketCandleChart');el.innerHTML='';if(marketChart){marketChart.remove();marketChart=null}
 marketChart=LightweightCharts.createChart(el,{width:Math.max(320,el.clientWidth),height:430,layout:{background:{color:'#06121d'},textColor:'#9fb5c5'},grid:{vertLines:{color:'#10283a'},horzLines:{color:'#10283a'}},rightPriceScale:{borderColor:'#284252',scaleMargins:{top:0.08,bottom:0.27}},timeScale:{borderColor:'#2f688e',timeVisible:cfg.interval!=='1d'&&cfg.interval!=='1wk',secondsVisible:false},crosshair:{mode:0}});
 marketCandleSeries=addSeries(marketChart,'CandlestickSeries',{upColor:'#26a69a',downColor:'#ef5350',borderUpColor:'#26a69a',borderDownColor:'#ef5350',wickUpColor:'#26a69a',wickDownColor:'#ef5350',priceLineVisible:true,lastValueVisible:true});
 marketCandleSeries.setData(bars.map(x=>({time:x.time,open:x.open,high:x.high,low:x.low,close:x.close})));
 marketEma20Series=addSeries(marketChart,'LineSeries',{color:'#9d78ff',lineWidth:2,priceLineVisible:false,lastValueVisible:false,lineStyle:0});
 marketEma50Series=addSeries(marketChart,'LineSeries',{color:'#a0ca92',lineWidth:2,priceLineVisible:false,lastValueVisible:false,lineStyle:2});
 marketEma20Series.setData(marketEmaData(bars,20));marketEma50Series.setData(marketEmaData(bars,50));
 marketVolumeSeries=addSeries(marketChart,'HistogramSeries',{priceFormat:{type:'volume'},priceScaleId:'',priceLineVisible:false,lastValueVisible:false});
 marketVolumeSeries.priceScale().applyOptions({scaleMargins:{top:0.80,bottom:0}});
 marketVolumeSeries.setData(bars.map(x=>({time:x.time,value:x.volume||0,color:x.close>=x.open?'rgba(38,166,154,.48)':'rgba(239,83,80,.48)'})));
 marketChart.timeScale().fitContent();$('marketChartRead').textContent=marketTrendRead(asset,bars)+' Velas OHLC reales; volumen según disponibilidad de la fuente.';
}

;

/* ===== RUNTIME BLOCK 18 ===== */
// Radar Técnico G2 — Phase 10D / v4.35.0
// Scanner and market-universe runtime extracted from the legacy inline compatibility bridge.
// Ownership only: no financial/scoring semantics changed in this phase.

async function fetchJsonOrThrow(url,label){
 const r=await fetch(url);
 if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||`${label} ${r.status}`)}
 return await r.json();
}
async function fetchCedearUniverse(liquidOnly=false){
 const j=await fetchJsonOrThrow(`/api/byma/cedears?liquid=${liquidOnly?1:0}`,'BYMA CEDEAR');
 if(!Array.isArray(j?.items)||!j.items.length)throw new Error('BYMA no devolvió una lista de CEDEAR.');
 return j;
}
async function fetchCryptoTop100(){
 const j=await fetchJsonOrThrow('/api/binance/universe?top=100','Binance');
 if(!Array.isArray(j?.items)||!j.items.length)throw new Error('Binance no devolvió el Top 100 Spot USDT.');
 return j;
}
async function fetchArgentinaUniverse(mode='all'){
 const j=await fetchJsonOrThrow(`/api/byma/equities?mode=${encodeURIComponent(mode)}`,'BYMA acciones');
 if(!Array.isArray(j?.items)||!j.items.length)throw new Error('BYMA no devolvió acciones locales.');
 return j;
}
const ARGENTINA_ADRS=[
 {symbol:'BBAR',name:'BBVA Argentina'},
 {symbol:'BMA',name:'Banco Macro'},
 {symbol:'CEPU',name:'Central Puerto'},
 {symbol:'CRESY',name:'Cresud'},
 {symbol:'EDN',name:'Edenor'},
 {symbol:'GGAL',name:'Grupo Financiero Galicia'},
 {symbol:'IRS',name:'IRSA'},
 {symbol:'LOMA',name:'Loma Negra'},
 {symbol:'PAM',name:'Pampa Energía'},
 {symbol:'SUPV',name:'Grupo Supervielle'},
 {symbol:'TEO',name:'Telecom Argentina'},
 {symbol:'TGS',name:'Transportadora de Gas del Sur'},
 {symbol:'VIST',name:'Vista Energy'},
 {symbol:'YPF',name:'YPF'}
];



async function fetchFixedIncomeAnalytics(){
 const [analyticsResult,ratesResult]=await Promise.allSettled([
  fetch('/api/fixed-income/analytics'),
  fetch('/api/local-rates')
 ]);
 if(analyticsResult.status!=='fulfilled')throw analyticsResult.reason;
 const r=analyticsResult.value;
 if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||('Analítica RF '+r.status))}
 const payload=await r.json();
 if(ratesResult.status==='fulfilled'&&ratesResult.value.ok){try{payload.localRates=await ratesResult.value.json()}catch{payload.localRates=null}}
 else payload.localRates=null;
 return payload;
}
function rfTickerCandidates(symbol){
 const s=String(symbol||'').toUpperCase().replace('.BA','');
 const out=[s];
 if(/[DC]$/.test(s)&&s.length>=5)out.push(s.slice(0,-1));
 return [...new Set(out)];
}
function median(values){
 const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
 if(!a.length)return NaN;
 const m=Math.floor(a.length/2);
 return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function percentileRank(v,arr){
 const a=arr.filter(Number.isFinite).sort((x,y)=>x-y);
 if(!Number.isFinite(v)||!a.length)return NaN;
 let below=0;
 for(const x of a)if(x<=v)below++;
 return Math.round((below/a.length)*100);
}
function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v))}
function rfNum(v){
 if(v===null||v===undefined)return NaN;
 if(typeof v==='string'){
   const s=v.trim();
   if(!s||s==='—'||s.toLowerCase()==='null'||s.toLowerCase()==='nan')return NaN;
 }
 const n=Number(v);
 return Number.isFinite(n)?n:NaN;
}
function rfMarketPrice(item,rf){
 const vals=[
   rfNum(item?.panel?.trade),
   rfNum(item?.panel?.closingPrice),
   rfNum(rf?.precio)
 ];
 return vals.find(x=>Number.isFinite(x)&&x>0)??NaN;
}
function rfDays(item,rf,letter){
 let d=rfNum(item?.panel?.daysToMaturity);
 if(Number.isFinite(d)&&d>0)return d;
 const raw=letter?.fechaVencimiento||rf?.vencimiento||item?.panel?.maturityDate;
 return daysUntilBondDate(raw);
}
function classifyFixedIncome(item,rf,letter){
 const s=String(item?.symbol||'').toUpperCase();
 const t=String(rf?.tipo||item?.panel?.category||'').toLowerCase();
 const ccy=String(rf?.moneda||item?.panel?.denominationCcy||'').toUpperCase();

 if(item?.type==='on'||/obligaci|corporativ|\bon\b/.test(t))return'ON';
 if(/dual/.test(t)||/^TT[SD]/.test(s))return'DUAL';
 if(/cer|uva|boncer/.test(t)||/^T?ZX/.test(s)||/^X\d/.test(s)||/^TX\d/.test(s))return'CER';
 if(/dollar|dólar|linked|lel?ink/.test(t)||/^D[A-Z0-9]/.test(s))return'DL';
 if(letter||/lecap|boncap|capitalizable|tasa fija/.test(t)||/^[ST]\d/.test(s))return'FIJA';
 if((/global|bonar|soberan|bopreal/.test(t)||ccy.includes('USD'))&&item?.type!=='on')return'SOBERANO_USD';
 return item?.type==='on'?'ON':'OTRO';
}
function rfClassLabel(c){
 return({
   SOBERANO_USD:'Soberano USD',
   FIJA:'Tasa fija / LECAP-BONCAP',
   CER:'CER / inflación',
   DL:'Dollar-linked',
   DUAL:'Dual',
   ON:'ON corporativa',
   OTRO:'Otro'
 })[c]||c;
}
function rfYieldMetric(rf){
 if(!rf)return NaN;
 if(rf.rfClass==='FIJA'&&Number.isFinite(rf.teaMarket))return rf.teaMarket;
 if(rf.rfClass==='DUAL')return NaN;
 return Number.isFinite(rf.tir)?rf.tir:NaN;
}
function rfYieldLabel(rf){
 if(!rf)return'—';
 if(rf.rfClass==='FIJA')return Number.isFinite(rf.teaMarket)?'TEA mercado':'Rendimiento';
 if(rf.rfClass==='CER')return'TIR real';
 if(rf.rfClass==='DL')return'Yield DL';
 if(rf.rfClass==='SOBERANO_USD'||rf.rfClass==='ON')return'TIR';
 if(rf.rfClass==='DUAL')return'Payoff dual';
 return'TIR';
}

function rfLocalRateRow(rates,key){
 const row=rates?.[key],v=rfNum(row?.value);
 const name=key==='caucion'?'Caución BYMA':key==='tm20'?'TM20':key==='tamar'?'TAMAR':'BADLAR';
 return Number.isFinite(v)&&v>=0?{name,tna:v,date:row?.date||'',source:row?.source||(key==='caucion'?'BYMA':'BCRA')}:null;
}
function rfReferenceRateFor(rf,ctx){
 const contract=rfContractCurrency(rf),days=rfNum(rf?.days),y=rfYieldMetric(rf),rates=ctx?.localRates;
 const out={applicable:false,name:'N/D',tna:NaN,instrumentTnaEq:NaN,spreadPp:NaN,score:NaN,date:'',reason:''};
 const general=rfLocalRateRow(rates,'tamar')||rfLocalRateRow(rates,'caucion')||rfLocalRateRow(rates,'tm20')||rfLocalRateRow(rates,'badlar');
 if(general){out.name=general.name;out.tna=general.tna;out.date=general.date}
 if(rf?.rfClass!=='FIJA'){out.reason=rf?.rfClass==='CER'?'Tasa nominal visible como contexto, pero no se compara contra TIR real CER.':rf?.rfClass==='DL'||rf?.rfClass==='DUAL'?'Tasa nominal visible como contexto; la indexación cambia el benchmark relevante.':rf?.rfClass==='SOBERANO_USD'?'Tasa local visible como contexto; se valora contra curva USD y riesgo país.':rf?.rfClass==='ON'?'Tasa local visible como contexto; la TIR de ON exige riesgo crediticio y no se premia sólo por superar una tasa bancaria.':'Sin benchmark directo.';return out}
 if(contract!=='ARS'){out.reason='La tasa BCRA nominal ARS queda como contexto y no es comparable con la moneda contractual.';return out}
 if(!Number.isFinite(days)||days<=0||!Number.isFinite(y)){out.reason='Faltan vencimiento o rendimiento para comparar contra tasa.';return out}
 const order=days<=30?['caucion','tm20','tamar','badlar']:days<=60?['tm20','tamar','badlar','caucion']:['tamar','badlar','tm20','caucion'];
 let ref=null;for(const k of order){ref=rfLocalRateRow(rates,k);if(ref)break}
 if(!ref){out.reason='Tasa BCRA de referencia no disponible.';return out}
 out.name=ref.name;out.tna=ref.tna;out.date=ref.date;
 // Convierte la TEA/TIR anual efectiva del instrumento a TNA simple equivalente para el plazo restante.
 const period=Math.pow(1+y/100,days/365)-1;
 const eq=period*365/days*100;
 out.instrumentTnaEq=eq;out.spreadPp=eq-ref.tna;
 if(days<=365){out.applicable=true;out.score=clamp(50+out.spreadPp*3,15,90);out.reason=`${eq.toFixed(2)}% TNA eq. vs ${ref.name} ${ref.tna.toFixed(2)}% TNA.`}
 else out.reason=`${ref.name} ${ref.tna.toFixed(2)}% TNA como contexto de tasa corta; no ajusta el score a más de 1 año.`;
 return out;
}
function applyRfReferenceRates(items,ctx){
 for(const item of Array.isArray(items)?items:[]){const rf=item?.panel?.rf;if(rf)rf.rateReference=rfReferenceRateFor(rf,ctx)}
 return items;
}
function rfReferenceRateSummary(rates){
 const tamar=rfLocalRateRow(rates,'tamar'),caucion=rfLocalRateRow(rates,'caucion'),tm20=rfLocalRateRow(rates,'tm20'),badlar=rfLocalRateRow(rates,'badlar'),first=tamar||caucion||tm20||badlar;
 if(!first)return{value:'N/D',note:'Tasa local no disponible · no se inventa ni se neutraliza el score'};
 const secondary=[caucion,tm20,badlar].filter(x=>x&&x.name!==first.name).map(x=>`${x.name} ${x.tna.toFixed(2)}%`).join(' · ');
 return{value:`${first.name} ${first.tna.toFixed(2)}%`,note:`${secondary?secondary+' · ':''}TNA · ${first.date||'fecha N/D'} · BCRA/BYMA · sólo comparable cuando corresponde`};
}
function rfRateReferenceCell(rf){
 const r=rf?.rateReference;
 if(!r||!r.name||r.name==='N/D')return '<span class="rf-meta">N/D</span>';
 if(r.applicable&&Number.isFinite(r.spreadPp))return `<b>${r.spreadPp>=0?'+':''}${r.spreadPp.toFixed(2)} pp</b><div class="rf-meta">vs ${r.name} ${Number(r.tna).toFixed(2)}% TNA</div>`;
 return `<span class="rf-meta">${r.name} ${Number.isFinite(r.tna)?Number(r.tna).toFixed(2)+'% TNA':'N/D'}<br>contexto, no score</span>`;
}

function fxMid(q){
 if(!q)return NaN;
 const a=rfNum(q.compra),b=rfNum(q.venta);
 if(Number.isFinite(a)&&Number.isFinite(b)&&a>0&&b>0)return(a+b)/2;
 return Number.isFinite(b)&&b>0?b:Number.isFinite(a)&&a>0?a:NaN;
}
function fxDisplay(q){
 if(!q)return'NO DISP.';
 const a=rfNum(q.compra),b=rfNum(q.venta);
 if(!Number.isFinite(a)&&!Number.isFinite(b))return'NO DISP.';
 const f=n=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(n);
 return `${Number.isFinite(a)?f(a):'—'} / ${Number.isFinite(b)?f(b):'—'}`;
}
function rfQuoteCurrency(panel){
 const c=String(panel?.denominationCcy||'').toUpperCase();
 if(c==='USD')return{code:'USD',label:'USD · MEP'};
 if(c==='EXT')return{code:'EXT',label:'USD · CCL/Cable'};
 if(c==='ARS')return{code:'ARS',label:'ARS'};
 return{code:c||'—',label:c||'—'};
}
function rfContractCurrency(rf){
 // Normalize provider labels (e.g. "Pesos", "Dolar MEP") before using them as
 // contractual currency. A raw non-ISO label must not disable the ARS reference-rate comparator.
 const contract=normalizeContractCurrencyText(rf?.contract?.contractCurrency||'');
 if(contract)return contract;

 const c=normalizeContractCurrencyText(rf?.moneda||'');
 if(c)return c;

 if(rf?.rfClass==='SOBERANO_USD')return'USD';
 if(rf?.rfClass==='ON')return'—';
 if(['CER','FIJA','DL','DUAL'].includes(rf?.rfClass))return'ARS';
 return'—';
}

function normalizeContractCurrencyText(v){
 const s=cleanSourceText(v).toUpperCase();
 if(!s)return'';
 if(/D[ÓO]LAR|USD|U\$S/.test(s))return'USD';
 if(/PESO|ARS/.test(s))return'ARS';
 if(/EURO|EUR/.test(s))return'EUR';
 return s;
}
function bondPaymentFx(rf,ctx){
 if(rfContractCurrency(rf)!=='USD')return{rate:NaN,label:''};

 const loc=cleanSourceText(rf?.contract?.paymentLocation||'').toUpperCase();
 if(loc==='EXT'){
   const v=fxMid(ctx?.fx?.ccl);
   return{rate:v,label:'CCL'};
 }
 if(loc==='LOCAL'){
   const v=fxMid(ctx?.fx?.mep);
   return{rate:v,label:'MEP'};
 }
 return{rate:NaN,label:''};
}
function bondPriceInContractCurrency(rf,panel,ctx){
 const raw=bondCurrentPrice(rf,panel);
 if(!Number.isFinite(raw)||raw<=0)return NaN;

 const contract=rfContractCurrency(rf);
 const q=rfQuoteCurrency(panel);

 if(contract==='USD'){
   if(q.code==='USD'||q.code==='EXT')return raw;
   if(q.code==='ARS'){
     const ref=bondPaymentFx(rf,ctx);
     return Number.isFinite(ref.rate)&&ref.rate>0?raw/ref.rate:NaN;
   }
 }
 if(contract==='ARS'&&q.code==='ARS')return raw;
 return NaN;
}
function formatContractAmount(v,rf){
 if(!Number.isFinite(v))return'—';
 const f=new Intl.NumberFormat('es-AR',{maximumFractionDigits:2});
 const c=rfContractCurrency(rf);
 if(c==='USD')return`US$ ${f.format(v)}`;
 if(c==='ARS')return`$ ${f.format(v)}`;
 if(c==='EUR')return`€ ${f.format(v)}`;
 return f.format(v);
}

function rfPriceView(item,rf,ctx){
 const price=bondCurrentPrice(rf,item?.panel);
 if(!Number.isFinite(price))return{main:'—',sub:''};

 const q=rfQuoteCurrency(item?.panel);
 const fmt=n=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:4}).format(n);
 const contract=rfContractCurrency(rf);

 if(q.code==='ARS'){
   let sub='Cotización ARS';
   if(contract==='USD'){
     const ref=bondPaymentFx(rf,ctx);
     if(Number.isFinite(ref.rate)&&ref.rate>0){
       sub=`ARS por VN100 · ≈ US$ ${fmt(price/ref.rate)} al ${ref.label}`;
     }else{
       sub='ARS · contrato USD; falta FX contractual para equivalencia';
     }
   }
   return{main:`$ ${fmt(price)}`,sub};
 }

 if(q.code==='USD')return{main:`US$ ${fmt(price)}`,sub:'Liquidación USD local / MEP'};
 if(q.code==='EXT')return{main:`US$ ${fmt(price)}`,sub:'Liquidación USD exterior / Cable'};
 return{main:fmt(price),sub:q.label};
}
function parseFlowDateValue(v){
 return parseBondCalendarDate(v);
}
function prepareRemainingCashflows(rf){
 const raw=Array.isArray(rf?.flujos)?rf.flujos:[];
 const today=new Date();today.setHours(0,0,0,0);
 const all=raw.map(f=>normalizeBondFlow(f)).map(x=>({...x,_date:parseFlowDateValue(x.date)}));
 const future=all.filter(x=>!x._date||x._date>=today),past=all.filter(x=>x._date&&x._date<today);
 rf.futureFlows=future;rf.futureFlowCount=future.length;rf.pastFlowCount=past.length;
 rf.remainingCashflowSum=future.reduce((s,x)=>s+(Number.isFinite(x.total)?x.total:0),0);
 const dated=future.filter(x=>x._date).sort((a,b)=>a._date-b._date);
 rf.nextFlowDate=dated[0]?dated[0]._date:null;rf.lastFlowDate=dated.length?dated[dated.length-1]._date:null;
 const maturity=parseFlowDateValue(rf?.vencimiento);
 rf.cashflowMatchesMaturity=!!(rf.lastFlowDate&&maturity&&Math.abs(rf.lastFlowDate-maturity)<=15*86400000);
 rf.cashflowQuality=future.length>0?(rf.cashflowMatchesMaturity?100:75):25;
 return rf;
}

async function fetchArgenBond(symbol){
 const t=String(symbol||'').toUpperCase().replace('.BA','');
 const r=await fetch(`/api/argenbond/bond?ticker=${encodeURIComponent(t)}`);
 if(!r.ok)throw new Error(await r.text());
 return await r.json();
}
function applyArgenBondData(rf,data){
 if(!rf||!data)return false;

 const tir=rfNum(data.tir),par=rfNum(data.paridad),dur=rfNum(data.duration),rate=rfNum(data.couponRate);
 if(Number.isFinite(tir))rf.tir=tir;
 if(Number.isFinite(par)&&par>0)rf.paridad=par;
 if(Number.isFinite(dur)&&dur>0)rf.duration=dur;
 if(Number.isFinite(rate)&&rate>=0)rf.couponRate=rate;

 rf.argenBondValidated=true;
 rf.validationSource='argen.bond';
 rf.rating=cleanSourceText(data.rating);
 rf.ecoNextPayment=cleanSourceText(data.nextPayment)||rf.ecoNextPayment;

 rf.contract=rf.contract||{};

 const pay=cleanSourceText(data.paymentCurrency);
 if(pay){
   rf.contract.paymentCurrencyLabel=pay;
   if(/D[ÓO]LAR|USD|U\$S/i.test(pay))rf.contract.contractCurrency='USD';
   else if(/PESO|ARS/i.test(pay))rf.contract.contractCurrency='ARS';

   if(/CABLE|EXTERIOR/i.test(pay))rf.contract.paymentLocation='EXT';
   else if(/MEP|ARGENTINA|LOCAL/i.test(pay))rf.contract.paymentLocation='LOCAL';
 }

 if(cleanSourceText(data.issuer))rf.contract.issuer=cleanSourceText(data.issuer);
 if(cleanSourceText(data.law))rf.contract.law=cleanSourceText(data.law);
 if(cleanSourceText(data.frequency))rf.contract.frequencyLabel=cleanSourceText(data.frequency);
 if(cleanSourceText(data.couponType))rf.contract.couponType=cleanSourceText(data.couponType);
 if(cleanSourceText(data.amortization))rf.contract.amortization=cleanSourceText(data.amortization);
 if(Number.isFinite(rfNum(data.minDenomination)))rf.contract.minDenomination=rfNum(data.minDenomination);
 if(cleanSourceText(data.maturity)){
   if(!cleanSourceText(rf.vencimiento))rf.vencimiento=cleanSourceText(data.maturity);
   if(!Number.isFinite(rfNum(rf.days))||rfNum(rf.days)<=0)rf.days=daysUntilBondDate(data.maturity);
 }

 const flows=Array.isArray(data.flows)?data.flows:[];
 if(flows.length){
   rf.flujos=flows.map(x=>({
     fecha:x.date,
     capital:rfNum(x.capital),
     interes:rfNum(x.interest),
     total:rfNum(x.total),
     residual:rfNum(x.residual),
     source:'argen.bond'
   }));
   prepareRemainingCashflows(rf);
 }
 rf.scenario100=rfScenarioUpside(rf,100);
 rf.coreDataCount=[rfYieldMetric(rf),rf.paridad,rf.duration,rf.price].filter(Number.isFinite).length;
 return true;
}


async function fetchEcoBond(symbol){
 const t=String(symbol||'').toUpperCase().replace('.BA','').replace(/[DC]$/,'');
 const r=await fetch(`/api/eco/bond?ticker=${encodeURIComponent(t)}`);
 if(!r.ok)throw new Error(await r.text());
 return await r.json();
}
function applyEcoValidation(item,eco){
 const rf=item?.panel?.rf;if(!rf||!eco)return false;
 const oldTir=rfNum(rf.tir),oldPar=rfNum(rf.paridad),oldDur=rfNum(rf.duration);
 const et=rfNum(eco.tir),ep=rfNum(eco.paridad),ed=rfNum(eco.duration),diffs=[];
 if(Number.isFinite(oldTir)&&Number.isFinite(et)&&Math.abs(oldTir-et)>1)diffs.push(`TIR ${oldTir.toFixed(2)}→${et.toFixed(2)}`);
 if(Number.isFinite(oldPar)&&Number.isFinite(ep)&&Math.abs(oldPar-ep)>2)diffs.push(`paridad ${oldPar.toFixed(1)}→${ep.toFixed(1)}`);
 if(Number.isFinite(oldDur)&&Number.isFinite(ed)&&Math.abs(oldDur-ed)>0.25)diffs.push(`duration ${oldDur.toFixed(2)}→${ed.toFixed(2)}`);
 if(Number.isFinite(et))rf.tir=et;if(Number.isFinite(ep))rf.paridad=ep;if(Number.isFinite(ed))rf.duration=ed;
 rf.residual=rfNum(eco.residual);rf.technicalValue=rfNum(eco.technicalValue);rf.accruedInterest=rfNum(eco.accruedInterest);
 rf.ecoNextPayment=eco.nextPayment||null;rf.ecoValidated=true;rf.validationSource='Eco Valores';
 rf.dataConflict=diffs.length>0;rf.validationDiffs=diffs;
 rf.coreDataCount=[rfYieldMetric(rf),rf.paridad,rf.duration,rf.price].filter(Number.isFinite).length;
 return true;
}
function refreshRfRelativeMetrics(items){
 for(const item of items){
   const rf=item.panel?.rf;if(!rf)continue;
   delete rf.curveFair;delete rf.curveSpread;delete rf.curveScore;
 }
 const classes=[...new Set(items.map(x=>x.panel?.rf?.rfClass).filter(Boolean))];
 for(const cls of classes){
   const group=items.filter(x=>x.panel?.rf?.rfClass===cls);
   const ys=group.map(x=>rfYieldMetric(x.panel.rf)).filter(Number.isFinite);
   const liqs=group.map(x=>rfNum(x.panel?.volumeAmount)).filter(Number.isFinite);
   for(const item of group){
     item.panel.rf.yieldPct=percentileRank(rfYieldMetric(item.panel.rf),ys);
     item.panel.rf.liquidityPct=percentileRank(rfNum(item.panel?.volumeAmount),liqs);
   }
 }
 computeCurveMetrics(items);
}
async function validateTopRfCandidates(items,ctx){
 refreshRfRelativeMetrics(items);if(isRfCreditMode())return;
 const objective=$('rfObjective').value,horizon=$('rfHorizon').value;
 // Recovery-first policy: an instrument that exists/quotes in BYMA is never discarded merely
 // because a secondary analytics feed did not cover it. Recover incomplete rows first; only then
 // spend validation calls on already-complete leaders.
 const prelim=[...items].map(item=>{
   const score=fixedIncomeDedicatedScore(item,ctx,objective,horizon),liq=rfNum(item?.panel?.volumeAmount),check=rfCompleteness(item,ctx,objective,horizon),rf=item?.panel?.rf||{};
   const recoveryPriority=!check.complete||rf.analyticsPending?1:0;
   return{item,score,liq,check,recoveryPriority};
 }).sort((a,b)=>b.recoveryPriority-a.recoveryPriority||b.score-a.score||(Number.isFinite(b.liq)?b.liq:-1)-(Number.isFinite(a.liq)?a.liq:-1));
 const letters=$('rfUniverse')?.value==='rf_letters';
 const recoveryCap=letters?18:12,validationCap=letters?6:5;
 const recovery=prelim.filter(x=>x.item.type!=='on'&&x.recoveryPriority).slice(0,recoveryCap);
 const validation=prelim.filter(x=>x.item.type!=='on'&&!x.recoveryPriority).slice(0,validationCap);
 const targets=[...recovery,...validation];let done=0,recovered=0;
 for(const x of targets){
   if(rfScanState.stop)break;
   const rf=x.item?.panel?.rf;
   let enriched=false;
   try{enriched=applyArgenBondData(rf,await fetchArgenBond(x.item.symbol))||enriched}catch(e){}
   try{enriched=applyEcoValidation(x.item,await fetchEcoBond(x.item.symbol))||enriched}catch(e){if(rf&&!enriched){rf.ecoValidated=false;rf.validationSource='Sin segunda fuente'}}
   if(rf){rf.recoveryAttempted=true;if(enriched){rf.analyticsPending=false;rf.recoveredFromSecondary=true}else if(x.recoveryPriority){rf.recoveryFailed=true}}
   if(enriched&&x.recoveryPriority)recovered++;
   done++;
   if($('rfProgressText'))$('rfProgressText').textContent=`Enriqueciendo RF: ${done}/${targets.length} · ${x.item.symbol}${recovered?` · recuperados ${recovered}`:''}`;
 }
 refreshRfRelativeMetrics(items);
 if(ctx)ctx.recoveredFromSecondary=recovered;
}


function isRfOnUniverse(){
 return ['rf_on','rf_on_liquid'].includes($('rfUniverse')?.value);
}
function isRfCreditMode(){
 return $('rfObjective')?.value==='credit'||isRfOnUniverse();
}
function normalizeRfOnSelection(){
 const u=$('rfUniverse'),o=$('rfObjective');
 if(!u||!o)return;

 if(isRfOnUniverse()&&o.value!=='credit'){
   o.value='credit';
 }
 if(o.value==='credit'&&!isRfOnUniverse()){
   u.value='rf_on';
 }

 refreshRfSelectionSummary();
 updateRfCreditUi();
}
function onMarketSpreadPct(panel){
 const bid=rfNum(panel?.bidPrice),ask=rfNum(panel?.offerPrice);
 if(!Number.isFinite(bid)||bid<=0||!Number.isFinite(ask)||ask<=0||ask<bid)return NaN;
 const mid=(bid+ask)/2;return mid>0?((ask-bid)/mid)*100:NaN;
}
function onQuoteQuality(panel){
 const s=onMarketSpreadPct(panel);
 if(Number.isFinite(s)){if(s<=.5)return 100;if(s<=1)return 90;if(s<=2)return 75;if(s<=4)return 55;if(s<=7)return 35;return 15}
 const p=[rfNum(panel?.trade),rfNum(panel?.closingPrice)].find(v=>Number.isFinite(v)&&v>0);return Number.isFinite(p)?45:10;
}
function onMarketDataCompleteness(item,horizon){
 const rf=item?.panel?.rf||{},p=item?.panel||{},missing=[];
 const q=rfQuoteCurrency(p);

 const price=bondCurrentPrice(rf,p);
 const bid=rfNum(p.bidPrice),ask=rfNum(p.offerPrice);
 const hasQuote=(Number.isFinite(price)&&price>0)||
                (Number.isFinite(bid)&&bid>0)||
                (Number.isFinite(ask)&&ask>0);

 if(!hasQuote)missing.push('sin cotización');
 if(!q.code||q.code==='—')missing.push('moneda');

 // Vencimiento sólo es obligatorio si el usuario pidió un horizonte concreto.
 if(horizon!=='all'&&(!Number.isFinite(rf.days)||rf.days<=0)){
   missing.push('vencimiento');
 }

 return{complete:missing.length===0,missing:[...new Set(missing)]};
}
function onPreselectionScore(item,horizon){
 const rf=item?.panel?.rf||{},p=item?.panel||{};

 const liq=Number.isFinite(rf.liquidityPct)?rf.liquidityPct:25;
 const h=(Number.isFinite(rf.days)&&rf.days>0)?rfHorizonFit(rf.days,horizon):70;
 const quote=onQuoteQuality(p);

 const price=bondCurrentPrice(rf,p);
 const hasPrice=Number.isFinite(price)&&price>0?100:50;

 const amount=rfNum(p.volumeAmount),volume=rfNum(p.volume),trade=rfNum(p.trade);
 let activity=25;
 if(Number.isFinite(amount)&&amount>0)activity=100;
 else if(Number.isFinite(volume)&&volume>0)activity=80;
 else if(Number.isFinite(trade)&&trade>0)activity=55;

 const days=rfNum(rf.days);
 let tenor=65;
 if(Number.isFinite(days)&&days>0){
   if(days<=365)tenor=70;
   else if(days<=1095)tenor=85;
   else if(days<=1825)tenor=75;
   else tenor=60;
 }

 return Math.round(clamp(.30*liq+.22*quote+.16*h+.12*hasPrice+.12*activity+.08*tenor));
}
function onPreselectionStatus(score){if(score>=75)return{kind:'buy',label:'PRESELECCIÓN ON'};if(score>=60)return{kind:'near',label:'ON A REVISAR'};if(score>=45)return{kind:'wait',label:'LIQUIDEZ MEDIA'};return{kind:'sell',label:'BAJA PRIORIDAD'}}
function onMarketWhy(item){
 const rf=item?.panel?.rf||{},p=item?.panel||{},parts=[];
 const q=rfQuoteCurrency(p),spread=onMarketSpreadPct(p);
 const liq=Number.isFinite(rf.liquidityPct)?rf.liquidityPct:NaN;
 const amount=rfNum(p.volumeAmount);

 parts.push('Preselección ON de mercado; no es una evaluación crediticia final.');
 if(Number.isFinite(rf.price))parts.push(`Precio ${bondMoney(rf.price)} · ${q.label}.`);
 if(Number.isFinite(rf.days)&&rf.days>0)parts.push(`Vencimiento en ${Math.round(rf.days)} días.`);
 else parts.push('Vencimiento: se completa al abrir la ficha.');

 if(Number.isFinite(liq))parts.push(`Liquidez relativa ${liq}/100.`);
 if(Number.isFinite(amount)&&amount>0)parts.push(`Monto operado hoy ${bondMoney(amount)}.`);
 if(Number.isFinite(spread))parts.push(`Spread bid/ask ${spread.toFixed(2)}%.`);
 else parts.push('Spread bid/ask no disponible.');

 parts.push('Abrí la ficha para completar emisor, garantía, cupón, amortización, residual, ley e ISIN.');
 parts.push('TIR, paridad y duration sólo se muestran si existe una fuente o cálculo confiable.');
 return parts.join(' ');
}
function updateRfCreditUi(){
 const c=isRfCreditMode();

 if($('rfsAttractiveLabel'))$('rfsAttractiveLabel').textContent=c?'Preselección ON':'Atractivos';
 if($('rfsInterestingLabel'))$('rfsInterestingLabel').textContent=c?'ON a revisar':'Interesantes';
 if($('rfsBestLabel'))$('rfsBestLabel').textContent=c?'Mejor ON para analizar':'Mejor hallazgo válido';
 if($('rfYieldHead'))$('rfYieldHead').textContent=c?'TIR / yield':'Rendimiento';
 if($('rfCurveHead'))$('rfCurveHead').textContent=c?'Spread mercado':'Curva';

 if(c&&$('rfsObjective')){
   $('rfsObjective').textContent='Preselección corporativa / ON';
 }
}
function rfCompleteness(item,ctx,objective,horizon){
 const rf=item?.panel?.rf||{};
 if(objective==='credit'){if(rf.rfClass!=='ON')return{complete:false,missing:['no es ON']};return onMarketDataCompleteness(item,horizon)}
 const missing=[],q=rfQuoteCurrency(item?.panel),contract=rfContractCurrency(rf),y=rfYieldMetric(rf),isFija=rf.rfClass==='FIJA';
 if(!Number.isFinite(rf.price)||rf.price<=0)missing.push('precio');
 if(!Number.isFinite(rf.days)||rf.days<=0)missing.push('vencimiento');
 if(!q.code||q.code==='—')missing.push('moneda de liquidación');
 if(!contract||contract==='—')missing.push('moneda contractual');
 const hf=(rf.futureFlowCount||0)>0,hl=!!(rf.letter&&Number.isFinite(rf.vpv)&&rf.vpv>0);
 if(!hf&&!hl)missing.push('cashflows futuros');
 if(!Number.isFinite(y))missing.push(rf.rfClass==='CER'?'TIR real / rendimiento':'TIR / rendimiento');
 // En LECAP/BONCAP paridad y duration son información complementaria para carry/value.
 // No deben eliminar una letra que tiene precio, vencimiento, flujo/pago y rendimiento verificables.
 if(!isFija){
   if(!Number.isFinite(rf.paridad)||rf.paridad<=0)missing.push('paridad');
   if(!Number.isFinite(rf.duration)||rf.duration<=0)missing.push('duration');
 }
 if(objective==='value'){
   if(isFija){
     const hasRateComp=!!(rf?.rateReference?.applicable&&Number.isFinite(rf?.rateReference?.spreadPp));
     if(!Number.isFinite(rf.curveSpread)&&!hasRateComp)missing.push('comparador tasa/curva');
   }else if(!Number.isFinite(rf.curveSpread))missing.push('curva comparable');
 }
 if(objective==='compression'){
   if(!Number.isFinite(rf.curveSpread))missing.push('curva comparable');
   if(!Number.isFinite(rf.duration)||rf.duration<=0)missing.push('duration');
   if(rf.rfClass==='SOBERANO_USD'&&!Number.isFinite(rfNum(ctx?.countryRisk?.value)))missing.push('riesgo país');
 }
 // Objetivo/horizonte son suitability, no completitud de datos.
 if(objective==='fx'&&['SOBERANO_USD','DL'].includes(rf.rfClass)&&!Number.isFinite(fxMid(ctx?.fx?.mep))&&!Number.isFinite(fxMid(ctx?.fx?.ccl)))missing.push('dólar MEP/CCL');
 const u=[...new Set(missing)];return{complete:u.length===0,missing:u};
}
function rfValidationOkForBest(r){if(!r?.complete)return false;const rf=r.rf||{};if(isRfCreditMode()&&rf.rfClass==='ON')return true;if(rf.rfClass==='ON')return false;if(rf.rfClass==='FIJA'){const primaryVerified=rf.primaryAnalyticsSource==='CompararFondos'&&(rf.futureFlowCount||0)>0&&Number.isFinite(rfYieldMetric(rf));return !!(rf.letter||rf.argenBondValidated||primaryVerified)}return !!rf.ecoValidated}

function rfHorizonFit(days,h){
 if(h==='all'||!Number.isFinite(days))return 70;
 if(h==='short')return days<=365?100:days<=540?55:10;
 if(h==='medium')return days>365&&days<=1095?100:(days>180&&days<=1460?55:15);
 if(h==='long')return days>1095?100:days>730?60:15;
 return 70;
}
function rfObjectiveFit(cls,obj){
 if(obj==='value')return 70;
 const table={
   carry:{FIJA:100,ON:70,CER:55,DL:55,DUAL:50,SOBERANO_USD:45,OTRO:40},
   compression:{SOBERANO_USD:100,CER:75,DL:65,ON:55,FIJA:30,DUAL:45,OTRO:40},
   inflation:{CER:100,DUAL:80,FIJA:35,DL:30,SOBERANO_USD:25,ON:25,OTRO:30},
   fx:{DL:100,DUAL:90,SOBERANO_USD:85,ON:70,CER:25,FIJA:20,OTRO:35},
   credit:{ON:100,SOBERANO_USD:20,FIJA:10,CER:10,DL:10,DUAL:10,OTRO:20}
 };
 return table[obj]?.[cls]??50;
}
function rfParityScore(p){
 if(!Number.isFinite(p)||p<=0)return 50;
 if(p<40)return 30;
 if(p<55)return 55;
 if(p<75)return 85;
 if(p<90)return 78;
 if(p<=105)return 60;
 return 35;
}
function rfCountryRiskScore(ctx,cls){
 if(cls!=='SOBERANO_USD'||!ctx?.countryRisk)return 60;
 const d=rfNum(ctx.countryRisk.change30d);
 if(!Number.isFinite(d))return 60;
 if(d<=-150)return 95;
 if(d<=-75)return 82;
 if(d<0)return 68;
 if(d<50)return 52;
 if(d<100)return 35;
 return 18;
}
function rfModifiedDuration(rf){
 if(!rf||typeof rf!=='object')return NaN;
 const d=rfNum(rf?.duration),y=rfNum(rf?.tir);
 if(!Number.isFinite(d))return NaN;
 if(Number.isFinite(y))return d/(1+y/100);
 return d;
}
function rfScenarioUpside(rf,bps=100){
 const md=rfModifiedDuration(rf);
 if(!Number.isFinite(md))return NaN;
 return md*(bps/10000)*100;
}
function computeCurveMetrics(items){
 const groups=new Map();
 for(const item of items){
   const rf=item.panel?.rf;
   if(!rf)continue;
   const y=rfYieldMetric(rf);
   const x=Number.isFinite(rf.duration)?rf.duration:(Number.isFinite(rf.days)?rf.days/365:NaN);
   if(!Number.isFinite(y)||!Number.isFinite(x))continue;

   let key=rf.rfClass;
   if(rf.rfClass==='SOBERANO_USD'){
     const law=String(rf.tipo||'').toLowerCase().includes('global')?'NY':'AR';
     key+='|'+law;
   }
   // ONs have heterogeneous issuer credit: do NOT call relative yield "cheapness".
   if(rf.rfClass==='ON'||rf.rfClass==='DUAL')continue;

   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push({item,x,y});
 }
 for(const arr of groups.values()){
   for(const row of arr){
     const peers=arr
       .filter(z=>z!==row)
       .sort((a,b)=>Math.abs(a.x-row.x)-Math.abs(b.x-row.x))
       .slice(0,4);
     if(peers.length<2)continue;
     let sw=0,sy=0;
     for(const p of peers){
       const w=1/(0.05+Math.abs(p.x-row.x));
       sw+=w;sy+=p.y*w;
     }
     const fair=sy/sw;
     row.item.panel.rf.curveFair=fair;
     row.item.panel.rf.curveSpread=row.y-fair;
     row.item.panel.rf.curveScore=clamp(50+(row.y-fair)*15);
   }
 }
}
function fixedIncomeDedicatedScore(item,ctx,objective,horizon){
 const rf=item.panel?.rf||{},cls=rf.rfClass;
 const objFit=rfObjectiveFit(cls,objective),hFit=rfHorizonFit(rf.days,horizon);
 const liq=Number.isFinite(rf.liquidityPct)?rf.liquidityPct:45;
 const curve=Number.isFinite(rf.curveScore)?rf.curveScore:50;
 const parity=rfParityScore(rf.paridad),yieldPct=Number.isFinite(rf.yieldPct)?rf.yieldPct:50;
 const risk=rfCountryRiskScore(ctx,cls),cash=Number.isFinite(rf.cashflowQuality)?rf.cashflowQuality:40;
 let score=50;
 if(cls==='SOBERANO_USD')score=.22*curve+.13*parity+.17*liq+.15*risk+.10*hFit+.10*objFit+.13*cash;
 else if(cls==='FIJA'){
  const rate=rf?.rateReference?.applicable&&Number.isFinite(rf?.rateReference?.score)?rf.rateReference.score:NaN;
  score=Number.isFinite(rate)?(.24*curve+.18*liq+.10*hFit+.12*objFit+.16*cash+.20*rate):(.30*curve+.22*liq+.13*hFit+.15*objFit+.20*cash);
 }
 else if(cls==='CER')score=.25*curve+.18*liq+.14*parity+.12*yieldPct+.10*hFit+.11*objFit+.10*cash;
 else if(cls==='DL')score=.22*curve+.20*liq+.12*parity+.12*yieldPct+.12*hFit+.12*objFit+.10*cash;
 else if(cls==='DUAL'){score=.32*liq+.23*hFit+.25*objFit+.20*cash;score=Math.min(score,74)}
 else if(cls==='ON'){score=.22*yieldPct+.27*liq+.12*parity+.10*hFit+.14*objFit+.15*cash;score=Math.min(score,74)}
 else{score=.28*yieldPct+.25*liq+.17*hFit+.15*objFit+.15*cash;score=Math.min(score,70)}
 if((rf.futureFlowCount||0)===0&&!rf.letter)score=Math.min(score,64);
 if(Number.isFinite(rf.curveSpread)&&Math.abs(rf.curveSpread)>3&&!rf.ecoValidated)score=Math.min(score,64);
 // VALUE on tasa fija is relative value, not simply "yield above BCRA".
 // Require a material peer-curve discount before allowing a green score.
 if(cls==='FIJA'&&objective==='value'){
  if(!Number.isFinite(rf.curveSpread))score=Math.min(score,64);
  else if(rf.curveSpread<0)score=Math.min(score,59);
  else if(rf.curveSpread<=0.4)score=Math.min(score,69);
 }
 if(rf.dataConflict)score-=5;
 // Suitability caps: a wrong mandate/horizon cannot rank above an eligible comparable.
 if(objFit<50)score=Math.min(score,39);
 if(hFit<50)score=Math.min(score,44);
 return Math.round(clamp(score));
}
function rfStatus(score,rf,objective='value',horizon='all'){
 if(!rf||rf.coreDataCount<2)return{kind:'none',label:'DATOS INSUFICIENTES'};
 if((rf.futureFlowCount||0)===0&&!rf.letter)return{kind:'none',label:'FLUJOS NO VERIFICADOS'};
 if(rfObjectiveFit(rf.rfClass,objective)<50)return{kind:'wait',label:'NO APTO OBJETIVO'};
 if(rfHorizonFit(rf.days,horizon)<50)return{kind:'wait',label:'FUERA DE HORIZONTE'};
 if(Number.isFinite(rf.curveSpread)&&Math.abs(rf.curveSpread)>3&&!rf.ecoValidated)return{kind:'wait',label:'REVISAR DATO'};
 if(score>=75)return{kind:'buy',label:'ATRACTIVO RELATIVO'};
 if(score>=60)return{kind:'near',label:'INTERESANTE'};
 if(score>=45)return{kind:'wait',label:'NEUTRO'};
 return{kind:'sell',label:'POCO ATRACTIVO'};
}
function buildRfReadingDedicated(item,ctx,objective,horizon){
 const rf=item.panel?.rf||{},parts=[],y=rfYieldMetric(rf),qc=rfQuoteCurrency(item.panel),contract=rfContractCurrency(rf);
 if(Number.isFinite(y))parts.push(`${rfYieldLabel(rf)} ${y.toFixed(2)}%.`);
 const rr=rf.rateReference;if(rr?.applicable&&Number.isFinite(rr.spreadPp))parts.push(`Tasa de referencia: ${rr.name} ${rr.tna.toFixed(2)}% TNA; el instrumento equivale a ${rr.instrumentTnaEq.toFixed(2)}% TNA para su plazo (${rr.spreadPp>=0?'+':''}${rr.spreadPp.toFixed(2)} pp). Este factor pesa 20% del Score RF nominal de hasta 1 año.`);else if(rr?.reason)parts.push(`Tasa de referencia: ${rr.reason}`);
 if(rf.ecoValidated)parts.push(`Métricas contrastadas con Eco Valores${rf.dataConflict?' y corregidas por discrepancia':''}.`);
 parts.push(`Moneda contractual ${contract}; cotiza/liquida ${qc.label}.`);
 if(Number.isFinite(rf.curveSpread))parts.push(rf.curveSpread>0.4?`Rinde ${rf.curveSpread.toFixed(2)} pp por encima de pares comparables.`:rf.curveSpread<-0.4?`Rinde ${Math.abs(rf.curveSpread).toFixed(2)} pp menos que pares comparables.`:'En línea con su curva comparable.');
 if((rf.futureFlowCount||0)>0)parts.push(`Se consideran sólo ${rf.futureFlowCount} flujo(s) futuro(s); próximo ${rf.nextFlowDate?bondDate(rf.nextFlowDate):(rf.ecoNextPayment||'—')}.`);
 else if(rf.letter)parts.push('LECAP/BONCAP: se usa el VPV final oficial como pago pendiente.');
 else parts.push('No se pudo verificar el calendario futuro completo.');
 if(Number.isFinite(rf.residual))parts.push(`Residual vigente ${rf.residual.toFixed(2)}%: amortizaciones ya pagadas no se cuentan otra vez.`);
 if(rf.validationDiffs?.length)parts.push(`Control de fuentes: ${rf.validationDiffs.join(', ')}.`);
 if(rf.rfClass==='FIJA'&&Number.isFinite(rf.totalReturnToMaturity))parts.push(`Carry bruto a vencimiento ${rf.totalReturnToMaturity.toFixed(2)}% en ${Math.round(rf.days)} días.`);
 if(Number.isFinite(rf.paridad))parts.push(`Paridad ${rf.paridad.toFixed(1)}%.`);
 if(Number.isFinite(rf.duration))parts.push(`Duration ${rf.duration.toFixed(2)} años.`);
 if(Number.isFinite(rf.scenario100))parts.push(`Compresión de yield 100 pb ≈ +${rf.scenario100.toFixed(1)}% por duration.`);
 if(rf.rfClass==='SOBERANO_USD'&&ctx?.countryRisk){const cr=ctx.countryRisk,d=rfNum(cr.change30d);parts.push(`Riesgo país ${Math.round(cr.value)} pb${Number.isFinite(d)?` (${d>=0?'+':''}${Math.round(d)} pb 30d)`:''}.`)}
 if(rf.rfClass==='ON')parts.push('Crédito del emisor no evaluado: la TIR no equivale a seguridad.');
 if(rf.rfClass==='DUAL')parts.push('Payoff dual: no se fuerza una TIR única.');
 if(rfObjectiveFit(rf.rfClass,objective)<50)parts.push('Poco alineado con el objetivo seleccionado.');
 if(rfHorizonFit(rf.days,horizon)<50)parts.push('Vencimiento poco alineado con el horizonte elegido.');
 return parts.join(' ');
}
async function prepareFixedIncomeAnalytics(items){
 let payload;
 try{payload=await fetchFixedIncomeAnalytics()}
 catch(e){
   state.scan.rfContext={error:String(e.message||e),coverage:0,total:items.length};
   return;
 }
 const bonds=Array.isArray(payload.bonds)?payload.bonds:[];
 const letters=Array.isArray(payload.letters)?payload.letters:[];
 const bmap=new Map(),lmap=new Map();
 for(const b of bonds)bmap.set(String(b.ticker||'').toUpperCase(),b);
 for(const l of letters)lmap.set(String(l.ticker||'').toUpperCase(),l);

 const matched=[];
 for(const item of items){
   let b=null,l=null;
   for(const candidate of rfTickerCandidates(item.symbol)){
     if(!b&&bmap.has(candidate))b=bmap.get(candidate);
     if(!l&&lmap.has(candidate))l=lmap.get(candidate);
   }
   item.panel=item.panel||{};
   const rf=b?{...b}:{};
   rf.letter=l?{...l}:null;
   rf.tir=rfNum(rf.tir);
   rf.paridad=rfNum(rf.paridad);
   rf.duration=rfNum(rf.duration);
   rf.price=rfMarketPrice(item,rf);
   rf.days=rfDays(item,rf,l);
   rf.rfClass=classifyFixedIncome(item,rf,l);

   if(l&&Number.isFinite(rf.price)&&rf.price>0&&Number.isFinite(rf.days)&&rf.days>0){
     const vpv=rfNum(l.vpv);
     if(Number.isFinite(vpv)&&vpv>0){
       rf.vpv=vpv;
       rf.totalReturnToMaturity=(vpv/rf.price-1)*100;
       rf.temMarket=(Math.pow(vpv/rf.price,30/rf.days)-1)*100;
       rf.teaMarket=(Math.pow(vpv/rf.price,365/rf.days)-1)*100;
     }
   }
   rf.scenario100=rfScenarioUpside(rf,100);
   rf.scenario200=rfScenarioUpside(rf,200);
   rf.coreDataCount=[
     rfYieldMetric(rf),rf.paridad,rf.duration,rf.price
   ].filter(Number.isFinite).length;
   item.panel.rf=rf;
   if(rf.coreDataCount>0)matched.push(item);
 }

 const classes=[...new Set(items.map(x=>x.panel?.rf?.rfClass).filter(Boolean))];
 for(const cls of classes){
   const group=items.filter(x=>x.panel?.rf?.rfClass===cls);
   const yields=group.map(x=>rfYieldMetric(x.panel.rf)).filter(Number.isFinite);
   const liqs=group.map(x=>rfNum(x.panel?.volumeAmount)).filter(Number.isFinite);
   for(const item of group){
     const rf=item.panel.rf;
     rf.yieldPct=percentileRank(rfYieldMetric(rf),yields);
     rf.liquidityPct=percentileRank(rfNum(item.panel?.volumeAmount),liqs);
   }
 }
 computeCurveMetrics(items);

 state.scan.rfContext={
   source:payload.source,
   countryRisk:payload.countryRisk||null,
   localRates:payload.localRates||null,
   coverage:matched.length,
   total:items.length
 };
 applyRfReferenceRates(items,state.scan.rfContext);
}
function renderRfContext(){
 const ctx=state.scan.rfContext||{};
 const objective=$('scanRfObjective')?.value||'value';
 const horizon=$('scanRfHorizon')?.value||'all';
 const objLabel=$('scanRfObjective')?.selectedOptions?.[0]?.textContent||'Valor relativo';
 const horLabel=$('scanRfHorizon')?.selectedOptions?.[0]?.textContent||'Cualquier plazo';

 if(ctx.error){
   $('rfCountryRisk').textContent='—';
   $('rfCountryRiskTrend').textContent='No disponible';
   $('rfAnalyticsCoverage').textContent='0/'+(ctx.total||0);
   $('rfMedianTir').textContent=objLabel;
   $('rfMedianParity').textContent=horLabel;
   $('rfMacroLabel').textContent='DATOS PARCIALES';
   $('rfMacroWhy').textContent=ctx.error;
   return;
 }
 const cr=ctx.countryRisk;
 if(cr&&Number.isFinite(+cr.value)){
   $('rfCountryRisk').textContent=Math.round(cr.value)+' pb';
   const d=rfNum(cr.change30d);
   $('rfCountryRiskTrend').textContent=Number.isFinite(d)
     ? `${d>=0?'+':''}${Math.round(d)} pb en 30 días · ${cr.date||''}`
     : `Último dato ${cr.date||''}`;
   $('rfCountryRiskTrend').className=Number.isFinite(d)?(d>0?'rf-risk-up':d<0?'rf-risk-down':''):'';
 }else{
   $('rfCountryRisk').textContent='No disponible';
   $('rfCountryRiskTrend').textContent='No se inventa el dato.';
 }
 $('rfAnalyticsCoverage').textContent=`${ctx.coverage||0}/${ctx.total||0}`;
 $('rfMedianTir').textContent=objLabel;
 $('rfMedianParity').textContent=horLabel;
 $('rfMacroLabel').textContent=objective==='value'?'VALOR RELATIVO':
   objective==='carry'?'CARRY':
   objective==='compression'?'COMPRESIÓN':
   objective==='inflation'?'INFLACIÓN':
   objective==='fx'?'DÓLAR':'CRÉDITO';
 $('rfMacroWhy').textContent='El ranking cambia según objetivo, tipo de bono y plazo; no usa señales de acciones.';
}
function setScannerHeadersForMode(){
 const rf=isFixedIncomeUniverse($('scanUniverse')?.value);
 $('scannerView').classList.toggle('scan-fixed-income',rf);
 const set=(id,v)=>{if($(id))$(id).textContent=v};
 const filter=$('scanFilter');
 if(rf){
   set('scanThTech','Clase');
   set('scanThOpportunity','Score RF');
   set('scanThPrice','Paridad');
   set('scanThEntry','Rendimiento');
   set('scanThStop','Curva');
   set('scanThTp1','Duration');
   set('scanThTpPct','Escenario');
   set('scanThRR','Liquidez');
   set('scanThWhy','Por qué');
   $('scanLblBuy').textContent='Atractivos';
   $('scanLblNear').textContent='Interesantes';
   $('scanLblSell').textContent='Poco atractivos';
   $('scanLblWait').textContent='Neutros';
   $('scanLblNone').textContent='Sin datos';
   document.querySelector('.scan-legend').innerHTML=
     '<span><i class="g"></i> Atractivo relativo</span>'+
     '<span><i class="c"></i> Interesante</span>'+
     '<span><i class="a"></i> Neutro</span>'+
     '<span><i class="r"></i> Poco atractivo</span>'+
     '<span><i class="x"></i> Datos insuficientes</span>';
   if(filter){
     const label=(value,text)=>{const opt=filter.querySelector(`option[value="${value}"]`);if(opt)opt.text=text};
     label('all','Todos');
     label('buy','Sólo atractivos');
     label('actionable','Atractivos + interesantes');
     label('sell','Poco atractivos');
     label('watch','Sólo con métricas válidas');
   }
 }else{
   set('scanThTech','Score técnico');
   set('scanThOpportunity','Oportunidad');
   set('scanThPrice','Precio');
   set('scanThEntry','Entrada');
   set('scanThStop','Stop');
   set('scanThTp1','TP1');
   set('scanThTpPct','TP1 %');
   set('scanThRR','R:R');
   set('scanThWhy','Lectura / qué falta');
   $('scanLblBuy').textContent='Compra ahora';
   $('scanLblNear').textContent='Oportunidad cercana';
   $('scanLblSell').textContent='Ventas / Short';
   $('scanLblWait').textContent='Esperar';
   $('scanLblNone').textContent='Sin setup / error';
   document.querySelector('.scan-legend').innerHTML=
     '<span><i class="g"></i> Compra ahora</span>'+
     '<span><i class="c"></i> Oportunidad cerca</span>'+
     '<span><i class="a"></i> Esperar</span>'+
     '<span><i class="r"></i> Venta / salida</span>'+
     '<span><i class="x"></i> Sin setup</span>';
   if(filter){
     const label=(value,text)=>{const opt=filter.querySelector(`option[value="${value}"]`);if(opt)opt.text=text};
     label('all','Todos');
     label('buy','Compras + oportunidades cercanas');
     label('actionable','Compras + ventas');
     label('sell','Ventas / Short');
     label('watch','Oportunidades + esperar');
   }
 }
}
function scanFixedIncomeOne(item){
 const rf=item.panel?.rf||{};
 const objective=$('scanRfObjective')?.value||'value';
 const horizon=$('scanRfHorizon')?.value||'all';
 const rfScore=fixedIncomeDedicatedScore(item,state.scan.rfContext||{},objective,horizon);
 const status=rfStatus(rfScore,rf);
 const y=rfYieldMetric(rf);

 let curveText='—';
 if(Number.isFinite(rf.curveSpread)){
   curveText=rf.curveSpread>0.4?`+${rf.curveSpread.toFixed(2)} pp`:
             rf.curveSpread<-0.4?`${rf.curveSpread.toFixed(2)} pp`:'En curva';
 }
 let scenario='—';
 if(rf.rfClass==='FIJA'&&Number.isFinite(rf.totalReturnToMaturity)){
   scenario=`Carry ${rf.totalReturnToMaturity.toFixed(1)}%`;
 }else if(Number.isFinite(rf.scenario100)){
   scenario=`-100pb ≈ +${rf.scenario100.toFixed(1)}%`;
 }

 return{
   item:{symbol:item.symbol,type:item.type,panel:item.panel},
   rf,rfScore,status,
   key:'medium',
   tfLabel:rfClassLabel(rf.rfClass),
   macroTrend:Number.isFinite(rf.days)?`${Math.round(rf.days)} d`:'—',
   price:rf.price,
   curveText,scenario,
   why:buildRfReadingDedicated(item,state.scan.rfContext||{},objective,horizon)
 };
}

function isFixedIncomeUniverse(u){
 return ['rf_all','rf_sovereign','rf_letters','rf_public_liquid','rf_on','rf_on_liquid'].includes(u);
}
function updateScannerCurrencyVisibility(){
 const u=$('scanUniverse')?.value;
 const rf=isFixedIncomeUniverse(u);
 if($('scanCurrencyField'))$('scanCurrencyField').style.display=rf?'block':'none';
 if($('scanRfObjectiveField'))$('scanRfObjectiveField').style.display=rf?'block':'none';
 if($('scanRfHorizonField'))$('scanRfHorizonField').style.display=rf?'block':'none';
 if($('scanTfField'))$('scanTfField').style.display=rf?'none':'block';
 setScannerHeadersForMode();
}
async function fetchFixedIncomeUniverse(kind){
 const currency=$('scanCurrency')?.value||'ARS';
 const liquid=['rf_public_liquid','rf_on_liquid'].includes(kind);
 const map={
   rf_all:'all',
   rf_sovereign:'sovereign',
   rf_letters:'letters',
   rf_public_liquid:'public',
   rf_on:'on',
   rf_on_liquid:'on'
 };
 const k=map[kind]||'all';
 return await fetchJsonOrThrow(
   `/api/byma/fixed-income?kind=${encodeURIComponent(k)}&currency=${encodeURIComponent(currency)}&liquid=${liquid?1:0}`,
   'BYMA renta fija'
 );
}


function scannerCedearBlacklist(){
 const rows=(typeof state!=='undefined'&&Array.isArray(state?.config?.cedearBlacklist))?state.config.cedearBlacklist:[];
 return new Set(rows.filter(x=>!x?.until||Date.parse(x.until)>Date.now()).map(x=>String(x?.symbol||'').trim().toUpperCase()).filter(Boolean));
}
function scannerCedearLiquidity(row){
 for(const k of ['volumeAmount','tradeVolume','volume']){const n=Number(row?.[k]);if(Number.isFinite(n)&&n>0)return n}
 return 0;
}

const CEDEAR_US_TICKER_MAP={
  'B':'GOLD',
  'BA.C':'BAC',
  'BRKB':'BRK-B',
  'DISN':'DIS',
  'TRVV':'TRV',
  'UN':'NU',
  'NOKA':'NOK',
  'KOFM':'KOF',
  'AKO.B':'AKO-B'
};

function normalizeCedearUsCandidate(raw,allSymbols){
 const s=String(raw||'').trim().toUpperCase();
 if(!s)return null;

 // Excluir códigos de mercados no USA que son claramente locales
 // (por ejemplo WEGE3, ITUB3, PETR3, LREN3 de B3).
 if(/\d/.test(s))return null;

 // Variantes locales duplicadas (AAPLB, AMZNB, etc.) cuando existe
 // el ticker base en el mismo universo.
 if(s.endsWith('B') && s.length>2){
   const base=s.slice(0,-1);
   if(allSymbols.has(base))return null;
 }

 const mapped=CEDEAR_US_TICKER_MAP[s]||s.replace('.','-');
 if(!/^[A-Z][A-Z.-]{0,9}$/.test(mapped))return null;
 return mapped;
}

async function scannerUniverseItems(){
 const u=$('scanUniverse').value;

 if(u==='watchlist'){
   const items=(state.config.watchlist||[]).map(x=>({symbol:x.symbol,type:x.type}));
   $('scanUniverseInfo').innerHTML=`Universo: <span class="scan-no-limit">${items.length} activos de tu watchlist</span>.`;
   return items;
 }

 if(u==='crypto100'){
   $('scanUniverseInfo').textContent='Universo: descargando Top 100 Spot USDT por volumen de Binance…';
   const j=await fetchCryptoTop100();
   $('scanUniverseInfo').innerHTML=`Universo: <span class="scan-no-limit">${j.count} pares crypto</span> · ordenados por volumen 24h · fuente Binance.`;
   return j.items.map(x=>({symbol:x.symbol,type:'crypto',panel:x}));
 }

 if(u==='usa_cedear'){
   $('scanUniverseInfo').textContent='Universo: preparando tickers USA/ETF que tienen CEDEAR…';
   const j=await fetchCedearUniverse(false);
   const allSymbols=new Set(j.items.map(x=>String(x.symbol||'').trim().toUpperCase()).filter(Boolean));
   const blacklist=scannerCedearBlacklist(),seen=new Set(),items=[];
   const source=[...j.items].sort((a,b)=>scannerCedearLiquidity(b)-scannerCedearLiquidity(a)||String(a.symbol||'').localeCompare(String(b.symbol||'')));

   for(const x of source){
     const cedearSymbol=String(x.symbol||'').trim().toUpperCase();
     if(blacklist.has(cedearSymbol)||scannerCedearLiquidity(x)<=0)continue;
     const candidate=normalizeCedearUsCandidate(cedearSymbol,allSymbols);
     if(!candidate||seen.has(candidate))continue;
     seen.add(candidate);
     items.push({symbol:candidate,type:'stock',panel:{...x,source:'cedear-underlying',cedearSymbol,liquidityRank:items.length+1}});
   }

   $('scanUniverseInfo').innerHTML=
     `Universo operativo: <span class="scan-no-limit">${items.length} candidatos USA/ETF</span> derivados sólo de CEDEAR con volumen, ordenados por liquidez BYMA y respetando blacklist. `+
     `Los códigos no USA/no resolubles se omiten; un activo sin liquidez local no se propone como candidato.`;
   return items;
 }

 if(u==='cedear'||u==='cedear_liquid'){
   $('scanUniverseInfo').textContent='Universo: consultando CEDEAR disponibles en BYMA…';
   const j=await fetchCedearUniverse(u==='cedear_liquid');
   const mode=j.filterMode?` · modo ${j.filterMode}`:'';
   const raw=Number.isFinite(j.rawCount)?` · ${j.rawCount} registros recibidos`:'';
   const liquid=j.liquidOnly&&Number.isFinite(j.liquidCount)?` · ${j.liquidCount} con volumen`:'';
   $('scanUniverseInfo').innerHTML=`Universo: <span class="scan-no-limit">${j.count} CEDEAR únicos</span>${raw}${liquid}${mode} · fuente ${j.source||'Open BYMADATA'}.`;
   return j.items.map(x=>({symbol:x.symbol,type:'cedear',panel:x}));
 }

 if(u==='arg_leading'||u==='arg_general'||u==='arg_all'){
   const mode=u==='arg_leading'?'leading':u==='arg_general'?'general':'all';
   const label=mode==='leading'?'Líderes':mode==='general'?'Panel General':'Líderes + Panel General';
   $('scanUniverseInfo').textContent=`Universo: consultando ${label} en Open BYMADATA…`;
   const j=await fetchArgentinaUniverse(mode);
   $('scanUniverseInfo').innerHTML=`Universo: <span class="scan-no-limit">${j.count} acciones</span> · ${label} · fuente Open BYMADATA.`;
   return j.items.map(x=>({symbol:x.symbol,type:'argstock',panel:x}));
 }

 if(u==='arg_adrs'){
   $('scanUniverseInfo').innerHTML=`Universo: <span class="scan-no-limit">${ARGENTINA_ADRS.length} ADR/ADS argentinos</span> listados en mercados USA.`;
   return ARGENTINA_ADRS.map(x=>({symbol:x.symbol,type:'stock',panel:x}));
 }


 if(isFixedIncomeUniverse(u)){
   const labels={
     rf_all:'Bonos + Letras + ON',
     rf_sovereign:'Bonos soberanos',
     rf_letters:'LECAP / BONCAP / Letras',
     rf_public_liquid:'Bonos/Letras con volumen',
     rf_on:'ON BYMA',
     rf_on_liquid:'ON con volumen'
   };
   $('scanUniverseInfo').textContent=`Universo: consultando ${labels[u]} en Open BYMADATA…`;
   const j=await fetchFixedIncomeUniverse(u);
   $('scanUniverseInfo').innerHTML=
     `Universo: <span class="scan-no-limit">${j.count} instrumentos</span> · ${labels[u]} · ${j.currency||'Todas'} · `+
     `${Number.isFinite(j.publicCount)?j.publicCount+' títulos públicos · ':''}`+
     `${Number.isFinite(j.onCount)?j.onCount+' ON cargadas · ':''}`+
     `24 hs.`;
   return j.items.map(x=>({
     symbol:x.symbol,
     type:x.category==='ON'?'on':'argbond',
     panel:x
   }));
 }

 throw new Error('Universo no reconocido.');
}


function distanceToEntryPct(plan,price){
 if(!plan||!Number.isFinite(price)||price<=0||
    !Number.isFinite(plan.entryLow)||!Number.isFinite(plan.entryHigh))return NaN;

 if(price>=plan.entryLow&&price<=plan.entryHigh)return 0;

 const target=price<plan.entryLow?plan.entryLow:plan.entryHigh;
 return Math.abs(price-target)/price*100;
}

function scannerOpportunityScore(plan,a,macroTrend,marketContext=null){
 if(!plan||!a)return 0;
 let s=Number.isFinite(plan.score)?plan.score:0,dist=distanceToEntryPct(plan,a.c);
 if(Number.isFinite(plan.rr1)){if(plan.rr1>=2.5)s+=12;else if(plan.rr1>=2)s+=10;else if(plan.rr1>=1.5)s+=6;else if(plan.rr1>=1.35)s+=2;else if(plan.rr1<1.2)s-=18}
 if(Number.isFinite(dist)){if(dist===0)s+=14;else if(dist<=.5)s+=11;else if(dist<=1)s+=8;else if(dist<=2)s+=4;else if(dist<=3)s+=1;else if(dist>5)s-=12}
 const bt=String(a.breakType||'');if(bt==='CHoCH alcista')s+=10;else if(bt==='BOS alcista')s+=8;else if(bt==='CHoCH bajista')s-=10;else if(bt==='BOS bajista')s-=8;
 const ema=String(a.emaState||'').toLowerCase();if(ema.includes('alcista'))s+=6;else if(ema.includes('bajista'))s-=6;
 const macd=String(a.macdState||'').toLowerCase();if(macd.includes('alcista'))s+=5;else if(macd.includes('bajista'))s-=5;
 const st=String(a.structure||'').toLowerCase();if(st.includes('alcista'))s+=6;else if(st.includes('bajista'))s-=6;
 const mt=String(macroTrend||'').toLowerCase();if(mt.includes('alcista'))s+=8;else if(mt.includes('bajista'))s-=12;
 if(marketContext&&Number.isFinite(+marketContext.adjustment))s+=Math.max(-12,Math.min(10,+marketContext.adjustment));
 return Math.max(0,Math.min(100,Math.round(s)));
}

function scannerStatus(plan,a,macroTrend,marketContext=null){
 if(!plan||!a)return{kind:'none',label:'SIN SETUP',oppScore:0,dist:NaN};
 let oppScore=0,dist=NaN;try{oppScore=scannerOpportunityScore(plan,a,macroTrend,marketContext);dist=distanceToEntryPct(plan,a.c)}catch(e){oppScore=Number.isFinite(plan.score)?Math.max(0,Math.min(100,Math.round(plan.score))):0}
 if(plan.status==='OPERABLE'&&plan.direction==='LONG'&&Number(plan.rr1)>=1.5)return{kind:'buy',label:'COMPRA CONFIRMADA',oppScore,dist};
 if(plan.status==='OPERABLE'&&plan.direction==='SHORT')return{kind:'sell',label:'VENTA / SHORT',oppScore,dist};
 const structureOk=plan.direction==='LONG'?String(a.structure||'').toLowerCase()==='alcista':String(a.structure||'').toLowerCase()==='bajista';
 const fibOk=!a.fib||(plan.direction==='LONG'?a.fib.up===true:a.fib.up===false);
 if(plan.status==='ESPERAR CONFIRMACIÓN'&&(plan.score||0)>=75&&Number.isFinite(plan.rr1)&&plan.rr1>=1.5&&Number.isFinite(dist)&&dist<=1.25&&structureOk&&fibOk&&!String(macroTrend||'').toLowerCase().includes(plan.direction==='LONG'?'bajista':'alcista'))return{kind:'near',label:'ZONA CERCANA · NO ENTRAR',oppScore:Math.min(64,oppScore),dist};
 if(plan.status==='ESPERAR CONFIRMACIÓN')return{kind:'wait',label:'ESPERAR',oppScore,dist};
 return{kind:'none',label:'SIN SETUP',oppScore,dist};
}

function scannerWhy(plan,a,macroTrend,status,marketContext=null){
 if(!a)return'No se pudieron obtener datos técnicos suficientes.';if(!plan)return'No hay plan operativo calculable.';
 const parts=[];if(status?.kind==='near')parts.push('Zona técnicamente válida y cercana, pero falta trigger: NO ENTRAR todavía.');else if(plan.status==='OPERABLE'&&plan.direction==='LONG')parts.push('Setup LONG confirmado.');else if(plan.status==='OPERABLE'&&plan.direction==='SHORT')parts.push('Setup SHORT confirmado.');else if(plan.status==='ESPERAR CONFIRMACIÓN')parts.push(plan.action||'Falta confirmación.');else parts.push(plan.action||'Sin confluencia suficiente.');
 if(macroTrend&&macroTrend!=='—')parts.push(`Macro: ${macroTrend}.`);if(Number.isFinite(plan.rr1))parts.push(`R:R ${plan.rr1.toFixed(2)}.`);if(a.breakType&&a.breakType!=='Sin ruptura reciente')parts.push(a.breakType+'.');if(marketContext&&Number.isFinite(marketContext.adjustment))parts.push(`Contexto ${marketContext.adjustment>=0?'+':''}${marketContext.adjustment} pts: ${marketContext.reason}.`);return parts.join(' ');
}

async function fetchBymaScannerHistory(symbol,key){
 const r=await fetch(`/api/byma/scan-history?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(key)}`);
 if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||('BYMA scan '+r.status))}
 const j=await r.json();
 if(j?.s!=='ok'||!Array.isArray(j?.t)||!j.t.length)throw new Error('Sin histórico BYMA para '+symbol);
 const out=[];
 for(let i=0;i<j.t.length;i++){
   const o=+j.o[i],h=+j.h[i],l=+j.l[i],c=+j.c[i],v=+(j.v?.[i]||0);
   if([o,h,l,c].every(Number.isFinite))out.push({time:+j.t[i],open:o,high:h,low:l,close:c,volume:v});
 }
 if(out.length<30)throw new Error('Histórico insuficiente para '+symbol);
 return out;
}

async function fetchScannerSeries(item,key){
 const type=resolveWatchType(item.symbol,item.type);
 const symbol=displaySymbolForType(item.symbol,type);
 const tfs=getTfsForType(type),tf=tfs[key];
 if(!tf)throw new Error('Temporalidad no disponible para este mercado.');
 if(type==='crypto')return{data:await fetchBinance(symbol,tf.interval),type,symbol,tfs,provider:'Binance'};
 if(type==='stock'){
   const quiet=!!item?.panel?.source && item.panel.source==='cedear-underlying';
   return{data:await fetchYahoo(symbol,tf.interval,tf.range,quiet),type,symbol,tfs,provider:'Yahoo'};
 }
 if(key==='micro')throw new Error('Micro no disponible en histórico BYMA gratuito.');
 try{
   return{data:await fetchBymaScannerHistory(symbol,key),type,symbol,tfs,provider:'BYMA'};
 }catch(bymaError){
   if(['argstock','cedear'].includes(type)){
     try{
       const daily=await fetchYahoo(symbol+'.BA','1d','5y',true);
       const data=key==='medium'?aggregateBars(daily,'week'):key==='macro'?aggregateBars(daily,'month'):daily;
       if(!Array.isArray(data)||data.length<30)throw new Error('histórico alternativo insuficiente');
       return{data,type,symbol,tfs,provider:'Yahoo .BA fallback',providerFallback:true};
     }catch(yahooError){
       throw new Error(`BYMA: ${String(bymaError?.message||bymaError)} · Yahoo .BA: ${String(yahooError?.message||yahooError)}`);
     }
   }
   throw bymaError;
 }
}
async function scanOne(item,key){
 const pack=await fetchScannerSeries(item,key);
 const a=await analyzeSeriesRuntime(pack.data,key,{symbol:pack.symbol,timeframe:pack.tfs?.[key]?.interval,source:'Scanner',standalone:true});
 let plan=computeTradePlan(a,true);
 let macroTrend=key==='macro'?a.trend:'—';

 // Para un universo grande no hacemos una segunda consulta macro a todos:
 // sólo validamos el macro cuando el primer pase detectó un setup OPERABLE.
 if(key!=='macro'&&pack.tfs.macro&&plan?.status==='OPERABLE'){
   try{
     const mp=await fetchScannerSeries({symbol:pack.symbol,type:pack.type,panel:item.panel||null},'macro');
     const ma=await analyzeSeriesRuntime(mp.data,'macro',{symbol:pack.symbol,timeframe:mp.tfs?.macro?.interval,source:'Scanner macro'});
     macroTrend=ma.trend;
     const pdir=plan?.direction,macroDir=directionSign(ma);
     if((pdir==='LONG'&&macroDir<0)||(pdir==='SHORT'&&macroDir>0)){
       plan={...plan,status:'ESPERAR CONFIRMACIÓN',score:Math.max(0,(plan.score||0)-12),
         action:`El setup ${pdir} existe en ${pack.tfs[key].label}, pero el marco macro está ${macroTrend}. Esperar alineación o confirmación adicional.`};
     }
   }catch(e){
     macroTrend='No validado';
   }
 }
 const marketContext=scannerContextFor(pack.type);
 const status=scannerStatus(plan,a,macroTrend,marketContext);
 if(['argbond','on'].includes(pack.type) && status.kind==='sell'){
   status.label='EVITAR / SALIDA';
 }
 let why=scannerWhy(plan,a,macroTrend,status,marketContext);
 const meta=item.panel||{};
 const rf=meta.rf?{...meta.rf}:null;
 if(['argbond','on'].includes(pack.type)){
   const extra=[];
   if(meta.category)extra.push(meta.category);
   if(meta.denominationCcy)extra.push(meta.denominationCcy);
   if(meta.maturityDate)extra.push('Vto '+meta.maturityDate);
   if(Number.isFinite(+meta.daysToMaturity))extra.push(`${meta.daysToMaturity} días`);
   if(Number.isFinite(+meta.volumeAmount)&&+meta.volumeAmount>0)extra.push(`Vol. ${new Intl.NumberFormat('es-AR',{notation:'compact',maximumFractionDigits:1}).format(+meta.volumeAmount)}`);
   if(extra.length)why+=' · '+extra.join(' · ')+'.';
 }
 const result={
   item:{symbol:pack.symbol,type:pack.type,panel:item.panel||null},
   key,tfLabel:pack.tfs[key]?.label||key,
   analysis:a,plan,status,macroTrend,marketContext,price:a.c,
   rf,
   why
 };
 if(rf){
   result.rfScore=fixedIncomeScore(result,state.scan.rfContext||{});
   result.why=buildRfReading(result,state.scan.rfContext||{});
 }
 return result;
}
function scanSortRank(r){
 const k=r.status.kind;
 return k==='buy'?0:k==='near'?1:k==='sell'?2:k==='wait'?3:4;
}

function formatScanWhy(text){
 return String(text||'—')
   .split(/(?<=\.)\s+/)
   .filter(Boolean)
   .map(x=>`<span class="why-line">${x}</span>`)
   .join('');
}

function scannerSellDisplayLabel(result){
 const status=result?.status;
 if(status?.kind!=='sell')return status?.label||'—';
 const normalizedType=resolveWatchType(result?.item?.symbol,result?.item?.type);
 const normalizedSymbol=displaySymbolForType(result?.item?.symbol,normalizedType);
 const held=(state.config.watchlist||[]).some(x=>x.symbol===normalizedSymbol&&x.type===normalizedType&&x.inPortfolio);
 return held?'VENTA / SALIDA':'SHORT';
}

const PREMIUM_ANALYTICS_COLORS=['#2f9cff','#8a72ff','#24c78e','#f3b74d','#ff6b7a','#64d6ff','#cf7cff','#94a9bb'];
function premiumAnalyticsRows(input,total){
 const raw=input instanceof Map?[...input.entries()]:Array.isArray(input)?input.map(x=>[x.name,x.value]):[];
 const rows=raw.map(([name,value])=>({name:String(name||'Sin clasificar'),value:Number(value)||0})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
 const sum=rows.reduce((a,x)=>a+x.value,0),den=Number(total)>0?Number(total):sum;
 return{rows,den,sum};
}
function premiumAnalyticsDonutHtml(input,total,options={}){
 const {rows,den}=premiumAnalyticsRows(input,total),title=options.centerTitle||'Distribución',sub=options.centerSub||'',emptyLabel=options.centerLabel||title;
 if(!rows.length||!(den>0))return `<div class="premium-donut-layout is-empty" role="img" aria-label="${escapeHtml(title)}: sin datos para graficar"><div class="premium-donut-shell"><div class="premium-donut ghost"><div class="premium-donut-hole"><b>—</b><small title="${escapeHtml(emptyLabel)}">${escapeHtml(emptyLabel)}</small></div></div></div><div class="premium-donut-empty"><b>Sin datos para graficar</b><span>${escapeHtml(options.emptyText||'Cargá o actualizá datos para visualizar la distribución.')}</span></div></div>`;
 let shown=rows.slice(0,6);if(rows.length>6){const other=rows.slice(6).reduce((a,x)=>a+x.value,0);shown=[...shown,{name:'Otros',value:other}]}
 let pos=0;const stops=[];shown.forEach((x,i)=>{const pct=Math.max(0,x.value/den*100),end=Math.min(100,pos+pct),c=PREMIUM_ANALYTICS_COLORS[i%PREMIUM_ANALYTICS_COLORS.length];stops.push(`${c} ${pos.toFixed(2)}% ${end.toFixed(2)}%`);pos=end});if(pos<100)stops.push(`#122738 ${pos.toFixed(2)}% 100%`);
 const lead=shown[0],leadPct=lead?lead.value/den*100:0,centerMain=options.centerValue||`${Math.round(leadPct)}%`,centerLabel=options.centerLabel||lead?.name||title;
 const legend=shown.map((x,i)=>{const pct=x.value/den*100;return `<div class="premium-donut-legend-row"><i style="background:${PREMIUM_ANALYTICS_COLORS[i%PREMIUM_ANALYTICS_COLORS.length]}"></i><span title="${escapeHtml(x.name)}">${escapeHtml(x.name)}</span><b>${pct.toFixed(1)}%</b></div>`}).join('');
 const aria=shown.map(x=>`${x.name} ${(x.value/den*100).toFixed(1)}%`).join(', ');
 return `<div class="premium-donut-layout" role="img" aria-label="${escapeHtml(title)}: ${escapeHtml(aria)}"><div class="premium-donut-shell"><div class="premium-donut" style="background:conic-gradient(${stops.join(',')})"><div class="premium-donut-hole"><b>${escapeHtml(centerMain)}</b><small title="${escapeHtml(centerLabel)}">${escapeHtml(centerLabel)}</small>${sub?`<em title="${escapeHtml(sub)}">${escapeHtml(sub)}</em>`:''}</div></div></div><div class="premium-donut-legend">${legend}</div></div>`;
}
function premiumAnalyticsCountDonut(items,options={}){const rows=(items||[]).map(x=>({name:x.name,value:Number(x.value)||0}));return premiumAnalyticsDonutHtml(rows,rows.reduce((a,x)=>a+x.value,0),options)}

function renderScanner(){
 const filter=$('scanFilter').value;
 let rows=[...(state.scan.results||[])];
 const rfMode=isFixedIncomeUniverse($('scanUniverse').value);
 rows.sort((a,b)=>{
   if(rfMode){
     return (b.rfScore||-1)-(a.rfScore||-1);
   }
   const d=scanSortRank(a)-scanSortRank(b);
   if(d)return d;
   return (b.status?.oppScore||0)-(a.status?.oppScore||0) ||
          (b.plan?.score||-999)-(a.plan?.score||-999) ||
          (b.plan?.rr1||-999)-(a.plan?.rr1||-999);
 });
 if(rfMode){
   if(filter==='buy')rows=rows.filter(x=>x.status.kind==='buy');
   if(filter==='actionable')rows=rows.filter(x=>['buy','near'].includes(x.status.kind));
   if(filter==='sell')rows=rows.filter(x=>x.status.kind==='sell');
   if(filter==='watch')rows=rows.filter(x=>x.status.kind!=='none');
 }else{
   if(filter==='buy')rows=rows.filter(x=>['buy','near'].includes(x.status.kind));
   if(filter==='actionable')rows=rows.filter(x=>['buy','near','sell'].includes(x.status.kind));
   if(filter==='sell')rows=rows.filter(x=>x.status.kind==='sell');
   if(filter==='watch')rows=rows.filter(x=>['buy','near','wait'].includes(x.status.kind));
 }

 const all=state.scan.results||[];
 $('scanAnalyzed').textContent=all.length;
 const buyN=all.filter(x=>x.status.kind==='buy').length;
 const nearN=all.filter(x=>x.status.kind==='near').length;
 const sellN=all.filter(x=>x.status.kind==='sell').length;
 const waitN=all.filter(x=>x.status.kind==='wait').length;
 const noneN=all.filter(x=>x.status.kind==='none'||x.error).length;
 $('scanBuyCount').textContent=buyN;
 $('scanNearCount').textContent=nearN;
 $('scanSellCount').textContent=sellN;
 $('scanWaitCount').textContent=waitN;
 $('scanNoneCount').textContent=noneN;
 if($('scanAnalyticsVisual'))$('scanAnalyticsVisual').innerHTML=premiumAnalyticsCountDonut([
   {name:rfMode?'Atractivos':'Compra ahora',value:buyN},
   {name:rfMode?'Interesantes':'Oportunidad cercana',value:nearN},
   {name:rfMode?'Poco atractivos':'Venta / Short',value:sellN},
   {name:rfMode?'Neutros':'Esperar',value:waitN},
   {name:'Sin datos / setup',value:noneN}
 ],{centerTitle:'Resultados',centerLabel:all.length?'Analizados':'Sin escaneo',centerValue:String(all.length||'—'),emptyText:'Ejecutá el escáner para ver la mezcla de resultados.'});
 if($('scanDiagnostic')){
   if(rfMode){
     const ranked=[...all].filter(x=>Number.isFinite(x.rfScore)).sort((a,b)=>b.rfScore-a.rfScore);
     const top=ranked[0];
     const obj=$('scanRfObjective')?.selectedOptions?.[0]?.textContent||'Valor relativo';
     $('scanDiagnostic').innerHTML=top
       ? `Renta fija · <b>${obj}</b>: mejor candidato relativo <b>${top.item.symbol}</b> · Score RF <b>${top.rfScore}/100</b>. `+
         `No usa MACD/Fibonacci/stop/TP para decidir el ranking.`
       : `No hay suficiente información de rendimiento, plazo y mercado para construir un ranking de renta fija.`;
   }else{
   const top=all.filter(x=>['buy','near'].includes(x.status.kind)).sort((a,b)=>(b.status.oppScore||0)-(a.status.oppScore||0))[0];
   $('scanDiagnostic').innerHTML=buyN
     ? `Hay <b class="green">${buyN} compra(s) confirmada(s)</b> y ${nearN} oportunidad(es) cercana(s).`
     : nearN
       ? `No hay entradas confirmadas ahora, pero hay <b class="premium-inline-warning">${nearN} oportunidad(es) cercana(s)</b>. ${top?`La mejor es ${top.item.symbol} con score de oportunidad ${top.status.oppScore}/100.`:''}`
       : `No se detectaron compras ni oportunidades cercanas con los filtros actuales. Eso significa que ninguna cumple simultáneamente sesgo LONG, R:R mínimo, cercanía a entrada y contexto macro no bajista.`;
   }
 }

 if(!rows.length){
   $('scanBody').innerHTML='<tr><td colspan="15" class="watch-empty">No hay resultados para este filtro.</td></tr>';
   return;
 }
 $('scanBody').innerHTML=rows.map((r,i)=>{
   if(r.error){
     return `<tr><td><span class="scan-action none">SIN DATOS</span></td><td class="watch-symbol">${r.item.symbol}</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td class="scan-why watch-error">${formatScanWhy(r.error)}</td><td></td></tr>`;
   }
   const p=r.plan,s=r.status,rowCls=s.kind==='buy'?'scan-buy':s.kind==='near'?'scan-near':s.kind==='sell'?'scan-sell':s.kind==='wait'?'scan-wait':'';
   if(rfMode){
     const rf=r.rf||{};
     const y=rfYieldMetric(rf);
     const curveClass=Number.isFinite(rf.curveSpread)?(rf.curveSpread>0.4?'rf-curve-cheap':rf.curveSpread<-0.4?'rf-curve-rich':'rf-curve-fair'):'';
     return `<tr class="${rowCls}">
       <td><span class="scan-action ${s.kind}">${s.label}</span></td>
       <td>
         <div class="watch-symbol">${r.item.symbol}</div>
         <div class="rf-class">${rfClassLabel(rf.rfClass)}</div>
         ${rf.rfClass==='ON'?'<div class="rf-warning">Crédito no evaluado</div>':''}
       </td>
       <td>${rfClassLabel(rf.rfClass)}</td>
       <td>${Number.isFinite(rf.days)?Math.round(rf.days)+' d':'—'}</td>
       <td>${Number.isFinite(r.price)?fmt(r.price):'—'}</td>
       <td><span class="rf-score ${r.rfScore>=75?'high':r.rfScore>=60?'med':'low'}">${Number.isFinite(r.rfScore)?r.rfScore+'/100':'—'}</span></td>
       <td class="${curveClass}">${r.curveText||'—'}</td>
       <td>${Number.isFinite(rf.paridad)&&rf.paridad>0?rf.paridad.toFixed(1)+'%':'—'}</td>
       <td>${Number.isFinite(y)?`<span class="rf-value-main">${y.toFixed(2)}%</span><span class="rf-value-sub">${rfYieldLabel(rf)}</span>`:'—'}</td>
       <td>${Number.isFinite(rf.liquidityPct)?rf.liquidityPct+'/100':'—'}</td>
       <td>${Number.isFinite(rf.duration)?rf.duration.toFixed(2)+' a':'—'}</td>
       <td>${r.scenario||'—'}</td>
       <td>${rf.rfClass==='SOBERANO_USD'&&state.scan.rfContext?.countryRisk?Math.round(state.scan.rfContext.countryRisk.value)+' pb':rf.rfClass==='ON'?'Crédito emisor':'—'}</td>
       <td class="scan-why">${formatScanWhy(r.why)}</td>
       <td>
         <div class="scan-actions">
           <button class="scan-open" onclick="openScanResult('${r.item.symbol}','${r.item.type}','medium')">Abrir</button>
           ${scanResultInWatchlist(r.item.symbol,r.item.type,'medium')
             ? `<button class="scan-watch added" disabled>En Watchlist</button>`
             : `<button class="scan-watch" onclick="addScanResultToWatchlist('${r.item.symbol}','${r.item.type}','medium',this)">+ Watchlist</button>`}
           ${portfolioContextActionsHtml(r.item.symbol,r.item.type,'medium','Scanner RF genérico')}
         </div>
       </td>
     </tr>`;
   }
   return `<tr class="${rowCls}">
     <td><span class="scan-action ${s.kind}">${scannerSellDisplayLabel(r)}</span></td>
     <td>
       <div class="watch-symbol">${r.item.symbol}</div>
       <div class="watch-muted">${typeLabel(r.item.type)}</div>
       ${r.item.panel&&['argbond','on'].includes(r.item.type)
         ? `<div class="rf-meta">${r.rf?.tipo||r.item.panel.category||''}${r.rf?.moneda?' · '+r.rf.moneda:(r.item.panel.denominationCcy?' · '+r.item.panel.denominationCcy:'')}${r.rf?.vencimiento?' · Vto '+r.rf.vencimiento:(r.item.panel.maturityDate?' · Vto '+r.item.panel.maturityDate:'')}</div>`
         : ''}
     </td>
     <td>${r.tfLabel}</td>
     <td>${r.macroTrend}</td>
     <td>${Number.isFinite(p?.score)?p.score+'/100':'—'}</td>
     <td>${r.rf
       ? `<span class="rf-score ${r.rfScore>=75?'high':r.rfScore>=60?'med':'low'}">${Number.isFinite(r.rfScore)?r.rfScore+'/100':'—'}</span>`
       : `<span class="opportunity-score ${s.oppScore>=75?'high':s.oppScore>=60?'med':'low'}">${Number.isFinite(s.oppScore)?s.oppScore+'/100':'—'}</span>`}</td>
     <td>${Number.isFinite(s.dist)?s.dist.toFixed(2)+'%':'—'}</td>
     <td>${Number.isFinite(r.price)?fmt(r.price):'—'}</td>
     <td>${r.rf
       ? (Number.isFinite(r.rf.tir)?`<span class="rf-value-main">${r.rf.tir.toFixed(2)}%</span><span class="rf-value-sub">${r.rf.tipo||''}</span>`:'—')
       : (Number.isFinite(p?.entryLow)?fmt(p.entryLow)+'–'+fmt(p.entryHigh):'—')}</td>
     <td>${r.rf
       ? (Number.isFinite(r.rf.paridad)?`<span class="rf-value-main">${r.rf.paridad.toFixed(1)}%</span>`:'—')
       : (Number.isFinite(p?.stop)?fmt(p.stop):'—')}</td>
     <td>${r.rf
       ? (Number.isFinite(r.rf.duration)?`<span class="rf-value-main">${r.rf.duration.toFixed(2)}</span><span class="rf-value-sub">años</span>`:'—')
       : (Number.isFinite(p?.tp1)?fmt(p.tp1):'—')}</td>
     <td>${r.rf
       ? (Number.isFinite(p?.pct1)?`${p.pct1.toFixed(2)}%`:'—')
       : (Number.isFinite(p?.pct1)?p.pct1.toFixed(2)+'%':'—')}</td>
     <td>${r.rf
       ? (Number.isFinite(r.rf.upsidePar100)?`${r.rf.upsidePar100>=0?'+':''}${r.rf.upsidePar100.toFixed(1)}%`:'—')
       : (Number.isFinite(p?.rr1)?'1:'+p.rr1.toFixed(2):'—')}</td>
     <td class="scan-why">${formatScanWhy(r.why)}</td>
     <td>
       <div class="scan-actions">
         <button class="scan-open" onclick="openScanResult('${r.item.symbol}','${r.item.type}','${r.key}')">Abrir</button>
         ${scanResultInWatchlist(r.item.symbol,r.item.type,r.key)
           ? `<button class="scan-watch added" disabled>En Watchlist</button>`
           : `<button class="scan-watch" onclick="addScanResultToWatchlist('${r.item.symbol}','${r.item.type}','${r.key}',this)">+ Watchlist</button>`}
         ${portfolioContextActionsHtml(r.item.symbol,r.item.type,r.key,'Scanner RV / Crypto')}
       </div>
     </td>
   </tr>`;
 }).join('');
}

function scanResultInWatchlist(symbol,type,key){
 const normalizedType=resolveWatchType(symbol,type);
 const normalizedSymbol=displaySymbolForType(symbol,normalizedType);
 return (state.config.watchlist||[]).some(x=>
   x.symbol===normalizedSymbol &&
   x.type===normalizedType &&
   x.tf===key
 );
}

async function addScanResultToWatchlist(symbol,type,key,control=null){
 const normalizedType=resolveWatchType(symbol,type),normalizedSymbol=displaySymbolForType(symbol,normalizedType),identity=[normalizedSymbol,normalizedType,key].join('|');
 const run=async()=>{if(scanResultInWatchlist(normalizedSymbol,normalizedType,key)){renderScanner();window.radarNotify?.(`${normalizedSymbol} ya estaba en Seguimiento.`,'info');return}
 state.config.watchlist.push({symbol:normalizedSymbol,type:normalizedType,tf:key,positionSize:Number(state.config.lastPositionSize)||0,buyPrice:0,inPortfolio:false});
 try{await saveConfigStrict()}catch(e){renderWatchlist();renderScanner();return}
 renderWatchlist();renderScanner();window.radarNotify?.(`${normalizedSymbol} agregado a Seguimiento.`,'ok')};
 if(window.radarRunAction)return window.radarRunAction(run,{key:`watchlist:add:${identity}`,control,errorMessage:`No se pudo agregar ${normalizedSymbol} a Seguimiento`});return run();
}

;
