/* Radar Técnico G2 · v7 Investor Workspace
   Product layer only. Reuses certified v5 engines and preserves all core workspaces. */
(()=>{
'use strict';

const VERSION='7.0.0-preview';
const SNAPSHOT_KEY='radar_v7_investor_brief_v1';
const state={running:false,updatedAt:0,results:[],errors:[],universe:{},bondRows:[],previous:null};

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN};
const fmt=(v,d=2)=>Number.isFinite(num(v))?new Intl.NumberFormat('es-AR',{maximumFractionDigits:d}).format(num(v)):'—';
const pct=(v,d=1)=>Number.isFinite(num(v))?(`${num(v)>=0?'+':''}${num(v).toFixed(d)}%`):'—';
const short=(s,n=155)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trim()+'…':s};
const rankKind=k=>k==='buy'?5:k==='near'?4:k==='sell'?3:k==='wait'?2:1;
const liquidity=x=>{
  for(const k of ['quoteVolume','volumeAmount','tradeVolume','volume','turnover']){const v=num(x?.[k]);if(Number.isFinite(v)&&v>0)return v}
  return 0;
};

function mountSignalsView(){
  if($('signalsView'))return;
  const wrap=document.querySelector('.wrap');if(!wrap)return;
  const view=document.createElement('div');
  view.id='signalsView';
  view.className='signals-view v7-signals-view';
  view.innerHTML=`
    <div class="v7-workspace-head">
      <div><span class="investor-eyebrow">TRAZABILIDAD</span><h2>Historial y auditoría de decisiones</h2><p>Señales capturadas por los scanners y seguimiento, con resultado observado, MFE/MAE y R múltiple.</p></div>
      <div class="v7-head-actions"><button id="signalAuditBtn">Auditar señales</button><button id="signalExportBtn" class="secondary-action">Exportar CSV</button><button id="signalClearBtn" class="secondary-action">Limpiar historial</button></div>
    </div>
    <div class="v7-signal-kpis">
      <div><small>TOTAL</small><b id="sigTotal">0</b></div>
      <div><small>AUDITABLES</small><b id="sigAuditable">0</b></div>
      <div><small>RESUELTAS</small><b id="sigResolved">0</b></div>
      <div><small>WIN RATE</small><b id="sigWinRate">—</b></div>
      <div><small>ABIERTAS</small><b id="sigOpen">0</b></div>
      <div><small>SIN TRIGGER</small><b id="sigUntriggered">0</b></div>
      <div><small>R PROMEDIO</small><b id="sigAvgR">—</b></div>
    </div>
    <div id="signalEvidenceNote" class="v7-evidence-note">Sin evidencia suficiente todavía.</div>
    <div class="v7-signal-toolbar">
      <label>Origen<select id="signalSourceFilter"><option value="all">Todos</option><option value="scanner-rv">Escáner RV</option><option value="scanner-rf">Escáner RF</option><option value="watchlist">Seguimiento</option></select></label>
      <label>Resultado<select id="signalOutcomeFilter"><option value="all">Todos</option><option value="open">Abiertas</option><option value="resolved">Resueltas</option><option value="win">TP1</option><option value="loss">STOP</option><option value="untriggered">Sin trigger</option><option value="info">Informativas</option></select></label>
      <label>Período<select id="signalPeriodFilter"><option value="0">Todo</option><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select></label>
      <div id="signalAuditProgress" class="v7-audit-progress"><span id="signalAuditBar"></span><b id="signalAuditText">Listo</b></div>
    </div>
    <div class="v7-signal-table-wrap">
      <table class="v7-signal-table"><thead><tr><th>Fecha</th><th>Activo</th><th>Origen</th><th>Señal</th><th>TF</th><th>Precio</th><th>Entrada</th><th>Stop</th><th>TP1</th><th>Score</th><th>Resultado</th><th>MFE</th><th>MAE</th><th>R</th><th>Motivo</th></tr></thead><tbody id="signalBody"><tr><td colspan="15" class="signal-empty">Sin señales registradas.</td></tr></tbody></table>
    </div>
    <section class="v7-decision-audit">
      <div class="investor-panel-head"><div><span class="investor-eyebrow">AUDITORÍA</span><h2>Decisiones registradas</h2></div><button id="decisionAuditExportBtn" class="investor-link">Exportar auditoría</button></div>
      <div class="v7-signal-table-wrap"><table class="v7-signal-table"><thead><tr><th>Fecha</th><th>Activo</th><th>Origen</th><th>Decisión</th><th>Acción</th><th>Score</th><th>Modelo</th><th>Radar</th><th>Motivo / datos</th></tr></thead><tbody id="decisionAuditBody"><tr><td colspan="9" class="signal-empty">Sin decisiones auditadas.</td></tr></tbody></table></div>
    </section>`;
  wrap.appendChild(view);
  $('signalsViewBtn')?.addEventListener('click',()=>typeof window.showSignalsView==='function'?window.showSignalsView():null);
  for(const id of ['signalSourceFilter','signalOutcomeFilter','signalPeriodFilter'])$(id)?.addEventListener('change',()=>typeof window.renderSignalHistory==='function'&&window.renderSignalHistory());
  $('signalAuditBtn')?.addEventListener('click',()=>typeof window.auditAllSignals==='function'&&window.auditAllSignals());
  $('signalExportBtn')?.addEventListener('click',()=>typeof window.exportSignalCsv==='function'&&window.exportSignalCsv());
  $('signalClearBtn')?.addEventListener('click',()=>typeof window.clearSignalHistory==='function'&&window.clearSignalHistory());
  $('decisionAuditExportBtn')?.addEventListener('click',()=>typeof window.exportDecisionAudit==='function'&&window.exportDecisionAudit());
}

function relabelNavigation(){
  const map={
    homeViewBtn:['Resumen','Mercado, oportunidades y cartera'],
    scannerViewBtn:['Oportunidades','Acciones · CEDEAR · cripto'],
    fixedIncomeBtn:['Renta fija','Bonos · Letras · ON'],
    watchlistViewBtn:['Seguimiento','Watchlist · alertas · disparadores'],
    portfolioViewBtn:['Cartera','Posiciones · riesgo · performance'],
    signalsViewBtn:['Historial','Señales · decisiones · auditoría']
  };
  for(const [id,[name,sub]] of Object.entries(map)){
    const el=$(id);if(!el)continue;
    const b=el.querySelector('.nav-copy b'),sm=el.querySelector('.nav-copy small');
    if(b)b.textContent=name;if(sm)sm.textContent=sub;
  }
  const brand=document.querySelector('.sidebar-brand-copy small');
  if(brand)brand.textContent='Mercado · Oportunidades · Cartera';
}

function mountBrief(){
  if($('investorBrief'))return;
  const dashboard=$('dashboardView');
  if(!dashboard)return;
  const panel=document.createElement('section');
  panel.id='investorBrief';
  panel.className='investor-brief';
  panel.innerHTML=`
    <header class="investor-brief-head">
      <div>
        <span class="investor-eyebrow">RESUMEN DEL INVERSOR</span>
        <h1>Mercado, oportunidades y cartera en una sola lectura</h1>
        <p>Usa los mismos motores de Radar. El resumen no reemplaza los scanners ni el análisis: los prioriza.</p>
      </div>
      <div class="investor-brief-actions">
        <span id="investorBriefWhen">Sin ejecutar</span>
        <button id="investorBriefRefresh">Actualizar lectura</button>
      </div>
    </header>

    <div class="investor-context-grid">
      <article><small>RIESGO PAÍS</small><b id="ibRisk">—</b><span id="ibRiskSub">—</span></article>
      <article><small>MEP</small><b id="ibMep">—</b><span id="ibMepSub">—</span></article>
      <article><small>CCL</small><b id="ibCcl">—</b><span id="ibCclSub">—</span></article>
      <article><small>RÉGIMEN</small><b id="ibRegime">—</b><span id="ibRegimeSub">Contexto técnico</span></article>
      <article><small>CARTERA</small><b id="ibPortfolio">—</b><span id="ibPortfolioSub">Posiciones cargadas</span></article>
    </div>

    <div id="investorBriefStatus" class="investor-brief-status">Preparando lectura automática con los motores de Radar…</div>

    <div class="investor-brief-main">
      <section class="investor-panel investor-opportunities">
        <div class="investor-panel-head">
          <div><span class="investor-eyebrow">OPORTUNIDADES</span><h2>Qué merece revisión</h2></div>
          <button class="investor-link" data-go="scanner">Abrir scanner completo</button>
        </div>
        <div id="investorOpportunityList" class="investor-opportunity-list">
          <div class="investor-empty">Analizando universos líquidos…</div>
        </div>
      </section>

      <aside class="investor-brief-side">
        <section class="investor-panel">
          <div class="investor-panel-head">
            <div><span class="investor-eyebrow">RENTA FIJA</span><h2>Soberanos de referencia</h2></div>
            <button class="investor-link" data-go="fixed">Abrir scanner RF</button>
          </div>
          <div id="investorBondList" class="investor-bond-list"><div class="investor-empty">Consultando curva…</div></div>
        </section>

        <section class="investor-panel">
          <div class="investor-panel-head">
            <div><span class="investor-eyebrow">CARTERA</span><h2>Qué requiere atención</h2></div>
            <button class="investor-link" data-go="portfolio">Abrir cartera 360</button>
          </div>
          <div id="investorPortfolioList" class="investor-portfolio-list"><div class="investor-empty">Revisando posiciones…</div></div>
        </section>
      </aside>
    </div>

    <div class="investor-tools">
      <button data-go="scanner"><b>Escáner RV / Crypto</b><span>Universos completos, filtros, entrada, stop, TP y R:R</span></button>
      <button data-go="fixed"><b>Escáner Renta Fija</b><span>Bonos, Letras y ON por objetivo y horizonte</span></button>
      <button data-go="watch"><b>Seguimiento</b><span>Watchlist, alertas, triggers y acceso al análisis</span></button>
      <button data-go="portfolio"><b>Cartera 360</b><span>P&L, riesgo, diversificación, performance y stress</span></button>
    </div>
  `;
  dashboard.prepend(panel);

  panel.querySelector('#investorBriefRefresh')?.addEventListener('click',()=>refresh(true));
  panel.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>{
    const k=btn.dataset.go;
    if(k==='scanner')$('scannerViewBtn')?.click();
    if(k==='fixed')$('fixedIncomeBtn')?.click();
    if(k==='watch')$('watchlistViewBtn')?.click();
    if(k==='portfolio')$('portfolioViewBtn')?.click();
  }));
}

function dashboardContext(){
  const d=window.RadarDashboardData||{};
  const risk=d.risk||{},fx=d.fx||{},infl=d.inflation||{};
  return{risk,fx,infl};
}
function marketRegime(){
  const m=window.RadarMarketIntel||{};
  const r=m.regime;
  if(typeof r==='string')return{label:r,reason:m.scannerReason||'Contexto de mercado'};
  if(r&&typeof r==='object'){
    return{label:String(r.label||r.name||r.regime||r.state||'—'),reason:String(r.reason||r.why||m.scannerReason||'Contexto de mercado')};
  }
  const adj=num(m.scannerAdjustment);
  if(Number.isFinite(adj))return{label:adj>4?'Favorable':adj<-4?'Defensivo':'Neutral',reason:m.scannerReason||`Ajuste scanner ${adj>=0?'+':''}${adj}`};
  return{label:'—',reason:'Contexto aún no calculado'};
}
function renderContext(){
  const {risk,fx}=dashboardContext(),reg=marketRegime();
  $('ibRisk').textContent=Number.isFinite(num(risk.value))?`${Math.round(num(risk.value))} pb`:'—';
  $('ibRiskSub').textContent=Number.isFinite(num(risk.change))?`${num(risk.change)>=0?'+':''}${Math.round(num(risk.change))} pb · ${risk.source||''}`:risk.source||'Sin dato';
  for(const [id,k] of [['ibMep','mep'],['ibCcl','ccl']]){
    const x=fx?.[k]||{};
    $(id).textContent=Number.isFinite(num(x.venta))?`$ ${fmt(x.venta,0)}`:'—';
    $((id==='ibMep')?'ibMepSub':'ibCclSub').textContent=Number.isFinite(num(x.changePct))?`${pct(x.changePct)} · ${x.source||''}`:x.source||'Sin dato';
  }
  $('ibRegime').textContent=reg.label;$('ibRegimeSub').textContent=short(reg.reason,70);
}

async function discoverUniverse(){
  const out=[];
  const meta={crypto:0,cedear:0,arg:0};
  const jobs=[
    typeof window.fetchCryptoTop100==='function'?window.fetchCryptoTop100():Promise.reject(new Error('crypto universe unavailable')),
    typeof window.fetchCedearUniverse==='function'?window.fetchCedearUniverse(true):Promise.reject(new Error('cedear universe unavailable')),
    typeof window.fetchArgentinaUniverse==='function'?window.fetchArgentinaUniverse('leading'):Promise.reject(new Error('arg universe unavailable'))
  ];
  const [cr,ce,ar]=await Promise.allSettled(jobs);
  if(cr.status==='fulfilled'){
    const rows=[...(cr.value?.items||[])].sort((a,b)=>liquidity(b)-liquidity(a)).slice(0,8);
    rows.forEach(x=>out.push({symbol:x.symbol,type:'crypto',key:'short',panel:x,group:'Crypto'}));meta.crypto=rows.length;
  }
  if(ce.status==='fulfilled'){
    const rows=[...(ce.value?.items||[])].filter(x=>liquidity(x)>0).sort((a,b)=>liquidity(b)-liquidity(a)).slice(0,10);
    rows.forEach(x=>out.push({symbol:x.symbol,type:'cedear',key:'short',panel:x,group:'CEDEAR'}));meta.cedear=rows.length;
  }
  if(ar.status==='fulfilled'){
    const rows=[...(ar.value?.items||[])].sort((a,b)=>liquidity(b)-liquidity(a)).slice(0,8);
    rows.forEach(x=>out.push({symbol:x.symbol,type:'argstock',key:'short',panel:x,group:'Argentina'}));meta.arg=rows.length;
  }
  const watch=(window.RadarState?.config?.watchlist||[])
    .filter(x=>!['argbond','on'].includes(x.type))
    .slice(0,12)
    .map(x=>({symbol:x.symbol,type:x.type,key:x.tf||'short',panel:null,group:'Seguimiento'}));
  const uniq=new Map();
  [...watch,...out].forEach(x=>{const k=`${x.type}|${x.symbol}|${x.key}`;if(!uniq.has(k))uniq.set(k,x)});
  return{items:[...uniq.values()].slice(0,32),meta};
}

async function runScans(items){
  if(typeof window.scanOne!=='function')throw new Error('Motor scanOne no disponible');
  const results=[],errors=[];let cursor=0;
  const workers=Array.from({length:4},async()=>{
    while(true){
      const i=cursor++;if(i>=items.length)return;
      const item=items[i];
      try{
        const r=await window.scanOne(item,item.key||'short');
        r._group=item.group;results.push(r);
      }catch(e){errors.push({item,error:String(e?.message||e)})}
    }
  });
  await Promise.all(workers);
  return{results,errors};
}

function resultRank(r){
  return rankKind(r?.status?.kind)*1000+(num(r?.status?.oppScore)||0)*4+(num(r?.plan?.score)||0)+(num(r?.plan?.rr1)||0)*8;
}
function renderOpportunities(){
  const actionable=state.results
    .filter(r=>['buy','near','sell'].includes(r?.status?.kind))
    .sort((a,b)=>resultRank(b)-resultRank(a))
    .slice(0,8);
  const host=$('investorOpportunityList');
  if(!host)return;
  if(!actionable.length){
    host.innerHTML='<div class="investor-empty strong">No hay setups confirmados o zonas cercanas en la muestra líquida actual. Abrí el scanner completo para ampliar universo, timeframe u objetivo.</div>';
    return;
  }
  host.innerHTML=actionable.map(r=>{
    const kind=r.status?.kind||'none',score=Math.round(num(r.status?.oppScore)||0),rr=num(r.plan?.rr1),dist=num(r.status?.dist);
    return `<button class="investor-opportunity ${kind}" data-open-result="${esc(r.item?.symbol)}" data-result-type="${esc(r.item?.type)}" data-result-key="${esc(r.key||'short')}">
      <span class="investor-op-state">${esc(r.status?.label||kind)}</span>
      <span class="investor-op-asset"><b>${esc(r.item?.symbol||'—')}</b><small>${esc(r._group||r.item?.type||'')}</small></span>
      <span class="investor-op-reading">${esc(short(r.why,190))}</span>
      <span class="investor-op-metrics"><small>Score</small><b>${score}</b><em>${Number.isFinite(rr)?'R:R '+rr.toFixed(2):''}${Number.isFinite(dist)?' · dist '+dist.toFixed(1)+'%':''}</em></span>
    </button>`;
  }).join('');
  host.querySelectorAll('[data-open-result]').forEach(el=>el.addEventListener('click',()=>{
    if(typeof window.openScanResult==='function')window.openScanResult(el.dataset.openResult,el.dataset.resultType,el.dataset.resultKey);
  }));
}

async function loadBonds(){
  try{
    const j=await fetch('/api/fixed-income/analytics',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error(await r.text());return r.json()});
    const wanted=['AE38','AL30','GD30'];
    state.bondRows=wanted.map(symbol=>{
      const x=(j.bonds||[]).find(b=>String(b.ticker||b.symbol||'').toUpperCase()===symbol)||{};
      return{symbol,tir:num(x.tir),paridad:num(x.paridad),duration:num(x.duration),price:num(x.precio??x.price),maturity:x.vencimiento||x.maturity||'',risk:j.countryRisk||null};
    });
  }catch(e){state.bondRows=[];state.errors.push({area:'rf',error:String(e?.message||e)})}
  renderBonds();
}
function renderBonds(){
  const h=$('investorBondList');if(!h)return;
  if(!state.bondRows.length){h.innerHTML='<div class="investor-empty">Renta fija no disponible. El scanner RF completo sigue accesible.</div>';return}
  h.innerHTML=state.bondRows.map(b=>`<button class="investor-bond" data-bond="${esc(b.symbol)}">
    <span><b>${esc(b.symbol)}</b><small>Soberano USD</small></span>
    <span><small>TIR</small><b>${Number.isFinite(b.tir)?fmt(b.tir,2)+'%':'—'}</b></span>
    <span><small>Paridad</small><b>${Number.isFinite(b.paridad)?fmt(b.paridad,1)+'%':'—'}</b></span>
    <span><small>Duration</small><b>${fmt(b.duration,2)}</b></span>
  </button>`).join('');
  h.querySelectorAll('[data-bond]').forEach(el=>el.addEventListener('click',()=>{
    const sym=el.dataset.bond;
    if(typeof window.loadBondAnalysis==='function')window.loadBondAnalysis(sym,'argbond');
    else {$('fixedIncomeBtn')?.click()}
  }));
}

function portfolioAttention(){
  const cfg=window.RadarState?.config?.watchlist||[],res=window.RadarState?.watchResults||{};
  const held=cfg.filter(x=>x.inPortfolio);
  const rows=[];
  for(let i=0;i<cfg.length;i++){
    const item=cfg[i];if(!item.inPortfolio)continue;
    let r=null,d=null;
    try{const k=typeof window.watchKey==='function'?window.watchKey(item):null;r=k?res[k]:null}catch{}
    try{if(typeof window.portfolioDecision==='function')d=window.portfolioDecision(item,r)}catch{}
    if(d&&['exit','reduce','watch'].includes(d.key))rows.push({item,d,i});
  }
  return{held,rows:rows.sort((a,b)=>({exit:0,reduce:1,watch:2}[a.d.key]??9)-({exit:0,reduce:1,watch:2}[b.d.key]??9))};
}
function renderPortfolio(){
  const {held,rows}=portfolioAttention();
  $('ibPortfolio').textContent=String(held.length);
  $('ibPortfolioSub').textContent=rows.length?`${rows.length} requieren revisión`:'Sin alertas críticas calculadas';
  const h=$('investorPortfolioList');if(!h)return;
  if(!held.length){h.innerHTML='<div class="investor-empty">No hay posiciones marcadas como cartera. Cartera 360 conserva todas sus funciones.</div>';return}
  if(!rows.length){h.innerHTML='<div class="investor-empty strong">No hay posiciones con salida/reducción/vigilancia en el último estado calculado.</div>';return}
  h.innerHTML=rows.slice(0,5).map(x=>`<button class="investor-portfolio-item" data-watch-index="${x.i}">
    <span><b>${esc(x.item.symbol)}</b><small>${esc(x.item.type||'')}</small></span>
    <strong class="${esc(x.d.key)}">${esc(x.d.label||x.d.key)}</strong>
    <em>${esc(short(x.d.why,120))}</em>
  </button>`).join('');
  h.querySelectorAll('[data-watch-index]').forEach(el=>el.addEventListener('click',()=>{
    if(typeof window.openWatchItem==='function')window.openWatchItem(Number(el.dataset.watchIndex));
    else $('portfolioViewBtn')?.click();
  }));
}

function saveSnapshot(){
  try{
    const snap={
      at:Date.now(),
      context:{
        risk:num(window.RadarDashboardData?.risk?.value),
        mep:num(window.RadarDashboardData?.fx?.mep?.venta),
        ccl:num(window.RadarDashboardData?.fx?.ccl?.venta)
      },
      results:state.results.map(r=>({symbol:r.item?.symbol,type:r.item?.type,kind:r.status?.kind,score:num(r.status?.oppScore),price:num(r.price)}))
    };
    const prev=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'null');
    localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(snap));
    state.previous=prev;
  }catch{}
}

async function refresh(force=false){
  if(state.running)return;
  if(!force&&state.updatedAt&&Date.now()-state.updatedAt<5*60*1000)return;
  state.running=true;state.errors=[];
  const btn=$('investorBriefRefresh');if(btn){btn.disabled=true;btn.textContent='Actualizando…'}
  $('investorBriefStatus').textContent='Actualizando contexto, universos líquidos, oportunidades y cartera…';
  renderContext();renderPortfolio();
  try{
    const discovered=await discoverUniverse();state.universe=discovered.meta;
    const scanned=await runScans(discovered.items);state.results=scanned.results;state.errors.push(...scanned.errors);
    renderOpportunities();await loadBonds();renderPortfolio();renderContext();
    state.updatedAt=Date.now();saveSnapshot();
    $('investorBriefWhen').textContent=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
    const actionable=state.results.filter(r=>['buy','near','sell'].includes(r?.status?.kind)).length;
    $('investorBriefStatus').textContent=
      `${state.results.length} activos con análisis · ${actionable} hallazgos accionables · universos: ${state.universe.crypto||0} cripto, ${state.universe.cedear||0} CEDEAR, ${state.universe.arg||0} acciones AR`+
      (state.errors.length?` · ${state.errors.length} sin datos`:'');
  }catch(e){
    state.errors.push({area:'brief',error:String(e?.message||e)});
    $('investorBriefStatus').textContent='La lectura automática no pudo completarse: '+String(e?.message||e)+'. Los módulos completos siguen disponibles.';
  }finally{
    state.running=false;if(btn){btn.disabled=false;btn.textContent='Actualizar lectura'}
  }
}


function foldLegacyMarketWorkspace(){
  const dashboard=$('dashboardView');
  if(!dashboard||$('v7AdvancedMarket'))return;
  const details=document.createElement('details');
  details.id='v7AdvancedMarket';
  details.className='v7-advanced-market';
  details.innerHTML=`
    <summary>
      <span>
        <b>Mercado e inteligencia avanzada</b>
        <small>Centro de decisión, panorama macro, breadth, tasas, curvas, mercados de referencia e informe diario</small>
      </span>
      <span class="v7-advanced-action">Abrir workspace completo</span>
    </summary>
    <div class="v7-advanced-market-body"></div>`;
  dashboard.appendChild(details);
  const body=details.querySelector('.v7-advanced-market-body');
  [...dashboard.children].forEach(el=>{
    if(el!==$('investorBrief')&&el!==details)body.appendChild(el);
  });
  details.addEventListener('toggle',()=>{
    const action=details.querySelector('.v7-advanced-action');
    if(action)action.textContent=details.open?'Cerrar workspace completo':'Abrir workspace completo';
    if(details.open)setTimeout(()=>window.dispatchEvent(new Event('resize')),60);
  });
}

function improveWorkspaceHeaders(){
  const scannerTitle=document.querySelector('#scannerView .scan-toolbar h2');
  if(scannerTitle)scannerTitle.textContent='Oportunidades · Renta variable y cripto';
  const rfTitle=document.querySelector('#rfScannerView h2');
  if(rfTitle&&/renta fija/i.test(rfTitle.textContent||''))rfTitle.textContent='Oportunidades · Renta fija';
  const title=$('viewTitle'),sub=$('viewSubtitle');
  if(title&&title.textContent==='Mercados')title.textContent='Resumen';
  if(sub)sub.textContent='Contexto, oportunidades, cartera y acceso a los motores completos';
}

function apply(){
  document.documentElement.classList.add('radar-v7');
  mountSignalsView();relabelNavigation();mountBrief();foldLegacyMarketWorkspace();improveWorkspaceHeaders();renderContext();renderPortfolio();
  setTimeout(()=>refresh(false),4500);
  setInterval(()=>{renderContext();renderPortfolio()},30000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
window.RadarInvestorWorkspace=Object.freeze({version:VERSION,state,refresh});
})();