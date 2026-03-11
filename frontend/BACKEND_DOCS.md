# Backend Documentation & Integration Guide

## Overview
This document outlines the backend requirements, data models, and API endpoints necessary to support the "Marga Manager" frontend application. The application is a SaaS-ready inventory and financial management system for restaurants/kitchens.

## Architecture
- **Architecture Style:** RESTful API
- **Authentication:** JWT (JSON Web Tokens)
- **Multi-tenancy:** Organization-based isolation. All resources (Kitchens, Products, Operations) must be scoped to an `organizationId`.

## Data Models

### 1. Organization (Tenant)
Represents a customer/restaurant chain.
```typescript
interface Organization {
  id: string; // UUID
  name: string;
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED';
  maxKitchens: number;
  maxUsers: number;
  // Settings
  currency: string; // Default: 'UZS'
  taxRate: number;
  lowStockThreshold: number;
  createdAt: string;
}
```

### 2. User
System users with role-based access.
```typescript
interface User {
  id: string; // UUID
  organizationId: string; // FK to Organization
  username: string;
  passwordHash: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'KITCHEN_USER';
  createdAt: string;
}
```

### 3. Kitchen (Location)
Physical locations or branches.
```typescript
interface Kitchen {
  id: string; // UUID
  organizationId: string; // FK to Organization
  name: string;
  isActive: boolean;
  createdAt: string;
}
```

### 4. Product
Inventory items.
```typescript
interface Product {
  id: string; // UUID
  organizationId: string; // FK to Organization
  code: string; // Unique within Organization
  name: string;
  category: string;
  unit: string; // e.g., 'kg', 'pcs', 'l'
  createdAt: string;
}
```

### 5. Operation (Transaction Ledger)
The core entity recording all movements.
```typescript
type OperationType = 'INCOMING' | 'DAILY' | 'TRANSFER' | 'SALE';

interface Operation {
  id: string; // UUID
  organizationId: string; // FK to Organization
  type: OperationType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  
  // Location Context
  kitchenId: string; // FK to Kitchen (Source)
  toKitchenId?: string; // FK to Kitchen (Destination, only for TRANSFER)
  
  // Product Context
  productId: string; // FK to Product
  quantity: number;
  price?: number; // Total price for the quantity
  
  createdAt: string;
}
```

## API Endpoints

### Authentication
- `POST /api/auth/login`: Returns JWT token.
- `GET /api/auth/me`: Returns current user profile.

### Organizations (Super Admin Only)
- `GET /api/organizations`
- `POST /api/organizations`
- `PUT /api/organizations/:id`

### Kitchens
- `GET /api/kitchens`: List all kitchens for current user's org.
- `POST /api/kitchens`
- `PUT /api/kitchens/:id`
- `DELETE /api/kitchens/:id`

### Products
- `GET /api/products`: List all products.
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Operations (The Ledger)
- `GET /api/operations`: Supports filtering by:
    - `startDate` / `endDate`
    - `kitchenId`
    - `type`
    - `productId`
- `POST /api/operations`: Create a new entry.
    - **Validation:** Ensure `kitchenId` belongs to user's org. For `TRANSFER`, ensure `toKitchenId` exists.
- `PUT /api/operations/:id`
- `DELETE /api/operations/:id`

## Business Logic & Calculation Rules

### 1. Inventory Balance Calculation
The frontend currently calculates balances dynamically. The backend should ideally provide an endpoint for this to improve performance as data grows.
**Formula:**
`Current Balance = (Sum of INCOMING) + (Sum of DAILY Initial) - (Sum of SALES) - (Sum of DAILY End) +/- (TRANSFERS)`
*Note: The 'DAILY' operation type in this app is overloaded. It acts as a "Stock Take" or "Balance Check".*

### 2. Dashboard Analytics
- **Sales Revenue:** Sum of `price` where `type = 'SALE'`.
- **Cost of Goods:** Sum of `price` where `type = 'INCOMING'` (Simplified) or calculated via FIFO/Weighted Average if implemented in backend.
- **Gross Profit:** `Sales Revenue - Cost`.

### 3. Quick Input Logic
- **Auto-Price:** When selecting a product for `DAILY` or `TRANSFER`, the frontend tries to find the last `INCOMING` price. The backend could support this by returning the "last purchase price" in the Product API.

## Integration Steps for Frontend
1. **Replace `DataContext.tsx`:**
   - Currently, `DataContext` holds all state in `localStorage`.
   - Create a new `ApiContext` or update `DataContext` to fetch from the API using `useEffect` and `fetch/axios`.
2. **Environment Variables:**
   - Add `VITE_API_URL` to `.env`.
3. **Error Handling:**
   - Implement global error handling (e.g., 401 Unauthorized redirects to login).

## AI Implementation Notes
When generating the backend:
- Use **Node.js (Express)** or **Python (FastAPI)**.
- Use **PostgreSQL** for the database.
- Ensure all IDs are **UUIDs**.
- Implement **Row Level Security (RLS)** or middleware to strictly enforce `organizationId` isolation.
