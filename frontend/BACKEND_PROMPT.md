# One-Shot Prompt for Backend Generation

**Role:** You are an expert Backend Developer specializing in SaaS applications.

**Task:** Build a complete, production-ready backend for the "Marga Manager" restaurant management system.

**Tech Stack:**
- **Language:** Node.js (TypeScript) or Python (FastAPI) - *Prefer Node.js/Express if not specified.*
- **Database:** PostgreSQL (with Prisma or TypeORM).
- **Auth:** JWT (JSON Web Tokens).

**Context:**
The frontend is a React application for managing restaurant inventory, sales, and kitchen operations. It supports multi-tenancy (SaaS) where each organization has its own data.

**Requirements:**

1.  **Database Schema (Prisma/TypeORM):**
    -   `Organization`: id (UUID), name, plan (BASIC/PRO), settings (currency, tax).
    -   `User`: id (UUID), orgId (FK), email, passwordHash, role (ADMIN/USER).
    -   `Kitchen`: id (UUID), orgId (FK), name.
    -   `Product`: id (UUID), orgId (FK), name, code, unit.
    -   `Operation`: id (UUID), orgId (FK), type (INCOMING, DAILY, TRANSFER, SALE), date, kitchenId (FK), toKitchenId (FK, optional), productId (FK), quantity, price.

2.  **API Endpoints (REST):**
    -   **Auth:** `/auth/register`, `/auth/login`, `/auth/me`.
    -   **CRUD Resources:** `/organizations`, `/users`, `/kitchens`, `/products`, `/operations`.
    -   **Analytics (Optional but good):** `/analytics/dashboard` (aggregates sales/expenses).

3.  **Business Logic:**
    -   **Multi-tenancy:** Middleware MUST extract `organizationId` from the JWT token and enforce it on ALL queries. Users cannot see data from other orgs.
    -   **Validation:** Ensure `quantity` is positive. Ensure `toKitchenId` exists for transfers.

4.  **Output:**
    -   Provide the full `schema.prisma` (or equivalent).
    -   Provide the main `server.ts` (or `app.py`).
    -   Provide the controller/service logic for `Operations` (the most complex part).
    -   Provide the Authentication middleware.

**Constraint:**
The code must be clean, modular, and ready to deploy. Use environment variables for configuration.

**Input Data (for context):**
*Refer to the provided `BACKEND_DOCS.md` for detailed field definitions and business rules.*
