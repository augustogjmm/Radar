(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const fmtMoney=v=>Number.isFinite(Number(v))?'$ '+Number(v).toLocaleString('es-AR',{maximumFractionDigits:2}):'—';
  const fmtPct=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%':'—';

  function setView(id){
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
    const names={overview:'Resumen',opportunities:'Oportunidades','fixed-income':'Renta fija',portfolio:'Cartera'};
    if($('pageTitle')) $('pageTitle').textContent=names[id]||'Radar';
  }

  async function json(url,timeout=18000){
    const ac=new AbortController();
    const t=setTimeout(()=>ac.abort(),timeout);
    try{
      const r=await fetch(url,{cache:'no-store',signal:ac.signal});
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    }finally{clearTimeout(t)}
  }

  function renderHealth(h){
    const el=$('dataState');
    if(!el)return;
    const checks=Array.isArray(h?.checks)?h.checks:[];
    const critical=checks.filter(x=>x.critical!==false);
    const bad=critical.filter(x=>!x.ok);
    const cls=h?.ok&&bad.length===0?'ok':bad.length?'bad':'warn';
    el.className='data-state '+cls;
    el.querySelector('span').textContent=cls==='ok'?'Datos en línea':cls==='bad'?('Datos degradados · '+bad.length):'Datos parciales';
    const box=$('systemChecks');
    if(box){
      box.innerHTML=checks.length?checks.map(x=>`
        <div class="check ${x.ok?'ok':'bad'}">
          <b>${x.ok?'✓':'✕'} ${String(x.name||'Fuente')}</b>
          <span>${String(x.detail||x.error||'Sin detalle')}</span>
        </div>`).join(''):'Sin detalle de proveedores.';
    }
  }

  async function loadContext(){
    $('contextUpdated').textContent='Actualizando…';
    const [health,core,risk]=await Promise.allSettled([
      json('/api/health/deep',45000),
      json('/api/dashboard/core'),
      json('/api/dashboard/risk')
    ]);

    if(health.status==='fulfilled')renderHealth(health.value);
    else{
      const el=$('dataState');el.className='data-state bad';el.querySelector('span').textContent='Error de datos';
      $('systemChecks').textContent=String(health.reason?.message||health.reason||'No se pudo validar');
    }

    if(core.status==='fulfilled'){
      const d=core.value||{},fx=d.fx||{};
      $('mepValue').textContent=fmtMoney(fx.mep?.venta);
      $('cclValue').textContent=fmtMoney(fx.ccl?.venta);
      $('inflationValue').textContent=fmtPct(d.inflation?.value);
      $('inflationMeta').textContent=d.inflation?.period||'Último IPC';
      $('contextUpdated').textContent=d.updated?new Date(d.updated).toLocaleString('es-AR'):'Actualizado';
    }else{
      $('mepMeta').textContent='Sin dato';
      $('cclMeta').textContent='Sin dato';
      $('inflationMeta').textContent='Sin dato';
      $('contextUpdated').textContent='Carga parcial';
    }

    if(risk.status==='fulfilled'){
      const d=risk.value||{};
      const value=Number(d.value??d.risk?.value??d.current);
      $('riskValue').textContent=Number.isFinite(value)?value.toLocaleString('es-AR',{maximumFractionDigits:0}):'—';
      $('riskMeta').textContent=d.source||d.status||'Riesgo soberano';
    }else $('riskMeta').textContent='Sin dato';
  }

  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.go)));
  $('refreshOverview')?.addEventListener('click',loadContext);
  $('systemStatusBtn')?.addEventListener('click',()=>$('systemDialog')?.showModal());
  $('closeSystem')?.addEventListener('click',()=>$('systemDialog')?.close());
  $('assetSearch')?.addEventListener('submit',e=>{
    e.preventDefault();
    const symbol=$('assetSymbol')?.value.trim().toUpperCase();
    if(!symbol)return;
    const target=new URL('/',location.origin);
    target.searchParams.set('symbol',symbol);
    location.href=target.toString();
  });

  loadContext().catch(err=>{
    console.error('Radar V6 context',err);
    const el=$('dataState');if(el){el.className='data-state bad';el.querySelector('span').textContent='Error de datos'}
  });
})();