#!/bin/bash
set -e

uv run python manage.py migrate --noinput
uv run python manage.py collectstatic --noinput

# Auto-seed при пустой БД
uv run python manage.py shell -c "
from apps.organizations.models import Organization
if Organization.objects.count() == 0:
    print('Empty DB detected, running seed_data...')
    from django.core.management import call_command
    call_command('seed_data')
else:
    print(f'DB has {Organization.objects.count()} orgs, skipping seed.')
"

exec "$@"
