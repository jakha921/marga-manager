import type { PlanConfig, SubscriptionOrder } from '../../types';
import apiClient from '../client';

interface CreateOrderData {
  targetPlan: string;
  amount: number;
}

interface CheckoutUrlResponse {
  method: 'GET' | 'POST';
  url: string;
  fields?: { name: string; value: string }[];
}

export const paymentsService = {
  createOrder: (data: CreateOrderData) =>
    apiClient.post<SubscriptionOrder>('/payments/orders/', data),

  getOrders: (params?: Record<string, string>) =>
    apiClient.get<{ results: SubscriptionOrder[] }>('/payments/orders/', { params }),

  getOrder: (id: number) =>
    apiClient.get<SubscriptionOrder>(`/payments/orders/${id}/`),

  getCheckoutUrl: (orderId: number) =>
    apiClient.post<CheckoutUrlResponse>(`/payments/orders/${orderId}/checkout_url/`),

  getPlans: () =>
    apiClient.get<PlanConfig[]>('/payments/plans/'),

  // SUPER_ADMIN: управление тарифами
  getPlanConfigs: () =>
    apiClient.get<AdminPlanConfig[]>('/payments/plan-configs/'),

  updatePlanConfig: (id: number, data: Partial<AdminPlanConfig>) =>
    apiClient.patch<AdminPlanConfig>(`/payments/plan-configs/${id}/`, data),
};

export interface AdminPlanConfig {
  id: number;
  plan: string;
  price: number;
  priceUzs: number;
  maxKitchens: number;
  maxUsers: number;
  isActive: boolean;
}
