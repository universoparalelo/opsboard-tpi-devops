# Estrategia de CI/CD, Calidad y SAST (DevSecOps) · Módulo M6

**Responsable:** Franco (Rol 4 · CI/CD, Calidad y DevSecOps)  
**Repositorios objetivo:** `FRRe-DS/2026-05-TPI` (Grupo 5) y `FRRe-DS/2026-12-TPI` (Grupo 12)

**Estado al 25/11/2026:** G12 tiene CI integrado en su rama base. G05 tiene un PR borrador sobre el CI existente. Las corridas, reportes y acuerdos se registran en la [bitácora de CI](../bitacora/2026-11-25-ci-g12-g05.md).

---

## 1. Elección de Herramientas SAST/SCA y Justificación

Para cubrir el análisis estático de código, seguridad (SAST), dependencias (SCA) y reportes de calidad en ambos repositorios públicos de la organización `FRRe-DS`, se evaluaron las alternativas propuestas por la cátedra:

| Criterio | Semgrep CE (`semgrep scan`) | GitHub CodeQL (`codeql-action`) | SonarQube Cloud | GitHub Code Quality |
| :--- | :--- | :--- | :--- | :--- |
| **Soporte TS / Node.js** | Excelente (`p/typescript`, `p/nodejs`, `p/owasp-top-ten`, `p/secrets`) | Excelente (análisis semántico *taint analysis*) | Muy bueno | Bueno |
| **Permisos requeridos** | **Ninguno** (corre en Actions con `contents: read`) | **Repo Admin** (habilitado en *Code Security* de ambos repos) | **Owner de la org `FRRe-DS`** para vincular GitHub (no disponible) | Repo Admin, pero advierte cargos en *action minutes* |
| **Costo y límites** | **$0** (Open Source, sin login ni tokens externos) | **$0** en repositorios públicos | Free Plan limitado a **5 usuarios**; OSS exige **licencia OSI** (ninguno de los repos tiene `LICENSE`) | Advierte consumo adicional de *action minutes* / créditos IA |
| **Quality Gate + Evidencia** | SARIF como artefacto y umbral configurable | Alertas en *Security → Code scanning* y posibilidad de definir umbrales | Dashboard externo | Integrado |

### Herramientas utilizadas

1. **SAST:** Semgrep `1.184.0` con reporte SARIF. En G12, el workflow también publica el reporte en GitHub Security. El análisis con CodeQL quedó como alternativa evaluada.
2. **G12:** Prisma, `tsc --noEmit`, Vitest unitario y suite de integración con PostgreSQL 16. Los reportes descargables son JUnit XML.
3. **G05:** el CI existente usa chequeo de tipos, validación de contratos, `npm audit`, Jest, build Docker y GHCR. El borrador agrega reportes JSON de Jest y SARIF. Las pruebas incluyen integración en memoria y con PostgreSQL, RabbitMQ y Redis.

*(Nota: Se descarta **SonarQube Cloud** por exigir Owner de la organización `FRRe-DS`, tope de 5 usuarios en el Free Plan y falta de licencia OSI en los repositorios; y se mantiene desactivada la función paga/medida **GitHub Code Quality** para no consumir minutos adicionales de la organización).*

---

## 2. Criterios de aceptación propuestos

Para PRs hacia `main` en G05 y `m6/base-de-datos` en G12, se propuso usar el resultado de tipos y pruebas como criterio mínimo:

1. **Integridad de tipos / Compilación:** `tsc --noEmit` (G12) o `npm run typecheck` (G5) sin errores.
2. **Pruebas unitarias, integración y E2E:** suites en verde y reportes disponibles como artefactos.
3. **SAST:** Semgrep publica los hallazgos como evidencia para revisión. Falta acordar con cada grupo qué severidad debe bloquear el merge y cómo se aplicará la protección de rama.

El check existente de dependencias en G05 usa `npm audit --omit=dev --audit-level=moderate`. El visto bueno de G12 corresponde a la integración del PR de CI. El acuerdo sobre los criterios futuros queda registrado por separado en la bitácora.

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

## 4. Validación inicial del 16/11

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
* **Resultado posterior:** `.github/workflows/ci.yml` se integró en el [PR #27](https://github.com/FRRe-DS/2026-12-TPI/pull/27). La evidencia de GitHub Actions está en la [bitácora del 25/11](../bitacora/2026-11-25-ci-g12-g05.md).

### Grupo 5 (`FRRe-DS/2026-05-TPI`)
* **CI de partida:** `.github/workflows/m6-viajes.yml` ya usaba PostgreSQL, RabbitMQ, Redis, `npm audit`, chequeo de tipos, validación de contratos, Jest y Docker/GHCR.
* **Resultado posterior:** el [PR borrador #6](https://github.com/FRRe-DS/2026-05-TPI/pull/6) agrega reportes de pruebas y Semgrep. Queda pendiente su revisión e integración.
