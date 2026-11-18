# Configuración pública del GitHub ejecutivo

Guía para completar los controles que no se pueden cambiar editando archivos. Cuenta: **augustogjmm**.

## 1. Portada de perfil

GitHub muestra un README en el perfil cuando existe un repositorio **público** cuyo nombre coincide exactamente con el usuario. Crear el repositorio **augustogjmm/augustogjmm** con un README inicial y reemplazarlo por el contenido de [PROFILE_README_TEMPLATE.md](../PROFILE_README_TEMPLATE.md). Verificar después que se muestra en https://github.com/augustogjmm.

## 2. Información personal sugerida

- **Name:** Augusto García Juárez Matorras
- **Bio:** IT Infrastructure & Operations Leader | Cloud & Enterprise Architecture | Financial Services
- **Location:** Buenos Aires, Argentina
- **Website:** https://www.linkedin.com/in/augustog/ o el [portfolio ejecutivo](../PORTFOLIO.md).
- **Email y teléfono:** mantener privados si no son necesarios. LinkedIn es el canal profesional de contacto.

## 3. Repositorios para fijar con Customize your pins

Orden recomendado: **Radar**, **mtf-live-monitor**, **Carter**, **Analizador**, **GlobalAnalyzer** y **LibroOrdenes-Rangos**. Los otros cinco pueden permanecer públicos como trabajos complementarios, sin dominar la portada.

## 4. Descripciones y temas para configurar en About

Estas descripciones hablan de arquitectura y capacidades comprobables, sin promesas de rentabilidad:

| Repo | Description | Topics |
| --- | --- | --- |
| Radar | Financial data platform showcasing API integration, serverless architecture, data quality, resilience and automated QA. | architecture, serverless, api-integration, data-quality, javascript |
| mtf-live-monitor | Cloud-backed market monitor with data validation, operational controls, automated tests and documented backend migration. | cloud-architecture, cloudflare-workers, data-validation, observability, nodejs |
| Carter | Experimental engineering lab: scheduled workflows, simulation, risk gates and reproducible testing. | engineering, github-actions, testing, simulation, risk-management |
| Analizador | Experimental web research app for market data, visual analysis and simulation with React and TypeScript. | react, typescript, market-data, data-visualization, research |
| GlobalAnalyzer | Experimental web app integrating public market APIs and CEDEAR reference information. | api-integration, financial-data, javascript, serverless |
| LibroOrdenes-Rangos | Python research tool for order-book analysis, data ingestion and liquidity visualization. | python, websocket, order-book, market-data |
| CryptoAnalisis- | Python prototype combining technical indicators, order flow and public exchange APIs. | python, technical-analysis, api-integration, research |
| HFT-ENGINE-REBOTES | Experimental Python order-book and liquidation monitor with asynchronous data processing. | python, asyncio, websockets, liquidity |
| analizer | Experimental visual order-block analyzer with technical indicators and third-party code attribution. | javascript, data-visualization, technical-analysis |
| sc | Prototype asynchronous Python scanner for public market data and technical indicators. | python, aiohttp, pandas, research |
| scalpping | Index of experimental market-data repositories; no standalone application. | research, market-data, projects-index |

## 5. Sitios de demostración para comprobar

- Radar: https://radar-lovat-five.vercel.app
- MTF: https://mtf-monitor.vercel.app
- Carter: https://carter-rust.vercel.app/desk.html
- GlobalAnalyzer: https://global-analyzer.vercel.app

Antes de usarlos como muestra en LinkedIn, abrirlos desde una ventana anónima, confirmar que cargan y comprobar errores, privacidad, estado de datos y funcionamiento de APIs. No afirmar que la demo está validada si la comprobación no terminó.

## 6. Licencias y seguridad

- Público no equivale a software con licencia abierta; elegir licencias después de revisar autoría y dependencias.
- Respetar la atribución y condiciones CC BY-NC-SA declaradas en analizer.
- Verificar tanto el árbol actual como el historial Git. Analizador tenía caché de npm/Vite en su commit inicial, aunque se limpió la rama actual.
- Activar secret scanning, push protection y alertas de dependencias si están disponibles.
- Si se detecta un secreto expuesto, revocarlo y rotarlo; cambiar .gitignore o borrar el archivo actual no elimina el secreto del historial.

## 7. LinkedIn

**Información de contacto → Sitio web:** https://github.com/augustogjmm, categoría Cartera. En **Destacados**, recomendar el portfolio ejecutivo o uno de los tres casos principales, no una lista dispersa de scripts de trading.

Última revisión de esta guía: noviembre de 2026.
