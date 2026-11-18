# NOVATIX · Dashboard académico (v1.0)

Dashboard de consulta desarrollado con **React, Recharts, Node.js, Express y MySQL**.
No reemplaza los cinco microservicios ya desplegados.

## Datos que utiliza
- `usuarios_db.usuarios` · 503 registros tras importación
- `equipos_db.equipos` · 3.277 registros
- `partidos_db.partidos` · 88.958 registros
- `apuestas_db.apuestas` · 14.770 registros, requiere columna `resultado`
- `dinero_db.dinero` · 22.821 registros

Los números son expectativas de la importación reportada el 13/11/2026; las cifras reales se leen de SQL.
La moneda no está definida en los CSV: se indica como **u.m.** (unidades monetarias).

## Instalación en Ubuntu2

1. Copiar `novatix_dashboard_v1.tar.gz` en la carpeta Windows compartida con Vagrant.
2. En `servidorUbuntu2`:

```bash
mkdir -p "$HOME/novatix_dashboard"
tar -xzf /vagrant/novatix_dashboard_v1.tar.gz -C "$HOME/novatix_dashboard"
cd "$HOME/novatix_dashboard"
bash instalar.sh
```

3. Revisar:

```bash
docker service ls --filter name=novatix_dashboard
curl -sS http://127.0.0.1:8090/api/health
curl -sS http://127.0.0.1:8090/api/dashboard | head -c 350
```

4. Abrir en Windows: `http://192.168.100.3:8090`

## Diseño del despliegue

- Servicio nuevo de Swarm `novatix_dashboard`, **1 réplica**, fijada a `servidorUbuntu2`.
- Puerto publicado `8090` (no sustituye HAProxy `8080` ni sus rutas).
- Usa la red overlay existente `novatix_stack_novatix_net_new`.
- Consulta las cinco bases MySQL vía sus nombres internos `novatix_stack_db-*`.
- **Solo ejecuta SELECT**: ni el backend ni el navegador crean, editan o eliminan registros.
- Consulta agregaciones en el servidor, nunca descarga 88.958 partidos al navegador.
- Refresco manual y caché de 30 segundos.
- Las contraseñas se reutilizan de los valores `DB_PASSWORD` que ya tienen configurados los microservicios. Se guardan únicamente en `.env.dashboard` con permisos `0600` en Ubuntu2. **No subir este archivo a GitHub**.
- Por ser académico, no incluye autenticación para el dashboard. **No publicar el puerto 8090 en Internet**.

## Validaciones incluidas

- Filtro de fechas con parámetros preparados (sin interpolar valores del usuario en SQL).
- Campos y bases fijos; la API no permite consultas SQL arbitrarias.
- Valores monetarios presentados en unidades monetarias sintéticas.
- Los indicadores de usuarios, partidos, apuestas y dinero usan su fecha correspondiente; equipos es catálogo sin fecha y por eso su total permanece global.
- Tendencias: últimos 12 meses con datos dentro del período seleccionado.
- Resultados: `ganada` y `perdida` conforme al CSV histórico.
- Spark aparece como **pendiente**: no se simula procesamiento distribuido.

## Rutas

- `GET /` — interfaz web
- `GET /api/health` — disponibilidad del proceso
- `GET /api/dashboard` — resumen completo
- `GET /api/dashboard?from=2025-01-01&to=2025-12-31` — resumen filtrado por fecha

## Pruebas para el informe académico

Documentar capturas de la página, salida `docker service ls`, tiempos de respuesta `curl -w`, y consultas filtradas. No confundir replicas de APIs originales con replica del dashboard. La segunda etapa requiere integrar un clúster de Spark, generar sus reportes reales, volver a probar escalabilidad y documentar el balanceo de HAProxy.

## Actualizaciones / retirarlo

El script evita modificar automáticamente un dashboard ya existente. No ejecuta `docker service rm`, `docker stack rm`, `vagrant destroy` ni `docker system prune`.

Si luego deseas retirar solamente el nuevo dashboard, ejecuta con conocimiento de que detendrá esa interfaz:

```bash
docker service rm novatix_dashboard
```

Esto no toca los 11 servicios originales.
