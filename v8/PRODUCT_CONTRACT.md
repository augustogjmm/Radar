# Radar v8 — Product Contract

This branch starts from the last pre-experiment core commit: 0622db4a4463bb687b72f55852a20c66c3e8855c.

## Product rule

No UI rewrite may remove a capability. Every existing capability must map to exactly one primary workflow.
The legacy application remains untouched at / while v8 is developed independently under /v8/.

## Information architecture

### 1. Resumen
Purpose: answer “what matters to me now?” without duplicating full modules.

Must contain:
- Portfolio value / P&L / cash context
- Positions requiring attention
- Market regime and Argentina macro context
- Watchlist changes / alerts
- Top ranked opportunities across supported markets
- Data-health indicator and freshness
- Direct links into Discover, Research, Portfolio and Journal

Must NOT contain:
- Full scanner controls
- Full market-board catalog
- Full risk/performance reports
- Full signal history
- Duplicate charts already present elsewhere

### 2. Descubrir
Purpose: find and compare opportunities.

One workspace with asset-class modes:
- Acciones / CEDEAR / ADR / ETF
- Crypto
- Renta fija soberana
- Letras / CER / dollar-linked
- ON / corporate credit

Preserved capabilities:
- Universe selection
- Liquidity filters
- Timeframe / horizon
- Technical score
- Opportunity score
- Entry zone
- Trigger
- Stop / invalidation
- TP1 / TP2
- R:R
- Macro / higher-timeframe context
- Data source / freshness / fallback
- Dedicated fixed-income metrics: TIR, paridad, duration, maturity, currency, liquidity

Output contract:
- Results are ranked
- Asset-class-specific columns only
- Every row opens Research
- “No setup” is valid output and cannot be hidden

### 3. Investigar
Purpose: understand one instrument before acting.

Persistent header:
- Symbol / name / asset class
- Current price
- Change
- Source / freshness
- Watch / portfolio status

Tabs:
- Resumen
- Técnico
- Instrumento
- Escenarios
- Evidencia

Technical capabilities preserved:
- Multi-timeframe analysis
- Structure / BOS / CHoCH
- EMA 20 / 50 / 200
- MACD
- Volume
- Fibonacci
- Support / resistance
- Entry / trigger / stop / targets
- R:R
- Score components
- Quick backtest / evidence where applicable

Fixed-income capabilities preserved:
- Contract terms
- Cash flows
- TIR
- Paridad
- Duration / convexity
- Accrued interest
- Maturity
- Yield scenarios
- Peers / curve context
- Country-risk context

### 4. Cartera
Purpose: manage the real portfolio, not just display it.

Preserved capabilities:
- Positions / transactions / average cost
- Current value / P&L
- Base-currency conversion via MEP
- Cash transactions / reconciliation
- Allocation by asset class / sector / region / currency / maturity
- Concentration
- Risk contribution / correlations
- Performance / benchmark
- Stress scenarios
- Position sizing
- Increase / reduce / close position
- Alerts and monitoring
- Backup / restore

Layout contract:
- Holdings and P&L first
- Exposure second
- Risk / performance / stress as subviews, not separate duplicated dashboards

### 5. Diario
Purpose: evidence and decision traceability.

Preserved capabilities:
- Scanner signals
- Watchlist signals
- Fixed-income informational signals
- Trigger state
- TP / stop outcomes
- MFE / MAE
- R multiple
- Win rate
- Filters by source / period / result
- Decision audit
- CSV export
- Model/version provenance

### System / Data
Always accessible, never a main investment workflow:
- Health checks
- Source provenance
- Freshness
- Fallback source
- Runtime errors
- API consumption
- QA / regression
- Config persistence state

## Non-negotiable UX rules

1. One datum has one primary home. No duplicated dashboards.
2. One action has one primary control. No repeated buttons with different behavior.
3. Asset-class-specific information is not forced into a generic table.
4. Summary screens summarize; they do not embed entire workspaces.
5. Advanced information is reachable in one click, not removed.
6. All actionable claims show source and freshness.
7. “No action” is a legitimate answer.
8. Portfolio is authoritative for held positions; watchlist is not a second portfolio.
9. Research is the single drill-down destination from scanners, watchlist, portfolio and journal.
10. Production remains untouched until parity + browser QA + user review pass.

## Migration gate

v8 cannot replace / until automated tests prove:
- all legacy capabilities above exist,
- data-source health is green or explicitly degraded,
- BTC / SPY / GGAL / CEDEAR / AE38 probes pass,
- portfolio persistence migrates without loss,
- browser navigation has no duplicated workspaces,
- visual QA screenshots are reviewed,
- production deployment reports the certified Git SHA.
