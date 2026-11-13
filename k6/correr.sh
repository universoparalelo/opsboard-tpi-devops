#!/usr/bin/env bash
# Lanza una corrida de k6 contra un grupo con la carga elegida y manda los resultados a Prometheus
# (para verlos en Grafana junto a la telemetría del servicio).
#
#   ./k6/correr.sh <grupo5|grupo12> <50|100|500|1000> [url]
#
# Variables opcionales: RAMPA (def. 1m), DURACION (def. 5m, en régimen), JWT_SECRETO,
#   PORCENTAJE_CANCELACION, PROMETHEUS_RW (def. http://localhost:9090/api/v1/write).
# Ejemplo de prueba rápida:  RAMPA=10s DURACION=30s ./k6/correr.sh grupo5 50
# Usa la imagen Docker de k6: no hace falta instalarlo.
set -euo pipefail

GRUPO="${1:-}"; VUS="${2:-}"; URL="${3:-}"
case "$GRUPO" in
  grupo5)  URL="${URL:-http://localhost:3000}" ;;
  grupo12) URL="${URL:-http://localhost:3006}" ;;
  *) echo "Uso: $0 <grupo5|grupo12> <50|100|500|1000> [url]"; exit 2 ;;
esac
case "$VUS" in 50|100|500|1000) ;; *) echo "VUs debe ser 50, 100, 500 o 1000"; exit 2 ;; esac

AQUI="$(cd "$(dirname "$0")" && pwd)"
TEST_ID="${GRUPO}-${VUS}vu-$(date +%Y%m%d-%H%M%S)"
SALIDA="$AQUI/../resultados/${GRUPO}/${VUS}vu"
mkdir -p "$SALIDA"

echo ">> k6: $GRUPO · $VUS VUs · $URL · testid=$TEST_ID"
# --network host: k6 llega a localhost (servicio y Prometheus) desde el contenedor.
# --user: que los archivos de resultados queden a nombre de quien corre el script, no de otro usuario.
docker run --rm -i --network host --user "$(id -u):$(id -g)" \
  -v "$AQUI:/k6:ro" -v "$SALIDA:/salida" \
  -e BASE_URL="$URL" -e VUS="$VUS" \
  -e RAMPA="${RAMPA:-1m}" -e DURACION="${DURACION:-5m}" \
  -e JWT_SECRETO="${JWT_SECRETO:-secreto-de-desarrollo-cambiar-en-entornos-compartidos}" \
  -e PORCENTAJE_CANCELACION="${PORCENTAJE_CANCELACION:-15}" \
  -e K6_PROMETHEUS_RW_SERVER_URL="${PROMETHEUS_RW:-http://localhost:9090/api/v1/write}" \
  -e K6_PROMETHEUS_RW_TREND_STATS="p(50),p(95),p(99),avg,max" \
  grafana/k6:0.54.0 run \
    -o experimental-prometheus-rw \
    --tag testid="$TEST_ID" --tag grupo="$GRUPO" --tag vus="$VUS" \
    --summary-export=/salida/resumen-"$TEST_ID".json \
    /k6/escenarios/ciclo-de-viaje.js

echo ">> Resumen guardado en resultados/${GRUPO}/${VUS}vu/resumen-${TEST_ID}.json"
