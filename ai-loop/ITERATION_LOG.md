# ITERATION_LOG

## 2026-07-04

### Iteration 1

- Change: inspected project, confirmed route/scope/stop target, and set up task plan.
- Verification: project files and current routes inspected with shell reads.
- Result: implementation approved for guest landing at `/` plus role/responsive verification.
- Next: implement smallest frontend diff and verify locally.

### Iteration 2

- Change: added guest landing page and root-route split for guest/authenticated roles.
- Verification: pending frontend build and browser smoke.
- Result: implementation in progress.
- Next: run build, then verify guest and role flows locally.

### Iteration 3

- Change: hid product/category CRUD controls from KITCHEN_USER on Products page.
- Verification: `npm run build` passed after fix.
- Result: role issue found during smoke test and fixed.
- Next: save audit notes and review diff.

### Iteration 4

- Change: changed landing section jump from hash anchor to `scrollIntoView()` button to avoid HashRouter route conflicts.
- Verification: `npm run build` passed; browser check confirmed URL stays `/` and scroll reaches capabilities.
- Result: guest landing CTA behavior is stable.
- Next: final diff/log review.

### Iteration 5

- Change: accepted client screenshot feedback as Batch 2 scope and reproduced Products modal focus loss.
- Verification: browser showed active element moves from product name input to modal close button after typing one character.
- Result: root cause is shared Modal focus effect rerunning on parent state changes.
- Next: patch Modal, operation ordering/latest-price tie-breaks, and production login credential hints.

### Iteration 6

- Change: fixed Modal focus trap reruns, made operations newest-first deterministic, made latest incoming tie-break deterministic, normalized `unit_price`, hid production demo credentials, removed old importmap, and added notes for Telegram/security/payment.
- Verification: focused tests passed (`88 passed`), full backend suite passed (`227 passed, 8 existing warnings`), frontend build passed, no migration changes, production bundle had no demo credential matches, and `git diff --check` passed.
- Result: reported client bugs are fixed locally and SaaS risk notes are documented.
- Next: user review; no commit/push/deploy until requested.

### Iteration 7

- Change: started approved Batch 3, added hardening regression tests, fixed deterministic org/user pagination, made Payme prod env fail fast, updated landing copy/i18n, and removed unused Gemini/AI Studio scaffolding.
- Verification: `uv run pytest tests/test_saas_hardening.py -q` failed before the fix and passed after it; `npm run build` passed; browser smoke passed for RU desktop landing, UZ mobile landing, landing CTA/scroll, and QuickInput edit modal focus; full backend suite passed (`232 passed`); migration check, credential scan, npm audit, and `git diff --check` passed.
- Result: Batch 3 is locally verified.
- Next: user review; no commit/push/deploy until requested.

### Iteration 8

- Change: strengthened landing copy into calm B2B sales copy, focused on owner control over staff, inventory, sales, payments, and process discipline; removed fake-looking hero metrics.
- Verification: `npm run build` passed; browser smoke passed for RU desktop and UZ mobile with no horizontal overflow.
- Result: copywriting update is locally verified.
- Next: user review; no commit/push/deploy until requested.

### Iteration 9

- Change: simplified public landing wording so owners, managers, and staff can understand the offer without technical terms.
- Verification: `npm run build` passed; browser smoke passed for RU desktop and UZ mobile with simple labels, no visible technical terms, and no horizontal overflow.
- Result: simple-language landing update is locally verified.
- Next: user review; no commit/push/deploy until requested.

### Iteration 10

- Change: replaced hash routing with normal URLs, moved Django admin to `/django-admin/`, fixed super-admin user/org write flows, and added auto-slug for organization create.
- Verification: browser smoke passed for `/admin`, org detail, audit log, reload, filters, modals, tabs, temporary create/edit/user/suspend/activate with cleanup; `npm run build`, full backend tests (`233 passed`), Django check, and `git diff --check` passed.
- Result: clean URLs and admin functions are locally verified.
- Next: user review; no commit/push/deploy until requested.

### Iteration 11

- Change: audited admin data, admin write functions, billing UI, and Payme checkout readiness with local API/browser smoke.
- Verification: payment tests passed (`61 passed`), SaaS hardening tests passed (`6 passed`), Django check passed, frontend build passed, API smoke created/edited/deleted temporary org/user/order and cleanup returned clean.
- Result: admin data/functions are locally working; payment flow is structurally correct but local Payme merchant/key are empty; mobile admin and billing copy have polish risks.
- Next: user review; no commit/push/deploy until requested.

### Iteration 12

- Change: applied client landing feedback by replacing hero copy, keeping the approved quick-entry card, removing rejected cards/sections, and shortening the final CTA.
- Verification: frontend build passed; browser smoke passed for UZ mobile and RU desktop with new copy, no rejected blocks visible, CTA to `/login`, no horizontal overflow, and H1 fitting the viewport.
- Result: landing feedback cleanup is locally verified.
- Next: user review; no commit/push/deploy until requested.

### Iteration 13

- Change: aligned landing logo with login chef-hat mark, compacted the quick-entry section, localized the suspended access page, fixed nested 403 error extraction, and added the missing `oqtepa/admin123` suspended demo user to `seed_data`.
- Verification: frontend build, Django check, and `git diff --check` passed; browser smoke passed for RU desktop landing, mobile landing, UZ landing, login CTA/logo, `oqtepa` suspended flow, tenant admin, and super-admin; local seed side effects were cleaned back to 100 operations and 9 audit logs.
- Result: Batch 9 is locally verified.
- Next: user review; no commit/push/deploy until requested.

### Iteration 14

- Change: implemented requested owner metrics on the landing, added Basic/Pro pricing and 1-month-free copy, updated real PlanConfig prices, allowed current-plan renewal, extended renewal from existing future expiry, and set 1-month access for newly created organizations.
- Verification: payment/organization tests passed (`98 passed`), frontend build passed, migration check and Django check passed, local DB migrations applied, browser smoke passed for desktop/mobile landing and tenant billing, and `git diff --check` passed.
- Result: pricing, renewal, and landing update are locally verified.
- Next: user review; no commit/push/deploy until requested.
