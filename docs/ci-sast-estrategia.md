# Estrategia de CI/CD, Calidad y SAST (DevSecOps) · Módulo M6

**Responsable:** Franco (Rol 4 · CI/CD, Calidad y DevSecOps)  
**Repositorios objetivo:** `FRRe-DS/2026-05-TPI` (Grupo 5) y `FRRe-DS/2026-12-TPI` (Grupo 12)

---

## 1. Elección de Herramienta SAST y Justificación

Para cubrir el análisis estático de código y seguridad (SAST) en ambos repositorios de Desarrollo sin generar fricción operativa, se selecciona **Semgrep** complementado con **GitHub CodeQL** (cuando los permisos del repositorio lo habiliten).

| Criterio | Semgrep (CLI / Action) | GitHub CodeQL | SonarQube Cloud |
| :--- | :--- | :--- | :--- |
| **Soporte TS / Node.js** | Excelente (`p/typescript`, `p/nodejs`, `p/owasp-top-ten`, `p/secrets`) | Excelente (análisis semántico *taint tracking*) | Muy bueno (requiere proyecto externo) |
| **Fricción con Desarrollo** | **Nula:** corre directo en GitHub Actions sin cuentas ni tokens externos | **Nula:** nativo en repos públicos de GitHub | **Alta:** exige que Desarrollo vincule cuenta y cargue `SONAR_TOKEN` |
| **Quality Gate en PR** | Sí (`--error` bloquea el job ante hallazgos `ERROR`) | Sí (Code Scanning alerts en PR) | Sí (requiere configurar webhook/gate) |
| **Costo** | Gratuito (OSS / rulesets comunitarios) | Gratuito en repositorios públicos | Gratuito solo para repos públicos con setup manual |

**Decisión:** Usar **Semgrep** como motor SAST principal en el pipeline de CI de ambos grupos, ejecutando las reglas `p/typescript`, `p/nodejs`, `p/owasp-top-ten` y `p/secrets`. En paralelo, se complementa con `npm audit --omit=dev` (análisis de dependencias / SCA).

---

## 2. Quality Gates Definidos

Un Pull Request hacia la rama principal (`main` en Grupo 5, `m6/base-de-datos` en Grupo 12) debe cumplir con los siguientes criterios automáticos para aprobar el pipeline:

1. **Integridad de tipos / Compilación:** `tsc --noEmit` (G12) o `npm run typecheck` (G5) sin errores.
2. **Pruebas unitarias:** 100% de los tests unitarios aprobados (Vitest en G12, Jest en G5).
3. **Pruebas de integración / E2E contra infraestructura real:** 100% aprobados contra PostgreSQL (G12) y PostgreSQL + RabbitMQ + Redis (G5).
4. **Análisis de dependencias (SCA):** `npm audit --omit=dev` sin vulnerabilidades `high` o `critical` sin mitigación documentada.
5. **Análisis estático SAST (Semgrep):** 0 hallazgos de severidad bloqueante (`ERROR`) en código de producción (`src/`). Los hallazgos `WARNING` se registran como evidencia para acordar remediación con Desarrollo.

---

## 3. Flujo E2E Estándar de M6

El flujo funcional mínimo que debe validarse de punta a punta en entorno controlado dentro del CI cubre el ciclo de vida completo de un viaje y el control de acceso por roles JWT:

1. **Creación (`SYSTEM`):** `POST /trips` → estado inicial `PENDING_ARRIVAL`.
2. **Arribo (`DRIVER`):** `POST /trips/{id}/arrived` → transición a `DRIVER_ARRIVED`.
3. **Inicio con QR (`DRIVER`):** `POST /trips/{id}/start` (con stub/simulación de M8) → transición a `IN_PROGRESS`.
4. **Finalización (`DRIVER`):** `POST /trips/{id}/complete` → transición a `COMPLETED`.
5. **Controles de seguridad y autorización:**
   * Peticiones sin token → `401 UNAUTHENTICATED` (`application/problem+json`).
   * Un `CLIENT` o `DRIVER` intentando crear viaje (`POST /trips`) → `403 FORBIDDEN`.
   * Un `CLIENT` intentando iniciar o completar viaje → `403 FORBIDDEN`.

---

## 4. Diagnóstico por Grupo y Plan de Acción

### Grupo 5 (`FRRe-DS/2026-05-TPI`)
* **Estado actual:** Posee `.github/workflows/m6-viajes.yml` muy completo (`npm audit`, `typecheck`, validación OpenAPI/AsyncAPI, Jest unitarios, `test:infra` contra Postgres/RabbitMQ/Redis, build Docker y push a GHCR).
* **Brecha detectada:** Falta análisis **SAST** y un Quality Gate explícito de seguridad antes de construir/publicar la imagen Docker.
* **Acción (PR):** Agregar job `sast` con Semgrep al workflow `m6-viajes.yml` y requerirlo en `imagen` (`needs: [verificar, sast]`).

### Grupo 12 (`FRRe-DS/2026-12-TPI`)
* **Estado actual:** No posee `.github/workflows/` (sin CI). Sus tests en Vitest (`npm test` y `npm run test:integration`) y su `tsconfig.json` están listos en `backend/`.
* **Brecha detectada:** Ausencia total de CI, SAST y Quality Gates. Hallazgos de seguridad previos detectados en relevamiento (JWT sin verificación de firma y endpoints de demo `/api/*` sin auth).
* **Acción (PR):** Crear `.github/workflows/ci.yml` apuntando a la rama `m6/base-de-datos` con PostgreSQL 16, `tsc --noEmit`, `npm audit`, Vitest unitario + integración/E2E y Semgrep SAST.
