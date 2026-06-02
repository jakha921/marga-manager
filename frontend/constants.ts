import type { SubscriptionPlan } from './types';

export const OPERATION_TYPES = [
  { id: 'INCOMING', label: 'Kirim', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { id: 'DAILY', label: 'Qoldiq', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { id: 'TRANSFER', label: "O'tkazma", color: 'text-purple-600 bg-purple-50 border-purple-100' },
  { id: 'SALE', label: 'Sotuv', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
] as const;

// Цены в тийинах (1 UZS = 100 тийин). Phase 7 заменит на PlanConfig API.
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  BASIC: 0,
  PRO: 4_900_000,
  ENTERPRISE: 19_900_000,
};

export const PLAN_PRICES_DISPLAY: Record<SubscriptionPlan, string> = {
  BASIC: 'Бесплатно',
  PRO: '49 000 UZS/мес',
  ENTERPRISE: '199 000 UZS/мес',
};

export const PLAN_LIMITS: Record<SubscriptionPlan, { kitchens: number | string; users: number | string }> = {
  BASIC: { kitchens: 3, users: 10 },
  PRO: { kitchens: 10, users: 50 },
  ENTERPRISE: { kitchens: 'Unlimited', users: 'Unlimited' },
};
