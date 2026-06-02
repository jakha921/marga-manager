from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.urls import user_urlpatterns
from apps.core.views import health_check


def _debug_urls(request):
    """Temp: list payment URL names registered in this process."""
    from django.urls import get_resolver

    resolver = get_resolver()
    names = []

    def collect(r, prefix=""):
        for p in r.url_patterns:
            if hasattr(p, "url_patterns"):
                collect(p, prefix + str(p.pattern))
            else:
                full = prefix + str(p.pattern)
                if "payment" in full:
                    names.append(full)

    collect(resolver)
    return JsonResponse({"payment_urls": names})


urlpatterns = [
    path("api/health/", health_check, name="health-check"),
    path("api/_debug_urls/", _debug_urls),
    path("admin/", admin.site.urls),
    # API Auth
    path("api/auth/", include("apps.accounts.urls")),
    # API Resources
    path("api/", include("apps.organizations.urls")),
    path("api/", include(user_urlpatterns)),
    path("api/", include("apps.kitchens.urls")),
    path("api/", include("apps.products.urls")),
    path("api/", include("apps.operations.urls")),
    path("api/analytics/", include("apps.operations.analytics_urls")),
    path("api/", include("apps.payments.urls")),
    # Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
