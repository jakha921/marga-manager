# Marga Manager — Ralph Loop Task List

## Запуск
```bash
ralph-loop:ralph-loop "Прочитай PROMPT.md (/Users/jakha/Programming/Django/marga-manager/PROMPT.md). Найди первую незавершённую задачу [ ]. Выполни её полностью — создай файлы, напиши код, запусти проверку (uv run python manage.py check для бэкенда, npm run build для фронтенда). Отметь [x] в PROMPT.md. Закоммить изменения. Повторяй до ALL PHASES COMPLETE." --max-iterations 70 --completion-promise "ALL PHASES COMPLETE" /compact /senior-qa /senior-backend /senior-frontend /frontend-design:frontend-design /server-advisor
```

---

## Порядок выполнения

1. Phase 1 — Button fix (устраняет баг с цветом, база для всех UI-фаз)
2. Phase 2 — Light/Dark Theme System
3. Phase 3 — i18n completeness
4. Phase 4 — Frontend UX (loading states, error boundary, accessibility)
5. Phase 5 — Backend security hardening
6. Phase 6 — N+1 & performance fixes
7. Phase 7 — Backend test coverage
8. Phase 8 — Code quality cleanup

---

## Phase 1: Fix Tailwind Class Conflicts — `cn()` utility + Button

**Баг**: Кнопка "Excelga eksport" меняет цвет после обновления страницы. Причина: `Button.tsx:35`
конкатенирует классы строкой — `bg-white` (из `secondary` variant) конкурирует с `bg-emerald-50`
(из custom `className` prop). Tailwind CDN разрешает конфликты по порядку в своём stylesheet,
а не в HTML — результат непредсказуем между рендерами.

**Решение**:
1. Установить `tailwind-merge` и `clsx`:
   ```bash
   cd frontend && npm install tailwind-merge clsx
   ```
2. Создать `frontend/utils/cn.ts`:
   ```ts
   import { twMerge } from 'tailwind-merge';
   import { clsx, type ClassValue } from 'clsx';
   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   ```
3. Обновить `frontend/components/Button.tsx` — заменить строковую конкатенацию на `cn()`:
   ```tsx
   import { cn } from '../utils/cn';
   // ...
   className={cn(baseStyles, variants[variant], sizes[size], widthClass, className)}
   ```
4. Применить `cn()` во всех компонентах: `Input.tsx`, `Select.tsx`, `Modal.tsx`, `Layout.tsx`.
5. Убедиться что `Dashboard.tsx:277` и `Settings.tsx:365` корректно переопределяют цвета.

**Проверка**: `cd frontend && npm run build`

**Коммит**: `fix: добавить tailwind-merge для правильного разрешения конфликтов CSS классов`

- [x] Phase 1 complete

---

## Phase 2: Light/Dark Theme System

**Задача**: Добавить красивую светлую и тёмную тему, переключатель Sun/Moon в header,
сохранение выбора в localStorage под ключом `km_theme`.

### 2.1 CSS переменные в `frontend/index.html`

Добавить в `<style>` секцию:
```css
:root {
  --bg-primary: #f1f5f9;
  --bg-surface: #ffffff;
  --bg-surface-2: #f8fafc;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --border-light: #f1f5f9;
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  --color-primary: #0f172a;
  --color-accent: #10b981;
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-surface: #1e293b;
  --bg-surface-2: #162032;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --border-color: #334155;
  --border-light: #1e293b;
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3);
  --color-primary: #f1f5f9;
  --color-accent: #10b981;
}
```

Обновить `body` стиль: `background-color: var(--bg-primary); color: var(--text-primary);`

### 2.2 ThemeContext `frontend/context/ThemeContext.tsx`

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('km_theme') as Theme) ?? 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('km_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### 2.3 Обернуть App в ThemeProvider (`frontend/App.tsx`)

```tsx
import { ThemeProvider } from './context/ThemeContext';
// обернуть всё:
<ThemeProvider>
  <AuthProvider>
    ...
  </AuthProvider>
</ThemeProvider>
```

### 2.4 Кнопка переключения темы в Layout (`frontend/components/Layout.tsx`)

Добавить рядом с language switcher:
```tsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const { theme, toggleTheme } = useTheme();
// ...
<button
  onClick={toggleTheme}
  aria-label="Toggle theme"
  className="p-2 rounded-xl hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] transition-colors"
>
  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
</button>
```

### 2.5 Обновить ключевые компоненты с CSS переменными

Минимальные замены в `Layout.tsx`, `Button.tsx` (secondary variant), `Input.tsx`, `Select.tsx`,
`Modal.tsx`, заголовки и фон таблиц в `Dashboard.tsx`, `QuickInput.tsx`, `Settings.tsx`:

| Tailwind класс | CSS переменная |
|---|---|
| `bg-white` | `bg-[var(--bg-surface)]` |
| `bg-slate-50` / `bg-slate-50/80` | `bg-[var(--bg-surface-2)]` |
| `bg-slate-100` | `bg-[var(--bg-surface-2)]` |
| `text-slate-800`, `text-slate-900` | `text-[var(--text-primary)]` |
| `text-slate-500`, `text-slate-600` | `text-[var(--text-secondary)]` |
| `text-slate-400` | `text-[var(--text-muted)]` |
| `border-slate-100` | `border-[var(--border-light)]` |
| `border-slate-200` | `border-[var(--border-color)]` |

### 2.6 Исправить hardcoded chart цвета в Dashboard.tsx

Заменить `backgroundColor: '#18181b'` в tooltip на CSS переменные через `useTheme()`:
```tsx
const { theme } = useTheme();
const tooltipBg = theme === 'dark' ? '#1e293b' : '#ffffff';
const tooltipBorder = theme === 'dark' ? '#334155' : '#e2e8f0';
```

**Проверка**: `cd frontend && npm run build`. Переключить тему — всё меняется плавно.

**Коммит**: `feat: добавить Light/Dark тему с CSS переменными и ThemeContext`

- [x] Phase 2 complete

---

## Phase 3: i18n — Заполнить недостающие переводы

**Проблема**: 20+ hardcoded строк на английском в QuickInput.tsx, Settings.tsx, Dashboard.tsx
не проходят через систему переводов.

**Файлы**: `frontend/context/LanguageContext.tsx`, все view файлы.

**Решение**: Добавить в `LanguageContext.tsx` следующие ключи для EN/RU/UZ:

```
# QuickInput
qi.edit_entry      — "Edit Entry" / "Редактировать" / "Tahrirlash"
qi.date            — "Date" / "Дата" / "Sana"
qi.time            — "Time" / "Время" / "Vaqt"
qi.product_details — "Product Details" / "Детали продукта" / "Mahsulot tafsilotlari"
qi.quantity        — "Quantity" / "Количество" / "Miqdor"
qi.unit_price      — "Unit Price" / "Цена за ед." / "Birlik narxi"
qi.total_price     — "Total Price" / "Итого" / "Jami narx"
qi.delete_confirm  — "Are you sure you want to delete this operation?" / "Вы уверены?" / "O'chirilsinmi?"

# Settings billing
set.billing.desc        — "Manage your subscription and billing details." / "Управление подпиской." / "Obunani boshqarish."
set.billing.history     — "Payment History" / "История платежей" / "To'lov tarixi"
set.billing.th_date     — "Date" / "Дата" / "Sana"
set.billing.th_plan     — "Plan" / "Тариф" / "Tarif"
set.billing.th_amount   — "Amount" / "Сумма" / "Summa"
set.billing.th_status   — "Status" / "Статус" / "Holat"
set.billing.recommended — "Recommended" / "Рекомендуем" / "Tavsiya"

# Settings profile
set.profile.identity — "Identity & Contact" / "Личные данные" / "Shaxsiy ma'lumotlar"
set.threshold_help   — "Setting this threshold highlights low-stock products in reports." / "Порог выделит продукты красным при низком остатке." / "Chegara past qoldiqli mahsulotlarni ajratib ko'rsatadi."

# Common
common.loading — "Loading..." / "Загрузка..." / "Yuklanmoqda..."
common.cancel  — "Cancel" / "Отмена" / "Bekor qilish"
common.save    — "Save" / "Сохранить" / "Saqlash"
common.edit    — "Edit" / "Редактировать" / "Tahrirlash"
common.delete  — "Delete" / "Удалить" / "O'chirish"
```

Заменить все hardcoded строки в JSX на `{t('key')}`.
Также заменить `"Loading..."` в `Dashboard.tsx:295` на `{t('common.loading')}`.

**Проверка**: `cd frontend && npm run build` + переключить язык и проверить каждую страницу.

**Коммит**: `feat: добавить недостающие переводы EN/RU/UZ для QuickInput, Settings, Dashboard`

- [x] Phase 3 complete

---

## Phase 4: Frontend UX — Error Boundary, Skeleton, Accessibility

### 4.1 Error Boundary

Создать `frontend/components/ErrorBoundary.tsx`:
```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
          <div className="text-center p-8 max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Что-то пошло не так
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Обернуть корневой `<App />` в `App.tsx` или `main.tsx`.

### 4.2 Skeleton Loading компонент

Создать `frontend/components/Skeleton.tsx`:
```tsx
interface SkeletonProps { rows?: number; className?: string; }

export function Skeleton({ rows = 5, className = '' }: SkeletonProps) {
  return (
    <div className={`p-4 space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-[var(--bg-surface-2)] rounded-xl" />
      ))}
    </div>
  );
}
```

Заменить `"Loading..."` в `Dashboard.tsx:295` на `<Skeleton rows={5} />`.

### 4.3 ARIA Labels для icon-only кнопок

В `QuickInput.tsx` для edit/delete кнопок добавить `aria-label`:
```tsx
<button aria-label={t('common.edit')} title={t('common.edit')} onClick={...}>
  <Edit size={14} />
</button>
<button aria-label={t('common.delete')} title={t('common.delete')} onClick={...}>
  <Trash2 size={14} />
</button>
```

### 4.4 Modal Accessibility

В `frontend/components/Modal.tsx` добавить `role`, `aria-modal`, `aria-label`.
Backdrop кнопка закрытия — `role="button"` и `aria-label="Close"`.

### 4.5 Исправить undefined `setEditUnitPrice`

`frontend/views/QuickInput.tsx` — найти вызов `setEditUnitPrice(...)` (строка ~273)
и заменить правильным setter `setEditUnitPriceStr(...)`.

**Проверка**: `cd frontend && npm run build`

**Коммит**: `feat: добавить ErrorBoundary, Skeleton loader, ARIA атрибуты, исправить undefined setter`

- [x] Phase 4 complete

---

## Phase 5: Backend Security Hardening

### 5.1 Password минимум 8 символов + валидация сложности

`backend/apps/accounts/serializers.py`:
```python
password = serializers.CharField(write_only=True, min_length=8)

def validate_password(self, value: str) -> str:
    if value.isdigit():
        raise serializers.ValidationError(
            "Пароль не может состоять только из цифр."
        )
    return value
```

### 5.2 DRF Throttling (rate limiting)

`backend/config/drf_settings.py`:
```python
'DEFAULT_THROTTLE_CLASSES': [
    'rest_framework.throttling.AnonRateThrottle',
],
'DEFAULT_THROTTLE_RATES': {
    'anon': '60/minute',
    'user': '300/minute',
    'login': '5/minute',
}
```

Создать `backend/apps/accounts/throttles.py`:
```python
from rest_framework.throttling import AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    rate = '5/minute'
    scope = 'login'
```

Применить на login view.

### 5.3 DEBUG и ALLOWED_HOSTS безопасные defaults

`backend/config/settings/base.py`:
```python
DEBUG = os.getenv("DEBUG", "0") == "1"  # было "1"
_hosts = os.getenv("ALLOWED_HOSTS", "")
ALLOWED_HOSTS: list[str] = [h.strip() for h in _hosts.split(",") if h.strip()]
```

В `dev.py` добавить:
```python
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]
```

### 5.4 Добавить комментарий к @csrf_exempt

`backend/apps/payments/payme_views.py:18`:
```python
@csrf_exempt  # Payme использует HTTP Basic auth — это CSRF-защита для данного endpoint
```

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v`

**Коммит**: `fix(security): password min 8, rate limiting, безопасные defaults DEBUG/ALLOWED_HOSTS`

- [x] Phase 5 complete

---

## Phase 6: Backend Performance — N+1 Fix + DB Indexes

### 6.1 N+1 в OrganizationSerializer

`backend/apps/organizations/views.py` — добавить annotate:
```python
from django.db.models import Count

queryset = Organization.objects.annotate(
    kitchen_count=Count('kitchens', distinct=True),
    user_count=Count('users', distinct=True),
)
```

`backend/apps/organizations/serializers.py` — использовать annotated поля:
```python
kitchen_count = serializers.IntegerField(read_only=True)
user_count = serializers.IntegerField(read_only=True)
```

### 6.2 DB Indexes для OperationEntry

`backend/apps/operations/models.py` — добавить в Meta:
```python
class Meta:
    indexes = [
        models.Index(fields=['organization', 'date'], name='operation_org_date_idx'),
        models.Index(fields=['organization', 'op_type'], name='operation_org_type_idx'),
        models.Index(
            fields=['organization', 'kitchen', 'date'],
            name='operation_org_kitchen_date_idx',
        ),
    ]
```

Запустить `uv run python manage.py makemigrations operations`.

### 6.3 ProductHistoryView — валидация product_id

`backend/apps/operations/views.py` (~line 184):
```python
from django.shortcuts import get_object_or_404
from apps.products.models import Product

product = get_object_or_404(
    Product, pk=product_id, organization=request.user.organization
)
```

**Проверка**: `cd backend && uv run python manage.py makemigrations && uv run python manage.py migrate && uv run pytest -v`

**Коммит**: `perf: исправить N+1 в OrganizationSerializer, добавить индексы БД, валидация product_id`

- [x] Phase 6 complete

---

## Phase 7: Backend Test Coverage

### 7.1 `backend/tests/test_categories.py` — Category CRUD

Написать тесты:
- TENANT_ADMIN создаёт категорию → 201
- KITCHEN_USER создаёт категорию → 403
- Категории изолированы по организации (другая org → пустой список)
- Update/Delete категории TENANT_ADMIN → 200/204

### 7.2 `backend/tests/test_analytics.py` — Analytics views

Написать тесты:
- `KitchenReportView` без параметров → 400
- `KitchenReportView` с `date_from`/`date_to` → 200 с полями `kitchens`, `totals`
- `KitchenReportView` пустые данные → нули, не crash
- `KitchenReportView` XLSX export → content-type `application/vnd.openxmlformats-officedocument`
- `DashboardView` → 200, возвращает `total_revenue`, `total_expense`, `operation_count`

### 7.3 Расширить `backend/tests/test_organizations.py`

Добавить:
- N+1 regression: list организаций делает ≤ 3 SQL запросов (через `assertNumQueries`)
- SUPER_ADMIN может изменить `plan` организации → 200

### 7.4 Rate limiting тест

```python
def test_login_rate_limit(self):
    for _ in range(5):
        self.client.post('/api/auth/login/', {...})
    response = self.client.post('/api/auth/login/', {...})
    self.assertEqual(response.status_code, 429)
```

**Проверка**: `cd backend && uv run pytest -v --tb=short`

**Коммит**: `test: добавить тесты для категорий, аналитики, N+1 regression, rate limiting`

- [ ] Phase 7 complete

---

## Phase 8: Code Quality Cleanup

### 8.1 TypeScript — убрать `as any` в api/client.ts

Создать `frontend/vite-env.d.ts` (если не существует):
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`frontend/api/client.ts`:
```ts
// убрать (import.meta as any).env
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

### 8.2 PlanConfigAdmin — убрать list_editable

`backend/apps/payments/admin.py`:
```python
# Убрать из list_editable поля price, max_kitchens, max_users, is_active
# Оставить только list_display — редактирование через форму (audit trail)
```

### 8.3 Очистить пустой middleware.py

`backend/apps/core/middleware.py` — добавить заглушку:
```python
# Reserved for future request middleware implementations
```

### 8.4 Исправить использование index как key в Settings.tsx

`frontend/views/Settings.tsx:349`:
```tsx
// Было: key={i}
// Стало: key={feature} (если feature — строка) или добавить stable id
plan.features.map((feature) => (
  <li key={feature} ...>
```

### 8.5 Ruff cleanup backend

```bash
cd backend && uv run ruff check --fix .
```

**Проверка**: `cd backend && uv run python manage.py check && uv run pytest -v && cd ../frontend && npm run build`

**Коммит**: `chore: code quality — TypeScript типы, убрать list_editable, стабильные React keys`

- [ ] Phase 8 complete

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
docker compose -f docker-compose.coolify.yml config
docker compose -f docker-compose.stage.yml config
```

- [ ] ALL PHASES COMPLETE
