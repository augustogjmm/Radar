# Radar Técnico G2 — Arquitectura de servicios y análisis de mercados

> **Proyecto personal de ingeniería y arquitectura:** integración de fuentes financieras, backend serverless, caché, controles de calidad de datos y pruebas automatizadas. El propósito es demostrar diseño de servicios y confiabilidad operacional, sin atribuir rentabilidad financiera al producto.

**[Portfolio ejecutivo de Augusto García Juárez Matorras](PORTFOLIO.md)** · [Casos profesionales de arquitectura y liderazgo](docs/EXECUTIVE_CASE_STUDIES.md) · [Demostración](https://radar-lovat-five.vercel.app)

---

**[Arquitectura y decisiones técnicas](docs/ARCHITECTURE_OVERVIEW.md)**

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


## Desarrollo local

Usá Node.js 22. El producto no necesita compilación ni una base de datos para su flujo web local. Desde la raíz del repositorio:

```sh
npm install --no-save playwright@1.55.0
npx playwright install --with-deps chromium
node scripts/qa-server.mjs
```

En otra terminal, ejecutá:

```sh
node --test scripts/market-data-test.mjs scripts/upstream-cache-test.mjs
node scripts/smoke-test.mjs
node scripts/workspace-test.mjs
```

`workspace-test.mjs` verifica las siete pantallas principales a 1672, 768 y 390 píxeles, análisis individual, exportación, respaldo y suspensión de señales ante una caída de la fuente. Las pruebas de navegador usan fixtures de mercado; la disponibilidad real se comprueba por separado con `/api/health/deep`. El servidor de QA sólo escucha en loopback.

## Datos y continuidad

- `runtime/01-market-data.js` comparte consultas públicas repetidas y conserva una caché local acotada (24 consultas y aproximadamente 2,5 MB). Los precios se consultan cada minuto y las series tienen una vigencia de consulta de cinco minutos.
- Si falla una fuente, el último resultado de menos de 24 horas puede mostrarse como referencia, con estado de datos sin validar. Las entradas y salidas quedan suspendidas hasta una consulta válida. La fecha de la última vela se comprueba por separado.
- Los valores nulos y las series sin OHLC real no habilitan una señal. Las respuestas de Yahoo Spark se usan como series de cierre; `technical=1` solicita históricos completos para el ranking. No se fabrican aperturas, máximos, mínimos ni volumen a partir del cierre.
- El backend comparte lecturas públicas en instancias calientes y limita su caché a 64 respuestas y 5 MB. Históricos diarios/semanales se reutilizan cinco minutos, las demás lecturas un minuto. No se almacenan fallos ni se comparten escrituras arbitrarias.
- `runtime/19-workspace-tools.js` aporta navegación común, estado de las consultas, ayuda, respaldo y un informe descargable del análisis. La caché de mercado puede borrarse sin perder cartera ni configuración.
- Los gráficos se sirven desde `assets/vendor/` con su licencia y atribución. No necesitan un CDN ni fuentes remotas para funcionar.
- Seguimiento, cartera e historial permanecen en el navegador. Guardá un respaldo para recuperarlos en otro equipo; no existe sincronización automática.

No se agregaron proveedores pagos. Las cuotas y disponibilidad de los servicios gratuitos siguen condicionando la operación; la caché reduce consultas, pero no garantiza costo cero ni disponibilidad absoluta.
