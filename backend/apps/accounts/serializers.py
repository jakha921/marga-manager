from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import PasswordResetRequest, User
from .utils import looks_like_phone, normalize_phone


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT токен с ролью и org_id в claims. Логин по телефону нормализуется."""

    def validate(self, attrs):
        # Владельцы входят по телефону: "+998 90 123 45 67" -> "998901234567".
        # Демо-логины (admin/dev/cook) содержат буквы и остаются как есть.
        login = attrs.get(self.username_field, "")
        if looks_like_phone(login):
            attrs[self.username_field] = normalize_phone(login)
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["org_id"] = str(user.organization_id) if user.organization_id else None
        token["full_name"] = user.full_name
        return token


class PasswordResetRequestCreateSerializer(serializers.Serializer):
    """Публичная заявка на сброс пароля (без аутентификации)."""

    phone = serializers.CharField(max_length=30)
    note = serializers.CharField(max_length=300, required=False, allow_blank=True)

    def validate_phone(self, value: str) -> str:
        phone = normalize_phone(value)
        if not 7 <= len(phone) <= 15:
            raise serializers.ValidationError("Введите корректный номер телефона.")
        return phone

    def create(self, validated_data):
        return PasswordResetRequest.objects.create(
            phone=validated_data["phone"],
            note=validated_data.get("note", ""),
        )


class PasswordResetRequestSerializer(serializers.ModelSerializer):
    """Заявка для админа: телефон, статус, найден ли пользователь."""

    user_exists = serializers.SerializerMethodField()
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = PasswordResetRequest
        fields = [
            "id",
            "phone",
            "note",
            "status",
            "created_at",
            "resolved_at",
            "user_exists",
            "user_full_name",
        ]

    def get_user_exists(self, obj) -> bool:
        return User.objects.filter(username=obj.phone).exists()

    def get_user_full_name(self, obj) -> str:
        user = User.objects.filter(username=obj.phone).first()
        return user.full_name if user else ""


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор пользователя. Пароль опционален — задан, значит меняем."""

    organization_id = serializers.IntegerField(
        source="organization.id", read_only=True, default=None
    )
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "full_name",
            "role",
            "organization_id",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["date_joined"]

    def validate_password(self, value: str) -> str:
        from django.contrib.auth.password_validation import (
            validate_password as django_validate_password,
        )
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            django_validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user


class UserCreateSerializer(serializers.ModelSerializer):
    """Сериализатор создания пользователя."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "full_name",
            "role",
            "organization",
            "is_active",
        ]

    def validate_password(self, value: str) -> str:
        from django.contrib.auth.password_validation import (
            validate_password as django_validate_password,
        )
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            django_validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class RegisterSerializer(serializers.Serializer):
    """Public owner signup: creates organization + first tenant admin."""

    organization_name = serializers.CharField(max_length=200)
    owner_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=30)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_phone(self, value: str) -> str:
        phone = "".join(ch for ch in value if ch.isdigit())
        if not 7 <= len(phone) <= 15:
            raise serializers.ValidationError("Введите корректный номер телефона.")
        if User.objects.filter(username=phone).exists():
            raise serializers.ValidationError("Пользователь с таким телефоном уже существует.")
        return phone

    def validate_password(self, value: str) -> str:
        from django.contrib.auth.password_validation import (
            validate_password as django_validate_password,
        )
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            django_validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        from django.db import transaction
        from django.utils import timezone
        from django.utils.text import slugify

        from apps.organizations.models import Organization
        from apps.payments.models import AuditLog, PlanConfig

        base_slug = slugify(validated_data["organization_name"]) or "organization"
        slug = base_slug
        counter = 2
        while Organization.all_objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Триал даёт полный тариф Pro на 14 дней — чтобы после окончания
        # переход на Basic ощущался как потеря (сильный драйвер оплаты).
        try:
            pro = PlanConfig.objects.get(plan=Organization.Plan.PRO, is_active=True)
            max_kitchens = pro.max_kitchens
            max_users = pro.max_users
        except PlanConfig.DoesNotExist:
            max_kitchens = 10
            max_users = 50

        now = timezone.now()
        with transaction.atomic():
            org = Organization.objects.create(
                name=validated_data["organization_name"],
                slug=slug,
                plan=Organization.Plan.PRO,
                status=Organization.Status.ACTIVE,
                max_kitchens=max_kitchens,
                max_users=max_users,
                mrr=0,
                contact_name=validated_data["owner_name"],
                phone=validated_data["phone"],
                plan_started_at=now,
                plan_expires_at=now + timezone.timedelta(days=14),
            )
            user = User.objects.create_user(
                username=validated_data["phone"],
                password=validated_data["password"],
                full_name=validated_data["owner_name"],
                role=User.Role.TENANT_ADMIN,
                organization=org,
            )
            AuditLog.objects.create(
                event_type=AuditLog.EventType.USER_CREATED,
                actor=user,
                organization=org,
                target_type="User",
                target_id=user.id,
                new_value={"username": user.username, "role": user.role, "source": "signup"},
            )

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "organization_id": org.id,
            },
            "organization": {
                "id": org.id,
                "name": org.name,
                "plan": org.plan,
                "status": org.status,
                "plan_expires_at": org.plan_expires_at,
            },
        }


class MeSerializer(serializers.ModelSerializer):
    """Сериализатор текущего пользователя."""

    organization_id = serializers.IntegerField(
        source="organization.id", read_only=True, default=None
    )
    organization_name = serializers.CharField(
        source="organization.name", read_only=True, default=None
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "full_name",
            "role",
            "organization_id",
            "organization_name",
        ]
