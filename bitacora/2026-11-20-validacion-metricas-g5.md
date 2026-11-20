# 2026-11-20 · Philippe · M6 — Validación local de métricas del Grupo 5

- **Fecha y hora:** 2026-11-20, aproximadamente 12:45–13:03 (-03) para la prueba manual y la primera captura; consulta de los contadores en Prometheus a las 14:08 (-03); capturas de indicadores técnicos y resumen a las 14:28–14:29 (-03).
- **Objetivo:** comprobar que las tres métricas propias de M6 instrumentadas por el Grupo 5 llegan al dashboard con tráfico real del ciclo de vida de viajes.
- **Entorno:** servicio `m6-viajes` del Grupo 5 ejecutado localmente; PostgreSQL, RabbitMQ y Redis locales; colector OpenTelemetry, Prometheus y Grafana del stack local de este repositorio. El dashboard se consultó en `http://localhost:3001/d/m6-observabilidad/m6-viajes-y-ciclo-de-vida` con el servicio `m6-grupo5`.
- **Tarea ejecutada:**
  1. Se generaron viajes de prueba con `POST /trips` usando el rol `SYSTEM`; para los viajes completados se ejecutó arribo, inicio con QR y finalización usando el rol `DRIVER`. Otros viajes se cancelaron con el rol `CLIENT` y motivo `CHANGE_OF_PLANS`.
  2. El primer intento de `POST /trips/{id}/arrived` sobre el viaje `48f83514-ea48-45f0-9d10-ad5e9f230b52` devolvió `403 FORBIDDEN` porque Swagger seguía enviando el token `SYSTEM`. Se repitió con el rol `DRIVER`; el error era de autorización de la prueba, no una falla de la transición.
  3. Se comprobó en Grafana que aparecían transiciones por estado, cancelaciones por actor y motivo, tasa de cancelación, duración de operaciones y operaciones fallidas. La captura final muestra una tasa de cancelación del **12,5 %** para el intervalo seleccionado.
  4. Se consultaron los contadores acumulados de Prometheus: `m6_trip_transitions_total{from="NONE"}` = **9** viajes creados; `m6_trip_transitions_total{to="COMPLETED"}` = **5** completados; `m6_trip_cancellations_total{actor="CLIENT",reason="CHANGE_OF_PLANS"}` = **4** cancelados (todos para `service_name="m6-grupo5"`). También había series de duración para `CREATE`, `REGISTER_ARRIVAL`, `START`, `COMPLETE` y `CANCEL`.
- **Decisiones / acuerdos con Desarrollo:** no se cerró un acuerdo nuevo. Se usaron las métricas ya implementadas en el [PR de telemetría #3 del Grupo 5](https://github.com/FRRe-DS/2026-05-TPI/pull/3); esta prueba no modifica el servicio.
- **Repositorio / PR:** [telemetría del Grupo 5](https://github.com/FRRe-DS/2026-05-TPI/pull/3); [dashboard versionado](../dashboards/m6-observabilidad.json) y [convención de métricas](../docs/convencion-metricas.md) de este repositorio.
- **Evidencia:** [métricas propias de M6](evidencias/2026-11-20-g5-dashboard-m6.png), [indicadores técnicos](evidencias/2026-11-20-g5-indicadores-tecnicos.png) y [resumen con sección k6](evidencias/2026-11-20-g5-resumen-k6.png). Los valores acumulados anteriores se leyeron de Prometheus local a las 14:08 (-03).
- **Resultado:** validada localmente la exportación y visualización de las tres métricas propias de M6 del Grupo 5 con operaciones reales. El **12,5 %** del panel se calcula con incrementos durante el intervalo visible; **no** representa la proporción acumulada `4/9`. El 0 % observado inicialmente se debió a que el contador de cancelaciones ya tenía valor cuando Prometheus empezó a observarlo; una cancelación posterior hizo visible su incremento.
- **Dificultad o bloqueo:** se detectó y corrigió la selección incorrecta del rol en Swagger. Siguen pendientes la navegación de logs a trazas, la latencia p95 de PostgreSQL, el servicio del Grupo 12, el comportamiento bajo carga con k6 y un despliegue cloud.
- **Siguiente acción:** validar una traza con su log y la latencia de PostgreSQL durante operaciones de viajes; después ejecutar una prueba pequeña de k6 contra el Grupo 5 local. Coordinar con el Grupo 12 la convención de métricas antes de afirmar que el dashboard compara ambos servicios.

## Ampliación de las 14:28–14:29 (-03): indicadores técnicos

Philippe revisó las secciones **Resumen** e **Indicadores técnicos** en Grafana con el intervalo **Last 15 minutes**. El selector de servicio estaba en **All**, pero las series visibles de CPU, memoria y event loop correspondían a `m6-grupo5`; esta captura no comprueba al Grupo 12.

| Panel | Observación de la captura | Alcance |
|---|---|---|
| Pedidos por segundo y latencia | El resumen mostraba **0,0182 req/s** y latencia **p95 4,75 ms**; el gráfico mostraba p50 y p99. La ruta con actividad visible era `GET /docs`. | Confirma telemetría HTTP local con tráfico de Swagger; no es todavía una medición del flujo de viajes bajo carga. |
| Errores | El resumen marcaba **0 % de 5xx** y el gráfico de 4xx/5xx mostraba **0 req/s** en esa ventana. | No hubo errores nuevos visibles en el intervalo. El 403 de la prueba anterior no se interpreta como un 5xx. |
| CPU y memoria | Había series de `m6-grupo5`; el resumen mostraba **0,0632 % de CPU** y **95,5 MiB** de memoria en el instante de la captura. | Confirma que estas métricas llegan al dashboard local. |
| Event loop | Había una serie visible para `m6-grupo5`. | Indicador adicional disponible. |
| Latencia de PostgreSQL p95 | Panel sin datos visibles. | Pendiente: generar operaciones que consulten la base y comprobar si la métrica se exporta y la consulta del panel devuelve valores. |
| Viajes completados | El resumen marcaba **0** dentro de **Last 15 minutes**. | Es una ventana temporal; los 5 viajes completados acumulados se verificaron antes en Prometheus. |
| Prueba de carga (k6) | Los tres paneles indicaban **No data**. | Esperado mientras no se ejecute y exporte una corrida de k6; no cuenta como validación de carga. |

**Resultado de la ampliación:** se comprobó que el dashboard muestra indicadores técnicos HTTP, CPU, memoria y event loop del Grupo 5. Falta verificar PostgreSQL p95 y el vínculo entre logs y trazas.

No se guardaron JWT, secretos ni datos de producción en esta evidencia.
