# Relevamiento · Grupo 5 (NestJS)

Repo: `FRRe-DS/2026-05-TPI` · carpeta local `2026-05-TPI/` · commit relevado `7e96af7` (main, 2026-11-11)
Contacto: Valentino · Servicio: `m6-viajes/` · Volver al [resumen](README.md)

## Cómo se levanta (verificado el 2026-11-13)
Requiere Node 22, y Docker para PostgreSQL, RabbitMQ y Redis.
```bash
cd m6-viajes
cp .env.example .env
npm ci
npm run infra:levantar      # PostgreSQL, RabbitMQ, Redis
npm run start               # http://localhost:3000  (Swagger en /docs)
npm run token -- SYSTEM m5-despacho   # token de desarrollo
```
Nota: `npm run start:dev` usa `--watch`; en esta sesión usamos `npm run start`.

## Arquitectura (README + código)
- NestJS 11 con capas: `http/` (controlador, DTOs) → `aplicacion/` (`ViajesService`, puertos) → `dominio/` (reglas puras) → `infraestructura/` (repositorios, RabbitMQ, validador QR).
- Todas las transiciones pasan por `ViajesService.ejecutar()`.
- Los eventos se guardan en una **bandeja de salida (outbox)** en la misma transacción que el viaje; un `RelevadorDeEventos` los publica en RabbitMQ (consulta la base cada `OUTBOX_INTERVALO_MS`, 1 s por defecto).
- Persistencia y colaboradores intercambiables por variable de entorno: `PERSISTENCIA=postgres|memoria`, `PUBLICADOR_EVENTOS=rabbitmq|log`, `IDEMPOTENCIA=redis|memoria`, `VALIDADOR_QR=simulado|m8`.

## Endpoints
`POST /trips` (rol SYSTEM) · `GET /trips` · `GET /trips/{id}` · `POST /trips/{id}/arrived|start|complete|cancel` · `GET /trips/{id}/history` · `GET /health` · `GET /health/details` · `/docs`.
Convenciones: errores `problem+json`, `ETag`/`If-Match`, `Idempotency-Key` (Redis, 24 h), `X-Correlation-Id`, límite de pedidos 120/min usuario y 1200/min servicio.

## Dependencias de otros módulos
| Módulo | Cómo | Estado |
|---|---|---|
| M1 | JWT HS256 firmado con `JWT_SECRETO` | Sin M1 real: tokens de desarrollo (`npm run token`) |
| M8 (G7 y G10) | `POST /api/v1/qr/validaciones` en paralelo a ambos, timeout 2 s (`M8_TIMEOUT_MS`) | Implementado y probado en la demo `demo/integracion-m8/`. El M8 de G7 tiene bugs conocidos (documentados por G5) |
| M5, M7, M4, M2, M3 | Por eventos en RabbitMQ (`movilidad.eventos`, routing keys `trips.*`) | Contratos propuestos, **sin acuerdo cerrado**. M7: rama `integracion-m7-tarifa-final` (3 commits) sin mergear |

## Calidad
- **CI** (`.github/workflows/m6-viajes.yml`): en push y PR que toquen `m6-viajes/**` o `contratos/**`. Pasos: `npm ci`, `npm audit --omit=dev`, `typecheck`, validación de contratos (Redocly + AsyncAPI), `npm test`, `npm run test:infra` contra Postgres/RabbitMQ/Redis reales; luego construye la imagen Docker, la prueba (`/health`) y la publica en GHCR desde `main`.
- **Tests** (ejecutados el 2026-11-13): 74 unitarios en verde; e2e 63 en verde y 16 saltados (necesitan infraestructura real, que el CI sí levanta).
- **Faltan:** SAST, E2E del flujo de viaje como paso explícito del pipeline, Quality Gates acordados.

## Seguridad y operación
- Token con `exp` obligatorio; `helmet`; cuerpos de hasta 16 KB; CORS cerrado salvo `CORS_ORIGENES`.
- Logs JSON con `correlationId`, `tripId` y `reservationId` (con `LOG_FORMATO=json`); no se registran tokens ni coordenadas.
- Imagen Docker multi-etapa, usuario no root, `HEALTHCHECK`.

## Estado de observabilidad
- Antes de nuestro trabajo: ninguna (solo logs y `/health/details`).
- **Con nuestro trabajo local (sin commit, sin PR todavía):** OpenTelemetry (trazas HTTP/Express/Nest/pg/ioredis/amqplib/undici, métricas del runtime, 3 métricas `m6_*`, logs con `trace_id`). Ver `2026-05-TPI/m6-viajes/src/telemetria/`. Se activa solo con `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Riesgos para nuestro plan
- Despliegue: necesita PostgreSQL, RabbitMQ y Redis y un proceso permanente (outbox). No encaja en un entorno serverless sin adaptar.
- El relevador del outbox consulta la base cada segundo: genera carga constante y ruido de trazas (ya filtrado en la instrumentación).
- Límite de pedidos por usuario: afecta el diseño de k6 (ver README, hallazgo 5).

## Preguntas para Grupo 5
Ver [Preguntas abiertas](README.md#preguntas-abiertas-para-llevar-a-las-reuniones).

## Fuentes
`m6-viajes/package.json`, `m6-viajes/docker-compose.yml`, `m6-viajes/src/**`, `.github/workflows/m6-viajes.yml`,
`docs/acuerdos-con-otros-grupos.md`, `docs/decisiones/ADR-001..005`, `docs/m6/maquina-de-estados.md`, `README.md`.
