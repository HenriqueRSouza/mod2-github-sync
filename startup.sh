#!/usr/bin/env bash
set -euo pipefail

# O App Service executa este arquivo a cada inicialização. Manter a migração
# aqui evita publicar código que depende de colunas ainda ausentes no banco.
python manage.py migrate --noinput
exec gunicorn --bind=0.0.0.0 --timeout 600 config.wsgi:application
