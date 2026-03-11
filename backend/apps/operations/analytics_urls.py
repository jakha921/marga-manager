from django.urls import path

from .views import DashboardView, ProductHistoryView

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="analytics-dashboard"),
    path(
        "product-history/<int:product_id>/",
        ProductHistoryView.as_view(),
        name="analytics-product-history",
    ),
]
