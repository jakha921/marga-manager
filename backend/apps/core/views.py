import os

from django.db import connection
from django.http import JsonResponse


def health_check(request):
    """Health check для мониторинга и docker healthcheck."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok", "build": os.getenv("BUILD_SHA", "unknown")})
    except Exception:
        return JsonResponse({"status": "error", "database": "unavailable"}, status=503)
