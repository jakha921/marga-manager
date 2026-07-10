from django.db import migrations


def update_prices(apps, schema_editor):
    PlanConfig = apps.get_model("payments", "PlanConfig")
    for plan, price, max_kitchens, max_users in [
        ("BASIC", 29_900_000, 3, 10),
        ("PRO", 58_900_000, 10, 50),
        ("ENTERPRISE", 19_900_000, 999, 999),
    ]:
        PlanConfig.objects.update_or_create(
            plan=plan,
            defaults={
                "price": price,
                "max_kitchens": max_kitchens,
                "max_users": max_users,
                "is_active": True,
            },
        )


def restore_old_prices(apps, schema_editor):
    PlanConfig = apps.get_model("payments", "PlanConfig")
    for plan, price, max_kitchens, max_users in [
        ("BASIC", 0, 3, 10),
        ("PRO", 4_900_000, 10, 50),
        ("ENTERPRISE", 19_900_000, 999, 999),
    ]:
        PlanConfig.objects.update_or_create(
            plan=plan,
            defaults={
                "price": price,
                "max_kitchens": max_kitchens,
                "max_users": max_users,
                "is_active": True,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0007_alter_auditlog_event_type"),
    ]

    operations = [
        migrations.RunPython(update_prices, reverse_code=restore_old_prices),
    ]
