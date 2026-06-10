import os

from django.http import JsonResponse


def health_check(request):
    """Health check для мониторинга и docker healthcheck."""
    status_data = {
        "status": "ok",
        "build": os.getenv("BUILD_SHA", "unknown"),
        "services": {},
    }

    # DB check
    try:
        from django.db import connection

        connection.ensure_connection()
        status_data["services"]["db"] = "ok"
    except Exception as e:
        status_data["services"]["db"] = str(e)
        status_data["status"] = "degraded"

    # Redis check
    try:
        from django.core.cache import cache

        cache.set("health_check", "ok", 10)
        val = cache.get("health_check")
        status_data["services"]["redis"] = "ok" if val == "ok" else "error"
    except Exception as e:
        status_data["services"]["redis"] = str(e)
        status_data["status"] = "degraded"

    # Celery check (конфигурация, не живой воркер)
    try:
        from config.celery import app as celery_app  # noqa: F401

        status_data["services"]["celery"] = "configured"
    except Exception as e:
        status_data["services"]["celery"] = str(e)

    http_status = 200 if status_data["status"] == "ok" else 503
    return JsonResponse(status_data, status=http_status)
