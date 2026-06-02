from django.db import migrations


def seed_plan_configs(apps, schema_editor):
    PlanConfig = apps.get_model("payments", "PlanConfig")
    configs = [
        {"plan": "BASIC", "price": 0, "max_kitchens": 3, "max_users": 10, "is_active": True},
        {"plan": "PRO", "price": 4_900_000, "max_kitchens": 10, "max_users": 50, "is_active": True},
        {
            "plan": "ENTERPRISE",
            "price": 19_900_000,
            "max_kitchens": 999,
            "max_users": 999,
            "is_active": True,
        },
    ]
    for config in configs:
        PlanConfig.objects.get_or_create(plan=config["plan"], defaults=config)


def reverse_seed(apps, schema_editor):
    PlanConfig = apps.get_model("payments", "PlanConfig")
    PlanConfig.objects.filter(plan__in=["BASIC", "PRO", "ENTERPRISE"]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0002_planconfig"),
    ]

    operations = [
        migrations.RunPython(seed_plan_configs, reverse_code=reverse_seed),
    ]
