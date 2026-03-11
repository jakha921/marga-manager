import apiClient from '../client';

export const analyticsService = {
  getDashboard: () => apiClient.get('/analytics/dashboard/'),
  getProductHistory: (productId: string | number) =>
    apiClient.get(`/analytics/product-history/${productId}/`),
};
