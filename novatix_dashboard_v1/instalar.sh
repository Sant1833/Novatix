#!/usr/bin/env bash
# Ejecutar con: bash instalar.sh
# Instala un servicio NUEVO: no modifica los 11 servicios existentes.
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

main() {
  echo '============================================'
  echo ' NOVATIX - DASHBOARD WEB / INSTALACION v1.0'
  echo '============================================'

  if [ "$(hostname)" != 'servidorUbuntu2' ]; then
    echo 'ERROR: Este paquete se instala únicamente en servidorUbuntu2.'
    return 1
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo 'ERROR: docker no esta disponible.'
    return 1
  fi

  local manager
  manager="$(timeout 12s docker info --format '{{.Swarm.ControlAvailable}}' 2>/dev/null || true)"
  if [ "$manager" != true ]; then
    echo 'ERROR: servidorUbuntu2 no responde como manager de Docker Swarm.'
    return 1
  fi

  if timeout 12s docker service inspect novatix_dashboard >/dev/null 2>&1; then
    echo 'AVISO: Ya existe el servicio novatix_dashboard.'
    echo 'No lo modificare automaticamente.'
    echo 'Consulta: docker service ls --filter name=novatix_dashboard'
    return 0
  fi

  if ! timeout 12s docker network inspect novatix_stack_novatix_net_new >/dev/null 2>&1; then
    echo 'ERROR: No se encontro la red overlay de NOVATIX.'
    return 1
  fi

  if ! timeout 12s docker service ls --format '{{.Name}}' | grep -qx 'novatix_stack_db-usuarios'; then
    echo 'ERROR: Los servicios SQL de NOVATIX no son visibles.'
    return 1
  fi

  if command -v ss >/dev/null 2>&1 && ss -H -ltn '( sport = :8090 )' | grep -q .; then
    echo 'ERROR: El puerto 8090 ya esta ocupado en Ubuntu2.'
    return 1
  fi

  echo ''
  echo '1. Preparando configuracion (credenciales sin mostrarlas)...'
  if ! python3 "$ROOT/scripts/preparar-entorno.py"; then
    echo 'No fue posible preparar variables del dashboard.'
    return 1
  fi

  echo ''
  echo '2. Construyendo imagen del nuevo dashboard...'
  if ! docker build --pull -t novatix-dashboard:1.0.0 "$ROOT"; then
    echo 'ERROR al construir la imagen. Ningun servicio fue creado.'
    return 1
  fi

  echo ''
  echo '3. Creando un NUEVO servicio de Docker Swarm...'
  if ! docker service create \
    --detach=true \
    --no-resolve-image \
    --name novatix_dashboard \
    --replicas 1 \
    --constraint 'node.hostname==servidorUbuntu2' \
    --network novatix_stack_novatix_net_new \
    --publish 'published=8090,target=8080,mode=host' \
    --limit-cpu 1.0 \
    --limit-memory 512m \
    --restart-condition on-failure \
    --env-file "$ROOT/.env.dashboard" \
    novatix-dashboard:1.0.0; then
    echo 'ERROR: Docker no confirmo la creacion del nuevo servicio.'
    return 1
  fi

  echo ''
  echo '============================================'
  echo ' SERVICIO SOLICITADO - VERIFICA SU ESTADO'
  echo '============================================'
  docker service ls --filter name=novatix_dashboard
  echo ''
  echo 'Abrir desde Windows: http://192.168.100.3:8090'
  echo 'Probar en Ubuntu2: curl -s http://127.0.0.1:8090/api/health'
  echo 'Errores: docker service logs --tail 60 novatix_dashboard'
  echo ''
  echo 'No se modificaron los otros servicios ni las bases SQL.'
}

main "$@"
