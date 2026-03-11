from rest_framework.routers import DefaultRouter

from .views import OperationViewSet

router = DefaultRouter()
router.register("operations", OperationViewSet, basename="operations")

urlpatterns = router.urls
