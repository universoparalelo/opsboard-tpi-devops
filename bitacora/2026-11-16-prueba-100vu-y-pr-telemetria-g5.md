# 2026-11-16 · Cele · M6 — Prueba local de 100 VUs y PR de telemetría al Grupo 5

- **Fecha:** 2026-11-16.
- **Objetivo:** dejar el entorno listo para una demostración, validar con una corrida de 100 VUs y entregar la instrumentación del Grupo 5 al repositorio original mediante un pull request.
- **Entorno:** el mismo de la [entrada del 2026-11-13](2026-11-13-observabilidad-local-y-telemetria-g5.md) (todo local, en una sola notebook).

## Tarea ejecutada

### 1. Corrida local de 100 VUs
`RAMPA=15s DURACION=45s ./k6/correr.sh grupo5 100`, `testid=grupo5-100vu-20261116-200911`. Resultados del [resumen JSON](../resultados/grupo5/100vu/resumen-grupo5-100vu-20261116-200911.json) generado por k6:

| Medida | Resultado |
|---|---|
| Solicitudes HTTP | 7691 (94,5 req/s) |
| Solicitudes fallidas | 0 % |
| Latencia HTTP | p50 484 ms · p95 1187 ms · p99 1528 ms · máx. 1679 ms |
| Viajes | 1676 completados · 329 cancelados |

Comparación con la corrida de humo de 50 VUs del 2026-11-13 (p95 396 ms): al duplicar los usuarios virtuales, la latencia p95 se triplicó aproximadamente, sin errores. Es una observación cualitativa; **no** es una medición válida del servicio porque el generador de carga y el servicio compartían recursos en la misma máquina, y no se cumple todavía el requisito de cloud.

### 2. Controles previos al PR (reproduciendo el CI del Grupo 5)
Sobre el árbol de trabajo del Grupo 5 con los cambios de telemetría, antes de abrir el PR:

| Control | Resultado |
|---|---|
| `npm run typecheck` | sin errores |
| `npm test` (unitarios y e2e con repositorio en memoria) | 74 unitarios en verde; e2e 63 en verde y 16 saltados (necesitan infraestructura real) |
| `npm run test:infra` (PostgreSQL, RabbitMQ y Redis reales) | 79 de 79 |
| `npm audit --omit=dev --audit-level=moderate` | 0 vulnerabilidades (igual que sin los cambios) |
| Imagen Docker (construcción y `/health` sin `.env` ni destino de telemetría) | responde |

La telemetría queda **apagada por defecto**: solo se activa con `OTEL_EXPORTER_OTLP_ENDPOINT`, de modo que no cambia el comportamiento, los tests ni la imagen del servicio.

### 3. Pull request al Grupo 5
Rama `telemetria` dividida en cuatro commits, cada uno compilable:
1. `47a900b`: dependencias de OpenTelemetry.
2. `cb79796`: arranque del SDK y definición de las métricas propias.
3. `fbb0a03`: medición y trazas del ciclo de vida en `ViajesService`.
4. `dc10fa3`: `trace_id` y `span_id` en los logs y envío por OTLP.

PR: [FRRe-DS/2026-05-TPI#3 «Telemetria»](https://github.com/FRRe-DS/2026-05-TPI/pull/3), abierto desde un fork. **Mergeado el 2026-11-18 (21:57 UTC)** por `facubressan2005-spec`.

## Decisiones / acuerdos con Desarrollo
El Grupo 5 aceptó el PR. Queda pendiente acordar con ambos grupos la convención de nombres de métricas y atributos (`service.name`, `grupo`) para que el dashboard compare los dos servicios.

## Repositorio / issue / PR
- Grupo 5: [PR #3](https://github.com/FRRe-DS/2026-05-TPI/pull/3) (mergeado).
- Grupo 12: al 2026-11-23 hay un PR de telemetría abierto, [FRRe-DS/2026-12-TPI#28](https://github.com/FRRe-DS/2026-12-TPI/pull/28), y uno de CI con Semgrep, [#27](https://github.com/FRRe-DS/2026-12-TPI/pull/27). Sin mergear.

## Evidencia
[Resumen JSON de k6 (100 VUs)](../resultados/grupo5/100vu/resumen-grupo5-100vu-20261116-200911.json) y el [PR #3](https://github.com/FRRe-DS/2026-05-TPI/pull/3) con sus cuatro commits. No hay capturas de pantalla de esta fecha.

## Resultado
La instrumentación del Grupo 5 está integrada en el repositorio original y el entorno local reproduce la demostración (dashboard, trazas, logs y carga). El ejemplo de 100 VUs sirve para mostrar el flujo de extremo a extremo.

## Dificultad o bloqueo
- Las corridas de 50/100/500/1000 VUs formales dependen del despliegue cloud y del acuerdo del escenario con Desarrollo.
- Los endpoints de calificación del Grupo 12 no están en el contrato unificado, y el contrato de G12 incorporó el prefijo `/api/v1`, que G5 no tiene; el script de k6 sigue funcionando por el alias sin prefijo.

## Siguiente acción
Revisar el PR #28 de telemetría del Grupo 12, acordar la convención de métricas y definir con el equipo de cloud dónde correrá k6 y el servicio.
