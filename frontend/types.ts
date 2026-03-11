
export type OperationType = 'INCOMING' | 'DAILY' | 'TRANSFER' | 'SALE';

export type SubscriptionPlan = 'BASIC' | 'PRO' | 'ENTERPRISE';

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'KITCHEN_USER';

export interface User {
  id: number;
  organizationId: number;
  username: string;
  password: string; // Stored for mock purposes
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'SUSPENDED';
  maxKitchens: number;
  maxUsers: number;
  createdAt: string;
  // Billing info
  mrr: number; // Monthly Recurring Revenue from this client
  contactName: string;

  // Extended Settings
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
  taxRate?: number;
  lowStockThreshold?: number;
}

export interface Category {
  id: number;
  name: string;
  organizationId: number;
}

export interface Kitchen {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  organizationId: number;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  category: number;
  categoryName?: string;
  unit: string;
  organizationId: number;
}

export interface OperationEntry {
  id: number;
  type: OperationType;
  date: string;
  time: string;
  kitchenId: number;
  kitchenName: string;
  toKitchenId?: number;
  toKitchenName?: string;
  productId: number | null;
  productName: string;
  quantity: number;
  unit: string;
  price?: number;
  organizationId: number;
}

export interface DashboardStats {
  todayEntries: number;
  incomingKg: number;
  salesCount: number;
}
