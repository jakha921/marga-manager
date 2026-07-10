# Security And Payment Notes

## Applied In This Batch

- Removed production login credential hints from error copy.
- Hid demo credentials from production build with `import.meta.env.DEV`.
- Removed unused Vite-era `importmap` CDN mappings from `frontend/index.html`.
- Made operation ordering deterministic for same date/time.
- Made latest incoming price deterministic and returned `unit_price` in normal decimal format.

## Payment State

Current Payme implementation already has good basics:
- Payme webhook uses Basic auth with constant-time key compare.
- Empty `PAYME_MERCHANT_KEY` is blocked by tests.
- Create/perform/cancel flows are idempotent.
- `Order.mark_as_paid()` updates subscription state inside a DB transaction.
- Duplicate pending orders return the existing order.
- Audit logs exist for order, transaction, and plan changes.
- Subscription expiry/downgrade is handled by Celery tasks.

## Recommended Before Production Push

- Fail fast in `config.settings.prod` when `PAYME_MERCHANT_ID`, `PAYME_MERCHANT_KEY`, or `PAYME_CALLBACK_URL` is empty. Current prod only warns for callback.
- Require `PAYME_CALLBACK_URL` to be HTTPS in production.
- Confirm production `PAYME_CHECKOUT_URL=https://checkout.paycom.uz`; keep test URL only for stage/dev.
- Run one Payme sandbox end-to-end test after deployment: create order, checkout URL, Payme webhook create/perform, org plan update, audit log.
- Add deployment smoke that checks `/api/payments/plans/` and authenticated order creation.

## Security Backlog

- Replace Tailwind CDN with a normal Tailwind build pipeline. Browser currently warns that CDN Tailwind is not for production; this needs dependency/build setup, so it was not changed in this batch.
- Consider moving JWT from localStorage to httpOnly secure cookies. This is a larger auth/API change and should be separate.
- Add a strict Content Security Policy after Tailwind CDN is removed.
- Remove unused `@google/genai` package and GEMINI env plumbing if the product has no active AI feature.
- Add stable `order_by()` to paginated organizations/users querysets to remove DRF unordered pagination warnings.
- Add a small production readiness check command that validates env vars, Redis, Celery, Payme config, and DB migrations.
