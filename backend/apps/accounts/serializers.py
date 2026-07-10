from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT токен с ролью и org_id в claims."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["org_id"] = str(user.organization_id) if user.organization_id else None
        token["full_name"] = user.full_name
        return token


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор пользователя."""

    organization_id = serializers.IntegerField(
        source="organization.id", read_only=True, default=None
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "full_name",
            "role",
            "organization_id",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["date_joined"]


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

        try:
            basic = PlanConfig.objects.get(plan=Organization.Plan.BASIC, is_active=True)
            max_kitchens = basic.max_kitchens
            max_users = basic.max_users
        except PlanConfig.DoesNotExist:
            max_kitchens = 3
            max_users = 10

        now = timezone.now()
        with transaction.atomic():
            org = Organization.objects.create(
                name=validated_data["organization_name"],
                slug=slug,
                plan=Organization.Plan.BASIC,
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
