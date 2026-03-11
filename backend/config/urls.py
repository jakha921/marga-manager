from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.urls import user_urlpatterns

urlpatterns = [
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
    # Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
