import logging

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class OrganizationMiddleware(MiddlewareMixin):
    """Устанавливает request.organization из текущего пользователя."""

    def process_request(self, request):
        if request.user.is_authenticated and hasattr(request.user, "organization"):
            request.organization = request.user.organization
        else:
            request.organization = None
        return None
