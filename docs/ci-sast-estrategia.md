# Estrategia de CI/CD, Calidad y SAST (DevSecOps) · Módulo M6

**Responsable:** Franco (Rol 4 · CI/CD, Calidad y DevSecOps)  
**Repositorios objetivo:** `FRRe-DS/2026-05-TPI` (Grupo 5) y `FRRe-DS/2026-12-TPI` (Grupo 12)

---

## 1. Elección de Herramientas SAST/SCA y Justificación

Para cubrir el análisis estático de código, seguridad (SAST), dependencias (SCA) y reportes de calidad en ambos repositorios públicos de la organización `FRRe-DS`, se evaluaron las alternativas propuestas por la cátedra:

| Criterio | Semgrep CE (`semgrep scan`) | GitHub CodeQL (`codeql-action`) | SonarQube Cloud | GitHub Code Quality |
| :--- | :--- | :--- | :--- | :--- |
| **Soporte TS / Node.js** | Excelente (`p/typescript`, `p/nodejs`, `p/owasp-top-ten`, `p/secrets`) | Excelente (análisis semántico *taint analysis*) | Muy bueno | Bueno |
| **Permisos requeridos** | **Ninguno** (corre en Actions con `contents: read`) | **Repo Admin** (habilitado en *Code Security* de ambos repos) | **Owner de la org `FRRe-DS`** para vincular GitHub (no disponible) | Repo Admin, pero advierte cargos en *action minutes* |
| **Costo y límites** | **$0** (Open Source, sin login ni tokens externos) | **$0** en repositorios públicos | Free Plan limitado a **5 usuarios**; OSS exige **licencia OSI** (ninguno de los repos tiene `LICENSE`) | Advierte consumo adicional de *action minutes* / créditos IA |
| **Quality Gate + Evidencia** | Reporte `.sarif` como artefacto + bloqueo en `error` | Alertas en pestaña *Security → Code scanning* + *Check runs failure threshold* | Dashboard externo | Integrado |

### Decisión Definitiva del Stack CI/DevSecOps
1. **SAST Dual:** **Semgrep (`1.184.0`)** + **GitHub CodeQL (`javascript-typescript`)**. Semgrep aporta reglas rápidas OWASP/secretos y genera reporte SARIF descargable; CodeQL aporta análisis semántico profundo nativo en GitHub.
2. **SCA (Dependencias):** **`npm audit --omit=dev`** para detectar CVEs conocidas en dependencias de producción (complementado con *Dependabot alerts* ya activo en GitHub).
3. **Compilación / Calidad estática:** **`tsc --noEmit`** con configuración `strict: true` en ambos repositorios.
4. **Tests y Cobertura:**
   * **Grupo 5:** Jest unitarios + `test:infra` (Postgres, RabbitMQ, Redis) + `jest --coverage` (`npm run test:cov`).
   * **Grupo 12:** Vitest unitarios + `test:integration` (PostgreSQL 16 real) exportando reportes JUnit XML como artefactos; se propondrá a Desarrollo sumar `@vitest/coverage-v8` para publicar métricas de cobertura.

*(Nota: Se descarta **SonarQube Cloud** por exigir Owner de la organización `FRRe-DS`, tope de 5 usuarios en el Free Plan y falta de licencia OSI en los repositorios; y se mantiene desactivada la función paga/medida **GitHub Code Quality** para no consumir minutos adicionales de la organización).*

---

## 2. Quality Gates Definidos

Un Pull Request hacia la rama principal (`main` en Grupo 5, `m6/base-de-datos` en Grupo 12) debe cumplir con los siguientes criterios automáticos:

1. **Integridad de tipos / Compilación:** `tsc --noEmit` (G12) o `npm run typecheck` (G5) sin errores.
2. **Pruebas unitarias:** 100% de los tests unitarios aprobados, con reporte exportado como artefacto en GitHub Actions.
3. **Pruebas de integración / E2E contra infraestructura real:** 100% aprobados contra PostgreSQL 16 (G12) y PostgreSQL + RabbitMQ + Redis (G5).
4. **Análisis de dependencias (SCA):** `npm audit --omit=dev` sin vulnerabilidades bloqueantes (`--audit-level=high` en G12, `--audit-level=moderate` ya configurado en G5).
5. **Análisis estático SAST (Semgrep + CodeQL):** 0 hallazgos de severidad bloqueante (`ERROR`) en código fuente de producción (`src/`). Los hallazgos `WARNING` y las observaciones manuales se conservan en el reporte SARIF como evidencia para acordar remediación con Desarrollo.

---

## 3. Flujo E2E Estándar de M6

El flujo funcional mínimo validado en entorno controlado cubre el ciclo de vida completo de un viaje y el control de acceso por roles JWT:

1. **Creación (`SYSTEM`):** `POST /trips` → estado inicial `PENDING_ARRIVAL`.
2. **Arribo (`DRIVER`):** `POST /trips/{id}/arrived` → transición a `DRIVER_ARRIVED`.
3. **Inicio con QR (`DRIVER`):** `POST /trips/{id}/start` → transición a `IN_PROGRESS`.
4. **Finalización (`DRIVER`):** `POST /trips/{id}/complete` → transición a `COMPLETED`.
5. **Auditoría y seguridad JWT:** Consulta inmutable en `GET /trips/{id}/history`, `401 UNAUTHENTICATED` sin token/expirado y `403 FORBIDDEN` ante roles no autorizados.

*(Verificado en código existente: `backend/tests/integration/trips-lifecycle.test.ts` en Grupo 12 y `m6-viajes/test/viajes.e2e-spec.ts` + `seguridad.e2e-spec.ts` en Grupo 5).*

---

## 4. Validación Local y Estado por Grupo

### Grupo 12 (`FRRe-DS/2026-12-TPI`)
* **Validación local ejecutada (2026-11-16, rama `m6/base-de-datos`):**
  * `npx prisma generate` + `npx tsc --noEmit` → **OK** (`0` errores).
  * `npm audit --omit=dev --audit-level=high` → **OK** (`0` vulnerabilidades en producción).
  * `npm test` (Vitest unitario) → **OK** (`13/13` archivos, `221/221` tests).
  * `npm run test:integration` (PostgreSQL 16 en Docker) → **OK** (`13/13` archivos, `228/228` tests).
  * `semgrep scan` (`semgrep/semgrep:1.184.0`) sobre `backend/src` (`18` archivos, `114` reglas) → **0 hallazgos**.
* **Deuda de seguridad detectada manualmente (punto ciego de SAST a tratar con Desarrollo):**
  * `auth.middleware.ts` decodifica JWT sin validar firma.
  * `explorer.ts` expone rutas demo `/api/*` sin autenticación y CORS abierto (`*`).
* **Entregables preparados (pendientes de PR hacia `m6/base-de-datos`):** `.github/workflows/ci.yml` y `.github/workflows/codeql.yml`.

### Grupo 5 (`FRRe-DS/2026-05-TPI`)
* **Estado actual:** Posee `.github/workflows/m6-viajes.yml` (Postgres, RabbitMQ, Redis, `npm audit`, `typecheck`, contratos, Jest + `test:infra`, Docker/GHCR). Se suma que Celeste abrió hoy el **PR #3 (`telemetria`)** con OpenTelemetry.
* **Siguiente paso:** Validar localmente con Docker `test:infra`, `test:cov` y Semgrep sobre `m6-viajes/src` (contemplando `salud.service.spec.ts`, `repositorio-viajes.postgres.ts` y la rama `telemetria`) antes de preparar el PR con SAST + CodeQL + artefactos.
