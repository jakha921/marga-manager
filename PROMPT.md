# Marga Manager — Ralph Loop Task List (Audit V2)

## Запуск
```bash
ralph-loop:ralph-loop "Прочитай PROMPT.md (/Users/jakha/Programming/Django/marga-manager/PROMPT.md). Найди первую незавершённую задачу [ ]. Выполни её полностью — создай/измени файлы, напиши код, запусти проверку (cd backend && uv run python manage.py check && uv run pytest -v для бэкенда, cd frontend && npm run build для фронтенда). Отметь [x] в PROMPT.md. Закоммить изменения. Повторяй до ALL PHASES COMPLETE." --max-iterations 80 --completion-promise "ALL PHASES COMPLETE" /compact /senior-qa /senior-backend /senior-frontend /frontend-design:frontend-design /server-advisor
```

---

## Порядок выполнения

1. Phase 1 — Payments: Race Conditions & Data Integrity
2. Phase 2 — Backend Security Hardening
3. Phase 3 — Backend Performance (N+1, export limits, serializer alignment)
4. Phase 4 — Dark Theme Completion + Light Theme Polish
5. Phase 5 — Frontend DataContext & API Client Stability
6. Phase 6 — i18n: непереведённые строки + hardcoded labels
7. Phase 7 — Accessibility (Modal ARIA, focus trap, ConfirmModal, loading states)
8. Phase 8 — TypeScript Strictness & Type Safety
9. Phase 9 — Backend Test Coverage (недостающие сценарии)
10. Phase 10 — Code Quality Cleanup

---

## Phase 1: Payments — Race Conditions & Data Integrity

**Проблема**: Платёжная система содержит race conditions, отсутствие валидаций и неоткатываемый MRR.

### 1.1 Проверка на существующий PENDING/PAYING заказ

- [x] В `backend/apps/payments/serializers.py` метод `validate()` (строка 66): добавить в начало — если у организации уже есть Order со статусом PENDING или PAYING, вернуть ValidationError `"У организации уже есть незавершённый заказ."`

### 1.2 Валидация: org не уже на целевом плане

- [x] В том же `validate()`: после проверки PlanConfig добавить — если `request.user.organization.plan == target_plan`, вернуть ValidationError `"Организация уже на этом плане."`

### 1.3 select_for_update в mark_as_paid()

- [x] В `backend/apps/payments/models.py` метод `mark_as_paid()` (строка 65): обернуть всё в `transaction.atomic()`, получать org через `Organization.objects.select_for_update().get(pk=self.organization_id)` вместо `self.organization`

### 1.4 revert_plan() — откатывать org.mrr

- [x] В `backend/apps/payments/models.py` метод `revert_plan()` (строка 90): добавить `org.mrr = config.price / 100` и `"mrr"` в `update_fields`. Также обернуть в `transaction.atomic()` + `select_for_update()`

### 1.5 Management command для EXPIRED заказов

- [x] Создать `backend/apps/payments/management/__init__.py` и `commands/__init__.py`
- [x] Создать `backend/apps/payments/management/commands/expire_stale_orders.py`: находит все Order со статусом PENDING/PAYING, созданные более 12 часов назад (`PaymeTransaction.PAYME_TIMEOUT_MS`), ставит статус EXPIRED

### 1.6 Фронтенд: загрузка цен из PlanConfig API

- [x] В `frontend/views/Settings.tsx`: загружать цены планов из `paymentsService.getPlans()` (endpoint уже есть — `GET /api/payments/plans/`) вместо hardcoded `PLAN_PRICES` из constants.ts
- [x] В `frontend/constants.ts`: убрать `PLAN_PRICES` и `PLAN_PRICES_DISPLAY`, оставить только `PLAN_LIMITS` как fallback

### 1.7 PAYME_CALLBACK_URL: warning при пустом значении

- [x] В `backend/config/settings/prod.py` строка 38: добавить warning

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v`

**Коммит**: `fix(payments): race conditions, select_for_update, revert mrr, EXPIRED cleanup, API prices`

- [x] Phase 1 complete

---

## Phase 2: Backend Security Hardening

**Проблема**: Пароли не проходят Django validators, JWT токен живёт 12 часов, Swagger открыт в проде, HSTS слабый, SECRET_KEY с дефолтом.

### 2.1 Django password validators в UserCreateSerializer

- [x] В `backend/apps/accounts/serializers.py`: заменить кастомную проверку пароля на `django.contrib.auth.password_validation.validate_password(value)` внутри `validate_password()`. Это применит все 4 валидатора из settings (length, similarity, common, numeric)

### 2.2 SECRET_KEY — убрать предсказуемый дефолт

- [x] В `backend/config/settings/prod.py`: raise `ImproperlyConfigured` если `SECRET_KEY` не задан
- [x] В `backend/config/settings/base.py`: добавлен комментарий что дефолт перекрывается в dev/prod

### 2.3 Postgres password — убрать "marga123" дефолт в prod

- [x] В `backend/config/settings/prod.py`: убрать дефолт `"PASSWORD": os.getenv("POSTGRES_PASSWORD")` — без fallback

### 2.4 JWT Access Token: 30 минут вместо 12 часов

- [x] В `backend/config/drf_settings.py`: `"ACCESS_TOKEN_LIFETIME": timedelta(minutes=30)`

### 2.5 Swagger: закрыть в проде

- [x] В `backend/config/drf_settings.py`: `"SERVE_PERMISSIONS": ["rest_framework.permissions.IsAdminUser"]`

### 2.6 HSTS: 1 год вместо 24 часов

- [x] В `backend/config/settings/prod.py`: `SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365`

### 2.7 JWT token blacklisting при rotation

- [x] В `backend/config/settings/base.py` INSTALLED_APPS: добавлен `"rest_framework_simplejwt.token_blacklist"`
- [x] В `backend/config/drf_settings.py` SIMPLE_JWT: добавлен `"BLACKLIST_AFTER_ROTATION": True`
- [x] Миграции применены

### 2.8 TenantCreateMixin: обработать DoesNotExist

- [x] В `backend/apps/core/mixins.py`: `Organization.objects.get` обёрнут в try/except с ValidationError

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v`

**Коммит**: `fix(security): Django password validators, JWT 30min, HSTS 1yr, token blacklist, Swagger auth`

- [x] Phase 2 complete

---

## Phase 3: Backend Performance — N+1, Export Limits, Serializer Alignment

**Проблема**: KitchenReportView делает 6N SQL запросов. ViewSets без select_related("organization"). Export без лимита. Serializer max_digits не совпадает с моделью.

### 3.1 KitchenReportView: уменьшить запросы

- [x] В `backend/apps/operations/views.py` строки 251-297: вместо цикла с 6 aggregate вызовами — 6 запросов с `values("kitchen").annotate(...)`, сборка в dict по kitchen_id. 6 запросов вместо 6N

### 3.2 select_related в ViewSets

- [x] В `backend/apps/kitchens/views.py`: `Kitchen.objects.select_related("organization").all()`
- [x] В `backend/apps/products/views.py` (CategoryViewSet): `Category.objects.select_related("organization").all()`
- [x] В `backend/apps/products/views.py` (ProductViewSet): добавлен `"organization"` к `select_related("category")`

### 3.3 Export Excel: лимит записей

- [x] В `backend/apps/operations/views.py` (export_excel): добавлен `qs[:10_000]` перед итерацией

### 3.4 OperationEntrySerializer.price: привести к модели

- [x] В `backend/apps/operations/serializers.py`: `max_digits=12, decimal_places=2`

### 3.5 Pagination docstring

- [x] В `backend/apps/core/pagination.py`: docstring исправлен — `200 элементов на страницу, макс 500`

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v`

**Коммит**: `perf: KitchenReport 6N→6 queries, select_related, export limit, serializer alignment`

- [x] Phase 3 complete

---

## Phase 4: Dark Theme Completion + Light Theme Polish

**Проблема**: Phase 2 прошлого цикла добавила CSS переменные и ThemeContext, но 141+ мест в views всё ещё используют hardcoded `bg-white`, `text-slate-*`, `border-slate-*`. Dark theme визуально сломан. Светлая тема требует мелких premium-улучшений (тени, hover-эффекты, border-radius).

### Таблица замен

| Hardcoded | CSS переменная |
|-----------|---------------|
| `bg-white` | `bg-[var(--bg-surface)]` |
| `bg-slate-50`, `bg-slate-100` | `bg-[var(--bg-surface-2)]` |
| `text-slate-800`, `text-slate-900` | `text-[var(--text-primary)]` |
| `text-slate-500`, `text-slate-600` | `text-[var(--text-secondary)]` |
| `text-slate-400` | `text-[var(--text-muted)]` |
| `border-slate-100` | `border-[var(--border-light)]` |
| `border-slate-200` | `border-[var(--border-color)]` |
| `bg-slate-900` (кнопки/primary) | `bg-[var(--color-primary)]` |

### 4.1 Компоненты

- [ ] `frontend/components/Modal.tsx`: заменить все `bg-white`, `border-slate-*`, `text-slate-*` на CSS переменные
- [ ] `frontend/components/StatsCard.tsx`: заменить `bg-white`, `text-slate-900`, `text-slate-400/500`, `border-slate-100`, `bg-slate-300`
- [ ] `frontend/components/Skeleton.tsx`: заменить строковую конкатенацию className на `cn()`
- [ ] `frontend/components/ErrorBoundary.tsx`: `bg-slate-900` → `bg-[var(--color-primary)]`
- [ ] `frontend/components/Layout.tsx` строки 39-46 (`getLinkClasses`): заменить hardcoded `bg-slate-*`, `text-slate-*` на CSS переменные. Также sidebar logo/nav

### 4.2 Views

- [ ] `frontend/views/Login.tsx`: все `bg-slate-50`, `bg-white`, `border-slate-*`, `text-slate-*` → CSS переменные
- [ ] `frontend/views/Dashboard.tsx`: все hardcoded цвета (grep `bg-white|text-slate-|border-slate-|bg-slate-`)
- [ ] `frontend/views/QuickInput.tsx`: `bg-white/90`, `bg-white`, `border-slate-*`, `text-slate-*`
- [ ] `frontend/views/Settings.tsx`: `bg-white`, `border-slate-*`, `text-slate-*`
- [ ] `frontend/views/Kitchens.tsx`: `bg-white`, `border-slate-*`, `text-slate-*`
- [ ] `frontend/views/Products.tsx`: `bg-white`, `border-slate-*`, `text-slate-*`
- [ ] `frontend/views/superadmin/AdminDashboard.tsx`: все hardcoded цвета

### 4.3 Light Theme Polish

- [ ] В `frontend/index.html` CSS переменные `:root`: обновить `--shadow-card` для более premium тени:
```css
--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
```
- [ ] Обновить hover-эффекты: добавить `transition-all duration-200` на карточки и кнопки где не хватает
- [ ] Sidebar: добавить subtle `border-r border-[var(--border-light)]` вместо shadow для разделения

**Проверка**: `cd frontend && npm run build`. Визуально проверить dark/light theme на каждой странице.

**Коммит**: `fix(theme): заменить 141+ hardcoded цветов на CSS переменные, polish light theme`

- [ ] Phase 4 complete

---

## Phase 5: Frontend DataContext & API Client Stability

**Проблема**: DataContext value не мемоизирован — cascade re-renders всех consumers. Нет AbortController для отмены запросов при навигации. Token refresh race condition при двух параллельных 401.

### 5.1 useMemo для DataContext value

- [ ] В `frontend/context/DataContext.tsx` строка 344-380: обернуть объект value в `useMemo` с правильным dependency array

### 5.2 useCallback для action handlers

- [ ] В `frontend/context/DataContext.tsx`: обернуть все handler функции (addKitchen, updateKitchen, deleteKitchen, etc.) в `useCallback`

### 5.3 AbortController в fetchData

- [ ] В `frontend/context/DataContext.tsx` useEffect: добавить `AbortController`, передать `signal` в запросы, `controller.abort()` в cleanup

### 5.4 Token refresh: promise-based lock

- [ ] В `frontend/api/client.ts`: добавить `let refreshPromise: Promise<string> | null = null` — при первом 401 создать promise для refresh, при параллельных 401 переиспользовать тот же promise
```ts
if (!refreshPromise) {
  refreshPromise = axios.post(...).then(({data}) => {
    localStorage.setItem('km_access_token', data.access);
    if (data.refresh) localStorage.setItem('km_refresh_token', data.refresh);
    return data.access;
  }).finally(() => { refreshPromise = null; });
}
const newToken = await refreshPromise;
```

### 5.5 ChartTooltip из render scope

- [ ] В `frontend/views/Dashboard.tsx`: вынести `ChartTooltip` за пределы компонента Dashboard — определить как отдельный компонент или `React.memo`'d функцию на уровне модуля

**Проверка**: `cd frontend && npm run build`

**Коммит**: `fix(frontend): memoize DataContext, AbortController, token refresh lock, extract ChartTooltip`

- [ ] Phase 5 complete

---

## Phase 6: i18n — Непереведённые строки + Hardcoded Labels

**Проблема**: 30+ строк на English/Russian/Uzbek hardcoded в views, не проходящие через систему переводов. OPERATION_TYPES в constants.ts с Uzbek-only labels. ErrorBoundary hardcoded Russian.

### 6.1 LanguageContext: добавить ключи

- [ ] Добавить в `frontend/context/LanguageContext.tsx` ключи для EN/RU/UZ:
  - Login: "Demo Credentials", "Client Admin", "Kitchen Staff", form labels
  - Settings: billing strings (если остались), "Enterprise" plan features, "Edit Member", "Save Member"
  - Products: "Categories", "Cancel", "Delete", "Manage Categories", "New Category Name..."
  - Kitchens: "Pro Plan Includes:", "Advanced Analytics", "Priority Support", "Cancel"
  - AdminDashboard: все English-only строки

### 6.2 Заменить hardcoded строки в views

- [ ] `frontend/views/Login.tsx`: все hardcoded → `t('key')`
- [ ] `frontend/views/Settings.tsx`: все оставшиеся hardcoded
- [ ] `frontend/views/Products.tsx`: "Categories", "Cancel", "Delete", "Manage Categories"
- [ ] `frontend/views/Kitchens.tsx`: "Pro Plan Includes:", "Cancel"
- [ ] `frontend/views/superadmin/AdminDashboard.tsx`: все English-only строки

### 6.3 OPERATION_TYPES: i18n labels

- [ ] В `frontend/constants.ts`: заменить hardcoded Uzbek labels на функцию `getOperationTypes(t)` или использовать ключи из LanguageContext
- [ ] Обновить все места использования OPERATION_TYPES

### 6.4 ErrorBoundary: i18n без хуков

- [ ] В `frontend/components/ErrorBoundary.tsx`: читать `km_lang` из localStorage и выбирать текст из статического объекта `{ en: {...}, ru: {...}, uz: {...} }`

**Проверка**: `cd frontend && npm run build`. Переключить язык на каждой странице.

**Коммит**: `feat(i18n): перевести 30+ строк, i18n для OPERATION_TYPES и ErrorBoundary`

- [ ] Phase 6 complete

---

## Phase 7: Accessibility — Modal ARIA, Focus Trap, ConfirmModal, Loading States

**Проблема**: Modal без `role="dialog"` / `aria-modal` / focus trap. Нет loading states в Kitchens, Products, Settings billing. `window.confirm()` не accessible.

### 7.1 Modal.tsx: ARIA атрибуты

- [ ] Добавить `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`
- [ ] На `<h3>` заголовок: `id="modal-title"`

### 7.2 Modal.tsx: Focus trap

- [ ] При `isOpen` фокус на первый focusable элемент
- [ ] Tab/Shift+Tab циклит внутри модалки
- [ ] Escape закрывает модалку

### 7.3 Loading states

- [ ] `frontend/views/Kitchens.tsx`: показать `<Skeleton />` при `loading` из DataContext
- [ ] `frontend/views/Products.tsx`: аналогично
- [ ] `frontend/views/Settings.tsx` (billing tab): показать loading при загрузке заказов

### 7.4 ConfirmModal компонент

- [ ] Создать `frontend/components/ConfirmModal.tsx` — accessible confirmation dialog (title, message, onConfirm, onCancel, variant: "danger" | "warning")
- [ ] Использовать вместо inline confirm-подобных паттернов в Kitchens.tsx, Products.tsx, Settings.tsx (delete actions)

**Проверка**: `cd frontend && npm run build`

**Коммит**: `feat(a11y): Modal ARIA + focus trap, loading states, ConfirmModal`

- [ ] Phase 7 complete

---

## Phase 8: TypeScript Strictness & Type Safety

**Проблема**: Нет `strict: true` в tsconfig. 4 места с `any`. API сервисы типизированы как `Record<string, unknown>`.

### 8.1 tsconfig.json: strict mode

- [ ] Добавить `"strict": true` в compilerOptions
- [ ] Исправить все ошибки компиляции (implicit any, null checks, etc.)

### 8.2 Убрать any

- [ ] `frontend/views/Kitchens.tsx:40`: `kitchen: any` → `Kitchen`
- [ ] `frontend/views/Products.tsx:72`: `product: any` → `Product`
- [ ] `frontend/views/QuickInput.tsx:277`: `value: any` → правильный union type (`string | number`)
- [ ] `frontend/views/superadmin/AdminDashboard.tsx:259`: `as any` → правильный enum cast

### 8.3 API сервисы типизация

- [ ] Заменить `Record<string, unknown>` на конкретные типы в: `kitchens.ts`, `organizations.ts`, `operations.ts`, `users.ts`, `categories.ts`, `products.ts`
- [ ] Обновить DataContext: убрать `as Record<string, unknown>` casts (11 мест)

### 8.4 QuickInput мемоизация

- [ ] В `frontend/views/QuickInput.tsx`: добавить `useMemo` для фильтрованных списков, `useCallback` для event handlers

**Проверка**: `cd frontend && npm run build` — 0 ошибок в strict mode

**Коммит**: `refactor(ts): strict mode, убрать any, типизировать API, мемоизация QuickInput`

- [ ] Phase 8 complete

---

## Phase 9: Backend Test Coverage — Недостающие Сценарии

**Проблема**: Нет тестов для User CRUD, Export Excel, KitchenReport xlsx, Payme timeout, новых валидаций из Phase 1.

### 9.1 User CRUD тесты

- [ ] В `backend/tests/test_auth.py` или новый `test_users.py`: TENANT_ADMIN creates user → 201, KITCHEN_USER creates user → 403, update user → 200, delete user → 204

### 9.2 Export Excel

- [ ] В `backend/tests/test_operations.py`: GET /api/operations/export/ → 200 + content-type xlsx, с фильтрами → правильная фильтрация

### 9.3 KitchenReport xlsx

- [ ] В `backend/tests/test_analytics.py`: GET /api/analytics/kitchen-report/?format=xlsx → 200 + xlsx content-type

### 9.4 Payme timeout

- [ ] В `backend/tests/test_payments.py`: `PaymeTransaction.is_timed_out` — True после 12h, False до 12h

### 9.5 Phase 1 валидации

- [ ] В `backend/tests/test_payments.py`: создание второго PENDING заказа → 400, заказ на текущий план → 400

### 9.6 TenantCreateMixin с несуществующим org_id

- [ ] В `backend/tests/test_permissions.py`: SUPER_ADMIN POST с organization=99999 → 400 (не 500)

**Проверка**: `cd backend && uv run pytest -v --tb=short`

**Коммит**: `test: User CRUD, Excel export, xlsx, Payme timeout, duplicate order, org validation`

- [ ] Phase 9 complete

---

## Phase 10: Code Quality Cleanup

**Проблема**: Мелкие quality issues — stable React keys, ruff warnings, build warnings.

### 10.1 Stable React keys

- [ ] `frontend/views/Settings.tsx`: `key={i}` → `key={feature}` (или stable id) для features list

### 10.2 Ruff cleanup

- [ ] `cd backend && uv run ruff check --fix .`

### 10.3 Frontend build warnings

- [ ] `cd frontend && npm run build` — исправить все warnings

### 10.4 Skeleton.tsx: cn()

- [ ] `frontend/components/Skeleton.tsx`: заменить строковую конкатенацию на `cn()` (если не сделано в Phase 4)

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v && cd ../frontend && npm run build`

**Коммит**: `chore: stable React keys, ruff fixes, build warnings cleanup`

- [ ] Phase 10 complete

---

## Final Verification

После всех фаз:
```bash
# Backend
cd backend
uv run python manage.py check
uv run python manage.py makemigrations --check
uv run pytest -v

# Frontend
cd ../frontend
npm run build

# Docker
cd ..
docker compose -f docker-compose.coolify.yml config
```

- [ ] ALL PHASES COMPLETE
