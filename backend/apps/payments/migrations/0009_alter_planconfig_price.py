from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0008_update_basic_pro_prices"),
    ]

    operations = [
        migrations.AlterField(
            model_name="planconfig",
            name="price",
            field=models.BigIntegerField(
                help_text="Цена в тийинах (1 UZS = 100 тийин).",
                verbose_name="Цена (тийин)",
            ),
        ),
    ]
