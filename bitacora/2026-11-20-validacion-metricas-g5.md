# 2026-11-20 · Philippe · M6 — Validación local de métricas del Grupo 5

- **Fecha y hora:** 2026-11-20, aproximadamente 12:45–13:03 (-03) para la prueba manual y la primera captura; consulta de los contadores en Prometheus a las 14:08 (-03); capturas de indicadores técnicos y resumen a las 14:28–14:29 (-03); verificación de log y traza a las 14:38 (-03) y de una operación de viaje a las 14:48 (-03).
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
- **Dificultad o bloqueo:** se detectó y corrigió la selección incorrecta del rol en Swagger. Para exportar logs a Loki fue necesario reiniciar M6 con `LOG_FORMATO=json`. Siguen pendientes la latencia p95 de PostgreSQL, el servicio del Grupo 12, el comportamiento bajo carga con k6 y un despliegue cloud.
- **Siguiente acción:** verificar la métrica de latencia p95 de PostgreSQL en el dashboard y ejecutar una prueba pequeña de k6 contra el Grupo 5 local. Coordinar con el Grupo 12 la convención de métricas antes de afirmar que el dashboard compara ambos servicios.

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

**Resultado de la ampliación:** se comprobó que el dashboard muestra indicadores técnicos HTTP, CPU, memoria y event loop del Grupo 5. La latencia p95 de PostgreSQL sigue pendiente.

## Ampliación de las 14:38–14:45 (-03): vínculo entre log y traza

Después de reiniciar el servicio M6 local con `LOG_FORMATO=json`, se generó una solicitud `GET /` que respondió **302**. El log llegó a Loki y Philippe abrió el botón **Ver traza** desde **Logs del servicio** en Grafana. La vista de Jaeger mostró la traza del servicio `m6-grupo5` con el mismo ID `1256f32f12f2d72124cd4848ff2a3d92`.

- **Evidencia:** [línea `GET / 302` en el panel de logs](evidencias/2026-11-20-g5-log-get.png) y [traza abierta desde ese log en Jaeger](evidencias/2026-11-20-g5-traza-jaeger.png).
- **Detalle observado:** la traza duró aproximadamente **4,56 ms** y mostró **4 spans**: `GET /`, `request handler - /`, `RaizController.raiz` y `raiz`.
- **Resultado:** validada localmente la navegación **Grafana/Loki → Ver traza → Jaeger** para el Grupo 5. Esta solicitud a la raíz demuestra la correlación técnica; para presentar una investigación funcional de M6 conviene repetirla con una operación de viaje o un error.

## Ampliación de las 14:48–14:51 (-03): consulta de un viaje

Se consultó sin modificar datos el viaje de prueba `48f83514-ea48-45f0-9d10-ad5e9f230b52` mediante `GET /trips/{tripId}` con rol `SYSTEM`. La API respondió **200**. Philippe abrió desde el log de esa solicitud la traza en Jaeger.

- **Evidencia:** [log `GET /trips/... 200`](evidencias/2026-11-20-g5-log-obtener-viaje.png) y [traza de la operación de viaje](evidencias/2026-11-20-g5-traza-obtener-viaje.png).
- **Correlación:** el log y la traza comparten el ID `b9296cbc4d651c35ec6628308bc6ba55`.
- **Detalle observado:** la traza de `m6-grupo5` muestra **13 spans** y una duración total aproximada de **12,14 ms**. Incluye `ViajesController.obtener`, pasos de Redis y dos spans `pg.query:SELECT m6_viajes` de aproximadamente **2,68 ms** y **1,96 ms**.
- **Resultado:** comprobada en la interfaz la navegación **log → traza** para una operación real del módulo M6, con visibilidad de la consulta a PostgreSQL. Esto demuestra trazabilidad local; la métrica agregada **PostgreSQL p95** del dashboard sigue pendiente de validación.

No se guardaron JWT, secretos ni datos de producción en esta evidencia.

## Ampliación de las 17:54–17:58 (-03): PostgreSQL p95 y prueba breve de k6

Se continuó desde `main` en `d98c9d4`, sin cambios previos en el árbol de trabajo. El servicio local `m6-grupo5` y el stack de observabilidad seguían activos. Esta ampliación usa únicamente el Grupo 5; el Grupo 12 no fue validado.

### Diagnóstico del panel PostgreSQL p95

El panel consulta `histogram_quantile(0.95, sum by (le, service_name) (rate(db_client_operation_duration_seconds_bucket{service_name=~"$servicio"}[1m])))`. Prometheus sí tenía las series `db_client_operation_duration_seconds_bucket`, `_count` y `_sum` con `service_name="m6-grupo5"` y `db_system_name="postgresql"`. Antes de generar tráfico nuevo, la consulta devolvía `NaN`: los contadores estaban presentes, pero no aumentaban en el minuto considerado. Los spans `pg.query:SELECT` de Jaeger prueban que hubo consultas en una traza anterior; por sí solos no aportan incrementos recientes al cálculo del panel.

Se repitió cinco veces `GET /trips/48f83514-ea48-45f0-9d10-ad5e9f230b52` con un token local de rol `SYSTEM`; las cinco respuestas fueron **200**. La misma consulta PromQL devolvió **0,004733 s (4,73 ms)** y el panel empezó a dibujar la serie. Durante la carga posterior, Grafana mostró aproximadamente **4,79 ms** de media en esa curva; la [consulta de Prometheus conservada](../resultados/grupo5/grupo5-smoke-2vu-20261120-175546/prometheus-dashboard.json) contiene puntos finitos y un máximo de **4,93 ms** en el intervalo capturado. La causa comprobada del `No data` inicial fue la ausencia de consultas recientes para el `rate(...[1m])`, no la falta de instrumentación de PostgreSQL. Se aclaró esta condición en la descripción del panel.

### Prueba local de k6

Se ejecutó el [escenario de ciclo de viaje](../k6/escenarios/ciclo-de-viaje.js) contra `http://localhost:3000`, con **2 VUs máximo**, rampa de **3 s**, tramo a 2 VUs de **10 s** y bajada de **20 s**. La corrida `grupo5-smoke-2vu-20261120-175546` duró aproximadamente **33,5 s** (17:55:46–17:56:20, -03) y envió telemetría por Prometheus remote write. Fue una prueba pequeña de funcionamiento local, no una de las corridas comparativas de 50/100/500/1000 VUs.

| Medida | Resultado del resumen de k6 |
|---|---:|
| Ciclos completos | 41 |
| Solicitudes HTTP | 160; 4,77 req/s en toda la corrida |
| Checks | 160/160 (100 %) |
| Solicitudes fallidas | 0/160 (0 %) |
| Latencia HTTP desde k6 | p50 18,51 ms; p95 33,37 ms; p99 117,42 ms |
| Viajes completados / cancelados | 37 / 4 |

En el dashboard filtrado por `Servicio=m6-grupo5` y `Corrida k6=grupo5-smoke-2vu-20261120-175546` se vieron usuarios virtuales, req/s, latencias, porcentaje fallido y viajes completados/cancelados. También se observaron las curvas HTTP, CPU, memoria, transiciones y PostgreSQL p95 del servicio. Al contrastar los paneles con el [resumen JSON](../resultados/grupo5/grupo5-smoke-2vu-20261120-175546/resumen-grupo5-smoke-2vu-20261120-175546.json) se detectó que Prometheus recibe las duraciones de k6 en **segundos**, mientras el panel las formateaba como milisegundos. Se corrigió la unidad a segundos en el [dashboard versionado](../dashboards/m6-observabilidad.json), y Grafana pasó de mostrar valores como `0,035 ms` a `35,0 ms` para el p95 medio de sus series. Ese valor del gráfico promedia percentiles de series por corrida y tiempo; el **p95 global de la corrida** es el **33,37 ms** del resumen de k6.

- **Evidencia reproducible:** [salida completa de k6](../resultados/grupo5/grupo5-smoke-2vu-20261120-175546/salida-k6.txt), [resumen JSON](../resultados/grupo5/grupo5-smoke-2vu-20261120-175546/resumen-grupo5-smoke-2vu-20261120-175546.json) y [series consultadas a Prometheus](../resultados/grupo5/grupo5-smoke-2vu-20261120-175546/prometheus-dashboard.json). Las series del snapshot están filtradas al Grupo 5 o al `testid` de esta corrida; no incluyen credenciales.
- **Pendiente:** validar el Grupo 12 en el dashboard y acordar en la reunión la integración de los dos entornos con los otros grupos. Las corridas formales de 50/100/500/1000 VUs y el despliegue cloud siguen pendientes. CI/SAST corresponde a Franco.
