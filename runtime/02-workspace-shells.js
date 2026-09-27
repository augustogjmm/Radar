/* Radar Tecnico G2 - Workspace shells and app chrome
   Extracted from certified runtime; order preserved. */

/* ===== RUNTIME BLOCK 6 ===== */
(()=>{
  'use strict';
  const VERSION='9J';
  const MARKET_COMMAND_HTML="  <div id=\"dashboardView\" class=\"dashboard-view\">\n    <div class=\"dash-head\">\n      <div><h2>Panel de mercado</h2><p>Contexto argentino y variables que pueden mover renta variable, renta fija y dólar. Hacé clic en una tarjeta para ver su evolución.</p></div>\n      <div class=\"dash-head-actions\"><span id=\"dashUpdated\" class=\"dash-updated\">Listo</span><button id=\"dashRefreshBtn\" class=\"secondary-action\">Actualizar</button></div>\n    </div>\n    <div id=\"dashLoadingPanel\" class=\"dash-loading-panel\">\n      <div class=\"dash-loader-row\"><div class=\"dash-loader-main\"><span class=\"dash-spinner\"></span><div><div id=\"dashLoadingTitle\" class=\"dash-loader-title\">Cargando panel…</div><div id=\"dashLoadingSub\" class=\"dash-loader-sub\">Radar sigue trabajando. Podés usar el resto de la aplicación mientras completa las fuentes.</div></div></div>\n      <div class=\"dash-load-steps\"><span id=\"dashStepCore\" class=\"dash-load-step\">Mercado</span><span id=\"dashStepHist\" class=\"dash-load-step\">Históricos</span><span id=\"dashStepRisk\" class=\"dash-load-step\">Riesgo país</span></div></div>\n    </div>\n    <div class=\"dash-kpis\">\n      <div class=\"dash-kpi\" data-dash-series=\"risk\" tabindex=\"0\"><small>Riesgo país</small><div id=\"dashRiskValue\" class=\"dash-value\">—</div><div id=\"dashRiskTrend\" class=\"dash-trend flat\">—</div><div id=\"dashRiskSub\" class=\"dash-sub\">Esperando dato…</div><div id=\"dashRiskSource\" class=\"dash-source\">—</div></div>\n      <div class=\"dash-kpi\" data-dash-series=\"mep\" tabindex=\"0\"><small>Dólar MEP · venta</small><div id=\"dashMepValue\" class=\"dash-value\">—</div><div id=\"dashMepTrend\" class=\"dash-trend flat\">—</div><div id=\"dashMepSub\" class=\"dash-sub\">Compra / venta</div><div id=\"dashMepSource\" class=\"dash-source\">DolarApi</div></div>\n      <div class=\"dash-kpi\" data-dash-series=\"ccl\" tabindex=\"0\"><small>Dólar CCL · venta</small><div id=\"dashCclValue\" class=\"dash-value\">—</div><div id=\"dashCclTrend\" class=\"dash-trend flat\">—</div><div id=\"dashCclSub\" class=\"dash-sub\">Compra / venta</div><div id=\"dashCclSource\" class=\"dash-source\">DolarApi</div></div>\n      <div class=\"dash-kpi\" data-dash-series=\"inflation\" tabindex=\"0\"><small>Inflación oficial · último IPC</small><div id=\"dashInflValue\" class=\"dash-value\">—</div><div id=\"dashInflTrend\" class=\"dash-trend flat\">—</div><div id=\"dashInflSub\" class=\"dash-sub\">INDEC</div><div id=\"dashInflSource\" class=\"dash-source\">—</div></div>\n    </div>\n    <div class=\"dash-official-strip\">\n      <div class=\"dash-official-left\"><span class=\"dash-ref\">DÓLAR OFICIAL</span><b id=\"dashOfficialValue\">—</b><span id=\"dashOfficialTrend\" class=\"dash-trend flat\">—</span><span id=\"dashOfficialDate\" class=\"dash-ref\">—</span></div>\n      <div class=\"dash-official-right\"><span class=\"dash-ref\">BRECHA CCL / OFICIAL</span><b id=\"dashCclGap\">—</b><button id=\"dashOfficialChartBtn\" class=\"secondary-action compact-action\">Ver gráfico oficial</button></div>\n    </div>\n    <div id=\"dashDetail\" class=\"dash-detail\">\n      <div class=\"dash-detail-head\">\n        <div><div id=\"dashDetailTitle\" class=\"dash-detail-title\">Evolución</div><div id=\"dashDetailMeta\" class=\"dash-detail-meta\">—</div></div>\n        <div class=\"dash-series-tabs\">\n          <button data-series-tab=\"risk\">Riesgo país</button><button data-series-tab=\"mep\">MEP</button><button data-series-tab=\"ccl\">CCL</button><button data-series-tab=\"official\">Oficial</button><button data-series-tab=\"inflation\">Inflación</button><button id=\"dashDetailClose\">Cerrar</button>\n        </div>\n      </div>\n      <div id=\"dashChartLegend\" class=\"dash-chart-legend\">\n        <span class=\"dash-legend-item dash-legend-main\"><span class=\"dash-legend-swatch\"></span><b id=\"dashLegendMain\">Serie</b></span>\n        <span class=\"dash-legend-item dash-legend-fast\"><span class=\"dash-legend-swatch\"></span><b id=\"dashLegendFast\">EMA 20</b></span>\n        <span class=\"dash-legend-item dash-legend-slow\"><span class=\"dash-legend-swatch\"></span><b id=\"dashLegendSlow\">EMA 50</b></span>\n        <span id=\"dashLegendNote\" class=\"dash-legend-note\">Las medias suavizan el movimiento y ayudan a ver la tendencia.</span>\n      </div>\n      <div id=\"dashMacroChart\"></div>\n      <div class=\"dash-chart-foot\"><div id=\"dashChartRead\" class=\"dash-chart-read\">—</div><div class=\"dash-data-rule\">Radar no inventa OHLC: si la fuente sólo publica un dato diario o mensual, muestra una serie de cierre con estética TradingView en lugar de fabricar velas.</div></div>\n    </div>\n    \n\n\n\n    <div id=\"decisionCenter\" class=\"decision-center v74 alloc-rpt-shell decision-premium-shell\">\n      <div class=\"decision-head alloc-rpt-head decision-premium-head\">\n        <div class=\"alloc-rpt-head-main\"><div class=\"alloc-rpt-doc-icon\">◆</div><div><div class=\"alloc-rpt-title-line\"><h2>Centro de Decisión</h2><span class=\"alloc-rpt-ready ok\">RADAR EJECUTIVO</span></div><p>Contexto <i></i> oportunidades <i></i> cartera <i></i> acción priorizada</p></div></div>\n        <div class=\"watch-actions decision-premium-actions\">\n          <button class=\"secondary-action\" onclick=\"showScannerView()\">Escanear RV</button>\n          <button class=\"secondary-action\" onclick=\"showFixedIncomeScanner()\">Escanear RF</button>\n          <button class=\"secondary-action\" onclick=\"showPortfolioView()\">Cartera</button>\n          <button class=\"secondary-action\" onclick=\"showSignalsView()\">Historial</button>\n        </div>\n      </div>\n\n      <div class=\"decision-v74-top\">\n        <div id=\"decisionVision\" class=\"decision-vision neutral\">\n          <div class=\"decision-vision-head\">\n            <span class=\"decision-vision-title\">Visión general del mercado</span>\n            <span id=\"decisionFreshness\" class=\"intel-chip neutral\">Sin scanners recientes</span>\n          </div>\n          <div class=\"decision-vision-main\">\n            <span id=\"decisionVisionScore\" class=\"decision-vision-score\">50</span>\n            <span id=\"decisionVisionLabel\" class=\"decision-vision-label\">NEUTRAL</span>\n          </div>\n          <div id=\"decisionVisionWhy\" class=\"decision-vision-why\">Esperando contexto suficiente.</div>\n        </div>\n\n        <div class=\"decision-v74-metrics\">\n          <div class=\"decision-v74-metric\"><small>Atención hoy</small><b id=\"decisionAttention\">0</b></div>\n          <div class=\"decision-v74-metric\"><small>Oportunidades RV/Crypto</small><b id=\"decisionRv\">0</b></div>\n          <div class=\"decision-v74-metric\"><small>Renta fija</small><b id=\"decisionRf\">0</b></div>\n          <div class=\"decision-v74-metric\"><small>Cartera en riesgo</small><b id=\"decisionPortfolioRisk\" class=\"red\">0</b></div>\n          <div class=\"decision-v74-metric\"><small>Sin acción requerida</small><b id=\"decisionNoAction\">0</b></div>\n          <div class=\"decision-v74-metric\"><small>Calidad de datos</small><b id=\"decisionQuality\">—</b></div>\n        </div>\n      </div>\n      <div class=\"premium-analytics-card decision-analytics-card\"><div class=\"premium-analytics-head\"><div><h4>Composición del radar</h4><span>Oportunidades, renta fija y estado de cartera en una lectura visual.</span></div><span class=\"premium-analytics-chip\">HOY</span></div><div id=\"decisionMixVisual\"></div></div>\n\n      <section class=\"alloc-rpt-card decision-premium-section decision-premium-attention\">\n        <div class=\"alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">◇</span><h3>Qué merece atención hoy</h3><small>Ranking accionable sin mezclar metodologías entre clases de activo.</small></div><span id=\"decisionRankingNote\" class=\"alloc-rpt-chip\">Ejecutá los scanners</span></div>\n        <div id=\"decisionList\" class=\"decision-ranking\">\n          <div class=\"decision-empty-v74\">Todavía no hay resultados actuales. Ejecutá Scanner RV/Crypto y Scanner RF; las posiciones de cartera aparecen automáticamente.</div>\n        </div>\n      </section>\n\n      <section class=\"alloc-rpt-card decision-premium-section decision-premium-portfolio\">\n        <div class=\"alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">▣</span><h3>Tu cartera</h3><small>Estado técnico de posiciones reales marcadas “En cartera”.</small></div><span class=\"alloc-rpt-chip\">POSICIONES REALES</span></div>\n        <div id=\"decisionPortfolioList\" class=\"decision-portfolio\">\n          <div class=\"decision-empty-v74\">No hay posiciones cargadas o todavía no fueron actualizadas.</div>\n        </div>\n      </section>\n\n      <div class=\"decision-footnote\">\n        DATO = observación medible. ANÁLISIS = lectura de Radar. DECISIÓN = clasificación. ACCIÓN = siguiente paso sugerido por la lógica del sistema.\n        Para renta fija se mantiene TIR/paridad/duration/cashflows; para RV/crypto se mantiene análisis técnico; no se intercambian criterios entre clases de activo.\n      </div>\n    </div>\n\n    <div class=\"daily-brief alloc-rpt-card daily-premium-card\">\n      <div class=\"daily-brief-head alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">↻</span><h3>Informe diario</h3><small>Qué cambió desde la última rueda · contexto, cartera, riesgos y oportunidades.</small></div><button id=\"copyDailyBriefBtn\" class=\"secondary-action\">Copiar informe</button></div>\n      <div class=\"daily-brief-grid\"><div class=\"brief-box\"><small>Mercado</small><b id=\"briefMarket\">—</b></div><div class=\"brief-box\"><small>Cartera</small><b id=\"briefPortfolio\">—</b></div><div class=\"brief-box\"><small>Riesgos</small><b id=\"briefRisks\">—</b></div><div class=\"brief-box\"><small>Oportunidades</small><b id=\"briefOpportunities\">—</b></div></div>\n      <div id=\"briefChanges\" class=\"brief-changes\">Esperando datos suficientes.</div>\n    </div>\n\n    <div class=\"card intel-wrap alloc-rpt-card premium-section-shell\">\n      <div class=\"intel-head\">\n        <div><h3>INTELIGENCIA DE MERCADOS</h3><div class=\"intel-sub\">Régimen global, amplitud de mercado, tasas argentinas y curvas. Este contexto se incorpora automáticamente al <b>Score Oportunidad</b> del scanner sin reemplazar el análisis técnico.</div></div>\n        <div class=\"market-board-actions\"><span id=\"intelStatus\" class=\"intel-status\">Esperando carga…</span><button id=\"intelRefresh\" class=\"secondary-action intel-refresh\">Actualizar contexto</button></div>\n      </div>\n      <div class=\"intel-grid\">\n        <div class=\"intel-card\">\n          <div class=\"intel-title\"><span>Régimen global</span><span id=\"regimeChip\" class=\"intel-chip neutral\">—</span></div>\n          <div id=\"regimeValue\" class=\"intel-value\">—</div><div id=\"regimeLabel\" class=\"intel-label\">S&P 500, VIX, DXY, Treasury 10Y, WTI, riesgo país y breadth.</div>\n          <div class=\"intel-progress\"><div id=\"regimeBar\" style=\"width:50%\"></div></div><ul id=\"regimeReasons\" class=\"intel-list\"><li>Cargando componentes…</li></ul>\n        </div>\n        <div class=\"intel-card\">\n          <div class=\"intel-title\"><span>Breadth Argentina</span><span id=\"breadthArChip\" class=\"intel-chip neutral\">—</span></div>\n          <div id=\"breadthArValue\" class=\"intel-value\">—</div><div id=\"breadthArLabel\" class=\"intel-label\">GGAL, YPFD, PAMP, BMA, BBAR y TXAR: avance/caída y % sobre EMA20/50/200.</div>\n          <div id=\"breadthArBar\" class=\"breadth-bar\"></div><div id=\"breadthArMini\" class=\"intel-mini\"></div>\n        </div>\n        <div class=\"intel-card\">\n          <div class=\"intel-title\"><span>Breadth USA</span><span id=\"breadthUsChip\" class=\"intel-chip neutral\">—</span></div>\n          <div id=\"breadthUsValue\" class=\"intel-value\">—</div><div id=\"breadthUsLabel\" class=\"intel-label\">Muestra: AAPL, MSFT, NVDA, JPM, XOM y WMT.</div>\n          <div id=\"breadthUsBar\" class=\"breadth-bar\"></div><div id=\"breadthUsMini\" class=\"intel-mini\"></div>\n        </div>\n        <div class=\"intel-card\">\n          <div class=\"intel-title\"><span>Contexto del scanner</span><span id=\"scannerCtxChip\" class=\"intel-chip neutral\">NEUTRAL</span></div>\n          <div id=\"scannerCtxValue\" class=\"intel-value\">±0</div><div class=\"intel-label\">Ajuste máximo orientativo sobre Score Oportunidad. El técnico sigue siendo la base.</div>\n          <ul id=\"scannerCtxReasons\" class=\"intel-list\"><li>Se activa al terminar régimen + breadth.</li></ul>\n        </div>\n        <div class=\"intel-card wide\">\n          <div class=\"intel-title\"><span>Tasas y referencias Argentina</span><span id=\"ratesChip\" class=\"intel-chip neutral\">BCRA / BYMA</span></div>\n          <div id=\"localRatesGrid\" class=\"intel-rates\"><div class=\"intel-loading\"><span class=\"intel-dot\"></span>Cargando tasas…</div></div>\n          <div id=\"localRatesNote\" class=\"intel-label\">TAMAR, BADLAR, depósitos 30d, CER y UVA. Caución queda fuera de la carga crítica.</div>\n        </div>\n        <div class=\"intel-card wide\">\n          <div class=\"intel-title\"><span>Curvas y spreads</span><span class=\"intel-chip neutral\">USA + Argentina</span></div>\n          <div class=\"curve-grid\">\n            <div class=\"curve-box\"><h4>Curva Treasury USA · yields</h4><div id=\"usCurveChart\"><div class=\"intel-loading\"><span class=\"intel-dot\"></span>Cargando curva…</div></div><div id=\"usCurveSpreads\" class=\"intel-label\"></div></div>\n            <div class=\"curve-box\"><h4>Curva soberana Argentina · TIR USD</h4><div id=\"arCurveChart\"><div class=\"intel-loading\"><span class=\"intel-dot\"></span>Cargando bonos…</div></div><div id=\"arCurveSpreads\" class=\"intel-label\"></div></div>\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"card market-board alloc-rpt-card premium-section-shell\">\n      <div class=\"market-board-head\">\n        <div>\n          <h3>MERCADOS DE REFERENCIA</h3>\n          <div class=\"market-board-sub\">Índices globales, MERVAL $ y S&P Merval USD (MEP), Treasuries de EE.UU., metales, energía, agrícolas y principales monedas. ▲ indica suba y ▼ baja del instrumento; al seleccionar abre velas OHLC con EMA20/EMA50 y volumen cuando la fuente lo informa.</div>\n        </div>\n        <div class=\"market-board-actions\">\n          <span id=\"marketBoardStatus\" class=\"market-board-status\">Esperando carga…</span>\n          <button id=\"marketBoardRefresh\" class=\"secondary-action compact-action\">Actualizar mercados</button>\n        </div>\n      </div>\n      <div class=\"market-filter-row\">\n        <button class=\"market-filter active\" data-market-filter=\"Resumen\">Resumen</button>\n        <button class=\"market-filter\" data-market-filter=\"Índices\">Índices globales</button>\n        <button class=\"market-filter\" data-market-filter=\"Bonos USA\">Treasuries USA</button>\n        <button class=\"market-filter\" data-market-filter=\"Metales\">Metales</button>\n        <button class=\"market-filter\" data-market-filter=\"Energía\">Energía</button>\n        <button class=\"market-filter\" data-market-filter=\"Agrícolas\">Agrícolas</button>\n        <button class=\"market-filter\" data-market-filter=\"FX\">Monedas / FX</button>\n        <button class=\"market-filter\" data-market-filter=\"Todos\">Todos</button>\n      </div>\n      <div id=\"marketCardGrid\" class=\"market-card-grid\"></div>\n      <div class=\"market-board-note\"><b>Lectura:</b> verde/▲ significa que el instrumento sube y rojo/▼ que baja; no significa “bueno” o “malo”. En Treasuries, por ejemplo, una suba del yield implica una lectura distinta a una suba del precio del bono. El gráfico identifica claramente qué serie estás viendo.</div>\n      <div id=\"marketDetail\" class=\"market-detail\">\n        <div class=\"market-detail-head\">\n          <div>\n            <div id=\"marketDetailTitle\" class=\"market-detail-title\">—</div>\n            <div id=\"marketDetailMeta\" class=\"market-detail-meta\">—</div>\n            <div id=\"marketDetailPrice\" class=\"market-detail-price\">—</div>\n          </div>\n          <div class=\"market-tf-row\">\n            <button class=\"market-tf\" data-market-tf=\"15m\">15m</button>\n            <button class=\"market-tf\" data-market-tf=\"1h\">1H</button>\n            <button class=\"market-tf active\" data-market-tf=\"1d\">1D</button>\n            <button class=\"market-tf\" data-market-tf=\"1wk\">1W</button>\n            <button id=\"marketDetailClose\" class=\"secondary-action\">Cerrar</button>\n          </div>\n        </div>\n        <div class=\"market-chart-legend\">\n          <span id=\"marketLegendUp\" class=\"market-legend\"><span class=\"market-legend-box market-legend-up\"></span>Vela alcista</span>\n          <span id=\"marketLegendDown\" class=\"market-legend\"><span class=\"market-legend-box market-legend-down\"></span>Vela bajista</span>\n          <span id=\"marketLegendMain\" class=\"market-legend\" style=\"display:none\"><span class=\"market-legend-line market-legend-index\"></span>Serie índice</span><span class=\"market-legend\"><span class=\"market-legend-line market-legend-ema20\"></span>EMA 20</span>\n          <span class=\"market-legend\"><span class=\"market-legend-line market-legend-ema50\"></span>EMA 50</span>\n          <span id=\"marketLegendVolume\" class=\"market-legend\"><span class=\"market-legend-box market-legend-vol\"></span>Volumen</span>\n        </div>\n        <div id=\"marketCandleChart\"></div>\n        <div id=\"marketChartRead\" class=\"market-chart-read\">Seleccioná un mercado.</div>\n      </div>\n    </div>\n\n  </div>\n";
  function mount(){
    const host=document.getElementById('marketCommandMount');
    if(!host||document.getElementById('dashboardView'))return document.getElementById('dashboardView');
    host.outerHTML=MARKET_COMMAND_HTML;
    return document.getElementById('dashboardView');
  }
  let bound=false;
  function bind(handlers={}){
    if(bound)return false;
    const on=(id,event,fn)=>{const el=document.getElementById(id);if(el&&typeof fn==='function')(window.radarBindAction?window.radarBindAction(el,event,fn,{key:id}):el.addEventListener(event,fn))};
    on('copyDailyBriefBtn','click',handlers.copyDailyBrief);
    on('dashRefreshBtn','click',handlers.refreshDashboard);
    on('marketBoardRefresh','click',handlers.refreshMarkets);
    on('intelRefresh','click',handlers.refreshIntelligence);
    document.querySelectorAll('.market-filter').forEach(btn=>btn.addEventListener('click',()=>handlers.selectMarketFilter?.(btn.dataset.marketFilter||'Resumen')));
    document.querySelectorAll('.market-tf').forEach(btn=>btn.addEventListener('click',()=>handlers.selectMarketTimeframe?.(btn.dataset.marketTf)));
    on('marketDetailClose','click',handlers.closeMarketDetail);
    on('dashOfficialChartBtn','click',()=>handlers.openDashboardSeries?.('official'));
    on('dashDetailClose','click',handlers.closeDashboardDetail);
    document.querySelectorAll('.dash-kpi[data-dash-series]').forEach(card=>{
      card.addEventListener('click',()=>handlers.openDashboardSeries?.(card.dataset.dashSeries));
      card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();handlers.openDashboardSeries?.(card.dataset.dashSeries)}});
    });
    document.querySelectorAll('[data-series-tab]').forEach(btn=>btn.addEventListener('click',()=>handlers.openDashboardSeries?.(btn.dataset.seriesTab)));
    bound=true;return true;
  }
  window.RadarMarketCommandUI=Object.freeze({version:VERSION,mount,bind});
  mount();
})();

;

/* ===== RUNTIME BLOCK 7 ===== */
(()=>{
  "use strict";
  const VERSION='9P';
  const SUMMARY_HTML=`  <div id="dataErrorBanner" class="banner">
    <b>DATOS NO DISPONIBLES:</b> no fue posible obtener cotizaciones reales para este activo. No se muestran datos sintéticos.
  </div>
  <div id="technicalStatusGrid" class="status-grid">
    <div class="card status"><div class="k">MACRO</div><div id="macroVal" class="v amber">—</div><div id="macroTf" class="tf">—</div></div>
    <div class="card status"><div class="k">MEDIO</div><div id="mediumVal" class="v amber">—</div><div id="mediumTf" class="tf">—</div></div>
    <div class="card status"><div class="k">CORTO</div><div id="shortVal" class="v amber">—</div><div id="shortTf" class="tf">—</div></div>
    <div class="card status"><div class="k">MICRO</div><div id="microVal" class="v amber">—</div><div id="microTf" class="tf">—</div></div>
  </div>



`;
  const ASSET_INTELLIGENCE_HTML=`  <div id="analysisView" class="analysis-view">
  <div class="workspace">
    <div class="left-stack">
      <div class="card chart-card">
        <div class="chart-head analysis-chart-head">
          <div class="analysis-identity">
            <div class="analysis-title-line">
              <button id="analysisBackBtn" type="button" class="secondary-action analysis-context-back" hidden>← Volver</button>
              <div id="assetTitle" class="asset-title">BTCUSDT</div>
              <div class="analysis-live-meta">
                <span id="sourceBadge" class="source">sin datos</span>
                <span id="freshnessBadge" class="source">—</span>
              </div>
            </div>
            <div class="analysis-price-line">
              <span id="selectedTf" class="analysis-tf-label">1H</span>
              <span id="lastPrice" class="analysis-last-price">—</span>
              <span id="changePct" class="analysis-change">—</span>
            </div>
            <div class="asset-meta analysis-time-meta">Consultado: <span id="queryTime">—</span><span class="analysis-meta-sep">•</span>Última vela: <span id="lastCandleTime">—</span></div>
            <div id="assetCompanyName" class="asset-company-name">—</div>
            <div id="assetProfile" class="asset-profile"><span class="profile-loading">Cargando información del activo…</span></div>
          </div>
          <div class="controls analysis-controls">
            <div class="analysis-control-block"><span class="analysis-control-label">Temporalidad</span><div id="tfButtons" class="tfs"></div></div>
            <div class="analysis-control-block"><span class="analysis-control-label">Capas</span><div class="toggles">
              <label class="toggle"><input id="showStructure" type="checkbox" checked> Estructura</label>
              <label class="toggle"><input id="showFib" type="checkbox" checked> Fibonacci</label>
              <label class="toggle"><input id="showEma" type="checkbox" checked> EMAs</label>
              <label class="toggle"><input id="showDetails" type="checkbox"> Detalles</label>
            </div></div>
            <div class="legend analysis-legend">
              <span><i class="dot dot-ema20"></i>EMA20</span>
              <span><i class="dot dot-ema50"></i>EMA50</span>
              <span><i class="dot dot-ema200"></i>EMA200</span>
              <span class="analysis-legend-plan">Fib .50/.618 · Entrada · Trigger · Stop · TP1</span>
            </div>
          </div>
        </div>
        <div id="chart"></div>
        <div class="macd-label">MACD 12 · 26 · 9</div>
        <div id="macd"></div>
        <div class="macd-label">VOLUMEN · comparación con media de 20 períodos</div>
        <div id="volume"></div>
      </div>

      <div class="below-grid">
        <div class="card">
          <h3>ANÁLISIS MULTI-TIMEFRAME</h3>
          <div class="analysis-grid">
            <div class="box"><h4>CORTO PLAZO</h4><p id="shortText">—</p></div>
            <div class="box"><h4>MEDIO PLAZO</h4><p id="mediumText">—</p></div>
            <div class="box"><h4>LARGO / MACRO</h4><p id="macroText">—</p></div>
          </div>
        </div>
        <div class="card">
          <h3>ESCENARIOS</h3>
          <div class="scenario"><b>Principal</b><div id="scenarioMain">—</div></div>
          <div class="scenario"><b>Alternativo</b><div id="scenarioAlt">—</div></div>
          <div class="scenario"><b>Regla del motor</b><div id="systemRead">Precio y estructura primero; EMAs, MACD y Fibonacci como contexto y confirmación.</div></div>
        </div>
      </div>

      <div class="below-grid">
        <div class="card">
          <h3>VALIDACIÓN HISTÓRICA PRELIMINAR · TIMEFRAME SELECCIONADO</h3>
          <div class="validation">
            <div class="metric"><small>Setups evaluados</small><b id="btCount">—</b></div>
            <div class="metric"><small>TP1 antes de SL</small><b id="btWins">—</b></div>
            <div class="metric"><small>SL antes de TP1</small><b id="btLosses">—</b></div>
            <div class="metric"><small>Tasa observada</small><b id="btRate">—</b></div>
          </div>
          <div class="note" id="btNote">Walk-forward aproximado sobre la muestra disponible. No es una probabilidad futura ni sustituye un backtest profesional.</div>
        </div>
        <div class="card compact-rule">
          <h3>REGLA CENTRAL</h3>
          <div class="note">Radar no está obligado a producir una operación. Puede responder <b>OPERABLE</b>, <b>ESPERAR CONFIRMACIÓN</b> o <b>SIN SETUP</b>, y siempre debe fundamentar el motivo, indicar qué falta y qué condición invalida la idea.</div>
        </div>
      </div>

      <div id="fundamentalsCard" class="card fund-card">
        <div class="fund-head">
          <div>
            <h3>FUNDAMENTALES</h3>
            <div id="fundContext" class="fund-context fund-context-tight">Se carga automáticamente para acciones y subyacentes de CEDEAR.</div>
          </div>
          <div class="fund-compact-status">
            <span id="fundSource" class="source">—</span>
            <span id="fundPeriod" class="source">—</span>
          </div>
        </div>

        <div class="fund-summary">
          <div class="fund-summary-card primary"><small>Lectura general</small><b id="fundRead" class="amber">—</b><div id="fundCoverage" class="coverage-line">Cobertura: —</div></div>
          <div class="fund-summary-card"><small>Crecimiento ventas</small><b id="sumSalesGrowth">—</b></div>
          <div class="fund-summary-card"><small>ROE</small><b id="sumROE">—</b></div>
          <div class="fund-summary-card"><small>PER</small><b id="sumPE">—</b></div>
          <div class="fund-summary-card"><small>Deuda / Patrimonio</small><b id="sumDebtEq">—</b></div>
          <div class="fund-summary-card"><small>Dividendo</small><b id="sumDividend">—</b></div>
        </div>

        <div class="fund-verdict">
          <div class="verdict-box"><small>Lo más positivo</small><div id="fundPositive">Esperando datos.</div></div>
          <div class="verdict-box"><small>Principal advertencia</small><div id="fundWarning">Esperando datos.</div></div>
        </div>

        <div id="alphaStatus" class="fund-context fund-context-spaced">Alpha Vantage: verificando configuración local…</div>

        <div class="fund-details">
          <details open>
            <summary>VALUACIÓN Y TAMAÑO</summary>
            <div class="fund-details-body">
              <div class="fund-grid">
                <div class="fund-metric"><small>Capitalización bursátil</small><b id="fvMarketCap">—</b></div>
                <div class="fund-metric"><small>Valor empresa</small><b id="fvEV">—</b></div>
                <div class="fund-metric"><small>Ventas TTM</small><b id="fvSales">—</b></div>
                <div class="fund-metric"><small>Resultado TTM</small><b id="fvIncome">—</b></div>
                <div class="fund-metric"><small>PER (P/E)</small><b id="fvPE">—</b></div>
                <div class="fund-metric"><small>PER futuro</small><b id="fvFwdPE">—</b></div>
                <div class="fund-metric"><small>PEG</small><b id="fvPEG">—</b></div>
                <div class="fund-metric"><small>Precio / Ventas</small><b id="fvPS">—</b></div>
                <div class="fund-metric"><small>Precio / Valor libro</small><b id="fvPB">—</b></div>
                <div class="fund-metric"><small>Precio / Flujo caja libre</small><b id="fvPFCF">—</b></div>
                <div class="fund-metric"><small>VE / EBITDA</small><b id="fvEVEBITDA">—</b></div>
                <div class="fund-metric"><small>Precio objetivo</small><b id="fvTarget">—</b></div>
                <div class="fund-metric"><small>Recomendación analistas</small><b id="fvRecom">—</b></div>
              </div>
            </div>
          </details>

          <details>
            <summary>CRECIMIENTO Y RESULTADOS</summary>
            <div class="fund-details-body">
              <div class="fund-grid">
                <div class="fund-metric"><small>BPA (EPS) TTM</small><b id="fvEPS">—</b></div>
                <div class="fund-metric"><small>BPA este año</small><b id="fvEPSThisY">—</b></div>
                <div class="fund-metric"><small>BPA próximo año</small><b id="fvEPSNextY">—</b></div>
                <div class="fund-metric"><small>BPA próximos 5 años</small><b id="fvEPSNext5Y">—</b></div>
                <div class="fund-metric"><small>BPA interanual TTM</small><b id="fvEPSYY">—</b></div>
                <div class="fund-metric"><small>Ventas interanual TTM</small><b id="fvSalesYY">—</b></div>
                <div class="fund-metric"><small>BPA trimestral</small><b id="fvEPSQQ">—</b></div>
                <div class="fund-metric"><small>Ventas trimestral</small><b id="fvSalesQQ">—</b></div>
                <div class="fund-metric"><small>BPA histórico 3 / 5 años</small><b id="fvEPSPast">—</b></div>
                <div class="fund-metric"><small>Ventas históricas 3 / 5 años</small><b id="fvSalesPast">—</b></div>
                <div class="fund-metric"><small>Próximo / último earnings</small><b id="fvEarnings">—</b></div>
              </div>
            </div>
          </details>

          <details>
            <summary>RENTABILIDAD Y CALIDAD</summary>
            <div class="fund-details-body">
              <div class="fund-grid">
                <div class="fund-metric"><small>ROA</small><b id="fvROA">—</b></div>
                <div class="fund-metric"><small>ROE</small><b id="fvROE">—</b></div>
                <div class="fund-metric"><small>ROIC</small><b id="fvROIC">—</b></div>
                <div class="fund-metric"><small>Margen bruto</small><b id="fvGrossMargin">—</b></div>
                <div class="fund-metric"><small>Margen operativo</small><b id="fvOperMargin">—</b></div>
                <div class="fund-metric"><small>Margen neto</small><b id="fvProfitMargin">—</b></div>
                <div class="fund-metric"><small>Liquidez corriente</small><b id="fvCurrent">—</b></div>
                <div class="fund-metric"><small>Prueba ácida</small><b id="fvQuick">—</b></div>
                <div class="fund-metric"><small>Deuda / Patrimonio</small><b id="fvDebtEq">—</b></div>
                <div class="fund-metric"><small>Deuda LP / Patrimonio</small><b id="fvLTDebtEq">—</b></div>
                <div class="fund-metric"><small>Caja por acción</small><b id="fvCashSh">—</b></div>
                <div class="fund-metric"><small>Valor libro por acción</small><b id="fvBookSh">—</b></div>
              </div>
            </div>
          </details>

          <details>
            <summary>ÚLTIMO TRIMESTRE REPORTADO</summary>
            <div class="fund-details-body">
              <div class="fund-grid">
                <div class="fund-metric"><small>Período fiscal</small><b id="avFiscalPeriod">—</b></div>
                <div class="fund-metric"><small>Moneda</small><b id="avCurrency">—</b></div>
                <div class="fund-metric"><small>Ingresos trimestrales</small><b id="avRevenueQ">—</b></div>
                <div class="fund-metric"><small>Ingresos YoY</small><b id="avRevenueGrowth">—</b></div>
                <div class="fund-metric"><small>Beneficio bruto</small><b id="avGrossProfitQ">—</b></div>
                <div class="fund-metric"><small>Resultado operativo</small><b id="avOperatingIncomeQ">—</b></div>
                <div class="fund-metric"><small>Resultado neto</small><b id="avNetIncomeQ">—</b></div>
                <div class="fund-metric"><small>Beneficio YoY</small><b id="avEarningsGrowth">—</b></div>
                <div class="fund-metric"><small>EBITDA</small><b id="avEbitdaQ">—</b></div>
                <div class="fund-metric"><small>BPA reportado</small><b id="avReportedEPS">—</b></div>
                <div class="fund-metric"><small>BPA estimado</small><b id="avEstimatedEPS">—</b></div>
                <div class="fund-metric"><small>Sorpresa BPA</small><b id="avSurprise">—</b></div>
                <div class="fund-metric"><small>Fecha reportado</small><b id="avReportedDate">—</b></div>
              </div>
            </div>
          </details>

          <details>
            <summary>BALANCE Y CASH FLOW</summary>
            <div class="fund-details-body">
              <div class="fund-grid">
                <div class="fund-metric"><small>Activos totales</small><b id="avAssets">—</b></div>
                <div class="fund-metric"><small>Activos corrientes</small><b id="avCurrentAssets">—</b></div>
                <div class="fund-metric"><small>Pasivos totales</small><b id="avLiabilities">—</b></div>
                <div class="fund-metric"><small>Pasivos corrientes</small><b id="avCurrentLiabilities">—</b></div>
                <div class="fund-metric"><small>Patrimonio</small><b id="avEquity">—</b></div>
                <div class="fund-metric"><small>Caja + equivalentes</small><b id="avCash">—</b></div>
                <div class="fund-metric"><small>Inventarios</small><b id="avInventory">—</b></div>
                <div class="fund-metric"><small>Deuda total</small><b id="avDebt">—</b></div>
                <div class="fund-metric"><small>Deuda neta</small><b id="avNetDebt">—</b></div>
                <div class="fund-metric"><small>Liquidez corriente calc.</small><b id="avCurrentRatio">—</b></div>
                <div class="fund-metric"><small>Deuda / Patrimonio calc.</small><b id="avDebtEquity">—</b></div>
                <div class="fund-metric"><small>Acciones en circulación</small><b id="avShares">—</b></div>
                <div class="fund-metric"><small>Flujo de caja operativo</small><b id="avOCF">—</b></div>
                <div class="fund-metric"><small>CAPEX</small><b id="avCapex">—</b></div>
                <div class="fund-metric"><small>Flujo de caja libre</small><b id="avFCF">—</b></div>
                <div class="fund-metric"><small>Dividendos pagados</small><b id="avDividendPayout">—</b></div>
                <div class="fund-metric"><small>Cash flow inversión</small><b id="avInvestCF">—</b></div>
                <div class="fund-metric"><small>Cash flow financiación</small><b id="avFinanceCF">—</b></div>
              </div>
            </div>
          </details>

          <details>
            <summary>DIVIDENDOS</summary>
            <div class="fund-details-body">
              <div class="fund-grid">
                <div class="fund-metric"><small>Dividendo TTM</small><b id="fvDivTTM">—</b></div>
                <div class="fund-metric"><small>Rendimiento TTM</small><b id="fvDivYield2">—</b></div>
                <div class="fund-metric"><small>Dividendo estimado</small><b id="fvDivEst">—</b></div>
                <div class="fund-metric"><small>Rendimiento estimado</small><b id="fvDivEstYield">—</b></div>
                <div class="fund-metric"><small>Fecha ex-dividendo</small><b id="fvExDate">—</b></div>
                <div class="fund-metric"><small>Crecimiento div. 3 / 5 años</small><b id="fvDivGrowth">—</b></div>
                <div class="fund-metric"><small>Payout</small><b id="fvPayout">—</b></div>
              </div>
            </div>
          </details>

          <details>
            <summary>PRECIO, RIESGO Y MERCADO</summary>
            <div class="fund-details-body">
              <div class="fund-grid">
                <div class="fund-metric"><small>Precio subyacente</small><b id="fvPrice">—</b></div>
                <div class="fund-metric"><small>Máximo 52 semanas</small><b id="fv52High">—</b></div>
                <div class="fund-metric"><small>Mínimo 52 semanas</small><b id="fv52Low">—</b></div>
                <div class="fund-metric"><small>Beta (riesgo mercado)</small><b id="fvBeta">—</b></div>
                <div class="fund-metric"><small>ATR 14</small><b id="fvATR">—</b></div>
                <div class="fund-metric"><small>RSI 14</small><b id="fvRSI">—</b></div>
                <div class="fund-metric"><small>Volumen relativo</small><b id="fvRelVol">—</b></div>
                <div class="fund-metric"><small>Volumen promedio</small><b id="fvAvgVol">—</b></div>
                <div class="fund-metric"><small>Insiders</small><b id="fvInsiderOwn">—</b></div>
                <div class="fund-metric"><small>Institucionales</small><b id="fvInstOwn">—</b></div>
              </div>
            </div>
          </details>
        </div>

        <div id="fundWhy" class="fund-note"><strong>Lectura:</strong> esperando datos fundamentales.</div>
        <div class="fund-legend">El resumen superior muestra sólo las métricas más importantes. Abrí una sección únicamente cuando quieras profundizar.</div>
      </div>
    </div>

    <div class="right-stack">
      <div class="card"><h3>SESGO OPERATIVO</h3><div id="bias" class="bias amber">Esperar</div><div id="biasNote" class="note">Ejecutá un análisis.</div></div>

      <div class="technical-premium-grid technical-premium-grid-side">
        <div class="card technical-premium-card"><div class="premium-analytics-head"><div><h3>CONFLUENCIA TÉCNICA</h3><small>Score absoluto; el ranking no puede fabricar una entrada.</small></div></div><div id="technicalConfluenceVisual" class="technical-premium-visual"><div class="premium-donut-empty"><b>Esperando análisis</b><span>Se mostrará estructura, multi-TF, Fibonacci, EMAs, MACD, volumen y R:R.</span></div></div></div>
        <div class="card technical-premium-card"><div class="premium-analytics-head"><div><h3>READINESS DE ENTRADA</h3><small>Gates absolutos antes de habilitar una operación.</small></div></div><div id="technicalReadinessVisual" class="technical-premium-visual"><div class="premium-donut-empty"><b>Sin señal</b><span>La entrada sólo se habilita con estructura + zona + trigger + R:R.</span></div></div></div>
      </div>

      <div class="card">
        <h3>NIVELES RELEVANTES</h3>
        <div class="row"><span>Soporte</span><b id="support">—</b></div>
        <div class="row"><span>Resistencia</span><b id="resistance">—</b></div>
        <div class="row"><span>Confirmación</span><b id="confirmation">—</b></div>
        <div class="row"><span>Invalidación</span><b id="invalidation">—</b></div>
      </div>

      <div class="card">
        <h3>DECISIÓN OPERATIVA</h3>
        <div class="analysis-portfolio-action">
          <button id="analysisAddWatchBtn" class="secondary-action portfolio-action-btn">+ Seguimiento</button>
          <button id="analysisAddPortfolioBtn" class="secondary-action quick-portfolio-btn portfolio-action-btn">+ Cartera</button>
          <button id="analysisReducePortfolioBtn" class="secondary-action reduce-btn portfolio-action-btn" disabled>Reducir</button>
          <button id="analysisClosePortfolioBtn" class="secondary-action close-position-btn portfolio-action-btn" disabled>Cerrar posición</button>
          <span id="analysisPortfolioHint" class="hint">Seguimiento y gestión de cartera desde el activo analizado. Los controles se adaptan al tamaño del panel.</span>
        </div>
        <div class="score-wrap">
          <div class="score-top">
            <span id="setupStatus" class="status-chip amber">SIN SETUP</span>
            <span id="confluenceScore" class="score-num">—</span>
          </div>
          <div class="scorebar"><div id="scoreFill" class="scorefill"></div></div>
        </div>
        <div class="row"><span>Dirección</span><b id="tradeDirection">—</b></div>
        <div class="row"><span>Zona de entrada</span><b id="tradeEntry">—</b></div>
        <div class="row"><span>Trigger</span><b id="tradeTrigger">—</b></div>
        <div class="row"><span>Stop / invalidación</span><b id="tradeStop">—</b></div>
        <div class="row"><span>TP1</span><b id="tradeTp1">—</b></div>
        <div class="row"><span>TP2</span><b id="tradeTp2">—</b></div>
        <div class="metric-grid">
          <div class="metric"><small>Riesgo</small><b id="tradeRisk">—</b></div>
          <div class="metric"><small>TP1 potencial</small><b id="tradePct1">—</b></div>
          <div class="metric"><small>R:R TP1</small><b id="tradeRR1">—</b></div>
          <div class="metric"><small>R:R TP2</small><b id="tradeRR2">—</b></div>
        </div>
        <div class="position-panel">
          <div class="position-grid">
            <div class="position-field">
              <label>Tamaño de posición (lo ingresás vos)</label>
              <input id="positionSizeInput" type="number" min="0" step="any" placeholder="Ej: 1000"/>
            </div>
            <div class="position-result"><small>Cantidad estimada</small><b id="positionQty">—</b></div>
            <div class="position-result"><small>Ganancia TP1</small><b id="positionGain1">—</b></div>
            <div class="position-result"><small>Ganancia TP2</small><b id="positionGain2">—</b></div>
            <div class="position-result"><small>Pérdida al Stop</small><b id="positionLoss">—</b></div>
          </div>
          <div class="config-state">El monto manual sigue siendo tuyo. Debajo, Radar calcula una referencia de tamaño máximo según capital y riesgo por operación, sin apalancamiento.</div>
          <div class="position-risk-tools">
            <div class="position-risk-grid">
              <div class="position-risk-field"><label>Capital total de referencia</label><input id="riskAccountCapital" type="number" min="0" step="any" placeholder="Ej: 10000000"></div>
              <div class="position-risk-field"><label>Riesgo máx. por trade</label><input id="riskPerTradePct" type="number" min="0.05" max="10" step="0.05" placeholder="0.75"></div>
              <div class="position-risk-field"><label>Moneda</label><select id="riskSizingCurrency"><option value="ARS">ARS</option><option value="USD">USD</option><option value="USDT">USDT</option></select></div>
              <div class="position-risk-result"><small>Riesgo monetario</small><b id="riskBudgetMoney">—</b></div>
              <div class="position-risk-result"><small>Posición sugerida</small><b id="riskSuggestedPosition">—</b></div>
              <div class="position-risk-result"><small>Cantidad sugerida</small><b id="riskSuggestedQty">—</b></div>
              <button id="useSuggestedPositionBtn" class="secondary-action">Usar sugerida</button>
            </div>
          </div>
        </div>
        <div class="reason-box"><strong>¿POR QUÉ?</strong><div id="decisionWhy">Sin análisis.</div></div>
        <div class="reason-box"><strong>¿QUÉ HACER / A QUÉ ESPERAR?</strong><div id="decisionAction">Sin análisis.</div></div>
        <div class="reason-box"><strong>¿QUÉ INVALIDA LA IDEA?</strong><div id="decisionInvalidation">Sin análisis.</div></div>
      </div>

      <div class="card"><h3>SCORE DE CONFLUENCIA</h3><div id="scoreBreakdown" class="breakdown"><span class="pill">—</span></div></div>
      <div class="card"><h3>ESTRUCTURA CONFIRMADA</h3><div id="structurePills" class="pills"><span class="pill">—</span></div></div>

      <div class="card">
        <h3>FIBONACCI AUTOMÁTICO</h3>
        <div class="row"><span>Impulso</span><b id="fibDirection">—</b></div>
        <div class="row"><span>0.382</span><b id="fib382">—</b></div>
        <div class="row"><span>0.500</span><b id="fib500">—</b></div>
        <div class="row"><span>0.618</span><b id="fib618">—</b></div>
      </div>

      <div class="card">
        <h3>MOMENTUM</h3>
        <div class="row"><span>EMAs</span><b id="emaState">—</b></div>
        <div class="row"><span>MACD</span><b id="macdState">—</b></div>
        <div class="row"><span>Precio / EMA200</span><b id="ema200State">—</b></div>
        <div class="row"><span>ATR 14</span><b id="atrState">—</b></div>
        <div class="row"><span>Volumen vs media 20</span><b id="volumeState">—</b></div>
      </div>

      <div class="card relative-strength-card">
        <h3>FUERZA RELATIVA</h3>
        <div id="rsHeadline" class="bias amber">Pendiente</div>
        <div class="rs-grid">
          <div class="rs-metric"><small>Activo · 20 barras</small><b id="rsAsset20">—</b></div>
          <div class="rs-metric"><small>Benchmark · 20</small><b id="rsBench20">—</b></div>
          <div class="rs-metric"><small>Exceso · 20</small><b id="rsExcess20">—</b></div>
          <div class="rs-metric"><small>Benchmark</small><b id="rsBenchmark">—</b></div>
          <div class="rs-metric"><small>Activo · 60 barras</small><b id="rsAsset60">—</b></div>
          <div class="rs-metric"><small>Benchmark · 60</small><b id="rsBench60">—</b></div>
          <div class="rs-metric"><small>Exceso · 60</small><b id="rsExcess60">—</b></div>
          <div class="rs-metric"><small>Sector ETF</small><b id="rsSectorBenchmark">—</b></div>
        </div>
        <div id="rsWhy" class="note">Compara rendimiento relativo; todavía no modifica el Score Oportunidad hasta tener evidencia suficiente del backtest.</div>
      </div>
    </div>
  </div>


  </div><!-- /analysisView -->`;
  function mount(){
    const summaryHost=document.getElementById('assetIntelligenceSummaryMount');
    if(summaryHost&&!document.getElementById('technicalStatusGrid'))summaryHost.outerHTML=SUMMARY_HTML;
    const host=document.getElementById('assetIntelligenceWorkspaceMount');
    if(host&&!document.getElementById('analysisView'))host.outerHTML=ASSET_INTELLIGENCE_HTML;
    return {summary:document.getElementById('technicalStatusGrid'),workspace:document.getElementById('analysisView')};
  }
  let bound=false;
  function bind(handlers={}){
    if(bound)return false;
    const on=(id,event,fn)=>{const el=document.getElementById(id);if(el&&typeof fn==='function')(window.radarBindAction?window.radarBindAction(el,event,fn,{key:id}):el.addEventListener(event,fn))};
    on('analyzeBtn','click',handlers.analyze);
    on('analysisBackBtn','click',handlers.back);
    on('symbol','keydown',e=>{if(e.key==='Enter'&&typeof handlers.analyze==='function')handlers.analyze(e)});
    on('analysisAddPortfolioBtn','click',handlers.addPortfolio);
    on('analysisAddWatchBtn','click',handlers.addWatch);
    on('analysisReducePortfolioBtn','click',handlers.reducePortfolio);
    on('analysisClosePortfolioBtn','click',handlers.closePortfolio);
    on('useSuggestedPositionBtn','click',handlers.useSuggestedPosition);
    for(const id of ['riskAccountCapital','riskPerTradePct','riskSizingCurrency'])on(id,'input',handlers.riskSizingChanged);
    on('positionSizeInput','input',handlers.positionSizeChanged);
    for(const id of ['showStructure','showFib','showEma','showDetails'])on(id,'change',handlers.chartLayerChanged);
    bound=true;return true;
  }
  window.RadarAssetIntelligenceUI=Object.freeze({VERSION,version:VERSION,mount,bind});
  mount();
})();

;

/* ===== RUNTIME BLOCK 8 ===== */
(()=>{
  "use strict";
  const VERSION='9Q';
  const BOND_HTML=`  <div id="bondView" class="bond-view">
    <div class="card bond-head">
      <div>
        <div id="bondTitle" class="bond-title">—</div>
        <div id="bondName" class="bond-name">—</div>
        <div id="bondTags" class="bond-tags"></div>
        <div class="asset-meta ui-mt-2">
          Actualizado: <span id="bondUpdated">—</span> · Fuente: <span id="bondSource">—</span>
        </div>
      </div>
      <div class="bond-head-actions">
        <button id="bondAddWatchBtn" class="secondary-action">+ Seguimiento</button>
        <button id="bondAddPortfolioBtn" class="secondary-action quick-portfolio-btn">+ Cartera</button>
        <button id="bondReducePortfolioBtn" class="secondary-action reduce-btn" disabled>Reducir</button>
        <button id="bondClosePortfolioBtn" class="secondary-action close-position-btn" disabled>Cerrar posición</button>
        <button id="bondBackBtn" class="secondary-action">Volver</button>
      </div>
    </div>

    <div class="bond-kpis">
      <div class="bond-kpi"><small>Precio</small><b id="bondPrice">—</b><span>Cotización observada</span></div>
      <div class="bond-kpi"><small id="bondYieldLabel">TIR</small><b id="bondYield">—</b><span id="bondYieldNote">Rendimiento</span></div>
      <div class="bond-kpi"><small>Paridad</small><b id="bondParity">—</b><span>Precio / valor técnico</span></div>
      <div class="bond-kpi"><small>Duración</small><b id="bondDuration">—</b><span>Sensibilidad a TIR / spread</span></div>
      <div class="bond-kpi"><small>Vencimiento</small><b id="bondMaturity">—</b><span id="bondDays">—</span></div>
      <div class="bond-kpi"><small>Residual</small><b id="bondResidual">—</b><span id="bondResidualNote">Capital nominal pendiente</span></div>
    </div>

    <div class="bond-market-context">
      <div class="bond-market-card"><small>Riesgo país</small><b id="bondCountryRisk">—</b><span id="bondCountryRiskChange">Contexto soberano</span></div>
      <div class="bond-market-card"><small>Dólar MEP</small><b id="bondFxMep">—</b><span id="bondFxMepDate">Compra / venta</span></div>
      <div class="bond-market-card"><small>Dólar CCL</small><b id="bondFxCcl">—</b><span id="bondFxCclDate">Compra / venta</span></div>
      <div class="bond-market-card"><small>Dólar oficial</small><b id="bondFxOfficial">—</b><span id="bondFxOfficialDate">Compra / venta</span></div>
    </div>

    <div class="bond-grid">
      <div class="bond-stack">
        <div class="card bond-card">
          <h3>LECTURA DEL BONO</h3>
          <div id="bondReading" class="bond-reading">Cargando análisis…</div>
        </div>

        <div class="card bond-card">
          <h3>CALENDARIO DE PAGOS / FLUJOS</h3>
          <div id="bondCalendarSummary" class="bond-section-note">Cargando flujos futuros…</div>
          <div class="bond-calendar-wrap ui-mt-2">
            <table class="bond-calendar">
              <thead><tr><th>Fecha</th><th>Capital</th><th>Interés</th><th>Flujo total</th><th>Peso</th></tr></thead>
              <tbody id="bondCashflowBody"><tr><td colspan="5">—</td></tr></tbody>
            </table>
          </div>
        </div>

        <div class="card bond-card">
          <h3 id="bondScenarioTitle">ESCENARIOS DE TASA / RIESGO</h3>
          <div id="bondScenarioNote" class="bond-section-note">Sensibilidad aproximada por duration. No incluye convexidad.</div>
          <div id="bondScenarioGrid" class="bond-scenario-grid ui-mt-2"></div>
          <div class="bond-calculator">
            <div><label>TIR / rendimiento objetivo (%)</label><input id="bondTargetYield" type="number" step="0.01" placeholder="Ej: 10.50"/></div>
            <div id="bondTargetRiskWrap"><label>Riesgo país objetivo (pb)</label><input id="bondTargetRisk" type="number" step="1" placeholder="Ej: 450"/></div>
            <button id="bondScenarioBtn">Calcular escenario</button>
          </div>
          <div id="bondScenarioResult" class="bond-reading ui-mt-2">Ingresá un objetivo para simular.</div>
        </div>

        <div class="card bond-card">
          <h3>COMPARACIÓN CON PARES</h3>
          <div class="bond-section-note">Familia y plazo/duration similares. Mayor rendimiento puede significar oportunidad o mayor riesgo.</div>
          <div class="premium-scroll ui-mt-2">
            <table class="bond-peer-table">
              <thead><tr><th>Ticker</th><th>Tipo</th><th>Vto.</th><th>TIR / rendimiento</th><th>Paridad</th><th>Duración</th></tr></thead>
              <tbody id="bondPeersBody"><tr><td colspan="6">—</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="bond-stack">
        <div class="card bond-card"><h3>DATOS DEL INSTRUMENTO</h3><div id="bondInstrumentData"></div></div>
        <div class="card bond-card"><h3>RETORNO / VALOR</h3><div id="bondReturnData"></div></div>
        <div class="card bond-card"><h3>RIESGOS QUE IMPORTAN</h3><div id="bondRiskBox" class="bond-warn">Cargando…</div></div>
        <div class="card bond-card">
          <h3>QUÉ NO ESTÁ DICIENDO RADAR</h3>
          <div class="bond-danger">Una TIR alta no es una señal de compra. En ON faltan crédito del emisor, garantías, covenants y seniority. En soberanos existe riesgo político, legal y de reestructuración. En CER/DL/duales importa el índice contractual.</div>
        </div>
      </div>
    </div>
  </div>`;
  function mount(){
    const bondHost=document.getElementById('fixedIncomeDetailMount');
    if(bondHost&&!document.getElementById('bondView'))bondHost.outerHTML=BOND_HTML;
    return document.getElementById('bondView');
  }
  let bondBound=false;
  function bindBond(handlers={}){
    if(bondBound)return false;
    const on=(id,event,fn)=>{const el=document.getElementById(id);if(el&&typeof fn==='function')(window.radarBindAction?window.radarBindAction(el,event,fn,{key:id}):el.addEventListener(event,fn))};
    on('bondBackBtn','click',handlers.back);
    on('bondScenarioBtn','click',handlers.scenario);
    on('bondAddWatchBtn','click',handlers.addWatch);
    on('bondAddPortfolioBtn','click',handlers.addPortfolio);
    on('bondReducePortfolioBtn','click',handlers.reducePortfolio);
    on('bondClosePortfolioBtn','click',handlers.closePortfolio);
    bondBound=true;return true;
  }
  window.RadarFixedIncomeUI=Object.freeze({VERSION,version:VERSION,mount,bindBond});
  window.RadarFixedIncomeAllocatorUI=window.RadarFixedIncomeUI;
  mount();
})();

;

/* ===== RUNTIME BLOCK 9 ===== */
(()=>{
  'use strict';
  const VERSION='9K';
  const SCANNER_WORKSPACE_HTML="  <div id=\"rfScannerView\" class=\"rf-scanner-view\">\n    <div class=\"scan-toolbar\">\n      <div>\n        <h2>Escáner de renta fija</h2>\n        <div class=\"sub\">Bonos, Letras y ON: rendimiento, tasa de referencia, curva, plazo, paridad, liquidez, flujos de fondos y riesgo.</div>\n      </div>\n      <div class=\"watch-actions\"><button id=\"rfBackBtn\" class=\"secondary-action\">Volver al inicio</button></div>\n    </div>\n\n    <div class=\"card scan-config-card\">\n      <div class=\"rf-scan-form\">\n        <div class=\"scan-field\"><label>Universo</label><select id=\"rfUniverse\">\n          <option value=\"rf_all\">Bonos + Letras + ON</option>\n          <option value=\"rf_sovereign\">Bonos soberanos</option>\n          <option value=\"rf_letters\">LECAP / BONCAP / Letras</option>\n          <option value=\"rf_public_liquid\">Bonos/Letras con volumen hoy</option>\n          <option value=\"rf_on\">ON BYMA</option>\n          <option value=\"rf_on_liquid\">ON con volumen hoy</option>\n        </select></div>\n        <div class=\"scan-field\"><label>Moneda</label><select id=\"rfCurrency\">\n          <option value=\"ARS\" selected>ARS</option><option value=\"USD\">USD / MEP</option><option value=\"EXT\">EXT / CCL</option><option value=\"ALL\">Todas</option>\n        </select></div>\n        <div class=\"scan-field\"><label>Objetivo</label><select id=\"rfObjective\">\n          <option value=\"value\" selected>Valor relativo / mejor precio</option>\n          <option value=\"carry\">Carry / mantener a vencimiento</option>\n          <option value=\"compression\">Compresión de tasa / riesgo</option>\n          <option value=\"inflation\">Cobertura inflación / CER</option>\n          <option value=\"fx\">Cobertura dólar</option>\n          <option value=\"credit\">Crédito corporativo / ON</option>\n        </select></div>\n        <div class=\"scan-field\"><label>Horizonte</label><select id=\"rfHorizon\">\n          <option value=\"all\" selected>Cualquier plazo</option><option value=\"short\">Hasta 1 año</option><option value=\"medium\">1 a 3 años</option><option value=\"long\">Más de 3 años</option>\n        </select></div>\n        <div class=\"scan-field\"><label>Mostrar</label><select id=\"rfFilter\">\n          <option value=\"all\">Todos</option><option value=\"attractive\">Atractivos</option><option value=\"interesting\">Atractivos + interesantes</option><option value=\"valid\">Con métricas válidas</option>\n        </select></div>\n        <button id=\"rfStartBtn\">Escanear</button>\n        <button id=\"rfStopBtn\" class=\"secondary-action\" disabled>Detener</button>\n      </div>\n      <div id=\"rfUniverseInfo\" class=\"scan-note\">Universo: listo para consultar.</div>\n    </div>\n\n    <div class=\"scan-progress-wrap\">\n      <div class=\"scan-progress-head\"><span id=\"rfProgressText\">Listo para escanear.</span><span id=\"rfProgressCount\">0/0</span></div>\n      <div class=\"scan-progress\"><div id=\"rfProgressBar\"></div></div>\n    </div>\n\n    <div class=\"rf-context-panel v41\">\n      <div class=\"rf-context-card\"><small>Riesgo país</small><b id=\"rfsCountryRisk\">—</b><span id=\"rfsRiskTrend\">ArgentinaDatos</span></div>\n      <div class=\"rf-context-card\"><small>Dólar MEP</small><b id=\"rfsMep\">—</b><span id=\"rfsMepDate\">Compra / venta</span></div>\n      <div class=\"rf-context-card\"><small>Dólar CCL</small><b id=\"rfsCcl\">—</b><span id=\"rfsCclDate\">Compra / venta</span></div>\n      <div class=\"rf-context-card\"><small>Dólar oficial</small><b id=\"rfsOfficial\">—</b><span id=\"rfsOfficialDate\">Compra / venta</span></div>\n      <div class=\"rf-context-card\"><small>Tasa de referencia</small><b id=\"rfsReferenceRate\">N/D</b><span id=\"rfsReferenceRateNote\">BCRA · sólo comparable cuando corresponde</span></div>\n      <div class=\"rf-context-card\"><small>Analizables completos</small><b id=\"rfsCoverage\">—</b><span>Precio · moneda · vto. · flujos · TIR · tasa ref. · paridad · duración</span></div>\n      <div class=\"rf-context-card\"><small>Objetivo aplicado</small><b id=\"rfsObjective\">—</b><span>Refleja el combo superior</span></div>\n      <div class=\"rf-context-card\"><small>Horizonte aplicado</small><b id=\"rfsHorizon\">—</b><span>Refleja el combo superior</span></div>\n      <div class=\"rf-context-card\"><small id=\"rfsBestLabel\">Mejor hallazgo</small><b id=\"rfsBest\">—</b><span id=\"rfsBestWhy\">Esperando escaneo</span></div>\n    </div>\n\n    <div id=\"rfDiagnostic\" class=\"scan-diagnostic\">Elegí objetivo y horizonte. Radar comparará instrumentos equivalentes.</div>\n\n    <div class=\"rf-summary\">\n      <div class=\"metric\"><small>Aptos comparados</small><b id=\"rfsAnalyzed\">0</b></div>\n      <div class=\"metric\"><small id=\"rfsAttractiveLabel\">Atractivos</small><b id=\"rfsAttractive\" class=\"green\">0</b></div>\n      <div class=\"metric\"><small id=\"rfsInterestingLabel\">Interesantes</small><b id=\"rfsInteresting\" class=\"amber\">0</b></div>\n      <div class=\"metric\"><small>Neutros / poco atractivos</small><b id=\"rfsNeutral\" class=\"amber\">0</b></div>\n      <div class=\"metric\"><small>Descartados incompletos</small><b id=\"rfsNoData\">0</b></div>\n    </div>\n    <div class=\"premium-analytics-card scanner-analytics-card\"><div class=\"premium-analytics-head\"><div><h4>Composición del ranking</h4><span>Distribución visual de atractivos, interesantes, neutros y descartes.</span></div><span class=\"premium-analytics-chip\">RF</span></div><div id=\"rfAnalyticsVisual\"></div></div>\n\n    <div class=\"rf-table-wrap\">\n      <table class=\"rf-table\"><thead><tr>\n        <th>Estado</th><th>Instrumento</th><th>Tipo</th><th>Moneda</th><th>Vto.</th><th>Flujos restantes</th><th>Precio</th><th>Score RF</th><th id=\"rfYieldHead\">Rendimiento</th><th>Vs. tasa ref.</th><th>Paridad</th><th>Duración</th><th id=\"rfCurveHead\">Curva</th><th>Liquidez</th><th>Escenario</th><th>Por qué</th><th></th>\n      </tr></thead><tbody id=\"rfBody\"><tr><td colspan=\"17\">Todavía no se ejecutó el escáner.</td></tr></tbody></table>\n    </div>\n  </div>\n\n\n  <div id=\"scannerView\" class=\"scanner-view\">\n    <div class=\"scan-toolbar\">\n      <div>\n        <h2>Escáner de renta variable</h2>\n        <div class=\"sub\">Acciones, CEDEAR y cripto: estructura, tendencia, momentum, entrada, stop y objetivos.</div>\n      </div>\n      <div class=\"watch-actions\">\n        <button id=\"backFromScannerBtn\" class=\"secondary-action\">Volver al inicio</button>\n      </div>\n    </div>\n\n    <div class=\"card scan-config-card\">\n      <div class=\"scan-form\">\n        <div class=\"scan-field\">\n          <label>Universo</label>\n          <select id=\"scanUniverse\">\n            <option value=\"watchlist\">Mi seguimiento</option>\n            <option value=\"crypto100\">Crypto · Top 100 por volumen</option>\n            <option value=\"usa_cedear\">USA / ETF con CEDEAR</option>\n            <option value=\"cedear\">CEDEAR BYMA · todos</option>\n            <option value=\"cedear_liquid\">CEDEAR BYMA · con volumen hoy</option>\n            <option value=\"arg_leading\">Acciones Argentina · Líderes</option>\n            <option value=\"arg_general\">Acciones Argentina · Panel General</option>\n            <option value=\"arg_all\">Acciones Argentina · Líderes + General</option>\n            <option value=\"arg_adrs\">ADRs argentinos</option>\n          </select>\n        </div>\n        <div id=\"scanTfField\" class=\"scan-field\">\n          <label>Temporalidad</label>\n          <select id=\"scanTf\">\n            <option value=\"micro\">Micro</option>\n            <option value=\"short\" selected>Corto</option>\n            <option value=\"medium\">Medio</option>\n            <option value=\"macro\">Macro</option>\n          </select>\n        </div>\n        <div class=\"scan-field\">\n          <label>Mostrar</label>\n          <select id=\"scanFilter\">\n            <option value=\"all\">Todos</option>\n            <option value=\"buy\">Compras + oportunidades cercanas</option>\n            <option value=\"actionable\">Compras + ventas</option>\n            <option value=\"sell\">Ventas / Short</option>\n            <option value=\"watch\">Oportunidades + esperar</option>\n          </select>\n        </div>\n        <div id=\"scanCurrencyField\" class=\"scan-field\" style=\"display:none\">\n          <label>Moneda renta fija</label>\n          <select id=\"scanCurrency\">\n            <option value=\"ARS\" selected>ARS</option>\n            <option value=\"USD\">USD / MEP</option>\n            <option value=\"EXT\">EXT / CCL</option>\n            <option value=\"ALL\">Todas</option>\n          </select>\n        </div>\n        <div id=\"scanRfObjectiveField\" class=\"scan-field\" style=\"display:none\">\n          <label>Objetivo renta fija</label>\n          <select id=\"scanRfObjective\">\n            <option value=\"value\" selected>Valor relativo / mejor precio</option>\n            <option value=\"carry\">Carry / mantener a vencimiento</option>\n            <option value=\"compression\">Upside por compresión de tasa/riesgo</option>\n            <option value=\"inflation\">Cobertura inflación / CER</option>\n            <option value=\"fx\">Cobertura dólar</option>\n            <option value=\"credit\">Crédito corporativo / ON</option>\n          </select>\n        </div>\n        <div id=\"scanRfHorizonField\" class=\"scan-field\" style=\"display:none\">\n          <label>Horizonte</label>\n          <select id=\"scanRfHorizon\">\n            <option value=\"all\" selected>Cualquier plazo</option>\n            <option value=\"short\">Hasta 1 año</option>\n            <option value=\"medium\">1 a 3 años</option>\n            <option value=\"long\">Más de 3 años</option>\n          </select>\n        </div>\n        <button id=\"startScanBtn\">Escanear</button>\n        <button id=\"stopScanBtn\" class=\"secondary-action\" disabled>Detener</button>\n      </div>\n      <div class=\"scan-note\">Este escáner es exclusivamente técnico. Bonos, Letras y ON se analizan desde el botón Renta fija.</div>\n      <div id=\"scanUniverseInfo\" class=\"scan-note\">Universo: se resolverá al iniciar el escaneo.</div>\n    </div>\n\n    <div class=\"scan-progress-wrap\">\n      <div class=\"scan-progress-head\"><span id=\"scanProgressText\">Listo para escanear.</span><span id=\"scanProgressCount\">0/0</span></div>\n      <div class=\"scan-progress\"><div id=\"scanProgressBar\"></div></div>\n    </div>\n\n        <div id=\"scanDiagnostic\" class=\"scan-diagnostic\">El escáner ahora diferencia una entrada confirmada de una oportunidad cercana. Así no descarta activos que todavía están esperando el trigger.</div>\n\n    <div class=\"scan-summary scan-summary-six\">\n      <div class=\"metric\"><small id=\"scanLblAnalyzed\">Analizados</small><b id=\"scanAnalyzed\">0</b></div>\n      <div class=\"metric\"><small id=\"scanLblBuy\">Compra ahora</small><b id=\"scanBuyCount\" class=\"green\">0</b></div>\n      <div class=\"metric\"><small id=\"scanLblNear\">Oportunidad cercana</small><b id=\"scanNearCount\" class=\"amber\">0</b></div>\n      <div class=\"metric\"><small id=\"scanLblSell\">Ventas / Cortos</small><b id=\"scanSellCount\" class=\"red\">0</b></div>\n      <div class=\"metric\"><small id=\"scanLblWait\">Esperar</small><b id=\"scanWaitCount\" class=\"amber\">0</b></div>\n      <div class=\"metric\"><small id=\"scanLblNone\">Sin setup / error</small><b id=\"scanNoneCount\">0</b></div>\n    </div>\n    <div class=\"premium-analytics-card scanner-analytics-card\"><div class=\"premium-analytics-head\"><div><h4>Mapa de resultados</h4><span>Compra, cercanía, espera, salida y setups sin confirmación en una lectura compacta.</span></div><span class=\"premium-analytics-chip\">RV / CRYPTO</span></div><div id=\"scanAnalyticsVisual\"></div></div>\n\n\n    <div id=\"rfContextPanel\" class=\"rf-context-panel\">\n      <div class=\"rf-context-card\">\n        <small>Riesgo país</small>\n        <b id=\"rfCountryRisk\">—</b>\n        <span id=\"rfCountryRiskTrend\">Contexto soberano</span>\n      </div>\n      <div class=\"rf-context-card\">\n        <small>Cobertura analítica</small>\n        <b id=\"rfAnalyticsCoverage\">—</b>\n        <span>TIR · tasa ref. · paridad · duración</span>\n      </div>\n      <div class=\"rf-context-card\">\n        <small>Objetivo</small>\n        <b id=\"rfMedianTir\">—</b>\n        <span id=\"rfMedianTirNote\">Define qué significa “mejor”</span>\n      </div>\n      <div class=\"rf-context-card\">\n        <small>Horizonte</small>\n        <b id=\"rfMedianParity\">—</b>\n        <span>Se priorizan vencimientos compatibles</span>\n      </div>\n      <div class=\"rf-context-card\">\n        <small>Lectura</small>\n        <b id=\"rfMacroLabel\">—</b>\n        <span id=\"rfMacroWhy\">Riesgo país es contexto, no señal aislada.</span>\n      </div>\n      <div class=\"rf-source-note\">\n        El escáner de renta fija <b>NO usa el motor de acciones para clasificar</b>. Compara rendimiento, tasa de referencia cuando es comparable, curva, plazo, liquidez, paridad, sensibilidad y riesgo según el tipo de instrumento y el objetivo elegido. El gráfico técnico queda como información secundaria al abrir el activo.\n      </div>\n    </div>\n\n    <div class=\"scan-view-controls\">\n      <div class=\"scan-legend\">\n        <span><i class=\"g\"></i> Compra ahora</span>\n        <span><i class=\"c\"></i> Oportunidad cerca</span>\n        <span><i class=\"a\"></i> Esperar</span>\n        <span><i class=\"r\"></i> Venta / salida</span>\n        <span><i class=\"x\"></i> Sin setup</span>\n      </div>\n      <button id=\"scanModeBtn\" class=\"scan-mode-btn\">Vista detallada</button>\n    </div>\n\n    <div class=\"scan-table-wrap\">\n      <table class=\"scan-table\">\n        <thead>\n          <tr>\n            <th>Estado</th>\n            <th>Activo</th>\n            <th>TF</th>\n            <th>Macro</th>\n            <th id=\"scanThTech\">Score técnico</th>\n            <th id=\"scanThOpportunity\">Oportunidad</th>\n            <th>Dist. a entrada</th>\n            <th id=\"scanThPrice\">Precio</th>\n            <th id=\"scanThEntry\">Entrada</th>\n            <th id=\"scanThStop\">Stop</th>\n            <th id=\"scanThTp1\">TP1</th>\n            <th id=\"scanThTpPct\">TP1 %</th>\n            <th id=\"scanThRR\">R:R</th>\n            <th id=\"scanThWhy\">Lectura / qué falta</th>\n            <th></th>\n          </tr>\n        </thead>\n        <tbody id=\"scanBody\">\n          <tr><td colspan=\"15\" class=\"watch-empty\">Elegí un universo y presioná Escanear.</td></tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n\n";
  function mount(){
    const host=document.getElementById('scannerWorkspaceMount');
    if(!host||document.getElementById('scannerView')||document.getElementById('rfScannerView'))return {scanner:document.getElementById('scannerView'),fixedIncome:document.getElementById('rfScannerView')};
    host.outerHTML=SCANNER_WORKSPACE_HTML;
    return {scanner:document.getElementById('scannerView'),fixedIncome:document.getElementById('rfScannerView')};
  }
  let bound=false;
  function bind(handlers={}){
    if(bound)return false;
    const on=(id,event,fn)=>{const el=document.getElementById(id);if(el&&typeof fn==='function')(window.radarBindAction?window.radarBindAction(el,event,fn,{key:id}):el.addEventListener(event,fn))};
    on('scannerViewBtn','click',handlers.showScanner);
    on('fixedIncomeBtn','click',handlers.showFixedIncome);
    on('backFromScannerBtn','click',handlers.showDashboard);
    on('startScanBtn','click',handlers.startScanner);
    on('stopScanBtn','click',handlers.stopScanner);
    on('scanFilter','change',handlers.renderScanner);
    on('scanModeBtn','click',handlers.toggleScanMode);
    on('scanUniverse','change',handlers.scanUniverseChanged);
    on('scanRfObjective','change',handlers.scanRfObjectiveChanged);
    on('scanRfHorizon','change',handlers.scanRfHorizonChanged);
    on('rfBackBtn','click',handlers.showDashboard);
    on('rfStartBtn','click',handlers.startFixedIncome);
    on('rfStopBtn','click',handlers.stopFixedIncome);
    on('rfFilter','change',handlers.renderFixedIncome);
    on('rfObjective','change',handlers.rfObjectiveChanged);
    on('rfHorizon','change',handlers.rfHorizonChanged);
    on('rfUniverse','change',handlers.rfUniverseChanged);
    on('rfCurrency','change',handlers.rfCurrencyChanged);
    bound=true;return true;
  }
  window.RadarScannerWorkspaceUI=Object.freeze({version:VERSION,mount,bind});
  mount();
})();

;

/* ===== RUNTIME BLOCK 12 ===== */
(()=>{
'use strict';
const VERSION='RC20.33';
const PORTFOLIO_WORKSPACE_HTML="  <div id=\"watchlistView\" class=\"watchlist-view\">\n    <div class=\"portfolio-subnav\" aria-label=\"Navegación de cartera\">\n      <button id=\"watchlistJumpBtn\" class=\"portfolio-subnav-btn active\">★ Seguimiento</button>\n      <button id=\"portfolioJumpBtn\" class=\"portfolio-subnav-btn\">▣ Cartera 360</button>\n      <button id=\"riskJumpBtn\" class=\"portfolio-subnav-btn\">◫ Riesgo &amp; Performance</button>\n    </div>\n    <div class=\"watch-toolbar workspace-context-shell\" id=\"watchlistSection\">\n      <div class=\"alloc-rpt-head workspace-context-head\">\n        <div class=\"alloc-rpt-head-main workspace-context-main\"><div class=\"alloc-rpt-doc-icon\">★</div><div><div class=\"alloc-rpt-title-line\"><h2 id=\"portfolioContextTitle\">Seguimiento</h2><span id=\"portfolioContextBadge\" class=\"alloc-rpt-ready ok portfolio-context-badge\">SEGUIMIENTO</span><button class=\"context-help\" data-open-help=\"watchlist\" title=\"Ayuda de Watchlist\">?</button></div><p id=\"portfolioContextSubtitle\">Activos en seguimiento <i></i> disparadores y alertas <i></i> acceso rápido al análisis</p></div></div>\n      </div>\n      <div class=\"watch-actions alloc-report-actions\">\n        <div class=\"alert-toolbar\">\n          <button id=\"enableAlertsBtn\" class=\"secondary-action\">Activar alertas</button>\n          <span id=\"alertsBadge\" class=\"alert-badge off\">Alertas desactivadas</span>\n        </div>\n        <button id=\"refreshWatchlistBtn\">Actualizar seguimiento</button><span id=\"refreshPortfolioProgress\" class=\"refresh-progress\"></span>\n        <button id=\"goPortfolioBtn\" class=\"secondary-action\">Ver Cartera 360</button>\n        <div class=\"backup-actions\">\n          <button id=\"exportRadarBtn\" class=\"secondary-action\">Backup</button>\n          <button id=\"importRadarBtn\" class=\"secondary-action\">Restaurar</button>\n          \n          <input id=\"importRadarFile\" type=\"file\" accept=\"application/json,.json\" style=\"display:none\">\n        </div>\n        <button id=\"backToAnalysisBtn\" class=\"secondary-action\">Volver al inicio</button>\n      </div>\n    </div>\n\n    <div id=\"portfolioEntryPanel\" class=\"card portfolio-operational-panel alloc-rpt-card watch-premium-entry\">\n      <div class=\"watch-form\">\n        <div class=\"watch-field\">\n          <label>Activo</label>\n          <input id=\"watchSymbol\" placeholder=\"BTCUSDT, AAPL, GGAL...\"/>\n        </div>\n        <div class=\"watch-field\">\n          <label>Tipo</label>\n          <select id=\"watchType\">\n            <option value=\"auto\">Auto detectar</option>\n            <option value=\"crypto\">Crypto</option>\n            <option value=\"stock\">Acción / ADR USA</option>\n            <option value=\"argstock\">Acción Argentina</option>\n            <option value=\"cedear\">CEDEAR / BYMA</option>\n          </select>\n        </div>\n        <div class=\"watch-field\">\n          <label>Timeframe</label>\n          <select id=\"watchTf\">\n            <option value=\"short\">Corto</option>\n            <option value=\"medium\">Medio</option>\n            <option value=\"macro\">Macro</option>\n            <option value=\"micro\">Micro</option>\n          </select>\n        </div>\n        <div class=\"watch-field\">\n          <label>Tamaño posición</label>\n          <input id=\"watchPosition\" type=\"number\" min=\"0\" step=\"any\" placeholder=\"Ej: 1000\"/>\n        </div>\n        <div class=\"watch-field\">\n          <label>Precio compra (opcional)</label>\n          <input id=\"watchBuyPrice\" type=\"number\" min=\"0\" step=\"any\" placeholder=\"Ej: 219.50\"/>\n        </div>\n        <div class=\"watch-field\">\n          <label>Moneda posición</label>\n          <select id=\"watchCurrency\"><option value=\"ARS\">ARS</option><option value=\"USD\">USD</option><option value=\"USDT\">USDT</option></select>\n        </div>\n        <label class=\"toggle portfolio-flag\"><input id=\"watchInPortfolio\" type=\"checkbox\"> En cartera</label>\n        <button id=\"addWatchBtn\">Agregar</button>\n      </div>\n      <div class=\"config-persistence-row\"><div id=\"configState\" class=\"config-state\" data-persistence=\"unknown\">Configuración local: cargando…</div><button id=\"retryConfigSaveBtn\" class=\"secondary-action config-retry\" type=\"button\" hidden>Reintentar guardado</button></div>\n    </div>\n    <div id=\"portfolioMonitorPanel\" class=\"card portfolio-operational-panel alloc-rpt-card watch-premium-monitor\">\n      <div class=\"monitor-config\">\n        <div class=\"monitor-mode-wrap\"><label>Modo de monitor</label><select id=\"monitorModeSelect\"><option value=\"OFF\">OFF · Sin monitoreo automático</option><option value=\"RADAR\">CON RADAR · mientras la app está abierta</option><option value=\"24X7\">24x7 · inicio automático con Windows</option></select></div>\n        <div class=\"monitor-state-grid\"><div class=\"monitor-stat\"><small>Estado</small><b id=\"monitorState\">—</b></div><div class=\"monitor-stat\"><small>Último chequeo</small><b id=\"monitorLastCheck\">—</b></div><div class=\"monitor-stat\"><small>Próximo</small><b id=\"monitorNextCheck\">—</b></div><div class=\"monitor-stat\"><small>Posiciones</small><b id=\"monitorPositions\">0</b></div><div class=\"monitor-stat\"><small>Seguimiento total</small><b id=\"monitorTracked\">0</b></div><div class=\"monitor-stat\"><small>Alertas sesión</small><b id=\"monitorAlertsCount\">0</b></div></div>\n        <button id=\"applyMonitorModeBtn\" class=\"secondary-action\">Aplicar modo</button>\n      </div>\n      <div class=\"monitor-alert-options\"><label><input id=\"monitorAlertLevels\" type=\"checkbox\" checked> Stop / TP</label><label><input id=\"monitorAlertEntry\" type=\"checkbox\" checked> Zona / Trigger</label><label><input id=\"monitorAlertState\" type=\"checkbox\" checked> Estado / Score</label><label><input id=\"monitorAlertOpportunity\" type=\"checkbox\" checked> Oportunidades</label><label><input id=\"monitorAlertConcentration\" type=\"checkbox\" checked> Concentración</label></div>\n      <div id=\"autoWatchState\" class=\"note\">CON RADAR reevalúa posiciones cada 10 minutos y activos en Seguimiento cada 30 minutos. 24x7 vigila niveles de precio de ambos grupos cada 5 minutos aunque cierres el navegador. Stop/TP se aplica sólo a posiciones; Zona/Trigger también a Seguimiento. No ejecuta órdenes.</div>\n    </div>\n\n    <div class=\"portfolio360 alloc-rpt-shell p360-master\" id=\"portfolio360Section\">\n      <header class=\"alloc-rpt-head p360-master-head\">\n        <div class=\"alloc-rpt-head-main\"><div class=\"alloc-rpt-doc-icon\">▣</div><div><div class=\"alloc-rpt-title-line\"><h2>Cartera 360</h2><span class=\"alloc-rpt-ready ok\">CARTERA REAL · RC20.33</span></div><p>Posiciones consolidadas <i></i> valuación, composición, riesgo y concentración <i></i> sin mezclar activos de Seguimiento</p></div></div>\n        <div class=\"p360-master-controls\"><div class=\"portfolio360-settings\"><div><label>MONEDA BASE</label><select id=\"portfolioBaseCurrency\"><option value=\"ARS\">ARS</option><option value=\"USD\">USD</option></select></div><div><label>CAPITAL PATRIMONIAL REF.</label><input id=\"portfolioReferenceCapital\" type=\"number\" min=\"0\" step=\"any\" placeholder=\"Opcional\"></div></div><button id=\"p360RiskShortcut\" class=\"secondary-action p360-risk-shortcut\">Riesgo &amp; Performance</button></div>\n      </header>\n      <div class=\"alloc-rpt-kpis p360-master-kpis\">\n        <div><small>VALOR ACTUAL</small><b id=\"p360Current\">—</b><span>Valuación consolidada</span></div>\n        <div><small>CAPITAL INVERTIDO</small><b id=\"p360Invested\">—</b><span>Base de costo</span></div>\n        <div><small>P&amp;L</small><b id=\"p360Pnl\">—</b><span>Resultado no realizado</span></div>\n        <div><small>P&amp;L %</small><b id=\"p360PnlPct\">—</b><span>Sobre capital invertido</span></div>\n        <div><small>MAYOR CONCENTRACIÓN</small><b id=\"p360Concentration\">—</b><span>Posición líder</span></div>\n        <div><small>COBERTURA PRECIOS</small><b id=\"p360Coverage\">—</b><span>Posiciones valorizadas</span></div>\n      </div>\n      <div class=\"p360-master-secondary\">\n        <div><small>POSICIONES</small><b id=\"p360Positions\">0</b></div><div><small>RIESGO A INVALIDACIÓN</small><b id=\"p360Risk\">—</b></div><div><small>TOP 5</small><b id=\"p360Top5\">—</b></div><div><small>RV / RF</small><b id=\"p360RvRf\">—</b></div><div><small>EXTERIOR / GLOBAL</small><b id=\"p360External\">—</b></div>\n      </div>\n      <div class=\"alloc-rpt-dashboard p360-master-dashboard\">\n        <section class=\"alloc-rpt-card alloc-rpt-allocation p360-master-card\"><div class=\"alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">◔</span><h3>Composición de cartera</h3><small>Renta variable, fija y cripto</small></div><span class=\"alloc-rpt-chip\">Asignación real</span></div><div id=\"p360GroupExposure\" class=\"exposure-list p360-master-visual\"></div></section>\n        <section class=\"alloc-rpt-card alloc-rpt-why p360-master-card\"><div class=\"alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">◆</span><h3>Sector y temática</h3><small>Concentración económica real</small></div><span class=\"alloc-rpt-chip\">Diversificación</span></div><div id=\"p360SectorExposure\" class=\"exposure-list p360-master-visual\"></div></section>\n        <section class=\"alloc-rpt-card alloc-rpt-projection p360-master-card\"><div class=\"alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">◇</span><h3>Balance de riesgo</h3><small>Distribución de capital según riesgo</small></div><span class=\"alloc-rpt-chip\">Riesgo</span></div><div id=\"p360RiskExposure\" class=\"exposure-list p360-master-visual\"></div></section>\n        <section class=\"alloc-rpt-card alloc-rpt-positions p360-master-card p360-master-positions\"><div class=\"alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">▥</span><h3>Posiciones principales</h3><small>Top 5 y concentración real</small></div><span class=\"alloc-rpt-chip\">Top posiciones</span></div><div class=\"p360-master-position-layout\"><div id=\"p360TopPositionsDonut\" class=\"portfolio-top-donut\"></div><div class=\"portfolio-top-table-wrap\"><table class=\"portfolio-top-table\"><thead><tr><th>Activo</th><th>Peso</th><th>Valor base</th><th>Sector</th><th>Región</th><th>Riesgo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id=\"portfolioTopBody\"><tr><td colspan=\"8\" class=\"watch-empty\">Sin posiciones.</td></tr></tbody></table></div></div></section>\n        <section class=\"alloc-rpt-card alloc-rpt-geo p360-master-card\"><div class=\"alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">◎</span><h3>Distribución geográfica</h3><small>Exposición por región</small></div><span class=\"alloc-rpt-chip\">Geografía</span></div><div id=\"p360RegionExposure\" class=\"exposure-list p360-master-visual\"></div></section>\n        <section class=\"alloc-rpt-card alloc-rpt-risk p360-master-card\"><div class=\"alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">$</span><h3>Exposición por moneda</h3><small>Distribución monetaria</small></div><span class=\"alloc-rpt-chip\">FX</span></div><div id=\"p360CurrencyExposure\" class=\"exposure-list p360-master-visual\"></div></section>\n        <section class=\"alloc-rpt-card alloc-rpt-controls p360-master-card p360-master-controls-card\"><div class=\"alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">⌁</span><h3>Detalle de exposición</h3><small>Instrumentos, renta fija y métricas de concentración</small></div><span class=\"alloc-rpt-chip\">Controles</span></div><div class=\"p360-master-control-grid\"><div class=\"p360-master-mini\"><h4>Por instrumento</h4><div id=\"p360ClassExposure\" class=\"exposure-list p360-master-visual\"></div></div><div class=\"p360-master-mini\"><h4>Plazo de renta fija</h4><div id=\"p360TermExposure\" class=\"exposure-list p360-master-visual\"></div></div><div class=\"p360-master-factors\"><span>◎<b>Base pesos</b><small id=\"p360WeightBasis\">—</small></span><span>◔<b>Top 5</b><small id=\"p360Top5Detail\">—</small></span><span>↗<b>Renta variable</b><small id=\"p360RvShare\">—</small></span><span>▥<b>Renta fija</b><small id=\"p360RfShare\">—</small></span></div></div></section>\n      </div>\n      <div id=\"p360Note\" class=\"portfolio360-note\">Sin posiciones en cartera.</div>\n      <div id=\"g2PortfolioLiveStatus\" class=\"portfolio360-note g2-portfolio-live\">Estado de cartera: esperando primera valuación.</div>\n\n      <div id=\"g2PortfolioCutoverPanel\" class=\"portfolio360-box portfolio-cutover-panel\">\n        <div class=\"portfolio-cutover-head\"><div><h4>Caja y conciliación</h4><div class=\"sub\">Registrá depósitos o retiros y conciliá saldos reales de caja cuando corresponda.</div></div><div class=\"portfolio-cutover-actions\"><button id=\"g2PortfolioCashBtn\" class=\"secondary-action\">+ Depósito / Retiro</button><button id=\"g2PortfolioReconcileBtn\" class=\"secondary-action\">Reconciliar caja</button></div></div>\n      </div>\n\n\n      <div class=\"portfolio-diversification\">\n        <div id=\"diversificationScoreBox\" class=\"diversification-score warn\">\n          <small>Diversificación total</small>\n          <b id=\"diversificationScore\">—</b>\n          <strong id=\"diversificationLabel\">SIN DATOS</strong>\n          <div id=\"diversificationWhy\" class=\"portfolio360-note\">Se calcula a partir de pesos, sectores, monedas, clases y factores de riesgo.</div>\n        </div>\n        <div class=\"diversification-details\">\n          <div class=\"diversification-kpis\">\n            <div class=\"div-mini\"><small>Nº posiciones</small><b id=\"divPositions\">0</b></div>\n            <div class=\"div-mini\"><small>Nº efectivo</small><b id=\"divEffectiveN\">—</b></div>\n            <div class=\"div-mini\"><small>Mayor sector</small><b id=\"divTopSector\">—</b></div>\n            <div class=\"div-mini\"><small>Mayor factor</small><b id=\"divTopFactor\">—</b></div>\n          </div>\n          <div id=\"diversificationWarnings\" class=\"div-warnings\">Sin posiciones.</div>\n        </div>\n      </div>\n\n      <div class=\"portfolio-ledger\">\n        <div class=\"portfolio-ledger-head\">\n          <div><h4>Movimientos y P&amp;L realizado</h4><div class=\"sub\">Compras, aumentos, reducciones, ventas, dividendos y cupones.</div></div>\n          <button id=\"portfolioCashFlowBtn\" class=\"secondary-action\">+ Dividendo / Cupón</button>\n        </div>\n        <div class=\"portfolio-ledger-kpis\">\n          <div class=\"div-mini\"><small>P&amp;L realizado</small><b id=\"ledgerRealized\">—</b></div>\n          <div class=\"div-mini\"><small>Dividendos / cupones</small><b id=\"ledgerIncome\">—</b></div>\n          <div class=\"div-mini\"><small>Movimientos</small><b id=\"ledgerCount\">0</b></div>\n          <div class=\"div-mini\"><small>Último movimiento</small><b id=\"ledgerLast\">—</b></div>\n        </div>\n        <div class=\"ledger-table-wrap\">\n          <table class=\"ledger-table\"><thead><tr><th>Fecha</th><th>Activo</th><th>Movimiento</th><th>Cantidad</th><th>Precio</th><th>Importe</th><th>Moneda</th><th>P&amp;L realizado</th><th>Origen</th></tr></thead><tbody id=\"portfolioLedgerBody\"><tr><td colspan=\"9\" class=\"watch-empty\">Sin movimientos.</td></tr></tbody></table>\n        </div>\n      </div>\n\n      <div class=\"risk-intelligence alloc-rpt-card risk-premium-card risk-premium-primary\" id=\"portfolioRiskSection\">\n        <div class=\"risk-intelligence-head alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">◇</span><h3>Inteligencia de Riesgo</h3><small>Correlación, contribución al riesgo y cobertura histórica comparable.</small></div><button id=\"refreshPortfolioRiskBtn\" class=\"secondary-action risk-premium-refresh\">Actualizar riesgo</button></div>\n        <div class=\"risk-kpis alloc-rpt-kpis risk-premium-kpis\"><div class=\"risk-kpi\"><small>Volatilidad cartera</small><b id=\"riskPortfolioVol\">—</b></div><div class=\"risk-kpi\"><small>Downside vol.</small><b id=\"riskDownsideVol\">—</b></div><div class=\"risk-kpi\"><small>Max drawdown</small><b id=\"riskMaxDrawdown\">—</b></div><div class=\"risk-kpi\"><small>Correlación media</small><b id=\"riskAvgCorr\">—</b></div><div class=\"risk-kpi\"><small>Mayor correlación</small><b id=\"riskMaxCorr\">—</b></div><div class=\"risk-kpi\"><small>Principal riesgo</small><b id=\"riskTopContributor\">—</b></div><div class=\"risk-kpi\"><small>Concentración HHI</small><b id=\"riskConcentration\">—</b></div><div class=\"risk-kpi\"><small>Posiciones efectivas</small><b id=\"riskEffectivePositions\">—</b></div><div class=\"risk-kpi\"><small>Liquidez proxy</small><b id=\"riskLiquidity\">—</b></div><div class=\"risk-kpi\"><small>Beta benchmark</small><b id=\"riskBeta\">—</b></div><div class=\"risk-kpi\"><small>Cobertura series</small><b id=\"riskSeriesCoverage\">—</b></div><div class=\"risk-kpi\"><small>Ventana</small><b id=\"riskWindow\">60d</b></div></div>\n        <div id=\"riskExposureSummary\" class=\"portfolio360-note\">Exposiciones: sin cálculo.</div>\n        <div id=\"riskAlertsPanel\" class=\"risk-alerts\"><div class=\"risk-alert-policy\">Risk Alerts 6B: sin evaluación. Los límites son reglas explícitas de monitoreo, no probabilidades ni suitability.</div></div>\n        <div class=\"risk-premium-analysis-grid\"><div class=\"risk-premium-subcard\"><div class=\"risk-premium-subhead\"><span class=\"alloc-rpt-section-icon\">▦</span><div><b>Matriz de correlación</b><small>Relación histórica entre posiciones</small></div></div><div class=\"corr-wrap\"><table id=\"correlationTable\" class=\"corr-table\"><tbody><tr><td class=\"watch-empty\">Actualizá riesgo para construir la matriz.</td></tr></tbody></table></div></div><div class=\"risk-premium-subcard\"><div class=\"risk-premium-subhead\"><span class=\"alloc-rpt-section-icon\">◔</span><div><b>Contribución al riesgo</b><small>Magnitud por posición; las barras conservan el signo.</small></div></div><div id=\"riskContributionDonut\" class=\"risk-contribution-donut\"></div><div id=\"riskContributionList\" class=\"risk-contrib\"></div></div></div><div id=\"riskIntelligenceNote\" class=\"portfolio360-note\">Correlación no equivale a causalidad.</div>\n      </div>\n\n      <div class=\"performance-panel alloc-rpt-card risk-premium-card performance-premium-card\">\n        <div class=\"perf-head alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">↗</span><h3>Rendimiento vs benchmark</h3><small>Movimientos reales, drawdown, volatilidad y Sharpe aproximado.</small></div><button id=\"refreshPerformanceBtn\" class=\"secondary-action risk-premium-refresh\">Actualizar performance</button></div>\n        <div class=\"perf-kpis\"><div class=\"perf-kpi\"><small>Cartera</small><b id=\"perfPortfolioReturn\">—</b></div><div class=\"perf-kpi\"><small>Benchmark</small><b id=\"perfBenchmarkReturn\">—</b></div><div class=\"perf-kpi\"><small>Valor agregado</small><b id=\"perfAlpha\">—</b></div><div class=\"perf-kpi\"><small>Max drawdown</small><b id=\"perfMaxDd\">—</b></div><div class=\"perf-kpi\"><small>Volatilidad</small><b id=\"perfVol\">—</b></div><div class=\"perf-kpi\"><small>Sharpe aprox.</small><b id=\"perfSharpe\">—</b></div><div class=\"perf-kpi\"><small>Mejor mes</small><b id=\"perfBestMonth\">—</b></div><div class=\"perf-kpi\"><small>Peor mes</small><b id=\"perfWorstMonth\">—</b></div></div>\n        <div class=\"perf-chart-wrap\"><canvas id=\"portfolioPerformanceCanvas\" width=\"1000\" height=\"260\"></canvas></div><div id=\"performanceNote\" class=\"portfolio360-note\">Sin cálculo.</div>\n      </div>\n\n      <div class=\"stress-panel alloc-rpt-card risk-premium-card stress-premium-card\">\n        <div class=\"stress-head alloc-rpt-card-head\"><div><span class=\"alloc-rpt-section-icon\">⚡</span><h3>Prueba de estrés · “¿Qué pasa si…?”</h3><small>Escenarios determinísticos de sensibilidad; no son pronósticos.</small></div><span id=\"stressScenarioLabel\" class=\"alloc-rpt-chip intel-chip neutral\">Sin escenario</span></div>\n        <div class=\"stress-buttons\"><button data-stress=\"nasdaq\">Nasdaq -10%</button><button data-stress=\"btc\">BTC -20%</button><button data-stress=\"mep\">MEP +15%</button><button data-stress=\"country\">Riesgo país +500 pb</button><button data-stress=\"rates\">Tasas USA +100 pb</button></div>\n        <div class=\"stress-summary\"><div class=\"stress-result\"><small>Impacto cartera</small><b id=\"stressImpactMoney\">—</b></div><div class=\"stress-result\"><small>Impacto %</small><b id=\"stressImpactPct\">—</b></div><div class=\"stress-result\"><small>Activo más afectado</small><b id=\"stressWorstAsset\">—</b></div><div class=\"stress-result\"><small>Factor dominante</small><b id=\"stressDominantFactor\">—</b></div></div>\n        <div class=\"stress-table-wrap\"><table class=\"ledger-table\"><thead><tr><th>Activo</th><th>Valor actual</th><th>Sensibilidad</th><th>Impacto</th><th>Factor</th></tr></thead><tbody id=\"stressBody\"><tr><td colspan=\"5\" class=\"watch-empty\">Elegí un escenario.</td></tr></tbody></table></div>\n        <div id=\"stressRiskDeltaNote\" class=\"portfolio360-note\">Antes / después del riesgo: elegí un escenario con análisis de riesgo activo.</div>\n      </div>\n    </div>\n\n    <div class=\"watch-summary extended alloc-rpt-kpis watch-premium-kpis\">\n      <div class=\"metric\"><small>Activos</small><b id=\"watchCount\">0</b></div>\n      <div class=\"metric\"><small>Operables LONG</small><b id=\"watchLongCount\" class=\"green\">0</b></div>\n      <div class=\"metric\"><small>Operables VENTA</small><b id=\"watchShortCount\" class=\"red\">0</b></div>\n      <div class=\"metric\"><small>Esperar / Sin setup</small><b id=\"watchWaitCount\" class=\"amber\">0</b></div>\n      <div class=\"metric\"><small>Capital nominal (mixto)</small><b id=\"watchCapital\">0</b></div>\n      <div class=\"metric\"><small>P&amp;L nominal (mixto)</small><b id=\"watchPnl\">—</b></div>\n      <div class=\"metric\"><small>Salidas / reducir</small><b id=\"watchExitCount\" class=\"red\">0</b></div>\n    </div>\n\n    <div class=\"watch-table-wrap alloc-rpt-card alloc-rpt-positions watch-premium-table-card\">\n      <table class=\"watch-table\">\n        <thead>\n          <tr>\n            <th>Semáforo</th>\n            <th>Activo</th>\n            <th>Cartera</th>\n            <th>TF</th>\n            <th>Macro</th>\n            <th>Score</th>\n            <th>Entrada</th>\n            <th>Stop</th>\n            <th>TP1</th>\n            <th>TP1 %</th>\n            <th>Posición</th>\n            <th>Cantidad</th>\n            <th>Moneda</th>\n            <th>Precio actual</th>\n            <th>P&amp;L no realizado</th>\n            <th>P&amp;L realizado</th>\n            <th>Estado cartera</th>\n            <th>Resultado estimado TP1</th>\n            <th>Riesgo estimado Stop</th>\n            <th>Alerta / Motivo</th>\n            <th></th>\n          </tr>\n        </thead>\n        <tbody id=\"watchBody\">\n          <tr><td colspan=\"21\" class=\"watch-empty\">Todavía no agregaste activos.</td></tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n";
const PORTFOLIO_OVERLAYS_HTML="  <div id=\"reducePositionOverlay\" class=\"reduce-overlay\" aria-hidden=\"true\">\n    <div class=\"reduce-modal\">\n      <div class=\"quick-portfolio-head\">\n        <div><h3 id=\"reducePositionTitle\">Reducir posición</h3><div id=\"reducePositionSubtitle\" class=\"sub\">Venta parcial o total con controles de tenencia.</div></div>\n        <button id=\"reducePositionClose\" class=\"secondary-action\">Cerrar</button>\n      </div>\n      <div class=\"reduce-grid\">\n        <div class=\"reduce-field\"><label>Activo</label><input id=\"reduceSymbol\" readonly></div>\n        <div class=\"reduce-field\"><label>Tenencia actual</label><input id=\"reduceCurrentQty\" readonly></div>\n        <div class=\"reduce-field\"><label>Modo de reducción</label><select id=\"reduceMode\"><option value=\"pct\">% de la tenencia</option><option value=\"qty\">Cantidad</option><option value=\"amount\">Importe a vender</option></select></div>\n        <div class=\"reduce-field\"><label>Valor</label><input id=\"reduceValue\" type=\"number\" min=\"0\" step=\"any\" placeholder=\"Ej: 25\"></div>\n        <div class=\"reduce-field\"><label>Precio de ejecución</label><input id=\"reducePrice\" type=\"number\" min=\"0\" step=\"any\"></div>\n        <div class=\"reduce-field\"><label>Comisiones / gastos</label><input id=\"reduceFees\" type=\"number\" min=\"0\" step=\"any\" value=\"0\"></div>\n      </div>\n      <div id=\"reducePreview\" class=\"reduce-preview\">Completá los datos. Radar nunca permitirá vender más cantidad de la disponible.</div>\n      <div class=\"quick-portfolio-actions\">\n        <button id=\"reducePositionCancel\" class=\"secondary-action\">Cancelar</button>\n        <button id=\"reducePositionSave\" class=\"reduce-btn\">Confirmar reducción</button>\n      </div>\n    </div>\n  </div>\n\n\n  <div id=\"g2CashOverlay\" class=\"reduce-overlay\" aria-hidden=\"true\">\n    <div class=\"reduce-card\">\n      <div class=\"quick-portfolio-head\"><div><h3>Movimiento de caja</h3><div class=\"sub\">Depósito o retiro explícito. Se registra en el libro de cartera y en el backup/config local.</div></div><button id=\"g2CashClose\" class=\"secondary-action\">Cerrar</button></div>\n      <div class=\"reduce-grid\"><div class=\"reduce-field\"><label>Tipo</label><select id=\"g2CashType\"><option value=\"DEPOSIT\">Depósito</option><option value=\"WITHDRAWAL\">Retiro</option></select></div><div class=\"reduce-field\"><label>Moneda</label><select id=\"g2CashCurrency\"><option>ARS</option><option>USD</option><option>USDT</option></select></div><div class=\"reduce-field\"><label>Importe</label><input id=\"g2CashAmount\" type=\"number\" min=\"0\" step=\"any\"></div><div class=\"reduce-field\"><label>Fecha</label><input id=\"g2CashDate\" type=\"date\"></div></div>\n      <div class=\"quick-portfolio-actions\"><button id=\"g2CashCancel\" class=\"secondary-action\">Cancelar</button><button id=\"g2CashSave\">Guardar movimiento</button></div>\n    </div>\n  </div>\n  <div id=\"g2ReconcileOverlay\" class=\"reduce-overlay\" aria-hidden=\"true\">\n    <div class=\"reduce-card\">\n      <div class=\"quick-portfolio-head\"><div><h3>Reconciliar caja histórica</h3><div class=\"sub\">Ingresá los saldos de caja actuales reales. Radar crea ajustes auditables; no infiere el fondeo histórico.</div></div><button id=\"g2ReconcileClose\" class=\"secondary-action\">Cerrar</button></div>\n      <div class=\"reduce-grid\"><div class=\"reduce-field\"><label>ARS actual</label><input id=\"g2ReconARS\" type=\"number\" step=\"any\" placeholder=\"Vacío = no reconciliar\"></div><div class=\"reduce-field\"><label>USD actual</label><input id=\"g2ReconUSD\" type=\"number\" step=\"any\" placeholder=\"Vacío = no reconciliar\"></div><div class=\"reduce-field\"><label>USDT actual</label><input id=\"g2ReconUSDT\" type=\"number\" step=\"any\" placeholder=\"Vacío = no reconciliar\"></div><div class=\"reduce-field\"><label>Motivo / evidencia</label><input id=\"g2ReconReason\" placeholder=\"Ej: saldo verificado contra broker\"></div></div>\n      <div class=\"quick-portfolio-actions\"><button id=\"g2ReconcileCancel\" class=\"secondary-action\">Cancelar</button><button id=\"g2ReconcileSave\">Aplicar reconciliación</button></div>\n    </div>\n  </div>\n\n  <div id=\"cashFlowOverlay\" class=\"reduce-overlay\" aria-hidden=\"true\">\n    <div class=\"reduce-modal\">\n      <div class=\"quick-portfolio-head\"><div><h3>Registrar dividendo / cupón</h3><div class=\"sub\">Ingreso de caja asociado a una posición.</div></div><button id=\"cashFlowClose\" class=\"secondary-action\">Cerrar</button></div>\n      <div class=\"reduce-grid\">\n        <div class=\"reduce-field\"><label>Activo</label><select id=\"cashFlowAsset\"></select></div>\n        <div class=\"reduce-field\"><label>Tipo</label><select id=\"cashFlowType\"><option value=\"DIVIDEND\">Dividendo</option><option value=\"COUPON\">Cupón</option></select></div>\n        <div class=\"reduce-field\"><label>Importe neto</label><input id=\"cashFlowAmount\" type=\"number\" min=\"0\" step=\"any\"></div>\n        <div class=\"reduce-field\"><label>Fecha</label><input id=\"cashFlowDate\" type=\"date\"></div>\n      </div>\n      <div class=\"quick-portfolio-actions\"><button id=\"cashFlowCancel\" class=\"secondary-action\">Cancelar</button><button id=\"cashFlowSave\">Guardar ingreso</button></div>\n    </div>\n  </div>\n\n<div id=\"quickPortfolioOverlay\" class=\"quick-portfolio-overlay\" aria-hidden=\"true\">\n    <div class=\"quick-portfolio-modal\">\n      <div class=\"quick-portfolio-head\">\n        <div><h3>Agregar rápido a Cartera</h3><div id=\"quickPortfolioSubtitle\" class=\"sub\">Registrar una posición real.</div></div>\n        <button id=\"quickPortfolioClose\" class=\"secondary-action\">Cerrar</button>\n      </div>\n      <div class=\"quick-portfolio-grid\">\n        <div class=\"quick-portfolio-field\"><label>Activo</label><input id=\"quickPortfolioSymbol\" readonly></div>\n        <div class=\"quick-portfolio-field\"><label>Tipo / timeframe</label><input id=\"quickPortfolioTypeTf\" readonly></div>\n        <div class=\"quick-portfolio-field\"><label>Capital invertido</label><input id=\"quickPortfolioAmount\" type=\"number\" min=\"0\" step=\"any\"></div>\n        <div class=\"quick-portfolio-field\"><label>Precio de compra</label><input id=\"quickPortfolioBuyPrice\" type=\"number\" min=\"0\" step=\"any\"></div>\n        <div class=\"quick-portfolio-field\"><label>Moneda de la posición</label><select id=\"quickPortfolioCurrency\"><option value=\"ARS\">ARS</option><option value=\"USD\">USD</option><option value=\"USDT\">USDT</option></select></div>\n        <div class=\"quick-portfolio-field\"><label>Sector / temática</label><input id=\"quickPortfolioSector\" placeholder=\"Opcional\"></div>\n        <div class=\"quick-portfolio-field\"><label>Región / exposición</label><input id=\"quickPortfolioRegion\" placeholder=\"Auto\"></div>\n        <div class=\"quick-portfolio-field\"><label>Riesgo de cartera</label><select id=\"quickPortfolioRiskClass\"><option value=\"AUTO\">Auto</option><option value=\"Bajo\">Bajo</option><option value=\"Medio\">Medio</option><option value=\"Medio-alto\">Medio-alto</option><option value=\"Alto\">Alto</option><option value=\"Crédito no evaluado\">Crédito no evaluado</option></select></div>\n      </div>\n      <div id=\"quickPortfolioRead\" class=\"quick-portfolio-read\">Completá capital y precio de compra. La posición quedará en el monitoreo.</div>\n      <div class=\"quick-portfolio-actions\">\n        <button id=\"quickPortfolioCancel\" class=\"secondary-action\">Cancelar</button>\n        <button id=\"quickPortfolioSave\" class=\"quick-portfolio-btn\">Guardar en Cartera</button>\n      </div>\n    </div>\n  </div>\n";
function mount(){
 const host=document.getElementById('portfolioWorkspaceMount');
 if(host)host.outerHTML=PORTFOLIO_WORKSPACE_HTML;
 const overlayHost=document.getElementById('portfolioWorkspaceOverlayMount');
 if(overlayHost)overlayHost.outerHTML=PORTFOLIO_OVERLAYS_HTML;
}
function on(id,event,handler){
 const el=document.getElementById(id);
 if(el&&typeof handler==='function')(window.radarBindAction?window.radarBindAction(el,event,handler,{key:id}):el.addEventListener(event,handler));
}
function bind(api={}){
 on('watchlistViewBtn','click',api.showWatchlist);
 on('portfolioViewBtn','click',api.showPortfolio);
 on('watchlistJumpBtn','click',api.showWatchlist);
 on('portfolioJumpBtn','click',api.showPortfolio);
 on('riskJumpBtn','click',api.showRisk);
 on('p360RiskShortcut','click',api.showRisk);
 on('goPortfolioBtn','click',api.showPortfolio);
 on('backToAnalysisBtn','click',api.showDashboard);
 on('addWatchBtn','click',api.addWatchItem);
 on('refreshWatchlistBtn','click',api.refreshCurrent);
 on('enableAlertsBtn','click',api.enableAlerts);
 on('watchType','change',api.watchTypeChanged);
 on('portfolioBaseCurrency','change',api.baseCurrencyChanged);
 on('portfolioReferenceCapital','change',api.referenceCapitalChanged);

 on('quickPortfolioClose','click',api.closeQuickPortfolio);
 on('quickPortfolioCancel','click',api.closeQuickPortfolio);
 on('quickPortfolioSave','click',api.saveQuickPortfolio);
 on('quickPortfolioOverlay','click',api.quickPortfolioBackdrop);
 for(const id of ['quickPortfolioAmount','quickPortfolioBuyPrice','quickPortfolioCurrency','quickPortfolioRegion','quickPortfolioRiskClass']){
   on(id,'input',api.quickPortfolioChanged);on(id,'change',api.quickPortfolioChanged);
 }

 on('reducePositionClose','click',api.closeReducePosition);
 on('reducePositionCancel','click',api.closeReducePosition);
 on('reducePositionSave','click',api.confirmReducePosition);
 on('reducePositionOverlay','click',api.reduceBackdrop);
 for(const id of ['reduceMode','reduceValue','reducePrice','reduceFees'])on(id,'input',api.reduceChanged);

 on('portfolioCashFlowBtn','click',api.openCashFlow);
 on('cashFlowAsset','change',api.cashFlowAssetChanged);
 on('cashFlowClose','click',api.closeCashFlow);
 on('cashFlowCancel','click',api.closeCashFlow);
 on('cashFlowSave','click',api.saveCashFlow);
 on('cashFlowOverlay','click',api.cashFlowBackdrop);

 on('g2PortfolioCashBtn','click',api.g2CashOpen);
 on('g2CashClose','click',api.g2CashClose);
 on('g2CashCancel','click',api.g2CashClose);
 on('g2CashSave','click',api.g2CashSave);
 on('g2CashOverlay','click',api.g2CashBackdrop);
 on('g2PortfolioReconcileBtn','click',api.g2ReconcileOpen);
 on('g2ReconcileClose','click',api.g2ReconcileClose);
 on('g2ReconcileCancel','click',api.g2ReconcileClose);
 on('g2ReconcileSave','click',api.g2ReconcileSave);
 on('g2ReconcileOverlay','click',api.g2ReconcileBackdrop);
 on('g2PortfolioCutoverBtn','click',api.assessCutover);
 on('g2PortfolioPromoteBtn','click',api.promoteG2First);
 on('g2PortfolioRollbackBtn','click',api.rollbackG1First);

 on('exportRadarBtn','click',api.exportBackup);
 on('importRadarBtn','click',api.importBackupClick);
 on('importRadarFile','change',api.importBackupChanged);
 on('refreshPortfolioRiskBtn','click',api.refreshRisk);
 on('refreshPerformanceBtn','click',api.refreshPerformance);
 on('retryConfigSaveBtn','click',api.retryConfigSave);
 document.querySelectorAll('[data-stress]').forEach(el=>el.addEventListener('click',()=>{const run=()=>api.runStress?.(el.dataset.stress);if(window.radarRunAction)void window.radarRunAction(run,{key:`portfolio:stress:${el.dataset.stress||'scenario'}`,control:el,errorMessage:'No se pudo calcular el escenario de estrés'});else void run()}));
 on('applyMonitorModeBtn','click',api.applyMonitorMode);
 for(const id of ['monitorAlertLevels','monitorAlertEntry','monitorAlertState','monitorAlertOpportunity','monitorAlertConcentration'])on(id,'change',api.monitorAlertChanged);
}
window.RadarPortfolioWorkspaceUI={version:VERSION,mount,bind};
mount();
})();

;

/* ===== RUNTIME BLOCK 13 ===== */
(function(){
'use strict';
const VERSION='9L';
const STORAGE_KEY='radar_help_last_v89';
const HELP_CENTER_HTML=`<div id="helpOverlay" class="help-overlay" aria-hidden="true">
  <div class="help-shell">
    <aside class="help-nav">
      <h3>Centro de Ayuda</h3>
      <div class="sub">Radar Técnico G2 v4.39.0 · manual operativo</div>
      <input id="helpSearch" class="help-search" placeholder="Buscar: cartera, benchmark, stop, bono..." autocomplete="off"/>
      <div id="helpSearchResults" class="help-search-results"></div>

      <div class="help-group-label">Primeros pasos</div>
      <button class="active" data-help="inicio"><span class="help-nav-no">01</span>Empezar</button>
      <button data-help="flujo"><span class="help-nav-no">02</span>Flujo recomendado</button>
      <button data-help="pantalla"><span class="help-nav-no">03</span>Ficha de análisis</button>

      <div class="help-group-label">Mercado y búsqueda</div>
      <button data-help="dashboard"><span class="help-nav-no">04</span>Inicio / Macro</button>
      <button data-help="scanner"><span class="help-nav-no">05</span>Escáner RV / Cripto</button>
      <button data-help="rentafija"><span class="help-nav-no">06</span>Escáner Renta Fija</button>
      <button data-help="decisioncenter"><span class="help-nav-no">07</span>Centro de Decisión</button>
      <button data-help="allocator"><span class="help-nav-no">08</span>Asignador de Capital</button>

      <div class="help-group-label">Seguimiento y cartera</div>
      <button data-help="watchlist"><span class="help-nav-no">09</span>Seguimiento</button>
      <button data-help="portfolio360"><span class="help-nav-no">10</span>Cartera 360</button>
      <button data-help="movimientos"><span class="help-nav-no">11</span>Compras / Reducciones</button>
      <button data-help="riesgo"><span class="help-nav-no">12</span>Diversificación y Riesgo</button>
      <button data-help="performance"><span class="help-nav-no">13</span>Benchmark / Rendimiento</button>
      <button data-help="stress"><span class="help-nav-no">14</span>Stress Test</button>

      <div class="help-group-label">Señales y validación</div>
      <button data-help="operativa"><span class="help-nav-no">15</span>Entrada / Stop / TP</button>
      <button data-help="estructura"><span class="help-nav-no">16</span>Estructura / EMAs / Fib</button>
      <button data-help="signals"><span class="help-nav-no">17</span>Historial / Auditoría</button>
      <button data-help="laboratorio"><span class="help-nav-no">18</span>Replay / Backtest</button>
      <button data-help="modelvalidation"><span class="help-nav-no">19</span>Model Validation</button>

      <div class="help-group-label">Sistema</div>
      <button data-help="dataquality"><span class="help-nav-no">20</span>Data Quality</button>
      <button data-help="monitorauto"><span class="help-nav-no">21</span>Monitor 24x7</button>
      <button data-help="backupqa"><span class="help-nav-no">22</span>Backup / QA / Rollback</button>
      <button data-help="qa85"><span class="help-nav-no">23</span>QA integral v93</button>
      <button data-help="errores"><span class="help-nav-no">24</span>Problemas frecuentes</button>
      <button data-help="glosario"><span class="help-nav-no">25</span>Glosario</button>
      <button data-help="abouthelp"><span class="help-nav-no">26</span>Acerca de Radar</button>
    </aside>

    <main class="help-main">
      <div class="help-topbar">
        <div><div class="help-topbar-title" id="helpCurrentTitle">Empezar</div><div class="sub">Ayuda contextual y guía práctica de la versión actual.</div></div>
        <div class="help-topbar-actions"><span class="help-version-badge">G2 4.21 · Ayuda</span><button id="helpCloseBtn" class="help-close">Cerrar ✕</button></div>
      </div>
      <select id="helpMobileSelect" class="help-mobile-select"></select>

      <section class="help-section active" data-section="inicio" data-title="Empezar">
        <div class="help-hero">
          <h2>Radar Técnico, sin perderse entre pantallas</h2>
          <p>El objetivo es transformar datos reales en una secuencia simple: <b>contexto → activo → setup → decisión → seguimiento → cartera → validación</b>. Esta ayuda describe exactamente la interfaz actual y también aclara qué cosas Radar no debe inventar.</p>
          <div class="help-hero-actions"><button class="help-route-btn" data-help-jump="flujo">Ver flujo completo</button><button class="help-route-btn" data-help-jump="portfolio360">Ir a Cartera 360</button><button class="help-route-btn" data-help-jump="errores">Resolver un problema</button><button class="help-route-btn" data-help-jump="abouthelp">Acerca de Radar</button></div>
        </div>
        <div class="help-grid">
          <div class="help-card"><h4>1 · Analizá</h4><p>Ingresá BTCUSDT, AAPL, YPFD, un CEDEAR o el instrumento correcto y presioná <b>Analizar</b>. Radar usa fuentes reales según el mercado.</p></div>
          <div class="help-card"><h4>2 · Interpretá</h4><p>No alcanza con “alcista”. Mirá Score, estado, entrada, trigger, stop, TP y el bloque <b>¿POR QUÉ?</b>.</p></div>
          <div class="help-card"><h4>3 · Seguimiento</h4><p><b>Seguimiento</b> significa “quiero vigilarlo”. No implica posición real ni capital invertido.</p></div>
          <div class="help-card"><h4>4 · Cartera</h4><p><b>+ Cartera</b> registra una posición real. Desde allí podés aumentar, reducir o cerrar con controles de tenencia.</p></div>
        </div>
        <div class="help-callout green"><b>Acerca de Radar:</b> identidad del producto, autor, contacto, versión y alcance quedan integrados dentro del Centro de Ayuda.</div>
      </section>

      <section class="help-section" data-section="flujo" data-title="Flujo recomendado">
        <h2>Flujo recomendado</h2>
        <div class="help-flow">
          <div class="help-flow-step"><b>1. Inicio</b><span>Revisá régimen, riesgo país, dólar, inflación y mercados de referencia.</span></div>
          <div class="help-flow-step"><b>2. Escáner</b><span>Buscá candidatos. No confundas ranking con orden de compra.</span></div>
          <div class="help-flow-step"><b>3. Ficha</b><span>Abrí el activo y validá estructura, temporalidades, trigger y riesgo.</span></div>
          <div class="help-flow-step"><b>4. Seguimiento / Cartera</b><span>Seguimiento si falta confirmación; Cartera sólo si existe posición real.</span></div>
          <div class="help-flow-step"><b>5. Validación</b><span>Historial, Replay y Backtest permiten cuestionar la estrategia.</span></div>
        </div>
        <div class="help-callout blue"><b>Regla operativa:</b> “OPORTUNIDAD CERCA” suele terminar en Seguimiento. “OPERABLE” no obliga a entrar: primero verificá posición, stop y riesgo monetario.</div>
      </section>

      <section class="help-section" data-section="pantalla" data-title="Ficha de análisis">
        <h2>Cómo leer la ficha de análisis</h2>
        <p>La cabecera está ordenada en niveles: activo y precio; metadata; temporalidades; capas visuales; leyenda; gráfico.</p>
        <table class="help-table"><tr><th>Zona</th><th>Qué mirar</th><th>Qué NO asumir</th></tr>
        <tr><td>Precio / variación</td><td>Última cotización y cambio observado.</td><td>Que verde = comprar.</td></tr>
        <tr><td>Chips</td><td>Sector, actividad, país, mercado, moneda, tipo.</td><td>Que toda metadata esté disponible en todas las fuentes.</td></tr>
        <tr><td>Temporalidades</td><td>Macro, Medio, Corto, Micro según disponibilidad.</td><td>Que BYMA gratuito tenga siempre intradiario.</td></tr>
        <tr><td>Capas</td><td>Estructura, Fibonacci, EMAs y detalles.</td><td>Que una sola capa sea señal suficiente.</td></tr>
        <tr><td>Plan</td><td>Entrada, trigger, stop, TP, R:R y explicación.</td><td>Que un “setup” elimine el riesgo.</td></tr></table>
        <div class="help-callout amber"><b>Resizer:</b> desde v81 el gráfico recalcula tamaño al cambiar ventana, sidebar, paneles y orientación. Si un chart quedara desalineado, maximizá/restaurá una vez y revisá QA antes de asumir que los datos fallaron.</div>
      </section>

      <section class="help-section" data-section="dashboard" data-title="Inicio / Panel macro">
        <h2>Inicio / Panel macro</h2>
        <p>Es el contexto. Las tarjetas de Riesgo País, MEP, CCL, Oficial e Inflación usan fuentes distintas y cargan de forma progresiva.</p>
        <div class="help-grid"><div class="help-card"><h4>Riesgo país</h4><p>Menor suele ser favorable para riesgo soberano argentino; mayor implica más prima de riesgo.</p></div><div class="help-card"><h4>MEP / CCL</h4><p>Sirven además para convertir cartera cuando mezclás ARS y USD. Si no hay MEP válido, Radar no debe inventar conversión.</p></div><div class="help-card"><h4>Mercados referencia</h4><p>Índices, yields, materias primas y FX ayudan a contextualizar, no a reemplazar el análisis del activo.</p></div><div class="help-card"><h4>Informe diario</h4><p>Resume cambios de régimen, cartera, riesgos y oportunidades respecto de la última instantánea.</p></div></div>
      </section>

      <section class="help-section" data-section="scanner" data-title="Escáner RV / Cripto">
        <h2>Escáner RV / Cripto</h2>
        <p>Elegí universo y timeframe. Radar analiza el universo disponible y ordena por proximidad/oportunidad.</p>
        <div class="help-steps"><div class="help-step"><b>Elegí universo</b><span>Crypto, CEDEAR/subyacentes, acciones argentinas, ADRs o Seguimiento.</span></div><div class="help-step"><b>Escaneá</b><span>Los resultados muestran estado y Score Oportunidad.</span></div><div class="help-step"><b>Abrí</b><span>Validá el candidato en la ficha completa antes de decidir.</span></div><div class="help-step"><b>+ Seguimiento / + Cartera</b><span>Seguimiento o posición real según tu situación.</span></div></div>
        <div class="help-callout amber">El Score sirve para <b>ordenar atención</b>. No es una probabilidad de ganancia.</div>
      </section>

      <section class="help-section" data-section="rentafija" data-title="Escáner Renta Fija">
        <h2>Escáner Renta Fija</h2>
        <p>Bonos, letras y ON no se analizan como acciones. Radar prioriza yield/TIR, paridad, duration, vencimiento, cashflows, moneda, curva, liquidez y riesgo crediticio.</p>
        <table class="help-table"><tr><th>Dato</th><th>Lectura</th></tr><tr><td>TIR / Yield</td><td>Rendimiento implícito bajo los cashflows disponibles.</td></tr><tr><td>Paridad</td><td>Precio relativo al valor técnico / nominal según instrumento.</td></tr><tr><td>Duration</td><td>Sensibilidad temporal aproximada, especialmente importante ante movimientos de tasas.</td></tr><tr><td>Cashflows</td><td>Pagos futuros verificados; si faltan, Radar debe degradar la comparación.</td></tr><tr><td>Curva / spread</td><td>Compara valor relativo, no “sobrecompra”.</td></tr></table>
        <div class="help-callout blue"><b>ON:</b> si los datos contractuales no están suficientemente validados, la ficha debe avisarlo. No se fuerza una TIR inventada.</div>
      </section>

      <section class="help-section" data-section="decisioncenter" data-title="Centro de Decisión">
        <h2>Centro de Decisión</h2>
        <p>Responde “¿qué merece atención ahora?”. Combina posiciones en riesgo, oportunidades RV/Crypto y candidatos RF sin fingir que los scores nativos son equivalentes.</p>
        <div class="help-grid"><div class="help-card"><h4>DATO</h4><p>Qué observó Radar.</p></div><div class="help-card"><h4>ANÁLISIS</h4><p>Cómo lo interpreta con sus reglas actuales.</p></div><div class="help-card"><h4>DECISIÓN</h4><p>Mantener, vigilar, reducir, salir o estudiar oportunidad.</p></div><div class="help-card"><h4>ACCIÓN</h4><p>Qué hacer en la interfaz: abrir, agregar, reducir o esperar.</p></div></div>
      </section>


      <section class="help-section" data-section="allocator" data-title="Asignador de Capital">
        <h2>Asignador de Capital · Decision &amp; Risk Engine v93 · sin IA</h2>
        <p>El Asignador responde <b>qué oportunidades son buenas, cuáles tienen entrada ahora y cuánto riesgo agregan a la cartera</b>. La selección, los porcentajes, los bloqueos y los stress tests se calculan mediante reglas determinísticas y datos de mercado; ningún LLM decide números.</p>
        <div class="help-grid"><div class="help-card"><h4>Opportunity Score</h4><p>0–100. Mide atractivo estructural: técnico/RF, macro contextual, R:R auditado y calidad de datos. No significa probabilidad de ganancia.</p></div><div class="help-card"><h4>Entry Readiness</h4><p>Separa ENTRADA CONFIRMADA, CERCA, ESPERAR/EXTENDIDO, INVALIDADO y DATOS INSUFICIENTES. Sólo CONFIRMADA puede recibir capital ejecutable.</p></div><div class="help-card"><h4>Portfolio Fit</h4><p>Penaliza exposición existente, país, sector, emisor, clase, factores compartidos y correlación histórica cuando hay suficientes datos.</p></div><div class="help-card"><h4>Data Confidence</h4><p>Depende de campos presentes, timestamp, antigüedad, fuentes y discrepancias. Un DATA CONFLICT bloquea asignación automática.</p></div></div>
        <h3>Cartera objetivo vs. ejecutable hoy</h3><p><b>Cartera objetivo</b> muestra los activos que el motor querría tener. <b>Comprar ahora</b> sólo incluye setups confirmados. El resto se muestra como <b>capital pendiente de trigger</b>. La cartera objetivo intenta asignar el 100% del capital; si no hay suficientes oportunidades válidas dentro de los límites del perfil, el remanente se informa como <b>capital sin asignar</b>.</p>
        <h3>Riesgo y concentración</h3><p>Los límites por perfil están centralizados: activo individual, Argentina/emergente, crypto/altcoin, equity, sector, emisor y factores. La diversificación efectiva combina concentración, factores compartidos y correlación histórica a 30/90 días y 1 año cuando existe histórico suficiente.</p>
        <h3>Renta fija y R:R</h3><p>En RF, Radar intenta recalcular TIR desde cashflows y contrastarla con fuentes externas. Diferencias &gt;0,50 pp se marcan <b>DATA CONFLICT</b> y bloquean compra automática. En técnico, el R:R geométrico se ajusta por ATR para penalizar stops demasiado estrechos y targets excesivamente lejanos.</p>
        <div class="help-callout blue"><b>Upside técnico:</b> la distancia hasta un target es matemática, no una expectativa de retorno ni una probabilidad.</div>
        <div class="help-callout amber"><b>Guardar plan:</b> conserva un snapshot con cartera objetivo, ejecutable, triggers, scores, riesgos y fuentes. “Comparar plan” permite contrastarlo con la situación actual. No compra, no vende y no modifica posiciones reales.</div>
      </section>

      <section class="help-section" data-section="watchlist" data-title="Seguimiento">
        <h2>Seguimiento</h2>
        <div class="help-callout green"><b>Seguimiento ≠ Cartera.</b> Seguimiento guarda activos que querés vigilar. “En cartera” representa una tenencia real.</div>
        <p>Podés agregar desde ficha, scanner o renta fija. Al agregar un activo, v83+ intenta actualizarlo inmediatamente en vez de esperar al próximo refresh.</p>
        <table class="help-table"><tr><th>Campo</th><th>Uso</th></tr><tr><td>Timeframe</td><td>Marco operativo que Radar usa para el seguimiento.</td></tr><tr><td>Tamaño posición</td><td>Capital nominal asociado si querés registrar posición.</td></tr><tr><td>Precio compra</td><td>Base para cantidad y P&L.</td></tr><tr><td>Moneda</td><td>ARS, USD o USDT según instrumento/posición.</td></tr><tr><td>En cartera</td><td>Activa consolidación, P&L y gestión de posición.</td></tr></table>
      </section>

      <section class="help-section" data-section="portfolio360" data-title="Cartera 360">
        <h2>Cartera 360</h2>
        <p>Consolida sólo posiciones abiertas. Convierte a moneda base mediante MEP cuando corresponde y muestra cobertura de precios.</p>
        <div class="help-grid"><div class="help-card"><h4>Capital invertido</h4><p>Costo remanente de posiciones abiertas en moneda base.</p></div><div class="help-card"><h4>Valor actual</h4><p>Usa precio vigente o LKG explícito. Si todavía falta precio, puede mostrar estimación basada en costo.</p></div><div class="help-card"><h4>P&L</h4><p>No realizado + realizado se separan para no mezclar tenencia abierta con ventas previas.</p></div><div class="help-card"><h4>Cobertura</h4><p>Cuántas posiciones tienen cotización utilizable. 0/3 significa que todavía no hay precio de mercado para esas 3.</p></div></div>
        <h3>Clasificación de la cartera</h3><p>Radar separa por instrumento, moneda, sector/temática, RV/RF/Crypto, región, plazo de renta fija, riesgo y Top 5 de concentración.</p>
      </section>

      <section class="help-section" data-section="movimientos" data-title="Compras, reducciones y cierres">
        <h2>Compras, aumentos, reducciones y cierres</h2>
        <p>El libro de movimientos conserva cantidad, precio, importe, moneda, P&L realizado y origen.</p>
        <div class="help-steps"><div class="help-step"><b>+ Cartera / + Aumentar</b><span>Agrega una compra y recalcula cantidad/precio promedio.</span></div><div class="help-step"><b>Reducir</b><span>Permite vender por cantidad, importe o porcentaje. No puede exceder la tenencia.</span></div><div class="help-step"><b>Cerrar</b><span>Exige exactamente 100% de la posición disponible.</span></div><div class="help-step"><b>Dividendo / Cupón</b><span>Sólo aparece para instrumentos compatibles. Crypto queda excluida.</span></div></div>
        <div class="help-callout red"><b>No borres una posición abierta:</b> Radar bloquea quitar de Seguimiento un activo con tenencia para no perder el historial de cartera.</div>
      </section>

      <section class="help-section" data-section="riesgo" data-title="Diversificación y Inteligencia de Riesgo">
        <h2>Diversificación y Inteligencia de Riesgo</h2>
        <p>La diversificación no se mide contando tickers. Radar analiza peso por posición, sector, moneda, clase/factor y, cuando cargás Inteligencia de Riesgo, correlación histórica.</p>
        <div class="help-grid"><div class="help-card"><h4>Score 0–100</h4><p>DIVERSIFICADA, ACEPTABLE, CONCENTRADA o MUY CONCENTRADA.</p></div><div class="help-card"><h4>Nº efectivo</h4><p>HHI aproximado: una cartera con 10 tickers pero un solo gigante puede comportarse como pocas posiciones.</p></div><div class="help-card"><h4>Correlación</h4><p>Detecta diversificación falsa entre activos distintos que se mueven juntos.</p></div><div class="help-card"><h4>Contribución al riesgo</h4><p>Combina peso y covarianza; no es sólo “qué posición tiene más dinero”.</p></div></div>
      </section>

      <section class="help-section" data-section="performance" data-title="Benchmark / Rendimiento">
        <h2>Rendimiento de cartera vs benchmark</h2>
        <p>Reconstruye la evolución usando movimientos reales y compara contra un benchmark automático: BTC, SPY o Merval según la composición dominante.</p>
        <div class="help-badges"><span class="help-badge">Retorno</span><span class="help-badge">Benchmark</span><span class="help-badge">Valor agregado</span><span class="help-badge">Drawdown</span><span class="help-badge">Volatilidad</span><span class="help-badge">Sharpe aprox.</span></div>
        <div class="help-callout amber"><b>Histórico insuficiente:</b> si la cartera acaba de crearse, no existen suficientes ruedas para una curva completa. v83+ usa un modo inicial cuando es posible y no inventa historia previa.</div>
        <p>Si no definiste capital patrimonial inicial, las compras se tratan como aportes externos para que depositar dinero no se confunda con rendimiento.</p>
      </section>

      <section class="help-section" data-section="stress" data-title="Stress Test">
        <h2>Stress Test · ¿Qué pasa si…?</h2>
        <p>Simula sensibilidades determinísticas: Nasdaq -10%, BTC -20%, MEP +15%, Riesgo País +500 pb o tasas USA +100 pb.</p>
        <div class="help-callout blue"><b>No es un pronóstico:</b> mide vulnerabilidad bajo un shock supuesto. No significa que Radar estime que ese escenario vaya a ocurrir.</div>
        <p>v83+ usa valor actual cuando existe y costo de posición como fallback explícito para no dejar el módulo inutilizable mientras faltan cotizaciones.</p>
      </section>

      <section class="help-section" data-section="operativa" data-title="Entrada, Trigger, Stop y TP">
        <h2>Entrada, Trigger, Stop y TP</h2>
        <table class="help-table"><tr><th>Concepto</th><th>Qué significa</th></tr><tr><td>Entrada</td><td>Zona donde el precio empieza a ser interesante según el setup.</td></tr><tr><td>Trigger</td><td>Condición que confirma/activa la idea.</td></tr><tr><td>Stop / invalidación</td><td>Nivel que vuelve incorrecta la hipótesis operativa.</td></tr><tr><td>TP1 / TP2</td><td>Objetivos del plan; no garantías.</td></tr><tr><td>R:R</td><td>Beneficio potencial relativo al riesgo asumido.</td></tr></table>
        <div class="help-callout green"><b>Position Sizing:</b> presupuesto de riesgo = capital × riesgo %. Posición sugerida = presupuesto / distancia al stop %. Radar limita al capital de referencia para no implicar apalancamiento.</div>
      </section>

      <section class="help-section" data-section="estructura" data-title="Estructura, EMAs y Fibonacci">
        <h2>Estructura, EMAs y Fibonacci</h2>
        <div class="help-grid"><div class="help-card"><h4>HH / HL</h4><p>Máximos y mínimos crecientes: estructura alcista.</p></div><div class="help-card"><h4>LH / LL</h4><p>Máximos y mínimos decrecientes: estructura bajista.</p></div><div class="help-card"><h4>EMAs</h4><p>20/50/200 ayudan a leer régimen y dirección, pero no son señales aisladas.</p></div><div class="help-card"><h4>Fibonacci</h4><p>0.382 / 0.50 / 0.618 son zonas de retroceso. Ganan valor si coinciden con estructura, EMA o soporte.</p></div></div>
        <p>MACD y volumen funcionan como confirmaciones. Radar intenta evitar el error de sumar indicadores sólo para hacer más “bonita” una señal.</p>
      </section>

      <section class="help-section" data-section="signals" data-title="Historial y Auditoría">
        <h2>Historial de señales y Auditoría</h2>
        <p>Radar guarda la señal original con timestamp y niveles. Después evalúa qué pasó sin reescribir el pasado.</p>
        <div class="help-badges"><span class="help-badge good">WIN</span><span class="help-badge bad">LOSS</span><span class="help-badge warn">AMBIGUOUS</span><span class="help-badge">OPEN</span><span class="help-badge">UNTRIGGERED</span></div>
        <p>Si TP y Stop se tocan en la misma vela y no hay granularidad suficiente para saber cuál fue primero, queda <b>AMBIGUOUS</b> y se excluye del win rate.</p>
        <p>La Auditoría de Decisiones guarda versión de Radar, modelo, score, acción, datos y motivo.</p>
      </section>

      <section class="help-section" data-section="laboratorio" data-title="Replay / Backtest">
        <h2>Replay y Backtest</h2>
        <p><b>Replay</b> corta la serie en una fecha histórica y reconstruye sólo lo que Radar podía ver entonces. <b>Backtest</b> recorre barra por barra.</p>
        <table class="help-table"><tr><th>Control</th><th>Objetivo</th></tr><tr><td>Comisión / Slippage</td><td>Descontar fricción operativa.</td></tr><tr><td>IS / OOS</td><td>Separar desarrollo de validación.</td></tr><tr><td>Walk-forward</td><td>Comprobar estabilidad por subperíodos.</td></tr><tr><td>Buy & Hold</td><td>Baseline simple del activo.</td></tr><tr><td>Random baseline</td><td>Comparar contra timing aleatorio reproducible.</td></tr></table>
      </section>

      <section class="help-section" data-section="modelvalidation" data-title="Model Validation">
        <h2>Model Validation y recalibración</h2>
        <p>Radar puede estudiar si Estructura, Multi-TF, Fibonacci, EMAs, MACD, Volumen y R:R se relacionan con R neta.</p>
        <div class="help-callout red"><b>No autoaprende sin control:</b> con menos de 30 señales resueltas no propone pesos. Aunque proponga cambios, vos tenés que confirmarlos. Cada aplicación crea una nueva versión del modelo.</div>
        <p>Una mejora retrospectiva que empeora OOS o walk-forward debe considerarse sospechosa de sobreajuste.</p>
      </section>

      <section class="help-section" data-section="dataquality" data-title="Data Quality & Provenance">
        <h2>Data Quality & Provenance</h2>
        <p>Este panel es secundario y puede abrirse/cerrarse. Resume <b>Fuente, Timestamp, Frescura, Fallback/LKG y Coherencia</b>.</p>
        <table class="help-table"><tr><th>Estado</th><th>Lectura</th></tr><tr><td class="green">ACTUAL</td><td>Timestamp dentro de la ventana esperada.</td></tr><tr><td class="amber">DEMORADO</td><td>Dato válido pero no suficientemente fresco.</td></tr><tr><td class="red">REVISAR</td><td>Dato viejo, incoherente o sin timestamp adecuado.</td></tr><tr><td>LKG</td><td>Last Known Good: último dato válido conservado, identificado como fallback.</td></tr></table>
        <div class="help-callout amber">Una fuente caída no debe convertirse en cero ni en un dato inventado. Si no puede verificarse, Radar muestra “—”, LKG o advertencia.</div>
      </section>

      <section class="help-section" data-section="monitorauto" data-title="Monitor automático">
        <h2>Monitor OFF / CON RADAR / 24x7</h2>
        <table class="help-table"><tr><th>Modo</th><th>Comportamiento</th></tr><tr><td>OFF</td><td>No hay monitoreo automático; siguen disponibles actualizaciones manuales.</td></tr><tr><td>CON RADAR</td><td>Recalcula aproximadamente cada 10 minutos mientras la app está abierta.</td></tr><tr><td>24x7</td><td>Proceso PowerShell local cada 5 minutos y arranque con Windows. Vigila niveles guardados.</td></tr></table>
        <p>Stop/TP/zona/trigger pueden vigilarse fuera del navegador. El Score completo requiere el motor de Radar abierto.</p>
      </section>

      <section class="help-section" data-section="backupqa" data-title="Backup, QA y Rollback">
        <h2>Backup, QA y Rollback</h2>
        <div class="help-grid"><div class="help-card"><h4>Backup</h4><p>Exporta configuración, cartera, señales y auditoría.</p></div><div class="help-card"><h4>Restaurar</h4><p>Migra un backup compatible a la versión actual sin inventar posiciones.</p></div><div class="help-card"><h4>Autotest / QA</h4><p>Prueba servidor, fuentes y módulos clave. Avisos de fuente externa no siempre son errores críticos.</p></div><div class="help-card"><h4>Rollback</h4><p>El instalador guarda la versión previa para volver atrás conservando datos personales de Radar.</p></div></div>
      </section>

      <section class="help-section" data-section="qa85" data-title="QA integral v93">
        <h2>QA integral · Etapa 4</h2>
        <div class="help-callout green"><b>Preflight local:</b> revisa la interfaz, configuración, libro de movimientos, reglas de cartera, benchmark, Stress Test, resizer, Data Quality, Help Center y monitor sin consultar Internet ni modificar posiciones.</div>
        <p><b>QA completo</b> agrega pruebas secuenciales de servidor y fuentes externas. Un fallo crítico deja el estado <b>NO APTO</b>; una fuente externa temporalmente caída se informa como aviso cuando existe fallback o no bloquea la lógica local.</p>
        <div class="help-grid"><div class="help-card"><h4>Seguimiento vs Cartera</h4><p>El botón de actualización es contextual: en Seguimiento dice “Actualizar seguimiento”; en Cartera y Riesgo dice “Actualizar cartera” y consulta sólo posiciones reales.</p></div><div class="help-card"><h4>Timeout por posición</h4><p>Una posición que demora no bloquea indefinidamente la actualización de toda la cartera.</p></div><div class="help-card"><h4>Consistencia</h4><p>QA compara cantidad y costo actuales contra el libro BUY/SELL sin reescribir tus datos.</p></div><div class="help-card"><h4>Reporte</h4><p>“Copiar reporte” genera un diagnóstico reproducible para localizar un problema con precisión.</p></div></div>
      </section>
      <section class="help-section" data-section="errores" data-title="Problemas frecuentes">
        <h2>Problemas frecuentes</h2>
        <table class="help-table"><tr><th>Problema</th><th>Qué revisar</th></tr>
        <tr><td>“SIN DATOS” en Cartera</td><td>Actualizar cartera si estás en Cartera; comprobar tipo/ticker; revisar cobertura precios y Data Quality. v83 reconoce tickers locales conocidos como YPFD.</td></tr>
        <tr><td>Benchmark vacío</td><td>Si la cartera es nueva puede no haber suficientes ruedas. No se debe fabricar histórico.</td></tr>
        <tr><td>Stress = 0 / sin posiciones</td><td>Actualizar cotizaciones. v83+ puede usar costo como fallback, pero requiere posiciones realmente “En cartera”.</td></tr>
        <tr><td>Crypto en dividendos</td><td>No debería aparecer. Crypto está excluida de dividendos/cupones.</td></tr>
        <tr><td>Combos ilegibles</td><td>v83 fuerza color-scheme oscuro en Chromium/Windows; si persiste, cerrar/reabrir navegador.</td></tr>
        <tr><td>Chart cortado</td><td>Redimensionar ventana/sidebar y revisar Autotest. El resizer v81+ escucha cambios de ventana y orientación.</td></tr>
        <tr><td>Fuente demorada</td><td>No equivale a error de lógica. Revisar timestamp y fuente en Data Quality.</td></tr><tr><td>Riesgo país no coincide con BondTerminal</td><td>v93 prioriza BondTerminal directo con no-cache y evita que el histórico diario del mismo día pise el valor intradiario live. “Actualizar” fuerza una consulta nueva.</td></tr></table>
        <div class="help-callout blue"><b>Diagnóstico:</b> antes de modificar código, usar Autotest + Data Quality + mensaje exacto de error. Eso evita “arreglar” una función que en realidad está esperando una fuente externa.</div>
      </section>

      <section class="help-section" data-section="abouthelp" data-title="Acerca de Radar">
        <h2>Acerca de Radar Técnico</h2>
        <p><b>Radar Técnico</b> es una plataforma local de análisis de mercados y gestión de cartera orientada a transformar datos reales en contexto, análisis, seguimiento y decisiones operativas dentro de una única consola.</p>
        <div class="help-grid">
          <div class="help-card"><h4>Producto</h4><p>Análisis técnico multi-timeframe, scanners RV/RF, Watchlist, Cartera 360, Inteligencia de Riesgo, performance, Stress Test, historial, auditoría, Replay, Backtest y Model Validation.</p></div>
          <div class="help-card"><h4>Desarrollado por</h4><p><b>Augusto García Juárez Matorras</b>.</p></div>
          <div class="help-card"><h4>Contacto</h4><p><a href="mailto:augustogjm@gmail.com">augustogjm@gmail.com</a></p></div>
          <div class="help-card"><h4>Versión</h4><p>Radar Técnico G2 v4.39.0 · Consola de Asesor y Mercados.</p></div>
        </div>
        <div class="help-callout blue"><b>Arquitectura:</b> aplicación local, uso de fuentes de datos reales según disponibilidad y sin ejecución automática de órdenes.</div>
        <div class="help-callout amber"><b>Aviso:</b> Radar Técnico es una herramienta de análisis y apoyo a la decisión. No constituye asesoramiento financiero ni reemplaza el criterio del usuario.</div>
        <p>La misma información está disponible dentro de <b>Ayuda → Acerca de Radar</b>, sin ocupar espacio permanente en las pantallas operativas.</p>
      </section>

      <section class="help-section" data-section="glosario" data-title="Glosario">
        <h2>Glosario rápido</h2>
        <div class="help-glossary">
          <div>HH / HL</div><div>Higher High / Higher Low. Secuencia típica alcista.</div><div>LH / LL</div><div>Lower High / Lower Low. Secuencia típica bajista.</div><div>BOS</div><div>Break of Structure. Ruptura que confirma continuidad.</div><div>CHoCH</div><div>Change of Character. Cambio de carácter / posible giro.</div><div>EMA</div><div>Media móvil exponencial.</div><div>ATR</div><div>Medida de volatilidad media.</div><div>Trigger</div><div>Evento que confirma el setup.</div><div>Invalidación</div><div>Nivel que vuelve incorrecta la hipótesis.</div><div>TP</div><div>Take Profit, objetivo de precio.</div><div>R:R</div><div>Relación beneficio potencial / riesgo.</div><div>MFE / MAE</div><div>Excursión máxima favorable / adversa después de la señal.</div><div>LKG</div><div>Last Known Good, último dato válido conservado.</div><div>OOS</div><div>Out-of-sample, datos no usados para ajuste.</div><div>Walk-forward</div><div>Validación secuencial por bloques temporales.</div><div>HHI</div><div>Índice de concentración usado para estimar nº efectivo de posiciones.</div>
        </div>
      </section>

      <div class="help-footer-nav"><div class="sub">Atajos: <span class="help-kbd">F1</span> abre ayuda · <span class="help-kbd">Esc</span> cierra · buscador en vivo en la barra izquierda.</div><div><button id="helpPrevBtn" class="secondary-action">← Anterior</button> <button id="helpNextBtn" class="secondary-action">Siguiente →</button></div></div>
    </main>
  </div>
</div>`;
let bound=false;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function mount(){
  const host=$('helpCenterMount');
  if(!host)return false;
  host.outerHTML=HELP_CENTER_HTML;
  return true;
}
function open(section=''){
  const overlay=$('helpOverlay');if(!overlay)return;
  const target=section||localStorage.getItem(STORAGE_KEY)||'inicio';
  overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  showSection(target);setTimeout(()=>$('helpSearch')?.focus(),80);
}
function close(){
  const overlay=$('helpOverlay');if(!overlay)return;
  overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';
}
function showSection(name){
  const section=[...document.querySelectorAll('.help-section')].find(s=>s.dataset.section===name)||document.querySelector('.help-section[data-section="inicio"]');
  if(!section)return;name=section.dataset.section;
  document.querySelectorAll('.help-section').forEach(s=>s.classList.toggle('active',s===section));
  document.querySelectorAll('.help-nav button[data-help]').forEach(b=>b.classList.toggle('active',b.dataset.help===name));
  if($('helpMobileSelect'))$('helpMobileSelect').value=name;
  if($('helpCurrentTitle'))$('helpCurrentTitle').textContent=section.dataset.title||section.querySelector('h2')?.textContent||'Ayuda';
  localStorage.setItem(STORAGE_KEY,name);
  const main=document.querySelector('.help-main');if(main)main.scrollTop=0;
  updatePrevNext();
}
function snippet(text,q){
  const i=text.indexOf(q);if(i<0)return'';const a=Math.max(0,i-55),b=Math.min(text.length,i+q.length+75);return (a?'…':'')+text.slice(a,b).replace(/\s+/g,' ').trim()+(b<text.length?'…':'');
}
function search(q){
  q=String(q||'').trim().toLowerCase();const box=$('helpSearchResults');if(!box)return;
  if(!q){box.classList.remove('active');box.innerHTML='';return}
  const sections=[...document.querySelectorAll('.help-section')],matches=sections.map(s=>{const title=s.dataset.title||s.querySelector('h2')?.textContent||s.dataset.section;const text=s.textContent.toLowerCase();let score=0;if(title.toLowerCase().includes(q))score+=4;if(text.includes(q))score+=1;return{section:s.dataset.section,title,score,text}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
  box.innerHTML=matches.length?matches.map(x=>`<button class="help-search-result" data-help-result="${x.section}"><b>${esc(x.title)}</b><small>${esc(snippet(x.text,q))}</small></button>`).join(''):'<div class="help-search-empty">Sin resultados.</div>';box.classList.add('active');
}
function order(){return [...document.querySelectorAll('.help-nav button[data-help]')].map(b=>b.dataset.help)}
function updatePrevNext(){const list=order(),cur=localStorage.getItem(STORAGE_KEY)||'inicio',i=list.indexOf(cur);if($('helpPrevBtn'))$('helpPrevBtn').disabled=i<=0;if($('helpNextBtn'))$('helpNextBtn').disabled=i<0||i>=list.length-1}
function move(delta){const list=order(),cur=localStorage.getItem(STORAGE_KEY)||'inicio',i=Math.max(0,list.indexOf(cur)),j=Math.max(0,Math.min(list.length-1,i+delta));showSection(list[j])}
function bind(){
  if(bound)return;bound=true;
  $('helpBtn')?.addEventListener('click',()=>open('inicio'));
  $('helpCloseBtn')?.addEventListener('click',close);
  $('helpOverlay')?.addEventListener('click',e=>{if(e.target===$('helpOverlay'))close()});
  document.querySelectorAll('.help-nav button[data-help]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.help)));
  $('helpSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')search(e.target.value)});
  $('helpSearch')?.addEventListener('input',e=>search(e.target.value));
  const mobile=$('helpMobileSelect');if(mobile){mobile.innerHTML=[...document.querySelectorAll('.help-nav button[data-help]')].map(b=>`<option value="${b.dataset.help}">${b.textContent.trim()}</option>`).join('');mobile.addEventListener('change',()=>showSection(mobile.value))}
  $('helpPrevBtn')?.addEventListener('click',()=>move(-1));$('helpNextBtn')?.addEventListener('click',()=>move(1));
  document.addEventListener('click',e=>{const ctx=e.target.closest?.('[data-open-help]');if(ctx){e.preventDefault();open(ctx.dataset.openHelp);return}const jump=e.target.closest?.('[data-help-jump]');if(jump){e.preventDefault();showSection(jump.dataset.helpJump);return}const result=e.target.closest?.('[data-help-result]');if(result){showSection(result.dataset.helpResult);$('helpSearchResults')?.classList.remove('active')}});
  document.addEventListener('keydown',e=>{if(e.key==='F1'){e.preventDefault();open();return}if(e.key==='Escape'&&$('helpOverlay')?.classList.contains('active'))close()});
  updatePrevNext();
}
window.RadarHelpCenterUI={VERSION,mount,bind,open,close,showSection,search};
// Compatibility names are external aliases owned by 9L, not legacy implementations.
window.openHelp=open;window.closeHelp=close;window.showHelpSection=showSection;window.initHelpV85=bind;
mount();
bind();
})();

;

/* ===== RUNTIME BLOCK 14 ===== */
(()=>{
'use strict';
const VERSION='9S';
const SHELL_HTML=String.raw`<aside id="appSidebar" class="app-sidebar">
  <div class="sidebar-brand">
    <div class="sidebar-logo">RT</div>
    <div class="sidebar-brand-copy"><b>Radar Técnico</b><small>Mercados · Cartera · Decisiones · G2 5.0.0</small></div>
  </div>
  <div class="sidebar-section-label">ESPACIO DE TRABAJO</div>
  <nav class="side-nav">
    <button id="homeViewBtn" class="side-nav-item active"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg></span><span class="nav-copy"><b>Inicio</b><small>Centro de Mercado</small></span></button>
    <button id="scannerViewBtn" class="side-nav-item"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M4 18V9m5 9V5m5 13v-7m5 7V3"/><path d="M3 21h18"/></svg></span><span class="nav-copy"><b>Escáner</b><small>Acciones · CEDEARs · Cripto</small></span></button>
    <button id="fixedIncomeBtn" class="side-nav-item"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></span><span class="nav-copy"><b>Escáner renta fija</b><small>Bonos · Letras · ON</small></span></button>
    <button id="watchlistViewBtn" class="side-nav-item"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.3 6.7 19l1-5.8-4.2-4.1 5.9-.9z"/></svg></span><span class="nav-copy"><b>Seguimiento</b><small>Activos · Alertas · Disparadores</small></span></button>
    <button id="portfolioViewBtn" class="side-nav-item"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2M4 11h16M10 11v2h4v-2"/></svg></span><span class="nav-copy"><b>Cartera</b><small>P&amp;L · Riesgo · Diversificación</small></span></button>
    <button id="signalsViewBtn" class="side-nav-item"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M12 8v5l3 2"/><path d="M4.9 5.3A9 9 0 1 1 3 12"/><path d="M3 5v5h5"/></svg></span><span class="nav-copy"><b>Historial</b><small>Señales · Auditoría</small></span></button>
  </nav>
  <div class="sidebar-section-label sidebar-secondary-label">SISTEMA</div>
  <nav class="side-nav system-side-nav">
    <button id="helpBtn" class="side-nav-item"><span class="nav-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.8 2.1c-.9.5-1.5 1-1.5 2.2M12 17h.01"/></svg></span><span class="nav-copy"><b>Ayuda</b><small>Guía completa de Radar</small></span></button>
    <button id="technicalMenuBtn" class="side-nav-item"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6"/></svg></span><span class="nav-copy"><b>Menú técnico</b><small>Datos · Frescura · QA</small></span></button>
  </nav>
  <div class="sidebar-footer">
    <div class="local-engine-card"><span class="engine-dot"></span><div><b>Motor local</b><small>Datos reales · sin sintéticos</small></div></div>
    <button id="sidebarCollapseBtn" class="sidebar-collapse" title="Contraer menú"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg></span><span>Contraer</span></button>
  </div>
</aside>
<div id="technicalDrawerBackdrop" class="technical-drawer-backdrop" aria-hidden="true"></div>
<aside id="technicalDrawer" class="technical-drawer" aria-hidden="true" aria-labelledby="technicalDrawerTitle">
  <div class="technical-drawer-head">
    <div><div class="technical-drawer-eyebrow">SISTEMA</div><h2 id="technicalDrawerTitle">Menú técnico</h2><p>Salud de datos y diagnóstico operativo del núcleo de Radar.</p></div>
    <button id="technicalDrawerClose" class="technical-drawer-close" aria-label="Cerrar menú técnico">✕</button>
  </div>
  <div class="technical-drawer-body">
    <section class="technical-section"><div class="technical-section-title">Salud de datos</div>
  <div id="dataHealthPanel" class="data-health">
    <span class="data-health-title">Salud de datos</span>
    <span id="healthDollar" class="health-chip"><i></i><b>Dólar</b><span>—</span></span>
    <span id="healthRisk" class="health-chip"><i></i><b>Riesgo país</b><span>—</span></span>
    <span id="healthYahoo" class="health-chip"><i></i><b>Yahoo</b><span>—</span></span>
    <span id="healthByma" class="health-chip"><i></i><b>BYMA</b><span>—</span></span>
    <span id="healthRf" class="health-chip"><i></i><b>Renta fija</b><span>—</span></span>
    <span id="healthIndices" class="health-chip"><i></i><b>Índices</b><span>—</span></span>
    <span id="healthCrypto" class="health-chip"><i></i><b>Cripto</b><span>—</span></span>
    <span id="healthConfig" class="health-chip"><i></i><b>Config</b><span>—</span></span>
    <span id="healthSystem" class="health-chip system-chip testing"><i></i><b>Sistema</b><span>iniciando</span></span>
    <span class="health-spacer"></span>
    <span id="healthQuality" class="health-chip"><i></i><b>Calidad</b><span>—</span></span>
    <button id="selfTestBtn" class="secondary-action">Autotest</button>
    <button id="regressionBtn" class="secondary-action">QA completo</button>
    <button id="dataDiagBtn" class="secondary-action">Diagnóstico</button>
  </div>
  <div id="dataDiagnostics" class="data-diagnostics">
    <div class="diag-head"><div><b>Diagnóstico automático</b><div class="sub">Consistencia, frescura y cobertura de datos.</div></div><button id="dataDiagClose" class="secondary-action">Cerrar</button></div>
    <div id="dataDiagSummary" class="sub ui-mt-1">Sin validar todavía.</div>
    <div id="selfTestBox" class="selftest-box">
      <div><b>Autotest de estabilidad</b> <span id="selfTestWhen" class="sub"></span></div>
      <div id="selfTestSummary" class="sub ui-mt-1">Todavía no ejecutado.</div>
      <div id="selfTestGrid" class="selftest-grid"></div>
      <div id="runtimeErrorList" class="ui-mt-2"></div>
    </div>
    <div id="regressionBox" class="qa-box">
      <div class="diag-head"><div><b>Etapa 4 · QA integral y prevalidación operativa</b> <span id="regressionWhen" class="sub"></span><div class="sub">Valida UI, configuración, cartera, movimientos, motores y fuentes sin modificar tus posiciones.</div></div><div class="qa-stage4-actions"><button id="qaLocalBtn" class="secondary-action">Prevalidación local</button><button id="qaCopyBtn" class="secondary-action">Copiar reporte</button></div></div>
      <div class="qa-stage4-head">
        <div id="qaVerdictBox" class="qa-stage4-verdict"><small>Estado operativo</small><b id="qaVerdict">SIN EJECUTAR</b></div>
        <div class="qa-stage4-kpi"><small>Críticos</small><b id="qaCritical">—</b></div>
        <div class="qa-stage4-kpi"><small>Avisos</small><b id="qaWarnings">—</b></div>
        <div class="qa-stage4-kpi"><small>OK</small><b id="qaOk">—</b></div>
        <div class="qa-stage4-kpi"><small>Duración</small><b id="qaDuration">—</b></div>
        <div class="qa-stage4-kpi"><small>Última ejecución</small><b id="qaLastRun">—</b></div>
      </div>
      <div id="regressionSummary" class="qa-stage4-note">Todavía no ejecutada.</div>
      <div id="regressionGrid" class="qa-grid"></div>
    </div>
    <div id="dataDiagList" class="diag-list"></div>
  </div>
    </section>
    <section class="technical-section"><div class="technical-section-title">Salud y procedencia</div>
    <div id="provenancePanel" class="provenance-panel provenance-collapsible collapsed">
      <div class="provenance-head">
        <div class="provenance-title-wrap">
          <div class="premium-inline-head"><h3>Salud y procedencia de datos</h3><button class="context-help" data-open-help="dataquality" title="Ayuda de salud y procedencia de datos">?</button></div>
          <div class="sub">Fuente, timestamp, frescura, LKG y coherencia de los datos críticos.</div>
        </div>
        <div class="provenance-actions">
          <button id="toggleProvenanceBtn" class="secondary-action provenance-toggle" aria-expanded="false">Ver detalle</button>
          <button id="refreshProvenanceBtn" class="secondary-action">Revalidar</button>
        </div>
      </div>
      <div id="provenanceSummary" class="provenance-summary" aria-live="polite">
        <span class="prov-summary-chip ok"><b id="provSummaryOk">0</b> actuales</span>
        <span class="prov-summary-chip warn"><b id="provSummaryWarn">0</b> demorados</span>
        <span class="prov-summary-chip bad"><b id="provSummaryBad">0</b> revisar</span>
        <span class="prov-summary-chip neutral"><b id="provSummaryLkg">0</b> respaldo/LKG</span>
        <span id="provSummaryWhen" class="prov-summary-time">Sin validación</span>
      </div>
      <div id="provenanceContent" class="provenance-content">
        <div class="provenance-content-toolbar"><span>Detalle de fuentes</span><button id="closeProvenanceBtn" class="secondary-action">Ocultar</button></div>
        <div class="provenance-table-wrap"><table class="provenance-table"><thead><tr><th>Dato</th><th>Valor</th><th>Fuente</th><th>Timestamp</th><th>Frescura</th><th>Respaldo</th><th>Coherencia</th></tr></thead><tbody id="provenanceBody"><tr><td colspan="7" class="watch-empty">Esperando datos.</td></tr></tbody></table></div>
      </div>
    </div>

    </section>
  </div>
</aside>`;
const TOP_HTML=String.raw`<div class="top">
    <div class="top-context">
      <div class="top-eyebrow">RADAR / ESPACIO DE INVERSIÓN</div>
      <div id="viewTitle" class="view-title">Centro de Mercado</div>
      <div id="viewSubtitle" class="view-subtitle">Contexto, inteligencia de mercado y decisiones prioritarias</div>
    </div>
    <div class="search command-search" data-label="ACTIVO / SÍMBOLO" aria-label="Análisis individual de activo">
      <span class="search-symbol-mark">⌕</span>
      <input id="symbol" value="BTCUSDT" placeholder="Ticker o par: BTCUSDT, AAPL, MELI, GGAL.BA…"/>
      <select id="assetType">
        <option value="auto">Auto detectar</option>
        <option value="crypto">Par cripto</option>
        <option value="stock">Acción / ADR USA</option>
        <option value="argstock">Acción Argentina</option>
        <option value="cedear">CEDEAR / BYMA</option>
        <option value="argbond">Bono / Letra Argentina</option>
        <option value="on">Obligación Negociable (ON)</option>
      </select>
      <button id="analyzeBtn">Analizar</button>
    </div>
    <div class="top-utilities">
      <span class="realtime-pill"><i></i> DATOS REALES</span>
      <span id="topClock" class="top-clock">--:--</span>
    </div>
  </div>`;
const FOOTER_HTML=String.raw`<div class="footer"><span>Datos técnicos y fundamentales · Open BYMADATA / Binance / Yahoo / Finviz / Alpha Vantage · Renta fija: compararfondos.com.ar / Eco Valores / argen.bond · Macro: BondTerminal / INDEC / DolarApi / ArgentinaDatos · Riesgo país: ArgentinaDatos · Dólar: DolarApi · Uso personal · No constituye asesoramiento financiero.</span><span id="statusLine">Listo.</span></div>`;
const LOADING_HTML=String.raw`<div id="loading" class="loading" role="status" aria-live="polite" aria-busy="true"><div class="loader premium-loader"><div class="premium-loader-head"><span class="dash-mini-spinner" aria-hidden="true"></span><div><small>RADAR · PROCESANDO</small><b>Analizando activo…</b></div></div><div class="sub" id="loadingText">Descargando datos.</div><div class="premium-loader-track" aria-hidden="true"><i></i></div></div></div>`;
const TOAST_HTML=String.raw`<div id="radarToastHost" class="radar-toast-host" aria-live="polite" aria-atomic="false"></div>`;
const DIALOG_HTML=String.raw`<div id="radarDialogHost" class="radar-dialog-backdrop" aria-hidden="true"><section class="radar-dialog" role="dialog" aria-modal="true" aria-labelledby="radarDialogTitle" aria-describedby="radarDialogMessage"><div class="radar-dialog-kicker">RADAR · ACCIÓN</div><h3 id="radarDialogTitle">Confirmar acción</h3><p id="radarDialogMessage" class="radar-dialog-message"></p><label id="radarDialogInputWrap" class="radar-dialog-input-wrap" hidden><span id="radarDialogInputLabel">Valor</span><input id="radarDialogInput" autocomplete="off" /></label><div class="radar-dialog-actions"><button id="radarDialogCancel" type="button" class="secondary-action">Cancelar</button><button id="radarDialogConfirm" type="button">Confirmar</button></div></section></div>`;
const byId=id=>document.getElementById(id);
let chromeInitialized=false;
let clockTimer=null;

function mountHtml(id,html){
  const host=byId(id);
  if(!host)return false;
  host.insertAdjacentHTML('beforebegin',html);
  host.remove();
  return true;
}

function updateTopClock(){
  const el=byId('topClock');
  if(!el)return;
  el.textContent=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
}

function openTechnicalDrawer(){
  const drawer=byId('technicalDrawer'),backdrop=byId('technicalDrawerBackdrop');
  if(!drawer)return;
  drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');
  if(backdrop){backdrop.classList.add('open');backdrop.setAttribute('aria-hidden','false')}
  document.body.classList.add('technical-drawer-open');
  setTimeout(()=>byId('technicalDrawerClose')?.focus(),30);
  try{window.renderProvenance?.()}catch{}
}

function closeTechnicalDrawer(){
  const drawer=byId('technicalDrawer'),backdrop=byId('technicalDrawerBackdrop');
  if(!drawer)return;
  drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');
  if(backdrop){backdrop.classList.remove('open');backdrop.setAttribute('aria-hidden','true')}
  document.body.classList.remove('technical-drawer-open');
}

function toggleTechnicalDrawer(){
  byId('technicalDrawer')?.classList.contains('open')?closeTechnicalDrawer():openTechnicalDrawer();
}

function initChrome(){
  if(chromeInitialized)return;
  chromeInitialized=true;
  const collapsed=localStorage.getItem('radar_sidebar_collapsed_v80')==='1';
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  byId('sidebarCollapseBtn')?.addEventListener('click',()=>{
    document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('radar_sidebar_collapsed_v80',document.body.classList.contains('sidebar-collapsed')?'1':'0');
  });
  byId('technicalMenuBtn')?.addEventListener('click',toggleTechnicalDrawer);
  byId('technicalDrawerClose')?.addEventListener('click',closeTechnicalDrawer);
  byId('technicalDrawerBackdrop')?.addEventListener('click',closeTechnicalDrawer);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&byId('technicalDrawer')?.classList.contains('open'))closeTechnicalDrawer();
  });
  updateTopClock();
  clockTimer=setInterval(updateTopClock,30000);
}

const dialogQueue=[];
let dialogActive=false;

function ensureDialogHost(){
  let host=byId('radarDialogHost');
  if(!host){document.body.insertAdjacentHTML('beforeend',DIALOG_HTML);host=byId('radarDialogHost')}
  return host;
}

function runDialogQueue(){
  if(dialogActive||!dialogQueue.length)return;
  dialogActive=true;
  const req=dialogQueue.shift(),host=ensureDialogHost(),panel=host.querySelector('.radar-dialog'),title=byId('radarDialogTitle'),message=byId('radarDialogMessage'),inputWrap=byId('radarDialogInputWrap'),input=byId('radarDialogInput'),inputLabel=byId('radarDialogInputLabel'),cancel=byId('radarDialogCancel'),confirm=byId('radarDialogConfirm');
  const tone=['warn','bad','ok','info'].includes(String(req.options?.tone||''))?String(req.options.tone):(req.kind==='alert'?'info':'warn');
  panel.dataset.tone=tone;title.textContent=String(req.options?.title||(req.kind==='prompt'?'Ingresar dato':req.kind==='alert'?'Información':'Confirmar acción'));
  message.textContent=String(req.message||'');
  const isPrompt=req.kind==='prompt',isAlert=req.kind==='alert';
  inputWrap.hidden=!isPrompt;if(isPrompt){inputLabel.textContent=String(req.options?.inputLabel||'Valor');input.type=String(req.options?.inputType||'text');input.inputMode=String(req.options?.inputMode||'text');input.placeholder=String(req.options?.placeholder||'');input.value=String(req.defaultValue??'')}
  cancel.hidden=isAlert;cancel.textContent=String(req.options?.cancelLabel||'Cancelar');confirm.textContent=String(req.options?.confirmLabel||(isAlert?'Cerrar':isPrompt?'Continuar':'Confirmar'));
  host.classList.add('open');host.setAttribute('aria-hidden','false');document.body.classList.add('radar-dialog-open');
  const previous=document.activeElement;
  let settled=false;
  const finish=value=>{if(settled)return;settled=true;host.classList.remove('open');host.setAttribute('aria-hidden','true');document.body.classList.remove('radar-dialog-open');document.removeEventListener('keydown',onKey,true);host.removeEventListener('click',onBackdrop);cancel.removeEventListener('click',onCancel);confirm.removeEventListener('click',onConfirm);req.resolve(value);setTimeout(()=>{try{previous?.focus?.()}catch{};dialogActive=false;runDialogQueue()},120)};
  const onCancel=()=>finish(isPrompt?null:false),onConfirm=()=>finish(isPrompt?input.value:true),onBackdrop=e=>{if(e.target===host&&!req.options?.persistent)onCancel()},onKey=e=>{if(e.key==='Escape'&&!req.options?.persistent){e.preventDefault();onCancel();return}if(e.key==='Enter'&&(document.activeElement===input||!isPrompt)){e.preventDefault();onConfirm()}};
  cancel.addEventListener('click',onCancel);confirm.addEventListener('click',onConfirm);host.addEventListener('click',onBackdrop);document.addEventListener('keydown',onKey,true);
  setTimeout(()=>{(isPrompt?input:(isAlert?confirm:cancel))?.focus?.();if(isPrompt)input?.select?.()},20);
}

function requestDialog(kind,message,defaultValue,options={}){return new Promise(resolve=>{dialogQueue.push({kind,message:String(message??''),defaultValue,options,resolve});runDialogQueue()})}
function confirmDialog(message,options={}){return requestDialog('confirm',message,'',options)}
function promptDialog(message,defaultValue='',options={}){return requestDialog('prompt',message,defaultValue,options)}
function alertDialog(message,options={}){return requestDialog('alert',message,'',options)}

const radarActionLocks=new Map();
const RADAR_ACTION_SLOW_MS=12000;
const RADAR_ACTION_GROUPS=Object.freeze({
  analyzeBtn:'analysis',
  startScanBtn:'scanner',rfStartBtn:'scanner',
  dashRefreshBtn:'market-refresh',marketBoardRefresh:'market-refresh',intelRefresh:'market-refresh',
  addWatchBtn:'watchlist-write',refreshWatchlistBtn:'watchlist-refresh',
  quickPortfolioSave:'portfolio-mutation',reducePositionSave:'portfolio-mutation',cashFlowSave:'portfolio-mutation',g2CashSave:'portfolio-mutation',g2ReconcileSave:'portfolio-mutation',
  importRadarFile:'portfolio-mutation',refreshPortfolioRiskBtn:'portfolio-analytics',refreshPerformanceBtn:'portfolio-analytics',
  labReplayBtn:'research',labBacktestBtn:'research',modelProposalBtn:'research',applyModelProposalBtn:'research',resetModelWeightsBtn:'research',signalAuditBtn:'research',
  cedarRefreshBtn:'cedear-work',cedarImportBtn:'cedear-work',cedarWatchAllBtn:'cedear-work',cedarSaveSettingsBtn:'cedear-work',cedarAddPositionBtn:'cedear-work',cedarSimulateBtn:'cedear-work',cedarBlacklistAddBtn:'cedear-work',
  allocatorRunBtn:'allocator-scan',g2OpportunityDiscoverBtn:'allocator-scan',
  allocatorGenerateReportBtn:'allocator-report',allocatorExportExcelBtn:'allocator-report',allocatorExportPdfBtn:'allocator-report',allocatorBrochureBtn:'allocator-report',allocatorShareReportBtn:'allocator-report',
  advisorSaveBtn:'advisor-write',advisorLinkPortfolioBtn:'advisor-write',advisorDeactivateBtn:'advisor-write',advisorHoldingAddBtn:'advisor-write',advisorRefreshBtn:'advisor-load',advisorPersonalizeBtn:'advisor-analysis',advisorMonitorAllBtn:'advisor-analysis',advisorCandidatesBtn:'advisor-analysis',
  selfTestBtn:'qa',regressionBtn:'qa',qaLocalBtn:'qa',retryConfigSaveBtn:'config-persistence'
});
function radarActionGroupFor(key){
  const value=String(key||'');
  if(RADAR_ACTION_GROUPS[value])return RADAR_ACTION_GROUPS[value];
  if(value.startsWith('cedar:'))return 'cedear-work';
  if(value.startsWith('watchlist:'))return 'watchlist-write';
  if(value.startsWith('portfolio:stress:'))return 'portfolio-analytics';
  if(value.startsWith('advisor:action:')||value.startsWith('advisor:meeting:')||value.startsWith('advisor:review:'))return 'advisor-write';
  return `action:${value||'anonymous'}`
}
function radarActionControls(group){
  const ids=Object.entries(RADAR_ACTION_GROUPS).filter(([,g])=>g===group).map(([id])=>id);
  const controls=ids.map(id=>byId(id)).filter(Boolean);
  if(group==='portfolio-analytics')document.querySelectorAll?.('[data-stress]')?.forEach?.(el=>{if(!controls.includes(el))controls.push(el)});
  return controls;
}
function setRadarActionUi(group,control,busy){
  const peers=radarActionControls(group);
  if(control&&!peers.includes(control))peers.push(control);
  for(const el of peers){
    if(busy){
      if(!el.hasAttribute('data-radar-prev-aria-disabled'))el.setAttribute('data-radar-prev-aria-disabled',el.getAttribute('aria-disabled')??'__none__');
      if('disabled' in el&&!el.hasAttribute('data-radar-prev-disabled')){el.setAttribute('data-radar-prev-disabled',el.disabled?'1':'0');el.disabled=true}
      el.setAttribute('aria-disabled','true');el.setAttribute('aria-busy',el===control?'true':'false');el.classList.add(el===control?'radar-action-busy':'radar-action-peer-locked');
    }else{
      const prev=el.getAttribute('data-radar-prev-aria-disabled');
      if(prev==='__none__')el.removeAttribute('aria-disabled');else if(prev!==null)el.setAttribute('aria-disabled',prev);
      const prevDisabled=el.getAttribute('data-radar-prev-disabled');
      if(prevDisabled!==null&&'disabled' in el)el.disabled=prevDisabled==='1';
      el.removeAttribute('data-radar-prev-aria-disabled');el.removeAttribute('data-radar-prev-disabled');el.removeAttribute('aria-busy');el.classList.remove('radar-action-busy','radar-action-peer-locked','radar-action-long-running');
    }
  }
}
function radarActionLabel(control,key){
  const raw=String(control?.getAttribute?.('aria-label')||control?.textContent||key||'Acción').replace(/\s+/g,' ').trim();
  return raw.length>56?`${raw.slice(0,53)}…`:raw||'Acción'
}
function startRadarActionWatchdog(group,lock,control){
  if(typeof setTimeout!=='function')return null;
  return setTimeout(()=>{
    const current=radarActionLocks.get(group);if(current!==lock)return;
    current.slowNotified=true;control?.classList?.add?.('radar-action-long-running');
    notify(`${radarActionLabel(control,lock.key)}: la operación sigue en curso. Radar continúa procesando y mantiene la acción protegida.`,{tone:'info',duration:5200,footer:false});
  },RADAR_ACTION_SLOW_MS)
}
function clearRadarActionWatchdog(lock){if(lock?.watchdog!==null&&typeof clearTimeout==='function')clearTimeout(lock.watchdog)}
function reportActionError(error,{key,control,errorMessage}={}){
  if(error?.radarAlreadyReported===true)return;
  const text=String(error?.message||error||'Error inesperado');
  const prefix=String(errorMessage||`No se pudo completar ${radarActionLabel(control,key).toLowerCase()}`);
  notify(`${prefix}: ${text}`,{tone:'bad',duration:6500});
}
function radarPortfolioMutationSnapshot(){
  try{
    if(typeof state==='undefined'||!state?.config)return null;
    const cfg=state.config,watch=(Array.isArray(cfg.watchlist)?cfg.watchlist:[]).map(item=>({
      symbol:item?.symbol||'',type:item?.type||'',tf:item?.tf||'',inPortfolio:!!item?.inPortfolio,
      positionSize:Number(item?.positionSize)||0,quantity:Number(item?.quantity)||0,buyPrice:Number(item?.buyPrice)||0,
      portfolioCurrency:item?.portfolioCurrency||'',realizedPnl:Number(item?.realizedPnl)||0,cashIncome:Number(item?.cashIncome)||0,
      transactions:(Array.isArray(item?.transactions)?item.transactions:[]).map(t=>({id:t?.id||'',type:t?.type||'',ts:Number(t?.ts)||0,qty:Number(t?.qty)||0,price:Number(t?.price)||0,amount:Number(t?.amount)||0,fees:Number(t?.fees)||0,currency:t?.currency||''}))
    }));
    return JSON.stringify({watchlist:watch,portfolioBaseCurrency:cfg.portfolioBaseCurrency||'ARS',portfolioCapital:Number(cfg.portfolioCapital)||0,portfolioCashTransactions:cfg.portfolioCashTransactions||[],portfolioCashReconciliation:cfg.portfolioCashReconciliation||null});
  }catch{return null}
}
function radarFinalizePortfolioMutation(group,before,control,key){
  if(group==='portfolio-mutation')try{const after=radarPortfolioMutationSnapshot();if(before!==null&&after!==null&&after!==before)window.radarMarkPortfolioAnalyticsStale?.(`Cambio de cartera · ${radarActionLabel(control,key)}`)}catch{}
}
function guardAction(handler,{key,control}={}){
  if(typeof handler!=='function')return handler;
  return function radarGuardedAction(event){
    const actionKey=String(key||control?.id||event?.currentTarget?.id||handler.name||'anonymous');
    const group=radarActionGroupFor(actionKey),active=radarActionLocks.get(group);
    if(active){event?.preventDefault?.();event?.stopImmediatePropagation?.();return active.promise}
    const actionControl=control||event?.currentTarget||null,portfolioBefore=group==='portfolio-mutation'?radarPortfolioMutationSnapshot():null;
    let result;
    try{result=handler.apply(this,arguments)}catch(error){radarFinalizePortfolioMutation(group,portfolioBefore,actionControl,actionKey);throw error}
    if(!result||typeof result.then!=='function'){radarFinalizePortfolioMutation(group,portfolioBefore,actionControl,actionKey);return result}
    const promise=Promise.resolve(result),lock={key:actionKey,promise,startedAt:Date.now(),watchdog:null,slowNotified:false};
    radarActionLocks.set(group,lock);setRadarActionUi(group,actionControl,true);lock.watchdog=startRadarActionWatchdog(group,lock,actionControl);
    promise.finally(()=>{
      radarFinalizePortfolioMutation(group,portfolioBefore,actionControl,actionKey);
      const current=radarActionLocks.get(group);
      if(current?.promise===promise){clearRadarActionWatchdog(current);radarActionLocks.delete(group);setRadarActionUi(group,actionControl,false)}
    }).catch(()=>{});
    return promise;
  }
}
function bindAction(el,event,handler,options={}){
  if(!el||typeof handler!=='function')return false;
  const key=options.key||el.id||handler.name,wrapped=guardAction(handler,{key,control:el});
  const boundary=function radarActionBoundary(ev){
    try{
      const result=wrapped.call(this,ev);
      if(result&&typeof result.then==='function')return Promise.resolve(result).catch(error=>{reportActionError(error,{key,control:el,errorMessage:options.errorMessage});return undefined});
      return result;
    }catch(error){reportActionError(error,{key,control:el,errorMessage:options.errorMessage});return undefined}
  };
  el.addEventListener(event,boundary);return true;
}
function runAction(handler,options={}){
  if(typeof handler!=='function')return Promise.resolve(undefined);
  const control=options.control||null,key=options.key||control?.id||handler.name||'anonymous';
  let result;
  try{result=guardAction(handler,{key,control}).call(control)}catch(error){
    const text=String(error?.message||error||'Error inesperado');
    notify(options.errorMessage?`${options.errorMessage}: ${text}`:`No se pudo completar la acción: ${text}`,{tone:'bad',duration:6500});
    return Promise.resolve(undefined);
  }
  return Promise.resolve(result).catch(error=>{
    const text=String(error?.message||error||'Error inesperado');
    notify(options.errorMessage?`${options.errorMessage}: ${text}`:`No se pudo completar la acción: ${text}`,{tone:'bad',duration:6500});
    return undefined;
  });
}
function actionBusy(key){return radarActionLocks.has(radarActionGroupFor(key))}

function notify(message,options={}){
  const text=String(message??'').trim();if(!text)return null;
  let host=byId('radarToastHost');
  if(!host){document.body.insertAdjacentHTML('beforeend',TOAST_HTML);host=byId('radarToastHost')}
  const tone=['ok','warn','bad','info'].includes(String(options.tone||''))?String(options.tone):'info';
  const toast=document.createElement('div');toast.className=`radar-toast ${tone}`;toast.setAttribute('role',tone==='bad'?'alert':'status');
  const icon=tone==='ok'?'✓':tone==='warn'?'!':tone==='bad'?'×':'i';
  toast.innerHTML=`<span class="radar-toast-icon">${icon}</span><span class="radar-toast-copy"></span><button type="button" class="radar-toast-close" aria-label="Cerrar notificación">×</button>`;
  toast.querySelector('.radar-toast-copy').textContent=text;host.appendChild(toast);
  const status=byId('statusLine');if(status&&options.footer!==false)status.textContent=text;
  const close=()=>{toast.classList.add('leaving');setTimeout(()=>toast.remove(),180)};toast.querySelector('.radar-toast-close')?.addEventListener('click',close);
  const duration=Math.max(1200,Number(options.duration)||3200);setTimeout(close,duration);return toast;
}

function mount(){
  mountHtml('appShellMount',SHELL_HTML);
  mountHtml('appTopBarMount',TOP_HTML);
  mountHtml('appFooterMount',FOOTER_HTML);
  mountHtml('appLoadingMount',LOADING_HTML);
  if(!byId('radarToastHost'))document.body.insertAdjacentHTML('beforeend',TOAST_HTML);
  if(!byId('radarDialogHost'))document.body.insertAdjacentHTML('beforeend',DIALOG_HTML);
  initChrome();
}

window.radarNotify=(message,tone='info',options={})=>notify(message,{...options,tone});
window.radarConfirm=(message,options={})=>confirmDialog(message,options);
window.radarPrompt=(message,defaultValue='',options={})=>promptDialog(message,defaultValue,options);
window.radarAlert=(message,options={})=>alertDialog(message,options);
window.radarGuardAction=guardAction;window.radarBindAction=bindAction;window.radarRunAction=runAction;window.radarActionBusy=actionBusy;
if(!window.__radarNativeAlert&&typeof window.alert==='function')window.__radarNativeAlert=window.alert.bind(window);
window.alert=message=>{const text=String(message??'');if(text.includes('\n')||text.length>280){void alertDialog(text,{title:'Radar Técnico',tone:'info'});return}notify(text,{tone:'warn',duration:5200})};
window.RadarAppShellUI=Object.freeze({
  version:VERSION,mount,initChrome,openTechnicalDrawer,closeTechnicalDrawer,toggleTechnicalDrawer,updateTopClock,notify,confirmDialog,promptDialog,alertDialog,guardAction,bindAction,runAction,actionBusy
});
mount();
})();

;
