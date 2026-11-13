// Escenario: ciclo de vida completo de un viaje de M6 (el mismo script para G5 y G12).
//
//   crear (M5, rol SYSTEM) -> arribo (conductor) -> inicio con QR (conductor) -> fin (conductor)
//   ...o, en ~15% de los casos, cancelación del cliente tras el arribo.
//
// Decisiones de diseño (registrar en la bitácora):
//  - CADA ITERACIÓN usa un cliente y un conductor nuevos. Los servicios limitan los pedidos por usuario
//    (120/min); si un VU repitiera siempre el mismo conductor, mediríamos el limitador y no el servicio.
//  - POST /trips es del rol SYSTEM (M5), con un límite propio (1200/min por usuario). Se reparten los VUs
//    entre varios SYSTEM distintos (m5-despacho-1..N) para no toparlo; N crece con la carga.
//  - Los tokens se firman acá (HS256, como `npm run token` de G5). G12 no valida la firma, sólo el contenido.
//  - Las requests se agrupan por `name` (ruta con :id) para no crear una serie por cada viaje.
import http from 'k6/http';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = Number(__ENV.VUS || 50);
const RAMPA = __ENV.RAMPA || '1m';
const DURACION = __ENV.DURACION || '5m';
const JWT_SECRETO = __ENV.JWT_SECRETO || 'secreto-de-desarrollo-cambiar-en-entornos-compartidos';
const PORCENTAJE_CANCELACION = Number(__ENV.PORCENTAJE_CANCELACION || 15);
// Cada SYSTEM aguanta ~1200 altas/min (~20/s) y cada VU hace ~0,5 altas/s: 1 SYSTEM cada 20 VUs, con margen.
const SYSTEM_TOKENS = Number(__ENV.SYSTEM_TOKENS || Math.ceil(VUS / 20) + 2);

export const options = {
  scenarios: {
    ciclo_de_viaje: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: RAMPA, target: VUS }, // subida progresiva
        { duration: DURACION, target: VUS }, // régimen
        { duration: '20s', target: 0 }, // bajada
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    // Sólo para marcar la corrida: el enunciado NO exige umbrales a 1000 VUs, se mide y se analiza.
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const viajesCompletados = new Counter('m6_viajes_completados');
const viajesCancelados = new Counter('m6_viajes_cancelados');
const ciclosFallidos = new Counter('m6_ciclos_fallidos');

// ---------- utilidades ----------
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function jwt(sub, role) {
  const b64 = (o) => encoding.b64encode(JSON.stringify(o), 'rawurl');
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role, iat: ahora, exp: ahora + 8 * 3600 })}`;
  return `${cuerpo}.${crypto.hmac('sha256', JWT_SECRETO, cuerpo, 'base64rawurl')}`;
}

function llamar(ruta, nombre, token, cuerpo, metodo = 'POST') {
  return http.request(metodo, `${BASE_URL}${ruta}`, cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    tags: { name: nombre },
  });
}

// ---------- ejecución ----------
export function setup() {
  const sistemas = [];
  for (let i = 1; i <= SYSTEM_TOKENS; i++) sistemas.push(jwt(`m5-despacho-${i}`, 'SYSTEM'));
  return { sistemas };
}

export default function (datos) {
  const tokenSistema = datos.sistemas[__VU % datos.sistemas.length];
  const clienteId = uuid();
  const conductorId = uuid();
  const tokenConductor = jwt(conductorId, 'DRIVER');

  // 1. M5 crea el viaje
  const alta = llamar('/trips', 'POST /trips', tokenSistema, {
    requestId: uuid(),
    clientId: clienteId,
    driverId: conductorId,
    vehicleId: uuid(),
    vehicleType: Math.random() < 0.7 ? 'AUTO' : 'MOTO',
    originLatitude: -27.4511,
    originLongitude: -58.9867,
    destinationLatitude: -27.4698,
    destinationLongitude: -58.8306,
  });
  if (!check(alta, { 'crear viaje: 201': (r) => r.status === 201 })) {
    ciclosFallidos.add(1);
    return;
  }
  const id = alta.json('id');
  sleep(0.2 + Math.random() * 0.3);

  // 2. el conductor llega al punto de retiro
  const arribo = llamar(`/trips/${id}/arrived`, 'POST /trips/:id/arrived', tokenConductor, {});
  if (!check(arribo, { 'arribo: 200': (r) => r.status === 200 })) {
    ciclosFallidos.add(1);
    return;
  }
  sleep(0.2 + Math.random() * 0.3);

  // 3a. algunos clientes cancelan
  if (Math.random() * 100 < PORCENTAJE_CANCELACION) {
    const cancelacion = llamar(`/trips/${id}/cancel`, 'POST /trips/:id/cancel', jwt(clienteId, 'CLIENT'), {
      reason: 'CHANGE_OF_PLANS',
    });
    if (check(cancelacion, { 'cancelar: 200': (r) => r.status === 200 })) viajesCancelados.add(1);
    else ciclosFallidos.add(1);
    return;
  }

  // 3b. el resto: inicio con QR (validado contra M8, simulado en los repos actuales) y fin
  const inicio = llamar(`/trips/${id}/start`, 'POST /trips/:id/start', tokenConductor, { verificationToken: `QR-${id}` });
  if (!check(inicio, { 'inicio: 200': (r) => r.status === 200 })) {
    ciclosFallidos.add(1);
    return;
  }
  sleep(0.3 + Math.random() * 0.5);

  const fin = llamar(`/trips/${id}/complete`, 'POST /trips/:id/complete', tokenConductor, {
    distanceKm: Math.round((2 + Math.random() * 10) * 10) / 10,
  });
  if (check(fin, { 'finalizar: 200': (r) => r.status === 200 })) viajesCompletados.add(1);
  else ciclosFallidos.add(1);
}
