from rest_framework.routers import DefaultRouter

from .views import KitchenViewSet

router = DefaultRouter()
router.register("kitchens", KitchenViewSet, basename="kitchens")

urlpatterns = router.urls
