from django.http import JsonResponse

SUSPENDED_EXEMPT_PATHS = {
    "/api/auth/login/",
    "/api/auth/refresh/",
    "/api/auth/me/",
    "/api/health/",
    "/api/payments/plans/",
}
SUSPENDED_EXEMPT_PREFIXES = ("/api/payments/orders/",)


def is_suspended_exempt_path(path: str) -> bool:
    return path in SUSPENDED_EXEMPT_PATHS or any(
        path.startswith(prefix) for prefix in SUSPENDED_EXEMPT_PREFIXES
    )


class OrganizationMiddleware:
    """Устанавливает request.organization из user.organization и блокирует SUSPENDED орги."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.organization = None
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        if hasattr(request, "user") and request.user.is_authenticated:
            # Fetch fresh from DB to avoid stale cached instances
            org_id = getattr(request.user, "organization_id", None)
            if org_id:
                from apps.organizations.models import Organization

                try:
                    request.organization = Organization.objects.get(pk=org_id)
                except Organization.DoesNotExist:
                    request.organization = None
            else:
                request.organization = None

            if (
                request.organization
                and request.organization.status == "SUSPENDED"
                and request.user.role != "SUPER_ADMIN"
                and not is_suspended_exempt_path(request.path)
            ):
                return JsonResponse(
                    {"detail": "Организация приостановлена. Обратитесь к администратору."},
                    status=403,
                )
        else:
            request.organization = None
        return None
