# Subscription Lifecycle

## Payment → Activation Flow

1. `TENANT_ADMIN` creates an `Order` via `POST /api/payments/orders/`
2. Frontend redirects to Payme checkout URL
3. Payme calls `CreateTransaction` webhook → Order status → `PAYING`
4. Payme calls `PerformTransaction` webhook → `Order.mark_as_paid()`:
   - Order status → `PAID`
   - `org.plan` updated to `target_plan`
   - `org.max_kitchens` / `org.max_users` updated from `PlanConfig`
   - `org.plan_started_at = now`
   - `org.plan_expires_at = now + 30 days`
   - `Subscription` record created (status=ACTIVE)
   - `AuditLog` records `ORDER_STATE_CHANGE` and `PLAN_CHANGE`

## Expiry Checking (Daily 09:00)

Task: `check_expiring_subscriptions_task`

- Finds orgs where `plan_expires_at <= now + 3 days` AND plan != BASIC
- Logs a WARNING for each expiring org
- Frontend shows a **yellow banner** when `plan_expires_at` is within 7 days

## Grace Period: 7 Days

After `plan_expires_at` passes, the org still has full access for 7 days.

## Downgrade (Daily 00:00)

Task: `downgrade_expired_subscriptions_task`

- Finds orgs where `plan_expires_at < now - 7 days` AND plan != BASIC
- For each org:
  1. Sets `org.plan = "BASIC"`
  2. Restores `max_kitchens` / `max_users` from `PlanConfig("BASIC")`
  3. Sets `org.mrr = 0`, `org.plan_expires_at = None`
  4. Creates `AuditLog` with `PLAN_REVERT` and `reason="subscription_expired_grace_period"`

## Frontend Expiry Banner (`Layout.tsx`)

| Condition | Banner |
|-----------|--------|
| `plan_expires_at` within 7 days | Yellow warning with date and Renew link |
| `plan_expires_at` in the past | Red error with Renew link |
| Plan is `BASIC` (free) | No banner |
| No `plan_expires_at` | No banner |

Banner links to `#/settings` for payment.

## Renewal

A renewal creates a **new Order**. On `PerformTransaction`:
- `plan_expires_at` is extended by 30 days from `now` (not from previous expiry)
- A new `Subscription` record is created
- Previous subscription record remains with status `ACTIVE` (historical record)

## Celery Schedule

| Task | Schedule | Purpose |
|------|----------|---------|
| `expire_stale_orders_task` | Every hour | Move PENDING/PAYING orders older than 12h → EXPIRED |
| `check_expiring_subscriptions_task` | Daily 09:00 | Log warning for orgs expiring in ≤3 days |
| `downgrade_expired_subscriptions_task` | Daily 00:00 | Downgrade orgs after 7-day grace period |
