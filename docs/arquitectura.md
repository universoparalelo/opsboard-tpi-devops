# Arquitectura de M6 y sus integraciones

_(completar con diagrama)_

Relevado de los READMEs de los repos:
- **M1 (Identidad):** JWT en cada operación protegida. Hoy se decodifica sin validar la firma.
- **M5 (Despacho):** crea viajes con `POST /trips` (rol `SYSTEM`).
- **M8 (Notificaciones):** valida el QR en `POST /trips/{id}/start`. Hoy simulado.
- Eventos publicados (hoy en un bus en memoria): consumidos por M7, M8, M4, M2, M3, M5.
