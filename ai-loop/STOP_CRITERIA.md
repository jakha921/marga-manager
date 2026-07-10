# STOP_CRITERIA

## Stop And Ask Before

- Commit, push, PR, deploy, merge, force/delete git actions.
- Adding production dependencies.
- Public API changes, database schema changes, or migrations.
- Editing secrets, env files, credentials, generated files, or vendor files.
- Accessing production/private systems.
- Expanding beyond guest landing, local role/responsive verification, reported client bugfixes, and SaaS risk notes.
- Continuing after two focused attempts fail to make local auth or smoke tests runnable.

## Completion Criteria

- Guest `/` shows a SaaS landing page.
- Authenticated `/` still routes users by role without breaking existing pages.
- Frontend build passes or the failure is clearly reported.
- Role smoke test notes exist for guest, SUPER_ADMIN, TENANT_ADMIN, and KITCHEN_USER.
- Desktop/mobile responsive check notes exist.
- `ai-loop/TODO.md` records commands, results, and remaining risk.

## Task-Specific Checks

- [x] Guest: `/` landing and `/login` reachable.
- [x] SUPER_ADMIN: `dev/dev123` reaches admin dashboard.
- [x] TENANT_ADMIN: `admin/admin123` reaches tenant dashboard/settings/resources.
- [x] KITCHEN_USER: `cook/cook123` reaches quick input/products and is blocked from tenant admin pages.
- [x] Responsive: landing and core role pages usable at desktop and mobile widths.

## Batch 2 Checks

- [x] Products modal input keeps focus after typing multiple characters.
- [x] Operations API returns a deterministic newest-first order for same date/time.
- [x] Latest incoming price uses the newest created incoming entry when date/time tie.
- [x] Login production build does not show demo credentials.
- [x] Telegram bot remains a spec unless dependency/workers are explicitly approved.
- [x] Payment/security changes remain small and covered by notes/tests.

## Batch 7 Checks

- [x] Admin audit remains local-only.
- [x] No real Payme transaction is executed.
- [x] Temporary organization, user, audit rows, and order are cleaned up.
- [x] Screenshots and browser results are stored in `ai-loop/outputs/admin-payment-audit/`.
- [x] Payment readiness risks are recorded before any deploy.

## Batch 8 Checks

- [x] Landing remains frontend-only.
- [x] Client-approved quick-entry card remains visible.
- [x] Client-rejected landing blocks are no longer rendered.
- [x] No pricing/payment text is added before client provides prices.
- [x] Browser screenshots are stored in `ai-loop/outputs/landing-audit/`.

## Batch 10 Checks

- [x] Public signup creates only a tenant admin and its own organization.
- [x] Trial defaults to 14 days.
- [x] Expired unpaid organizations are restricted, not converted into free access.
- [x] Restricted owners can still open billing and payment.
- [x] Onboarding requires only first branch creation.
- [x] No new dependencies, commit, push, PR, or deploy.
