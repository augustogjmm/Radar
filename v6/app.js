(()=>{
'use strict';

const $=id=>document.getElementById(id);
const $$=sel=>[...document.querySelectorAll(sel)];
const PORTFOLIO_KEY='radar_v6_portfolio';
const WATCH_KEY='radar_v6_watchlist';
const SNAPSHOT_KEY='radar_v6_today_snapshot';
const AR_SYMBOLS=new Set(['GGAL','YPFD','PAMP','BMA','BBAR','TXAR','CEPU','TGSU2','COME','LOMA','CRES','SUPV','BYMA','TGNO4','MIRG','ALUA']);
const CEDEAR_SYMBOLS=new Set(['AAPL','NVDA','MELI','MSFT','AMZN','GOOGL','META','TSLA','SPY','QQQ','KO','WMT','JPM','XOM','GOLD','AMD','NFLX']);
const CORE=[
 {symbol:'BTCUSDT',type:'crypto',tf:'1h'},
 {symbol:'ETHUSDT',type:'crypto',tf:'1h'},
 {symbol:'SOLUSDT',type:'crypto',tf:'1h'},
 {symbol:'GGAL',type:'argstock',tf:'1d'},
 {symbol:'YPFD',type:'argstock',tf:'1d'},
 {symbol:'PAMP',type:'argstock',tf:'1d'},
 {symbol:'AAPL',type:'cedear',tf:'1d'},
 {symbol:'NVDA',type:'cedear',tf:'1d'},
 {symbol:'MELI',type:'cedear',tf:'1d'},
 {symbol:'SPY',type:'stock',tf:'1d'},
 {symbol:'QQQ',type:'stock',tf:'1d'}
];
const BONDS=['AE38','AL30','GD30'];
const appState={view:'today',context:null,health:null,today:[],bonds:[],portfolio:loadJson(PORTFOLIO_KEY,[]),watch:loadJson(WATCH_KEY,[]),analysis:null,chart:null};

function loadJson(k,f){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch{return f}}
function saveJson(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function n(v){const x=Number(v);return Number.isFinite(x)?x:NaN}
function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v))}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(v,d=2){const x=n(v);return Number.isFinite(x)?new Intl.NumberFormat('es-AR',{maximumFractionDigits:d,minimumFractionDigits:0}).format(x):'—'}
function fmtPct(v,d=2){const x=n(v);return Number.isFinite(x)?`${x>=0?'+':''}${x.toFixed(d)}%`:'—'}
function fmtMoney(v,ccy=''){const x=n(v);if(!Number.isFinite(x))return'—';return `${ccy} ${new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(x)}`.trim()}
function compact(s,max=160){s=String(s||'').replace(/\s+/g,' ').trim();return s.length>max?s.slice(0,max-1).trim()+'…':s}
function ago(ts){if(!ts)return'—';const m=Math.max(0,Math.round((Date.now()-ts)/60000));return m<1?'ahora':m<60?`${m}m`:m<1440?`${Math.round(m/60)}h`:`${Math.round(m/1440)}d`}
function uniqueBy(arr,keyFn){const m=new Map();for(const x of arr)m.set(keyFn(x),x);return [...m.values()]}

async function getJson(url,timeout=25000){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
 try{
  const r=await fetch(url,{cache:'no-store',signal:c.signal});
  if(!r.ok){let body='';try{body=await r.text()}catch{};throw new Error(body||`HTTP ${r.status}`)}
  return await r.json();
 }finally{clearTimeout(t)}
}

function detectType(symbol,selected='auto'){
 if(selected&&selected!=='auto')return selected;
 const s=String(symbol||'').trim().toUpperCase().replace(/\s+/g,'');
 if(/^(AE|AL|GD)\d{2}[A-Z]?$/.test(s))return'bond';
 if(/(?:USDT|USDC|FDUSD)$/.test(s.replace(/[\/-]/g,'')))return'crypto';
 if(s.endsWith('.BA'))return'argstock';
 const b=s.replace(/\.BA$/,'');
 if(AR_SYMBOLS.has(b))return'argstock';
 if(CEDEAR_SYMBOLS.has(b))return'cedear';
 return'stock';
}
function cleanSymbol(symbol,type){
 let s=String(symbol||'').trim().toUpperCase().replace(/\s+/g,'');
 if(type==='crypto')return s.replace(/[\/-]/g,'');
 if(['argstock','cedear','bond'].includes(type))return s.replace(/\.BA$/,'');
 return s;
}

function ema(vals,p){
 if(!vals.length)return[];
 const k=2/(p+1),out=[];let prev=vals[0];
 for(let i=0;i<vals.length;i++){prev=i?vals[i]*k+prev*(1-k):vals[i];out.push(prev)}
 return out;
}
function rsi(vals,p=14){
 if(vals.length<p+1)return vals.map(()=>NaN);
 const out=Array(vals.length).fill(NaN);let gain=0,loss=0;
 for(let i=1;i<=p;i++){const d=vals[i]-vals[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0)}
 gain/=p;loss/=p;out[p]=loss===0?100:100-(100/(1+gain/loss));
 for(let i=p+1;i<vals.length;i++){
  const d=vals[i]-vals[i-1];gain=(gain*(p-1)+Math.max(d,0))/p;loss=(loss*(p-1)+Math.max(-d,0))/p;
  out[i]=loss===0?100:100-(100/(1+gain/loss));
 }
 return out;
}
function macd(vals){
 const e12=ema(vals,12),e26=ema(vals,26),m=vals.map((_,i)=>e12[i]-e26[i]),sig=ema(m,9);
 return{line:m,signal:sig,hist:m.map((v,i)=>v-sig[i])};
}
function atr(bars,p=14){
 if(!bars.length)return[];
 const tr=bars.map((b,i)=>i===0?b.high-b.low:Math.max(b.high-b.low,Math.abs(b.high-bars[i-1].close),Math.abs(b.low-bars[i-1].close)));
 return ema(tr,p);
}
function avg(a){const xs=a.filter(Number.isFinite);return xs.length?xs.reduce((z,x)=>z+x,0)/xs.length:NaN}
function highs(b){return b.map(x=>n(x.high)).filter(Number.isFinite)}
function lows(b){return b.map(x=>n(x.low)).filter(Number.isFinite)}
function structure(bars){
 if(bars.length<45)return'indefinida';
 const prev=bars.slice(-40,-20),cur=bars.slice(-20);
 const ph=Math.max(...highs(prev)),pl=Math.min(...lows(prev)),ch=Math.max(...highs(cur)),cl=Math.min(...lows(cur));
 if(ch>ph&&cl>pl)return'alcista';
 if(ch<ph&&cl<pl)return'bajista';
 return'rango';
}

function analyzeBars(bars,type='stock',tf='1d'){
 if(!Array.isArray(bars)||bars.length<60)throw new Error('Historial insuficiente para una lectura confiable.');
 const closes=bars.map(x=>n(x.close)),vols=bars.map(x=>n(x.volume));
 const e10=ema(closes,10),e55=ema(closes,55),e200=ema(closes,200),rs=rsi(closes,14),mc=macd(closes),at=atr(bars,14);
 const i=closes.length-1,price=closes[i],prev=closes[i-1],e10v=e10[i],e55v=e55[i],e200v=e200[i],rsiv=rs[i],hist=mc.hist[i],atrv=at[i];
 const st=structure(bars),recent=bars.slice(-20),recentHigh=Math.max(...highs(recent)),recentLow=Math.min(...lows(recent));
 const v20=avg(vols.slice(-21,-1)),vr=Number.isFinite(v20)&&v20>0?vols[i]/v20:NaN;
 let long=0,short=0;const longReasons=[],shortReasons=[];
 const add=(cond,lp,sp,lr,sr)=>{if(cond>0){long+=lp;if(lr)longReasons.push(lr)}else if(cond<0){short+=sp;if(sr)shortReasons.push(sr)}};
 add(price>e200v?1:-1,18,18,'Precio sobre EMA200','Precio debajo de EMA200');
 add(e10v>e55v?1:-1,16,16,'EMA10 sobre EMA55','EMA10 debajo de EMA55');
 add(e55v>e200v?1:-1,14,14,'EMA55 sobre EMA200','EMA55 debajo de EMA200');
 add(hist>0?1:-1,10,10,'MACD con momentum positivo','MACD con momentum negativo');
 if(Number.isFinite(rsiv)){if(rsiv>=50&&rsiv<=72){long+=10;longReasons.push(`RSI ${rsiv.toFixed(0)} acompaña`)}else if(rsiv<45){short+=10;shortReasons.push(`RSI ${rsiv.toFixed(0)} débil`)}else if(rsiv>76){long-=5;longReasons.push(`RSI ${rsiv.toFixed(0)} exigido`)}}
 if(st==='alcista'){long+=16;longReasons.push('Estructura de máximos/mínimos ascendente')}else if(st==='bajista'){short+=16;shortReasons.push('Estructura de máximos/mínimos descendente')}
 if(Number.isFinite(vr)&&vr>=1.1){if(long>=short){long+=6;longReasons.push(`Volumen ${vr.toFixed(1)}x media`)}else{short+=6;shortReasons.push(`Volumen ${vr.toFixed(1)}x media`)}}
 const breakUp=price>=recentHigh*.998,breakDown=price<=recentLow*1.002;
 if(breakUp){long+=12;longReasons.push('Precio en ruptura de máximo reciente')}
 if(breakDown){short+=12;shortReasons.push('Precio en ruptura de mínimo reciente')}
 long=clamp(long);short=clamp(short);
 const top=Math.max(long,short),direction=long>=short?'LONG':'SHORT';
 const longOnly=type!=='crypto';
 let kind='none',label='SIN SETUP',score=top,reasons=direction==='LONG'?longReasons:shortReasons;
 if(direction==='LONG'){
   if(long>=76){kind='buy';label='COMPRA / LONG'}
   else if(long>=62){kind='watch';label='VIGILAR LONG'}
 }
 if(direction==='SHORT'){
   if(short>=76){kind='sell';label=longOnly?'EVITAR / SALIDA':'SHORT'}
   else if(short>=62){kind='watch';label=longOnly?'DEBILIDAD':'VIGILAR SHORT'}
 }
 const invalidLong=Math.max(recentLow,Number.isFinite(atrv)?e55v-atrv*.7:recentLow);
 const invalidShort=Math.min(recentHigh,Number.isFinite(atrv)?e55v+atrv*.7:recentHigh);
 const targetLong=price<recentHigh?recentHigh:price+(Number.isFinite(atrv)?atrv*2:price*.04);
 const targetShort=price>recentLow?recentLow:price-(Number.isFinite(atrv)?atrv*2:price*.04);
 const trigger=direction==='LONG'
   ? (price<recentHigh?`Cierre > ${fmt(recentHigh)}`:`Sostener > EMA10 ${fmt(e10v)}`)
   : (price>recentLow?`Cierre < ${fmt(recentLow)}`:`Sostener < EMA10 ${fmt(e10v)}`);
 const invalidation=direction==='LONG'?invalidLong:invalidShort,target=direction==='LONG'?targetLong:targetShort;
 const change=prev?(price/prev-1)*100:NaN;
 return{
  price,change,kind,label,score:Math.round(score),direction,reasons:reasons.slice(0,4),
  trigger,invalidation,target,structure:st,ema10:e10v,ema55:e55v,ema200:e200v,rsi:rsiv,macdHist:hist,atr:atrv,volumeRatio:vr,
  source:null,tf
 };
}

async function fetchBars(symbol,type,tf='1d'){
 symbol=cleanSymbol(symbol,type);
 if(type==='crypto'){
  const interval=tf==='1d'?'1d':tf==='4h'?'4h':'1h';
  const a=await getJson(`/api/binance?symbol=${encodeURIComponent(symbol)}&interval=${interval}`);
  if(!Array.isArray(a)||!a.length)throw new Error('Binance no devolvió datos.');
  return{bars:a.map(x=>({time:Math.floor(n(x[0])/1000),open:n(x[1]),high:n(x[2]),low:n(x[3]),close:n(x[4]),volume:n(x[5])})).filter(x=>[x.open,x.high,x.low,x.close].every(Number.isFinite)),source:'Binance'};
 }
 if(type==='stock'){
  const interval=tf==='1d'?'1d':tf==='4h'?'1h':'1h',range=tf==='1d'?'2y':'6mo';
  const j=await getJson(`/api/yahoo?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`);
  const r=j?.chart?.result?.[0],q=r?.indicators?.quote?.[0];
  if(!r?.timestamp?.length||!q)throw new Error('Yahoo no devolvió datos.');
  let bars=[];r.timestamp.forEach((t,i)=>{const b={time:n(t),open:n(q.open?.[i]),high:n(q.high?.[i]),low:n(q.low?.[i]),close:n(q.close?.[i]),volume:n(q.volume?.[i])||0};if([b.open,b.high,b.low,b.close].every(Number.isFinite))bars.push(b)});
  if(tf==='4h'){
   const m=new Map();for(const b of bars){const k=Math.floor(b.time/(4*3600));const z=m.get(k);if(!z)m.set(k,{...b});else{z.high=Math.max(z.high,b.high);z.low=Math.min(z.low,b.low);z.close=b.close;z.volume+=b.volume;z.time=b.time}}
   bars=[...m.values()];
  }
  return{bars,source:'Yahoo Finance'};
 }
 if(['argstock','cedear'].includes(type)){
  try{
   const j=await getJson(`/api/byma/history?symbol=${encodeURIComponent(symbol)}&days=7300`);
   if(j?.s!=='ok'||!Array.isArray(j?.t))throw new Error('BYMA sin histórico');
   const bars=[];for(let i=0;i<j.t.length;i++){const b={time:n(j.t[i]),open:n(j.o?.[i]),high:n(j.h?.[i]),low:n(j.l?.[i]),close:n(j.c?.[i]),volume:n(j.v?.[i])||0};if([b.open,b.high,b.low,b.close].every(Number.isFinite))bars.push(b)}
   return{bars,source:'Open BYMADATA'};
  }catch(e){
   const j=await getJson(`/api/yahoo?symbol=${encodeURIComponent(symbol+'.BA')}&interval=1d&range=5y&quiet=1`);
   const r=j?.chart?.result?.[0],q=r?.indicators?.quote?.[0];if(!r?.timestamp?.length||!q)throw e;
   const bars=[];r.timestamp.forEach((t,i)=>{const b={time:n(t),open:n(q.open?.[i]),high:n(q.high?.[i]),low:n(q.low?.[i]),close:n(q.close?.[i]),volume:n(q.volume?.[i])||0};if([b.open,b.high,b.low,b.close].every(Number.isFinite))bars.push(b)});
   return{bars,source:'Yahoo .BA fallback'};
  }
 }
 throw new Error('Tipo de activo no soportado.');
}

async function scanAsset(item){
 const pack=await fetchBars(item.symbol,item.type,item.tf||'1d');
 const a=analyzeBars(pack.bars,item.type,item.tf||'1d');a.source=pack.source;
 return{...item,analysis:a,bars:pack.bars};
}

async function loadContext(){
 const [risk,core]=await Promise.all([
  getJson('/api/dashboard/risk').catch(()=>null),
  getJson('/api/dashboard/core').catch(()=>null)
 ]);
 const fx=core?.fx||{},infl=core?.inflation||{};
 appState.context={risk,fx,inflation:infl,loadedAt:Date.now()};
 $('ctxRisk').textContent=Number.isFinite(n(risk?.value))?`${Math.round(n(risk.value))} pb`:'—';
 $('ctxRiskNote').textContent=Number.isFinite(n(risk?.change))?`${n(risk.change)>=0?'+':''}${Math.round(n(risk.change))} pb · ${risk.date||''}`:risk?.source||'Sin dato';
 for(const [id,key] of [['ctxMep','mep'],['ctxCcl','ccl']]){
  const x=fx[key]||{};$(id).textContent=Number.isFinite(n(x.venta))?`$ ${fmt(x.venta,2)}`:'—';
  $((id==='ctxMep')?'ctxMepNote':'ctxCclNote').textContent=Number.isFinite(n(x.changePct))?`${fmtPct(x.changePct)} · ${x.source||''}`:x.source||'Sin dato';
 }
 $('ctxInflation').textContent=Number.isFinite(n(infl.value))?`${fmt(infl.value,1)}%`:'—';
 $('ctxInflationNote').textContent=infl.period?String(infl.period):infl.source||'Sin dato';
 return appState.context;
}

async function loadHealth(){
 try{
  const h=await getJson('/api/health/deep',90000);appState.health=h;
  const btn=$('systemStatusBtn'),bad=Number(h.criticalFailures)||0;
  btn.className='system-status '+(bad?'bad':'ok');
  btn.querySelector('b').textContent=bad?'Datos degradados':'Datos verificados';
  $('systemStatusDetail').textContent=bad?`${bad} fuente(s) crítica(s) con falla`:`${(h.checks||[]).filter(x=>x.ok).length} controles OK`;
 }catch(e){
  const btn=$('systemStatusBtn');btn.className='system-status warn';btn.querySelector('b').textContent='Salud no verificada';$('systemStatusDetail').textContent=compact(e.message,60);
 }
}

function todayUniverse(){
 const watch=(appState.watch||[]).map(x=>({symbol:x.symbol,type:x.type||detectType(x.symbol),tf:x.tf||((x.type||'')==='crypto'?'1h':'1d')}));
 return uniqueBy([...CORE,...watch],x=>`${x.type}|${x.symbol}`);
}
function todaySnapshot(rows,bonds){
 const items={};for(const x of rows){const a=x.analysis;items[`${x.type}|${x.symbol}`]={kind:a.kind,score:a.score,price:a.price}}
 for(const b of bonds)items[`bond|${b.symbol}`]={kind:'bond',score:n(b.tir),price:n(b.price)};
 return{at:Date.now(),items};
}
function diffSnapshot(prev,next){
 if(!prev?.items)return[];
 const out=[];
 for(const [k,v] of Object.entries(next.items||{})){
  const p=prev.items[k];if(!p)continue;
  const symbol=k.split('|')[1];
  if(v.kind!==p.kind)out.push({symbol,text:`${labelKind(p.kind)} → ${labelKind(v.kind)}`});
  else if(Number.isFinite(v.score)&&Number.isFinite(p.score)&&Math.abs(v.score-p.score)>=10)out.push({symbol,text:`Score ${Math.round(p.score)} → ${Math.round(v.score)}`});
  else if(Number.isFinite(v.price)&&Number.isFinite(p.price)&&p.price>0){
   const pct=(v.price/p.price-1)*100;if(Math.abs(pct)>=3)out.push({symbol,text:`Precio ${fmtPct(pct)} desde la lectura anterior`});
  }
 }
 return out.slice(0,8);
}
function labelKind(k){return({buy:'Compra',sell:'Debilidad',watch:'Vigilar',none:'Sin setup',bond:'RF'})[k]||String(k||'—')}

async function loadBonds(){
 try{
  const [analytics,market]=await Promise.all([
   getJson('/api/fixed-income/analytics',45000),
   getJson('/api/byma/fixed-income?kind=sovereign&currency=ALL&liquid=0',30000)
  ]);
  const am=new Map((analytics?.bonds||[]).map(x=>[String(x.ticker||x.symbol||'').toUpperCase(),x]));
  const mm=new Map((market?.items||[]).map(x=>[String(x.symbol||'').toUpperCase(),x]));
  const rows=BONDS.map(symbol=>{
   const a=am.get(symbol)||{},m=mm.get(symbol)||{};
   const price=[n(m.trade),n(m.closingPrice),n(a.precio),n(a.price)].find(Number.isFinite);
   return{symbol,price,tir:n(a.tir),paridad:n(a.paridad),duration:n(a.duration),maturity:a.vencimiento||m.maturityDate||'',volume:n(m.volumeAmount),risk:analytics?.countryRisk||null};
  });
  appState.bonds=rows;renderBondRadar();return rows;
 }catch(e){appState.bonds=[];$('bondRadar').innerHTML=`<div class="empty-state small">No se pudo completar renta fija: ${esc(compact(e.message,120))}</div>`;return[]}
}
function bondRead(b){
 const parts=[];
 if(Number.isFinite(b.tir))parts.push(`TIR ${fmt(b.tir,2)}%`);
 if(Number.isFinite(b.paridad))parts.push(`paridad ${fmt(b.paridad,1)}%`);
 if(Number.isFinite(b.duration))parts.push(`duration ${fmt(b.duration,2)}a`);
 return parts.length?parts.join(' · '):'Métricas analíticas incompletas.';
}
function renderBondRadar(){
 $('bondRadar').innerHTML=appState.bonds.map(b=>`<button class="bond-row" data-bond="${esc(b.symbol)}">
  <span class="asset"><b>${esc(b.symbol)}</b><small>Soberano</small></span>
  <span><small>Precio</small><b>${fmt(b.price)}</b></span>
  <span><small>TIR</small><b>${Number.isFinite(b.tir)?fmt(b.tir,2)+'%':'—'}</b></span>
  <span><small>Paridad</small><b>${Number.isFinite(b.paridad)?fmt(b.paridad,1)+'%':'—'}</b></span>
  <span><small>Duration</small><b>${fmt(b.duration,2)}</b></span>
  <span class="reason">${esc(bondRead(b))}</span>
 </button>`).join('')||'<div class="empty-state small">Sin datos de soberanos.</div>';
 $$('[data-bond]').forEach(el=>el.addEventListener('click',()=>analyzeSymbol(el.dataset.bond,'bond','1d')));
}

function renderToday(rows,changes){
 const actionable=rows.filter(x=>['buy','sell','watch'].includes(x.analysis.kind)).sort((a,b)=>b.analysis.score-a.analysis.score).slice(0,7);
 $('radarCoverage').textContent=`${rows.length}/${todayUniverse().length} con datos`;
 $('changeCount').textContent=String(changes.length);
 $('todayUpdated').textContent=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
 $('todayPriorities').innerHTML=actionable.length?actionable.map(x=>{
  const a=x.analysis;
  return `<button class="priority-item" data-priority="${esc(x.symbol)}" data-type="${esc(x.type)}" data-tf="${esc(x.tf)}">
   <span class="state ${a.kind}">${esc(a.label)}</span>
   <span class="asset"><b>${esc(x.symbol)}</b><small>${esc(x.type)} · ${esc(x.tf.toUpperCase())}</small></span>
   <span class="reason">${esc(compact(a.reasons.join(' · '),180))}</span>
   <span class="score"><small>Score</small><b>${a.score}</b></span>
  </button>`;
 }).join(''):'<div class="empty-state">No hay setups o deterioros suficientemente claros en el universo automático. No hacer nada también es una decisión.</div>';
 $('todayChanges').innerHTML=changes.length?changes.map(x=>`<div class="compact-item"><b>${esc(x.symbol)}</b><span>${esc(x.text)}</span></div>`).join(''):'<div class="empty-state small">Sin cambios materiales desde la lectura anterior.</div>';
 $$('[data-priority]').forEach(el=>el.addEventListener('click',()=>analyzeSymbol(el.dataset.priority,el.dataset.type,el.dataset.tf)));
}

async function refreshToday(){
 const btn=$('refreshToday');btn.disabled=true;btn.textContent='Actualizando…';
 $('todayPriorities').innerHTML='<div class="empty-state">Analizando mercado y seguimiento…</div>';
 try{
  await Promise.all([loadContext(),loadHealth()]);
  const universe=todayUniverse(),rows=[],errors=[];let cursor=0;
  const workers=Array.from({length:3},async()=>{while(true){const i=cursor++;if(i>=universe.length)return;const item=universe[i];try{rows.push(await scanAsset(item))}catch(e){errors.push({item,error:e.message})}}});
  await Promise.all(workers);
  const bonds=await loadBonds();
  const prev=loadJson(SNAPSHOT_KEY,null),next=todaySnapshot(rows,bonds),changes=diffSnapshot(prev,next);saveJson(SNAPSHOT_KEY,next);
  appState.today=rows;renderToday(rows,changes);renderPortfolioAlerts();
  if(errors.length)$('radarCoverage').textContent+=` · ${errors.length} sin datos`;
 }finally{btn.disabled=false;btn.textContent='Actualizar'}
}

function showView(name){
 appState.view=name;
 $$('.view').forEach(v=>v.classList.toggle('active',v.id===name+'View'));
 $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
 const meta={
  today:['RADAR DE HOY','Qué merece tu atención'],
  analysis:['ANÁLISIS','Activo y decisión'],
  portfolio:['CARTERA','Posiciones y estado']
 }[name];
 $('viewEyebrow').textContent=meta[0];$('viewTitle').textContent=meta[1];
 if(name==='portfolio')refreshPortfolio(false);
}
function goAnalysis(symbol,type='auto',tf='1d'){showView('analysis');analyzeSymbol(symbol,type,tf)}

function setAnalysisError(msg=''){
 const el=$('analysisError');el.hidden=!msg;el.textContent=msg||'';
}
async function analyzeSymbol(raw,typeSel='auto',tf='1d'){
 let symbol=String(raw||'').trim().toUpperCase();if(!symbol)return;
 const type=detectType(symbol,typeSel);symbol=cleanSymbol(symbol,type);
 $('quickSymbol').value=symbol;$('analysisType').value=type==='bond'?'bond':(typeSel==='auto'?'auto':type);
 $('analysisTf').value=tf==='1h'||tf==='4h'||tf==='1d'?tf:'1d';
 showView('analysis');setAnalysisError('');
 if(type==='bond'){await analyzeBond(symbol);return}
 $('marketAnalysisLayout').hidden=false;$('bondAnalysisLayout').hidden=true;$('analysisAdvanced').hidden=false;
 $('assetSymbol').textContent=symbol;$('assetType').textContent=type;$('assetSource').textContent='cargando';$('assetPrice').textContent='—';$('assetChange').textContent='—';
 try{
  const pack=await fetchBars(symbol,type,tf),a=analyzeBars(pack.bars,type,tf);a.source=pack.source;appState.analysis={symbol,type,tf,bars:pack.bars,a};
  renderAnalysis(symbol,type,pack.bars,a);renderChart(pack.bars,a);
 }catch(e){setAnalysisError(`No se pudo analizar ${symbol}: ${e.message}`);$('assetSource').textContent='sin datos'}
}
function renderAnalysis(symbol,type,bars,a){
 $('assetSource').textContent=a.source||'—';$('assetPrice').textContent=fmt(a.price,4);$('assetChange').textContent=fmtPct(a.change);
 $('assetChange').style.color=n(a.change)>=0?'var(--green)':'var(--red)';
 const ds=$('decisionState');ds.className='decision-state '+(a.kind==='buy'?'buy':a.kind==='sell'?'sell':a.kind==='watch'?'watch':'neutral');ds.textContent=a.label;
 $('decisionScore').textContent=String(a.score);
 $('decisionHeadline').textContent=a.kind==='buy'?'La estructura y el momentum están alineados a favor.':a.kind==='sell'?(type==='crypto'?'La estructura favorece presión bajista.':'El activo muestra deterioro técnico; priorizar protección/espera.'):a.kind==='watch'?'Hay elementos a favor, pero todavía falta confirmación.':'No hay confluencia suficiente para una acción técnica clara.';
 $('decisionTrigger').textContent=a.trigger;$('decisionInvalidation').textContent=fmt(a.invalidation,4);$('decisionTarget').textContent=fmt(a.target,4);
 $('decisionReasons').innerHTML=(a.reasons.length?a.reasons:['Sin confluencias suficientes.']).map(x=>`<li>${esc(x)}</li>`).join('');
 $('mEma10').textContent=fmt(a.ema10,4);$('mEma55').textContent=fmt(a.ema55,4);$('mEma200').textContent=fmt(a.ema200,4);$('mRsi').textContent=fmt(a.rsi,1);$('mMacd').textContent=fmt(a.macdHist,4);$('mAtr').textContent=fmt(a.atr,4);$('mVolume').textContent=Number.isFinite(a.volumeRatio)?`${a.volumeRatio.toFixed(2)}x`:'—';$('mStructure').textContent=a.structure;
}

function renderChart(bars,a){
 const host=$('assetChart');host.innerHTML='';
 if(!window.LightweightCharts){host.innerHTML='<div class="empty-state">Motor gráfico no disponible.</div>';return}
 if(appState.chart?.remove)try{appState.chart.remove()}catch{}
 const chart=LightweightCharts.createChart(host,{height:520,layout:{background:{color:'#0b151d'},textColor:'#718895'},grid:{vertLines:{color:'#13242d'},horzLines:{color:'#13242d'}},rightPriceScale:{borderColor:'#20323f'},timeScale:{borderColor:'#20323f',timeVisible:true}});
 const add=(kind,opt)=>chart.addSeries(kind,opt);
 const candles=add(LightweightCharts.CandlestickSeries,{upColor:'#64bd91',downColor:'#d27480',borderVisible:false,wickUpColor:'#64bd91',wickDownColor:'#d27480'});
 candles.setData(bars.map(b=>({time:b.time,open:b.open,high:b.high,low:b.low,close:b.close})));
 const closes=bars.map(b=>b.close);
 const defs=[[10,'#8db6d0'],[55,'#c5a96a'],[200,'#8c75b8']];
 for(const [p,color] of defs){
  if(bars.length<p)continue;const values=ema(closes,p),line=add(LightweightCharts.LineSeries,{color,lineWidth:1,priceLineVisible:false,lastValueVisible:false});
  line.setData(bars.map((b,i)=>({time:b.time,value:values[i]})));
 }
 chart.timeScale().fitContent();appState.chart=chart;
 const ro=new ResizeObserver(()=>chart.applyOptions({width:host.clientWidth}));ro.observe(host);appState.chartResize=ro;
}

async function analyzeBond(symbol){
 $('marketAnalysisLayout').hidden=true;$('bondAnalysisLayout').hidden=false;$('analysisAdvanced').hidden=true;
 $('assetSymbol').textContent=symbol;$('assetType').textContent='bond';$('assetSource').textContent='Renta fija';
 if(!appState.bonds.length)await loadBonds();
 let b=appState.bonds.find(x=>x.symbol===symbol);
 if(!b){
  try{
   const [analytics,market]=await Promise.all([getJson('/api/fixed-income/analytics',45000),getJson('/api/byma/fixed-income?kind=sovereign&currency=ALL&liquid=0',30000)]);
   const a=(analytics.bonds||[]).find(x=>String(x.ticker||x.symbol||'').toUpperCase()===symbol)||{},m=(market.items||[]).find(x=>String(x.symbol||'').toUpperCase()===symbol)||{};
   b={symbol,price:[n(m.trade),n(m.closingPrice),n(a.precio)].find(Number.isFinite),tir:n(a.tir),paridad:n(a.paridad),duration:n(a.duration),maturity:a.vencimiento||m.maturityDate||'',risk:analytics.countryRisk||null};
  }catch(e){setAnalysisError(`No se pudo analizar ${symbol}: ${e.message}`);return}
 }
 $('assetPrice').textContent=fmt(b.price);$('assetChange').textContent='';$('bondTitle').textContent=symbol;$('bondPrice').textContent=fmt(b.price);$('bondYield').textContent=Number.isFinite(b.tir)?fmt(b.tir,2)+'%':'—';$('bondParity').textContent=Number.isFinite(b.paridad)?fmt(b.paridad,1)+'%':'—';$('bondDuration').textContent=fmt(b.duration,2);$('bondMaturity').textContent=b.maturity||'—';
 $('bondRiskCountry').textContent=Number.isFinite(n(b.risk?.value))?`Riesgo país ${Math.round(n(b.risk.value))} pb`:'Riesgo país —';
 const parts=[bondRead(b)];
 if(Number.isFinite(n(b.risk?.value)))parts.push(`Riesgo país ${Math.round(n(b.risk.value))} pb: condiciona la sensibilidad de los soberanos en USD.`);
 parts.push('La TIR alta no es por sí sola una señal de compra; debe leerse junto con paridad, duration, calendario de pagos y riesgo soberano.');
 $('bondReading').textContent=parts.join(' ');
}

function openPositionDialog(prefill={}){
 $('posSymbol').value=prefill.symbol||'';$('posType').value=prefill.type||'auto';$('posQty').value='';$('posBuy').value=prefill.price&&Number.isFinite(n(prefill.price))?Number(prefill.price).toFixed(4):'';$('posCurrency').value=prefill.currency||(prefill.type==='argstock'||prefill.type==='cedear'||prefill.type==='bond'?'ARS':prefill.type==='crypto'?'USDT':'USD');
 $('positionDialog').showModal();
}
function savePosition(){
 const symbol=String($('posSymbol').value||'').trim().toUpperCase(),type=detectType(symbol,$('posType').value),qty=n($('posQty').value),buy=n($('posBuy').value),currency=$('posCurrency').value;
 if(!symbol||!(qty>0)||!(buy>0))return false;
 appState.portfolio.push({id:crypto.randomUUID?.()||String(Date.now()),symbol:cleanSymbol(symbol,type),type,qty,buy,currency,addedAt:Date.now()});saveJson(PORTFOLIO_KEY,appState.portfolio);renderPortfolio();return true;
}
function addWatchCurrent(){
 const x=appState.analysis;if(!x)return;
 const item={symbol:x.symbol,type:x.type,tf:x.tf||'1d'};if(!appState.watch.some(w=>w.symbol===item.symbol&&w.type===item.type))appState.watch.push(item);saveJson(WATCH_KEY,appState.watch);$('addWatch').textContent='En seguimiento';
}
function addPortfolioCurrent(){
 const x=appState.analysis;if(x)openPositionDialog({symbol:x.symbol,type:x.type,price:x.a?.price});
 else openPositionDialog();
}

async function pricePosition(p){
 if(p.type==='bond'){
  if(!appState.bonds.length)await loadBonds();const b=appState.bonds.find(x=>x.symbol===p.symbol);return{price:b?.price,analysis:null};
 }
 const pack=await fetchBars(p.symbol,p.type,p.type==='crypto'?'1h':'1d'),a=analyzeBars(pack.bars,p.type,p.type==='crypto'?'1h':'1d');return{price:a.price,analysis:a};
}
function usdEquivalent(value,currency){
 const mep=n(appState.context?.fx?.mep?.venta);
 if(currency==='ARS')return Number.isFinite(mep)&&mep>0?value/mep:NaN;
 if(currency==='USD'||currency==='USDT')return value;
 return NaN;
}
async function refreshPortfolio(fetchPrices=true){
 if(!appState.context)await loadContext().catch(()=>{});
 if(fetchPrices&&appState.portfolio.length){
  let i=0;const workers=Array.from({length:3},async()=>{while(true){const idx=i++;if(idx>=appState.portfolio.length)return;const p=appState.portfolio[idx];try{const q=await pricePosition(p);p.current=q.price;p.analysis=q.analysis;p.priceAt=Date.now();p.error=''}catch(e){p.error=e.message}}});await Promise.all(workers);
  saveJson(PORTFOLIO_KEY,appState.portfolio);
 }
 renderPortfolio();renderPortfolioAlerts();
}
function renderPortfolio(){
 const ps=appState.portfolio;
 $('pCount').textContent=String(ps.length);
 if(!ps.length){$('portfolioBody').innerHTML='<tr><td colspan="8" class="empty-cell">No hay posiciones cargadas.</td></tr>';$('pValue').textContent='—';$('pPnl').textContent='—';$('pPnlPct').textContent='—';$('pTopWeight').textContent='—';$('pTopSymbol').textContent='—';$('portfolioExposure').innerHTML='';return}
 let totalUsd=0,totalCostUsd=0;const enriched=[];
 for(const p of ps){
  const current=n(p.current),value=current>0?current*p.qty:NaN,cost=p.buy*p.qty,pnl=Number.isFinite(value)?value-cost:NaN,usd=usdEquivalent(value,p.currency),costUsd=usdEquivalent(cost,p.currency);
  if(Number.isFinite(usd))totalUsd+=usd;if(Number.isFinite(costUsd))totalCostUsd+=costUsd;enriched.push({...p,value,cost,pnl,usd});
 }
 enriched.forEach(x=>x.weight=totalUsd>0&&Number.isFinite(x.usd)?x.usd/totalUsd*100:NaN);
 const top=[...enriched].filter(x=>Number.isFinite(x.weight)).sort((a,b)=>b.weight-a.weight)[0];
 $('pValue').textContent=totalUsd>0?`USD ${fmt(totalUsd,0)} eq.`:'—';$('pCurrency').textContent=Number.isFinite(n(appState.context?.fx?.mep?.venta))?'Equivalente vía MEP':'Sin conversión completa';
 const pnlUsd=totalUsd-totalCostUsd;$('pPnl').textContent=totalCostUsd>0?`USD ${fmt(pnlUsd,0)}`:'—';$('pPnl').className=pnlUsd>0?'positive':pnlUsd<0?'negative':'';
 $('pPnlPct').textContent=totalCostUsd>0?fmtPct(pnlUsd/totalCostUsd*100):'—';$('pTopWeight').textContent=top?fmtPct(top.weight,1):'—';$('pTopSymbol').textContent=top?.symbol||'—';
 $('portfolioBody').innerHTML=enriched.map(p=>{
  const pnlPct=Number.isFinite(p.pnl)&&p.cost>0?p.pnl/p.cost*100:NaN,status=p.analysis?.label||(p.error?'SIN DATOS':'PENDIENTE'),scls=p.analysis?.kind||'none';
  return`<tr><td><b>${esc(p.symbol)}</b><br><small>${esc(p.type)} · ${esc(p.currency)}</small></td><td>${fmt(p.qty,4)}</td><td>${fmtMoney(p.buy,p.currency)}</td><td>${Number.isFinite(n(p.current))?fmtMoney(p.current,p.currency):'—'}</td><td class="${p.pnl>0?'positive':p.pnl<0?'negative':''}">${Number.isFinite(p.pnl)?fmtMoney(p.pnl,p.currency):'—'}<br><small>${fmtPct(pnlPct)}</small></td><td>${fmtPct(p.weight,1)}</td><td><span class="status-pill state ${scls}">${esc(status)}</span></td><td><button class="text-button" data-open-pos="${esc(p.id)}">Abrir</button> · <button class="text-button" data-remove-pos="${esc(p.id)}">Quitar</button></td></tr>`
 }).join('');
 $$('[data-open-pos]').forEach(el=>el.addEventListener('click',()=>{const p=ps.find(x=>x.id===el.dataset.openPos);if(p)goAnalysis(p.symbol,p.type,p.type==='crypto'?'1h':'1d')}));
 $$('[data-remove-pos]').forEach(el=>el.addEventListener('click',()=>{appState.portfolio=appState.portfolio.filter(x=>x.id!==el.dataset.removePos);saveJson(PORTFOLIO_KEY,appState.portfolio);renderPortfolio();renderPortfolioAlerts()}));
 const byType=new Map(),byCurrency=new Map();for(const p of enriched){byType.set(p.type,(byType.get(p.type)||0)+(p.usd||0));byCurrency.set(p.currency,(byCurrency.get(p.currency)||0)+(p.usd||0))}
 $('portfolioExposure').innerHTML=[...byType].map(([k,v])=>`<div><small>Tipo · ${esc(k)}</small><b>${totalUsd>0?fmtPct(v/totalUsd*100,1):'—'}</b></div>`).concat([...byCurrency].map(([k,v])=>`<div><small>Moneda · ${esc(k)}</small><b>${totalUsd>0?fmtPct(v/totalUsd*100,1):'—'}</b></div>`)).join('');
}
function renderPortfolioAlerts(){
 const rows=appState.portfolio.filter(p=>p.analysis&&['sell','watch'].includes(p.analysis.kind)).sort((a,b)=>b.analysis.score-a.analysis.score).slice(0,5);
 $('portfolioAlerts').innerHTML=rows.length?rows.map(p=>`<button class="compact-item" data-port-alert="${esc(p.id)}"><b>${esc(p.symbol)} · ${esc(p.analysis.label)}</b><span>${esc(compact(p.analysis.reasons.join(' · '),120))}</span></button>`).join(''):'<div class="empty-state small">'+(appState.portfolio.length?'No hay posiciones con deterioro técnico relevante en la última actualización.':'No hay posiciones cargadas.')+'</div>';
 $$('[data-port-alert]').forEach(el=>el.addEventListener('click',()=>{const p=appState.portfolio.find(x=>x.id===el.dataset.portAlert);if(p)goAnalysis(p.symbol,p.type,p.type==='crypto'?'1h':'1d')}));
}

function bind(){
 $$('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
 $$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
 $('quickSearch').addEventListener('submit',e=>{e.preventDefault();const s=$('quickSymbol').value;goAnalysis(s,'auto','1d')});
 $('refreshToday').addEventListener('click',refreshToday);
 $('refreshAnalysis').addEventListener('click',()=>{const s=$('assetSymbol').textContent;if(s&&s!=='—')analyzeSymbol(s,$('analysisType').value,$('analysisTf').value)});
 $('analysisTf').addEventListener('change',()=>{const s=$('assetSymbol').textContent;if(s&&s!=='—')analyzeSymbol(s,$('analysisType').value,$('analysisTf').value)});
 $('analysisType').addEventListener('change',()=>{const s=$('assetSymbol').textContent;if(s&&s!=='—')analyzeSymbol(s,$('analysisType').value,$('analysisTf').value)});
 $('addWatch').addEventListener('click',addWatchCurrent);$('addPortfolio').addEventListener('click',addPortfolioCurrent);
 $('openAddPosition').addEventListener('click',()=>openPositionDialog());$('refreshPortfolio').addEventListener('click',()=>refreshPortfolio(true));
 $('positionForm').addEventListener('submit',e=>{e.preventDefault();if(savePosition())$('positionDialog').close()});
 $('closePositionDialog').addEventListener('click',()=>$('positionDialog').close());$('cancelPosition').addEventListener('click',()=>$('positionDialog').close());
 $('analyzeAe38').addEventListener('click',()=>goAnalysis('AE38','bond','1d'));
 $('systemStatusBtn').addEventListener('click',loadHealth);
}

async function boot(){
 bind();renderPortfolio();showView('today');
 await refreshToday();
 if(appState.portfolio.length)refreshPortfolio(true);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();