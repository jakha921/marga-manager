import type { SubscriptionOrder } from '../../types';
import apiClient from '../client';

interface CreateOrderData {
  targetPlan: string;
  amount: number;
}

interface CheckoutUrlResponse {
  checkoutUrl: string;
}

export const paymentsService = {
  createOrder: (data: CreateOrderData) =>
    apiClient.post<SubscriptionOrder>('/payments/orders/', data),

  getOrders: () =>
    apiClient.get<{ results: SubscriptionOrder[] }>('/payments/orders/'),

  getOrder: (id: number) =>
    apiClient.get<SubscriptionOrder>(`/payments/orders/${id}/`),

  getCheckoutUrl: (orderId: number) =>
    apiClient.post<CheckoutUrlResponse>(`/payments/orders/${orderId}/checkout_url/`),
};
