# Landing Audit Notes

## Findings

- Previous landing copy sold kitchen/product/sales control, while client feedback asks for broader owner-led small-business management.
- The first-screen mock was too kitchen-report focused for the requested owner/personnel/motivation positioning.
- The existing visual style is acceptable and should be preserved.
- QuickInput edit-modal freezing risk must be verified in browser because the shared modal focus issue was already fixed earlier.

## Implemented Direction

- Use RU/UZ/EN landing keys in the existing `LanguageContext`.
- Keep guest `/` landing and authenticated role redirects unchanged.
- Replace hero mock wording with management, rules, staff, branches, and task/motivation signals.
- Keep Telegram bot and Tailwind production migration outside this batch.

## Browser Evidence

- RU desktop landing: `ai-loop/outputs/landing-audit/landing-ru-desktop.png`
- UZ mobile landing: `ai-loop/outputs/landing-audit/landing-uz-mobile.png`
- QuickInput edit modal: quantity, unit price, and total fields kept focus while typing; save refreshed history with `32 000`.
- Production npm audit: initially found high vulnerabilities in existing frontend dependencies; after non-forced `npm audit fix`, `npm audit --omit=dev --audit-level=high` reports `found 0 vulnerabilities`.

## Sales Copy Update

- New RU desktop evidence: `ai-loop/outputs/landing-audit/landing-sales-ru-desktop.png`
- New UZ mobile evidence: `ai-loop/outputs/landing-audit/landing-sales-uz-mobile.png`
- Copy now sells through concrete owner pains: staff discipline, inventory losses, sales visibility, payment control, chats, and spreadsheets.
- Hero mock no longer uses fake-looking performance numbers; it shows product facts: one workspace, role access, and audit.
