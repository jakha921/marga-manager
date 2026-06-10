from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver


@receiver([post_save, post_delete], sender="payments.PlanConfig")
def invalidate_plan_config_cache(sender, **kwargs):
    cache.delete("plan_config_list")
