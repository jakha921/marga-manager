
export type OperationType = 'INCOMING' | 'DAILY' | 'TRANSFER' | 'SALE';

export type SubscriptionPlan = 'BASIC' | 'PRO' | 'ENTERPRISE';

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'KITCHEN_USER';

export interface User {
  id: string;
  organizationId: string;
  username: string;
  password: string; // Stored for mock purposes
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface Organization {
  id: string;
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
  id: string;
  name: string;
  organizationId: string;
}

export interface Kitchen {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  organizationId: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  organizationId: string;
}

export interface OperationEntry {
  id: string;
  type: OperationType;
  date: string;
  time: string;
  kitchenId: string;
  kitchenName: string;
  toKitchenId?: string;
  toKitchenName?: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price?: number;
  organizationId: string;
}

export interface DashboardStats {
  todayEntries: number;
  incomingKg: number;
  salesCount: number;
}
