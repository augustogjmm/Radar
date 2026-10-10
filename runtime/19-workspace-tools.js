/* Shared navigation, data status and advisor tools across the core workspaces. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const views = [['home','Inicio'],['opportunities','Oportunidades'],['scanner','Escáner'],['fixed','Renta fija'],['watch','Seguimiento'],['portfolio','Cartera'],['history','Historial']];
const controls = {home:'homeViewBtn',scanner:'scannerViewBtn',fixed:'fixedIncomeBtn',watch:'watchlistViewBtn',portfolio:'portfolioViewBtn',history:'signalsViewBtn'};
function activeView() {
 if ($('rtTopOpportunities') && !$('rtTopOpportunities').hidden) return 'opportunities';
 if ($('rtWatchlistWorkstation') && !$('rtWatchlistWorkstation').hidden) return 'watch';
 if ($('scannerView')?.classList.contains('active')) return 'scanner';
 if ($('rfScannerView')?.classList.contains('active')) return 'fixed';
 if ($('signalsView')?.classList.contains('active')) return 'history';
 if ($('watchlistView')?.classList.contains('active')) return $('watchlistView').classList.contains('mode-portfolio') ? 'portfolio' : 'watch';
 if ($('analysisView') && !$('analysisView').classList.contains('hidden')) return 'analysis';
 return 'home';
}
function navigate(view) {
 window.RadarTopOpportunities?.close();window.RadarWatchlistWorkstation?.close();
 window.RadarGlobalCommandCenter?.resetContext();
 document.getElementById('rtRegionalDecisionCenter')?.setAttribute('hidden','');document.body.classList.remove('rt-rdc-open');
 if(view==='opportunities')window.RadarTopOpportunities?.open();
 else $(controls[view])?.click();
 sync();
}
const utility = () => `<div class="radar-utilitybar"><div class="radar-data-status" role="status"><b>Verificando datos</b><span>La fuente puede publicar con demora.</span></div><div class="radar-utility-actions"><button type="button" data-radar-tool="export" title="Descargar un informe del análisis abierto">Exportar análisis</button><button type="button" data-radar-tool="backup">Guardar respaldo</button><button type="button" data-radar-tool="restore">Recuperar respaldo</button><button type="button" data-radar-tool="help">Cómo usar Radar</button></div></div>`;
function install() {
 const panel=document.querySelector('#analysisView .position-panel');
 if(panel&&!panel.closest('.radar-position-tools')) {
  const details=document.createElement('details');details.className='radar-position-tools';
  const summary=document.createElement('summary');summary.textContent='Calcular tamaño de posición y riesgo';details.append(summary);
  panel.replaceWith(details);details.append(panel);
 }
 for(const nav of document.querySelectorAll('.rt-nav,.rto-nav,.rtw-nav,.rdc-nav')) {
  if(nav.dataset.radarUnified)continue;
  nav.dataset.radarUnified='true';nav.setAttribute('aria-label','Navegación principal');
  nav.innerHTML=views.map(([key,label])=>`<button type="button" data-radar-view="${key}">${label}</button>`).join('');
 }
 for(const header of document.querySelectorAll('#rtGlobalAppbar,.rto-topbar,.rtw-topbar,.rdc-topbar')) {
  if(header.nextElementSibling?.classList.contains('radar-utilitybar'))continue;
  header.insertAdjacentHTML('afterend',utility());
 }
 sync();
}
function sync() {
 const view=activeView();document.body.dataset.radarCurrentView=view;
 for(const button of document.querySelectorAll('[data-radar-view]')) {
  const active=button.dataset.radarView===view;
  button.classList.toggle('active',active);
  if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
 if(view==='analysis'&&typeof state!=='undefined'&&state.analyses?.[state.currentKey]){
  const a=state.analyses[state.currentKey],q=window.RadarMarketData?.quality(a.data);
  if(q&&!window.RadarMarketData.canSignal(a.data,q)&&$('setupStatus')?.textContent!=='DATOS SIN VALIDAR')renderChart(state.currentKey);
 }
 const records=window.RadarMarketData?.summary()||[], verified=records.filter(x=>x.state==='verified').length, stale=records.filter(x=>x.state==='stale').length, missing=records.filter(x=>x.state==='unavailable').length;
 const dataState=missing||stale?'partial':verified?'verified':'unknown';
 const label=dataState==='partial'?'Datos parciales':dataState==='verified'?'Datos consultados':'Sin datos validados';
 const detail=dataState==='partial'?`${stale} consulta(s) con datos antiguos · ${missing} sin respuesta. Actualizá antes de operar.`:dataState==='verified'?'La hora de consulta no garantiza cotización en tiempo real.':'Buscá un activo o actualizá el mercado para consultar sus fuentes.';
 for(const status of document.querySelectorAll('.radar-data-status')) {
  if(status.dataset.state!==dataState)status.dataset.state=dataState;
  if(status.querySelector('b').textContent!==label)status.querySelector('b').textContent=label;
  if(status.querySelector('span').textContent!==detail)status.querySelector('span').textContent=detail;
 }
 for(const button of document.querySelectorAll('[data-radar-tool="export"]'))button.disabled=view!=='analysis';
 for(const label of document.querySelectorAll('.rtw-live,.rto-live,.rdc-live')) {
  if(label.textContent!== 'Datos públicos · pueden tener demora')label.textContent='Datos públicos · pueden tener demora';
 }
}
function help() {
 let dialog=$('radarGuide');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='radarGuide';dialog.className='radar-guide';
  dialog.innerHTML=`<form method="dialog"><header><div><small>RADAR TÉCNICO</small><h2>De una oportunidad a una decisión</h2></div><button aria-label="Cerrar ayuda">Cerrar</button></header></form>
  <ol><li><b>Encontrá un candidato.</b> Oportunidades ordena activos; el escáner permite elegir mercado y temporalidad. “Posible” significa que todavía falta confirmación.</li><li><b>Entendé el análisis.</b> Revisá tendencia, motivos y fecha de los datos. Un score resume condiciones técnicas; no es una probabilidad de ganar.</li><li><b>Definí el riesgo.</b> Una entrada necesita confirmación. El stop indica dónde se invalida la idea; los objetivos y la relación riesgo/beneficio son estimaciones. Comisiones y deslizamiento pueden cambiar el resultado.</li><li><b>Hacé seguimiento.</b> Guardá el activo en Seguimiento. Cargá una posición en Cartera sólo si refleja una operación real.</li></ol>
  <section><h3>Si una fuente deja de responder</h3><p>Radar conserva el último dato disponible como referencia. Las señales con datos sin validar quedan suspendidas: un gráfico antiguo no habilita una operación nueva.</p></section>
  <section><h3>Tus datos se guardan en este navegador</h3><p>Seguimiento, cartera e historial no se sincronizan automáticamente entre dispositivos. “Guardar respaldo” descarga una copia para recuperar tus datos. La recuperación pide confirmar antes de reemplazar tu configuración.</p></section>
  <footer>Gráficos con <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView Lightweight Charts™</a>, Apache 2.0. <a href="/assets/vendor/NOTICE-lightweight-charts">Atribución</a>.</footer>`;
  document.body.append(dialog);
 }
 dialog.showModal();
}
function exportAnalysis() {
 if(typeof state==='undefined'||!state.analyses?.[state.currentKey]){window.radarNotify?.('Abrí un análisis antes de exportar.','warn');return;}
 const analysis=state.analyses[state.currentKey],q=window.RadarMarketData?.quality(analysis.data),valid=window.RadarMarketData?.canSignal(analysis.data,q),plan=computeTradePlan(analysis);
 const number=n=>Number.isFinite(n)?new Intl.NumberFormat('es-AR',{maximumFractionDigits:4}).format(n):'No disponible';
 const lines=['RADAR TÉCNICO · INFORME DE ANÁLISIS',`Activo: ${state.symbol}`,`Mercado: ${state.type}`,`Temporalidad: ${state.tfs?.[state.currentKey]?.label||state.currentKey}`,`Fuente: ${state.source||'No identificada'}`,`Última consulta válida: ${q?.observedAt?new Date(q.observedAt).toLocaleString('es-AR'):'Sin validar'}`,`Última vela: ${analysis.data?.at(-1)?.time?new Date(analysis.data.at(-1).time*1000).toLocaleString('es-AR'):'Sin fecha'}`,`Datos: ${valid?'Consultados; verificar cotización antes de operar':'SIN VALIDAR · señal suspendida'}`,`Precio de referencia: ${number(analysis.c)}`,`Tendencia: ${analysis.trend||'Sin definir'}`,'',`Estado: ${plan?.status||'Sin setup'}`,`Dirección: ${plan?.direction||'Sin setup'}`,`Score técnico: ${number(plan?.score)}/100 (no es probabilidad de ganancia)`,`Zona de entrada: ${number(plan?.entryLow)} – ${number(plan?.entryHigh)}`,`Confirmación: ${number(plan?.trigger)}`,`Stop: ${number(plan?.stop)}`,`Objetivo 1: ${number(plan?.tp1)}`,`Objetivo 2: ${number(plan?.tp2)}`,`Riesgo/beneficio: ${number(plan?.rr1)}`,'','MOTIVOS',...(plan?.why||[]),'',`Próximo paso: ${plan?.action||'Esperar datos suficientes'}`,`Invalidación: ${plan?.invalidation||'Sin idea activa'}`,'','Las condiciones técnicas no garantizan rendimientos. Revisar costos, liquidez y adecuación de la posición.'];
 const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=`radar_${String(state.symbol).replace(/[^A-Za-z0-9_-]/g,'_')}_${state.currentKey}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-radar-view],[data-radar-tool]');if(!button)return;
 if(button.dataset.radarView){navigate(button.dataset.radarView);return;}
 const action=button.dataset.radarTool;
 if(action==='help')help();
 if(action==='export')exportAnalysis();
 if(action==='backup'&&typeof exportRadarBackup==='function')exportRadarBackup();
 if(action==='restore')$('importRadarFile')?.click();
});
let scheduled=false;
const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;install()});});
function boot(){install();observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});}
window.addEventListener('radar:data-quality',sync);
setInterval(sync,15000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.RadarWorkspace=Object.freeze({navigate,sync,exportAnalysis});
})();
