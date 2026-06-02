# Marga Manager — Task List for ralph-loop

Выполняй фазы по порядку. После каждой фазы: запусти проверку, отметь [x], закоммить.
Если фаза уже выполнена — переходи к следующей. Не начинай следующую пока текущая не закоммичена.

---

## Phase 0: Restore Missing __init__.py Files

**Задача**: Восстановить удалённые `__init__.py` файлы. Без них Django не запустится.

- [x] Создать пустой файл `backend/apps/__init__.py`
- [x] Создать пустой файл `backend/config/__init__.py`
- [x] Создать пустой файл `backend/tests/__init__.py`
- [x] Проверка: `cd backend && uv run python manage.py check`
- [x] Коммит: `chore: восстановить удалённые __init__.py файлы` (файлы уже существуют и tracked)

---

## Phase 1: Commit Untracked Files + Cleanup

**Задача**: Закоммитить незакоммиченные файлы, удалить мусорные файлы.

- [x] Закоммитить `backend/apps/core/views.py` (health check view, уже подключён в urls.py)
- [x] Закоммитить `backend/config/urls.py` если не закоммичен
- [x] Проверить наличие `screenshot-*.png`, `snapshot-*.txt`, `GSD-GUIDE.md`, `.playwright-mcp/` — если есть, удалить
- [x] Проверка: `git status` — должно быть чисто после коммита
- [x] Коммит: `chore: закоммитить health check view, убрать мусорные файлы`

---

## Phase 2: Security — Health Check Info Leak

**Задача**: `backend/apps/core/views.py` возвращает `str(e)` при ошибке БД — утечка деталей подключения.

- [x] Найти в `backend/apps/core/views.py` место где `str(e)` попадает в ответ
- [x] Заменить на generic строку: `"database unavailable"` (уже исправлено — возвращает `"unavailable"`)
- [x] Проверка: `cd backend && uv run python manage.py check`
- [x] Коммит: `fix(security): убрать утечку деталей ошибки БД в health check` (N/A — уже безопасно)

---

## Phase 3: Security — Privilege Escalation in OrganizationSerializer

**Задача**: `OrganizationSerializer` позволяет TENANT_ADMIN через PATCH обновить `plan`, `max_kitchens`, `max_users`, `mrr`, `status` — privilege escalation.

- [x] Открыть `backend/apps/organizations/serializers.py`
- [x] В `OrganizationSerializer.Meta.read_only_fields` добавить: `"plan"`, `"max_kitchens"`, `"max_users"`, `"mrr"`, `"status"`, `"slug"`
- [x] В `backend/apps/organizations/views.py` убедиться что SUPER_ADMIN может обновлять эти поля (через отдельный `AdminOrganizationSerializer` или `get_serializer_class`):
  - Создать `AdminOrganizationSerializer(OrganizationSerializer)` без лишних read_only ограничений
  - В `OrganizationViewSet.get_serializer_class()` — вернуть `AdminOrganizationSerializer` если `request.user.role == 'SUPER_ADMIN'`
- [x] Проверка: `cd backend && uv run pytest -v`
- [x] Коммит: `fix(security): запретить TENANT_ADMIN изменять plan и лимиты организации`

---

## Phase 4: Security — Payme Auth Hardening

**Задача**: `backend/apps/payments/payme_errors.py` — `verify_payme_auth()` уязвима к пустому ключу и timing attack.

- [x] Открыть `backend/apps/payments/payme_errors.py`
- [x] В функции `verify_payme_auth` добавить:
  1. Проверку что `settings.PAYME_MERCHANT_KEY` не пустой — если пустой, сразу возвращать `False`
  2. Заменить `key == settings.PAYME_MERCHANT_KEY` на `hmac.compare_digest(key, settings.PAYME_MERCHANT_KEY)`
  3. Добавить `import hmac` в начало файла
- [x] Проверка: `cd backend && uv run pytest -v`
- [x] Коммит: `fix(security): защита от пустого ключа и timing attack в Payme auth`

---

## Phase 5: Dead Code Cleanup — Frontend

**Задача**: Удалить ~650+ строк мёртвого кода.

### 5a: Удалить мёртвые файлы
- [x] Удалить `frontend/views/Analytics.tsx` (193 строки, нет маршрута в App.tsx)
- [x] Удалить `frontend/views/Reports.tsx` (импортируется но нет маршрута — убрать импорт из App.tsx тоже)
- [x] В `frontend/App.tsx` удалить импорт `Reports` и любые неиспользуемые импорты

### 5b: Очистить constants.ts
- [x] Открыть `frontend/constants.ts`
- [x] Удалить все `MOCK_*` константы (MOCK_USERS, MOCK_ORGANIZATIONS, MOCK_PRODUCTS, MOCK_OPERATIONS и т.д.) — это ~450 строк с plaintext паролями
- [x] Оставить только реально используемые константы; если файл пустой — удалить и убрать импорты

### 5c: Убрать password из типов
- [x] Открыть `frontend/types.ts`
- [x] Найти `User` interface — удалить поле `password: string` (комментарий "for mock purposes")

### 5d: Убрать неиспользуемые импорты/переменные
- [x] `frontend/views/QuickInput.tsx` — убрать: импорт `DateFilter`, state `editUnitPrice`, функции `getYesterday` и `getFutureDate`
- [x] `frontend/views/Dashboard.tsx` — убрать: импорт `KitchenReportEntry`, неиспользуемые destructure из `stats`
- [x] `frontend/components/Layout.tsx` — убрать импорт `HelpCircle`
- [x] `frontend/views/superadmin/AdminDashboard.tsx` — убрать импорт `StatsCard`

### 5e: Убрать billing bypass
- [x] Открыть `frontend/context/DataContext.tsx`
- [x] Найти `upgradeSubscription()` функцию (~lines 212-220) — она делает прямой PATCH на `/api/organizations/{id}/`, обходя Payme
- [x] Заменить реализацию: вместо API-вызова — навигация к Settings billing tab (`window.location.hash = '#/settings'`)
- [x] Открыть `frontend/views/Kitchens.tsx` ~line 74 — проверить что вызов `upgradeSubscription()` корректно работает (переходит в Settings)

### Проверка:
- [x] `cd frontend && npm run build` — должен собраться без ошибок
- [x] Коммит: `refactor: удалить мёртвый код, MOCK данные с паролями, billing bypass`

---

## Phase 6: Dead Code Cleanup — Backend Middleware

**Задача**: Проверить `OrganizationMiddleware` — вероятно мёртвый код.

- [x] Найти все использования `request.organization` в codebase: `grep -r "request\.organization" backend/`
- [x] Если `request.organization` нигде не читается (только middleware устанавливает) — удалить:
  - Удалить класс из `backend/apps/core/middleware.py`
  - Убрать `'apps.core.middleware.OrganizationMiddleware'` из `MIDDLEWARE` в `backend/config/settings/base.py`
- [x] Если используется — оставить, отметить задачу как N/A
- [x] Проверка: `cd backend && uv run python manage.py check && uv run pytest -v`
- [x] Коммит: `refactor: удалить мёртвый OrganizationMiddleware` (или skip если N/A)

---

## Phase 7: PlanConfig — Цены и лимиты через Django Admin

**Задача**: Создать модель `PlanConfig` чтобы SUPER_ADMIN мог менять цены/лимиты планов через admin без деплоя.

### 7a: Backend — модель и миграция
- [x] Открыть `backend/apps/payments/models.py`
- [x] Добавить модель `PlanConfig` ПОСЛЕ существующих моделей:
  ```python
  class PlanConfig(TimeStampedModel):
      class Plan(models.TextChoices):
          BASIC = "BASIC", "Basic"
          PRO = "PRO", "Pro"
          ENTERPRISE = "ENTERPRISE", "Enterprise"

      plan = models.CharField(max_length=20, choices=Plan.choices, unique=True)
      price = models.BigIntegerField(help_text="Цена в тийинах (1 UZS = 100 тийин)")
      max_kitchens = models.PositiveIntegerField()
      max_users = models.PositiveIntegerField()
      is_active = models.BooleanField(default=True)

      class Meta:
          verbose_name = "Plan Config"
          verbose_name_plural = "Plan Configs"

      def __str__(self):
          return f"{self.plan} — {self.price // 100:,} UZS"
  ```
- [x] Создать миграцию: `cd backend && uv run python manage.py makemigrations payments`
- [x] Создать data migration для seed начальных значений — взять текущие значения из `PLAN_PRICES` и `PLAN_LIMITS`
- [x] Применить: `cd backend && uv run python manage.py migrate`

### 7b: Backend — Admin
- [x] Открыть `backend/apps/payments/admin.py`
- [x] Зарегистрировать `PlanConfig`:
  ```python
  @admin.register(PlanConfig)
  class PlanConfigAdmin(ModelAdmin):
      list_display = ["plan", "price", "max_kitchens", "max_users", "is_active"]
      list_editable = ["price", "max_kitchens", "max_users", "is_active"]
  ```

### 7c: Backend — Использовать PlanConfig
- [x] В `Order.mark_as_paid()` — брать лимиты из `PlanConfig.objects.get(plan=self.target_plan)` вместо `PLAN_LIMITS`
- [x] В `OrderSerializer.validate()` или `OrderViewSet.create()` — брать цену из `PlanConfig` вместо `PLAN_PRICES`
- [x] Удалить `PLAN_PRICES` и `PLAN_LIMITS` из `models.py` после замены

### 7d: Backend — Public API endpoint
- [x] В `backend/apps/payments/views.py` добавить:
  ```python
  class PlanConfigListView(generics.ListAPIView):
      permission_classes = [AllowAny]
      serializer_class = PlanConfigSerializer
      queryset = PlanConfig.objects.filter(is_active=True)
  ```
- [x] В `backend/apps/payments/serializers.py` создать `PlanConfigSerializer` с полями: `plan`, `price`, `max_kitchens`, `max_users`
- [x] В `backend/apps/payments/urls.py` добавить маршрут: `path("plans/", PlanConfigListView.as_view())`

### 7e: Frontend — получать цены с API
- [x] В `frontend/api/services/payments.ts` добавить:
  ```typescript
  export async function getPlans(): Promise<PlanConfig[]> {
    const res = await apiClient.get('/payments/plans/');
    return res.data.results ?? res.data;
  }
  ```
- [x] В `frontend/types.ts` добавить тип `PlanConfig`
- [x] В `frontend/views/Settings.tsx` billing tab — заменить хардкодные цены на данные из `getPlans()`

### Проверка:
- [x] `cd backend && uv run python manage.py check && uv run python manage.py makemigrations --check && uv run pytest -v`
- [x] `cd frontend && npm run build`
- [x] Коммит: `feat: PlanConfig — управление ценами планов через Django Admin`

---

## Phase 8: CancelTransaction — Откат плана организации

**Задача**: Когда Payme отменяет транзакцию ПОСЛЕ выполнения (`STATE_CANCELLED_AFTER`), план организации не откатывается.

- [x] Открыть `backend/apps/payments/models.py`
- [x] В модель `Order` добавить поле:
  ```python
  previous_plan = models.CharField(max_length=20, blank=True, default="")
  ```
- [x] В `Order.mark_as_paid()` — перед обновлением плана сохранить текущий:
  ```python
  self.previous_plan = self.organization.plan
  ```
- [x] Добавить метод `Order.revert_plan()`:
  ```python
  def revert_plan(self):
      if not self.previous_plan:
          return
      try:
          config = PlanConfig.objects.get(plan=self.previous_plan)
      except PlanConfig.DoesNotExist:
          return
      org = self.organization
      org.plan = self.previous_plan
      org.max_kitchens = config.max_kitchens
      org.max_users = config.max_users
      org.save(update_fields=["plan", "max_kitchens", "max_users", "updated_at"])
  ```
- [x] Создать и применить миграцию
- [x] В `backend/apps/payments/payme_views.py` — в `_cancelTransaction`, ветка `elif txn.state == STATE_PERFORMED`:
  - После `txn.save(...)` добавить: `txn.order.revert_plan()`
- [x] Проверка: `cd backend && uv run python manage.py makemigrations --check && uv run pytest -v`
- [x] Коммит: `fix: откатывать план организации при отмене выполненной транзакции Payme`

---

## Phase 9: Prod/Stage Environments via Coolify

**Задача**: Создать раздельные конфигурации для prod и stage. Все секреты — через Coolify env vars.

### 9a: Обновить docker-compose.coolify.yml (prod)
- [x] Открыть `docker-compose.coolify.yml`
- [x] В секцию `backend.environment` добавить:
  ```yaml
  PAYME_MERCHANT_ID: ${PAYME_MERCHANT_ID}
  PAYME_MERCHANT_KEY: ${PAYME_MERCHANT_KEY}
  PAYME_CHECKOUT_URL: ${PAYME_CHECKOUT_URL:-https://checkout.paycom.uz}
  PAYME_CALLBACK_URL: ${PAYME_CALLBACK_URL:-https://marga.fullfocus.dev/#/settings}
  ```

### 9b: Создать docker-compose.stage.yml
- [x] Создать файл `docker-compose.stage.yml`:
  ```yaml
  # Stage environment — для тестирования с Payme sandbox (test.paycom.uz)
  # Env vars для Coolify:
  #   PAYME_MERCHANT_ID — тестовый merchant ID
  #   PAYME_MERCHANT_KEY — тестовый ключ
  #   PAYME_CHECKOUT_URL — https://test.paycom.uz (default)
  #   ALLOWED_HOSTS — stage домен
  #   SECRET_KEY, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
  services:
    db:
      image: postgres:16-alpine
      volumes:
        - postgres_data_stage:/var/lib/postgresql/data
      environment:
        POSTGRES_DB: ${POSTGRES_DB:-marga_stage}
        POSTGRES_USER: ${POSTGRES_USER:-marga}
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-marga123}
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-marga} -d ${POSTGRES_DB:-marga_stage}"]
        interval: 10s
        timeout: 5s
        retries: 5

    backend:
      image: jakha921/marga-backend:latest
      expose:
        - "8000"
      environment:
        SECRET_KEY: ${SECRET_KEY:-change-me-in-stage}
        DEBUG: "0"
        DJANGO_SETTINGS_MODULE: config.settings.prod
        ALLOWED_HOSTS: ${ALLOWED_HOSTS:-marga-stage.fullfocus.dev},localhost,127.0.0.1
        POSTGRES_DB: ${POSTGRES_DB:-marga_stage}
        POSTGRES_USER: ${POSTGRES_USER:-marga}
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-marga123}
        POSTGRES_HOST: db
        POSTGRES_PORT: "5432"
        CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-https://marga-stage.fullfocus.dev}
        PAYME_MERCHANT_ID: ${PAYME_MERCHANT_ID}
        PAYME_MERCHANT_KEY: ${PAYME_MERCHANT_KEY}
        PAYME_CHECKOUT_URL: ${PAYME_CHECKOUT_URL:-https://test.paycom.uz}
        PAYME_CALLBACK_URL: ${PAYME_CALLBACK_URL:-https://marga-stage.fullfocus.dev/#/settings}
      depends_on:
        db:
          condition: service_healthy
      volumes:
        - static_files_stage:/app/staticfiles
      healthcheck:
        test: ["CMD-SHELL", "python3 -c \"import socket; s=socket.socket(); s.settimeout(5); s.connect(('127.0.0.1',8000)); s.close()\" 2>/dev/null"]
        interval: 30s
        timeout: 15s
        retries: 5
        start_period: 120s

    frontend:
      image: jakha921/marga-frontend:latest
      expose:
        - "80"
      depends_on:
        - backend
      volumes:
        - static_files_stage:/app/static:ro
      healthcheck:
        test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:80/"]
        interval: 30s
        timeout: 5s
        retries: 3

  volumes:
    postgres_data_stage:
    static_files_stage:
  ```

### 9c: Backend settings — читать Payme из env
- [x] Открыть `backend/config/settings/prod.py`
- [x] Добавить:
  ```python
  PAYME_MERCHANT_ID = env("PAYME_MERCHANT_ID", default="")
  PAYME_MERCHANT_KEY = env("PAYME_MERCHANT_KEY", default="")
  PAYME_CHECKOUT_URL = env("PAYME_CHECKOUT_URL", default="https://checkout.paycom.uz")
  PAYME_CALLBACK_URL = env("PAYME_CALLBACK_URL", default="")
  ```
- [x] Открыть `backend/config/settings/base.py` — убедиться что те же настройки есть с dev defaults (test.paycom.uz)

### 9d: Документировать .env.example
- [x] Открыть `.env.example` (или создать)
- [x] Добавить секцию:
  ```
  # Payme / Paycom integration
  # Test sandbox: https://test.paycom.uz  (для stage)
  # Production:   https://checkout.paycom.uz  (для prod)
  PAYME_MERCHANT_ID=
  PAYME_MERCHANT_KEY=
  PAYME_CHECKOUT_URL=https://test.paycom.uz
  PAYME_CALLBACK_URL=http://localhost:3000/#/settings
  ```

### Проверка:
- [x] `docker compose -f docker-compose.coolify.yml config` — без ошибок
- [x] `docker compose -f docker-compose.stage.yml config` — без ошибок
- [x] `cd backend && uv run python manage.py check`
- [x] Коммит: `feat: добавить stage окружение и Payme env vars в docker-compose`

---

## Phase 10: Payme Integration Tests

**Задача**: Написать интеграционные тесты для Payme webhook и REST API.

- [x] Создать `backend/tests/test_payments.py`
- [x] Написать тесты (pytest + django.test.Client, реальная БД — НЕ mock):
  - `test_payme_auth_no_header` — запрос без Authorization → -32504
  - `test_payme_auth_wrong_key` — неверный ключ → -32504
  - `test_payme_empty_key_blocked` — при пустом PAYME_MERCHANT_KEY → -32504 (не пропускает)
  - `test_check_perform_valid` — валидный заказ, верная сумма → `{"allow": true}`
  - `test_check_perform_wrong_amount` — неверная сумма → -31001
  - `test_check_perform_not_found` — несуществующий order_id → -31050
  - `test_create_transaction_new` — создаёт транзакцию, order становится PAYING
  - `test_create_transaction_idempotent` — повторный вызов с тем же id → те же данные
  - `test_perform_transaction_success` — выполняется, order становится PAID, org получает plan
  - `test_cancel_before_perform` — отмена до perform → STATE_CANCELLED_BEFORE, order CANCELLED
  - `test_cancel_after_perform_reverts_plan` — отмена после perform → STATE_CANCELLED_AFTER, org plan откатывается
  - `test_check_transaction_found` — возвращает правильный state
  - `test_check_transaction_not_found` — -31003
  - `test_get_statement_range` — возвращает транзакции за период
  - `test_plan_config_list_public` — `GET /api/payments/plans/` без auth → 200 со списком планов
  - `test_org_plan_readonly_for_tenant_admin` — PATCH `/api/organizations/{id}/` с `plan=PRO` → поле игнорируется, остаётся прежнее значение
- [x] Проверка: `cd backend && uv run pytest tests/test_payments.py -v`
- [x] Коммит: `test: интеграционные тесты Payme webhook и PlanConfig API`

---

## DONE

Когда все фазы выполнены и все тесты проходят:
1. `cd backend && uv run pytest -v` — все тесты green
2. `cd frontend && npm run build` — frontend собирается без ошибок
3. `git log --oneline -12` — видны коммиты всех фаз
4. Вывести: `<promise>ALL PHASES COMPLETE</promise>`
