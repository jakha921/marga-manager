import apiClient from '../client';

export const analyticsService = {
  getDashboard: () => apiClient.get('/analytics/dashboard/'),
  getProductHistory: (productId: string | number) =>
    apiClient.get(`/analytics/product-history/${productId}/`),
  getKitchenReport: (params: Record<string, string>) =>
    apiClient.get('/analytics/kitchen-report/', { params }),
  getKitchenReportXlsx: (params: Record<string, string>) =>
    apiClient.get('/analytics/kitchen-report/', {
      params: { ...params, format: 'xlsx' },
      responseType: 'blob',
    }),
  getOperationsSummary: (params?: Record<string, string>) =>
    apiClient.get('/analytics/operations-summary/', { params }),
};
