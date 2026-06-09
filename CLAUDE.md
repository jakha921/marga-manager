# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Marga Manager — SaaS система управления кухней и инвентарём для ресторанов. Multi-tenant архитектура с ролевой моделью доступа. Deployed on Coolify at `marga.fullfocus.dev`.

## Commands

### Backend (from `backend/` directory)
```bash
uv run python manage.py runserver          # Dev server (port 8000)
uv run python manage.py migrate            # Apply migrations
uv run python manage.py makemigrations     # Generate migrations
uv run python manage.py seed_data          # Seed demo data (2 orgs, 3 users, products, operations)
uv run python manage.py seed_data --clear  # Clear and re-seed
uv run pytest -v                           # Run all tests
uv run pytest -k test_name                 # Run specific test
uv run pytest tests/test_auth.py           # Run test file
uv run ruff check --fix .                  # Lint and fix
```

### Frontend (from `frontend/` directory)
```bash
npm run dev      # Dev server (port 3000)
npm run build    # Production build
```

### Celery (Background Tasks)
```bash
celery -A config worker -l info                    # Start worker
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler  # Start beat
```
Tasks: `expire_stale_orders_task` (hourly), `check_expiring_subscriptions_task` (09:00 daily), `downgrade_expired_subscriptions_task` (00:00 daily).
Broker: Redis via `CELERY_BROKER_URL`.

### Docker (from project root)
```bash
make dev         # docker-compose up --build (dev)
make prod        # docker-compose -f docker-compose.prod.yml up --build -d
make test        # pytest via uv
```

## Architecture

### Stack
- **Backend**: Django 5.1 + DRF + SimpleJWT + Unfold Admin
- **Frontend**: React 19 + TypeScript + Vite (no `src/` dir — files at `frontend/` root)
- **DB**: SQLite (dev via `config.settings.dev`), PostgreSQL 16 (prod via `config.settings.prod`)
- **Styling**: Tailwind CSS via CDN, configured inline in `frontend/index.html`
- **State**: React Context only (AuthContext, DataContext, LanguageContext) — no Zustand/Redux

### Multi-Tenancy
Every data model inherits `TenantModel` (adds `organization` FK). Isolation enforced at three layers:
1. **Middleware** (`apps/core/middleware.py` — `OrganizationMiddleware`) — sets `request.organization` from `user.organization`. Runs after `AuthenticationMiddleware`.
2. **ViewSet mixins** (`apps/core/mixins.py`) — `TenantQuerySetMixin` filters queryset by org, `TenantCreateMixin` auto-sets org on create
3. **SUPER_ADMIN bypass** — sees all orgs, can override org on create via request body

**Cross-FK validation**: `OperationEntrySerializer.validate()` checks that `kitchen`, `to_kitchen`, and `product` belong to the user's org. SUPER_ADMIN bypasses this check.

**Null-org users**: Users without `organization=None` get `PermissionDenied` (403) on analytics endpoints; CRUD endpoints return `qs.none()` (empty 200).

### Roles (hierarchy: SUPER_ADMIN > TENANT_ADMIN > KITCHEN_USER)
- `SUPER_ADMIN` — platform-wide access, routed to `/admin/*` in frontend
- `TENANT_ADMIN` — full CRUD within own organization
- `KITCHEN_USER` — data entry only (QuickInput, Products read)

Permission classes in `apps/core/permissions.py`: `IsSuperAdmin`, `IsTenantAdmin`, `IsTenantAdminOrReadOnly`, `IsKitchenUserOrAbove`.

### API Conventions
- All endpoints under `/api/` with trailing slashes
- **CamelCase JSON ↔ snake_case Python** via `djangorestframework-camel-case` (global, applied to all responses)
- JWT auth: 12h access / 7d refresh with rotation; custom token adds `role`, `org_id`, `full_name` claims
- Pagination: 200 items/page, max 500 (`StandardResultsSetPagination` in `apps/core/pagination.py`)
- Swagger docs at `/api/docs/`, health check at `/api/health/`

### Django Apps
| App | Purpose | Key models |
|-----|---------|------------|
| `accounts` | Auth, users, JWT | `User(AbstractUser)` with `Role` enum |
| `organizations` | Tenant management | `Organization` with Plan, user/kitchen limits |
| `kitchens` | Location management | `Kitchen` |
| `products` | Inventory catalog | `Category`, `Product` (code unique per org) |
| `operations` | Transaction ledger | `OperationEntry` (INCOMING/DAILY/TRANSFER/SALE) |
| `payments` | Billing & subscriptions | `Order`, `PaymeTransaction`, `PlanConfig`, `AuditLog`, `Subscription` |
| `core` | Shared utilities | Abstract models, mixins, permissions, middleware |

Settings split: `config/settings/base.py` → `dev.py` (SQLite) / `prod.py` (PostgreSQL + security headers). DRF config isolated in `config/drf_settings.py`.

### Frontend Structure
```
frontend/
  api/client.ts       — Axios instance with JWT Bearer interceptor + auto-refresh on 401
  api/services/       — One file per resource (auth, analytics, categories, kitchens,
                        operations, organizations, products, users) — all CRUD pattern
  components/         — Button, Input, Select, Modal, Layout, DateFilter, StatsCard
  context/            — AuthContext, DataContext (central data store), LanguageContext
  views/              — Page components; QuickInput.tsx (~1000 lines) is the main entry form
  types.ts            — All TypeScript interfaces
  utils.ts            — formatDate, formatNumber, parseNumber, formatCompactNumber
  App.tsx             — HashRouter with role-based route guards (ProtectedRoute, SuperAdminRoute)
```

Frontend auth state is in localStorage under keys prefixed `km_` (`km_access_token`, `km_refresh_token`, `km_role`, `km_org_id`, `km_lang`).

### Key Data Flows
- **Analytics** — server-aggregated at `/api/analytics/kitchen-report/` (beginning/end balance, markup, transfers); never computed on frontend
- **Excel export** — `openpyxl` on backend; frontend triggers via `operationsService.exportExcel()` and `analyticsService.getKitchenReportXlsx()`
- **DataContext** fetches all data on auth change with `page_size=1000`; frontend is effectively a client-side cache of the full org's dataset

### i18n
Three languages: English (`en`), Russian (`ru`), Uzbek (`uz`). Translations inline in `context/LanguageContext.tsx`. Default language: `uz`. Persisted in localStorage.

## Environment Variables
See `.env.example`. Key vars:
- `DJANGO_SETTINGS_MODULE` — `config.settings.dev` or `config.settings.prod`
- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT` (prod only)
- `CORS_ALLOWED_ORIGINS`
- `VITE_API_URL` — API base URL for frontend (dev: `http://localhost:8000/api`, prod: `/api`)
- `GEMINI_API_KEY` — Google GenAI integration (frontend, exposed via Vite define)

## Subscription & Billing

- `Organization.plan_expires_at` — set to `now + 30 days` on each payment
- **Grace period**: 7 days after expiry before automatic downgrade to BASIC
- **AuditLog**: records all state changes for `Order`, `PaymeTransaction`, and `Organization.plan`
- **Subscription model**: historical record created on each `mark_as_paid()`
- Frontend shows expiry banner in `Layout.tsx` (yellow: ≤7 days; red: expired)
- See `docs/subscription-lifecycle.md` for full flow

## CI/CD
GitHub Actions (`.github/workflows/ci-cd.yml`): ruff lint → pytest → Docker build+push (`jakha921/marga-backend:latest`, `jakha921/marga-frontend:latest`) → Coolify deploy → health poll → smoke tests → Telegram notification.

## Test Credentials (seed_data)
- `dev` / `dev123` — SUPER_ADMIN
- `admin` / `admin123` — TENANT_ADMIN (Marga Kitchen org)
- `cook` / `cook123` — KITCHEN_USER (Marga Kitchen org)
