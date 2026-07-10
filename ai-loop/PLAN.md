# Marga Manager SaaS Landing And Role Verification Plan

## Goal

Make the public first screen a selling landing page while preserving existing role-based SaaS functionality, then verify guest, SUPER_ADMIN, TENANT_ADMIN, and KITCHEN_USER flows locally.

## Context Found

- Frontend is React 19 + Vite with BrowserRouter in `frontend/App.tsx`.
- Current `/` route is tenant dashboard behind `ProtectedRoute`.
- `SUPER_ADMIN` users are redirected to `/admin`; tenant users use dashboard/settings; kitchen users use quick input/products.
- Styling is inline Tailwind config in `frontend/index.html` with `DM Sans`, `Inter`, slate, and green tokens.
- Test credentials are available from seed data: `dev/dev123`, `admin/admin123`, `cook/cook123`.

## Assumptions

- Completion target is verified local diff only.
- No commit, push, PR, or deploy until explicitly requested.
- Landing page should use the current visual system, no new dependencies, no new public API, and no backend schema change.
- Public `/` should show landing to guests; authenticated `/` should keep existing dashboard/admin behavior.
- Screenshots and audit notes go to `ai-loop/outputs/role-audit/`.

## Scope

In:
- Append Agentic Loop guidance to `AGENTS.md` without overwriting existing content.
- Create/update root `ai-loop/PLAN.md`, `TODO.md`, `ITERATION_LOG.md`, and `STOP_CRITERIA.md`.
- Add a public SaaS landing page for guests at `/`.
- Preserve existing login and role routes.
- Verify desktop/mobile responsiveness and core pages by role.
- Record verification evidence in `ai-loop/TODO.md` and `ai-loop/outputs/role-audit/`.

Out:
- Commit, push, PR, deploy.
- New dependencies, new backend APIs, migrations, payment-provider changes, or production access.
- Full redesign of existing authenticated app screens.

## Steps

- [x] Inspect project structure, existing `AGENTS.md`, routing, auth, seed data, and styling.
- [x] Clarify route, stopping point, audit destination, and visual direction.
- [x] Set up Agentic Loop docs for this task.
- [x] Implement guest landing with smallest frontend diff.
- [x] Keep authenticated role routing unchanged.
- [x] Build frontend.
- [x] Run relevant backend tests if backend is touched; otherwise note not needed.
- [x] Start local backend/frontend, seed data if needed, and smoke test guest + role flows.
- [x] Capture role/a11y/responsive notes in `ai-loop/outputs/role-audit/`.
- [x] Update `ai-loop/TODO.md` with final verification and remaining risks.

## Verification

- `cd frontend && npm run build`
- Local browser smoke:
  - guest `/` shows landing and `/login` shows login
  - `dev/dev123` reaches SUPER_ADMIN dashboard and admin routes
  - `admin/admin123` reaches tenant dashboard, kitchens, products, settings
  - `cook/cook123` reaches quick input/products and cannot access tenant admin pages
  - desktop and mobile widths do not show broken layout or unreadable content

## Stop Criteria

- Stop before commit/push/PR/deploy, dependency install, backend schema/API changes, production access, or scope expansion.
- Stop if local auth cannot be made runnable with seed data after two focused attempts.

## Approval

- [x] Approved by user: option 1, guest `/` landing, preserve roles/pages and verify responsiveness.

## Batch 2: Client Bugfixes And SaaS Risk Reduction

### Goal

Fix the reported client workflow bugs with the smallest safe diff, keep the existing visual interface, and document practical security/payment/Telegram-bot recommendations for SaaS readiness.

### Client Feedback Included

- Product modal input loses focus after one typed character in Products.
- QuickInput history should reflect entries in input sequence.
- QuickInput price should use the latest entered incoming price for that product.

### Scope

In:
- Fix modal focus behavior without changing modal visuals.
- Make operation ordering deterministic for lists, exports, and last incoming price lookup.
- Keep QuickInput history showing newest entered operations first.
- Keep existing role functionality intact.
- Hide demo credentials from production login UI and remove credential hints from login error copy.
- Write Telegram bot brainstorm/spec without adding a bot dependency yet.
- Write payment/security hardening notes based on current implementation.

Out:
- Commit, push, PR, deploy.
- New production dependencies, including `aiogram`.
- Database schema changes or migrations.
- Public API contract changes beyond deterministic ordering.
- Major auth rewrite such as JWT localStorage to httpOnly cookie migration.

### Verification

- Reproduce reported UI focus bug before fix.
- Add backend tests for deterministic operation ordering and latest incoming selection.
- `cd backend && uv run pytest tests/test_operations.py tests/test_payments.py -v`
- `cd frontend && npm run build`
- Browser smoke:
  - Products modal keeps focus while typing product name.
  - QuickInput latest incoming price is reflected for daily balance.
  - QuickInput history shows newest saved entries first.

## Batch 3: Landing Client Copy And SaaS Readiness

### Goal

Apply client landing feedback with minimal visual change, verify the QuickInput edit-modal risk, and remove small SaaS hardening risks that are already confirmed in code.

### Client Feedback Included

- Landing should position MARGA MANAGER as online small-business management for the business owner.
- Copy should mention owner-staff rules, motivation, and small production businesses such as cafes and pastry workshops.
- Existing data edit cells were reported as freezing while editing.

### Scope

In:
- Make landing copy language-aware through the existing language context.
- Keep the current landing visual system and route behavior.
- Replace restaurant/kitchen-only hero wording with owner/staff/rules/motivation wording.
- Verify QuickInput edit modal in the browser and only patch if the issue reproduces.
- Remove unused Gemini/AI Studio frontend scaffolding.
- Remove outdated frontend prompt/spec docs that contradict the current Django implementation.
- Add deterministic ordering for organizations/users pagination.
- Fail fast in production when required Payme env vars are empty.

Out:
- Commit, push, PR, deploy.
- Telegram bot implementation.
- Tailwind build-system migration.
- New production dependencies.
- Backend API shape or database schema changes.

### Verification

- `cd backend && uv run pytest tests/test_saas_hardening.py -q`
- `cd frontend && npm run build`
- `cd backend && uv run pytest -v`
- `cd backend && uv run python manage.py makemigrations --check --dry-run`
- `git diff --check`
- Browser smoke:
  - guest `/` shows RU/UZ client copy without horizontal overflow
  - login CTA routes to `/login`
  - "what is inside" CTA scrolls to capabilities
  - QuickInput edit modal keeps focus while editing quantity/unit price/total

## Batch 4: Landing Sales Copy

### Goal

Make the landing copy more convincing for small-business owners while keeping the current visual style.

### Scope

In:
- Strengthen the headline and supporting copy.
- Keep wording calm, concrete, and focused on owner pains: staff, stock, sales, payments, chats, and spreadsheets.
- Remove fake-looking proof points from the hero mock.

Out:
- Visual redesign, new dependencies, commit, push, PR, deploy.

## Batch 5: Simple Public Language

### Goal

Reduce visible technical words on the landing page so the message is easy for any owner, manager, or employee to understand.

### Scope

In:
- Replace role names and product wording shown on the landing with simple human labels.
- Keep the existing app terms and internal keys unchanged where they are not visible to guests.
- Verify Russian desktop and Uzbek mobile versions.

Out:
- Existing authenticated app translations.
- Route, API, backend, payment, or design changes.

## Batch 6: Clean URLs And Admin Functions

### Goal

Use normal browser URLs without `#`, remove the React `/admin` conflict with Django admin, and verify the super-admin pages with current local data.

### Scope

In:
- Switch the frontend router from hash URLs to normal URLs.
- Move Django admin from `/admin/` to `/django-admin/`.
- Update frontend links and redirects that used `#/...`.
- Verify admin dashboard, organization detail, audit log, filters, modals, create/edit user/org flows, and suspend/activate locally.

Out:
- Commit, push, PR, deploy.
- Production data changes.
- Broad admin redesign.

## Batch 7: Admin, Visual, And Payments Audit

### Goal

Verify current super-admin data, admin functions, billing UI, and Payme readiness locally without real external payment.

### Scope

In:
- Compare admin dashboard/detail/audit data with local API responses.
- Smoke-test temporary organization, user, suspend/activate, audit filters, payment order validation, checkout URL generation, and cleanup.
- Capture desktop/mobile visual evidence for admin and billing pages.
- Record payment/security/readiness risks with exact evidence.

## Batch 10: Self-Service Registration, Onboarding, And 14-Day Trial

### Goal

Let a business owner register by phone, create an organization without super-admin help, get 14 days of trial access, create the first branch in onboarding, and pay from a restricted state if trial expires.

### Scope

In:
- Add public `POST /api/auth/register/` for organization + first `TENANT_ADMIN`.
- Use normalized phone as username.
- Start new organizations on BASIC with 14 days access and `mrr=0`.
- Add frontend `/register` and `/onboarding`.
- Redirect tenant admins with no kitchens to onboarding.
- Replace "1 month free" public/billing copy with "14 days free".
- Change expired subscription handling from free BASIC downgrade to access restriction.
- Keep billing endpoints usable for suspended owners so they can pay without admin help.

Out:
- Commit, push, PR, deploy.
- SMS/email verification.
- New production dependencies.
- A multi-step onboarding database model.

### Verification

- `cd backend && uv run pytest tests/test_auth.py tests/test_payments.py -q`
- `cd backend && uv run python manage.py makemigrations --check --dry-run`
- `cd frontend && npm run build`
- `git diff --check`
- Browser smoke:
  - landing CTA opens `/register`
  - phone signup creates org/user and redirects to `/onboarding`
  - onboarding creates first branch and opens the app
  - expired/suspended owner can reach payment options
  - existing demo roles still work

Out:
- Commit, push, PR, deploy.
- Production access or real Payme transaction.
- New dependencies or product code changes in this audit batch.

## Batch 8: Landing Client Feedback Cleanup

### Goal

Apply client landing feedback with the smallest frontend-only change: keep the approved quick-entry card, remove rejected landing blocks, and replace the hero message with the owner's warehouse/staff-control positioning.

### Scope

In:
- Update visible landing copy in RU/UZ/EN.
- Keep the hero mock visual style and adjust its visible labels toward stock, staff, and rules.
- Show only one capability card for quick data entry.
- Remove the lower SaaS/roles section from the rendered landing.

Out:
- Commit, push, PR, deploy.
- New dependencies, backend changes, payment pricing, or authenticated app redesign.

## Batch 9: Landing Logo And Limited Access UX

### Goal

Make the landing feel less empty, align its logo with the login page, and show a clear localized message when a suspended tenant user signs in.

### Scope

In:
- Replace the landing header mark with the same chef-hat mark used on login.
- Keep the approved quick-entry card and add only short `Kirim/Qoldiq/Sotuv` info items.
- Handle suspended-org API errors from wrapped backend responses.
- Show `/suspended` as a simple localized access-limited page.
- Make the dev `oqtepa/admin123` demo credential real in `seed_data`.

Out:
- Commit, push, PR, deploy.
- New dependencies, schema/API changes, pricing/payment blocks, or broader redesign.
