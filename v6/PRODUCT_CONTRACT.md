# Radar V6 — Product contract

## Product goal
Radar is a personal market decision workspace. It must answer four questions quickly:
1. What deserves attention now?
2. What changed in my portfolio?
3. What is the market context that matters for those decisions?
4. What is the evidence behind a specific idea?

## Primary workflows
- **Resumen** — priorities, portfolio alerts, four context numbers.
- **Oportunidades** — actionable candidates only; drill into one asset for evidence.
- **Análisis** — chart + decision + levels + invalidation; advanced indicators are secondary.
- **Cartera** — value, P&L, concentration, positions requiring attention; risk/performance are drill-down.
- **Renta fija** — comparable instruments by objective/horizon with yield, parity, duration, liquidity and scenario.

## UI rules
- One screen = one question.
- No more than four headline KPIs per section.
- Do not repeat the same conclusion in multiple panels.
- Every recommendation must show: state, reason, invalidation and source freshness.
- Missing data is explicit. Never manufacture values to fill a panel.
- Advanced analytics stay collapsed until requested.
- A feature that is unreliable does not appear in the primary flow.
- Tables default to decision-relevant columns only.
- System diagnostics live outside the investment workflow.

## Engineering rules
- Reuse current API/provider adapters where validated.
- Rebuild the frontend without depending on legacy DOM shape.
- New UI components consume normalized view models.
- Scanner, portfolio and asset-analysis engines expose data; they do not own presentation.
- Production certification requires live provider health plus browser QA.
