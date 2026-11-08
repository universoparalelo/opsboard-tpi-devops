# Pruebas de carga con k6

```bash
k6 run -e BASE_URL=https://... -e TOKEN=... -e VUS=50 -e DURACION=5m escenarios/ciclo-de-viaje.js
```

- Escenarios A/B/C/D = 50/100/500/1000 VUs (variable `VUS`), mismo script para comparar.
- Los tokens JWT de prueba se generan con `npm run token` en el repo del Grupo 5 (ver su README). El servicio hoy no valida la firma ni llama a M8 real, así que la carga no depende de otros módulos.
- No subir tokens ni URLs privadas: usar `.env` (ignorado por git) o secretos de GitHub.
