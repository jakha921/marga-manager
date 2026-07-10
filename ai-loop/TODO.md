# TODO

## Current Goal

- [x] Inspect the project and existing `AGENTS.md`.
- [x] Confirm completion target: verified local diff only.
- [x] Confirm public route: guest `/` is landing, authenticated `/` stays dashboard/admin by role.
- [x] Confirm audit output: `ai-loop/outputs/role-audit/`.
- [x] Confirm visual direction: current app style, no new dependencies.
- [x] Write/update `ai-loop/PLAN.md`.
- [x] Append Agentic Loop guidance to `AGENTS.md`.
- [x] Implement public landing page.
- [x] Preserve existing role routing.
- [x] Build frontend.
- [x] Smoke test guest, SUPER_ADMIN, TENANT_ADMIN, and KITCHEN_USER flows.
- [x] Check desktop/mobile responsiveness.
- [x] Write role audit notes.
- [x] Fix KITCHEN_USER Products page to be read-only.
- [x] Write Ponytail recommendations without applying them.

## Notes

- User will self-review and ask separately if push is needed.
- Do not commit, push, PR, or deploy in this task.
- Avoid backend/API/schema changes unless a role verification bug proves they are necessary.

## Verification

- [x] Command: `cd frontend && npm run build`
- [x] Result: passed before and after the Products role fix.
- [x] Command: `cd backend && uv run python manage.py migrate`
- [x] Result: passed; no migrations to apply.
- [x] Command: `cd backend && uv run python manage.py seed_data`
- [x] Result: passed; demo orgs/users/products/operations/audit logs available.
- [x] Command: `cd backend && uv run pytest -v`
- [x] Result: passed; 225 passed, 8 warnings.
- [x] Command: local browser smoke for guest + roles
- [x] Result: passed for guest, SUPER_ADMIN, TENANT_ADMIN, and KITCHEN_USER at desktop; passed responsive checks at 390px mobile with no horizontal overflow.
- [x] Command: `git diff --check`
- [x] Result: passed.

## Batch 4: Landing Sales Copy

- [x] Strengthen landing copy as calm B2B sales copy.
- [x] Focus hero on owner pain: staff, inventory, sales, payments, chats, spreadsheets.
- [x] Replace fake-looking hero metrics with product facts: one screen, 3 roles, audit.
- [x] Keep visual design unchanged.
- [x] Build frontend.
- [x] Browser-check RU desktop and UZ mobile copy.

### Batch 4 Verification

- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] Browser: RU desktop headline and loss-control copy visible; no horizontal overflow.
- [x] Browser: UZ mobile headline and loss-control copy visible; no horizontal overflow.
- [x] Browser: old fake metrics (`92%`, `12 задач`) are not visible.
- [x] Evidence: `ai-loop/outputs/landing-audit/landing-sales-ru-desktop.png`.
- [x] Evidence: `ai-loop/outputs/landing-audit/landing-sales-uz-mobile.png`.

## Batch 5: Simple Public Language

- [x] Replace visible technical wording on the landing with simple labels.
- [x] Keep the sales message focused on owner value without overloading the text.
- [x] Keep current landing visual style unchanged.
- [x] Browser-check RU desktop and UZ mobile copy.
- [x] Run frontend build.

### Batch 5 Verification

- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] Browser: RU desktop headline visible; simple labels visible; no visible technical terms found; no horizontal overflow.
- [x] Browser: UZ mobile headline visible; simple labels visible; no visible technical terms found; no horizontal overflow.
- [x] Evidence: `ai-loop/outputs/landing-audit/landing-simple-ru-desktop.png`.
- [x] Evidence: `ai-loop/outputs/landing-audit/landing-simple-uz-mobile.png`.

## Batch 6: Clean URLs And Admin Functions

- [x] Replace `HashRouter` with `BrowserRouter`.
- [x] Replace working frontend `#/...` links and redirects with normal paths.
- [x] Move Django admin from `/admin/` to `/django-admin/`.
- [x] Update Payme default callback from `/#/settings` to `/settings`.
- [x] Fix super-admin "Manage Users" organization matching.
- [x] Fix super-admin user create payload and edit flow.
- [x] Allow super-admin organization create without manually entering `slug`.
- [x] Add regression test for organization create without slug.
- [x] Browser-check `/admin`, `/admin/organizations/:id`, `/admin/audit-log`, reload on `/admin/audit-log`, filters, modals, tabs, and no URL hash.
- [x] Browser write-smoke: temporary organization create/edit, user create, suspend/activate.
- [x] Cleanup temporary smoke organization, user, and smoke audit logs.

### Batch 6 Verification

- [x] Browser: `/admin` shows 2 organizations, current metrics, org links `/admin/organizations/8` and `/admin/organizations/9`, no `#`.
- [x] Browser: search filters to `Oqtepa Lavash`.
- [x] Browser: New Tenant, Edit Org, Manage Users, and Suspend confirm modals open.
- [x] Browser: Manage Users shows `Users for Marga Kitchen`, `@admin`, and `@cook`.
- [x] Browser: detail route `/admin/organizations/8` shows counts and all tabs.
- [x] Browser: `/admin/audit-log` shows audit rows and survives reload without `#`.
- [x] Browser write-smoke: created `Codex Smoke 1783333165416`, edited contact, created user `smoke_165416`, suspended and activated org.
- [x] Cleanup: deleted smoke user, smoke org, and 3 related smoke audit logs.
- [x] API after cleanup: `organizations_count=2`, `users_count=3`, `audit_count=9`, no smoke rows left.
- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] Command: `cd backend && uv run pytest -q`
- [x] Result: `233 passed`.
- [x] Command: `cd backend && uv run python manage.py check`
- [x] Result: passed.
- [x] Command: `git diff --check`
- [x] Result: passed.
- [x] Command: working-code search for `#/`, `HashRouter`, `window.location.hash`
- [x] Result: no matches in frontend/backend/docker/AGENTS/CLAUDE.

## Batch 7: Admin, Visual, And Payments Audit

- [x] Verify local servers are reachable on frontend `:3000` and backend `:8000`.
- [x] Run focused payment tests.
- [x] Run SaaS hardening tests.
- [x] Run Django system check.
- [x] Run frontend production build.
- [x] Compare admin dashboard data with `/api/organizations/`.
- [x] Compare organization detail with `/api/organizations/8/detail_view/`.
- [x] Compare audit log UI/API data and event filter behavior.
- [x] Smoke-test temporary organization create/edit/search/detail.
- [x] Smoke-test temporary user create/edit/delete.
- [x] Smoke-test temporary organization suspend/activate.
- [x] Smoke-test payment plans, invalid amount validation, order creation, and Payme checkout fields.
- [x] Cleanup temporary organization, user, audit rows, and payment order.
- [x] Browser visual checks for admin desktop/mobile, organization detail, audit log, and billing desktop/mobile.
- [x] Save screenshots and browser result JSON in `ai-loop/outputs/admin-payment-audit/`.
- [x] Write audit report in `ai-loop/outputs/admin-payment-audit/report.md`.

### Batch 7 Verification

- [x] Command: `cd backend && uv run pytest tests/test_payments.py -q`
- [x] Result: `61 passed`.
- [x] Command: `cd backend && uv run pytest tests/test_saas_hardening.py -q`
- [x] Result: `6 passed`.
- [x] Command: `cd backend && uv run python manage.py check`
- [x] Result: passed; no issues.
- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] API smoke: dashboard baseline has 2 organizations; `Marga Kitchen` detail has 3 kitchens, 2 users, 20 products, and 100 operations.
- [x] API smoke: temporary org/user/order flow passed; cleanup verified no `Codex Audit` orgs, no `audit_` users, no temp audit logs, and no pending temp orders.
- [x] Payment smoke: invalid amount rejected with 400; valid `ENTERPRISE` order created as `PENDING`; sandbox checkout returned POST fields with matching amount and `account[order_id]`.
- [x] Browser smoke: `/admin`, `/admin/organizations/8`, `/admin/audit-log`, and `/settings` use normal URLs without `#`.
- [x] Browser smoke: desktop pages show expected data and no horizontal page overflow.
- [x] Browser smoke: mobile billing has no horizontal overflow; mobile admin data loads, but visual layout is cramped and should be improved before production polish.
- [x] Evidence: `ai-loop/outputs/admin-payment-audit/admin-desktop.png`.
- [x] Evidence: `ai-loop/outputs/admin-payment-audit/admin-mobile.png`.
- [x] Evidence: `ai-loop/outputs/admin-payment-audit/admin-detail-desktop.png`.
- [x] Evidence: `ai-loop/outputs/admin-payment-audit/admin-audit-desktop.png`.
- [x] Evidence: `ai-loop/outputs/admin-payment-audit/billing-desktop.png`.
- [x] Evidence: `ai-loop/outputs/admin-payment-audit/billing-mobile.png`.
- [x] Evidence: `ai-loop/outputs/admin-payment-audit/playwright-results.json`.
- [x] Remaining risk: real Payme transaction was not executed; local `PAYME_MERCHANT_ID` and `PAYME_MERCHANT_KEY` are empty, so checkout is structurally correct but not ready for real payment until env is configured.

## Batch 8: Landing Client Feedback Cleanup

- [x] Replace hero copy with staff and warehouse-stock positioning.
- [x] Keep hero mock and adjust labels toward stock, staff, and rules.
- [x] Keep the approved quick-entry capability card.
- [x] Remove rejected capability cards from rendered landing.
- [x] Remove lower SaaS/roles landing section from rendered landing.
- [x] Keep final CTA only.
- [x] Run frontend build.
- [x] Browser-check UZ mobile and RU desktop.

### Batch 8 Verification

- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] Browser: UZ mobile shows `Xodimlarni va ombordagi qoldiqlarni oson boshqaring`.
- [x] Browser: RU desktop shows `Легко управляйте персоналом и складскими остатками`.
- [x] Browser: quick-entry card remains visible.
- [x] Browser: rejected blocks are not visible: `Ishda tartib`, `Filiallar va mahsulotlar`, `Turli mijozlar uchun tayyor`, `Har kim faqat`, and `To'lov va kirish`.
- [x] Browser: CTA routes to `/login`.
- [x] Browser: 390px mobile and 1440px desktop have no horizontal overflow and the H1 fits.
- [x] Evidence: `ai-loop/outputs/landing-audit/landing-feedback-uz-mobile.png`.
- [x] Evidence: `ai-loop/outputs/landing-audit/landing-feedback-ru-desktop.png`.

## Batch 9: Landing Logo And Limited Access UX

- [x] Replace landing `MM` mark with login-style chef-hat mark.
- [x] Keep brand text `MARGA MANAGER` in the landing header.
- [x] Reduce landing vertical empty space around hero/capabilities/footer.
- [x] Keep approved quick-entry card.
- [x] Add compact `Kirim`, `Qoldiq`, `Sotuv` / RU equivalents near quick-entry card.
- [x] Add localized limited-access text for suspended tenants.
- [x] Make API error detail extraction handle nested backend error responses.
- [x] Update `/suspended` screen to match login visual style.
- [x] Mark `oqtepa` dev credential as limited access on login.
- [x] Add missing `oqtepa/admin123` suspended-tenant demo user to `seed_data`.
- [x] Run frontend build.
- [x] Run Django system check.
- [x] Run `git diff --check`.
- [x] Browser-check RU desktop landing.
- [x] Browser-check mobile landing.
- [x] Browser-check CTA to `/login` and login logo.
- [x] Browser-check UZ landing language.
- [x] Browser-check `oqtepa/admin123` suspended flow.
- [x] Browser-check `admin/admin123` tenant flow.
- [x] Browser-check `dev/dev123` super-admin flow.

### Batch 9 Verification

- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] Command: `cd backend && uv run python manage.py check`
- [x] Result: passed.
- [x] Command: `git diff --check`
- [x] Result: passed.
- [x] Browser: RU desktop landing shows chef-hat logo, approved quick-entry card, `Приход/Остатки/Продажи`, no rejected blocks, and no horizontal overflow.
- [x] Browser: 390px mobile landing has no horizontal overflow and H1 fits.
- [x] Browser: header login CTA routes to `/login`; login logo remains correct.
- [x] Browser: UZ landing shows Uzbek hero and `Kirim/Qoldiq/Sotuv`.
- [x] Browser: `oqtepa/admin123` now logs in and redirects to `/suspended` with UZ localized access-limited text.
- [x] Browser: `admin/admin123` still opens tenant dashboard.
- [x] Browser: `dev/dev123` still opens `/admin`.
- [x] Note: local `uv run python manage.py seed_data` was run without `--clear` to create missing `oqtepa`; the extra 50 demo operations and 4 demo audit logs from that run were cleaned up, returning local counts to 100 operations and 9 audit logs.

## Batch 10: Self-Service Registration, Onboarding, And 14-Day Trial

- [x] Add public registration endpoint.
- [x] Add registration tests for org/user creation, phone normalization, duplicate phone, weak password, and public role/plan safety.
- [x] Change new organization default trial to 14 days.
- [x] Change expired subscription task to suspend unpaid orgs instead of downgrading to free BASIC.
- [x] Allow suspended owners to access only auth/me and billing order/payment endpoints.
- [x] Reactivate suspended org after successful payment.
- [x] Add `/register` page.
- [x] Add `/onboarding` page for the first branch.
- [x] Redirect tenant admins without branches to onboarding.
- [x] Update landing/billing trial text to 14 days.
- [x] Run backend auth/payment tests.
- [x] Run migration dry-run check.
- [x] Run frontend build.
- [x] Run `git diff --check`.
- [x] Browser-smoke registration, onboarding, suspended billing, and existing roles.

### Batch 10 Verification

- [x] Command: `cd backend && uv run pytest tests/test_auth.py tests/test_payments.py -q`
- [x] Result: `84 passed`.
- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] Command: `cd backend && uv run python manage.py makemigrations --check --dry-run`
- [x] Result: `No changes detected`.
- [x] Command: `git diff --check`
- [x] Result: passed.
- [x] Browser: guest landing CTA opens `/register` and mobile 390px has no horizontal overflow.
- [x] Browser: phone signup created org/user, redirected to `/onboarding`, first branch creation opened dashboard.
- [x] Browser/API: suspended `oqtepa/admin123` reaches `/suspended`; products API returns 403, billing order returns 201, checkout returns 200.
- [x] Browser: `admin/admin123` still opens tenant dashboard; `dev/dev123` still opens `/admin`.
- [x] Cleanup: temporary `Codex Trial Cafe` org, `998907102026` user, first branch, and smoke payment order were deleted from local DB.

## Batch 3: Landing Client Copy And SaaS Readiness

- [x] Add approved Batch 3 scope to `ai-loop/PLAN.md`.
- [x] Add failing regression tests for org/users pagination ordering and Payme prod env fail-fast.
- [x] Fix org/users deterministic queryset ordering.
- [x] Require `PAYME_MERCHANT_ID`, `PAYME_MERCHANT_KEY`, and `PAYME_CALLBACK_URL` in prod settings.
- [x] Update landing copy to client positioning through `LanguageContext`.
- [x] Replace landing hero mock wording from kitchen report to management/motivation snapshot.
- [x] Remove unused Gemini dependency and Vite/env plumbing.
- [x] Remove outdated frontend AI Studio/backend prompt/spec docs.
- [x] Browser-check landing desktop/mobile RU/UZ copy, CTA, scroll, and overflow.
- [x] Browser-check QuickInput edit modal focus for quantity/unit price/total.
- [x] Run frontend build.
- [x] Run full backend tests.
- [x] Run migration check.
- [x] Run production bundle credential scan.
- [x] Run production npm audit.
- [x] Run `git diff --check`.

### Batch 3 Stop Target

- Verified local diff only.
- No commit, push, PR, deploy, production access, Telegram implementation, or new dependencies.

### Batch 3 Verification

- [x] Command: `cd backend && uv run pytest tests/test_saas_hardening.py -q`
- [x] Result: failed before implementation, then passed (`5 passed`).
- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] Browser: RU desktop landing shows client headline, motivation/rules copy, management snapshot, no old kitchen hero copy, and no horizontal overflow.
- [x] Browser: "Что внутри" scrolls to capabilities; "Перейти в кабинет" routes to `/login`.
- [x] Browser: UZ mobile landing shows client headline/subtitle/audience and no horizontal overflow.
- [x] Browser: QuickInput edit modal kept focus while typing quantity, unit price, and total; save refreshed history with `32 000`.
- [x] Cleanup: temporary operation `id=211` was deleted after smoke.
- [x] Command: `cd backend && uv run pytest -v`
- [x] Result: `232 passed`.
- [x] Command: `cd backend && uv run python manage.py makemigrations --check --dry-run`
- [x] Result: no changes detected.
- [x] Command: `cd frontend && rg -n "admin123|dev123|cook123|oqtepa / admin123|admin / admin123|dev / dev123|cook / cook123" dist`
- [x] Result: no matches.
- [x] Command: `cd frontend && npm audit --omit=dev --audit-level=high`
- [x] Result: initially found high vulnerabilities in existing `axios`/`react-router` stack; after `npm audit fix` result is `found 0 vulnerabilities`.
- [x] Command: `git diff --check`
- [x] Result: passed.
- [x] Remaining risk: local smoke only for frontend UI; payment checkout was not executed. Existing warnings: unordered DRF pagination on organizations/users querysets.

## Batch 2: Client Bugfixes And SaaS Risk Reduction

- [x] Include client screenshot feedback in scope.
- [x] Reproduce Products modal focus loss after one typed character.
- [x] Fix Products modal focus loss at shared Modal level.
- [x] Make operations API ordering deterministic by creation sequence.
- [x] Make latest incoming price lookup deterministic for same date/time.
- [x] Add/update backend tests for ordering and latest incoming price.
- [x] Hide demo credentials in production login UI.
- [x] Remove credential hints from login error translations.
- [x] Remove unused Vite importmap CDN mappings.
- [x] Browser-check Products modal, QuickInput ordering, and latest incoming price.
- [x] Write Telegram bot brainstorm/spec.
- [x] Write security/payment hardening recommendations.
- [x] Run focused backend tests.
- [x] Run full backend tests.
- [x] Run frontend build.
- [x] Run production bundle credential scan.
- [x] Run migration check.
- [x] Run `git diff --check`.

### Batch 2 Stop Target

- Verified local diff only.
- No commit, push, PR, deploy, production access, or new dependencies.

### Batch 2 Verification

- [x] Browser: Products modal kept focus while typing `Apple`.
- [x] Browser: QuickInput history displayed newest matching stock entry first (`22 kg` before `11 kg`).
- [x] Browser: QuickInput selected latest incoming unit price `2 500` and calculated `7 500` for quantity `3`.
- [x] Evidence: `ai-loop/outputs/role-audit/17-client-bugs-quickinput-after-fix.png`.
- [x] Command: `cd backend && uv run pytest tests/test_operations.py tests/test_payments.py -v`
- [x] Result: 88 passed.
- [x] Command: `cd backend && uv run pytest -v`
- [x] Result: 227 passed, 8 existing warnings for unordered organizations/users pagination.
- [x] Command: `cd backend && uv run python manage.py makemigrations --check --dry-run`
- [x] Result: no changes detected.
- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] Command: `cd frontend && rg -n "admin123|oqtepa|admin / admin123|oqtepa / admin123|Try admin|Попробуйте admin|admin123 ni" dist`
- [x] Result: no matches.
- [x] Command: `git diff --check`
- [x] Result: passed.

## Batch 10: Landing Owner Metrics, Pricing, And Renewal

- [x] Add/update backend tests for Basic/Pro prices and current-plan renewal.
- [x] Update real PlanConfig prices: BASIC `299 000 UZS`, PRO `589 000 UZS`.
- [x] Add data migration for existing databases.
- [x] Allow current-plan renewal orders.
- [x] Extend paid subscriptions from the current future expiry date.
- [x] Give newly created organizations 1 month access by default.
- [x] Update landing owner snapshot with the 5 requested owner metrics.
- [x] Add compact Basic/Pro pricing and 1-month-free copy to the landing.
- [x] Hide Enterprise from tenant billing UI.
- [x] Show renewal action for the current tenant plan.
- [x] Apply local DB migrations.
- [x] Run backend payment/organization tests.
- [x] Run frontend build.
- [x] Browser-check landing desktop/mobile and tenant billing.
- [x] Run migration check, Django check, and `git diff --check`.

### Batch 10 Stop Target

- Verified local diff only.
- No commit, push, PR, deploy, production access, or new dependency.

### Batch 10 Verification

- [x] Command: `cd backend && uv run pytest tests/test_payments.py tests/test_organizations.py -q`
- [x] Result: `98 passed`.
- [x] Command: `cd backend && uv run python manage.py makemigrations --check --dry-run && uv run python manage.py check`
- [x] Result: no migration changes; Django check passed.
- [x] Command: `cd frontend && npm run build`
- [x] Result: passed.
- [x] Browser: UZ desktop landing shows 5 owner metrics, `299 000 UZS`, `589 000 UZS`, `1 oy bepul`, no Enterprise text, and no horizontal overflow.
- [x] Browser: UZ mobile landing at 390px has no horizontal overflow and H1 fits.
- [x] Browser: tenant billing shows Basic/Pro only, new prices, trial note, and `Uzaytirish` for current plan.
- [x] Command: `git diff --check`
- [x] Result: passed.
