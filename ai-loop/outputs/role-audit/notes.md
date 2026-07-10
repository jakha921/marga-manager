# Role And Responsive Audit

Date: 2026-07-04

## Scope

- Guest landing at `/`
- Login and role routing for `dev`, `admin`, and `cook`
- Desktop viewport: 1280x720
- Mobile viewport: 390x844

## Steps

1. Guest desktop landing
   - Health: passed
   - Evidence: `01-guest-landing-desktop.png`, `16-guest-landing-after-scroll-button.png`
   - Notes: `/` shows public landing with login CTA. "Что внутри" scrolls to capabilities without changing the HashRouter route.

2. SUPER_ADMIN desktop
   - Health: passed
   - Evidence: `02-super-admin-dashboard-desktop.png`, `03-super-admin-audit-log-desktop.png`
   - Notes: `dev/dev123` routes to `#/admin`; audit log is reachable.

3. TENANT_ADMIN desktop
   - Health: passed
   - Evidence: `04-tenant-dashboard-desktop.png`, `05-tenant-settings-desktop.png`
   - Notes: `admin/admin123` routes to tenant dashboard; settings is reachable; direct `#/admin` redirects back to tenant dashboard.

4. KITCHEN_USER desktop
   - Health: passed after fix
   - Evidence: `08-kitchen-quick-input-after-fix-desktop.png`, `09-kitchen-products-readonly-desktop.png`
   - Notes: `cook/cook123` routes to `#/quick-input`; products page is read-only; direct `#/settings` redirects back to quick input.

5. Guest mobile landing
   - Health: passed
   - Evidence: `12-guest-landing-mobile-logged-out.png`
   - Notes: public `/` renders landing at 390px width with no horizontal overflow.

6. SUPER_ADMIN mobile
   - Health: passed
   - Evidence: `13-super-admin-dashboard-mobile.png`
   - Notes: admin dashboard renders at 390px width with no horizontal overflow.

7. TENANT_ADMIN mobile
   - Health: passed
   - Evidence: `14-tenant-dashboard-mobile.png`, `15-tenant-settings-mobile.png`
   - Notes: tenant dashboard and settings render at 390px width with no horizontal overflow.

8. KITCHEN_USER mobile
   - Health: passed
   - Evidence: `11-kitchen-quick-input-mobile.png`
   - Notes: quick input renders at 390px width with no horizontal overflow.

## Finding Fixed

- KITCHEN_USER could see product/category management controls on Products. Controls are now hidden for `KITCHEN_USER`, matching the documented read-only product access.
- Landing originally used a plain hash anchor for the capabilities section. It now uses `scrollIntoView()` so HashRouter does not interpret the section as an app route.
- Products modal lost focus after one typed product-name character. Shared Modal focus handling now keeps the field active while typing.
- QuickInput operation history now has deterministic newest-first ordering for entries with the same date/time.
- QuickInput latest incoming price now uses the newest created incoming operation when date/time ties and returns a stable decimal `unit_price`.

## Batch 2 Evidence

- Screenshot: `17-client-bugs-quickinput-after-fix.png`
- Browser check: Products modal kept focus after typing `Apple`.
- Browser check: QuickInput showed `22 kg` before `11 kg` for a test product with same date/time.
- Browser check: latest incoming unit price `2 500` populated and quantity `3` calculated total `7 500`.

## Limits

- This is a local smoke audit, not a full WCAG audit.
- Payment provider checkout was not executed.
- CRUD form submission was not exhaustively tested for every modal.
- Backend API suite passed: 227 tests. Existing warning remains: DRF unordered pagination on organizations/users list querysets.
- Browser still warns that Tailwind CDN is not for production; this is documented in `ai-loop/outputs/security-payment-notes.md` and was not changed because it requires build setup work.
