# Relevamiento · Grupo 12 (Node nativo + Prisma)

Repo: `FRRe-DS/2026-12-TPI` · carpeta local `2026-12-TPI/` · commit relevado `e0755a4` (`m6/base-de-datos`, 2026-11-12)
Contacto: Agos · Servicio: `backend/` · Volver al [resumen](README.md)

> No levantamos este servicio ni ejecutamos sus tests: lo que sigue sale de leer el código y los documentos.

## Cómo se levanta (según su `AGENTS.md` y README)
```bash
cp .env.example .env && cp backend/.env.example backend/.env
docker compose up -d db        # PostgreSQL en el puerto 5433
cd backend && npm install
npx prisma migrate deploy && npx prisma generate
npm run dev                    # http://localhost:3006  (Swagger en /docs, panel en /)
```
O todo en Docker: `docker compose up -d --build` (aplica migraciones al arrancar). Requiere Node ≥ 22.12.

## Arquitectura (código)
- Servidor `http.createServer` en `src/explorer.ts`; capas `routes → controllers → services → repositories (Prisma)`; `domain/` con la máquina de estados y reglas de cancelación (puras); `mappers/` y `middlewares/` (auth, errores, `If-Match`, límite de pedidos).
- **Se ejecuta con `tsx` (TypeScript directo)**, tanto en desarrollo como en el contenedor: no hay `build` ni `tsc`. `tsx` y `prisma` están en `devDependencies`.
- Prisma 6.19 con generador `prisma-client`; 14 migraciones (la primera del 2026-10-15). Tablas `Trip`, `TripEventHistory` (solo inserción), `IdempotencyKey` y calificaciones.

## Endpoints
`POST /trips` (SYSTEM) · `GET /trips` · `GET /trips/{id}` · `POST /trips/{id}/arrived|start|complete|cancel` · `GET /trips/{id}/history` · `GET /health` · `GET /health/details`.
**Extra, no incluidos en `openapi.yaml`:** `POST /trips/{id}/client-rating` y `POST /trips/{id}/driver-rating`.
**Panel de demo sin autenticación:** `/api/data`, `/api/seed`, `/api/trips`, `/api/transition` (solo `/api/demo-tokens` está protegido por `ENABLE_DEMO_AUTH`).
Nota: algunos comentarios del código mencionan `/api/v1/...`, pero las rutas reales son `/trips...` (como el contrato).

## Dependencias de otros módulos
| Módulo | Estado |
|---|---|
| M1 | JWT con `sub`, `role`/`roles`, `exp`; **no se valida la firma** (pendiente reconocido en su README) |
| M8 | QR **simulado** dentro de `TripService` (tokens de prueba `invalid`, `expired`, `simulate_503`, `m8_timeout`); los QR ya usados se guardan en un `Set` en memoria |
| Eventos | Bus **en memoria** (`event-publisher.service.ts`, últimos 100); RabbitMQ es una iteración futura |
| M5, M7, M4, M2, M3 | Sin integraciones implementadas |

## Calidad
- **CI: no tiene** (no existe `.github/`).
- **Tests:** Vitest, 21 archivos: unitarios (dominio, auth, idempotencia, límite, eventos) e integración con PostgreSQL de pruebas (`m6_trips_test`, creada y migrada automáticamente). Una tabla en su README lista los tests por requisito (RF-6.1 y RF-6.3 por ahora). _[no ejecutados por nosotros]_
- **Faltan:** CI completo, SAST, E2E automatizado en pipeline, Quality Gates.

## Seguridad y operación
- Límite de pedidos en memoria (120/min usuario, 1200/min servicio; `RATE_LIMIT_*`).
- Cuerpos limitados (413), errores `problem+json` sin detalles internos.
- Logs: `console.log/error` (sin formato estructurado). Hay `X-Correlation-Id` en controlador, errores y eventos.
- `HEALTHCHECK` de Docker sobre `/health` (liveness); el diagnóstico de dependencias va aparte en `/health/details` (solo Postgres, con timeout de 1,5 s).

## Estado de observabilidad
Ninguna. **Pendiente de instrumentar** (decidimos priorizar el relevamiento). Notas para cuando se haga:
- El módulo `http` nativo se instrumenta con OpenTelemetry sin cambios en el código de rutas.
- Prisma necesita instrumentación propia para trazar las consultas _[a verificar con Prisma 6.19]_.
- Hay que cargar el SDK antes que `explorer.ts` (con `tsx`, vía `--import` o primera línea).

## Riesgos para nuestro plan
- Sin CI, hay que construirlo desde cero (y acordarlo con el grupo).
- Estado en memoria: con más de una instancia, límite de pedidos, QR usados y eventos no se comparten.
- `tsx` en producción: arranque más lento y mayor consumo que un servicio compilado; puede sesgar las mediciones frente a G5.
- Endpoints de calificación fuera del contrato y panel sin autenticación: no exponer públicamente.
- Una sola instancia de PostgreSQL en el compose y sin Redis: el cuello de botella probable es el proceso Node y la base.
- Rama principal `m6/base-de-datos` (no hay `main`): confirmar a qué rama apuntan los PR y el CI.

## Fuentes
`README.md`, `AGENTS.md`, `openapi.yaml`, `docker-compose.yml`, `backend/Dockerfile`, `backend/package.json`,
`backend/prisma/`, `backend/src/**`, `backend/tests/**`.
