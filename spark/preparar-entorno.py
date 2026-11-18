#!/usr/bin/env python3
"""Prepara un archivo de variables privado a partir de las APIs que YA funcionan.
No modifica bases de datos, servicios ni volúmenes Docker.
"""
import json
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / '.env.dashboard'
DBS = {
    'usuarios': 'usuarios_db',
    'equipos': 'equipos_db',
    'partidos': 'partidos_db',
    'apuestas': 'apuestas_db',
    'dinero': 'dinero_db',
}

def read_env(service):
    cmd = [
        'docker', 'service', 'inspect', f'novatix_stack_{service}',
        '--format', '{{json .Spec.TaskTemplate.ContainerSpec.Env}}'
    ]
    result = subprocess.run(cmd, text=True, capture_output=True, timeout=15)
    if result.returncode:
        raise RuntimeError(f'No pude inspeccionar {service}. Confirma que Ubuntu2 sea el manager.')
    items = json.loads(result.stdout.strip()) or []
    env = {}
    for item in items:
        if '=' in item:
            name, value = item.split('=', 1)
            env[name] = value
    return env

def main():
    if DEST.exists():
        print('Existe una configuración anterior:', DEST)
        print('No se sobrescribe. Elimina manualmente este archivo si realmente deseas regenerarlo.')
        return 0
    pairs = {'PORT':'8080'}
    for service, database in DBS.items():
        original = read_env(service)
        prefix = service.upper()
        # Mismos valores de reserva que utilizan los modelos existentes.
        pairs[f'{prefix}_DB_HOST'] = f'novatix_stack_db-{service}'
        pairs[f'{prefix}_DB_USER'] = original.get('DB_USER', 'root')
        pairs[f'{prefix}_DB_PASSWORD'] = original.get('DB_PASSWORD', 'mysql')
        pairs[f'{prefix}_DB_NAME'] = original.get('DB_NAME', database)
        if pairs[f'{prefix}_DB_NAME'] != database:
            raise RuntimeError(f'{service} apunta a una BD distinta de {database}. No continuar sin revisar.')
        print(f'{service:10s}: host={pairs[f"{prefix}_DB_HOST"]}, BD={pairs[f"{prefix}_DB_NAME"]}')
    for name, value in pairs.items():
        if '\n' in value or '\r' in value:
            raise RuntimeError(f'El valor de {name} contiene saltos de línea no soportados')
    fd = os.open(DEST, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600)
    with os.fdopen(fd,'w',encoding='utf-8') as f:
        f.write('# NOVATIX - Configuración privada, NO compartir ni subir al repositorio\n')
        for key, value in pairs.items():
            f.write(f'{key}={value}\n')
    DEST.chmod(0o600)
    print('Archivo privado preparado. No se han mostrado contraseñas.')
    return 0

if __name__=='__main__':
    try:
        sys.exit(main())
    except (RuntimeError, subprocess.TimeoutExpired, json.JSONDecodeError, OSError) as exc:
        print('ERROR:', str(exc), file=sys.stderr)
        sys.exit(1)
