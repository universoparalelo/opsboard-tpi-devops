# 2026-11-13 · Cele · M6 — Stack de observabilidad local, telemetría del Grupo 5, dashboard y escenario k6

- **Fecha:** 2026-11-13.
- **Objetivo:** tener un entorno local donde el servicio M6 envíe trazas, métricas y logs con OpenTelemetry, verlos en un dashboard y poder generar carga con k6, para el rol de instrumentación (Hito 2) y la preparación del Hito 3.
- **Entorno:** notebook local con Docker. Servicio `m6-viajes` del Grupo 5 (commit base `7e96af7`, Node 24 local, `.nvmrc` indica 22) con PostgreSQL, RabbitMQ y Redis del `docker-compose` del propio servicio.

## Tarea ejecutada

### 1. Stack de observabilidad local (`observabilidad/`)
Commit `4f387c5`. Un `docker compose` con cinco servicios:

| Servicio | Función | Puerto |
|---|---|---|
| OpenTelemetry Collector | Recibe OTLP del servicio y reparte cada señal | 4317 (gRPC), 4318 (HTTP) |
| Jaeger | Trazas | 16686 |
| Prometheus | Métricas (el colector las expone en 8889 y Prometheus las consulta cada 5 s) | 9090 |
| Loki | Logs (el colector los envía por OTLP/HTTP) | 3100 |
| Grafana | Dashboards, con los tres datasources provisionados | 3001 |

Los servicios solo hablan OTLP con el colector, de modo que cambiar de destino (por ejemplo, la plataforma APM de la cátedra, todavía sin definir) es cambiar el endpoint y no el código. Se verificó el camino colector → Jaeger enviando a mano una traza de prueba por OTLP/HTTP y consultándola por la API de Jaeger.

### 2. Instrumentación del Grupo 5
Se instrumentó el servicio **en local y sin commits en su repositorio hasta el PR** (ver la [entrada del 2026-11-16](2026-11-16-prueba-100vu-y-pr-telemetria-g5.md)):
- `src/telemetria/instrumentacion.ts`: arranca el SDK antes que NestJS. Solo se activa si existe `OTEL_EXPORTER_OTLP_ENDPOINT`. Instrumentaciones de HTTP, Express, NestJS, `pg`, `ioredis`, `amqplib` y `fetch` (undici, que es lo que usa la llamada a M8), más métricas de runtime y de CPU/memoria del proceso.
- `src/telemetria/metricas.ts`: las tres métricas propias, que son `m6_trip_transitions`, `m6_trip_cancellations` y `m6_transition_duration`, y spans por operación del ciclo de vida.
- `ViajesService`: todas las transiciones pasan por un único método (`ejecutar`), que es donde se mide. El span `m8.validarCodigo` rodea la validación del QR.
- `RegistroJson`: cada log suma `trace_id` y `span_id` y se envía también por OTLP.

Las etiquetas de las métricas son categorías cerradas (estado, actor, motivo, acción); nunca ids de viaje o usuario, para no multiplicar series en Prometheus.

### 3. Dashboard de Grafana
Commit `b6abebc`: `dashboards/m6-observabilidad.json`, cargado por provisioning desde `observabilidad/grafana/provisioning/dashboards/`. Secciones: resumen, indicadores técnicos (pedidos por segundo, latencia p50/p95/p99, errores 4xx/5xx, CPU, memoria, event loop, latencia de PostgreSQL), las tres métricas propias, la sección de k6 y un panel de logs con enlace "Ver traza" hacia Jaeger. Selector de servicio (`m6-grupo5`, `m6-grupo12`) y de corrida k6.

### 4. Escenario y lanzador de k6
Commit `b6abebc`: `k6/escenarios/ciclo-de-viaje.js` y `k6/correr.sh`. Uso: `./k6/correr.sh <grupo5|grupo12> <50|100|500|1000>`; k6 corre con la imagen Docker `grafana/k6` y envía sus métricas a Prometheus por remote write, etiquetadas con `testid`.

## Decisiones de diseño (a acordar con Desarrollo)
- **Límite de pedidos de los servicios.** Ambos repos limitan por usuario (120/min) y por servicio (1200/min para el rol `SYSTEM`). El escenario usa **un cliente y un conductor nuevos por iteración** y reparte los VUs entre varios tokens `SYSTEM` (`m5-despacho-1..N`, con N creciente con la carga). Si no, con 500 o 1000 VUs se mediría el limitador y no el servicio.
- **Tokens firmados dentro del script** (HS256, mismo formato que `npm run token` del Grupo 5); el Grupo 12 no verifica la firma, solo lee `sub`, `role` y `exp`.
- **Agrupación de requests por `name`** (`POST /trips/:id/arrived`, etc.) para no crear una serie por cada viaje.
- **Nombres de métricas:** en el código son `m6_trip_transitions`, etc.; Prometheus agrega `_total` (contadores) y `_seconds` (unidad `s`).

## Problemas encontrados y resolución
- **Logs que no llegaban a Loki:** el SDK registra el proveedor de logs en `@opentelemetry/api` (v1.10 ya incluye la API de logs) y el código importaba desde `@opentelemetry/api-logs`, un registro global distinto. Se corrigió el import y se eliminó la dependencia sobrante.
- **Ruido en Jaeger:** el relevador de eventos consulta PostgreSQL cada segundo y generaba cientos de trazas sueltas. Se configuró `requireParentSpan` en la instrumentación de `pg` para trazar solo consultas originadas en un pedido.
- **`.env` y OpenTelemetry:** NestJS lee el `.env` después de que arranca el SDK; se carga el `.env` al inicio de `instrumentacion.ts` para que las variables `OTEL_*` valgan.
- **Logs del dashboard en "No data":** Loki rechaza el selector `service_name=~".*"` (acepta valores vacíos). Se cambió el valor de "All" a `.+` y se quitó un campo de búsqueda que dificultaba la consulta.
- **Resumen de k6 sin guardar:** el contenedor corría con otro usuario y no podía escribir en `resultados/`. Se agregó `--user` a `correr.sh`.

## Verificación
- Trazas, métricas y logs llegan y se correlacionan (el `trace_id` de un log abre la traza en Jaeger). Árbol de una traza de `POST /trips/:id/start`: controlador → `trip.START` → consultas `pg` → `m8.validarCodigo`. En un `409` el span queda marcado como error.
- Métricas visibles en Prometheus: `m6_trip_transitions_total`, `m6_trip_cancellations_total`, `m6_transition_duration_seconds_*`, CPU, memoria, event loop, latencia HTTP y de base.
- Las 22 consultas del dashboard que usan Prometheus devolvieron datos con tráfico real.

## Prueba de carga de humo: 50 VUs
`RAMPA=10s DURACION=30s ./k6/correr.sh grupo5 50` (aprox. 1 minuto en total). Valores tomados de la **salida de consola de k6**:

| Medida | Resultado |
|---|---|
| Solicitudes HTTP | 5306 (aprox. 86 req/s) |
| Checks | 100 % (5306/5306) |
| Solicitudes fallidas | 0 % |
| Latencia HTTP | p50 77 ms · p95 396 ms · p99 572 ms · máx. 924 ms |
| Viajes | 1163 completados · 218 cancelados · 1381 ciclos |

> **Aclaración sobre la evidencia:** el resumen JSON de esta corrida **no se guardó** (error de permisos descripto arriba, corregido después), así que `resultados/grupo5/50vu/` quedó vacío y estas cifras no son reproducibles desde un archivo. La corrida de 100 VUs del 2026-11-16 sí tiene su JSON.

> **Alcance:** k6, el servicio, PostgreSQL, RabbitMQ, Redis y el stack de observabilidad compartían la misma notebook. Son pruebas de funcionamiento, **no** mediciones válidas del servicio; las corridas comparativas deben hacerse contra un servicio desplegado en cloud, con el generador de carga documentado (requisito 5 de la consigna).

## Relevamiento
Se relevaron los repositorios del Grupo 5 y del Grupo 12 (stack, ejecución, endpoints, dependencias, calidad, riesgos y preguntas abiertas): [`docs/relevamiento/`](../docs/relevamiento/README.md), commit `cd68f9b`. Relevados los commits G5 `7e96af7` y G12 `e0755a4`.

## Decisiones / acuerdos con Desarrollo
Ninguno cerrado en esta fecha. Quedan por acordar con los grupos: la convención de nombres de métricas y atributos, el diseño del escenario de carga (límite de pedidos y tokens `SYSTEM`) y dónde se despliega cada servicio.

## Repositorio / commits
`opsboard-tpi-devops`: `4f387c5` (stack), `cd68f9b` (relevamiento), `b6abebc` (dashboard y k6). Los cambios en el Grupo 5 viajan en el PR de la [entrada siguiente](2026-11-16-prueba-100vu-y-pr-telemetria-g5.md).

## Dificultad o bloqueo
- El Grupo 12 no está instrumentado todavía; el dashboard solo muestra el Grupo 5.
- Falta la lista de plataformas APM de la cátedra: el stack local sirve para desarrollar, no reemplaza la elección.
- No hay despliegue cloud; el Grupo 5 depende de PostgreSQL, RabbitMQ y Redis y de un proceso permanente (publicación de eventos), por lo que el plan de Vercel requiere confirmación.

## Siguiente acción
Abrir el PR de telemetría hacia el Grupo 5, validar el panel con una corrida de 100 VUs y coordinar con el Grupo 12 la convención de métricas.
