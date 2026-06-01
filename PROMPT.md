# Marga Manager — Task List for ralph-loop

Инструкция: прочитай этот файл. Найди первый `[ ]`. Выполни задачу полностью — создай файлы, напиши код, запусти проверку. Отметь `[x]`. Закоммить. Повторяй до `ALL PHASES COMPLETE`.

Проверка после каждой фазы:
- Backend: `cd /Users/jakha/Programming/Django/marga-manager/backend && uv run python manage.py check`
- Frontend: `cd /Users/jakha/Programming/Django/marga-manager/frontend && npm run build`

---

## Phase 0 — Fix Critical Project Issues

### 0.1 [x] Восстановить удалённые `__init__.py` файлы

Файлы были случайно удалены. Без них Django не может импортировать модули.

**Создай пустые файлы:**
- `backend/apps/__init__.py`
- `backend/config/__init__.py`
- `backend/tests/__init__.py`

Команда проверки: `cd backend && uv run python manage.py check`
Коммит: `fix: restore deleted __init__.py files in apps, config, tests`

---

### 0.2 [x] Добавить незакоммиченный health check view и связанные файлы

Файл `backend/apps/core/views.py` существует (незакоммичен) и нужен для `config/urls.py`.

**Действия:**
1. Убедись что `backend/apps/core/views.py` существует и содержит `health_check` функцию
2. Исправь утечку информации — вместо `str(e)` в ответе при ошибке БД верни `{"status": "error", "database": "unavailable"}` (без деталей исключения)

Пример правильного `health_check` в `backend/apps/core/views.py`:
```python
import json
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return JsonResponse({"status": "ok"})
    except Exception:
        return JsonResponse({"status": "error", "database": "unavailable"}, status=503)
```

Также убедись что `.github/workflows/ci-cd.yml`, `docker-compose.coolify.yml`, `docker/backend/entrypoint.sh` — все незакоммиченные изменения добавлены в git.

Коммит: `feat: add health check endpoint and CI/CD improvements`

---

### 0.3 [x] Исправить сломанную ссылку `index.css` в `frontend/index.html`

В `frontend/index.html` есть `<link rel="stylesheet" href="/index.css">` но файл не существует → 404 в браузере.

**Действия:**
1. Создай `frontend/index.css` с пустым содержимым (или базовые стили body если нужны)
2. Либо удали строку `<link rel="stylesheet" href="/index.css">` из `index.html`

Проверка: `cd frontend && npm run build` — должен успешно собраться
Коммит: `fix: remove broken index.css reference from index.html`

---

## Phase 1 — Create `apps.payments` App Skeleton

### 1.1 [ ] Создать структуру Django app `apps.payments`

**Создай следующие пустые файлы:**
```
backend/apps/payments/__init__.py
backend/apps/payments/migrations/__init__.py
```

**Создай `backend/apps/payments/apps.py`:**
```python
from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"
    verbose_name = "Платежи"
```

**Добавь `"apps.payments"` в `INSTALLED_APPS`** в `backend/config/settings/base.py` (после `"apps.operations"`).

**Добавь Payme настройки в конец `backend/config/settings/base.py`:**
```python
import os

# --- Payme ---
PAYME_MERCHANT_ID = os.getenv("PAYME_MERCHANT_ID", "")
PAYME_MERCHANT_KEY = os.getenv("PAYME_MERCHANT_KEY", "")
PAYME_CHECKOUT_URL = os.getenv("PAYME_CHECKOUT_URL", "https://test.paycom.uz")
PAYME_CALLBACK_URL = os.getenv("PAYME_CALLBACK_URL", "http://localhost:3000/#/settings")
```

**Добавь Payme prod настройки в `backend/config/settings/prod.py`:**
```python
PAYME_CHECKOUT_URL = "https://checkout.paycom.uz"
```

**Добавь Payme переменные в `.env.example`:**
```
# Payme (Paycom) — получить на https://merchant.paycom.uz
PAYME_MERCHANT_ID=
PAYME_MERCHANT_KEY=
PAYME_MERCHANT_KEY_PROD=
PAYME_CHECKOUT_URL=https://test.paycom.uz
PAYME_CALLBACK_URL=http://localhost:3000/#/settings
```

Проверка: `cd backend && uv run python manage.py check`
Коммит: `feat: scaffold apps.payments app with Payme settings`

---

## Phase 2 — Payme Integration: Models

### 2.1 [ ] Создать модели `Order` и `PaymeTransaction`

**Создай `backend/apps/payments/models.py`:**

```python
import time
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


class Order(TimeStampedModel):
    """Заказ на оплату подписки через Payme."""

    class Plan(models.TextChoices):
        BASIC = "BASIC", "Basic"
        PRO = "PRO", "Pro"
        ENTERPRISE = "ENTERPRISE", "Enterprise"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Ожидает оплаты"
        PAYING = "PAYING", "В процессе оплаты"
        PAID = "PAID", "Оплачен"
        CANCELLED = "CANCELLED", "Отменён"
        EXPIRED = "EXPIRED", "Истёк"

    # Цены в тийинах (1 UZS = 100 тийин)
    PLAN_PRICES = {
        "BASIC": 0,
        "PRO": 4_900_000,          # 49 000 UZS
        "ENTERPRISE": 19_900_000,  # 199 000 UZS
    }

    PLAN_LIMITS = {
        "BASIC":      {"max_kitchens": 3,  "max_users": 10},
        "PRO":        {"max_kitchens": 10, "max_users": 50},
        "ENTERPRISE": {"max_kitchens": 999, "max_users": 999},
    }

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="orders",
        verbose_name="Организация",
    )
    target_plan = models.CharField(
        max_length=20, choices=Plan.choices, verbose_name="Целевой план"
    )
    amount = models.BigIntegerField(verbose_name="Сумма (тийин)")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Статус",
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_orders",
        verbose_name="Создан пользователем",
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="Оплачен в")
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name="Отменён в")

    class Meta:
        verbose_name = "Заказ на подписку"
        verbose_name_plural = "Заказы на подписку"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Order #{self.id} [{self.organization}] {self.target_plan} — {self.status}"

    @property
    def is_payable(self) -> bool:
        """Заказ может быть оплачен — статус PENDING и не истёк."""
        return self.status == self.Status.PENDING

    def mark_as_paid(self) -> None:
        """Пометить заказ оплаченным и обновить план организации."""
        self.status = self.Status.PAID
        self.paid_at = timezone.now()
        self.save(update_fields=["status", "paid_at", "updated_at"])

        limits = self.PLAN_LIMITS.get(self.target_plan, {})
        org = self.organization
        org.plan = self.target_plan
        org.max_kitchens = limits.get("max_kitchens", org.max_kitchens)
        org.max_users = limits.get("max_users", org.max_users)
        org.mrr = self.amount / 100  # конвертация тийин → UZS
        org.save(update_fields=["plan", "max_kitchens", "max_users", "mrr", "updated_at"])

    def cancel(self) -> None:
        """Отменить заказ."""
        self.status = self.Status.CANCELLED
        self.cancelled_at = timezone.now()
        self.save(update_fields=["status", "cancelled_at", "updated_at"])


class PaymeTransaction(TimeStampedModel):
    """Транзакция Payme, привязанная к заказу на подписку."""

    STATE_CREATED = 1
    STATE_PERFORMED = 2
    STATE_CANCELLED_BEFORE = -1
    STATE_CANCELLED_AFTER = -2

    PAYME_TIMEOUT_MS = 43_200_000  # 12 часов

    payme_id = models.CharField(
        max_length=255, unique=True, verbose_name="ID транзакции Payme"
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="payme_transactions",
        verbose_name="Заказ",
    )
    state = models.IntegerField(verbose_name="Состояние")
    amount = models.BigIntegerField(verbose_name="Сумма (тийин)")
    reason = models.SmallIntegerField(
        null=True, blank=True, verbose_name="Причина отмены"
    )
    payme_time = models.BigIntegerField(default=0, verbose_name="Время создания (Payme, мс)")
    payme_create_time = models.BigIntegerField(default=0, verbose_name="Время создания у нас (мс)")
    payme_perform_time = models.BigIntegerField(default=0, verbose_name="Время проведения (мс)")
    payme_cancel_time = models.BigIntegerField(default=0, verbose_name="Время отмены (мс)")

    class Meta:
        verbose_name = "Транзакция Payme"
        verbose_name_plural = "Транзакции Payme"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PaymeTransaction {self.payme_id} state={self.state}"

    @property
    def is_timed_out(self) -> bool:
        """Транзакция создана, но истёк 12-часовой таймаут."""
        if self.state != self.STATE_CREATED:
            return False
        now_ms = int(time.time() * 1000)
        return (now_ms - self.payme_create_time) > self.PAYME_TIMEOUT_MS
```

**Создай миграцию:**
```bash
cd backend && uv run python manage.py makemigrations payments
```

**Примени:**
```bash
uv run python manage.py migrate
```

Проверка: `uv run python manage.py check`
Коммит: `feat(payments): add Order and PaymeTransaction models`

---

## Phase 3 — Payme Errors & Auth Helper

### 3.1 [ ] Создать `payme_errors.py` с кодами ошибок и helper

**Создай `backend/apps/payments/payme_errors.py`:**

```python
import base64
from django.conf import settings
from django.http import JsonResponse


class PaymeError:
    PARSE_ERROR      = -32700
    INVALID_REQUEST  = -32600
    METHOD_NOT_FOUND = -32601
    INVALID_PARAMS   = -32602
    AUTH_FAILED      = -32504
    INTERNAL_ERROR   = -32400

    INVALID_AMOUNT        = -31001
    TRANSACTION_NOT_FOUND = -31003
    CANT_CANCEL_DELIVERED = -31007
    CANT_PERFORM          = -31008
    ORDER_NOT_FOUND       = -31050
    ORDER_ALREADY_PAID    = -31051


PAYME_MESSAGES = {
    PaymeError.PARSE_ERROR:           {"ru": "Ошибка разбора JSON",             "en": "Parse error"},
    PaymeError.INVALID_REQUEST:       {"ru": "Неверный запрос",                 "en": "Invalid request"},
    PaymeError.METHOD_NOT_FOUND:      {"ru": "Метод не найден",                 "en": "Method not found"},
    PaymeError.AUTH_FAILED:           {"ru": "Ошибка авторизации",              "en": "Authorization failed"},
    PaymeError.INTERNAL_ERROR:        {"ru": "Внутренняя ошибка",               "en": "Internal error"},
    PaymeError.INVALID_AMOUNT:        {"ru": "Неверная сумма платежа",          "en": "Invalid amount"},
    PaymeError.TRANSACTION_NOT_FOUND: {"ru": "Транзакция не найдена",           "en": "Transaction not found"},
    PaymeError.CANT_CANCEL_DELIVERED: {"ru": "Невозможно отменить — доставлено","en": "Cannot cancel delivered"},
    PaymeError.CANT_PERFORM:          {"ru": "Невозможно выполнить операцию",   "en": "Cannot perform operation"},
    PaymeError.ORDER_NOT_FOUND:       {"ru": "Заказ не найден",                 "en": "Order not found"},
    PaymeError.ORDER_ALREADY_PAID:    {"ru": "Заказ уже оплачен",               "en": "Order already paid"},
}


def error_response(code: int, request_id, data=None) -> JsonResponse:
    """Вернуть JSON-RPC ошибку в формате Payme."""
    body = {
        "error": {
            "code": code,
            "message": PAYME_MESSAGES.get(code, {"ru": "Ошибка", "en": "Error"}),
        },
        "id": request_id,
    }
    if data is not None:
        body["error"]["data"] = data
    return JsonResponse(body)


def success_response(result: dict, request_id) -> JsonResponse:
    """Вернуть JSON-RPC успешный ответ."""
    return JsonResponse({"result": result, "id": request_id})


def verify_payme_auth(request) -> bool:
    """Проверить Basic auth заголовок от Payme. Логин: Paycom, пароль: PAYME_MERCHANT_KEY."""
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        login, key = decoded.split(":", 1)
        return login == "Paycom" and key == settings.PAYME_MERCHANT_KEY
    except Exception:
        return False
```

Проверка: `cd backend && uv run python manage.py check`
Коммит: `feat(payments): add Payme error codes and auth helper`

---

## Phase 4 — Payme Webhook View (все 6 методов)

### 4.1 [ ] Создать `payme_views.py` — JSON-RPC webhook

**ВАЖНО**: Используй обычный `django.views.View` (НЕ DRF ViewSet) — иначе глобальный CamelCase renderer сломает протокол Payme (Payme ожидает `create_time`, а DRF вернёт `createTime`).

**Создай `backend/apps/payments/payme_views.py`:**

```python
import json
import time

from django.db import transaction
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .models import Order, PaymeTransaction
from .payme_errors import (
    PaymeError,
    error_response,
    success_response,
    verify_payme_auth,
)


@method_decorator(csrf_exempt, name="dispatch")
class PaymeWebhookView(View):
    """
    Единственная точка входа для Payme Merchant API (JSON-RPC 2.0).
    Payme шлёт POST запросы с Basic auth на этот endpoint.
    """

    METHODS = {
        "CheckPerformTransaction",
        "CreateTransaction",
        "PerformTransaction",
        "CancelTransaction",
        "CheckTransaction",
        "GetStatement",
    }

    def post(self, request):
        if not verify_payme_auth(request):
            return error_response(PaymeError.AUTH_FAILED, None)

        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return error_response(PaymeError.PARSE_ERROR, None)

        method = body.get("method")
        params = body.get("params", {})
        request_id = body.get("id")

        if method not in self.METHODS:
            return error_response(PaymeError.METHOD_NOT_FOUND, request_id)

        handler = getattr(self, f"_{method[0].lower()}{method[1:]}", None)
        return handler(params, request_id)

    # ------------------------------------------------------------------ #
    #  CheckPerformTransaction                                             #
    # ------------------------------------------------------------------ #
    def _checkPerformTransaction(self, params: dict, request_id):
        amount = params.get("amount")
        order_id = params.get("account", {}).get("order_id")

        try:
            order = Order.objects.get(pk=order_id)
        except (Order.DoesNotExist, ValueError, TypeError):
            return error_response(PaymeError.ORDER_NOT_FOUND, request_id, "order_id")

        if order.status == Order.Status.PAID:
            return error_response(PaymeError.ORDER_ALREADY_PAID, request_id)

        if not order.is_payable:
            return error_response(PaymeError.CANT_PERFORM, request_id)

        if order.amount != amount:
            return error_response(PaymeError.INVALID_AMOUNT, request_id)

        return success_response({"allow": True}, request_id)

    # ------------------------------------------------------------------ #
    #  CreateTransaction                                                   #
    # ------------------------------------------------------------------ #
    def _createTransaction(self, params: dict, request_id):
        payme_id = params.get("id")
        payme_time = params.get("time")
        amount = params.get("amount")
        order_id = params.get("account", {}).get("order_id")

        # Если транзакция уже существует — идемпотентный ответ
        try:
            txn = PaymeTransaction.objects.select_related("order").get(payme_id=payme_id)
        except PaymeTransaction.DoesNotExist:
            txn = None

        if txn:
            if txn.is_timed_out:
                with transaction.atomic():
                    now_ms = int(time.time() * 1000)
                    txn.state = PaymeTransaction.STATE_CANCELLED_BEFORE
                    txn.reason = 4
                    txn.payme_cancel_time = now_ms
                    txn.save(update_fields=["state", "reason", "payme_cancel_time", "updated_at"])
                    txn.order.cancel()
                return error_response(PaymeError.CANT_PERFORM, request_id)

            if txn.state != PaymeTransaction.STATE_CREATED:
                return error_response(PaymeError.CANT_PERFORM, request_id)

            return success_response({
                "create_time": txn.payme_create_time,
                "transaction": str(txn.id),
                "state": txn.state,
            }, request_id)

        # Проверка заказа
        try:
            order = Order.objects.select_for_update().get(pk=order_id)
        except (Order.DoesNotExist, ValueError, TypeError):
            return error_response(PaymeError.ORDER_NOT_FOUND, request_id, "order_id")

        if order.status == Order.Status.PAID:
            return error_response(PaymeError.ORDER_ALREADY_PAID, request_id)

        if not order.is_payable:
            return error_response(PaymeError.CANT_PERFORM, request_id)

        if order.amount != amount:
            return error_response(PaymeError.INVALID_AMOUNT, request_id)

        now_ms = int(time.time() * 1000)

        with transaction.atomic():
            txn = PaymeTransaction.objects.create(
                payme_id=payme_id,
                order=order,
                state=PaymeTransaction.STATE_CREATED,
                amount=amount,
                payme_time=payme_time,
                payme_create_time=now_ms,
            )
            order.status = Order.Status.PAYING
            order.save(update_fields=["status", "updated_at"])

        return success_response({
            "create_time": txn.payme_create_time,
            "transaction": str(txn.id),
            "state": txn.state,
        }, request_id)

    # ------------------------------------------------------------------ #
    #  PerformTransaction                                                  #
    # ------------------------------------------------------------------ #
    def _performTransaction(self, params: dict, request_id):
        payme_id = params.get("id")

        try:
            txn = PaymeTransaction.objects.select_related("order").select_for_update().get(
                payme_id=payme_id
            )
        except PaymeTransaction.DoesNotExist:
            return error_response(PaymeError.TRANSACTION_NOT_FOUND, request_id)

        if txn.state == PaymeTransaction.STATE_PERFORMED:
            return success_response({
                "transaction": str(txn.id),
                "perform_time": txn.payme_perform_time,
                "state": txn.state,
            }, request_id)

        if txn.state != PaymeTransaction.STATE_CREATED:
            return error_response(PaymeError.CANT_PERFORM, request_id)

        if txn.is_timed_out:
            now_ms = int(time.time() * 1000)
            with transaction.atomic():
                txn.state = PaymeTransaction.STATE_CANCELLED_BEFORE
                txn.reason = 4
                txn.payme_cancel_time = now_ms
                txn.save(update_fields=["state", "reason", "payme_cancel_time", "updated_at"])
                txn.order.cancel()
            return error_response(PaymeError.CANT_PERFORM, request_id)

        now_ms = int(time.time() * 1000)
        with transaction.atomic():
            txn.state = PaymeTransaction.STATE_PERFORMED
            txn.payme_perform_time = now_ms
            txn.save(update_fields=["state", "payme_perform_time", "updated_at"])
            txn.order.mark_as_paid()

        return success_response({
            "transaction": str(txn.id),
            "perform_time": txn.payme_perform_time,
            "state": txn.state,
        }, request_id)

    # ------------------------------------------------------------------ #
    #  CancelTransaction                                                   #
    # ------------------------------------------------------------------ #
    def _cancelTransaction(self, params: dict, request_id):
        payme_id = params.get("id")
        reason = params.get("reason")

        try:
            txn = PaymeTransaction.objects.select_related("order").select_for_update().get(
                payme_id=payme_id
            )
        except PaymeTransaction.DoesNotExist:
            return error_response(PaymeError.TRANSACTION_NOT_FOUND, request_id)

        if txn.state in (PaymeTransaction.STATE_CANCELLED_BEFORE, PaymeTransaction.STATE_CANCELLED_AFTER):
            return success_response({
                "transaction": str(txn.id),
                "cancel_time": txn.payme_cancel_time,
                "state": txn.state,
            }, request_id)

        now_ms = int(time.time() * 1000)

        if txn.state == PaymeTransaction.STATE_CREATED:
            with transaction.atomic():
                txn.state = PaymeTransaction.STATE_CANCELLED_BEFORE
                txn.reason = reason
                txn.payme_cancel_time = now_ms
                txn.save(update_fields=["state", "reason", "payme_cancel_time", "updated_at"])
                txn.order.cancel()
        elif txn.state == PaymeTransaction.STATE_PERFORMED:
            # Отмена уже выполненной транзакции — не откатываем план автоматически
            with transaction.atomic():
                txn.state = PaymeTransaction.STATE_CANCELLED_AFTER
                txn.reason = reason
                txn.payme_cancel_time = now_ms
                txn.save(update_fields=["state", "reason", "payme_cancel_time", "updated_at"])
        else:
            return error_response(PaymeError.CANT_PERFORM, request_id)

        return success_response({
            "transaction": str(txn.id),
            "cancel_time": txn.payme_cancel_time,
            "state": txn.state,
        }, request_id)

    # ------------------------------------------------------------------ #
    #  CheckTransaction                                                    #
    # ------------------------------------------------------------------ #
    def _checkTransaction(self, params: dict, request_id):
        payme_id = params.get("id")

        try:
            txn = PaymeTransaction.objects.get(payme_id=payme_id)
        except PaymeTransaction.DoesNotExist:
            return error_response(PaymeError.TRANSACTION_NOT_FOUND, request_id)

        return success_response({
            "create_time":  txn.payme_create_time,
            "perform_time": txn.payme_perform_time,
            "cancel_time":  txn.payme_cancel_time,
            "transaction":  str(txn.id),
            "state":        txn.state,
            "reason":       txn.reason,
        }, request_id)

    # ------------------------------------------------------------------ #
    #  GetStatement                                                        #
    # ------------------------------------------------------------------ #
    def _getStatement(self, params: dict, request_id):
        from_ts = params.get("from", 0)
        to_ts = params.get("to", 0)

        transactions = PaymeTransaction.objects.filter(
            payme_create_time__gte=from_ts,
            payme_create_time__lte=to_ts,
        ).select_related("order").order_by("payme_create_time")

        result = []
        for txn in transactions:
            result.append({
                "id":           txn.payme_id,
                "time":         txn.payme_time,
                "amount":       txn.amount,
                "account":      {"order_id": txn.order_id},
                "create_time":  txn.payme_create_time,
                "perform_time": txn.payme_perform_time,
                "cancel_time":  txn.payme_cancel_time,
                "transaction":  str(txn.id),
                "state":        txn.state,
                "reason":       txn.reason,
                "receivers":    None,
            })

        return success_response({"transactions": result}, request_id)
```

Проверка: `cd backend && uv run python manage.py check`
Коммит: `feat(payments): implement all 6 Payme Merchant API methods`

---

## Phase 5 — REST API для фронтенда

### 5.1 [ ] Создать serializers, views, urls для Order API

**Создай `backend/apps/payments/serializers.py`:**

```python
from rest_framework import serializers

from .models import Order, PaymeTransaction


class PaymeTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymeTransaction
        fields = [
            "id", "payme_id", "state", "amount", "reason",
            "payme_create_time", "payme_perform_time", "payme_cancel_time",
            "created_at",
        ]


class OrderSerializer(serializers.ModelSerializer):
    organization_id = serializers.IntegerField(source="organization.id", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "organization_id", "target_plan", "amount",
            "status", "created_by", "created_by_name",
            "paid_at", "cancelled_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "status", "paid_at", "cancelled_at", "created_at", "updated_at", "created_by",
        ]

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.get_full_name() or obj.created_by.username if obj.created_by else None

    def validate(self, attrs):
        target_plan = attrs.get("target_plan")
        amount = attrs.get("amount")
        expected = Order.PLAN_PRICES.get(target_plan)
        if expected is not None and amount != expected:
            raise serializers.ValidationError(
                {"amount": f"Сумма для плана {target_plan} должна быть {expected} тийин"}
            )
        return attrs


class OrderDetailSerializer(OrderSerializer):
    transactions = PaymeTransactionSerializer(
        source="payme_transactions", many=True, read_only=True
    )

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ["transactions"]
```

**Создай `backend/apps/payments/views.py`:**

```python
import base64

from django.conf import settings
from rest_framework import serializers as drf_serializers
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.mixins import TenantQuerySetMixin
from apps.core.permissions import IsTenantAdmin

from .models import Order
from .serializers import OrderDetailSerializer, OrderSerializer


class OrderViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """CRUD для заказов на подписку. Только TENANT_ADMIN может создавать."""

    queryset = Order.objects.select_related("organization", "created_by").all()
    permission_classes = [IsTenantAdmin]
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ["status", "target_plan"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return OrderDetailSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
        )

    @action(detail=True, methods=["post"])
    def checkout_url(self, request, pk=None):
        """Сгенерировать URL для редиректа на Payme Checkout."""
        order = self.get_object()
        if not order.is_payable:
            raise drf_serializers.ValidationError("Заказ не может быть оплачен")

        merchant_id = settings.PAYME_MERCHANT_ID
        callback = settings.PAYME_CALLBACK_URL
        lang = "ru"
        params = f"m={merchant_id};ac.order_id={order.id};a={order.amount};l={lang};c={callback}"
        encoded = base64.b64encode(params.encode()).decode()
        checkout_url = f"{settings.PAYME_CHECKOUT_URL}/{encoded}"

        return Response({"checkout_url": checkout_url})
```

**Создай `backend/apps/payments/urls.py`:**

```python
from django.urls import path
from rest_framework.routers import DefaultRouter

from .payme_views import PaymeWebhookView
from .views import OrderViewSet

router = DefaultRouter()
router.register("payments/orders", OrderViewSet, basename="payment-orders")

urlpatterns = [
    path("payments/payme/", PaymeWebhookView.as_view(), name="payme-webhook"),
] + router.urls
```

**Добавь в `backend/config/urls.py`:**
```python
path("api/", include("apps.payments.urls")),
```

Проверка: `cd backend && uv run python manage.py check`
Коммит: `feat(payments): add Order REST API with checkout URL generation`

---

## Phase 6 — Admin

### 6.1 [ ] Зарегистрировать модели в Django Admin (Unfold)

**Создай `backend/apps/payments/admin.py`:**

```python
from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Order, PaymeTransaction


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = ["id", "organization", "target_plan", "amount", "status", "created_at"]
    list_filter = ["status", "target_plan"]
    search_fields = ["organization__name"]
    readonly_fields = ["status", "paid_at", "cancelled_at", "created_at", "updated_at"]
    raw_id_fields = ["organization", "created_by"]
    date_hierarchy = "created_at"


@admin.register(PaymeTransaction)
class PaymeTransactionAdmin(ModelAdmin):
    list_display = ["id", "payme_id", "order", "state", "amount", "created_at"]
    list_filter = ["state"]
    search_fields = ["payme_id"]
    readonly_fields = [
        "payme_id", "state", "amount", "reason",
        "payme_time", "payme_create_time", "payme_perform_time", "payme_cancel_time",
        "created_at", "updated_at",
    ]
    raw_id_fields = ["order"]
```

Проверка: `cd backend && uv run python manage.py check`
Коммит: `feat(payments): register Order and PaymeTransaction in Unfold admin`

---

## Phase 7 — Backend Tests

### 7.1 [ ] Написать тесты для Payme интеграции

**Создай `backend/tests/test_payments.py`** с тест-кейсами:

1. **TestOrderModel** — тест `is_payable`, `mark_as_paid` (проверь что план организации меняется), `cancel`
2. **TestPaymeAuth** — тест `verify_payme_auth`: неверный заголовок, неверный ключ, правильный
3. **TestCheckPerformTransaction** — корректный заказ, неверная сумма, несуществующий заказ, уже оплаченный
4. **TestCreateTransaction** — создание новой транзакции, идемпотентность (повторный запрос с тем же id), заказ не найден
5. **TestPerformTransaction** — успешное выполнение, уже выполнен (идемпотентно), не найден
6. **TestCancelTransaction** — отмена STATE_CREATED (→ -1), отмена STATE_PERFORMED (→ -2), уже отменена
7. **TestCheckTransaction** — возврат правильных полей, не найдена
8. **TestGetStatement** — фильтрация по временному диапазону
9. **TestOrderAPI** — создание через REST API, получение checkout URL, проверка прав (только TENANT_ADMIN)

Используй `pytest` + `pytest-django`. Паттерн конфигурации возьми из существующего `backend/tests/conftest.py`.

Для тестирования webhook используй `django.test.Client` напрямую (не `APIClient` от DRF):
```python
import json
import base64
from django.test import Client

def make_payme_headers(key="test_key"):
    creds = base64.b64encode(f"Paycom:{key}".encode()).decode()
    return {"HTTP_AUTHORIZATION": f"Basic {creds}", "content_type": "application/json"}

client = Client()
response = client.post(
    "/api/payments/payme/",
    data=json.dumps({"method": "CheckPerformTransaction", "params": {...}, "id": 1}),
    **make_payme_headers(),
)
```

Добавь в `conftest.py` фикстуру:
```python
@pytest.fixture
def order(org, tenant_admin):
    from apps.payments.models import Order
    return Order.objects.create(
        organization=org,
        target_plan="PRO",
        amount=4_900_000,
        created_by=tenant_admin,
    )
```

Запуск: `cd backend && uv run pytest tests/test_payments.py -v`
Все тесты должны пройти.
Коммит: `test(payments): add comprehensive tests for Payme integration`

---

## Phase 8 — Frontend: Service, Types, Constants

### 8.1 [ ] Добавить типы и сервис для платежей

**Добавь в `frontend/types.ts`** (в конец файла):

```typescript
export type OrderStatus = 'PENDING' | 'PAYING' | 'PAID' | 'CANCELLED' | 'EXPIRED';

export interface SubscriptionOrder {
  id: number;
  organizationId: number;
  targetPlan: SubscriptionPlan;
  amount: number;  // в тийинах
  status: OrderStatus;
  createdBy: number | null;
  createdByName: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Добавь в `frontend/constants.ts`** (в конец файла):

```typescript
// Цены планов в тийинах (1 UZS = 100 тийин)
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  BASIC: 0,
  PRO: 4_900_000,
  ENTERPRISE: 19_900_000,
};

// Человекочитаемые цены для UI
export const PLAN_PRICES_DISPLAY: Record<SubscriptionPlan, string> = {
  BASIC: 'Бесплатно',
  PRO: '49 000 UZS/мес',
  ENTERPRISE: '199 000 UZS/мес',
};

export const PLAN_LIMITS: Record<SubscriptionPlan, { kitchens: number | string; users: number | string }> = {
  BASIC: { kitchens: 3, users: 10 },
  PRO: { kitchens: 10, users: 50 },
  ENTERPRISE: { kitchens: 'Unlimited', users: 'Unlimited' },
};
```

**Создай `frontend/api/services/payments.ts`:**

```typescript
import apiClient from '../client';
import type { SubscriptionOrder } from '../../types';

interface CreateOrderData {
  targetPlan: string;
  amount: number;
}

interface CheckoutUrlResponse {
  checkoutUrl: string;
}

export const paymentsService = {
  createOrder: (data: CreateOrderData) =>
    apiClient.post<SubscriptionOrder>('/payments/orders/', data),

  getOrders: () =>
    apiClient.get<{ results: SubscriptionOrder[] }>('/payments/orders/'),

  getOrder: (id: number) =>
    apiClient.get<SubscriptionOrder>(`/payments/orders/${id}/`),

  getCheckoutUrl: (orderId: number) =>
    apiClient.post<CheckoutUrlResponse>(`/payments/orders/${orderId}/checkout_url/`),
};
```

Проверка: `cd frontend && npm run build` — должен собраться без ошибок
Коммит: `feat(payments): add frontend types, constants, and payment service`

---

## Phase 9 — Frontend: Refactor Settings.tsx Billing Tab

### 9.1 [ ] Заменить mock billing на реальный Payme checkout flow

**Измени `frontend/views/Settings.tsx`:**

1. **Добавь импорты** в начало файла:
   ```typescript
   import { paymentsService } from '../api/services/payments';
   import type { SubscriptionOrder } from '../types';
   import { PLAN_PRICES, PLAN_PRICES_DISPLAY, PLAN_LIMITS } from '../constants';
   ```

2. **Убери mock `handlePayment`** и замени на реальный:
   ```typescript
   const [isCreatingOrder, setIsCreatingOrder] = useState(false);
   const [paymentOrders, setPaymentOrders] = useState<SubscriptionOrder[]>([]);

   useEffect(() => {
     if (activeTab === 'billing') {
       paymentsService.getOrders().then(res => {
         setPaymentOrders(res.data.results || []);
       }).catch(() => {});
     }
   }, [activeTab]);

   const handleUpgrade = async (plan: SubscriptionPlan) => {
     if (plan === 'BASIC') return;
     setIsCreatingOrder(true);
     try {
       const amount = PLAN_PRICES[plan];
       const orderRes = await paymentsService.createOrder({ targetPlan: plan, amount });
       const urlRes = await paymentsService.getCheckoutUrl(orderRes.data.id);
       window.location.href = urlRes.data.checkoutUrl;
     } catch (err) {
       console.error('Payment error:', err);
     } finally {
       setIsCreatingOrder(false);
     }
   };
   ```

3. **Используй реальные данные из констант** для отображения планов:
   - Цена: `PLAN_PRICES_DISPLAY[plan]`
   - Кухни: `PLAN_LIMITS[plan].kitchens`
   - Пользователи: `PLAN_LIMITS[plan].users`

4. **Убери fake кредит-карточный модал** — вместо него кнопка сразу редиректит на Payme Checkout.

5. **Добавь секцию история платежей** под планами (таблица с `paymentOrders`): дата, план, сумма, статус.

6. **Убери `upgradeSubscription` из импортов** из DataContext — эта функция больше не нужна на фронте (план обновляется на сервере через Payme webhook).

Проверка: `cd frontend && npm run build` — должен собраться без ошибок
Коммит: `feat(payments): replace mock billing with real Payme checkout flow`

---

## Phase 10 — Final Verification & Cleanup

### 10.1 [ ] Финальная проверка и очистка

**Выполни:**

1. `cd backend && uv run python manage.py check` → OK
2. `cd backend && uv run python manage.py makemigrations --check` → No changes
3. `cd backend && uv run pytest -v` → Все тесты проходят
4. `cd frontend && npm run build` → Успешная сборка

**Удали мусорные файлы из корня:**
- `screenshot-dashboard-updated.png`
- `screenshot-dashboard.png`
- `screenshot-final.png`
- `snapshot-after-deploy.txt`
- `snapshot-v2.txt`

**Добавь в `.gitignore`** строки:
```
screenshot-*.png
snapshot-*.txt
```

**Провери `.env.example`** — все новые Payme переменные должны быть добавлены.

**Проверь `CLAUDE.md`** — добавь раздел про Payme если его нет.

**Финальный коммит:**
`chore: cleanup artifacts, update .gitignore, final verification`

---

## ALL PHASES COMPLETE

Все задачи выполнены. Интеграция Payme завершена:
- Backend: `apps.payments` с моделями, 6 методами Payme, REST API, тестами
- Frontend: реальный checkout flow в Settings.tsx
- Endpoint Payme webhook: `POST /api/payments/payme/`
- Checkout URL: `POST /api/payments/orders/{id}/checkout_url/`

**Следующие шаги (вручную):**
1. Получить `PAYME_MERCHANT_ID` и `PAYME_MERCHANT_KEY` на https://merchant.paycom.uz
2. Добавить переменные в `.env` и в Coolify
3. Зарегистрировать `https://marga.fullfocus.dev/api/payments/payme/` как callback URL в личном кабинете Payme
4. Протестировать через Payme тестовый кабинет
