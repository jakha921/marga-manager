from django.db import migrations


def basic_one_kitchen(apps, schema_editor):
    PlanConfig = apps.get_model("payments", "PlanConfig")
    PlanConfig.objects.filter(plan="BASIC").update(max_kitchens=1)


def restore_basic_three(apps, schema_editor):
    PlanConfig = apps.get_model("payments", "PlanConfig")
    PlanConfig.objects.filter(plan="BASIC").update(max_kitchens=3)


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0009_alter_planconfig_price"),
    ]

    operations = [
        migrations.RunPython(basic_one_kitchen, restore_basic_three),
    ]
