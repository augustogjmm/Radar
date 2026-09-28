# Radar Técnico G2 · v5 web

Radar es un producto personal de análisis de mercados y cartera. La versión web publicada se concentra en un flujo corto y auditable:

**Inicio → análisis individual → escáner RV/cripto → escáner renta fija → seguimiento → cartera/riesgo → historial.**

## Núcleo publicado

- Datos de mercado: Yahoo Finance, Binance, Open BYMADATA, DolarApi, ArgentinaDatos, BCRA, FRED/Treasury y CompararFondos.
- Análisis técnico individual para acciones/ADRs, CEDEAR/acciones argentinas y cripto.
- Escáner de renta variable/cripto.
- Escáner y ficha de renta fija.
- Seguimiento, cartera, riesgo, performance e historial de señales/decisiones.
- Persistencia web local para configuración, cartera e historial cuando no existe backend persistente.

## Arquitectura web

- `index.html`: shell mínimo.
- `runtime/02-workspace-shells.js`: DOM del producto núcleo.
- `runtime/03-browser-market.js`: dashboard, mercado y escáner RV.
- `runtime/04-fixed-income-scanner.js`: renta fija.
- `runtime/05-portfolio-runtime.js`: seguimiento, cartera, riesgo y QA núcleo.
- `runtime/06-technical-core.js`: motor técnico y proveedores.
- `runtime/07-asset-intelligence.js`: metadata del activo.
- `runtime/08-portfolio-pro.js`: movimientos y analítica de cartera.
- `runtime/11-stability-bootstrap.js`: bootstrap, salud y navegación.
- `runtime/13-decision-intelligence.js`: Centro de Decisión.
- `api/router.js` + `api/[...path].js`: backend serverless único.
- `web-compat.js`: persistencia/fallbacks web.

Los módulos experimentales de Asesor, Asignador, Rotación CEDEAR y Laboratorio no forman parte del producto publicado y no deben condicionar el QA del núcleo.


## QA automatizado

El flujo núcleo se valida con un smoke test de navegador sobre Chromium. La prueba levanta Radar localmente, ejecuta la salud profunda de proveedores, corre el pipeline real de escáner sobre BTC, SPY, GGAL y AAPL CEDEAR, navega por Escáner, Renta fija, Seguimiento y Cartera, captura evidencia y falla ante errores JavaScript o regresiones críticas.
