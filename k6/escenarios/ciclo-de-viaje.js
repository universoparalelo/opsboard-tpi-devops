// Plantilla: ciclo de un viaje (crear -> llegada -> inicio -> fin).
// Ajustar rutas y cuerpos según contratos/openapi.yaml.
import http from 'k6/http';
import { check, sleep } from 'k6';

const VUS = Number(__ENV.VUS || 50);
const DURACION = __ENV.DURACION || '5m';

export const options = {
  stages: [
    { duration: '1m', target: VUS },
    { duration: DURACION, target: VUS },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.BASE_URL;
const headers = { Authorization: `Bearer ${__ENV.TOKEN}`, 'Content-Type': 'application/json' };

export default function () {
  // TODO: reemplazar por el flujo real (POST /trips, /arrived, /start, /complete)
  const res = http.get(`${BASE_URL}/trips`, { headers });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
