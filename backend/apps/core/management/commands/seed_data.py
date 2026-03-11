import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User
from apps.kitchens.models import Kitchen
from apps.operations.models import OperationEntry
from apps.organizations.models import Organization
from apps.products.models import Category, Product


class Command(BaseCommand):
    help = "Заполняет базу данных тестовыми данными"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Удалить все существующие данные перед заполнением",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self._clear_data()

        org1, org2 = self._create_organizations()
        self._create_users(org1)
        kitchens = self._create_kitchens(org1)
        categories = self._create_categories(org1)
        products = self._create_products(org1, categories)
        self._create_operations(org1, kitchens, products)

        self.stdout.write(self.style.SUCCESS("Тестовые данные успешно созданы!"))

    def _clear_data(self):
        OperationEntry.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        Kitchen.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        Organization.objects.all().delete()
        self.stdout.write(self.style.WARNING("Существующие данные удалены"))

    def _create_organizations(self) -> tuple[Organization, Organization]:
        org1, _ = Organization.objects.get_or_create(
            slug="marga-kitchen",
            defaults={
                "name": "Marga Kitchen",
                "plan": Organization.Plan.PRO,
                "status": Organization.Status.ACTIVE,
                "max_kitchens": 5,
                "max_users": 20,
                "mrr": Decimal("500000"),
                "currency": "UZS",
                "contact_name": "Aziz Karimov",
                "phone": "+998901234567",
                "email": "info@marga.uz",
                "address": "Ташкент, ул. Навои, 10",
                "tax_rate": Decimal("12.00"),
                "low_stock_threshold": 5,
            },
        )
        org2, _ = Organization.objects.get_or_create(
            slug="oqtepa-lavash",
            defaults={
                "name": "Oqtepa Lavash",
                "plan": Organization.Plan.BASIC,
                "status": Organization.Status.ACTIVE,
                "max_kitchens": 3,
                "max_users": 10,
                "mrr": Decimal("300000"),
                "currency": "UZS",
                "contact_name": "Sardor Alimov",
                "phone": "+998901112233",
                "email": "info@oqtepa.uz",
                "address": "Ташкент, ул. Амира Темура, 55",
                "tax_rate": Decimal("12.00"),
                "low_stock_threshold": 10,
            },
        )
        self.stdout.write(self.style.SUCCESS(f"Организации: {org1}, {org2}"))
        return org1, org2

    def _create_users(self, org: Organization) -> list[User]:
        users = []

        # Super Admin (no org)
        dev, created = User.objects.get_or_create(
            username="dev",
            defaults={
                "full_name": "Developer",
                "role": User.Role.SUPER_ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            dev.set_password("dev123")
            dev.save()
        users.append(dev)

        # Tenant Admin
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "full_name": "Aziz Chef",
                "role": User.Role.TENANT_ADMIN,
                "organization": org,
                "is_staff": True,
            },
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
        users.append(admin_user)

        # Kitchen User
        cook, created = User.objects.get_or_create(
            username="cook",
            defaults={
                "full_name": "Bobur Oshpaz",
                "role": User.Role.KITCHEN_USER,
                "organization": org,
            },
        )
        if created:
            cook.set_password("cook123")
            cook.save()
        users.append(cook)

        self.stdout.write(self.style.SUCCESS(f"Пользователи: {len(users)} создано"))
        return users

    def _create_kitchens(self, org: Organization) -> list[Kitchen]:
        kitchen_names = ["Markaziy Oshxona", "Filial Chilonzor", "Filial Sergeli"]
        kitchens = []
        for name in kitchen_names:
            kitchen, _ = Kitchen.objects.get_or_create(
                organization=org,
                name=name,
                defaults={"is_active": True},
            )
            kitchens.append(kitchen)
        self.stdout.write(self.style.SUCCESS(f"Кухни: {len(kitchens)} создано"))
        return kitchens

    def _create_categories(self, org: Organization) -> dict[str, Category]:
        category_data = [
            ("Xom ashyo", "Raw materials"),
            ("Oziq-ovqat", "Groceries"),
            ("Yarim tayyor", "Semi-finished"),
            ("Ichimliklar", "Beverages"),
            ("Tayyor taomlar", "Finished dishes"),
        ]
        categories = {}
        for name, _desc in category_data:
            cat, _ = Category.objects.get_or_create(
                organization=org,
                name=name,
            )
            categories[name] = cat
        self.stdout.write(self.style.SUCCESS(f"Категории: {len(categories)} создано"))
        return categories

    def _create_products(self, org: Organization, categories: dict[str, Category]) -> list[Product]:
        product_data = [
            # Xom ashyo (Raw materials)
            ("XA-001", "Mol go'shti", "Xom ashyo", "kg"),
            ("XA-002", "Tovuq go'shti", "Xom ashyo", "kg"),
            ("XA-003", "Qo'y go'shti", "Xom ashyo", "kg"),
            ("XA-004", "Kartoshka", "Xom ashyo", "kg"),
            ("XA-005", "Piyoz", "Xom ashyo", "kg"),
            ("XA-006", "Sabzi", "Xom ashyo", "kg"),
            # Oziq-ovqat (Groceries)
            ("OO-001", "Guruch", "Oziq-ovqat", "kg"),
            ("OO-002", "Un", "Oziq-ovqat", "kg"),
            ("OO-003", "Tuz", "Oziq-ovqat", "kg"),
            ("OO-004", "O'simlik yog'i", "Oziq-ovqat", "L"),
            ("OO-005", "Zira", "Oziq-ovqat", "kg"),
            # Yarim tayyor (Semi-finished)
            ("YT-001", "Qiyma", "Yarim tayyor", "kg"),
            ("YT-002", "Xamir", "Yarim tayyor", "kg"),
            # Ichimliklar (Beverages)
            ("IC-001", "Coca-Cola 1.5L", "Ichimliklar", "dona"),
            ("IC-002", "Mineral suv 1L", "Ichimliklar", "dona"),
            ("IC-003", "Kompot", "Ichimliklar", "L"),
            # Tayyor taomlar (Finished dishes)
            ("TT-001", "Osh (Palov)", "Tayyor taomlar", "porsia"),
            ("TT-002", "Lag'mon", "Tayyor taomlar", "porsia"),
            ("TT-003", "Somsa", "Tayyor taomlar", "dona"),
            ("TT-004", "Shashlik", "Tayyor taomlar", "porsia"),
        ]
        products = []
        for code, name, cat_name, unit in product_data:
            product, _ = Product.objects.get_or_create(
                organization=org,
                code=code,
                defaults={
                    "name": name,
                    "category": categories[cat_name],
                    "unit": unit,
                },
            )
            products.append(product)
        self.stdout.write(self.style.SUCCESS(f"Продукты: {len(products)} создано"))
        return products

    def _create_operations(
        self,
        org: Organization,
        kitchens: list[Kitchen],
        products: list[Product],
    ) -> list[OperationEntry]:
        now = timezone.now()
        operations = []

        # Price ranges by product code prefix (UZS)
        price_ranges: dict[str, tuple[int, int]] = {
            "XA": (40000, 120000),  # Raw materials per kg
            "OO": (5000, 30000),  # Groceries per kg/L
            "YT": (30000, 60000),  # Semi-finished per kg
            "IC": (5000, 15000),  # Beverages per unit
            "TT": (25000, 50000),  # Finished dishes per portion
        }

        op_types = [
            OperationEntry.Type.INCOMING,
            OperationEntry.Type.DAILY,
            OperationEntry.Type.SALE,
            OperationEntry.Type.TRANSFER,
        ]
        type_weights = [15, 15, 10, 10]  # distribution weights

        for _ in range(50):
            op_type = random.choices(op_types, weights=type_weights, k=1)[0]
            product = random.choice(products)
            kitchen = random.choice(kitchens)
            days_ago = random.randint(0, 30)
            op_date = (now - timedelta(days=days_ago)).date()
            op_time = (
                now.replace(
                    hour=random.randint(6, 22),
                    minute=random.randint(0, 59),
                )
            ).time()

            prefix = product.code[:2]
            price_range = price_ranges.get(prefix, (10000, 50000))

            # Determine quantity based on unit
            if product.unit == "kg":
                quantity = Decimal(str(round(random.uniform(1, 50), 1)))
            elif product.unit == "L":
                quantity = Decimal(str(round(random.uniform(1, 30), 1)))
            elif product.unit == "dona":
                quantity = Decimal(str(random.randint(5, 100)))
            else:  # porsia
                quantity = Decimal(str(random.randint(10, 80)))

            # Price only for INCOMING and SALE
            price = None
            if op_type in (OperationEntry.Type.INCOMING, OperationEntry.Type.SALE):
                price = Decimal(str(random.randint(price_range[0], price_range[1])))

            # to_kitchen only for TRANSFER
            to_kitchen = None
            if op_type == OperationEntry.Type.TRANSFER:
                other_kitchens = [k for k in kitchens if k.id != kitchen.id]
                to_kitchen = random.choice(other_kitchens) if other_kitchens else None

            entry = OperationEntry.objects.create(
                organization=org,
                type=op_type,
                date=op_date,
                time=op_time,
                kitchen=kitchen,
                to_kitchen=to_kitchen,
                product=product,
                quantity=quantity,
                unit=product.unit,
                price=price,
            )
            operations.append(entry)

        self.stdout.write(self.style.SUCCESS(f"Операции: {len(operations)} создано"))
        return operations
