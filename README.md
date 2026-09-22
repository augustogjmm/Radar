# Radar Técnico G2

Aplicación web estática desplegada en Vercel con APIs serverless en el mismo repositorio.

## Estructura

- `index.html`: shell mínimo y puntos de montaje.
- `styles/01-base.css`: estilos base heredados.
- `styles/02-theme-compat.css`: compatibilidad visual y overrides históricos aún necesarios.
- `styles/03-premium-authority.css`: lenguaje visual principal.
- `styles/04-portfolio-layout.css`: layout específico de cartera/riesgo.
- `styles/05-responsive.css`: autoridad final de responsive y estabilidad de tablas/grillas.
- `runtime/`: JavaScript browser separado por responsabilidad y cargado en orden determinístico.
- `web-compat.js`: persistencia/localStorage y guardrails de compatibilidad.
- `api/`: endpoints serverless y proveedores de datos.
- `vercel.json`: rewrites y configuración de despliegue.

## Regla de mantenimiento

No insertar bloques grandes de CSS o JavaScript en `index.html`. Los cambios visuales van a `styles/`; la lógica browser al módulo correspondiente de `runtime/`; datos y proveedores a `api/`.

La rama `backup/pre-cleanup-2026-09-22` conserva el estado previo a esta refactorización.
