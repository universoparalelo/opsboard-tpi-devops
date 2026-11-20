# Convención de métricas y atributos de M6

Las tres métricas siguientes ya están implementadas en el servicio del Grupo 5 mediante el
[PR de telemetría #3](https://github.com/FRRe-DS/2026-05-TPI/pull/3). Esta tabla documenta
esa implementación; el Grupo 12 todavía debe acordar y adoptar la misma convención para
que el dashboard pueda comparar ambos servicios. La presencia de las métricas en el código
no sustituye la validación con datos reales en Grafana.

| Elemento | Valor |
|---|---|
| `service.name` | `m6-grupo5` / `m6-grupo12` (`OTEL_SERVICE_NAME`) |
| Atributo de recurso `grupo` | `5` / `12` (`OTEL_RESOURCE_ATTRIBUTES=grupo=5` o `grupo=12`) |
| Prefijo de métricas | `m6_` |

| # | Instrumento OpenTelemetry | Serie consultada en Prometheus | Tipo y unidad | Qué registra | Etiquetas |
|---|---|---|---|---|---|
| 1 | `m6_trip_transitions` | `m6_trip_transitions_total` | Contador; transiciones | Cada transición de viaje ya guardada, incluida la creación (`from=NONE`). Permite calcular transiciones por minuto y contar viajes que llegaron a un estado; no mide por sí sola cuántos viajes permanecen actualmente en cada estado. | `from` (estado de origen), `to` (estado destino), `actor` (rol) |
| 2 | `m6_trip_cancellations` | `m6_trip_cancellations_total` | Contador; cancelaciones | Cada transición de cancelación ya guardada. La tasa de cancelación del dashboard se calcula a partir de este contador y de las creaciones del contador 1. | `actor` (rol), `reason` (motivo) |
| 3 | `m6_transition_duration` | `m6_transition_duration_seconds_bucket`, `_sum` y `_count` | Histograma; segundos | Tiempo de ejecución de cada operación del ciclo de vida. En `start` incluye la validación del QR. Permite calcular p50, p95 y p99 por acción; no es el tiempo transcurrido entre dos estados del viaje. | `action` (operación), `resultado` (`ok` o `error`) |

Las etiquetas son categorías de baja cardinalidad: no se agregan ID de viaje, usuario ni
conductor a estas métricas. En Grupo 5, la exportación se activa al configurar
`OTEL_EXPORTER_OTLP_ENDPOINT`; el nombre del servicio y el atributo `grupo` se configuran
en su entorno según el ejemplo de arriba.
