import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("apps.core")


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "error": {
                "status": response.status_code,
                "detail": response.data,
            }
        }
    else:
        logger.error(
            "Unhandled exception in %s: %s",
            context.get("view", "unknown"),
            str(exc),
            exc_info=True,
        )
        response = Response(
            {"error": {"status": 500, "detail": "Internal server error."}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return response
