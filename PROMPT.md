# Marga Manager — Ralph Loop Task List (Audit V4)

## Запуск
```bash
ralph-loop:ralph-loop "Прочитай PROMPT.md (/Users/jakha/Programming/Django/marga-manager/PROMPT.md). Найди первую незавершённую задачу [ ]. Выполни её полностью — создай файлы, напиши код, запусти проверку (cd backend && uv run python manage.py check && uv run pytest -v для бэкенда, cd frontend && npm run build для фронтенда). Отметь [x] в PROMPT.md. Закоммить изменения. Повторяй до ALL PHASES COMPLETE." --max-iterations 70 --completion-promise "ALL PHASES COMPLETE" /compact /senior-qa /senior-backend /senior-frontend /frontend-design:frontend-design /server-advisor
```

---

## Контекст

V3 завершён (200 тестов, logging, AuditLog платежей, Celery, Subscription). V4 добавляет:
1. **Backend security** — лимиты на API, SUSPENDED блокировка, soft delete
2. **AuditLog** для всех CRUD операций + API endpoint
3. **Production hardening** — Redis cache, Sentry, pg_backup, health check
4. **Frontend admin** — OrganizationDetail page, AuditLog page, suspend/unsuspend

**БЕЗ email**: рассылки не нужны.

---

## Порядок выполнения

1. Phase 1 — Backend Security (лимиты, SUSPENDED, soft delete, exception handler)
2. Phase 2 — AuditLog Integration + API
3. Phase 3 — Production Hardening (cache, Sentry, backup, org detail API)
4. Phase 4 — Frontend Admin Panel
5. Phase 5 — Integration & Polish

---

## Phase 1: Backend Security Hardening

### 1.1 Enforce max_kitchens на KitchenViewSet

- [x] В `backend/apps/kitchens/views.py` добавить `perform_create`:
  ```python
  def perform_create(self, serializer):
      org = self.request.user.organization
      if self.request.user.role != "SUPER_ADMIN" and org and not org.can_add_kitchen():
          from rest_framework.exceptions import PermissionDenied
          raise PermissionDenied(f"Достигнут лимит кухонь ({org.max_kitchens}).")
      super().perform_create(serializer)
  ```
- [x] В `backend/tests/test_kitchens.py` добавить `TestKitchenLimitEnforcement`:
  - `test_cannot_create_kitchen_at_limit` — создать max_kitchens кухонь, следующая → 403
  - `test_can_create_kitchen_below_limit` — ниже лимита → 201
  - `test_super_admin_bypasses_kitchen_limit` — SUPER_ADMIN всегда может создавать

**Проверка**: `cd backend && uv run pytest tests/test_kitchens.py -v`
**Коммит**: `fix: enforce max_kitchens limit in KitchenViewSet.perform_create`

---

### 1.2 Enforce max_users на UserViewSet

- [x] В `backend/apps/accounts/views.py` в `UserViewSet` добавить/изменить `perform_create`:
  ```python
  def perform_create(self, serializer):
      user = self.request.user
      org = user.organization
      if user.role != "SUPER_ADMIN" and org and not org.can_add_user():
          from rest_framework.exceptions import PermissionDenied
          raise PermissionDenied(f"Достигнут лимит пользователей ({org.max_users}).")
      super().perform_create(serializer)
  ```
- [x] В `backend/tests/test_auth.py` добавить `TestUserLimitEnforcement`:
  - `test_cannot_create_user_at_limit` — → 403
  - `test_can_create_user_below_limit` — → 201
  - `test_super_admin_bypasses_user_limit` — SUPER_ADMIN bypass

**Проверка**: `cd backend && uv run pytest tests/test_auth.py -v`
**Коммит**: `fix: enforce max_users limit in UserViewSet.perform_create`

---

### 1.3 SUSPENDED org блокировка в middleware

- [x] В `backend/apps/core/middleware.py` в `process_view` добавить статус-чек:
  ```python
  def process_view(self, request, view_func, view_args, view_kwargs):
      if hasattr(request, "user") and request.user.is_authenticated:
          request.organization = getattr(request.user, "organization", None)
          # Блокировать suspended org (SUPER_ADMIN обходит)
          if (
              request.organization
              and request.organization.status == "SUSPENDED"
              and request.user.role != "SUPER_ADMIN"
          ):
              import json
              from django.http import JsonResponse
              return JsonResponse(
                  {"detail": "Организация приостановлена. Обратитесь к администратору."},
                  status=403
              )
      else:
          request.organization = None
      return None
  ```
  Исключить эндпоинты аутентификации (`/api/auth/login/`, `/api/auth/refresh/`, `/api/health/`) от блокировки.
- [x] В `backend/tests/test_organizations.py` добавить `TestSuspendedOrgBlocking`:
  - `test_suspended_org_api_blocked_for_tenant_admin` — TENANT_ADMIN из suspended org → 403
  - `test_suspended_org_api_blocked_for_kitchen_user` — KITCHEN_USER → 403
  - `test_super_admin_not_blocked_for_suspended_org` — SUPER_ADMIN → 200
  - `test_active_org_not_blocked` — активная org → без изменений
  - `test_login_not_blocked_for_suspended_org` — `/api/auth/login/` → 200 даже для suspended

**Проверка**: `cd backend && uv run pytest tests/test_organizations.py -v`
**Коммит**: `feat: block API access for SUSPENDED organizations in OrganizationMiddleware`

---

### 1.4 Custom DRF exception handler

- [x] Создать `backend/apps/core/exceptions.py`:
  ```python
  import logging
  from rest_framework.views import exception_handler
  from rest_framework.response import Response
  from rest_framework import status

  logger = logging.getLogger("apps.core")

  def custom_exception_handler(exc, context):
      response = exception_handler(exc, context)
      if response is not None:
          response.data = {
              "error": {
                  "status": response.status_code,
                  "detail": response.data,
              }
          }
      else:
          # Unhandled exception — log it
          logger.error(
              "Unhandled exception in %s: %s",
              context.get("view", "unknown"),
              str(exc),
              exc_info=True,
          )
          response = Response(
              {"error": {"status": 500, "detail": "Internal server error."}},
              status=status.HTTP_500_INTERNAL_SERVER_ERROR,
          )
      return response
  ```
- [x] В `backend/config/drf_settings.py` в REST_FRAMEWORK добавить:
  ```python
  "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
  ```

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v`
**Коммит**: `feat: custom DRF exception handler with standardized error format`

---

### 1.5 SoftDeleteModel mixin

- [x] В `backend/apps/core/models.py` добавить:
  ```python
  import logging
  from django.db import models
  from django.utils import timezone

  logger = logging.getLogger("apps.core")

  class SoftDeleteManager(models.Manager):
      """Менеджер, фильтрующий мягко удалённые записи по умолчанию."""
      def get_queryset(self):
          return super().get_queryset().filter(deleted_at__isnull=True)

  class AllObjectsManager(models.Manager):
      """Менеджер, возвращающий все записи включая удалённые."""
      pass

  class SoftDeleteModel(models.Model):
      """Abstract mixin для мягкого удаления."""
      deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Удалено в")

      objects = SoftDeleteManager()
      all_objects = AllObjectsManager()

      class Meta:
          abstract = True

      def delete(self, using=None, keep_parents=False):
          self.deleted_at = timezone.now()
          self.save(update_fields=["deleted_at"])
          logger.info("SoftDelete: %s #%s deleted", self.__class__.__name__, self.pk)

      def hard_delete(self):
          super().delete()

      def restore(self):
          self.deleted_at = None
          self.save(update_fields=["deleted_at"])

      @property
      def is_deleted(self) -> bool:
          return self.deleted_at is not None
  ```
- [x] Добавить тест в `backend/tests/test_organizations.py` — `TestSoftDeleteMixin` (можно через тестовую модель или Organization):
  - `test_soft_delete_sets_deleted_at` — после delete(), `obj.deleted_at` не None
  - `test_soft_deleted_not_in_objects` — `Model.objects.filter(pk=obj.pk)` возвращает пустой queryset
  - `test_soft_deleted_in_all_objects` — `Model.all_objects.filter(pk=obj.pk)` возвращает объект
  - `test_restore_clears_deleted_at` — после restore(), `deleted_at` is None

**Проверка**: `cd backend && uv run pytest tests/test_organizations.py -v -k "SoftDelete"`
**Коммит**: `feat: добавить SoftDeleteModel mixin в apps/core/models.py`

---

### 1.6 Применить SoftDelete к Organization

- [x] В `backend/apps/organizations/models.py`:
  - Изменить наследование: `class Organization(SoftDeleteModel, TimeStampedModel):`
  - Импортировать: `from apps.core.models import SoftDeleteModel`
- [x] Запустить: `cd backend && uv run python manage.py makemigrations organizations`
- [x] В `backend/apps/organizations/views.py` убедиться что `destroy` использует мягкое удаление (вызывает `instance.delete()` — теперь это soft delete)
- [x] В `backend/tests/test_organizations.py` добавить:
  - `test_organization_soft_delete_via_api` — DELETE /api/organizations/{id}/ → org still in all_objects
  - `test_deleted_org_not_in_list` — после удаления не виден в GET /api/organizations/

**Проверка**: `cd backend && uv run pytest tests/test_organizations.py -v`
**Коммит**: `feat: применить SoftDelete к Organization`

---

### 1.7 Применить SoftDelete к Kitchen и Product

- [x] В `backend/apps/kitchens/models.py`:
  - `class Kitchen(SoftDeleteModel, TenantModel):`
  - Импорт: `from apps.core.models import SoftDeleteModel`
- [x] В `backend/apps/products/models.py`:
  - `class Product(SoftDeleteModel, TenantModel):`
  - `class Category(SoftDeleteModel, TenantModel):`
  - Импорт: `from apps.core.models import SoftDeleteModel`
- [x] Запустить: `cd backend && uv run python manage.py makemigrations kitchens products`
- [x] Убедиться что `TenantQuerySetMixin.get_queryset()` вызывает `super().get_queryset()` — это обеспечит что `SoftDeleteManager` применяется через цепочку
- [x] Добавить тесты:
  - `backend/tests/test_kitchens.py`: `test_kitchen_soft_delete_via_api`
  - `backend/tests/test_products.py`: `test_product_soft_delete_via_api`

**Проверка**: `cd backend && uv run pytest tests/test_kitchens.py tests/test_products.py -v`
**Коммит**: `feat: применить SoftDelete к Kitchen, Category, Product`

---

### 1.8 Расширить AuditLog EventTypes

- [x] В `backend/apps/payments/models.py` в `AuditLog.EventType` добавить:
  ```python
  USER_CREATED = "USER_CREATED", "Создан пользователь"
  USER_UPDATED = "USER_UPDATED", "Обновлён пользователь"
  USER_DELETED = "USER_DELETED", "Удалён пользователь"
  KITCHEN_CREATED = "KITCHEN_CREATED", "Создана кухня"
  KITCHEN_UPDATED = "KITCHEN_UPDATED", "Обновлена кухня"
  KITCHEN_DELETED = "KITCHEN_DELETED", "Удалена кухня"
  PRODUCT_CREATED = "PRODUCT_CREATED", "Создан продукт"
  PRODUCT_UPDATED = "PRODUCT_UPDATED", "Обновлён продукт"
  PRODUCT_DELETED = "PRODUCT_DELETED", "Удалён продукт"
  ORG_SUSPENDED = "ORG_SUSPENDED", "Организация приостановлена"
  ORG_UNSUSPENDED = "ORG_UNSUSPENDED", "Организация активирована"
  ORG_DELETED = "ORG_DELETED", "Организация удалена"
  ```
- [x] Запустить: `cd backend && uv run python manage.py makemigrations payments`

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: расширить AuditLog EventTypes для CRUD операций`

---

## Phase 2: AuditLog Integration + API

### 2.1 Утилита create_audit_log()

- [x] Создать `backend/apps/core/audit.py`:
  ```python
  from typing import Any

  def create_audit_log(
      event_type: str,
      actor=None,
      organization=None,
      target_type: str = "",
      target_id: int = 0,
      old_value: dict | None = None,
      new_value: dict | None = None,
      metadata: dict | None = None,
  ) -> None:
      """Создать запись AuditLog. Безопасно при ошибках — не бросает исключений."""
      try:
          from apps.payments.models import AuditLog
          AuditLog.objects.create(
              event_type=event_type,
              actor=actor,
              organization=organization,
              target_type=target_type,
              target_id=target_id or 0,
              old_value=old_value or {},
              new_value=new_value or {},
              metadata=metadata or {},
          )
      except Exception:
          import logging
          logging.getLogger("apps.core").error("Failed to create AuditLog", exc_info=True)
  ```

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: создать утилиту create_audit_log в apps/core/audit.py`

---

### 2.2 Wire AuditLog в KitchenViewSet

- [ ] В `backend/apps/kitchens/views.py` добавить audit в `perform_create`, `perform_update`, `perform_destroy`:
  ```python
  from apps.core.audit import create_audit_log
  from apps.payments.models import AuditLog

  # в perform_create:
  create_audit_log(
      AuditLog.EventType.KITCHEN_CREATED,
      actor=self.request.user,
      organization=self.request.user.organization,
      target_type="Kitchen", target_id=instance.id,
      new_value={"name": instance.name},
  )

  # в perform_destroy:
  create_audit_log(
      AuditLog.EventType.KITCHEN_DELETED,
      actor=self.request.user,
      organization=self.request.user.organization,
      target_type="Kitchen", target_id=instance.id,
      old_value={"name": instance.name},
  )
  ```

**Проверка**: `cd backend && uv run pytest tests/test_kitchens.py -v`
**Коммит**: `feat: AuditLog в KitchenViewSet CRUD`

---

### 2.3 Wire AuditLog в UserViewSet и Organization status

- [ ] В `backend/apps/accounts/views.py` добавить audit в UserViewSet `perform_create`, `perform_destroy`
- [ ] В `backend/apps/organizations/views.py` добавить `perform_update` — если статус изменился:
  ```python
  def perform_update(self, serializer):
      old_status = serializer.instance.status
      instance = serializer.save()
      new_status = instance.status
      if old_status != new_status:
          event = (
              AuditLog.EventType.ORG_SUSPENDED
              if new_status == "SUSPENDED"
              else AuditLog.EventType.ORG_UNSUSPENDED
          )
          create_audit_log(
              event,
              actor=self.request.user,
              organization=instance,
              target_type="Organization", target_id=instance.id,
              old_value={"status": old_status},
              new_value={"status": new_status},
          )
  ```

**Проверка**: `cd backend && uv run pytest tests/test_auth.py tests/test_organizations.py -v`
**Коммит**: `feat: AuditLog в UserViewSet и Organization status changes`

---

### 2.4 Wire AuditLog в ProductViewSet

- [ ] В `backend/apps/products/views.py` добавить audit в `CategoryViewSet` и `ProductViewSet`:
  - `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED` в ProductViewSet

**Проверка**: `cd backend && uv run pytest tests/test_products.py -v`
**Коммит**: `feat: AuditLog в ProductViewSet CRUD`

---

### 2.5 AuditLog API endpoint (SUPER_ADMIN only)

- [ ] В `backend/apps/payments/serializers.py` добавить:
  ```python
  class AuditLogSerializer(serializers.ModelSerializer):
      actor_name = serializers.SerializerMethodField()
      org_name = serializers.SerializerMethodField()

      class Meta:
          model = AuditLog
          fields = ["id", "event_type", "actor", "actor_name", "organization", "org_name",
                    "target_type", "target_id", "old_value", "new_value", "metadata", "created_at"]
          read_only_fields = fields

      def get_actor_name(self, obj):
          return obj.actor.username if obj.actor else None

      def get_org_name(self, obj):
          return obj.organization.name if obj.organization else None
  ```
- [ ] В `backend/apps/payments/views.py` добавить `AuditLogViewSet`:
  ```python
  class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
      queryset = AuditLog.objects.select_related("actor", "organization").order_by("-created_at")
      serializer_class = AuditLogSerializer
      permission_classes = [IsSuperAdmin]
      filterset_fields = ["event_type", "organization", "target_type"]
      filter_backends = [DjangoFilterBackend, OrderingFilter]
  ```
- [ ] В `backend/apps/payments/urls.py` зарегистрировать: `router.register("payments/audit-logs", AuditLogViewSet)`

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest tests/test_payments.py -v`
**Коммит**: `feat: AuditLog API endpoint — ReadOnly ViewSet для SUPER_ADMIN`

---

### 2.6 Тесты для AuditLog API и интеграции

- [ ] В `backend/tests/test_payments.py` добавить `TestAuditLogAPI`:
  - `test_super_admin_can_list_audit_logs` — GET /api/payments/audit-logs/ → 200
  - `test_tenant_admin_cannot_access_audit_logs` — → 403
  - `test_filter_by_event_type` — ?event_type=PLAN_CHANGE → правильные записи
  - `test_filter_by_organization` — ?organization={id} → только эта org
  - `test_kitchen_create_creates_audit_log` — создание кухни → AuditLog с KITCHEN_CREATED
  - `test_org_suspend_creates_audit_log` — изменение status → AuditLog с ORG_SUSPENDED

**Проверка**: `cd backend && uv run pytest tests/test_payments.py -k "AuditLog" -v`
**Коммит**: `test: тесты для AuditLog API и интеграции`

---

## Phase 3: Production Hardening

### 3.1 Enhanced health check

- [ ] В `backend/apps/core/views.py` обновить `health_check`:
  ```python
  def health_check(request):
      status_data = {"status": "ok", "services": {}}

      # DB check
      try:
          from django.db import connection
          connection.ensure_connection()
          status_data["services"]["db"] = "ok"
      except Exception as e:
          status_data["services"]["db"] = str(e)
          status_data["status"] = "degraded"

      # Redis check
      try:
          from django.core.cache import cache
          cache.set("health_check", "ok", 10)
          val = cache.get("health_check")
          status_data["services"]["redis"] = "ok" if val == "ok" else "error"
      except Exception as e:
          status_data["services"]["redis"] = str(e)
          status_data["status"] = "degraded"

      # Celery check (optional — проверяет конфигурацию, не живой воркер)
      try:
          from config.celery import app as celery_app
          status_data["services"]["celery"] = "configured"
      except Exception as e:
          status_data["services"]["celery"] = str(e)

      http_status = 200 if status_data["status"] == "ok" else 503
      from django.http import JsonResponse
      return JsonResponse(status_data, status=http_status)
  ```

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: health check — добавить Redis и Celery проверки`

---

### 3.2 Redis кэширование — CACHES setting

- [ ] В `backend/config/settings/base.py` добавить (после CELERY настроек):
  ```python
  # Cache
  CACHES = {
      "default": {
          "BACKEND": "django.core.cache.backends.redis.RedisCache",
          "LOCATION": os.getenv("REDIS_CACHE_URL", "redis://localhost:6379/1"),
          "TIMEOUT": 300,  # 5 минут
      }
  }
  ```
- [ ] В `backend/config/settings/dev.py` переопределить на LocMemCache для тестов:
  ```python
  CACHES = {
      "default": {
          "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
      }
  }
  ```
- [ ] В `.env.example` добавить `REDIS_CACHE_URL=redis://redis:6379/1`
- [ ] В `docker-compose.coolify.yml` добавить env var `REDIS_CACHE_URL` к backend сервису

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: настроить Redis кэширование в Django`

---

### 3.3 Кэшировать PlanConfig

- [ ] В `backend/apps/payments/views.py` в `PlanConfigListView.get` добавить:
  ```python
  from django.core.cache import cache
  CACHE_KEY = "plan_config_list"

  def get(self, request, *args, **kwargs):
      cached = cache.get(CACHE_KEY)
      if cached is not None:
          return Response(cached)
      response = super().get(request, *args, **kwargs)
      cache.set(CACHE_KEY, response.data, timeout=3600)  # 1 час
      return response
  ```
- [ ] Создать `backend/apps/payments/signals.py` для инвалидации при изменении PlanConfig:
  ```python
  from django.db.models.signals import post_save, post_delete
  from django.dispatch import receiver
  from django.core.cache import cache

  @receiver([post_save, post_delete], sender="payments.PlanConfig")
  def invalidate_plan_config_cache(sender, **kwargs):
      cache.delete("plan_config_list")
  ```
- [ ] В `backend/apps/payments/apps.py` подключить сигнал: в `ready()` добавить `import apps.payments.signals`

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: кэшировать PlanConfig на 1 час с инвалидацией`

---

### 3.4 Sentry SDK

- [ ] В `backend/pyproject.toml` добавить: `"sentry-sdk[django]>=2.0"`
- [ ] Запустить: `cd backend && uv sync`
- [ ] В `backend/config/settings/prod.py` добавить:
  ```python
  import sentry_sdk
  SENTRY_DSN = os.getenv("SENTRY_DSN", "")
  if SENTRY_DSN:
      sentry_sdk.init(
          dsn=SENTRY_DSN,
          integrations=[sentry_sdk.integrations.django.DjangoIntegration()],
          traces_sample_rate=0.1,
          send_default_pii=False,
      )
  ```
- [ ] В `.env.example` добавить `SENTRY_DSN=`

**Проверка**: `cd backend && uv run python -c "import sentry_sdk; print('OK')"`
**Коммит**: `feat: добавить Sentry SDK для мониторинга ошибок`

---

### 3.5 pg_backup management command

- [ ] Создать `backend/apps/core/management/commands/pg_backup.py`:
  ```python
  import os, subprocess, shutil
  from datetime import datetime
  from django.core.management.base import BaseCommand
  from django.conf import settings

  class Command(BaseCommand):
      help = "Создать pg_dump бэкап PostgreSQL базы данных"

      def add_arguments(self, parser):
          parser.add_argument("--output-dir", default="backups", help="Директория для бэкапа")

      def handle(self, *args, **options):
          if not shutil.which("pg_dump"):
              self.stderr.write("pg_dump не найден")
              return
          output_dir = options["output_dir"]
          os.makedirs(output_dir, exist_ok=True)
          timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
          filename = f"{output_dir}/backup_{timestamp}.sql.gz"
          db = settings.DATABASES["default"]
          env = os.environ.copy()
          env["PGPASSWORD"] = db.get("PASSWORD", "")
          cmd = [
              "pg_dump",
              "-h", db.get("HOST", "localhost"),
              "-p", str(db.get("PORT", 5432)),
              "-U", db.get("USER", ""),
              "-d", db.get("NAME", ""),
              "-Fc", "-Z9", "-f", filename,
          ]
          result = subprocess.run(cmd, env=env, capture_output=True)
          if result.returncode == 0:
              self.stdout.write(self.style.SUCCESS(f"Бэкап сохранён: {filename}"))
          else:
              self.stderr.write(f"Ошибка pg_dump: {result.stderr.decode()}")
  ```
- [ ] В `Makefile` добавить: `backup: cd backend && uv run python manage.py pg_backup`

**Проверка**: `cd backend && uv run python manage.py pg_backup --help`
**Коммит**: `feat: management command pg_backup для PostgreSQL`

---

### 3.6 Organization detail API endpoint

- [ ] В `backend/apps/organizations/serializers.py` добавить `OrganizationDetailSerializer`:
  ```python
  from apps.kitchens.serializers import KitchenSerializer
  from apps.accounts.serializers import UserSerializer

  class OrganizationDetailSerializer(serializers.ModelSerializer):
      """Детальный сериализатор для SUPER_ADMIN — включает вложенные данные."""
      kitchens = KitchenSerializer(many=True, read_only=True)
      users_count = serializers.IntegerField(source="user_count", read_only=True)
      kitchens_count = serializers.IntegerField(source="kitchen_count", read_only=True)
      products_count = serializers.SerializerMethodField()
      operations_count = serializers.SerializerMethodField()

      class Meta:
          model = Organization
          fields = "__all__"

      def get_products_count(self, obj):
          from apps.products.models import Product
          return Product.objects.filter(organization=obj).count()

      def get_operations_count(self, obj):
          from apps.operations.models import OperationEntry
          return OperationEntry.objects.filter(organization=obj).count()
  ```
- [ ] В `backend/apps/organizations/views.py` добавить action:
  ```python
  from rest_framework.decorators import action
  from rest_framework.response import Response
  from apps.core.permissions import IsSuperAdmin

  @action(detail=True, methods=["get"], permission_classes=[IsSuperAdmin])
  def detail_view(self, request, pk=None):
      org = self.get_object()
      serializer = OrganizationDetailSerializer(org, context={"request": request})
      return Response(serializer.data)
  ```
  URL будет: `GET /api/organizations/{id}/detail_view/`
- [ ] В `backend/tests/test_organizations.py` добавить:
  - `test_super_admin_can_get_org_detail` — → 200 с kitchens, users_count, products_count
  - `test_tenant_admin_cannot_get_org_detail` — → 403

**Проверка**: `cd backend && uv run pytest tests/test_organizations.py -v`
**Коммит**: `feat: добавить Organization detail API endpoint для SUPER_ADMIN`

---

### 3.7 Тесты для Phase 3

- [ ] В `backend/tests/test_commands.py` добавить:
  - `test_pg_backup_command_exists` — `call_command("pg_backup", "--help")` не бросает ошибку
  - `test_pg_backup_skips_without_pg_dump` — mock shutil.which → None, команда gracefully выходит
- [ ] В `backend/tests/test_organizations.py` — тесты из 3.6 уже добавлены выше
- [ ] Проверить что health check endpoint работает: GET /api/health/ → 200

**Проверка**: `cd backend && uv run pytest tests/test_commands.py tests/test_organizations.py -v`
**Коммит**: `test: тесты для pg_backup и org detail endpoint`

---

## Phase 4: Frontend Admin Panel

### 4.1 Типы для AuditLog и OrgDetail

- [ ] В `frontend/types.ts` добавить:
  ```typescript
  export interface AuditLogEntry {
    id: number;
    eventType: string;
    actor: number | null;
    actorName: string | null;
    organization: number | null;
    orgName: string | null;
    targetType: string;
    targetId: number;
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
    metadata: Record<string, unknown>;
    createdAt: string;
  }

  export interface OrganizationDetail extends Organization {
    kitchens: Kitchen[];
    usersCount: number;
    kitchensCount: number;
    productsCount: number;
    operationsCount: number;
  }
  ```

**Проверка**: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
**Коммит**: `feat(types): добавить AuditLogEntry и OrganizationDetail типы`

---

### 4.2 API сервисы для AuditLog и OrgDetail

- [ ] В `frontend/api/services/organizations.ts` добавить:
  ```typescript
  getDetail: (id: number) => api.get<OrganizationDetail>(`/organizations/${id}/detail_view/`),
  ```
- [ ] Создать `frontend/api/services/auditLogs.ts`:
  ```typescript
  import api from "../client";
  import type { AuditLogEntry } from "../../types";

  const auditLogsService = {
    getAll: (params?: {
      eventType?: string;
      organization?: number;
      ordering?: string;
      page?: number;
    }) => api.get<{ results: AuditLogEntry[]; count: number; next: string | null; previous: string | null }>(
      "/payments/audit-logs/",
      { params }
    ),
  };

  export default auditLogsService;
  ```

**Проверка**: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
**Коммит**: `feat: API сервисы для AuditLog и OrganizationDetail`

---

### 4.3 i18n ключи для admin panel

- [ ] В `frontend/context/LanguageContext.tsx` добавить ключи (en/ru/uz):
  ```
  admin.suspend: Suspend / Приостановить / To'xtatish
  admin.unsuspend: Activate / Активировать / Faollashtirish
  admin.suspend_confirm: Suspend this organization? / Приостановить организацию? / ...
  admin.org_detail: Organization Detail / Детали организации / ...
  admin.audit_log: Audit Log / Аудит-лог / ...
  admin.event_type: Event Type / Тип события / ...
  admin.actor: Actor / Инициатор / ...
  admin.target: Target / Объект / ...
  admin.old_value: Old / До / ...
  admin.new_value: New / После / ...
  admin.kitchens_tab: Kitchens / Кухни / ...
  admin.products_tab: Products / Продукты / ...
  admin.users_tab: Users / Пользователи / ...
  admin.payments_tab: Payments / Платежи / ...
  admin.edit_tab: Edit / Редактировать / ...
  admin.org_suspended: Organization is suspended / Организация приостановлена / ...
  ```

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat(i18n): добавить ключи для admin panel`

---

### 4.4 AdminLayout компонент

- [ ] Создать `frontend/components/AdminLayout.tsx`:
  ```tsx
  // Sidebar с навигацией для SUPER_ADMIN
  // Пункты: Organizations, Audit Log
  // Показывает активный маршрут через useLocation (HashRouter)
  // Использует CSS переменные для тёмного дизайна (bg-slate-950/800)
  // Паттерн навигации: <a href="#/admin/"> и <a href="#/admin/audit-log">
  ```
  Структура:
  - Sidebar с логотипом и пунктами меню
  - Content area (children)
  - Header с именем SUPER_ADMIN

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: создать AdminLayout компонент с sidebar`

---

### 4.5 Suspend/Unsuspend кнопка в AdminDashboard

- [ ] В `frontend/views/superadmin/AdminDashboard.tsx`:
  - Добавить `suspendOrg(id, status)` функцию вызывающую `organizationsService.update(id, {status})`
  - В таблице org добавить кнопку: если `ACTIVE` → кнопка "Suspend" (красный), если `SUSPENDED` → "Activate" (зелёный)
  - Перед действием показать `ConfirmModal`
  - После действия обновить список организаций
  - Показать статус `SUSPENDED` как badge (красный) в таблице

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: Suspend/Unsuspend кнопка в AdminDashboard`

---

### 4.6 Создать OrganizationDetail страницу

- [ ] Создать `frontend/views/superadmin/OrganizationDetail.tsx`:
  - Fetches `organizationsService.getDetail(id)` при монтировании
  - Показывает: org name, status badge, plan badge, contact info
  - Tabs: Info, Kitchens, Products, Users, Payments, Edit
  - Default tab: Info
  - Использует `AdminLayout`
  - Loading state с Skeleton

```tsx
// Структура компонента:
// OrganizationDetail
//   ├── AdminLayout
//   │   ├── Header (org name + status badge)
//   │   ├── Tab bar (Info | Kitchens | Products | Users | Payments | Edit)
//   │   └── Tab content (renders selected tab)
```

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: создать OrganizationDetail страницу (базовая структура + Info tab)`

---

### 4.7 OrganizationDetail — вкладки Kitchens и Products

- [ ] В `frontend/views/superadmin/OrganizationDetail.tsx` добавить вкладки:
  - **Kitchens tab**: таблица кухонь из `orgDetail.kitchens` (name, is_active)
  - **Products tab**: показать `orgDetail.productsCount` и ссылку на список (или загрузить через `productsService.getAll({organization: id})`)

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: OrganizationDetail — вкладки Kitchens и Products`

---

### 4.8 OrganizationDetail — вкладка Users

- [ ] В `frontend/views/superadmin/OrganizationDetail.tsx` вкладка Users:
  - Загрузить `usersService.getAll({organization: id})` — нужно добавить этот параметр в api
  - Показать таблицу пользователей (username, role, full_name)
  - Добавить/редактировать/удалить пользователей (переиспользовать паттерн из существующего AdminDashboard)

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: OrganizationDetail — вкладка Users`

---

### 4.9 OrganizationDetail — вкладка Payments

- [ ] В `frontend/views/superadmin/OrganizationDetail.tsx` вкладка Payments:
  - Загрузить ордера: `paymentsService.getOrders({organization: id})` — если такого параметра нет, добавить в сервис
  - Показать таблицу: дата, план, сумма, статус
  - Показать текущую подписку: `plan_expires_at`, план

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: OrganizationDetail — вкладка Payments`

---

### 4.10 OrganizationDetail — вкладка Edit

- [ ] В `frontend/views/superadmin/OrganizationDetail.tsx` вкладка Edit:
  - Форма с полями: name, contact_name, phone, email, address, plan (select), status (select), max_kitchens, max_users
  - Submit вызывает `organizationsService.update(id, data)`
  - После сохранения refresh данных

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: OrganizationDetail — вкладка Edit`

---

### 4.11 Добавить маршрут OrganizationDetail в App.tsx

- [ ] В `frontend/App.tsx`:
  - Импортировать `OrganizationDetail`
  - Добавить маршрут: `<SuperAdminRoute path="/admin/organizations/:id" component={OrganizationDetail} />`
  - (HashRouter: `<Route path="/admin/organizations/:id" element={<OrganizationDetail />} />` обёрнутый в `SuperAdminRoute`)
- [ ] В `frontend/views/superadmin/AdminDashboard.tsx`:
  - Сделать имя org кликабельным: `<a href={`#/admin/organizations/${org.id}`}>`

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: маршрут для OrganizationDetail + ссылки из AdminDashboard`

---

### 4.12 Обновить AdminDashboard с AdminLayout

- [ ] В `frontend/views/superadmin/AdminDashboard.tsx`:
  - Обернуть в `AdminLayout`
  - Убрать дублирующийся хедер если он конфликтует

**Проверка**: `cd frontend && npm run build`
**Коммит**: `refactor: AdminDashboard обёрнут в AdminLayout`

---

### 4.13 Создать AuditLog страницу

- [ ] Создать `frontend/views/superadmin/AuditLogPage.tsx`:
  - Использует `AdminLayout`
  - Таблица: timestamp, event_type badge, actor_name, org_name, target_type, target_id, diff (old→new)
  - Фильтры: event_type select, organization select, date range (от/до)
  - Pagination (next/prev + счётчик страниц)
  - Loading state

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: создать AuditLog страницу с таблицей и фильтрами`

---

### 4.14 Добавить маршрут AuditLog в App.tsx

- [ ] В `frontend/App.tsx` добавить: `<Route path="/admin/audit-log" element={<SuperAdminRoute component={AuditLogPage} />} />`
- [ ] AdminLayout sidebar уже ссылается на `#/admin/audit-log`

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: маршрут для AuditLog страницы`

---

## Phase 5: Integration & Polish

### 5.1 Frontend: обработка suspended org (403)

- [ ] В `frontend/api/client.ts` в response interceptor добавить обработку suspended 403:
  ```typescript
  // Если 403 и detail содержит "приостановлена" — показать suspended banner
  if (error.response?.status === 403 && error.response.data?.detail?.includes("приостановлена")) {
    // Установить флаг в localStorage/state
    localStorage.setItem("km_org_suspended", "true");
    window.location.hash = "#/suspended";
  }
  ```
- [ ] Создать простую `frontend/views/OrgSuspended.tsx`:
  - Показывает сообщение что org приостановлена
  - Кнопка выхода
- [ ] В `frontend/App.tsx` добавить маршрут `/suspended`

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: обработка suspended org 403 с redirect на holding page`

---

### 5.2 AdminDashboard метрики из API

- [ ] В `frontend/views/superadmin/AdminDashboard.tsx`:
  - Метрики уже используют данные от API (`organizations` array). Проверить что используются `kitchenCount`, `userCount` из аннотаций (бэкенд аннотирует эти поля)
  - Если нет — обновить calculation в Dashboard metrics card

**Проверка**: `cd frontend && npm run build`
**Коммит**: `fix: AdminDashboard метрики из аннотированных полей API`

---

### 5.3 Полный тест suite + регрессии

- [ ] Запустить: `cd backend && uv run pytest -v --tb=short 2>&1`
- [ ] Исправить все регрессии от изменений в middleware, soft delete, exception handler
- [ ] Ключевые области для проверки:
  - Soft delete: все существующие тесты что ожидают hard delete — обновить
  - Exception handler: тесты что проверяют формат ошибок — обновить на новый формат `{"error": {...}}`
  - Suspended middleware: не должно ломать существующие тесты (autouse fixture disable_throttling)

**Проверка**: `cd backend && uv run pytest -v` (все тесты GREEN)
**Коммит**: `test: исправить регрессии после V4 изменений`

---

### 5.4 Обновить CLAUDE.md

- [ ] В `CLAUDE.md` обновить:
  - В Django Apps: добавить `AuditLog` endpoint `/api/payments/audit-logs/`
  - В Multi-Tenancy: упомянуть SUSPENDED org блокировку в middleware
  - В Architecture: упомянуть SoftDeleteModel, custom exception handler, Redis caching
  - В Commands: добавить `uv run python manage.py pg_backup`
  - Добавить Frontend Admin Routes: `/admin/`, `/admin/organizations/:id`, `/admin/audit-log`, `/suspended`

**Проверка**: `cat CLAUDE.md | head -50`
**Коммит**: `docs: обновить CLAUDE.md для V4 изменений`

---

### 5.5 seed_data обновление

- [ ] В `backend/apps/core/management/commands/seed_data.py` добавить:
  - Создать одну org со статусом SUSPENDED для демо
  - Создать несколько AuditLog записей разных типов для демо

**Проверка**: `cd backend && uv run python manage.py seed_data --clear`
**Коммит**: `chore: обновить seed_data с SUSPENDED org и AuditLog примерами`

---

## ФИНАЛЬНАЯ ВЕРИФИКАЦИЯ

```bash
cd backend && uv run python manage.py check
cd backend && uv run python manage.py makemigrations --check
cd backend && uv run pytest -v --tb=short
cd frontend && npm run build
docker compose -f docker-compose.coolify.yml config
```

Если все проверки пройдены — написать: **ALL PHASES COMPLETE**
