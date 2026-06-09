# Marga Manager — Ralph Loop Task List (Audit V3)

## Запуск
```bash
ralph-loop:ralph-loop "Прочитай PROMPT.md (/Users/jakha/Programming/Django/marga-manager/PROMPT.md). Найди первую незавершённую задачу [ ]. Выполни её полностью — создай файлы, напиши код, запусти проверку (cd backend && uv run python manage.py check && uv run pytest -v для бэкенда, cd frontend && npm run build для фронтенда). Отметь [x] в PROMPT.md. Закоммить изменения. Повторяй до ALL PHASES COMPLETE." --max-iterations 70 --completion-promise "ALL PHASES COMPLETE" /compact /senior-qa /senior-backend /senior-frontend /frontend-design:frontend-design /server-advisor
```

---

## Контекст

Предыдущий цикл Audit V2 завершён (Phases 1-10). Этот цикл (V3) добавляет:
1. **Logging** — ноль логирования во всём проекте
2. **Audit Trail** — AuditLog для платёжных операций
3. **Tenant Security** — null-org дыра, cross-FK валидация, OrganizationMiddleware
4. **Celery + Redis** — фоновые задачи
5. **Subscription** — plan_expires_at, grace period 7 дней, in-app баннер
6. **Тесты** — edge cases, management commands, tenant isolation

---

## Порядок выполнения

1. Phase 1 — Logging Infrastructure (фундамент)
2. Phase 2 — Tenant Security Fixes (критические баги)
3. Phase 3 — Payment Audit Trail (AuditLog)
4. Phase 4 — Celery Setup (инфраструктура)
5. Phase 5 — Subscription Model (бизнес-логика)
6. Phase 6 — Tests: Payment Edge Cases
7. Phase 7 — Tests: Tenant Isolation
8. Phase 8 — Business Logic Documentation
9. Phase 9 — Update CLAUDE.md

---

## Phase 1: Logging Infrastructure

**Почему первым**: ноль логирования в проде — критично. Все последующие фазы выиграют от логирования.

### 1.1 LOGGING dict в base.py

- [x] В `backend/config/settings/base.py` добавить в конец (после PAYME settings):

```python
# Logging
_LOGS_DIR = BASE_DIR / "logs"
_LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name} {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOGS_DIR / "marga.log"),
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
        },
    },
    "root": {"level": "WARNING", "handlers": ["console"]},
    "loggers": {
        "django": {"handlers": ["console", "file"], "level": "WARNING", "propagate": False},
        "django.request": {"handlers": ["console", "file"], "level": "ERROR", "propagate": False},
        "apps.payments": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},
        "apps.accounts": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},
        "apps.core": {"handlers": ["console", "file"], "level": "INFO", "propagate": False},
        "apps.operations": {"handlers": ["console", "file"], "level": "WARNING", "propagate": False},
        "apps.organizations": {"handlers": ["console", "file"], "level": "WARNING", "propagate": False},
    },
}
```

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `chore: добавить LOGGING конфигурацию в settings`

---

### 1.2 Logging в PaymeWebhookView

- [x] В `backend/apps/payments/payme_views.py` добавить в начало (после импортов):
  ```python
  import logging
  logger = logging.getLogger("apps.payments")
  ```
- [x] В методе `post()` при ошибке авторизации добавить: `logger.warning("Payme auth failed ip=%s", request.META.get("REMOTE_ADDR"))`
- [x] В `_checkPerformTransaction()`: INFO в начале, WARNING при ошибках (not found, wrong amount)
- [x] В `_createTransaction()`: INFO создание/идемпотентность, WARNING при таймауте
- [x] В `_performTransaction()`: INFO успех
- [x] В `_cancelTransaction()`: INFO отмена с state и reason
- [x] В `_getStatement()`: DEBUG

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest tests/test_payments.py -v`
**Коммит**: `feat: добавить logging в PaymeWebhookView`

---

### 1.3 Logging в payment models

- [x] В `backend/apps/payments/models.py` добавить в начало: `import logging` и `logger = logging.getLogger("apps.payments")`
- [x] В `Order.mark_as_paid()`: `logger.info("Order #%s paid: org=%s plan %s->%s", self.id, self.organization_id, self.previous_plan, self.target_plan)`
- [x] В `Order.revert_plan()`: `logger.info("Order #%s reverted: org=%s plan %s->%s", self.id, self.organization_id, self.target_plan, self.previous_plan)`
- [x] В `Order.cancel()`: `logger.info("Order #%s cancelled: org=%s", self.id, self.organization_id)`

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest tests/test_payments.py -v`
**Коммит**: `feat: добавить logging в payment models`

---

### 1.4 Logging в accounts views

- [x] В `backend/apps/accounts/views.py` добавить: `import logging` и `logger = logging.getLogger("apps.accounts")`
- [x] В `CustomTokenObtainPairView` переопределить `post()`: логировать успешный логин (INFO) и неудачный (WARNING) с `username` и IP
- [x] В `UserViewSet.perform_create()`: `logger.info("User created: %s by %s", instance.username, self.request.user.username)` — определить где вызывается save
- [x] В `UserViewSet.perform_destroy()`: `logger.info("User deleted: id=%s by %s", instance.id, self.request.user.username)`

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest tests/test_auth.py -v`
**Коммит**: `feat: добавить logging в accounts views`

---

### 1.5 Logging в TenantQuerySetMixin

- [x] В `backend/apps/core/mixins.py` добавить: `import logging` и `logger = logging.getLogger("apps.core")`
- [x] В `TenantQuerySetMixin.get_queryset()` — если non-SUPER_ADMIN и `user.organization is None`: `logger.warning("user %s has no org, returning qs.none()", user.id)`
- [x] В `TenantCreateMixin.perform_create()` на последнем else — `logger.warning("user %s has no org, saving without organization", user.id)`

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v`
**Коммит**: `feat: добавить logging в TenantQuerySetMixin/CreateMixin`

---

## Phase 2: Tenant Security Fixes

**Почему вторым**: активные дыры безопасности. Null-org пользователь видит все данные.

### 2.1 Фикс _get_tenant_qs() — null-org баг

- [x] В `backend/apps/operations/views.py` функция `_get_tenant_qs(user)` (строки 206-211):

  **Заменить**:
  ```python
  def _get_tenant_qs(user):
      qs = OperationEntry.objects.all()
      if user.role != "SUPER_ADMIN" and user.organization:
          qs = qs.filter(organization=user.organization)
      return qs
  ```
  **На**:
  ```python
  def _get_tenant_qs(user):
      from rest_framework.exceptions import PermissionDenied
      qs = OperationEntry.objects.all()
      if user.role == "SUPER_ADMIN":
          return qs
      if not user.organization:
          raise PermissionDenied("Пользователь не привязан к организации.")
      return qs.filter(organization=user.organization)
  ```

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest tests/test_analytics.py -v`
**Коммит**: `fix(security): null-org дыра в _get_tenant_qs — raise PermissionDenied`

---

### 2.2 Фикс DashboardView и ProductHistoryView

- [x] В `backend/apps/operations/views.py` в `DashboardView.get()` найти inline tenant filter (паттерн `if user.role != "SUPER_ADMIN" and user.organization:`). Заменить на:
  ```python
  if user.role != "SUPER_ADMIN":
      if not user.organization:
          from rest_framework.exceptions import PermissionDenied
          raise PermissionDenied("Пользователь не привязан к организации.")
      qs = qs.filter(organization=user.organization)
  ```
- [x] Применить ту же замену в `ProductHistoryView.get()` если там есть inline tenant filtering

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest tests/test_analytics.py -v`
**Коммит**: `fix(security): null-org дыра в DashboardView и ProductHistoryView`

---

### 2.3 Guard в TenantQuerySetMixin

- [x] В `backend/apps/core/mixins.py` строки 23-25:

  **Заменить**:
  ```python
  if hasattr(qs.model, "organization"):
      return qs.filter(organization=user.organization)
  ```
  **На**:
  ```python
  if hasattr(qs.model, "organization"):
      if not user.organization:
          return qs.none()
      return qs.filter(organization=user.organization)
  ```

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v`
**Коммит**: `fix(security): TenantQuerySetMixin возвращает qs.none() для пользователей без организации`

---

### 2.4 Cross-FK валидация в OperationEntrySerializer

- [x] В `backend/apps/operations/serializers.py` в методе `validate(self, data)` добавить в конец (перед `return data`):
  ```python
  user = self.context["request"].user
  if user.role != "SUPER_ADMIN" and user.organization:
      kitchen = data.get("kitchen")
      if kitchen and kitchen.organization_id != user.organization_id:
          raise serializers.ValidationError({"kitchen": "Кухня принадлежит другой организации."})
      to_kitchen = data.get("to_kitchen")
      if to_kitchen and to_kitchen.organization_id != user.organization_id:
          raise serializers.ValidationError({"to_kitchen": "Кухня назначения принадлежит другой организации."})
      product = data.get("product")
      if product and product.organization_id != user.organization_id:
          raise serializers.ValidationError({"product": "Продукт принадлежит другой организации."})
  ```

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest tests/test_operations.py -v`
**Коммит**: `fix(security): cross-FK валидация в OperationEntrySerializer`

---

### 2.5 Реализовать OrganizationMiddleware

- [x] В `backend/apps/core/middleware.py` (текущий файл — заглушка) заменить содержимое на:
  ```python
  class OrganizationMiddleware:
      """Устанавливает request.organization из user.organization."""

      def __init__(self, get_response):
          self.get_response = get_response

      def __call__(self, request):
          request.organization = None
          response = self.get_response(request)
          return response

      def process_view(self, request, view_func, view_args, view_kwargs):
          if hasattr(request, "user") and request.user.is_authenticated:
              request.organization = getattr(request.user, "organization", None)
          return None
  ```
- [x] В `backend/config/settings/base.py` в MIDDLEWARE после `"django.contrib.auth.middleware.AuthenticationMiddleware"` добавить: `"apps.core.middleware.OrganizationMiddleware",`

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v`
**Коммит**: `feat: реализовать OrganizationMiddleware`

---

### 2.6 Тесты на tenant security фиксы

- [x] В `backend/tests/test_analytics.py` добавить класс `TestNullOrgUserBlocked` с тестами:
  - пользователь role=KITCHEN_USER, organization=None → GET /api/analytics/dashboard/ → 403
  - пользователь role=TENANT_ADMIN, organization=None → GET /api/analytics/kitchen-report/ → 403
  - пользователь role=TENANT_ADMIN, organization=None → GET /api/analytics/operations-summary/ → 403

- [x] В `backend/tests/test_operations.py` добавить класс `TestCrossFKValidation` с тестами:
  - POST /api/operations/ с kitchen из другой org → 400 с ошибкой "kitchen"
  - POST /api/operations/ с product из другой org → 400 с ошибкой "product"

**Проверка**: `cd backend && uv run pytest tests/test_analytics.py tests/test_operations.py -v`
**Коммит**: `test: тесты на null-org блокировку и cross-FK валидацию`

---

## Phase 3: Payment Audit Trail

### 3.1 AuditLog модель

- [x] В `backend/apps/payments/models.py` в конец файла добавить модель:
  ```python
  class AuditLog(TimeStampedModel):
      class EventType(models.TextChoices):
          ORDER_STATE_CHANGE = "ORDER_STATE_CHANGE", "Изменение статуса заказа"
          TXN_STATE_CHANGE = "TXN_STATE_CHANGE", "Изменение статуса транзакции"
          PLAN_CHANGE = "PLAN_CHANGE", "Смена плана"
          PLAN_REVERT = "PLAN_REVERT", "Откат плана"

      event_type = models.CharField(max_length=50, choices=EventType.choices)
      actor = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
      organization = models.ForeignKey("organizations.Organization", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
      target_type = models.CharField(max_length=50)
      target_id = models.BigIntegerField()
      old_value = models.JSONField(default=dict)
      new_value = models.JSONField(default=dict)
      metadata = models.JSONField(default=dict, blank=True)

      class Meta:
          verbose_name = "Аудит-лог"
          verbose_name_plural = "Аудит-логи"
          ordering = ["-created_at"]
          indexes = [
              models.Index(fields=["event_type", "created_at"]),
              models.Index(fields=["organization", "created_at"]),
          ]

      def __str__(self):
          return f"AuditLog [{self.event_type}] {self.target_type}#{self.target_id}"
  ```
- [x] Запустить: `cd backend && uv run python manage.py makemigrations payments`

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: создать модель AuditLog`

---

### 3.2 AuditLog в Order.mark_as_paid()

- [x] В `backend/apps/payments/models.py` в методе `Order.mark_as_paid()` после `org.save(...)` добавить:
  ```python
  AuditLog.objects.create(
      event_type=AuditLog.EventType.ORDER_STATE_CHANGE,
      organization=self.organization,
      target_type="Order", target_id=self.id,
      old_value={"status": "PENDING_OR_PAYING"},
      new_value={"status": self.Status.PAID},
      metadata={"amount": self.amount},
  )
  AuditLog.objects.create(
      event_type=AuditLog.EventType.PLAN_CHANGE,
      organization=self.organization,
      target_type="Organization", target_id=self.organization_id,
      old_value={"plan": self.previous_plan},
      new_value={"plan": self.target_plan},
      metadata={"order_id": self.id},
  )
  ```

**Проверка**: `cd backend && uv run pytest tests/test_payments.py -v`
**Коммит**: `feat: AuditLog в Order.mark_as_paid`

---

### 3.3 AuditLog в Order.cancel() и revert_plan()

- [x] В `Order.cancel()` после `self.save(...)`:
  ```python
  AuditLog.objects.create(...)
  ```
- [x] В `Order.revert_plan()` после `org.save(...)`:
  ```python
  AuditLog.objects.create(...)
  ```

**Проверка**: `cd backend && uv run pytest tests/test_payments.py -v`
**Коммит**: `feat: AuditLog в Order.cancel и revert_plan`

---

### 3.4 AuditLog в PaymeWebhookView

- [x] В `backend/apps/payments/payme_views.py` в `_createTransaction()` после создания `PaymeTransaction`:
  ```python
  from apps.payments.models import AuditLog
  AuditLog.objects.create(
      event_type=AuditLog.EventType.TXN_STATE_CHANGE,
      organization=order.organization,
      target_type="PaymeTransaction", target_id=txn.id,
      old_value={}, new_value={"state": 1, "payme_id": payme_id},
      metadata={"order_id": order.id},
  )
  ```
- [x] В `_performTransaction()` после `order.mark_as_paid()`:
  ```python
  AuditLog.objects.create(
      event_type=AuditLog.EventType.TXN_STATE_CHANGE,
      organization=order.organization,
      target_type="PaymeTransaction", target_id=txn.id,
      old_value={"state": 1}, new_value={"state": 2},
      metadata={"payme_id": txn.payme_id},
  )
  ```
- [x] В `_cancelTransaction()` после отмены — AuditLog с new_state (-1 или -2) и reason

**Проверка**: `cd backend && uv run pytest tests/test_payments.py -v`
**Коммит**: `feat: AuditLog в PaymeWebhookView`

---

### 3.5 AuditLog в Django Admin

- [x] В `backend/apps/payments/admin.py` добавить:
  ```python
  from apps.payments.models import AuditLog

  @admin.register(AuditLog)
  class AuditLogAdmin(ModelAdmin):
      list_display = ["event_type", "target_type", "target_id", "organization", "created_at"]
      list_filter = ["event_type", "created_at"]
      search_fields = ["organization__name"]
      readonly_fields = ["event_type", "actor", "organization", "target_type", "target_id",
                         "old_value", "new_value", "metadata", "created_at"]
      date_hierarchy = "created_at"

      def has_add_permission(self, request): return False
      def has_change_permission(self, request, obj=None): return False
  ```

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: AuditLog в Django Admin`

---

### 3.6 Тесты для AuditLog

- [ ] В `backend/tests/test_payments.py` добавить `TestAuditTrail`:
  - `test_mark_as_paid_creates_order_and_plan_audit_logs` — проверить что ORDER_STATE_CHANGE и PLAN_CHANGE созданы
  - `test_cancel_creates_audit_log` — проверить ORDER_STATE_CHANGE
  - `test_revert_plan_creates_plan_revert_audit_log` — проверить PLAN_REVERT
  - `test_payme_perform_creates_txn_audit_log` — через webhook PerformTransaction, проверить TXN_STATE_CHANGE

**Проверка**: `cd backend && uv run pytest tests/test_payments.py -v -k "AuditTrail"`
**Коммит**: `test: тесты для AuditLog audit trail`

---

## Phase 4: Celery Setup

### 4.1 Зависимости

- [ ] В `backend/pyproject.toml` в dependencies добавить: `"celery>=5.4"`, `"redis>=5.0"`, `"django-celery-beat>=2.7"`
- [ ] Запустить: `cd backend && uv sync`

**Проверка**: `cd backend && uv run python -c "import celery; print(celery.__version__)"`
**Коммит**: `chore: добавить celery, redis, django-celery-beat`

---

### 4.2 Создать config/celery.py

- [ ] Создать `backend/config/celery.py`:
  ```python
  import os
  from celery import Celery

  os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
  app = Celery("marga_manager")
  app.config_from_object("django.conf:settings", namespace="CELERY")
  app.autodiscover_tasks()
  ```
- [ ] В `backend/config/__init__.py` добавить:
  ```python
  from .celery import app as celery_app
  __all__ = ("celery_app",)
  ```

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: создать config/celery.py`

---

### 4.3 Celery настройки в settings

- [ ] В `backend/config/settings/base.py`:
  - В `INSTALLED_APPS` добавить `"django_celery_beat"`
  - После LOGGING добавить:
    ```python
    # Celery
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    CELERY_ACCEPT_CONTENT = ["json"]
    CELERY_TASK_SERIALIZER = "json"
    CELERY_TIMEZONE = TIME_ZONE

    from celery.schedules import crontab
    CELERY_BEAT_SCHEDULE = {
        "expire-stale-orders": {
            "task": "apps.payments.tasks.expire_stale_orders_task",
            "schedule": crontab(minute=0),
        },
        "check-expiring-subscriptions": {
            "task": "apps.payments.tasks.check_expiring_subscriptions_task",
            "schedule": crontab(minute=0, hour=9),
        },
        "downgrade-expired-subscriptions": {
            "task": "apps.payments.tasks.downgrade_expired_subscriptions_task",
            "schedule": crontab(minute=0, hour=0),
        },
    }
    ```
- [ ] Запустить: `cd backend && uv run python manage.py migrate`

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: Celery настройки и CELERY_BEAT_SCHEDULE в base.py`

---

### 4.4 Создать apps/payments/tasks.py

- [ ] Создать `backend/apps/payments/tasks.py` со следующими задачами:

  **expire_stale_orders_task** (hourly):
  ```python
  @shared_task(name="apps.payments.tasks.expire_stale_orders_task")
  def expire_stale_orders_task():
      from django.utils import timezone
      from apps.payments.models import Order, PaymeTransaction
      cutoff = timezone.now() - timezone.timedelta(milliseconds=PaymeTransaction.PAYME_TIMEOUT_MS)
      updated = Order.objects.filter(
          status__in=[Order.Status.PENDING, Order.Status.PAYING],
          created_at__lt=cutoff,
      ).update(status=Order.Status.EXPIRED)
      if updated:
          logger.info("Expired %d stale orders", updated)
      return {"expired": updated}
  ```

  **check_expiring_subscriptions_task** (daily 09:00):
  ```python
  @shared_task(name="apps.payments.tasks.check_expiring_subscriptions_task")
  def check_expiring_subscriptions_task():
      from django.utils import timezone
      from apps.organizations.models import Organization
      threshold = timezone.now() + timezone.timedelta(days=3)
      expiring = Organization.objects.filter(
          plan_expires_at__isnull=False,
          plan_expires_at__lte=threshold,
          plan_expires_at__gt=timezone.now(),
      ).exclude(plan="BASIC")
      for org in expiring:
          logger.warning("Subscription expiring: org=%s expires=%s", org.id, org.plan_expires_at)
      return {"expiring_soon": expiring.count()}
  ```

  **downgrade_expired_subscriptions_task** (daily 00:00):
  - Найти организации где `plan_expires_at < now - 7 days` и plan != BASIC
  - Даунгрейдить на BASIC (plan, max_kitchens, max_users из PlanConfig, mrr=0, plan_expires_at=None)
  - Создать AuditLog с PLAN_REVERT и reason="subscription_expired_grace_period"
  - Логировать каждый даунгрейд

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: создать apps/payments/tasks.py с Celery задачами`

---

### 4.5 Redis и Celery в docker-compose.coolify.yml

- [ ] В `docker-compose.coolify.yml` добавить сервисы (redis, celery-worker, celery-beat):
  - **redis**: `image: redis:7-alpine`, volume `redis_data:/data`
  - **celery-worker**: тот же build что backend, `command: celery -A config worker -l info --concurrency=2`, зависит от db и redis
  - **celery-beat**: `command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler`
  - Оба Celery сервиса получают `CELERY_BROKER_URL=redis://redis:6379/0`
- [ ] В volumes добавить `redis_data:`
- [ ] В `.env.example` добавить `CELERY_BROKER_URL=redis://redis:6379/0`

**Проверка**: `docker compose -f docker-compose.coolify.yml config`
**Коммит**: `feat: добавить Redis и Celery в docker-compose.coolify.yml`

---

## Phase 5: Subscription Model

### 5.1 Поля plan_started_at и plan_expires_at на Organization

- [ ] В `backend/apps/organizations/models.py` добавить поля (после `mrr`):
  ```python
  plan_started_at = models.DateTimeField(null=True, blank=True, verbose_name="Подписка начата")
  plan_expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Подписка истекает")
  ```
- [ ] В `backend/apps/organizations/serializers.py` добавить `"plan_started_at"` и `"plan_expires_at"` в fields (read_only)
- [ ] Запустить: `cd backend && uv run python manage.py makemigrations organizations`

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: добавить plan_started_at и plan_expires_at на Organization`

---

### 5.2 Модель Subscription

- [ ] В `backend/apps/payments/models.py` добавить модель (после AuditLog):
  ```python
  class Subscription(TimeStampedModel):
      class Status(models.TextChoices):
          ACTIVE = "ACTIVE", "Активна"
          EXPIRED = "EXPIRED", "Истекла"
          CANCELLED = "CANCELLED", "Отменена"

      organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="subscriptions")
      plan = models.CharField(max_length=20, choices=Order.Plan.choices)
      amount = models.BigIntegerField(verbose_name="Сумма (тийин)")
      started_at = models.DateTimeField()
      expires_at = models.DateTimeField()
      order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name="subscriptions")
      status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

      class Meta:
          verbose_name = "Подписка"
          verbose_name_plural = "Подписки"
          ordering = ["-started_at"]

      def __str__(self):
          return f"Subscription [{self.organization}] {self.plan} {self.started_at:%Y-%m-%d}"
  ```
- [ ] Запустить: `cd backend && uv run python manage.py makemigrations payments`

**Проверка**: `cd backend && uv run python manage.py check`
**Коммит**: `feat: создать модель Subscription`

---

### 5.3 Wire mark_as_paid → Subscription + plan_expires_at

- [ ] В `backend/apps/payments/models.py` в `Order.mark_as_paid()` после `org.save(...)` добавить:
  ```python
  from django.utils import timezone as _tz
  _now = _tz.now()
  _expires = _now + _tz.timedelta(days=30)
  org.plan_started_at = _now
  org.plan_expires_at = _expires
  org.save(update_fields=["plan_started_at", "plan_expires_at", "updated_at"])

  Subscription.objects.create(
      organization=org,
      plan=self.target_plan,
      amount=self.amount,
      started_at=_now,
      expires_at=_expires,
      order=self,
      status=Subscription.Status.ACTIVE,
  )
  ```

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest tests/test_payments.py -v`
**Коммит**: `feat: mark_as_paid создаёт Subscription и устанавливает plan_expires_at`

---

### 5.4 Subscription в Admin и API

- [ ] В `backend/apps/payments/admin.py` зарегистрировать Subscription (list_display, list_filter, readonly_fields)
- [ ] В `backend/apps/payments/serializers.py` добавить `SubscriptionSerializer` (все поля read_only)
- [ ] В `backend/apps/payments/views.py` добавить `SubscriptionListView(TenantQuerySetMixin, ListAPIView)` с `permission_classes = [IsTenantAdmin]`
- [ ] В `backend/apps/payments/urls.py` добавить: `path("payments/subscriptions/", SubscriptionListView.as_view(), name="subscription-list")`

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v`
**Коммит**: `feat: Subscription admin, serializer и API`

---

### 5.5 Frontend: expiry banner

- [ ] В `frontend/types.ts` в интерфейс Organization добавить: `planStartedAt: string | null` и `planExpiresAt: string | null`
- [ ] В `frontend/context/LanguageContext.tsx` добавить переводы (en/ru/uz):
  - `subscription_expiring_soon`: "Your plan expires on {date}. Renew now." / "Ваш план истекает {date}." / "Obunangiz {date} tugaydi."
  - `subscription_expired`: "Your plan has expired. Renew now." / "Ваш план истёк." / "Obunangiz tugagan."
  - `renew_now`: "Renew" / "Продлить" / "Yangilash"
- [ ] В `frontend/components/Layout.tsx` (основной layout, виден на всех страницах) добавить expiry баннер:
  - Если `planExpiresAt` в течение 7 дней → жёлтый баннер
  - Если `planExpiresAt` прошло → красный баннер
  - Баннер со ссылкой `href="#/settings"` для оплаты
  - Не показывать для BASIC плана (бесплатный, нет expiry)

**Проверка**: `cd frontend && npm run build`
**Коммит**: `feat: in-app баннер об истечении подписки`

---

### 5.6 Тесты для Subscription

- [ ] В `backend/tests/test_payments.py` добавить `TestSubscriptionLogic`:
  - `test_mark_as_paid_creates_subscription` — проверить что Subscription создана
  - `test_mark_as_paid_sets_plan_expires_at` — org.plan_expires_at не None
  - `test_downgrade_task_downgrades_after_7_day_grace` — org с plan_expires_at = now - 8 days → даунгрейд на BASIC
  - `test_downgrade_task_respects_grace_period` — org с plan_expires_at = now - 3 days → НЕ даунгрейд
  - `test_check_expiring_task_finds_orgs` — org с plan_expires_at = now + 2 days → задача логирует

**Проверка**: `cd backend && uv run pytest tests/test_payments.py -v -k "Subscription"`
**Коммит**: `test: тесты для Subscription логики и Celery задач`

---

## Phase 6: Tests — Payment Edge Cases

### 6.1 Malformed JSON webhook

- [ ] В `backend/tests/test_payments.py` добавить `TestPaymeWebhookEdgeCases`:
  - POST с невалидным JSON → response код Payme PARSE_ERROR (-32700)
  - POST с отсутствующим полем method → ошибка
  - POST с неизвестным method → ошибка METHOD_NOT_FOUND
  - POST с пустым телом → ошибка
  - Убедиться что `payme_auth_headers` fixture существует в conftest.py (если нет — добавить)

**Проверка**: `cd backend && uv run pytest tests/test_payments.py -v -k "WebhookEdgeCases"`
**Коммит**: `test: malformed JSON и неизвестные методы в Payme webhook`

---

### 6.2 Тесты management commands

- [ ] Создать `backend/tests/test_commands.py`:
  - `test_expire_stale_orders_marks_old_orders` — создать Order с created_at = 13 часов назад, запустить команду, проверить EXPIRED
  - `test_expire_stale_orders_leaves_recent_orders` — недавний Order остаётся PENDING
  - `test_seed_data_runs_without_error` — `call_command("seed_data", "--clear")`
  - `test_create_test_orders_runs` — `call_command("create_test_orders", org.slug)`

**Проверка**: `cd backend && uv run pytest tests/test_commands.py -v`
**Коммит**: `test: тесты для management commands`

---

### 6.3 Дополнительные model tests

- [ ] В `backend/tests/test_payments.py` добавить `TestPaymeTransactionEdgeCases`:
  - `test_is_timed_out_exactly_at_boundary` — транзакция созданная ровно 12ч назад — timeout
  - `test_is_timed_out_false_for_performed` — STATE_PERFORMED транзакция не timed_out даже если старая

- [ ] В `backend/tests/test_organizations.py` добавить `TestOrganizationLimits`:
  - `test_can_add_kitchen_true_when_below_limit`
  - `test_can_add_kitchen_false_when_at_limit` — создать max_kitchens кухонь, проверить can_add_kitchen() == False
  - `test_can_add_user_true_when_below_limit`
  - `test_can_add_user_false_when_at_limit`

  Note: если методы `can_add_kitchen()` и `can_add_user()` не существуют на модели Organization — добавить их:
  ```python
  def can_add_kitchen(self) -> bool:
      return self.kitchens.filter(is_active=True).count() < self.max_kitchens

  def can_add_user(self) -> bool:
      return self.users.count() < self.max_users
  ```

**Проверка**: `cd backend && uv run pytest tests/test_payments.py tests/test_organizations.py -v`
**Коммит**: `test: edge cases для PaymeTransaction и Organization limits`

---

## Phase 7: Tests — Tenant Isolation

### 7.1 Null-org user blocked в analytics

- [ ] В `backend/tests/test_analytics.py` добавить `TestNullOrgUserBlocked` (если не добавлен в Phase 2.6):
  - Создать пользователя без org (organization=None), authenticated
  - Проверить 403 на: /api/analytics/dashboard/, /api/analytics/kitchen-report/, /api/analytics/operations-summary/

- [ ] Добавить тест: пользователь без org → GET /api/operations/ → пустой queryset (200 + empty list)

**Проверка**: `cd backend && uv run pytest tests/test_analytics.py -v`
**Коммит**: `test: null-org пользователи заблокированы в analytics`

---

### 7.2 Cross-FK isolation tests

- [ ] В `backend/tests/test_operations.py` добавить `TestCrossFKIsolation` (если не добавлен в Phase 2.6):
  - POST /api/operations/ с kitchen_id из другой org → 400
  - POST /api/operations/ с product_id из другой org → 400
  - SUPER_ADMIN может создавать операции с любым org (если это желаемое поведение — проверить и задокументировать)

**Проверка**: `cd backend && uv run pytest tests/test_operations.py -v`
**Коммит**: `test: cross-FK изоляция в операциях`

---

### 7.3 Analytics isolation

- [ ] В `backend/tests/test_analytics.py` добавить `TestAnalyticsIsolation`:
  - tenant_admin из org1 видит только свои данные в dashboard (не видит операции org2)
  - product-history для product из другой org → 404 или пустые данные
  - kitchen-report с kitchen_id из другой org → пустые данные в отчёте

**Проверка**: `cd backend && uv run pytest tests/test_analytics.py -v`
**Коммит**: `test: изоляция данных в analytics views`

---

## Phase 8: Business Logic Documentation

### 8.1 docs/payment-flow.md

- [ ] Создать директорию `docs/` в корне проекта если не существует
- [ ] Создать `docs/payment-flow.md` с:
  1. Mermaid stateDiagram для Order: PENDING → PAYING → PAID / EXPIRED / CANCELLED
  2. Mermaid stateDiagram для PaymeTransaction: 1 (created) → 2 / -1 / -2
  3. Описание 6 методов Payme webhook (CheckPerform, Create, Perform, Cancel, Check, GetStatement)
  4. Timeout logic: 12h = 43_200_000ms
  5. Idempotency rules (CreateTransaction с тем же payme_id)
  6. Что происходит при CancelTransaction после Perform (revert_plan)

**Проверка**: файл существует
**Коммит**: `docs: payment-flow.md с диаграммами`

---

### 8.2 docs/tenant-isolation.md

- [ ] Создать `docs/tenant-isolation.md` с:
  1. Shared-database shared-schema подход
  2. Три слоя: OrganizationMiddleware (request.organization), TenantQuerySetMixin (queryset), Permission classes
  3. SUPER_ADMIN bypass — видит всё
  4. Null-org пользователи — что происходит (теперь PermissionDenied в analytics, qs.none() в CRUD)
  5. Cross-FK валидация в serializers
  6. Как добавить новый tenant-aware ViewSet

**Проверка**: файл существует
**Коммит**: `docs: tenant-isolation.md`

---

### 8.3 docs/subscription-lifecycle.md

- [ ] Создать `docs/subscription-lifecycle.md` с:
  1. Flow: создание Order → Payme checkout → mark_as_paid → Subscription created + plan_expires_at
  2. Expiry checking: check_expiring_subscriptions_task (daily 09:00, за 3 дня)
  3. Grace period: 7 дней
  4. Downgrade: downgrade_expired_subscriptions_task (daily 00:00)
  5. Frontend: in-app banner за 7 дней и после истечения
  6. Renewal: новый Order → оплата → новый Subscription, extends expires_at

**Проверка**: файл существует
**Коммит**: `docs: subscription-lifecycle.md`

---

## Phase 9: Update CLAUDE.md

### 9.1 Обновить CLAUDE.md

- [ ] В `CLAUDE.md` обновить:
  1. Таблица Django Apps: в строке payments добавить `AuditLog, Subscription` к моделям
  2. Добавить секцию **Celery** после Commands:
     ```
     ### Celery (Background Tasks)
     - Worker: `cd backend && celery -A config worker -l info`
     - Beat: `cd backend && celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler`
     - Tasks: expire_stale_orders_task (hourly), check_expiring_subscriptions_task (09:00 daily), downgrade_expired_subscriptions_task (00:00 daily)
     - Broker: Redis via CELERY_BROKER_URL
     ```
  3. В Architecture section: OrganizationMiddleware теперь реализован (не stub), устанавливает `request.organization`
  4. Добавить под **Multi-Tenancy**:
     - Cross-FK validation в OperationEntrySerializer (kitchen/product/to_kitchen из той же org)
     - Null-org users blocked: PermissionDenied в analytics, qs.none() в CRUD
  5. Добавить секцию **Subscription & Billing**:
     - plan_expires_at на Organization (30 дней с момента оплаты)
     - Grace period: 7 дней
     - AuditLog: трекинг всех state changes в payments

**Проверка**: `cat CLAUDE.md | grep -i celery`
**Коммит**: `docs: обновить CLAUDE.md — Celery, AuditLog, Subscription, tenant isolation`

---

## ФИНАЛЬНАЯ ВЕРИФИКАЦИЯ

После всех фаз запустить:

```bash
cd backend && uv run python manage.py check
cd backend && uv run python manage.py makemigrations --check
cd backend && uv run pytest -v --tb=short
cd frontend && npm run build
docker compose -f docker-compose.coolify.yml config
```

Если все проверки пройдены — написать: **ALL PHASES COMPLETE**
