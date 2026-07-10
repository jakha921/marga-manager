# Admin, Visual, And Payments Audit

Date: 2026-07-06
Mode: verified local audit, no commit/push/deploy, no real Payme payment.

## Summary

Admin data and core super-admin functions work locally. Normal URLs without `#` work for `/admin`, `/admin/organizations/8`, `/admin/audit-log`, and `/settings`.

Payments are implemented with good core checks: plan prices come from backend, invalid amount is rejected, a valid order is created as `PENDING`, and sandbox checkout returns Payme POST fields with matching amount and `account[order_id]`.

Main production risks are not backend blockers, but they matter for SaaS readiness:

- Local Payme merchant/key are empty, so real checkout is not ready until env is configured.
- Mobile admin is cramped: data loads correctly, but cards/table are too narrow visually.
- Billing page still has mixed-language copy and comma price format (`49,000 UZS`) instead of a friendlier local format.
- Admin dashboard MRR currently includes suspended organizations; confirm whether suspended tenants should count as monthly revenue.
- Tailwind CDN warning remains in browser console and should be a production-hardening item.

## Data Checked

- Organizations: 2
- `Marga Kitchen`: `PRO`, `ACTIVE`, MRR `500000`, 3 kitchens, 2 users, 20 products, 100 operations.
- `Oqtepa Lavash`: `BASIC`, `SUSPENDED`, MRR `300000`.
- Dashboard metrics: total tenants `2`, monthly revenue `$800,000`, active rate `50%`, licensed users `30`.
- Audit log: 9 rows; old/new values are shown in `До` / `После` columns.
- Plans: `BASIC` 0 UZS, `PRO` 49 000 UZS, `ENTERPRISE` 199 000 UZS.
- Tenant payment history: 0 orders, 0 subscriptions.

## Functional Smoke

Passed:

- Temporary organization create/edit/search/detail.
- Temporary user create/edit/delete.
- Temporary organization suspend/activate.
- Audit log filtering by event type.
- Payment invalid amount validation returned 400.
- Valid `ENTERPRISE` payment order was created as `PENDING`.
- Sandbox checkout response returned `method=POST`, Payme URL, `amount`, `account[order_id]`, `callback`, and `merchant` fields.
- Cleanup verified no `Codex Audit` organizations, no `audit_` users, no temporary audit logs, and no pending temporary orders.

Payment caveat:

- `merchant` field is present but empty in local dev because `PAYME_MERCHANT_ID` is not configured. Production settings now fail fast for missing Payme env vars, which is the right behavior before deploy.

## Visual Evidence

- `admin-desktop.png`: admin dashboard desktop.
- `admin-mobile.png`: admin dashboard mobile.
- `admin-detail-desktop.png`: organization detail desktop.
- `admin-audit-desktop.png`: audit log desktop.
- `billing-desktop.png`: billing tab desktop.
- `billing-mobile.png`: billing tab mobile.
- `playwright-results.json`: browser state checks, overflow checks, and console warnings.

## Visual Findings

Passed:

- Desktop admin dashboard shows current organizations, statuses, metrics, and action buttons.
- Organization detail shows counts and tabs correctly.
- Audit log shows event rows and old/new values.
- Billing desktop/mobile shows current plan, tariffs, prices, and upgrade action.
- Browser checks found no horizontal page overflow and no `NaN`/`undefined` after data load.

Needs improvement:

- Mobile admin is technically loaded but visually weak: sidebar stays wide and content cards/table become narrow. For production polish, use stacked mobile cards or a clear horizontal table scroller.
- Admin dashboard briefly can render empty metrics before data arrives. Add a loading/zero guard so active rate never flashes `NaN%`.
- Billing text is partly English: `CURRENT PLAN`, `Basic Reporting`, `Enterprise`, `Unlimited Everything`, `Dedicated API`, `SLA`, `Custom Onboarding`.
- Billing price format uses comma separators. For RU/UZ users, prefer `49 000 UZS` and `199 000 UZS`.
- Empty payment history is hidden. Add a simple empty state such as "Платежей пока нет".
- Audit old/new JSON is truncated. For support use, add expand/copy details for a row.

## Commands

- `cd backend && uv run pytest tests/test_payments.py -q` -> `61 passed`
- `cd backend && uv run pytest tests/test_saas_hardening.py -q` -> `6 passed`
- `cd backend && uv run python manage.py check` -> passed
- `cd frontend && npm run build` -> passed

## Recommended Next Batch

1. Fix mobile admin layout with stacked cards/table scroller.
2. Add dashboard loading/zero guard for metrics.
3. Localize billing/admin remaining English strings.
4. Format UZS prices with spaces.
5. Add billing empty-history state.
6. Confirm MRR rule for suspended tenants.
7. Configure Payme env in staging and run a sandbox callback smoke.
8. Replace Tailwind CDN in production build setup.
