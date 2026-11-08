# TPI DevOps 2026 · Seguimiento de hitos

Plataforma de Solicitud de Viajes Urbanos (Auto/Moto) · DevOps, UTN FRRe.
Consigna completa: [`../TPIntegrador-DevOps-UTN-2026.md`](../TPIntegrador-DevOps-UTN-2026.md)

> Cómo usar este archivo: tildar `[x]` cada tarea al completarla, anotar el responsable y pegar el link de evidencia.
> Una captura suelta no alcanza. Se priorizan links a pipelines, commits, PRs, dashboards y reportes de k6.

## 1. Contexto del equipo

**Módulo asignado:** M6 · Viajes y Ciclo de Vida (estados, arribo, inicio, finalización, cancelación y auditoría).

**Repositorios clonados localmente** (todavía sin desplegar):

| Carpeta local | Origen | Stack | Observaciones |
|---|---|---|---|
| `../2026-05-TPI` | `FRRe-DS/2026-05-TPI` (Grupo 5) | NestJS + TypeScript, PostgreSQL, RabbitMQ, Redis | Ya tiene un workflow de CI (`m6-viajes.yml`), Dockerfile y docker-compose |
| `../2026-12-TPI` | `FRRe-DS/2026-12-TPI` (Grupo 12) | Node `http` nativo + TypeScript, Prisma, PostgreSQL, Vitest | Contrato OpenAPI unificado con el Grupo 5, Dockerfile y docker-compose |

> **Decisión:** trabajamos sobre **ambos repos**. Hay un único dashboard con las mismas métricas para los dos, diferenciadas por el atributo `service.name` / `grupo` (`m6-grupo5` y `m6-grupo12`). Con un selector o variable de dashboard se puede filtrar por grupo o comparar los dos lado a lado. Falta validarlo con el profe y los grupos de Desarrollo, y registrarlo en la bitácora.

**Objetivo de despliegue:** desplegar los servicios en un entorno cloud y consumir las APIs por HTTP desde la web (no localhost). Eso es lo que se mide con k6 y lo que alimenta el dashboard.

### Integrantes y roles

| # | Integrante | Rol | Foco principal |
|---|---|---|---|
| 1 | _(completar)_ | Coordinación e integración | Contacto con Desarrollo, actas, issues, bitácora, informe final |
| 2 | _(completar)_ | Instrumentación OpenTelemetry | SDK, exporter, APM, trazas y logs |
| 3 | _(completar)_ | Dashboard y métricas del módulo | 3 métricas propias, dashboard técnico y funcional |
| 4 | _(completar)_ | CI y calidad | Build, unitarios, E2E, SAST y Quality Gates |
| 5 | _(completar)_ | Cloud y k6 | Despliegue, scripts de carga, recursos y costos |

### Equipos de Desarrollo contactados

| Grupo | Contacto | Repo | Estado del acuerdo |
|---|---|---|---|
| Grupo 5 | Valentino | `2026-05-TPI` | _(pendiente)_ |
| Grupo 12 | Agos | `2026-12-TPI` | _(pendiente)_ |

**Despliegue previsto:** cada grupo de Desarrollo despliega su propio servicio en Vercel, por separado. Nosotros consumimos las APIs desplegadas.

---

## 2. Hito 1 · Diagnóstico y acuerdos

**Fecha límite:** _(completar)_ · **Evidencia:** acta breve, arquitectura, issues y acuerdos Dev–DevOps.

### Integración y relevamiento
- [x] Definido: se trabaja sobre ambos repos (Grupo 5 y Grupo 12). Falta confirmar el alcance con el profe · Resp.: _ _ _
- [ ] Acordar la convención común de nombres de métricas y atributos (`service.name`, `grupo`) para que ambos repos sean comparables en un solo dashboard · Resp.: _ _ _
- [ ] Contactar a los grupos de Desarrollo y acordar canal de comunicación · Resp.: _ _ _
- [ ] Obtener permisos de escritura / fork en los repositorios originales · Resp.: _ _ _
- [ ] Relevar funcionalidades, endpoints y dependencias del módulo (M5, M7, M8, etc.) · Resp.: _ _ _
- [ ] Diagrama de arquitectura del módulo y sus integraciones · Resp.: _ _ _
- [ ] Acta del primer acuerdo Dev–DevOps (alcance, responsabilidades, forma de trabajo con PRs) · Resp.: _ _ _
- [ ] Armar el backlog como issues en el repo o en un tablero · Resp.: _ _ _

### Propuestas técnicas
- [ ] Elegir la plataforma APM / observabilidad (con plan gratuito) y justificar · Resp.: _ _ _
- [ ] Definir las **3 métricas propias de M6** y qué mide cada una (ver borrador en la sección 6) · Resp.: _ _ _
- [ ] Elegir la herramienta SAST (SonarQube Cloud, Semgrep o CodeQL) · Resp.: _ _ _
- [ ] Proponer el flujo E2E a automatizar · Resp.: _ _ _
- [ ] Proponer el flujo de k6 (endpoints, datos de prueba, duración, rampa de usuarios) · Resp.: _ _ _
- [ ] Elegir el entorno cloud y estimar costos / cuotas · Resp.: _ _ _

### Cierre del hito
- [ ] Primera entrada de bitácora cargada (formato en sección 7) · Resp.: _ _ _
- [ ] Registrar impedimentos o dependencias externas detectados · Resp.: _ _ _

---

## 3. Hito 2 · Instrumentación y CI

**Fecha límite:** _(completar)_ · **Evidencia:** PRs aceptados, dashboard, trazas y ejecuciones de CI.

### Despliegue (prerrequisito para el Hito 3)
- [ ] Desplegar M6 en cloud (app + PostgreSQL y lo que requiera) · Resp.: _ _ _
- [ ] Exponer la API por URL pública y verificarla con una consulta real · Resp.: _ _ _
- [ ] Cargar datos de prueba en el entorno · Resp.: _ _ _
- [ ] Documentar el entorno: recursos, región, límites del plan · Resp.: _ _ _

### OpenTelemetry y dashboard
- [ ] Instrumentar el servicio con OpenTelemetry (trazas, métricas, logs) · PR: _ _ _ · Resp.: _ _ _
- [ ] Configurar el exporter hacia la plataforma APM elegida · Resp.: _ _ _
- [ ] Implementar las 3 métricas propias de M6 · PR: _ _ _ · Resp.: _ _ _
- [ ] Dashboard con indicadores técnicos: requests, latencia, errores, CPU y memoria · Link: _ _ _
- [ ] Dashboard con las 3 métricas propias · Link: _ _ _
- [ ] Demostrar el uso de una traza (y logs) para investigar una operación o un error · Link: _ _ _

### Integración continua
- [ ] Pipeline con compilación en el repo original · PR: _ _ _ · Resp.: _ _ _
- [ ] Ejecución automática de tests unitarios con reporte · Resp.: _ _ _
- [ ] Al menos 1 flujo **E2E** automatizado en un entorno controlado (por ejemplo, crear viaje → llegada → inicio → finalización) · Resp.: _ _ _
- [ ] SAST integrado y primer análisis · Resp.: _ _ _
- [ ] Quality Gates acordados con Desarrollo · Resp.: _ _ _
- [ ] Disparadores configurados (PR y push) · Resp.: _ _ _
- [ ] Evidencia de al menos un fallo detectado y su corrección · Link: _ _ _

### Cierre del hito
- [ ] Bitácora actualizada con enlaces verificables · Resp.: _ _ _

---

## 4. Hito 3 · Carga y cierre

**Fecha límite:** _(completar)_ · **Evidencia:** scripts, reportes por carga, gráficas, bitácora completa y síntesis.

### Preparación
- [ ] Acordar con Desarrollo los escenarios, duración y rampa de usuarios · Resp.: _ _ _
- [ ] Script k6 con operaciones reales de M6 · Archivo: _ _ _ · Resp.: _ _ _
- [ ] Definir dónde corre el generador de carga y verificar que no limite los resultados · Resp.: _ _ _
- [ ] Confirmar autorización de uso, datos de prueba, cuotas y costos · Resp.: _ _ _

### Ejecución (registrar las 4 corridas con la misma metodología)

| Escenario | VUs | Ejecutado | Reporte / Link | Latencia p50/p95/p99 | Throughput (req/s) | % errores | CPU / Mem |
|---|---|---|---|---|---|---|---|
| A · Base | 50 | [ ] | | | | | |
| B · Intermedio | 100 | [ ] | | | | | |
| C · Alto | 500 | [ ] | | | | | |
| D · Extremo | 1000 | [ ] | | | | | |

### Análisis y cierre
- [ ] Correlacionar las corridas con el dashboard y los recursos cloud · Resp.: _ _ _
- [ ] Tabla comparativa 50 / 100 / 500 / 1000 VUs · Resp.: _ _ _
- [ ] Identificar límites y cuellos de botella · Resp.: _ _ _
- [ ] Recomendaciones de mejora fundamentadas · Resp.: _ _ _
- [ ] Evidencias de las 3 métricas del módulo durante la carga · Resp.: _ _ _
- [ ] Informe final y síntesis ejecutiva por módulo · Resp.: _ _ _
- [ ] Entrega técnica: enlaces a repos, PRs, CI, tests, scripts k6, dashboards, config de OTel y entorno cloud · Resp.: _ _ _

---

## 5. Entrega final y coloquio

- [ ] Entrega técnica completa
- [ ] Informe de resultados
- [ ] Presentación preparada, coordinada con el grupo de Desarrollo
- [ ] Cada integrante puede explicar su contribución, las decisiones, las pruebas, las métricas y los resultados

## 6. Borrador de métricas propias de M6 (a validar en H1)

| Métrica | Qué mide | Por qué sirve |
|---|---|---|
| Viajes por estado / transiciones por minuto | Cantidad de viajes en cada estado y tasa de transiciones | Muestra el flujo de negocio y detecta viajes estancados |
| Tasa de cancelación (por actor: cliente, conductor, operador) | % de viajes cancelados sobre los iniciados | Indicador de calidad del servicio y de problemas aguas arriba |
| Duración de las operaciones del ciclo de vida (por ejemplo, tiempo entre arribo e inicio, o latencia de `start` incluida la validación con M8) | Tiempo de cada transición | Detecta cuellos de botella y dependencias lentas |

_Alternativas a evaluar:_ rechazos por transición inválida, conflictos de concurrencia, duración total del viaje.

## 7. Bitácora

Formato mínimo de cada entrada (una por tarea relevante, en orden cronológico):

```
### AAAA-MM-DD · [responsable/s] · M6
- Objetivo:
- Tarea ejecutada:
- Decisiones / acuerdos con Desarrollo:
- Repositorio / issue / PR:
- Evidencia (URL, captura o reporte):
- Resultado:
- Dificultad o bloqueo:
- Siguiente acción:
```

### Entradas

<!-- Agregar las entradas nuevas debajo, de la más antigua a la más reciente -->

_(sin entradas todavía)_

## 8. Riesgos y dependencias a registrar temprano

- Hay dos repos de M6 (Grupo 5 y Grupo 12) con stacks distintos (NestJS vs. Node nativo). La instrumentación y el CI se duplican, y las métricas deben quedar con los mismos nombres para ser comparables.
- Las corridas de k6 se multiplican: 4 escenarios x 2 repos. Contar el consumo de cuota (virtual user hours) antes de empezar.
- M6 depende de otros módulos (M5, M7, M8) que pueden no estar desplegados. Acordar mocks o stubs y registrarlo.
- Los repos todavía están sin desplegar. Hasta que lo estén, no se puede avanzar con k6 ni con la validación en cloud.
- El plan gratuito del APM y del cloud puede limitar las pruebas de 500 y 1000 VUs. Revisar cuotas antes de ejecutar.
- Correr k6 desde una máquina local puede limitar los resultados (red, CPU). Documentarlo y verificarlo.
