# NOVATIX — Plataforma Distribuida de Apuestas Deportivas y Analítica Big Data

Proyecto Final — Módulo de Infraestructura (Redes e Infraestructura, Universidad Autónoma de Occidente).

## 1. Arquitectura y Topología de Nodos

| Nodo / Host | IP | Rol | Servicios Desplegados |
| :--- | :--- | :--- | :--- |
| servidorUbuntu1 | 192.168.100.2 | Clúster Apache Spark (Master) | PySpark (analisis_novatix.py) + mysql-connector-j |
| servidorUbuntu2 | 192.168.100.3 | Docker Swarm Manager & Gateway | HAProxy (:8080), 5 Microservicios Node.js (:3000-:3004), Dashboard (:8090) |
| servidorDatos | 192.168.100.5 | Servidor de Bases de Datos | MySQL (:3306): 5 BD operativas + reportes_db (analítica) |
| servidorWorker | 192.168.100.6 | Nodo Worker | Procesamiento distribuido Spark |

## 2. Estructura del Repositorio

- docker-compose-novatix.yml: Stack de 5 microservicios (apuestas, usuarios, partidos, dinero, equipos) con 2 réplicas cada uno.
- haproxy/haproxy.cfg: Balanceador de carga Round-Robin en puerto 8080 con resolución DNS dinámica de Docker Swarm.
- spark/analisis_novatix.py: Pipeline ETL en PySpark que procesa /vagrant/datos/*.csv y escribe reporte_ligas, reporte_top_equipos y reporte_tendencias vía JDBC en reportes_db.
- novatix_dashboard_v1/: Aplicación web (v2.0.0, Express + React/Recharts) en puerto 8090 que visualiza los reportes generados por Spark.

## 3. Guía de Reproducción Paso a Paso

### Paso 1: Desplegar Microservicios y HAProxy en Docker Swarm (192.168.100.3)

    docker stack deploy -c docker-compose-novatix.yml novatix
    docker config create novatix_haproxy_cfg haproxy/haproxy.cfg
    docker service create --name novatix_haproxy --network novatix_default --publish 8080:8080 --config source=novatix_haproxy_cfg,target=/usr/local/etc/haproxy/haproxy.cfg haproxy:2.9-alpine

### Paso 2: Ejecutar Pipeline Analítico en Apache Spark (192.168.100.2)

    spark-submit --jars /opt/spark/jars/mysql-connector-j.jar spark/analisis_novatix.py

### Paso 3: Desplegar Dashboard Analítico (192.168.100.3)

    cd novatix_dashboard_v1
    cp .env.dashboard.example .env.dashboard
    bash instalar.sh

- Dashboard Web: http://192.168.100.3:8090
- Estadísticas HAProxy: http://192.168.100.3:8080/haproxy?stats (usuario: admin / clave: admin)

## 4. Pruebas de Balanceo y Escalabilidad

    curl -s -o /dev/null -w "HTTP: %{http_code} | Tiempo: %{time_total}s\n" http://192.168.100.3:8080/api/partidos
    docker service scale novatix_partidos=5
    docker service scale novatix_partidos=2
