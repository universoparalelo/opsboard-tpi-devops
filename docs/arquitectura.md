# Arquitectura de M6 y sus integraciones

El diagrama de integraciones, el estado de cada una y la comparativa entre las dos implementaciones
(Grupo 5 y Grupo 12) están en **[relevamiento/README.md](relevamiento/README.md)**.

## Telemetría (lo que armamos nosotros)

```mermaid
flowchart LR
  subgraph servicios
    G5[M6 Grupo 5<br/>service.name=m6-grupo5]
    G12[M6 Grupo 12<br/>service.name=m6-grupo12]
  end
  K6[k6<br/>generador de carga]
  K6 -- HTTP --> G5
  K6 -- HTTP --> G12
  G5 -- OTLP --> C[OpenTelemetry Collector]
  G12 -. OTLP pendiente .-> C
  C -- trazas --> J[Jaeger]
  C -- métricas --> P[Prometheus]
  C -- logs --> L[Loki]
  K6 -- remote write --> P
  J --> GR[Grafana]
  P --> GR
  L --> GR
```

Stack local en [`observabilidad/`](../observabilidad/) (docker compose). Dashboard en [`dashboards/`](../dashboards/).
