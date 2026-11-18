#!/usr/bin/env bash
# Pruebas de solo lectura del dashboard
set -Eeuo pipefail

echo '===== NOVATIX - VALIDACION DASHBOARD ====='

echo ''
echo 'Servicio:'
docker service ls --filter name=novatix_dashboard

echo ''
echo 'Salud del proceso:'
if curl -fsS --max-time 12 http://127.0.0.1:8090/api/health; then
  echo ''
else
  echo 'El dashboard todavía no responde. Consulta docker service logs --tail 50 novatix_dashboard'
fi

echo ''
echo 'Indicadores SQL:'
if curl -fsS --max-time 35 http://127.0.0.1:8090/api/dashboard | python3 -c '
import json, sys
obj = json.load(sys.stdin)
t = obj["totals"]
for k in ("usuarios","equipos","partidos","apuestas","transacciones","ganadas","perdidas"):
    print(f"{k:15s} {t[k]:>12,.0f}")
print("Origen: cinco bases MySQL de NOVATIX")
'; then
  echo 'API de estadisticas: CORRECTA'
else
  echo 'ERROR: No se pudo consultar alguna base SQL desde el dashboard.'
  echo 'Revisa: docker service logs --tail 50 novatix_dashboard'
fi

echo ''
echo '===== VERIFICACION TERMINADA ====='
